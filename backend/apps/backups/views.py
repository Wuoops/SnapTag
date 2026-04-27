import os
import json
import shutil
import subprocess
import tarfile
from datetime import datetime
from pathlib import Path

from django.conf import settings
from django.http import FileResponse
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response

from .models import Backup
from .serializers import BackupSerializer


def _run_db_restore(dump_file: Path):
    """Execute psql to restore a SQL dump, raising on fatal errors."""
    db_conf = settings.DATABASES['default']
    env = os.environ.copy()
    env['PGPASSWORD'] = db_conf['PASSWORD']
    result = subprocess.run(
        [
            'psql',
            '-h', db_conf['HOST'],
            '-p', str(db_conf['PORT']),
            '-U', db_conf['USER'],
            '-d', db_conf['NAME'],
            '-f', str(dump_file),
        ],
        env=env, check=False,
        capture_output=True, text=True,
    )
    ignorable = (
        'does not exist',
        'already exists',
        'unrecognized configuration parameter',
    )
    fatal_errors = [
        line for line in result.stderr.splitlines()
        if 'ERROR:' in line
        and not any(s in line for s in ignorable)
    ]
    if result.returncode != 0 and fatal_errors:
        raise RuntimeError(
            f'psql 退出码 {result.returncode}: '
            + '; '.join(fatal_errors[:5])
        )


def _restore_media(media_backup: Path):
    """Replace MEDIA_ROOT contents with the backup's media directory."""
    if not media_backup.exists():
        return
    media_root = settings.MEDIA_ROOT
    if media_root.exists():
        for child in media_root.iterdir():
            if child.is_dir():
                shutil.rmtree(child)
            else:
                child.unlink()
    else:
        media_root.mkdir(parents=True)
    shutil.copytree(media_backup, media_root, dirs_exist_ok=True)


def _sync_backup_records():
    """Scan backup directory and reconcile DB records with actual files.

    After a DB restore, the backups table reflects the old snapshot.
    This rebuilds it from the actual .tar.gz files on disk so that
    every archive has a valid 'completed' record with correct path/size.
    """
    backup_dir = settings.BACKUP_DIR
    if not backup_dir.exists():
        return

    archives = {
        p.name: p
        for p in backup_dir.glob('snaptag_backup_*.tar.gz')
        if p.is_file()
    }

    existing_by_name = {b.name: b for b in Backup.objects.all()}

    # Fix or create records for every archive on disk
    for archive_name, archive_path in archives.items():
        record_name = archive_name.replace('.tar.gz', '')
        meta = _read_archive_metadata(archive_path)
        record = existing_by_name.pop(record_name, None)

        if record:
            changed = False
            if record.file_path != str(archive_path):
                record.file_path = str(archive_path)
                changed = True
            if record.status != 'completed':
                record.status = 'completed'
                changed = True
            actual_size = archive_path.stat().st_size
            if record.file_size != actual_size:
                record.file_size = actual_size
                changed = True
            if meta:
                if record.note != meta.get('note', record.note):
                    record.note = meta.get('note', record.note)
                    changed = True
            if changed:
                record.save()
        else:
            Backup.objects.create(
                name=record_name,
                file_path=str(archive_path),
                file_size=archive_path.stat().st_size,
                includes_files=meta.get('includes_files', True) if meta else True,
                includes_db=meta.get('includes_db', True) if meta else True,
                note=meta.get('note', '') if meta else '',
                status='completed',
                completed_at=datetime.fromtimestamp(archive_path.stat().st_mtime),
            )

    # Remove DB records whose archive no longer exists on disk
    for name, record in existing_by_name.items():
        if not record.file_path or not Path(record.file_path).is_file():
            record.delete()


def _read_archive_metadata(archive_path: Path) -> dict | None:
    """Try to read metadata.json from inside the archive."""
    try:
        with tarfile.open(archive_path, 'r:*') as tar:
            for member in tar.getmembers():
                if member.name.endswith('metadata.json'):
                    f = tar.extractfile(member)
                    if f:
                        return json.load(f)
    except Exception:
        pass
    return None


