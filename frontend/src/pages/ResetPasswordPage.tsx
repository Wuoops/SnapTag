import React, { useState } from 'react';
import { Form, Input, Button, Typography, message } from 'antd';
import { LockOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useParams, Link } from 'react-router-dom';
import { authAPI } from '../api/auth';

const { Text } = Typography;

const ResetPasswordPage: React.FC = () => {
  const { uid, token } = useParams<{ uid: string; token: string }>();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (values: { new_password: string }) => {
    if (!uid || !token) return;
    setLoading(true);
    try {
      await authAPI.confirmPasswordReset({ uid, token, new_password: values.new_password });
      setSuccess(true);
    } catch (err: any) {
      message.error(err.response?.data?.detail || '重置失败');
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
        {success ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%', margin: '0 auto 16px',
              background: 'rgba(48,164,108,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <CheckCircleOutlined style={{ color: 'var(--success)', fontSize: 20 }} />
            </div>
            <Text style={{ display: 'block', color: 'var(--text-primary)', fontWeight: 500, fontSize: 16, marginBottom: 8 }}>
              密码已重置
            </Text>
            <Link to="/login"><Button type="primary">去登录</Button></Link>
          </div>
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <Text style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>设置新密码</Text>
            </div>
            <Form layout="vertical" onFinish={handleSubmit} requiredMark={false}>
              <Form.Item name="new_password" rules={[{ required: true, message: '请输入新密码' }, { min: 8, message: '至少8个字符' }]}>
                <Input.Password prefix={<LockOutlined style={{ color: 'var(--text-quaternary)' }} />} placeholder="新密码" size="large" />
              </Form.Item>
              <Form.Item name="confirm" dependencies={['new_password']}
                rules={[{ required: true, message: '请确认密码' },
                  ({ getFieldValue }) => ({ validator(_, v) { return !v || getFieldValue('new_password') === v ? Promise.resolve() : Promise.reject('两次密码不一致'); }})]}>
                <Input.Password prefix={<LockOutlined style={{ color: 'var(--text-quaternary)' }} />} placeholder="确认新密码" size="large" />
              </Form.Item>
              <Button type="primary" htmlType="submit" block size="large" loading={loading}
                style={{ height: 42, fontWeight: 500 }}>重置密码</Button>
            </Form>
          </>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordPage;
