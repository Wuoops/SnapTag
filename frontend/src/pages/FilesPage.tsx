import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Input, Button, Upload, Modal,
  message, Spin, Typography, Tooltip,
} from 'antd';
import {
  UploadOutlined, SearchOutlined, HeartOutlined, HeartFilled,
  ClearOutlined, ReloadOutlined, CloseCircleFilled, TagOutlined,
} from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { filesAPI, type FileFilters } from '../api/files';
import { tagsAPI } from '../api/tags';
import type { FileItem, Tag } from '../types';
import FileCard from '../components/FileCard';
import FileDetailCard from '../components/FileDetailCard';
import TagInput from '../components/TagInput';

const { Title, Text } = Typography;

const PAGE_SIZE = 30;

type TagMode = 'union' | 'intersect';

function spawnParticles(
  container: HTMLElement,
  color: string,
  originRect: DOMRect,
  parentRect: DOMRect,
) {
  const cx = originRect.left - parentRect.left + originRect.width / 2;
  const cy = originRect.top - parentRect.top + originRect.height / 2;
  const count = 8;
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.6;
    const dist = 20 + Math.random() * 25;
    const px = Math.cos(angle) * dist;
    const py = Math.sin(angle) * dist;
    const dot = document.createElement('span');
    dot.className = 'tag-particle';
    dot.style.background = color;
    dot.style.left = `${cx}px`;
    dot.style.top = `${cy}px`;
    dot.style.setProperty('--px', `${px}px`);
    dot.style.setProperty('--py', `${py}px`);
    dot.style.width = `${3 + Math.random() * 3}px`;
    dot.style.height = dot.style.width;
    container.appendChild(dot);
    setTimeout(() => dot.remove(), 550);
  }
}

