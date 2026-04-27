import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Modal, Form, Input, message, Typography, ColorPicker, Tooltip,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  ExclamationCircleOutlined, InfoCircleOutlined, TagsOutlined,
} from '@ant-design/icons';
import Matter from 'matter-js';
import { tagsAPI } from '../api/tags';
import type { Tag } from '../types';

const { Text } = Typography;

const BUBBLE_R_MIN = 30;
const BUBBLE_R_MAX = 56;
const BUBBLE_EXPAND_EXTRA = 16;
const WALL_T = 60;
const BATCH = 8;
const BATCH_DELAY = 100;
const FONT = "600 11px 'Inter', sans-serif";

let _measureCtx: CanvasRenderingContext2D | null = null;
function measureText(text: string): number {
  if (!_measureCtx) {
    const c = document.createElement('canvas');
    _measureCtx = c.getContext('2d')!;
  }
  _measureCtx.font = FONT;
  return _measureCtx.measureText(text).width;
}

function bubbleRadius(tag: Tag): number {
  const textW = measureText(tag.name);
  const textR = Math.max((textW + 20) / 2, BUBBLE_R_MIN);

  const u = Math.min(tag.usage_count, 60);
  const usageR = BUBBLE_R_MIN + (BUBBLE_R_MAX - BUBBLE_R_MIN) * (u / 60);

  return Math.min(Math.max(textR, usageR), BUBBLE_R_MAX);
}

function expandedRadius(tag: Tag): number {
  return bubbleRadius(tag) + BUBBLE_EXPAND_EXTRA;
}

