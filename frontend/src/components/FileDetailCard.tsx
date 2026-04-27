import React, { useState, useEffect, useCallback } from 'react';
import { Typography, Tooltip, message } from 'antd';
import {
  FileTextOutlined, FileImageOutlined, FilePdfOutlined,
  FileZipOutlined, FileExcelOutlined, FileWordOutlined,
  VideoCameraOutlined, SoundOutlined, FileOutlined,
  HeartFilled, HeartOutlined, DownloadOutlined, DeleteOutlined,
  CloseOutlined, ExpandOutlined, ShrinkOutlined,
  EditOutlined, SaveOutlined, CloseCircleOutlined,
  TagOutlined,
} from '@ant-design/icons';
import type { FileItem, Tag } from '../types';
import { filesAPI } from '../api/files';
import TagInput from './TagInput';

const { Text, Paragraph } = Typography;

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

function formatDate(s: string): string {
  const d = new Date(s);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const TAG_LIMIT = 30;

interface Props {
  file: FileItem;
  onClose: () => void;
  onToggleFavorite: (file: FileItem) => void;
  onDownload: (file: FileItem) => void;
  onDelete: (file: FileItem) => void;
  onUpdated: (file: FileItem) => void;
}

type Phase = 'entering' | 'open' | 'closing';

const FileDetailCard: React.FC<Props> = ({
  file, onClose, onToggleFavorite, onDownload, onDelete, onUpdated,
}) => {
  const [phase, setPhase] = useState<Phase>('entering');
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTags, setEditTags] = useState<Tag[]>(file.tags);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setPhase('open'));
  }, []);

  const handleClose = useCallback(() => {
    if (phase === 'closing') return;
    setPhase('closing');
    setTimeout(onClose, 280);
  }, [onClose, phase]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleClose]);

  const handleExpand = () => setExpanded(true);
  const handleShrink = () => setExpanded(false);

  const handleEditStart = () => {
    setEditTags([...file.tags]);
    setEditing(true);
  };
  const handleEditCancel = () => {
    setEditTags([...file.tags]);
    setEditing(false);
  };
  const handleEditSave = async () => {
    setSaving(true);
    try {
      await filesAPI.update(file.id, { tag_ids: editTags.map((t) => t.id) } as any);
      message.success('标签已更新');
      onUpdated({ ...file, tags: editTags });
      setEditing(false);
    } catch {
      message.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const iconInfo = FILE_ICONS[file.file_type] || { icon: FileOutlined, color: '#6c6d71' };
  const IconComponent = iconInfo.icon;
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(file.file_type);
  const displayTags = editing ? editTags : file.tags;
  const showMoreBtn = !expanded && !editing && displayTags.length > TAG_LIMIT;
  const visibleTags = expanded || editing ? displayTags : displayTags.slice(0, TAG_LIMIT);

  const cardWidth = expanded ? '66.6vw' : '420px';
  const cardMaxHeight = expanded ? '80vh' : 'auto';

  const isOpen = phase === 'open';
  const isClosing = phase === 'closing';

  // Overlay: fade in/out
  const overlayStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 1000,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(0,0,0,0.5)',
    backdropFilter: 'blur(4px)',
    opacity: isClosing ? 0 : isOpen ? 1 : 0,
    transition: isClosing ? 'opacity 0.28s ease-out' : 'opacity 0.3s ease',
  };

  // Card enter: flip in; Card exit: sink down + fade + scale
  const flipperTransform = isClosing
    ? 'rotateY(180deg) translateY(40px) scale(0.92)'
    : isOpen
      ? 'rotateY(180deg)'
      : 'rotateY(0)';

  const flipperTransition = isClosing
    ? 'transform 0.28s cubic-bezier(0.4, 0, 1, 1), opacity 0.28s ease-out'
    : 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)';

  return (
    <div
      onClick={handleClose}
      style={overlayStyle}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          perspective: '1200px',
          width: cardWidth,
          maxWidth: '90vw',
          transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div
          style={{
            transformStyle: 'preserve-3d',
            transition: flipperTransition,
            transform: flipperTransform,
            opacity: isClosing ? 0 : 1,
          }}
        >
          {/* FRONT: placeholder for flip */}
          <div style={{
            backfaceVisibility: 'hidden',
            position: 'absolute', width: '100%',
            background: 'var(--bg-elevated)',
            borderRadius: 'var(--radius-lg)',
            minHeight: 200,
          }} />

          {/* BACK: actual content */}
          <div style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)',
            overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
            maxHeight: cardMaxHeight,
          }}>
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 16px',
              borderBottom: '1px solid var(--border-subtle)',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 'var(--radius-sm)',
                  background: isImage ? 'var(--bg-primary)' : `${iconInfo.color}10`,
                  border: '1px solid var(--border-subtle)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden',
                }}>
                  {isImage && file.file_url ? (
                    <img src={file.file_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <IconComponent style={{ fontSize: 15, color: iconInfo.color }} />
                  )}
                </div>
                <div>
                  <Text style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 14, display: 'block', lineHeight: 1.3 }}>
                    {file.name}
                  </Text>
                  <Text style={{ color: 'var(--text-tertiary)', fontSize: 11, fontFeatureSettings: '"tnum"' }}>
                    {formatFileSize(file.file_size)} · {file.file_type.toUpperCase()} · {formatDate(file.created_at)}
                  </Text>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {!expanded ? (
                  <Tooltip title="展开大卡片">
                    <button onClick={handleExpand} className="file-detail-btn"><ExpandOutlined /></button>
                  </Tooltip>
                ) : (
                  <Tooltip title="缩小">
                    <button onClick={handleShrink} className="file-detail-btn"><ShrinkOutlined /></button>
                  </Tooltip>
                )}
                <Tooltip title="关闭">
                  <button onClick={handleClose} className="file-detail-btn"><CloseOutlined /></button>
                </Tooltip>
              </div>
            </div>

            {/* Body */}
            <div style={{
              padding: '16px 20px',
              overflowY: expanded ? 'auto' : 'visible',
              flex: 1,
            }}>
              {isImage && file.file_url && expanded && (
                <div style={{
                  marginBottom: 16, borderRadius: 'var(--radius-md)',
                  overflow: 'hidden', background: 'var(--bg-primary)',
                  border: '1px solid var(--border-subtle)',
                  maxHeight: 300, display: 'flex', justifyContent: 'center',
                }}>
                  <img src={file.file_url} alt={file.name} style={{ maxWidth: '100%', maxHeight: 300, objectFit: 'contain' }} />
                </div>
              )}

              <div style={{
                display: 'grid',
                gridTemplateColumns: expanded ? '1fr 1fr 1fr' : '1fr 1fr',
                gap: '12px', marginBottom: 16,
              }}>
                <InfoBlock label="原始文件名" value={file.original_name} />
                <InfoBlock label="上传者" value={file.uploaded_by_name} />
                {file.is_favorite && <InfoBlock label="状态" value="已收藏" />}
                {expanded && <InfoBlock label="更新时间" value={formatDate(file.updated_at)} />}
              </div>

              {file.description && (
                <div style={{ marginBottom: 16 }}>
                  <Text style={{ color: 'var(--text-quaternary)', fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>
                    描述
                  </Text>
                  <Paragraph style={{ color: 'var(--text-secondary)', fontSize: 13, margin: 0, lineHeight: 1.6 }}>
                    {file.description}
                  </Paragraph>
                </div>
              )}

              {/* Tags */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <TagOutlined style={{ color: 'var(--text-quaternary)', fontSize: 11 }} />
                    <Text style={{ color: 'var(--text-quaternary)', fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      标签 ({displayTags.length})
                    </Text>
                  </div>
                  {!editing ? (
                    <button onClick={handleEditStart} className="file-detail-btn" style={{ fontSize: 12, gap: 4, padding: '3px 10px' }}>
                      <EditOutlined style={{ fontSize: 11 }} /> 编辑标签
                    </button>
                  ) : (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={handleEditSave}
                        className="file-detail-btn"
                        style={{ fontSize: 12, gap: 4, padding: '3px 10px', color: 'var(--success)', borderColor: 'var(--success)' + '44' }}
                        disabled={saving}
                      >
                        <SaveOutlined style={{ fontSize: 11 }} /> {saving ? '保存中...' : '保存'}
                      </button>
                      <button
                        onClick={handleEditCancel}
                        className="file-detail-btn"
                        style={{ fontSize: 12, gap: 4, padding: '3px 10px' }}
                      >
                        <CloseCircleOutlined style={{ fontSize: 11 }} /> 取消
                      </button>
                    </div>
                  )}
                </div>

                {editing && (
                  <div style={{ marginBottom: 12 }}>
                    <TagInput selectedTags={editTags} onChange={setEditTags} placeholder="搜索或创建标签..." />
                  </div>
                )}

                {!editing && (
                  <>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {visibleTags.map((tag, i) => (
                        <span
                          key={tag.id}
                          className="tag-pop-in"
                          style={{
                            animationDelay: `${Math.min(i, 20) * 15}ms`,
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            padding: '3px 12px', fontSize: 12, fontWeight: 500,
                            borderRadius: 'var(--radius-pill)',
                            background: `${tag.color}12`,
                            border: `1px solid ${tag.color}33`,
                            color: tag.color,
                            lineHeight: '22px',
                            transition: 'all 0.15s ease-out',
                          }}
                        >
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: tag.color, flexShrink: 0 }} />
                          {tag.name}
                        </span>
                      ))}
                    </div>
                    {showMoreBtn && (
                      <button
                        onClick={handleExpand}
                        style={{
                          marginTop: 10, display: 'flex', alignItems: 'center', gap: 6,
                          padding: '6px 16px', fontSize: 12, fontWeight: 500,
                          borderRadius: 'var(--radius-pill)',
                          border: '1px dashed var(--border-default)',
                          background: 'transparent', color: 'var(--text-tertiary)',
                          cursor: 'pointer', fontFamily: 'inherit',
                          transition: 'all 0.2s ease-out',
                        }}
                      >
                        <ExpandOutlined style={{ fontSize: 11 }} />
                        查看全部 {displayTags.length} 个标签
                      </button>
                    )}
                    {displayTags.length === 0 && (
                      <Text style={{ color: 'var(--text-quaternary)', fontSize: 12, fontStyle: 'italic' }}>
                        暂无标签，点击"编辑标签"添加
                      </Text>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Footer */}
            <div style={{
              display: 'flex', gap: 6, padding: '12px 16px',
              borderTop: '1px solid var(--border-subtle)',
              justifyContent: 'flex-end', flexShrink: 0,
            }}>
              <ActionPill icon={file.is_favorite ? <HeartFilled style={{ color: '#e5484d' }} /> : <HeartOutlined />}
                label={file.is_favorite ? '取消收藏' : '收藏'} onClick={() => onToggleFavorite(file)} />
              <ActionPill icon={<DownloadOutlined />} label="下载" onClick={() => onDownload(file)} />
              <ActionPill icon={<DeleteOutlined />} label="删除" danger onClick={() => { onDelete(file); handleClose(); }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const InfoBlock: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{
    background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)',
    padding: '8px 12px', border: '1px solid var(--border-subtle)',
  }}>
    <Text style={{ color: 'var(--text-quaternary)', fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 2 }}>
      {label}
    </Text>
    <Text ellipsis style={{ color: 'var(--text-primary)', fontSize: 12, display: 'block' }}>
      {value}
    </Text>
  </div>
);

const ActionPill: React.FC<{
  icon: React.ReactNode; label: string; danger?: boolean; onClick: () => void;
}> = ({ icon, label, danger, onClick }) => (
  <button
    onClick={onClick}
    className="file-detail-btn"
    style={{
      padding: '5px 14px', gap: 6, fontSize: 12,
      color: danger ? 'var(--danger)' : undefined,
      borderColor: danger ? 'var(--danger)' + '33' : undefined,
    }}
  >
    {icon} {label}
  </button>
);

export default FileDetailCard;
