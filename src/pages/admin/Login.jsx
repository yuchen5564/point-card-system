// src/pages/admin/Login.jsx — Ant Design 版

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Form, Input, Button, Card, Typography, Alert, Spin } from 'antd'
import { UserOutlined, LockOutlined, ThunderboltOutlined } from '@ant-design/icons'

const { Title, Text } = Typography

export default function Login() {
  const { signIn, isAuthenticated, authLoading, authError, setAuthError } = useAuth()
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!authLoading && isAuthenticated) navigate('/admin/dashboard', { replace: true })
  }, [isAuthenticated, authLoading, navigate])

  const handleSubmit = async ({ email, password }) => {
    setSubmitting(true)
    setAuthError(null)
    const result = await signIn(email, password)
    setSubmitting(false)
    if (result.success) navigate('/admin/dashboard', { replace: true })
  }

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f2f5' }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #eef2ff 0%, #f0f9ff 100%)',
      padding: 24,
    }}>
      {/* 背景裝飾 */}
      <div style={{
        position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0,
      }}>
        <div style={{
          position: 'absolute', top: -160, right: -160, width: 420, height: 420,
          borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.12), transparent)',
        }} />
        <div style={{
          position: 'absolute', bottom: -160, left: -160, width: 420, height: 420,
          borderRadius: '50%', background: 'radial-gradient(circle, rgba(14,165,233,0.10), transparent)',
        }} />
      </div>

      <Card
        style={{
          width: '100%', maxWidth: 420,
          borderRadius: 16,
          boxShadow: '0 12px 40px rgba(15,23,42,0.12)',
          border: '1px solid rgba(99,102,241,0.12)',
          position: 'relative', zIndex: 1,
        }}
        styles={{ body: { padding: 40 } }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: 'linear-gradient(135deg, #4f46e5, #0ea5e9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 6px 20px rgba(79,70,229,0.35)',
          }}>
            <ThunderboltOutlined style={{ fontSize: 24, color: '#fff' }} />
          </div>
          <Title level={3} style={{ margin: 0, color: '#0f172a' }}>管理後台</Title>
          <Text type="secondary" style={{ fontSize: 13 }}>請以管理員帳號登入</Text>
        </div>

        {authError && (
          <Alert message={authError} type="error" showIcon style={{ marginBottom: 20, borderRadius: 8 }} />
        )}

        <Form layout="vertical" onFinish={handleSubmit} size="large">
          <Form.Item
            name="email"
            label="電子郵件"
            rules={[
              { required: true, message: '請輸入電子郵件' },
              { type: 'email', message: '請輸入有效的電子郵件格式' },
            ]}
          >
            <Input
              prefix={<UserOutlined style={{ color: '#9ca3af' }} />}
              placeholder="admin@example.com"
              style={{ borderRadius: 8 }}
              onChange={() => setAuthError(null)}
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="密碼"
            rules={[{ required: true, message: '請輸入密碼' }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#9ca3af' }} />}
              placeholder="••••••••"
              style={{ borderRadius: 8 }}
              onChange={() => setAuthError(null)}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={submitting}
              block
              size="large"
              style={{
                borderRadius: 8, height: 44,
                background: 'linear-gradient(135deg, #4f46e5, #0ea5e9)',
                border: 'none',
                boxShadow: '0 4px 16px rgba(79,70,229,0.3)',
              }}
            >
              {submitting ? '登入中…' : '登入後台'}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