const TagsPage: React.FC = () => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [form] = Form.useForm();

  const sceneRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const runnerRef = useRef<Matter.Runner | null>(null);
  const bodiesRef = useRef<Map<number, Matter.Body>>(new Map());
  const domRef = useRef<Map<number, HTMLDivElement>>(new Map());
  const wallsRef = useRef<Matter.Body[]>([]);
  const rafRef = useRef<number>(0);
  const spawnTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const fetchTags = async () => {
    setLoading(true);
    try {
      const res = await tagsAPI.list();
      setTags(res.data.results);
    } catch {
      message.error('加载标签失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTags(); }, []);

  useEffect(() => {
    const engine = Matter.Engine.create({
      gravity: { x: 0, y: -0.8, scale: 0.001 },
    });
    engineRef.current = engine;

    const runner = Matter.Runner.create({ delta: 1000 / 60 });
    runnerRef.current = runner;
    Matter.Runner.run(runner, engine);

    // Gentle random horizontal drift to simulate water currents
    Matter.Events.on(engine, 'beforeUpdate', () => {
      bodiesRef.current.forEach((body) => {
        const drift = (Math.sin(Date.now() * 0.001 + body.position.x * 0.05) * 0.00004);
        Matter.Body.applyForce(body, body.position, { x: drift, y: 0 });
      });
    });

    return () => {
      cancelAnimationFrame(rafRef.current);
      spawnTimers.current.forEach(clearTimeout);
      Matter.Runner.stop(runner);
      Matter.Engine.clear(engine);
      engineRef.current = null;
      runnerRef.current = null;
    };
  }, []);

  const rebuildWalls = useCallback(() => {
    const engine = engineRef.current;
    const scene = sceneRef.current;
    if (!engine || !scene) return;

    if (wallsRef.current.length) {
      Matter.Composite.remove(engine.world, wallsRef.current);
    }

    const w = scene.clientWidth;
    const h = scene.clientHeight;
    const opts: Matter.IChamferableBodyDefinition = { isStatic: true, restitution: 0.4, friction: 0 };
    const walls = [
      Matter.Bodies.rectangle(w / 2, -WALL_T / 2, w + WALL_T * 2, WALL_T, opts),
      Matter.Bodies.rectangle(w / 2, h + WALL_T / 2, w + WALL_T * 2, WALL_T, opts),
      Matter.Bodies.rectangle(-WALL_T / 2, h / 2, WALL_T, h + WALL_T * 2, opts),
      Matter.Bodies.rectangle(w + WALL_T / 2, h / 2, WALL_T, h + WALL_T * 2, opts),
    ];
    wallsRef.current = walls;
    Matter.Composite.add(engine.world, walls);
  }, []);

  useEffect(() => {
    rebuildWalls();
    const obs = new ResizeObserver(() => rebuildWalls());
    if (sceneRef.current) obs.observe(sceneRef.current);
    return () => obs.disconnect();
  }, [rebuildWalls]);

  useEffect(() => {
    const engine = engineRef.current;
    const scene = sceneRef.current;
    if (!engine || !scene || tags.length === 0) return;

    const w = scene.clientWidth;
    const h = scene.clientHeight;
    const existing = bodiesRef.current;
    const tagIds = new Set(tags.map((t) => t.id));

    existing.forEach((body, id) => {
      if (!tagIds.has(id)) {
        Matter.Composite.remove(engine.world, body);
        existing.delete(id);
      }
    });

    spawnTimers.current.forEach(clearTimeout);
    spawnTimers.current = [];

    const newTags = tags.filter((t) => !existing.has(t.id));
    newTags.forEach((tag, i) => {
      const timer = setTimeout(() => {
        if (!engineRef.current) return;
        const r = bubbleRadius(tag);
        const col = i % BATCH;
        const slotW = w / Math.min(newTags.length, BATCH);
        const x = slotW * col + slotW / 2 + (Math.random() - 0.5) * slotW * 0.3;

        const spawnY = h / 2 + (Math.random() - 0.5) * h * 0.15;
        const body = Matter.Bodies.circle(
          Math.max(r, Math.min(x, w - r)),
          spawnY,
          r,
          {
            restitution: 0.3,
            friction: 0.01,
            frictionAir: 0.025,
            density: 0.0005,
            label: String(tag.id),
          },
        );
        Matter.Body.setVelocity(body, {
          x: (Math.random() - 0.5) * 1.5,
          y: -(2 + Math.random() * 2),
        });
        Matter.Composite.add(engineRef.current!.world, body);
        existing.set(tag.id, body);
      }, Math.floor(i / BATCH) * BATCH_DELAY + Math.random() * 30);

      spawnTimers.current.push(timer);
    });
  }, [tags]);

  useEffect(() => {
    const loop = () => {
      bodiesRef.current.forEach((body, id) => {
        const el = domRef.current.get(id);
        if (!el) return;
        const { x, y } = body.position;
        const r = body.circleRadius || BUBBLE_R_MIN;
        el.style.transform = `translate(${x - r}px, ${y - r}px)`;
      });
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  useEffect(() => {
    bodiesRef.current.forEach((body, id) => {
      const tag = tags.find((t) => t.id === id);
      if (!tag) return;
      const targetR = expandedId === id ? expandedRadius(tag) : bubbleRadius(tag);
      const currentR = body.circleRadius || BUBBLE_R_MIN;
      if (Math.abs(currentR - targetR) > 1) {
        Matter.Body.scale(body, targetR / currentR, targetR / currentR);
        (body as any).circleRadius = targetR;
      }
    });
  }, [expandedId, tags]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const scene = sceneRef.current;
      if (!scene) return;
      const bubbles = Array.from(domRef.current.values());
      if (!scene.contains(e.target as Node) || !bubbles.some((el) => el.contains(e.target as Node))) {
        setExpandedId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const aliasList = (values.alias_list || '').split(',').map((s: string) => s.trim()).filter(Boolean);
      const color = typeof values.color === 'string' ? values.color : values.color?.toHexString?.() || '#6c72cb';
      const payload = { name: values.name, color, description: values.description || '', alias_list: aliasList };

      if (editingTag) {
        await tagsAPI.update(editingTag.id, payload);
        message.success('更新成功');
      } else {
        await tagsAPI.create(payload);
        message.success('创建成功');
      }
      setModalOpen(false);
      setEditingTag(null);
      form.resetFields();
      fetchTags();
    } catch { /* validation */ }
  };

  const handleEdit = (tag: Tag) => {
    setExpandedId(null);
    setEditingTag(tag);
    form.setFieldsValue({
      name: tag.name, color: tag.color, description: tag.description,
      alias_list: tag.aliases.map((a) => a.alias).join(', '),
    });
    setModalOpen(true);
  };

  const handleDelete = async (tag: Tag) => {
    if (tag.usage_count > 0) {
      Modal.confirm({
        title: '确认删除',
        icon: <ExclamationCircleOutlined />,
        content: `「${tag.name}」正在被 ${tag.usage_count} 个文件使用，删除后这些文件将失去该标签。`,
        okText: '确认删除', cancelText: '取消', okType: 'danger',
        async onOk() {
          await tagsAPI.delete(tag.id);
          message.success('已删除');
          setExpandedId(null);
          fetchTags();
        },
      });
    } else {
      await tagsAPI.delete(tag.id);
      message.success('已删除');
      setExpandedId(null);
      fetchTags();
    }
  };

  const toggleExpand = (id: number) => {
    setExpandedId((prev) => prev === id ? null : id);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px)' }}>
      {/* Header */}
      <div className="fade-slide-up" style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexShrink: 0,
      }}>
        <div>
          <Text style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em', display: 'block' }}>
            标签管理
          </Text>
          <Text style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
            <InfoCircleOutlined />
            点击气泡展开操作 · 编辑和删除会影响关联文件
          </Text>
        </div>
        <Tooltip title="新建标签">
          <button
            onClick={() => { setEditingTag(null); form.resetFields(); setModalOpen(true); }}
            style={{
              width: 36, height: 36, borderRadius: '50%',
              border: '2px dashed var(--border-default)',
              background: 'transparent', color: 'var(--text-tertiary)',
              cursor: 'pointer', fontSize: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s var(--ease-out)',
            }}
            onMouseEnter={(e) => { const el = e.currentTarget; el.style.borderColor = 'var(--accent)'; el.style.color = 'var(--accent)'; el.style.transform = 'scale(1.1)'; }}
            onMouseLeave={(e) => { const el = e.currentTarget; el.style.borderColor = 'var(--border-default)'; el.style.color = 'var(--text-tertiary)'; el.style.transform = 'scale(1)'; }}
          >
            <PlusOutlined />
          </button>
        </Tooltip>
      </div>

      {/* Stats */}
      <div className="fade-slide-up" style={{ marginBottom: 12, flexShrink: 0, animationDelay: '50ms' }}>
        <Text style={{ fontSize: 12, color: 'var(--text-quaternary)', fontFeatureSettings: '"tnum"' }}>
          {tags.length} 个标签
        </Text>
      </div>

      {/* Physics scene */}
      <div
        ref={sceneRef}
        style={{
          flex: 1, position: 'relative', overflow: 'hidden',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          background: 'var(--bg-secondary)',
          minHeight: 300,
        }}
      >
        {tags.map((tag) => {
          const isExpanded = expandedId === tag.id;
          const size = isExpanded ? expandedRadius(tag) * 2 : bubbleRadius(tag) * 2;

          return (
            <div
              key={tag.id}
              ref={(el) => { if (el) domRef.current.set(tag.id, el); else domRef.current.delete(tag.id); }}
              onClick={() => toggleExpand(tag.id)}
              style={{
                position: 'absolute', top: 0, left: 0,
                width: size, height: size,
                transition: 'width 0.3s var(--ease-spring), height 0.3s var(--ease-spring)',
                zIndex: isExpanded ? 10 : 1,
                cursor: 'pointer',
              }}
            >
              {/* Bubble surface */}
              <div
                style={{
                  width: '100%', height: '100%',
                  borderRadius: '50%',
                  background: `radial-gradient(circle at 35% 30%, ${tag.color}35, ${tag.color}10 75%)`,
                  border: `2px solid ${isExpanded ? tag.color + 'cc' : tag.color + '44'}`,
                  boxShadow: isExpanded
                    ? `0 0 30px ${tag.color}30, inset 0 -6px 16px ${tag.color}18, inset 0 2px 6px rgba(255,255,255,0.08)`
                    : `0 2px 12px ${tag.color}15, inset 0 -4px 10px ${tag.color}08, inset 0 2px 4px rgba(255,255,255,0.06)`,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  gap: isExpanded ? 6 : 0,
                  transition: 'border-color 0.25s, box-shadow 0.3s',
                  position: 'relative',
                  userSelect: 'none',
                  overflow: 'hidden',
                }}
              >
                {/* Glossy highlight — water surface tension feel */}
                <div style={{
                  position: 'absolute', top: '10%', left: '18%',
                  width: '40%', height: '28%',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.2)',
                  filter: 'blur(4px)',
                  pointerEvents: 'none',
                }} />
                <div style={{
                  position: 'absolute', top: '8%', left: '25%',
                  width: '20%', height: '12%',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.3)',
                  filter: 'blur(2px)',
                  pointerEvents: 'none',
                }} />

                {/* Tag name */}
                <span style={{
                  fontSize: isExpanded ? 13 : Math.max(9, Math.min(12, size * 0.17)),
                  fontWeight: 600, color: tag.color,
                  textAlign: 'center', lineHeight: 1.2,
                  maxWidth: size - 12,
                  whiteSpace: 'nowrap',
                  transition: 'font-size 0.2s ease',
                  textShadow: `0 0 10px ${tag.color}40`,
                  position: 'relative',
                }}>
                  {tag.name}
                </span>

                {/* Expanded: edit + delete buttons inside the bubble */}
                {isExpanded && (
                  <div style={{
                    display: 'flex', gap: 6,
                    animation: 'fadeSlideUp 0.2s ease both',
                  }}>
                    <Tooltip title="编辑">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEdit(tag); }}
                        className="bubble-action-btn"
                      >
                        <EditOutlined />
                      </button>
                    </Tooltip>
                    <Tooltip title={tag.usage_count > 0 ? `删除（${tag.usage_count} 文件使用中）` : '删除'}>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(tag); }}
                        className="bubble-action-btn bubble-action-danger"
                      >
                        <DeleteOutlined />
                      </button>
                    </Tooltip>
                  </div>
                )}

                {/* Usage count badge */}
                {tag.usage_count > 0 && !isExpanded && (
                  <span style={{
                    position: 'absolute', top: 0, right: 0,
                    minWidth: 18, height: 18, borderRadius: 9, padding: '0 5px',
                    background: 'var(--bg-elevated)', border: '1.5px solid var(--border-default)',
                    color: 'var(--text-tertiary)', fontSize: 9, fontWeight: 600,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFeatureSettings: '"tnum"', lineHeight: 1,
                  }}>
                    {tag.usage_count}
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {!loading && tags.length === 0 && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 16,
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              border: '2px dashed var(--border-default)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-quaternary)', fontSize: 24,
            }}>
              <TagsOutlined />
            </div>
            <Text style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>还没有标签</Text>
            <button
              onClick={() => { form.resetFields(); setModalOpen(true); }}
              style={{
                padding: '8px 20px', borderRadius: 'var(--radius-pill)',
                border: '1px solid var(--accent)', background: 'var(--accent-muted)',
                color: 'var(--accent)', fontSize: 13, fontWeight: 500,
                cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s ease-out',
              }}
            >
              <PlusOutlined style={{ marginRight: 6 }} />创建第一个标签
            </button>
          </div>
        )}
      </div>

      <Modal
        title={<Text style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{editingTag ? '编辑标签' : '新建标签'}</Text>}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditingTag(null); form.resetFields(); }}
        onOk={handleSubmit}
        okText={editingTag ? '保存' : '创建'}
        cancelText="取消"
        width={420}
      >
        <Form form={form} layout="vertical" initialValues={{ color: '#6c72cb' }} requiredMark={false} style={{ marginTop: 16 }}>
          <Form.Item name="name" label={<Text style={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 500 }}>标签名</Text>}
            rules={[{ required: true, message: '请输入标签名' }]}>
            <Input placeholder="标签名称" />
          </Form.Item>
          <Form.Item name="color" label={<Text style={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 500 }}>颜色</Text>}>
            <ColorPicker format="hex" />
          </Form.Item>
          <Form.Item name="description" label={<Text style={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 500 }}>描述</Text>}>
            <Input.TextArea rows={2} placeholder="可选" />
          </Form.Item>
          <Form.Item name="alias_list" label={<Text style={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 500 }}>别名</Text>}
            extra={<Text style={{ color: 'var(--text-quaternary)', fontSize: 11 }}>逗号分隔，如: JS, javascript</Text>}>
            <Input placeholder="标签别名" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TagsPage;
