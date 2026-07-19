// src/pages/Home.jsx — Ant Design 版前台首頁

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameProgress } from '../hooks/useGameProgress'
import Toast from '../components/Toast'
import {
  Card, Progress, List, Button, Input, Space, Typography, Spin, Badge, Alert, Tag, Modal
} from 'antd'
import {
  ThunderboltOutlined, UserOutlined, LockOutlined,
  CheckCircleOutlined, TrophyOutlined, RightOutlined, LogoutOutlined
} from '@ant-design/icons'

const { Title, Text, Paragraph } = Typography

export default function Home() {
  const {
    nickname, progress, unlocked, levels,
    loading, error, setError,
    registerNickname, checkNicknameExists, fetchLevels, clearNickname
  } = useGameProgress()

  const [inputNick, setInputNick] = useState('')
  const [toast, setToast] = useState(null)
  const [registering, setRegistering] = useState(false)

  const navigate = useNavigate()

  const handleLogout = () => {
    Modal.confirm({
      title: '確定要切換使用者嗎？',
      content: '這將清除此裝置上的本地暫存。別擔心！您的通關進度與解鎖清單已儲存在雲端資料庫，只要重新登入相同暱稱即可恢復。',
      okText: '確認切換',
      cancelText: '取消',
      okType: 'danger',
      onOk() {
        clearNickname()
        setInputNick('')
      }
    })
  }

  useEffect(() => {
    if (!nickname) {
      fetchLevels()
    } else {
      // 玩家已登入，且如果暫存有跳轉目標，立刻跳轉回原頁面
      const redirectUrl = sessionStorage.getItem('nfc_game_redirect_url')
      if (redirectUrl) {
        sessionStorage.removeItem('nfc_game_redirect_url')
        navigate(redirectUrl, { replace: true })
      }
    }
  }, [nickname, navigate, fetchLevels])

  useEffect(() => {
    if (error) {
      setToast({ message: error, type: 'error' })
      setError(null)
    }
  }, [error, setError])

  const handleRegister = async (e) => {
    e.preventDefault()
    const nick = inputNick.trim()
    if (!nick) return
    setRegistering(true)
    const result = await registerNickname(nick)
    setRegistering(false)
    if (result.success) {
      if (result.existed) {
        setToast({ message: `「${nick}」已存在，將延用現有進度。`, type: 'info' })
      }
      // 登錄成功，檢查並跳轉暫存的 NFC 網址
      const redirectUrl = sessionStorage.getItem('nfc_game_redirect_url')
      if (redirectUrl) {
        sessionStorage.removeItem('nfc_game_redirect_url')
        navigate(redirectUrl, { replace: true })
      }
    } else {
      setToast({ message: result.error || '登錄失敗，請稍後再試。', type: 'error' })
    }
  }

  // 過濾掉已經在資料庫中被刪除的關卡，避免計數異常
  const validCompletedLevels = progress.filter(id => levels.some(l => l.id === id))
  const completedCount = validCompletedLevels.length
  const totalCount = levels.length
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0
  const isComplete = totalCount > 0 && completedCount === totalCount

  /* ── 未登錄畫面 ── */
  if (!nickname) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #eef2ff 0%, #f0f9ff 100%)',
        padding: '24px 16px',
        position: 'relative'
      }}>
        {/* 背景光暈 */}
        <div style={{
          position: 'absolute', top: -100, right: -100, width: 300, height: 300,
          borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.1), transparent)'
        }} />
        <div style={{
          position: 'absolute', bottom: -100, left: -100, width: 300, height: 300,
          borderRadius: '50%', background: 'radial-gradient(circle, rgba(14,165,233,0.08), transparent)'
        }} />

        <div style={{ textAlign: 'center', marginBottom: 32, zIndex: 1 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16,
            background: 'linear-gradient(135deg, #4f46e5, #0ea5e9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 8px 24px rgba(79,70,229,0.3)',
          }}>
            <ThunderboltOutlined style={{ fontSize: 28, color: '#fff' }} />
          </div>
          <Title level={2} style={{ margin: 0 }}>NFC 集點闖關</Title>
          <Text type="secondary" style={{ fontSize: 14 }}>輸入暱稱，開始你的冒險旅程</Text>
        </div>

        <Card
          style={{
            width: '100%', maxWidth: 400, borderRadius: 16,
            boxShadow: '0 10px 30px rgba(15,23,42,0.08)',
            border: '1px solid rgba(99,102,241,0.1)',
            zIndex: 1
          }}
          styles={{ body: { padding: 32 } }}
        >
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <Text strong style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>你的暱稱</Text>
              <Input
                size="large"
                prefix={<UserOutlined style={{ color: '#bfbfbf' }} />}
                value={inputNick}
                onChange={e => setInputNick(e.target.value)}
                placeholder="例如：小明_12"
                maxLength={20}
                required
                style={{ borderRadius: 8 }}
              />
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
                建議加上後綴（如學號末兩碼）以避免暱稱重複
              </Text>
            </div>

            <Button
              type="primary"
              htmlType="submit"
              size="large"
              loading={registering}
              disabled={!inputNick.trim()}
              style={{
                borderRadius: 8, height: 44,
                background: 'linear-gradient(135deg, #4f46e5, #0ea5e9)',
                border: 'none',
                boxShadow: '0 4px 16px rgba(79,70,229,0.25)',
              }}
            >
              開始闖關
            </Button>
          </form>
        </Card>

        {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      </div>
    )
  }

  /* ── 已登錄主進度畫面 ── */
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f7fb' }}>
      
      {/* 頂部 Header */}
      <header style={{
        background: '#fff',
        borderBottom: '1px solid #eef2f6',
        position: 'sticky', top: 0, zIndex: 10,
        boxShadow: '0 1px 4px rgba(0,0,0,0.02)'
      }}>
        <div style={{
          maxWidth: 600, margin: '0 auto', padding: '16px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <Space>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: 'linear-gradient(135deg, #4f46e5, #0ea5e9)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <ThunderboltOutlined style={{ fontSize: 13, color: '#fff' }} />
            </div>
            <Text strong style={{ fontSize: 14 }}>集點闖關</Text>
          </Space>
          <Space size="middle">
            <Badge color="#4f46e5" count={nickname} style={{ backgroundColor: '#eef2ff', color: '#4f46e5', fontWeight: 600 }} />
            <Button
              type="text"
              icon={<LogoutOutlined />}
              onClick={handleLogout}
              style={{ color: '#ef4444' }}
              title="切換使用者"
            />
          </Space>
        </div>
      </header>

      <main style={{ maxWidth: 600, margin: '0 auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        
        {/* 進度總覽 Card */}
        <Card
          bordered={false}
          style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(15,23,42,0.04)' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <Text type="secondary" style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.05em' }}>闖關進度</Text>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
                <span style={{ fontSize: 32, fontWeight: 800, color: '#4f46e5', lineHeight: 1 }}>{completedCount}</span>
                <Text type="secondary" style={{ fontSize: 16 }}>/ {totalCount} 關</Text>
              </div>
            </div>

            {isComplete ? (
              <div style={{
                width: 56, height: 56, borderRadius: 14,
                background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(251,191,36,0.3)'
              }}>
                <TrophyOutlined style={{ fontSize: 26, color: '#fff' }} />
              </div>
            ) : (
              <Progress
                type="circle"
                percent={pct}
                size={60}
                strokeColor={{ '0%': '#4f46e5', '100%': '#0ea5e9' }}
                strokeWidth={10}
              />
            )}
          </div>

          <Progress
            percent={pct}
            strokeColor={{ '0%': '#4f46e5', '100%': '#0ea5e9' }}
            showInfo={false}
            strokeWidth={8}
            style={{ marginBottom: 8 }}
          />

          {isComplete && (
            <Alert
              message="恭喜！您已完成所有關卡，請出示本畫面與工作人員兌換獎項！"
              type="warning"
              showIcon
              style={{ marginTop: 16, borderRadius: 10, border: '1px solid #fde68a', background: '#fffbeb' }}
            />
          )}
        </Card>

        {/* 關卡清單 */}
        <div>
          <Text strong style={{ fontSize: 14, display: 'block', marginBottom: 12, paddingLeft: 4 }}>關卡列表</Text>
          
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Spin size="medium" />
            </div>
          ) : levels.length === 0 ? (
            <Card style={{ textAlign: 'center', padding: 24, borderRadius: 12 }}>
              <Text type="secondary">目前尚無啟用的關卡</Text>
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {levels.map((level) => {
                const done = progress.includes(level.id)
                const isUnlocked = unlocked.includes(level.id)
                const isAccessible = done || isUnlocked

                return (
                  <Card
                    key={level.id}
                    bordered={false}
                    styles={{ body: { padding: '16px 20px' } }}
                    style={{
                      borderRadius: 12,
                      boxShadow: '0 2px 8px rgba(15,23,42,0.02)',
                      border: done
                        ? '1.5px solid #a7f3d0'
                        : isUnlocked
                          ? '1.5px solid #bae6fd'
                          : '1px solid #f0f0f0',
                      background: done
                        ? '#f0fdf4'
                        : isUnlocked
                          ? '#f0f9ff'
                          : '#fff',
                      cursor: isAccessible ? 'pointer' : 'default',
                      transition: 'all 0.2s'
                    }}
                    onClick={() => {
                      if (isAccessible) navigate(`/task?level=${level.id}`)
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{
                        width: 38, height: 38, borderRadius: '50%',
                        background: done
                          ? '#dcfce7'
                          : isUnlocked
                            ? '#e0f2fe'
                            : '#f3f4f6',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        {done ? (
                          <CheckCircleOutlined style={{ color: '#10b981', fontSize: 18 }} />
                        ) : isUnlocked ? (
                          <ThunderboltOutlined style={{ color: '#0ea5e9', fontSize: 16 }} />
                        ) : (
                          <LockOutlined style={{ color: '#9ca3af', fontSize: 16 }} />
                        )}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Title
                          level={5}
                          style={{
                            margin: 0,
                            fontSize: 14,
                            color: done ? '#065f46' : isUnlocked ? '#0369a1' : '#1f2937'
                          }}
                        >
                          {level.name}
                        </Title>
                        <Paragraph ellipsis={{ rows: 1 }} style={{ margin: 0, fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                          {level.description}
                        </Paragraph>
                      </div>

                      {done ? (
                        <Tag color="success" style={{ margin: 0, borderRadius: 6, fontWeight: 600 }}>已完成</Tag>
                      ) : isUnlocked ? (
                        <Tag color="processing" style={{ margin: 0, borderRadius: 6, fontWeight: 600 }}>已解鎖</Tag>
                      ) : (
                        <RightOutlined style={{ color: '#bfbfbf', fontSize: 12 }} />
                      )}
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </main>

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  )
}
