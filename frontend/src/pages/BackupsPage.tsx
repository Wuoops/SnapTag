import React, { useState, useEffect, useRef } from 'react';
import {
  Button, Modal, Form, Input, Checkbox, message, Typography, Popconfirm, Space, Spin,
} from 'antd';
import {
  PlusOutlined, DownloadOutlined, UndoOutlined, DeleteOutlined,
  DatabaseOutlined, FolderOutlined, ClockCircleOutlined, UploadOutlined,
  ExclamationCircleOutlined, CloudUploadOutlined,
} from '@ant-design/icons';
import { backupsAPI } from '../api/backups';
import type { Backup } from '../types';
import dayjs from 'dayjs';

const { Text } = Typography;

const STATUS_MAP: Record<string, { color: string; bg: string; text: string }> = {
  pending: { color: 'var(--text-quaternary)', bg: 'var(--bg-surface)', text: '等待中' },
  running: { color: 'var(--accent)', bg: 'var(--accent-muted)', text: '备份中' },
  completed: { color: 'var(--success)', bg: 'rgba(48,164,108,0.12)', text: '已完成' },
  failed: { color: 'var(--danger)', bg: 'rgba(229,72,77,0.12)', text: '失败' },
};

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

const btnBase: React.CSSProperties = {
  height: 30, padding: '0 10px', border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-sm)', background: 'transparent',
  color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12,
  display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'inherit',
  transition: 'all 0.15s ease-out',
};

