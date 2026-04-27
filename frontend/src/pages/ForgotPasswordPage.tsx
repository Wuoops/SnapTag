import React, { useState } from 'react';
import { Form, Input, Button, Typography, message, Result } from 'antd';
import { MailOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { authAPI } from '../api/auth';

const { Text } = Typography;

const ForgotPasswordPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (values: { email: string }) => {
    setLoading(true);
    try {
      await authAPI.requestPasswordReset(values.email);
      setSent(true);
    } catch (err: any) {
      message.error(err.response?.data?.email?.[0] || '发送失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-primary)',
    }}>
      <div className="fade-slide-up" style={{
        width: 380, padding: '40px 36px',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)',
      }}>
        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%', margin: '0 auto 16px',
              background: 'rgba(48,164,108,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <MailOutlined style={{ color: 'var(--success)', fontSize: 20 }} />
            </div>
            <Text style={{ display: 'block', color: 'var(--text-primary)', fontWeight: 500, fontSize: 16, marginBottom: 8 }}>
              邮件已发送
            </Text>
            <Text style={{ display: 'block', color: 'var(--text-tertiary)', fontSize: 13, marginBottom: 24 }}>
              请查收邮箱中的密码重置链接
            </Text>
            <Link to="/login"><Button type="primary">返回登录</Button></Link>
          </div>
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <Text style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>找回密码</Text>
              <Text style={{ display: 'block', color: 'var(--text-tertiary)', fontSize: 13, marginTop: 8 }}>
                输入注册邮箱
              </Text>
            </div>
            <Form layout="vertical" onFinish={handleSubmit} requiredMark={false}>
              <Form.Item name="email" rules={[{ required: true, type: 'email', message: '请输入有效邮箱' }]}>
                <Input prefix={<MailOutlined style={{ color: 'var(--text-quaternary)' }} />} placeholder="注册邮箱" size="large" />
              </Form.Item>
              <Form.Item style={{ marginBottom: 16 }}>
                <Button type="primary" htmlType="submit" block size="large" loading={loading}
                  style={{ height: 42, fontWeight: 500 }}>发送重置链接</Button>
              </Form.Item>
            </Form>
            <div style={{ textAlign: 'center' }}>
              <Link to="/login" style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>返回登录</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
