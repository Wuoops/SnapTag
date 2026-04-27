import React, { useState } from 'react';
import { Form, Input, Button, Typography, message, Tooltip } from 'antd';
import { UserOutlined, LockOutlined, SunOutlined, MoonOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';

const { Text } = Typography;

interface LoginPageProps {
  onLogin: (username: string, password: string) => Promise<any>;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { mode, toggle } = useTheme();

  const handleSubmit = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      await onLogin(values.username, values.password);
      message.success('登录成功');
      navigate('/');
    } catch (err: any) {
      message.error(err.response?.data?.detail || '登录失败');
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
            Snap<span style={{ color: 'var(--accent)' }}>Tag</span>
          </Text>
          <Text style={{ display: 'block', color: 'var(--text-tertiary)', fontSize: 13, marginTop: 8 }}>
            登录你的账号
          </Text>
        </div>

        <Form layout="vertical" onFinish={handleSubmit} requiredMark={false}>
          <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input prefix={<UserOutlined style={{ color: 'var(--text-quaternary)' }} />} placeholder="用户名或邮箱" size="large" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password prefix={<LockOutlined style={{ color: 'var(--text-quaternary)' }} />} placeholder="密码" size="large" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 16 }}>
            <Button type="primary" htmlType="submit" block size="large" loading={loading}
              style={{ height: 42, fontWeight: 500 }}>
              登录
            </Button>
          </Form.Item>
        </Form>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
          <Link to="/register" style={{ color: 'var(--accent)' }}>注册账号</Link>
          <Link to="/forgot-password" style={{ color: 'var(--text-tertiary)' }}>忘记密码</Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
