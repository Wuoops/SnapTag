import React, { useState } from 'react';
import { Form, Input, Button, Typography, message, Tooltip } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, SunOutlined, MoonOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';

const { Text } = Typography;

interface RegisterPageProps {
  onRegister: (data: { username: string; email: string; password: string; password_confirm: string }) => Promise<any>;
}

const RegisterPage: React.FC<RegisterPageProps> = ({ onRegister }) => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { mode, toggle } = useTheme();

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      await onRegister(values);
      message.success('注册成功');
      navigate('/');
    } catch (err: any) {
      const errors = err.response?.data;
      if (errors && typeof errors === 'object') {
        message.error(String(Object.values(errors).flat()[0]));
      } else {
        message.error('注册失败');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-primary)', transition: 'background 0.3s ease',
    }}>
      <Tooltip title={mode === 'dark' ? '切换日间模式' : '切换夜间模式'}>
        <button onClick={toggle} style={{
          position: 'fixed', top: 20, right: 20, width: 36, height: 36,
          borderRadius: '50%', border: '1px solid var(--border-default)',
          background: 'var(--bg-surface)', color: 'var(--text-secondary)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, transition: 'all 0.2s ease-out', zIndex: 10,
        }}>
          {mode === 'dark' ? <SunOutlined /> : <MoonOutlined />}
        </button>
      </Tooltip>
      <div style={{
        position: 'fixed', width: 600, height: 600, borderRadius: '50%',
        background: 'radial-gradient(circle, var(--accent-glow) 0%, transparent 70%)',
        top: '20%', left: '50%', transform: 'translateX(-50%)', pointerEvents: 'none',
      }} />

      <div className="fade-slide-up" style={{
        width: 380, padding: '40px 36px',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)',
        position: 'relative',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <Text style={{ fontSize: 24, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.04em' }}>
            注册 Snap<span style={{ color: 'var(--accent)' }}>Tag</span>
          </Text>
          <Text style={{ display: 'block', color: 'var(--text-tertiary)', fontSize: 13, marginTop: 8 }}>
            创建账号开始使用
          </Text>
        </div>

        <Form layout="vertical" onFinish={handleSubmit} requiredMark={false}>
          <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }, { min: 3, message: '至少3个字符' }]}>
            <Input prefix={<UserOutlined style={{ color: 'var(--text-quaternary)' }} />} placeholder="用户名" size="large" />
          </Form.Item>
          <Form.Item name="email" rules={[{ required: true, type: 'email', message: '请输入有效邮箱' }]}>
            <Input prefix={<MailOutlined style={{ color: 'var(--text-quaternary)' }} />} placeholder="邮箱" size="large" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }, { min: 8, message: '至少8个字符' }]}>
            <Input.Password prefix={<LockOutlined style={{ color: 'var(--text-quaternary)' }} />} placeholder="密码" size="large" />
          </Form.Item>
          <Form.Item name="password_confirm" dependencies={['password']}
            rules={[{ required: true, message: '请确认密码' },
              ({ getFieldValue }) => ({ validator(_, v) { return !v || getFieldValue('password') === v ? Promise.resolve() : Promise.reject('两次密码不一致'); }})]}>
            <Input.Password prefix={<LockOutlined style={{ color: 'var(--text-quaternary)' }} />} placeholder="确认密码" size="large" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 16 }}>
            <Button type="primary" htmlType="submit" block size="large" loading={loading}
              style={{ height: 42, fontWeight: 500 }}>注册</Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center', fontSize: 13 }}>
          <Text style={{ color: 'var(--text-tertiary)' }}>已有账号？</Text>{' '}
          <Link to="/login" style={{ color: 'var(--accent)' }}>登录</Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
