// src/pages/Task.jsx — Ant Design 版
import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useGameProgress } from '../hooks/useGameProgress'
import {
  Card, Button, Spin, Alert, Typography, Tag, Result
} from 'antd'
import {
  ArrowLeftOutlined, ThunderboltOutlined, EnvironmentOutlined,
  CheckCircleOutlined, InfoCircleOutlined
} from '@ant-design/icons'

import NicknameModal from '../components/NicknameModal'
import MarkdownRenderer from '../components/MarkdownRenderer'

const { Title, Text, Paragraph } = Typography

export default function Task() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const levelId = params.get('level')
  const urlToken = params.get('token')

  const {
    nickname, progress, unlocked, levels, workflowMode,
    fetchLevels, fetchPlayerProgress, updateProgressBatch
  } = useGameProgress()

  const [level, setLevel] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [sequenceError, setSequenceError] = useState(null)
  const [scanStatus, setScanStatus] = useState(null)
  const [isLastLevel, setIsLastLevel] = useState(false)

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

    const fetchAndProcess = async () => {
      setLoading(true)
      try {
        // 1. 取得並排序所有啟用關卡
        let activeLevels = levels
        if (!activeLevels || activeLevels.length === 0) {
          activeLevels = await fetchLevels()
        }
        
        // 取得流程排序順序與模式
        const flowSnap = await getDoc(doc(db, 'settings', 'flow'))
        let sequence = []
        let currentMode = 'linear'
        if (flowSnap.exists()) {
          const flowData = flowSnap.data()
          sequence = flowData.sequence || []
          currentMode = flowData.mode || 'linear'
        }

        const sorted = [...activeLevels].sort((a, b) => {
          const idxA = sequence.indexOf(a.id)
          const idxB = sequence.indexOf(b.id)
          if (idxA !== -1 && idxB !== -1) return idxA - idxB
          if (idxA !== -1) return -1
          if (idxB !== -1) return 1
          const tA = a.created_at?.seconds || 0
          const tB = b.created_at?.seconds || 0
          return tA - tB
        })

        // 2. 找到當前關卡
        const data = sorted.find(l => l.id === levelId)
        if (!data || data.is_active === false) {
          setNotFound(true)
          return
        }

        setLevel(data)

        const currentIndex = sorted.findIndex(l => l.id === levelId)
        const isLast = currentIndex === sorted.length - 1
        setIsLastLevel(isLast)

        // 3. 取得玩家最新的進度（直讀 Firestore，避免使用 laggy/stale 的 React 狀態）
        const { completed, unlockedList } = await fetchPlayerProgress(nickname)

        const hasToken = urlToken && urlToken === data.task_token
        const hasUnlockedCurrent = unlockedList.includes(levelId)
        const hasCompletedCurrent = completed.includes(levelId)

        // 4. 安全與順序檢查
        if (hasToken) {
          // 透過掃描進入：
          if (currentMode === 'independent_random') {
            // 獨立關卡隨機挑戰：沒有任何前置條件限制
            if (!hasUnlockedCurrent && !hasCompletedCurrent) {
              const res = await updateProgressBatch([], [data.id])
              if (res.success) {
                setScanStatus({
                  type: 'success',
                  message: `🎉 成功掃描！已為您領取任務「${data.name}」！`
                })
              } else {
                setScanStatus({
                  type: 'error',
                  message: '❌ 領取任務失敗，請重新整理頁面再試。'
                })
              }
            }
          } else if (currentMode === 'independent_sequential') {
            // 獨立關卡依序完成：必須先「完成」前一關才能領取這一關
            if (currentIndex > 0) {
              const prevLevel = sorted[currentIndex - 1]
              const prevCompleted = completed.includes(prevLevel.id)
              if (!prevCompleted) {
                setSequenceError(`❌ 您尚未完成前一關「${prevLevel.name}」，請先完成前一關並掃描該關卡過關貼紙！`)
                return
              }
            }
            // 檢查通過，解鎖本關
            if (!hasUnlockedCurrent && !hasCompletedCurrent) {
              const res = await updateProgressBatch([], [data.id])
              if (res.success) {
                setScanStatus({
                  type: 'success',
                  message: `🎉 成功掃描！已為您領取任務「${data.name}」！`
                })
              } else {
                setScanStatus({
                  type: 'error',
                  message: '❌ 領取任務失敗，請重新整理頁面再試。'
                })
              }
            }
          } else {
            // 線性模式 (預設，且強制限性順序)
            if (currentIndex === 0) {
              // 第一關：隨時可以掃描領取
              if (!hasUnlockedCurrent && !hasCompletedCurrent) {
                const res = await updateProgressBatch([], [data.id])
                if (res.success) {
                  setScanStatus({
                    type: 'success',
                    message: '🎉 成功掃描第一關！已為您領取任務，開始挑戰吧！'
                  })
                } else {
                  setScanStatus({
                    type: 'error',
                    message: '❌ 領取任務失敗，請重新整理頁面再試。'
                  })
                }
              }
            } else {
              // 後續關卡：檢查前一關是否已解鎖或已完成
              const prevLevel = sorted[currentIndex - 1]
              const prevUnlocked = unlockedList.includes(prevLevel.id)
              const prevCompleted = completed.includes(prevLevel.id)

              if (!prevUnlocked && !prevCompleted) {
                setSequenceError(`❌ 您尚未解鎖或完成前一關「${prevLevel.name}」，請依序進行闖關！`)
                return
              }

              // 第一次掃描該關卡 (完成前一關 + 領取下一關任務)
              if (!hasUnlockedCurrent && !hasCompletedCurrent) {
                const res = await updateProgressBatch([prevLevel.id], [data.id])
                if (res.success) {
                  setScanStatus({
                    type: 'success',
                    message: `🎉 成功掃描！已為您完成前一關「${prevLevel.name}」，並領取新任務「${data.name}」！`
                  })
                } else {
                  setScanStatus({
                    type: 'error',
                    message: '❌ 進度更新失敗，請稍後再試。'
                  })
                }
              }
            }
          }
        } else {
          // 從首頁查看或手動輸入網址，必須是已經解鎖或已完成的關卡才能查看
          if (!hasUnlockedCurrent && !hasCompletedCurrent) {
            setNotFound(true)
            return
          }
        }
      } catch (err) {
        console.error(err)
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }

    fetchAndProcess()
  }, [levelId, urlToken, nickname]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── 載入中 ── */
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f7fb' }}>
        <Spin size="large" tip="載入關卡中..." />
      </div>
    )
  }

  /* ── 順序錯誤 ── */
  if (sequenceError) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f7fb', padding: 16 }}>
        <Card style={{ width: '100%', maxWidth: 400, borderRadius: 16, boxShadow: '0 8px 30px rgba(0,0,0,0.05)', textAlign: 'center' }}>
          <Result
            status="warning"
            title="無法挑戰此關卡"
            subTitle={sequenceError}
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
                返回首頁查看進度
              </Button>
            }
          />
        </Card>
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
        
        {/* 掃描狀態回饋 */}
        {scanStatus && (
          <Alert
            message={scanStatus.message}
            type={scanStatus.type}
            showIcon
            closable
            onClose={() => setScanStatus(null)}
            style={{ borderRadius: 12 }}
          />
        )}

        {/* 關卡主要卡片 */}
        <Card
          bordered={false}
          style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(15,23,42,0.04)' }}
        >

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
            <MarkdownRenderer content={level?.description} />
          </div>

          {/* 提示訊息 */}
          {!isDone && (
            <Alert
              message={
                <Text style={{ fontSize: 13, color: '#0f766e' }}>
                  {workflowMode?.startsWith('independent') ? (
                    <span>完成任務後，請掃描旁邊的<strong>「過關貼紙」</strong>以記錄您的成果！</span>
                  ) : isLastLevel ? (
                    <span>這是最後一關！完成任務後，請掃描<strong>「過關確認貼紙 / Tag」</strong>以累計點數並成功通關！</span>
                  ) : (
                    <span>完成任務後，請前往下一關並<strong>「掃描下一關的 QR Code / Tag」</strong>以領取新任務同時過關！</span>
                  )}
                </Text>
              }
              type="info"
              showIcon
              icon={<InfoCircleOutlined style={{ color: '#0d9488' }} />}
              style={{ marginTop: 20, borderRadius: 10, border: '1px solid #99f6e4', background: '#f0fdfa' }}
            />
          )}
        </Card>
      </main>
      <NicknameModal open={false} onRegistered={handleRegistered} />
    </div>
  )
}