const BackupsPage: React.FC = () => {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form] = Form.useForm();
  const [restoring, setRestoring] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchBackups = async () => {
    setLoading(true);
    try {
      const res = await backupsAPI.list();
      setBackups(res.data.results);
    } catch {
      message.error('加载备份失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBackups(); }, []);

  const handleCreate = async () => {
    setCreating(true);
    try {
      await backupsAPI.create(form.getFieldsValue());
      message.success('备份已创建');
      setCreateModalOpen(false);
      form.resetFields();
      fetchBackups();
    } catch {
      message.error('创建备份失败');
    } finally {
      setCreating(false);
    }
  };

  const handleRestore = async (id: number) => {
    setRestoring(true);
    try {
      await backupsAPI.restore(id);
      message.success('恢复成功');
      fetchBackups();
    } catch {
      message.error('恢复失败');
    } finally {
      setRestoring(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await backupsAPI.delete(id);
      message.success('已删除');
      fetchBackups();
    } catch {
      message.error('删除失败');
    }
  };

  const handleUploadRestore = async (file: File) => {
    if (!file.name.endsWith('.tar.gz') && !file.name.endsWith('.tar')) {
      message.error('仅支持 .tar.gz 或 .tar 格式的备份文件');
      return;
    }

    Modal.confirm({
      title: '确认从上传文件恢复？',
      icon: <ExclamationCircleOutlined />,
      content: `即将从「${file.name}」(${formatSize(file.size)}) 恢复，这将覆盖当前的数据库和上传文件。`,
      okText: '确认恢复',
      cancelText: '取消',
      okType: 'danger',
      async onOk() {
        setUploading(true);
        try {
          await backupsAPI.uploadRestore(file);
          message.success('上传恢复成功');
          fetchBackups();
        } catch {
          message.error('上传恢复失败');
        } finally {
          setUploading(false);
        }
      },
    });
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUploadRestore(file);
    e.target.value = '';
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUploadRestore(file);
  };

  return (
    <div>
      {/* Header */}
      <div className="fade-slide-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Text style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>备份</Text>
        <Space size={8}>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{
              ...btnBase,
              height: 36, padding: '0 14px', fontSize: 13,
              opacity: uploading ? 0.5 : 1,
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-hover)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-subtle)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'; }}
          >
            <UploadOutlined /> {uploading ? '恢复中...' : '上传恢复'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".tar.gz,.tar,.gz"
            style={{ display: 'none' }}
            onChange={onFileInputChange}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setCreateModalOpen(true); }}
            style={{ height: 36 }}>
            创建备份
          </Button>
        </Space>
      </div>

      {/* Upload drop zone */}
      <div
        className="fade-slide-up"
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        style={{
          marginBottom: 20,
          padding: '24px',
          borderRadius: 'var(--radius-md)',
          border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border-default)'}`,
          background: dragOver ? 'var(--accent-muted)' : 'var(--bg-secondary)',
          textAlign: 'center',
          transition: 'all 0.2s ease-out',
          cursor: 'pointer',
          animationDelay: '50ms',
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        <CloudUploadOutlined style={{ fontSize: 28, color: dragOver ? 'var(--accent)' : 'var(--text-quaternary)', transition: 'color 0.2s', marginBottom: 8, display: 'block' }} />
        <Text style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>
          {uploading ? (
            <><Spin size="small" style={{ marginRight: 8 }} />正在恢复中...</>
          ) : (
            '拖拽 .tar.gz 或 .tar 备份文件到此处，或点击选择文件进行恢复'
          )}
        </Text>
      </div>

      {/* Backup list */}
      <Spin spinning={restoring} tip="正在恢复...">
        {backups.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {backups.map((b, i) => {
              const st = STATUS_MAP[b.status] || STATUS_MAP.pending;
              return (
                <div
                  key={b.id}
                  className="card-deal-in"
                  style={{
                    animationDelay: `${i * 40}ms`,
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-hover)';
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-subtle)';
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <Text style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: 13 }}>{b.name}</Text>
                      <span style={{
                        fontSize: 11, padding: '1px 8px', borderRadius: 'var(--radius-pill)',
                        color: st.color, background: st.bg, fontWeight: 500,
                      }}>
                        {st.text}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, flexWrap: 'wrap' }}>
                      <Text style={{ color: 'var(--text-quaternary)', fontFeatureSettings: '"tnum"' }}>
                        <ClockCircleOutlined style={{ marginRight: 4 }} />
                        {dayjs(b.created_at).format('YYYY-MM-DD HH:mm')}
                      </Text>
                      {b.file_size > 0 && (
                        <Text style={{ color: 'var(--text-quaternary)', fontFeatureSettings: '"tnum"' }}>{formatSize(b.file_size)}</Text>
                      )}
                      {b.includes_db && <Text style={{ color: 'var(--text-quaternary)' }}><DatabaseOutlined style={{ marginRight: 2 }} />数据库</Text>}
                      {b.includes_files && <Text style={{ color: 'var(--text-quaternary)' }}><FolderOutlined style={{ marginRight: 2 }} />文件</Text>}
                      {b.note && <Text style={{ color: 'var(--text-quaternary)' }}>"{b.note}"</Text>}
                      {b.error_message && <Text style={{ color: 'var(--danger)', fontSize: 11 }}>{b.error_message}</Text>}
                    </div>
                  </div>

                  <Space size={4}>
                    {b.status === 'completed' && (
                      <>
                        <button onClick={() => backupsAPI.download(b.id)} style={btnBase}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-hover)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-subtle)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'; }}
                        >
                          <DownloadOutlined /> 下载
                        </button>
                        <Popconfirm title="恢复将覆盖当前数据" onConfirm={() => handleRestore(b.id)} okText="恢复" cancelText="取消" okType="danger">
                          <button style={btnBase}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-hover)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-subtle)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'; }}
                          >
                            <UndoOutlined /> 恢复
                          </button>
                        </Popconfirm>
                      </>
                    )}
                    <Popconfirm title="确定删除？" onConfirm={() => handleDelete(b.id)} okText="删除" cancelText="取消">
                      <button style={{
                        ...btnBase, width: 30, padding: 0, justifyContent: 'center',
                        color: 'var(--text-tertiary)',
                      }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(229,72,77,0.3)'; (e.currentTarget as HTMLElement).style.color = '#e5484d'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-subtle)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-tertiary)'; }}
                      >
                        <DeleteOutlined />
                      </button>
                    </Popconfirm>
                  </Space>
                </div>
              );
            })}
          </div>
        ) : !loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 0', gap: 16 }}>
            <Text style={{ color: 'var(--text-tertiary)', fontSize: 14 }}>还没有备份</Text>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setCreateModalOpen(true); }}>
              创建第一个备份
            </Button>
          </div>
        ) : null}
      </Spin>

      <Modal
        title={<Text style={{ color: 'var(--text-primary)', fontWeight: 600 }}>创建备份</Text>}
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        onOk={handleCreate}
        confirmLoading={creating}
        okText="创建"
        cancelText="取消"
        width={400}
      >
        <Form form={form} layout="vertical" initialValues={{ includes_db: true, includes_files: true }}
          style={{ marginTop: 16 }}>
          <Form.Item name="includes_db" valuePropName="checked">
            <Checkbox><Text style={{ color: 'var(--text-secondary)' }}>包含数据库</Text></Checkbox>
          </Form.Item>
          <Form.Item name="includes_files" valuePropName="checked">
            <Checkbox><Text style={{ color: 'var(--text-secondary)' }}>包含上传文件</Text></Checkbox>
          </Form.Item>
          <Form.Item name="note" label={<Text style={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 500 }}>备注</Text>}>
            <Input.TextArea rows={2} placeholder="可选" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default BackupsPage;
