// src/pages/Complete.jsx — Ant Design 版

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useGameProgress } from '../hooks/useGameProgress'
import { Card, Button, Spin, Result, Typography, Space } from 'antd'
import { ArrowRightOutlined, ThunderboltOutlined } from '@ant-design/icons'
import NicknameModal from '../components/NicknameModal'

const { Text } = Typography

const STATUS = {
  LOADING:   'loading',
  SUCCESS:   'success',
  ERROR:     'error',
  DUPLICATE: 'duplicate',
}

export default function Complete() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const levelId = params.get('level')
  const token   = params.get('token')

  const { nickname, progress, addCompletedLevel, unlockLevel, fetchPlayerProgress } = useGameProgress()
  const [status, setStatus]     = useState(STATUS.LOADING)
  const [levelName, setLevelName] = useState('')
  const [errorMsg, setErrorMsg]  = useState('')
  const [countdown, setCountdown] = useState(3)

  const verify = useCallback(async (currentNick) => {
    const activeNick = currentNick || nickname || localStorage.getItem('nfc_game_nickname')
    if (!activeNick) {
      setStatus(STATUS.LOADING)
      return
    }

    if (!levelId || !token) {
      setErrorMsg('無效的過關連結，請確認 NFC 標籤是否損壞。')
      setStatus(STATUS.ERROR); return
    }

    try {
      // 確保獲取該暱稱在 Firestore 中最即時的過關與解鎖資料
      const { completed, unlockedList } = await fetchPlayerProgress(activeNick)

      // 保護機制：檢查玩家是否已經領取/解鎖此關卡
      if (!unlockedList.includes(levelId)) {
        setErrorMsg('您尚未領取或解鎖此關卡！請先前往掃描起點的「任務 QR Code / NFC 貼紙」領取任務，再掃描過關貼紙。')
        setStatus(STATUS.ERROR)
        return
      }

      if (completed.includes(levelId)) {
        setStatus(STATUS.DUPLICATE)
        return
      }

      const ref  = doc(db, 'levels', levelId)
      const snap = await getDoc(ref)
      if (!snap.exists() || snap.data().is_active === false) {
        setErrorMsg('此關卡不存在或已下架。')
        setStatus(STATUS.ERROR); return
      }
      const data = snap.data()
      setLevelName(data.name)

      if (data.pass_token !== token) {
        setErrorMsg('過關金鑰無效，請確認你掃描的是正確的 NFC 貼紙。')
        setStatus(STATUS.ERROR); return
      }

      const result = await addCompletedLevel(levelId)
      if (result.success) {
        unlockLevel(levelId)
        setStatus(STATUS.SUCCESS)
      }
      else { setErrorMsg('進度更新失敗，請稍後再試。'); setStatus(STATUS.ERROR) }
    } catch (err) {
      console.error(err)
      setErrorMsg('伺服器發生錯誤，請稍後再試。')
      setStatus(STATUS.ERROR)
    }
  }, [nickname, levelId, token, addCompletedLevel, unlockLevel, fetchPlayerProgress])

  // 當使用者輸入暱稱並成功登入後，重新整頁加載，確保所有 Hook 同步最新進度
  const handleRegistered = () => {
    window.location.reload()
  }

  useEffect(() => {
    const activeNick = nickname || localStorage.getItem('nfc_game_nickname')
    if (activeNick) {
      verify(activeNick)
    }
  }, [nickname, verify]) // eslint-disable-line

  useEffect(() => {
    if (status !== STATUS.SUCCESS) return
    const interval = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(interval); navigate('/') }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [status, navigate])

  if (!nickname) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f5f7fb' }}>
        <NicknameModal open={true} onRegistered={handleRegistered} />
      </div>
    )
  }

  /* ── 載入中 ── */
  if (status === STATUS.LOADING) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f7fb' }}>
        <Spin size="large" tip="驗證過關資格中..." />
      </div>
    )
  }

  /* ── 頁面渲染包裝 ── */
  const renderCard = (content) => (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f5f7fb',
      padding: 16
    }}>
      <Card style={{
        width: '100%',
        maxWidth: 420,
        borderRadius: 16,
        boxShadow: '0 10px 30px rgba(15,23,42,0.06)',
        border: '1px solid rgba(0,0,0,0.02)'
      }}>
        {content}
      </Card>
    </div>
  )

  /* ── 成功 ── */
  if (status === STATUS.SUCCESS) {
    return renderCard(
      <Result
        status="success"
        title="過關成功！"
        subTitle={
          <div style={{ marginTop: 8 }}>
            <Text strong style={{ fontSize: 18, color: '#059669', display: 'block', marginBottom: 4 }}>{levelName}</Text>
            <Text type="secondary">您已成功完成此關卡，點數已累計！</Text>
          </div>
        }
        extra={[
          <div key="countdown" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '8px 16px', borderRadius: 8, background: '#f8fafc',
            border: '1px solid #edf2f7', fontSize: 13, color: '#4b5563',
            marginBottom: 16
          }}>
            <ThunderboltOutlined style={{ color: '#4f46e5' }} />
            <span>{countdown} 秒後自動返回首頁…</span>
          </div>,
          <Button
            key="back"
            type="link"
            icon={<ArrowRightOutlined />}
            onClick={() => navigate('/')}
            style={{ color: '#4f46e5', fontWeight: 600, display: 'block', margin: '0 auto' }}
          >
            立即返回
          </Button>
        ]}
      />
    )
  }

  /* ── 重複過關 ── */
  if (status === STATUS.DUPLICATE) {
    return renderCard(
      <Result
        status="info"
        title="已完成此關卡"
        subTitle="您之前已經通過了這個關卡！不需要重複登錄。"
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
            查看進度
          </Button>
        }
      />
    )
  }

  /* ── 錯誤 ── */
  return renderCard(
    <Result
      status="error"
      title="驗證失敗"
      subTitle={errorMsg}
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
  )
}
