// src/components/NicknameModal.jsx
import { useState } from 'react'
import { Modal, Form, Input, Button, Typography, message } from 'antd'
import { UserOutlined, ThunderboltOutlined } from '@ant-design/icons'
import { useGameProgress } from '../hooks/useGameProgress'

const { Title, Text } = Typography

export default function NicknameModal({ open, onRegistered }) {
  const { registerNickname, checkNicknameExists } = useGameProgress()
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm()

  const handleSubmit = async (values) => {
    const nick = values.nickname.trim()
    if (!nick) return
    setSubmitting(true)

    try {
      const result = await registerNickname(nick)
      if (result.success) {
        if (result.existed) {
          message.info(`「${nick}」已存在，已直接延用您的舊進度。`)
        }
        message.success('暱稱設定成功！')
        if (onRegistered) onRegistered(nick)
      } else {
        message.error(result.error || '設定失敗，請稍後再試。')
      }
    } catch {
      message.error('連線伺服器發生錯誤')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      footer={null}
      closable={false}
      maskClosable={false}
      centered
      styles={{ body: { padding: '24px 12px' } }}
      width={360}
      style={{ borderRadius: 16 }}
    >
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: 'linear-gradient(135deg, #4f46e5, #0ea5e9)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 12px',
          boxShadow: '0 4px 12px rgba(79,70,229,0.2)'
        }}>
          <ThunderboltOutlined style={{ fontSize: 22, color: '#fff' }} />
        </div>
        <Title level={4} style={{ margin: 0 }}>設定您的暱稱</Title>
        <Text type="secondary" style={{ fontSize: 13, display: 'block', marginTop: 4 }}>
          開始收集印章前，請先輸入您的暱稱
        </Text>
      </div>

      <Form form={form} layout="vertical" onFinish={handleSubmit} size="large">
        <Form.Item
          name="nickname"
          rules={[
            { required: true, message: '請輸入暱稱' },
            { max: 20, message: '長度上限為 20 個字元' }
          ]}
        >
          <Input
            prefix={<UserOutlined style={{ color: '#bfbfbf' }} />}
            placeholder="例如：小明_12"
            style={{ borderRadius: 8 }}
          />
        </Form.Item>
        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 16, marginTop: -8 }}>
          ✦ 建議加上後綴（如學號末兩碼）避免撞名。
        </Text>

        <Form.Item style={{ marginBottom: 0 }}>
          <Button
            type="primary"
            htmlType="submit"
            loading={submitting}
            block
            style={{
              borderRadius: 8,
              height: 40,
              background: 'linear-gradient(135deg, #4f46e5, #0ea5e9)',
              border: 'none',
              fontWeight: 600,
            }}
          >
            確定，開始闖關
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  )
}