class BackupViewSet(viewsets.ModelViewSet):
    queryset = Backup.objects.all()
    serializer_class = BackupSerializer
    http_method_names = ['get', 'post', 'delete']

    def list(self, request, *args, **kwargs):
        _sync_backup_records()
        return super().list(request, *args, **kwargs)

    @action(detail=False, methods=['post'])
    def create_backup(self, request):
        """Create a full backup of database and uploaded files."""
        includes_files = request.data.get('includes_files', True)
        includes_db = request.data.get('includes_db', True)
        note = request.data.get('note', '')

        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_name = f'snaptag_backup_{timestamp}'
        backup_dir = settings.BACKUP_DIR / backup_name
        backup_dir.mkdir(parents=True, exist_ok=True)

        backup_record = Backup.objects.create(
            name=backup_name,
            file_path='',
            includes_files=includes_files,
            includes_db=includes_db,
            note=note,
            status='running',
            created_by=request.user,
        )

        try:
            if includes_db:
                db_conf = settings.DATABASES['default']
                dump_file = backup_dir / 'database.sql'
                env = os.environ.copy()
                env['PGPASSWORD'] = db_conf['PASSWORD']
                subprocess.run(
                    [
                        'pg_dump',
                        '-h', db_conf['HOST'],
                        '-p', str(db_conf['PORT']),
                        '-U', db_conf['USER'],
                        '-d', db_conf['NAME'],
                        '-f', str(dump_file),
                        '--no-owner',
                        '--no-acl',
                        '--clean',
                        '--if-exists',
                    ],
                    env=env, check=True,
                    capture_output=True, text=True,
                )

            if includes_files and settings.MEDIA_ROOT.exists():
                media_backup = backup_dir / 'media'
                shutil.copytree(settings.MEDIA_ROOT, media_backup, dirs_exist_ok=True)

            metadata = {
                'name': backup_name,
                'timestamp': timestamp,
                'includes_files': includes_files,
                'includes_db': includes_db,
                'note': note,
            }
            with open(backup_dir / 'metadata.json', 'w') as f:
                json.dump(metadata, f, indent=2)

            archive_path = settings.BACKUP_DIR / f'{backup_name}.tar.gz'
            with tarfile.open(archive_path, 'w:gz') as tar:
                tar.add(backup_dir, arcname=backup_name)

            shutil.rmtree(backup_dir)

            backup_record.file_path = str(archive_path)
            backup_record.file_size = archive_path.stat().st_size
            backup_record.status = 'completed'
            backup_record.completed_at = datetime.now()
            backup_record.save()

            return Response(BackupSerializer(backup_record).data, status=status.HTTP_201_CREATED)

        except Exception as e:
            backup_record.status = 'failed'
            backup_record.error_message = str(e)
            backup_record.save()
            if backup_dir.exists():
                shutil.rmtree(backup_dir)
            return Response(
                {'detail': f'备份失败: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        backup = self.get_object()
        file_path = Path(backup.file_path) if backup.file_path else None
        if not file_path or not file_path.exists():
            return Response({'detail': '备份文件不存在'}, status=status.HTTP_404_NOT_FOUND)
        return FileResponse(
            open(file_path, 'rb'),
            as_attachment=True,
            filename=file_path.name,
        )

    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        """Restore from an existing backup record."""
        backup = self.get_object()
        file_path = Path(backup.file_path) if backup.file_path else None
        if not file_path or not file_path.exists():
            return Response({'detail': '备份文件不存在'}, status=status.HTTP_404_NOT_FOUND)

        try:
            self._do_restore(file_path, backup.includes_db, backup.includes_files)
            return Response({'detail': '恢复成功'})
        except Exception as e:
            return Response(
                {'detail': f'恢复失败: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=['post'], parser_classes=[MultiPartParser])
    def upload_restore(self, request):
        """Restore from an uploaded .tar.gz / .tar backup file."""
        uploaded = request.FILES.get('file')
        if not uploaded:
            return Response({'detail': '请上传备份文件'}, status=status.HTTP_400_BAD_REQUEST)

        if not (uploaded.name.endswith('.tar.gz') or uploaded.name.endswith('.tar')):
            return Response({'detail': '仅支持 .tar.gz 或 .tar 格式的备份文件'}, status=status.HTTP_400_BAD_REQUEST)

        tmp_path = settings.BACKUP_DIR / f'_upload_{uploaded.name}'
        try:
            with open(tmp_path, 'wb') as f:
                for chunk in uploaded.chunks():
                    f.write(chunk)

            self._do_restore(tmp_path, includes_db=True, includes_files=True)
            return Response({'detail': '上传恢复成功'})

        except Exception as e:
            return Response(
                {'detail': f'恢复失败: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        finally:
            if tmp_path.exists():
                tmp_path.unlink()

    @staticmethod
    def _do_restore(archive_path: Path, includes_db: bool, includes_files: bool):
        """Core restore logic shared by restore and upload_restore."""
        extract_dir = settings.BACKUP_DIR / 'restore_temp'
        if extract_dir.exists():
            shutil.rmtree(extract_dir)

        try:
            with tarfile.open(archive_path, 'r:*') as tar:
                tar.extractall(extract_dir)

            children = [c for c in extract_dir.iterdir() if c.is_dir()]
            if not children:
                raise RuntimeError('备份压缩包内容为空或格式不正确')
            backup_content = children[0]

            metadata_file = backup_content / 'metadata.json'
            if metadata_file.exists():
                with open(metadata_file, 'r') as f:
                    meta = json.load(f)
                includes_db = meta.get('includes_db', includes_db)
                includes_files = meta.get('includes_files', includes_files)

            if includes_db:
                dump_file = backup_content / 'database.sql'
                if dump_file.exists():
                    _run_db_restore(dump_file)

            if includes_files:
                _restore_media(backup_content / 'media')

            # After DB restore the backups table is stale; reconcile it
            if includes_db:
                _sync_backup_records()

        finally:
            if extract_dir.exists():
                shutil.rmtree(extract_dir)

    def perform_destroy(self, instance):
        if instance.file_path:
            file_path = Path(instance.file_path)
            if file_path.is_file():
                file_path.unlink()
        instance.delete()