const FilesPage: React.FC = () => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [filters, setFilters] = useState<FileFilters>({});
  const [searchText, setSearchText] = useState('');

  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [filterFavorite, setFilterFavorite] = useState(false);
  const [tagMode, setTagMode] = useState<TagMode>('union');

  // Tags being animated out (for pop-out + particles)
  const [removingTagIds, setRemovingTagIds] = useState<Set<number>>(new Set());
  const searchBarRef = useRef<HTMLDivElement>(null);
  const tagRefsMap = useRef<Map<number, HTMLSpanElement>>(new Map());

  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadTags, setUploadTags] = useState<Tag[]>([]);
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadFileList, setUploadFileList] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [detailFile, setDetailFile] = useState<FileItem | null>(null);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const listKey = useRef(0);

  useEffect(() => {
    tagsAPI.list().then((res) => setAllTags(res.data.results)).catch(() => {});
  }, []);

  const fetchFiles = useCallback(async (pageNum: number, append: boolean) => {
    if (append) setLoadingMore(true); else setLoading(true);
    try {
      const tagIds = selectedTags.map((t) => t.id);
      const res = await filesAPI.list({
        ...filters,
        search: searchText || undefined,
        tags: tagIds.length ? tagIds : undefined,
        tag_mode: tagIds.length > 1 ? tagMode : undefined,
        favorite: filterFavorite || undefined,
        page: pageNum,
        page_size: PAGE_SIZE,
      });
      const newFiles = res.data.results;
      if (append) {
        setFiles((prev) => [...prev, ...newFiles]);
      } else {
        setFiles(newFiles);
        listKey.current += 1;
      }
      setTotal(res.data.count);
      setHasMore(res.data.next !== null);
      setPage(pageNum);
    } catch {
      message.error('加载文件失败');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filters, searchText, selectedTags, filterFavorite, tagMode]);

  useEffect(() => { fetchFiles(1, false); }, [fetchFiles]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          fetchFiles(page + 1, true);
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, page, fetchFiles]);

  const handleAddTag = (tag: Tag) => {
    if (selectedTags.some((t) => t.id === tag.id)) return;
    setSelectedTags((prev) => [...prev, tag]);
  };

  const handleRemoveTag = (tagId: number) => {
    const tagEl = tagRefsMap.current.get(tagId);
    const tag = selectedTags.find((t) => t.id === tagId);
    if (tagEl && tag && searchBarRef.current) {
      const tagRect = tagEl.getBoundingClientRect();
      const parentRect = searchBarRef.current.getBoundingClientRect();
      spawnParticles(searchBarRef.current, tag.color, tagRect, parentRect);
    }
    setRemovingTagIds((prev) => new Set(prev).add(tagId));
    setTimeout(() => {
      setSelectedTags((prev) => prev.filter((t) => t.id !== tagId));
      setRemovingTagIds((prev) => {
        const next = new Set(prev);
        next.delete(tagId);
        return next;
      });
      tagRefsMap.current.delete(tagId);
    }, 250);
  };

  const handleClearAll = () => {
    setSearchText('');
    setSelectedTags([]);
    setFilterFavorite(false);
    setFilters({});
  };

  const handleFileTagClick = (tagId: number) => {
    if (selectedTags.some((t) => t.id === tagId)) return;
    const tag = allTags.find((t) => t.id === tagId);
    if (tag) setSelectedTags((prev) => [...prev, tag]);
  };

  const handleUpload = async () => {
    if (!uploadFileList.length) { message.warning('请选择文件'); return; }
    setUploading(true);
    try {
      for (const file of uploadFileList) {
        const formData = new FormData();
        formData.append('file', file.originFileObj || file);
        formData.append('name', file.name);
        formData.append('description', uploadDescription);
        uploadTags.forEach((t) => formData.append('tag_ids', String(t.id)));
        await filesAPI.upload(formData);
      }
      message.success(`成功上传 ${uploadFileList.length} 个文件`);
      setUploadModalOpen(false);
      setUploadFileList([]);
      setUploadTags([]);
      setUploadDescription('');
      tagsAPI.list().then((res) => setAllTags(res.data.results)).catch(() => {});
      fetchFiles(1, false);
    } catch { message.error('上传失败'); }
    finally { setUploading(false); }
  };

  const handleDelete = (file: FileItem) => {
    Modal.confirm({
      title: '确认删除',
      content: `"${file.name}" 将被永久删除`,
      okText: '删除', okType: 'danger', cancelText: '取消',
      onOk: async () => {
        await filesAPI.delete(file.id);
        message.success('已删除');
        fetchFiles(1, false);
      },
    });
  };

  const handleToggleFavorite = async (file: FileItem) => {
    await filesAPI.toggleFavorite(file.id);
    const toggled = { ...file, is_favorite: !file.is_favorite };
    setFiles((prev) => prev.map((f) => f.id === file.id ? toggled : f));
    if (detailFile?.id === file.id) setDetailFile(toggled);
  };

  const handleFileClick = (file: FileItem) => {
    setDetailFile(file);
  };

  const handleDetailUpdated = (updated: FileItem) => {
    setFiles((prev) => prev.map((f) => f.id === updated.id ? updated : f));
    setDetailFile(updated);
    tagsAPI.list().then((res) => setAllTags(res.data.results)).catch(() => {});
  };

  const uploadProps: UploadProps = {
    multiple: true, beforeUpload: () => false,
    fileList: uploadFileList, onChange: ({ fileList }) => setUploadFileList(fileList),
  };

  const hasFilters = searchText || selectedTags.length > 0 || filterFavorite;

  return (
    <div>
      {/* ===== Tag Bar ===== */}
      {allTags.length > 0 && (
        <div className="fade-slide-up" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <TagOutlined style={{ color: 'var(--text-quaternary)', fontSize: 12 }} />
            <Text style={{ color: 'var(--text-quaternary)', fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              标签筛选
            </Text>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {allTags.map((tag) => {
              const active = selectedTags.some((t) => t.id === tag.id);
              return (
                <button
                  key={tag.id}
                  onClick={() => active ? handleRemoveTag(tag.id) : handleAddTag(tag)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '3px 12px', fontSize: 12, fontWeight: 500,
                    fontFamily: 'inherit',
                    borderRadius: 'var(--radius-pill)',
                    border: `1px solid ${active ? tag.color + '55' : tag.color + '28'}`,
                    background: active ? `${tag.color}20` : 'transparent',
                    color: active ? tag.color : `${tag.color}cc`,
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    lineHeight: '22px',
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      (e.currentTarget as HTMLElement).style.background = `${tag.color}12`;
                      (e.currentTarget as HTMLElement).style.borderColor = `${tag.color}44`;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      (e.currentTarget as HTMLElement).style.background = 'transparent';
                      (e.currentTarget as HTMLElement).style.borderColor = `${tag.color}28`;
                    }
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: tag.color, flexShrink: 0 }} />
                  {tag.name}
                  {active && <span style={{ fontSize: 10, opacity: 0.6 }}>✕</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== Search Bar ===== */}
      <div
        ref={searchBarRef}
        className="fade-slide-up"
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '12px 16px',
          marginBottom: 20,
          animationDelay: '50ms',
          position: 'relative',
          overflow: 'visible',
        }}
      >
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6,
            background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)', padding: '4px 10px', minHeight: 36,
            transition: 'border-color 0.15s ease-out',
          }}>
            <SearchOutlined style={{ color: 'var(--text-quaternary)', fontSize: 13, flexShrink: 0 }} />

            {selectedTags.map((tag) => {
              const isRemoving = removingTagIds.has(tag.id);
              return (
                <span
                  key={tag.id}
                  ref={(el) => { if (el) tagRefsMap.current.set(tag.id, el); }}
                  className={isRemoving ? 'tag-pop-out' : 'tag-pop-in'}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '1px 8px 1px 6px', fontSize: 11, fontWeight: 500,
                    borderRadius: 'var(--radius-pill)',
                    background: `${tag.color}18`,
                    border: `1px solid ${tag.color}33`,
                    color: tag.color,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: tag.color }} />
                  {tag.name}
                  <CloseCircleFilled
                    onClick={() => handleRemoveTag(tag.id)}
                    style={{
                      fontSize: 11, cursor: 'pointer', opacity: 0.5,
                      transition: 'opacity 0.1s', marginLeft: 2,
                    }}
                    onMouseEnter={(e) => { (e.target as HTMLElement).style.opacity = '1'; }}
                    onMouseLeave={(e) => { (e.target as HTMLElement).style.opacity = '0.5'; }}
                  />
                </span>
              );
            })}

            <input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') fetchFiles(1, false); }}
              placeholder={selectedTags.length ? '继续输入文件名...' : '搜索文件名或描述...'}
              style={{
                flex: 1, minWidth: 120, border: 'none', outline: 'none',
                background: 'transparent', color: 'var(--text-primary)',
                fontSize: 13, fontFamily: 'inherit', padding: '2px 0',
              }}
            />
          </div>

          {/* Union / Intersect toggle */}
          {selectedTags.length >= 2 && (
            <div className="tag-mode-toggle">
              <Tooltip title="并集：包含任意一个标签的文件">
                <button className={tagMode === 'union' ? 'active' : ''} onClick={() => setTagMode('union')}>
                  并集
                </button>
              </Tooltip>
              <Tooltip title="交集：同时包含所有标签的文件">
                <button className={tagMode === 'intersect' ? 'active' : ''} onClick={() => setTagMode('intersect')}>
                  交集
                </button>
              </Tooltip>
            </div>
          )}

          <Tooltip title={filterFavorite ? '取消收藏筛选' : '只看收藏'}>
            <Button
              icon={filterFavorite ? <HeartFilled style={{ color: '#e5484d' }} /> : <HeartOutlined />}
              type={filterFavorite ? 'primary' : 'default'}
              onClick={() => setFilterFavorite((v) => !v)}
              style={{ height: 36, width: 36, padding: 0 }}
            />
          </Tooltip>
          {hasFilters && (
            <Button icon={<ClearOutlined />} onClick={handleClearAll} style={{ height: 36, fontSize: 12 }}>清除</Button>
          )}
          <Button icon={<ReloadOutlined />} onClick={() => fetchFiles(1, false)} style={{ height: 36, width: 36, padding: 0 }} />
          <Button type="primary" icon={<UploadOutlined />} onClick={() => setUploadModalOpen(true)} style={{ height: 36 }}>上传</Button>
        </div>
      </div>

      {/* ===== Stats ===== */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 8, padding: '0 4px',
      }}>
        <Text style={{ color: 'var(--text-tertiary)', fontSize: 12, fontFeatureSettings: '"tnum"' }}>
          {total > 0 ? `${total} 个文件` : ''}
        </Text>
        {selectedTags.length >= 2 && (
          <Text style={{ color: 'var(--text-quaternary)', fontSize: 11 }}>
            {tagMode === 'union' ? '并集模式：匹配任意标签' : '交集模式：匹配全部标签'}
          </Text>
        )}
      </div>

      {/* ===== File List ===== */}
      <Spin spinning={loading && files.length === 0}>
        {files.length > 0 ? (
          <div key={listKey.current}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 16,
              padding: '6px 16px', fontSize: 11, fontWeight: 500,
              color: 'var(--text-quaternary)', textTransform: 'uppercase',
              letterSpacing: '0.05em', borderBottom: '1px solid var(--border-subtle)',
              marginBottom: 4,
            }}>
              <div style={{ width: 40 }} />
              <div style={{ flex: 1 }}>文件名</div>
              <div style={{ maxWidth: 260, textAlign: 'right' }}>标签</div>
              <div style={{ minWidth: 130, textAlign: 'right', display: 'flex', gap: 16, justifyContent: 'flex-end' }}>
                <span style={{ minWidth: 55, textAlign: 'right' }}>大小</span>
                <span style={{ minWidth: 35, textAlign: 'right' }}>类型</span>
              </div>
              <div style={{ width: 128 }} />
            </div>

            {files.map((file, i) => (
              <FileCard
                key={file.id}
                file={file}
                index={i}
                onClick={handleFileClick}
                onEdit={handleFileClick}
                onDelete={handleDelete}
                onToggleFavorite={handleToggleFavorite}
                onDownload={(f) => filesAPI.download(f.id)}
                onTagClick={handleFileTagClick}
              />
            ))}

            <div ref={sentinelRef} style={{ height: 1 }} />
            {loadingMore && (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <Spin size="small" />
                <Text style={{ color: 'var(--text-quaternary)', fontSize: 12, marginLeft: 8 }}>加载更多...</Text>
              </div>
            )}
            {!hasMore && files.length > 0 && (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <Text style={{ color: 'var(--text-quaternary)', fontSize: 12 }}>已加载全部 {total} 个文件</Text>
              </div>
            )}
          </div>
        ) : !loading ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '80px 0', gap: 16,
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: 'var(--radius-lg)',
              background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <UploadOutlined style={{ fontSize: 22, color: 'var(--text-quaternary)' }} />
            </div>
            <Text style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>
              {hasFilters ? '没有匹配的文件' : '还没有文件'}
            </Text>
            {!hasFilters && (
              <Button type="primary" icon={<UploadOutlined />} onClick={() => setUploadModalOpen(true)} size="small">
                上传文件
              </Button>
            )}
          </div>
        ) : null}
      </Spin>

      {/* ===== Upload Modal ===== */}
      <Modal
        title={null} open={uploadModalOpen}
        onCancel={() => setUploadModalOpen(false)}
        onOk={handleUpload} confirmLoading={uploading}
        okText="上传" cancelText="取消" width={520}
        styles={{ body: { padding: '24px 0' } }}
      >
        <Title level={5} style={{ color: 'var(--text-primary)', marginBottom: 20, padding: '0 24px' }}>上传文件</Title>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '0 24px' }}>
          <Upload.Dragger {...uploadProps}>
            <div style={{ padding: '16px 0' }}>
              <UploadOutlined style={{ fontSize: 36, color: 'var(--accent)', opacity: 0.6 }} />
              <p style={{ color: 'var(--text-secondary)', marginTop: 12, fontSize: 13 }}>拖拽文件到此处，或点击选择</p>
            </div>
          </Upload.Dragger>
          <div>
            <Text style={{ display: 'block', color: 'var(--text-secondary)', fontSize: 12, marginBottom: 6, fontWeight: 500 }}>标签</Text>
            <TagInput selectedTags={uploadTags} onChange={setUploadTags} />
          </div>
          <div>
            <Text style={{ display: 'block', color: 'var(--text-secondary)', fontSize: 12, marginBottom: 6, fontWeight: 500 }}>描述</Text>
            <Input.TextArea rows={2} placeholder="可选" value={uploadDescription} onChange={(e) => setUploadDescription(e.target.value)} />
          </div>
        </div>
      </Modal>

      {/* ===== File Detail Flip Card ===== */}
      {detailFile && (
        <FileDetailCard
          file={detailFile}
          onClose={() => setDetailFile(null)}
          onToggleFavorite={handleToggleFavorite}
          onDownload={(f) => filesAPI.download(f.id)}
          onDelete={handleDelete}
          onUpdated={handleDetailUpdated}
        />
      )}
    </div>
  );
};

export default FilesPage;
