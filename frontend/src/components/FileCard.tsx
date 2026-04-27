import React, { useState } from 'react';
import { Tag, Typography, Tooltip } from 'antd';
import {
  FileTextOutlined, FileImageOutlined, FilePdfOutlined,
  FileZipOutlined, FileExcelOutlined, FileWordOutlined,
  VideoCameraOutlined, SoundOutlined, FileOutlined,
  HeartOutlined, HeartFilled, DeleteOutlined, EditOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import type { FileItem } from '../types';

const { Text } = Typography;

const FILE_ICONS: Record<string, { icon: React.ElementType; color: string }> = {
  jpg: { icon: FileImageOutlined, color: '#30a46c' },
  jpeg: { icon: FileImageOutlined, color: '#30a46c' },
  png: { icon: FileImageOutlined, color: '#30a46c' },
  gif: { icon: FileImageOutlined, color: '#30a46c' },
  webp: { icon: FileImageOutlined, color: '#30a46c' },
  svg: { icon: FileImageOutlined, color: '#30a46c' },
  pdf: { icon: FilePdfOutlined, color: '#e5484d' },
  zip: { icon: FileZipOutlined, color: '#f5a623' },
  rar: { icon: FileZipOutlined, color: '#f5a623' },
  '7z': { icon: FileZipOutlined, color: '#f5a623' },
  doc: { icon: FileWordOutlined, color: '#6c72cb' },
  docx: { icon: FileWordOutlined, color: '#6c72cb' },
  xls: { icon: FileExcelOutlined, color: '#30a46c' },
  xlsx: { icon: FileExcelOutlined, color: '#30a46c' },
  txt: { icon: FileTextOutlined, color: '#9b9ca0' },
  md: { icon: FileTextOutlined, color: '#9b9ca0' },
  mp4: { icon: VideoCameraOutlined, color: '#8b5cf6' },
  avi: { icon: VideoCameraOutlined, color: '#8b5cf6' },
  mp3: { icon: SoundOutlined, color: '#ec4899' },
  wav: { icon: SoundOutlined, color: '#ec4899' },
};

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

interface FileCardProps {
  file: FileItem;
  index: number;
  onClick: (file: FileItem) => void;
  onEdit: (file: FileItem) => void;
  onDelete: (file: FileItem) => void;
  onToggleFavorite: (file: FileItem) => void;
  onDownload: (file: FileItem) => void;
  onTagClick: (tagId: number) => void;
}

const ActionBtn: React.FC<{
  icon: React.ReactNode;
  tip: string;
  danger?: boolean;
  onClick: () => void;
}> = ({ icon, tip, danger, onClick }) => (
  <Tooltip title={tip}>
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="file-row-action"
      style={{
        width: 30, height: 30,
        border: '1px solid transparent',
        borderRadius: 'var(--radius-sm)',
        background: 'transparent',
        color: danger ? 'var(--danger)' : 'var(--text-tertiary)',
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, transition: 'all 0.15s ease-out',
      }}
    >
      {icon}
    </button>
  </Tooltip>
);

const FileCard: React.FC<FileCardProps> = ({
  file, index, onClick, onEdit, onDelete, onToggleFavorite, onDownload, onTagClick,
}) => {
  const [hovered, setHovered] = useState(false);
  const iconInfo = FILE_ICONS[file.file_type] || { icon: FileOutlined, color: '#6c6d71' };
  const IconComponent = iconInfo.icon;
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(file.file_type);

  return (
    <div
      className="card-deal-in"
      onClick={() => onClick(file)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        animationDelay: `${index * 35}ms`,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '10px 16px',
        background: hovered ? 'var(--bg-elevated)' : 'transparent',
        borderRadius: 'var(--radius-md)',
        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        cursor: 'pointer',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      {/* Icon / Thumbnail */}
      <div style={{
        width: 40, height: 40, flexShrink: 0,
        borderRadius: 'var(--radius-sm)',
        background: isImage ? 'var(--bg-primary)' : `${iconInfo.color}10`,
        border: '1px solid var(--border-subtle)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
        transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        transform: hovered ? 'scale(1.05)' : 'scale(1)',
      }}>
        {isImage && file.file_url ? (
          <img src={file.file_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <IconComponent style={{ fontSize: 18, color: iconInfo.color }} />
        )}
      </div>

      {/* Name + Description */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Text ellipsis style={{
            color: 'var(--text-primary)', fontWeight: 500, fontSize: 13,
            letterSpacing: '-0.01em', maxWidth: 300,
          }}>
            {file.name}
          </Text>
          {file.is_favorite && <HeartFilled style={{ fontSize: 11, color: '#e5484d' }} />}
        </div>
        {file.description && (
          <Text ellipsis style={{ color: 'var(--text-tertiary)', fontSize: 12, display: 'block', maxWidth: 400 }}>
            {file.description}
          </Text>
        )}
      </div>

      {/* Tags */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 4,
        flexShrink: 0, maxWidth: 260, justifyContent: 'flex-end',
      }}>
        {file.tags.slice(0, 4).map((tag) => (
          <span
            key={tag.id}
            onClick={(e) => { e.stopPropagation(); onTagClick(tag.id); }}
            style={{
              fontSize: 11, lineHeight: '20px', padding: '0 8px',
              borderRadius: 'var(--radius-pill)',
              background: 'transparent',
              border: `1px solid ${tag.color}33`,
              color: tag.color,
              cursor: 'pointer',
              transition: 'all 0.15s ease-out',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.background = `${tag.color}18`;
              (e.target as HTMLElement).style.borderColor = `${tag.color}55`;
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.background = 'transparent';
              (e.target as HTMLElement).style.borderColor = `${tag.color}33`;
            }}
          >
            {tag.name}
          </span>
        ))}
        {file.tags.length > 4 && (
          <span style={{ fontSize: 11, color: 'var(--text-quaternary)', lineHeight: '20px' }}>
            +{file.tags.length - 4}
          </span>
        )}
      </div>

      {/* Meta */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0,
        fontSize: 12, color: 'var(--text-quaternary)', fontFeatureSettings: '"tnum"',
        minWidth: 130, justifyContent: 'flex-end',
      }}>
        <span style={{ minWidth: 55, textAlign: 'right' }}>{formatFileSize(file.file_size)}</span>
        <span style={{ minWidth: 35, textAlign: 'right' }}>{file.file_type.toUpperCase()}</span>
      </div>

      {/* Actions */}
      <div style={{
        display: 'flex', gap: 2, flexShrink: 0,
        opacity: hovered ? 1 : 0,
        transform: hovered ? 'translateX(0)' : 'translateX(4px)',
        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>
        <ActionBtn icon={file.is_favorite ? <HeartFilled style={{ color: '#e5484d' }} /> : <HeartOutlined />}
          tip={file.is_favorite ? '取消收藏' : '收藏'} onClick={() => onToggleFavorite(file)} />
        <ActionBtn icon={<DownloadOutlined />} tip="下载" onClick={() => onDownload(file)} />
        <ActionBtn icon={<EditOutlined />} tip="编辑" onClick={() => onEdit(file)} />
        <ActionBtn icon={<DeleteOutlined />} tip="删除" danger onClick={() => onDelete(file)} />
      </div>
    </div>
  );
};

export default FileCard;
