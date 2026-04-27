import React, { useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Spin, Typography, Dropdown } from 'antd';
import {
  FileOutlined, TagsOutlined, CloudOutlined,
  LogoutOutlined, UserOutlined, SunOutlined, MoonOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { useAuth } from './hooks/useAuth';
import { useTheme } from './hooks/useTheme';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import FilesPage from './pages/FilesPage';
import TagsPage from './pages/TagsPage';
import BackupsPage from './pages/BackupsPage';

const { Text } = Typography;

const NAV_ITEMS = [
  { key: '/', icon: <FileOutlined />, label: '文件' },
];

const ADMIN_ITEMS = [
  { key: '/tags', icon: <TagsOutlined />, label: '标签管理' },
  { key: '/backups', icon: <CloudOutlined />, label: '备份管理' },
];

const App: React.FC = () => {
  const { user, loading, login, register, logout } = useAuth();
  const { mode, toggle } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [spinning, setSpinning] = useState(false);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-primary)',
      }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage onLogin={login} />} />
        <Route path="/register" element={<RegisterPage onRegister={register} />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password/:uid/:token" element={<ResetPasswordPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  const handleToggle = () => {
    setSpinning(true);
    toggle();
    setTimeout(() => setSpinning(false), 400);
  };

  const renderNavBtn = (item: { key: string; icon: React.ReactNode; label: string }, compact = false) => {
    const active = location.pathname === item.key;
    return (
      <button
        key={item.key}
        onClick={() => navigate(item.key)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, width: '100%',
          padding: compact ? '6px 12px' : '8px 12px', marginBottom: 2, border: 'none',
          borderRadius: 'var(--radius-sm)',
          background: active ? 'var(--accent-muted)' : 'transparent',
          color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
          cursor: 'pointer', fontSize: compact ? 12 : 13,
          fontWeight: active ? 500 : 400,
          fontFamily: 'inherit', transition: 'all 0.15s ease-out', textAlign: 'left',
        }}
        onMouseEnter={(e) => {
          if (!active) {
            (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)';
            (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)';
          }
        }}
        onMouseLeave={(e) => {
          if (!active) {
            (e.currentTarget as HTMLElement).style.background = 'transparent';
            (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
          }
        }}
      >
        <span style={{ fontSize: compact ? 13 : 15, opacity: active ? 1 : 0.6 }}>{item.icon}</span>
        {item.label}
      </button>
    );
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex' }}>
      <aside style={{
        width: 200, position: 'fixed', top: 0, left: 0, bottom: 0,
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex', flexDirection: 'column', zIndex: 100,
        transition: 'background 0.3s ease, border-color 0.3s ease',
      }}>
        {/* Logo */}
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
          <Text style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.04em' }}>
            Snap<span style={{ color: 'var(--accent)' }}>Tag</span>
          </Text>
        </div>

        {/* Main nav */}
        <nav style={{ flex: 1, padding: '12px 8px' }}>
          {NAV_ITEMS.map((item) => renderNavBtn(item))}
        </nav>

        {/* Admin section */}
        <div style={{ padding: '0 8px 4px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '4px 12px 6px', marginBottom: 2,
          }}>
            <SettingOutlined style={{ fontSize: 10, color: 'var(--text-quaternary)' }} />
            <Text style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-quaternary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              管理
            </Text>
          </div>
          {ADMIN_ITEMS.map((item) => renderNavBtn(item, true))}
        </div>

        {/* Theme toggle + User */}
        <div style={{ padding: '8px', borderTop: '1px solid var(--border-subtle)' }}>
          <button
            onClick={handleToggle}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%',
              padding: '8px 12px', marginBottom: 4, border: 'none',
              borderRadius: 'var(--radius-sm)', background: 'transparent',
              color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13,
              fontFamily: 'inherit', transition: 'all 0.15s ease-out', textAlign: 'left',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)';
              (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'transparent';
              (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
            }}
          >
            <span
              className={spinning ? 'theme-toggle-icon-spin' : ''}
              style={{ fontSize: 15, opacity: 0.6, display: 'inline-flex' }}
            >
              {mode === 'dark' ? <SunOutlined /> : <MoonOutlined />}
            </span>
            {mode === 'dark' ? '切换日间模式' : '切换夜间模式'}
          </button>

          <Dropdown
            menu={{
              items: [{
                key: 'logout', icon: <LogoutOutlined />, label: '退出登录',
                onClick: async () => { await logout(); navigate('/login'); },
              }],
            }}
            placement="topRight"
            trigger={['click']}
          >
            <button style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%',
              padding: '8px 12px', border: 'none', borderRadius: 'var(--radius-sm)',
              background: 'transparent', cursor: 'pointer', fontFamily: 'inherit',
              transition: 'background 0.15s ease-out',
            }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'var(--accent-muted)', border: '1px solid var(--border-subtle)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <UserOutlined style={{ color: 'var(--accent)', fontSize: 12 }} />
              </div>
              <Text style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{user.username}</Text>
            </button>
          </Dropdown>
        </div>
      </aside>

      <main style={{
        flex: 1, marginLeft: 200, padding: '28px 32px', minHeight: '100vh',
        transition: 'background 0.3s ease',
      }}>
        <Routes>
          <Route path="/" element={<FilesPage />} />
          <Route path="/tags" element={<TagsPage />} />
          <Route path="/backups" element={<BackupsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
};

export default App;
