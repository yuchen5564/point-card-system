// src/pages/Task.jsx — Ant Design 版

import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useGameProgress } from '../hooks/useGameProgress'
import {
  Card, Button, Spin, Alert, Typography, Tag, Space, Result
} from 'antd'
import {
  ArrowLeftOutlined, ThunderboltOutlined, EnvironmentOutlined,
  CheckCircleOutlined, InfoCircleOutlined
} from '@ant-design/icons'

import NicknameModal from '../components/NicknameModal'

const { Title, Text, Paragraph } = Typography

export default function Task() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const levelId = params.get('level')
  const urlToken = params.get('token')

  const { nickname, progress, unlocked, unlockLevel, fetchPlayerProgress } = useGameProgress()
  const [level, setLevel] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const isDone = progress.includes(levelId)
  const isPreviouslyUnlocked = unlocked.includes(levelId)

  // 當使用者輸入暱稱並成功登入後，重新整頁加載，確保所有 Hook 從 localStorage 同步最新進度
  const handleRegistered = () => {
    window.location.reload()
  }

  useEffect(() => {
    if (!levelId) {
      setNotFound(true)
      setLoading(false)
      return
    }
    
    // 如果玩家還沒輸入暱稱，先不要執行關卡安全性驗證 (因為沒有 progress/unlocked 資料可用)
    if (!nickname) {
      setLoading(false)
      return
    }

    const fetch = async () => {
      setLoading(true)
      try {
        const ref = doc(db, 'levels', levelId)
        const snap = await getDoc(ref)
        if (!snap.exists() || snap.data().is_active === false) {
          setNotFound(true)
        } else {
          const data = { id: snap.id, ...snap.data() }

          // 安全檢查：如果玩家沒有解鎖過這關，且網址傳入的 token 錯誤，則判定為找不到關卡
          const verified = isDone || isPreviouslyUnlocked || (data.task_token === urlToken && urlToken)
          if (!verified) {
            setNotFound(true)
          } else {
            setLevel(data)
            // 自動加為已解鎖，供首頁點擊使用
            unlockLevel(data.id)
          }
        }
      } catch {
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [levelId, urlToken, nickname, isDone, isPreviouslyUnlocked, unlockLevel])

  /* ── 載入中 ── */
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f7fb' }}>
        <Spin size="large" tip="載入關卡中..." />
      </div>
    )
  }

  /* ── 404 關卡不存在 ── */
  if (notFound) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f7fb', padding: 16 }}>
        <Card style={{ width: '100%', maxWidth: 400, borderRadius: 16, boxShadow: '0 8px 30px rgba(0,0,0,0.05)', textAlign: 'center' }}>
          <Result
            status="warning"
            title="找不到此關卡"
            subTitle="關卡不存在或已下架，請確認 NFC 標籤是否正確。"
            extra={
              <Button
                type="primary"
                onClick={() => navigate('/')}
                style={{
                  borderRadius: 8,
                  background: 'linear-gradient(135deg, #4f46e5, #0ea5e9)',
                  border: 'none',
                  boxShadow: '0 4px 12px rgba(79,70,229,0.2)'
                }}
              >
                返回首頁
              </Button>
            }
          />
        </Card>
      </div>
    )
  }

  if (!nickname) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f5f7fb' }}>
        <NicknameModal open={true} onRegistered={handleRegistered} />
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f7fb' }}>
      {/* 頂部 Header */}
      <header style={{
        background: '#fff',
        borderBottom: '1px solid #eef2f6',
        position: 'sticky', top: 0, zIndex: 10,
        boxShadow: '0 1px 4px rgba(0,0,0,0.02)'
      }}>
        <div style={{ maxWidth: 600, margin: '0 auto', padding: '16px 20px' }}>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/')}
            style={{ color: '#4f46e5', fontWeight: 600 }}
          >
            返回首頁
          </Button>
        </div>
      </header>

      <main style={{ maxWidth: 600, margin: '0 auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        
        {/* 關卡主要卡片 */}
        <Card
          bordered={false}
          style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(15,23,42,0.04)' }}
        >
          {/* 關卡ID徽章 */}
          <div style={{ marginBottom: 12 }}>
            <Tag color="purple" icon={<EnvironmentOutlined />} style={{ borderRadius: 6, fontWeight: 600 }}>
              {level?.id}
            </Tag>
          </div>

          <Title level={3} style={{ margin: '0 0 16px 0', fontSize: 24 }}>{level?.name}</Title>

          {/* 狀態 Badge */}
          <div style={{ marginBottom: 24 }}>
            {isDone ? (
              <Tag color="success" icon={<CheckCircleOutlined />} style={{ borderRadius: 6, padding: '4px 10px', fontSize: 13, fontWeight: 600 }}>
                已完成此關卡
              </Tag>
            ) : (
              <Tag color="processing" icon={<ThunderboltOutlined />} style={{ borderRadius: 6, padding: '4px 10px', fontSize: 13, fontWeight: 600 }}>
                挑戰進行中
              </Tag>
            )}
          </div>

          {/* 任務說明 */}
          <div style={{ padding: '20px', backgroundColor: '#f8fafc', borderRadius: 12, border: '1px solid #edf2f7' }}>
            <Text type="secondary" strong style={{ display: 'block', fontSize: 11, letterSpacing: '0.05em', marginBottom: 8, textTransform: 'uppercase' }}>
              任務說明
            </Text>
            <Paragraph style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: '#334155' }}>
              {level?.description}
            </Paragraph>
          </div>

          {/* 提示訊息 */}
          {!isDone && (
            <Alert
              message={
                <Text style={{ fontSize: 13, color: '#92400e' }}>
                  完成任務後，請掃描旁邊的<strong>「過關貼紙」</strong>以記錄您的成果！
                </Text>
              }
              type="warning"
              showIcon
              icon={<InfoCircleOutlined style={{ color: '#d97706' }} />}
              style={{ marginTop: 20, borderRadius: 10, border: '1px solid #fde68a', background: '#fffbeb' }}
            />
          )}
        </Card>
      </main>
      <NicknameModal open={false} onRegistered={handleRegistered} />
    </div>
  )
}
