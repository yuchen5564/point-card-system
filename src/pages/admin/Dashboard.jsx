// src/pages/admin/Dashboard.jsx — Ant Design 版

import { useState, useEffect } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../../firebase'
import AdminLayout from '../../components/AdminLayout'
import { Card, Col, Row, Statistic, Progress, Spin, Alert, Typography } from 'antd'
import { UserOutlined, UnorderedListOutlined, CheckCircleOutlined, ArrowUpOutlined } from '@ant-design/icons'

const { Title, Text } = Typography

export default function Dashboard() {
  const [players, setPlayers] = useState([])
  const [levels, setLevels] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetch = async () => {
      try {
        const [pSnap, lSnap] = await Promise.all([
          getDocs(collection(db, 'players')),
          getDocs(query(collection(db, 'levels'), where('is_active', '==', true))),
        ])
        setPlayers(pSnap.docs.map(d => d.data()))
        setLevels(lSnap.docs.map(d => ({ id: d.id, ...d.data() })))
      } catch (err) {
        console.error(err)
        setError('載入數據時發生錯誤')
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [])

  const totalPlayers = players.length
  const totalLevels = levels.length
  const fullyClear = players.filter(p =>
    (p.completed_levels ?? []).length === totalLevels && totalLevels > 0
  ).length

  if (loading) {
    return (
      <AdminLayout>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
          <Spin size="large" tip="載入中..." />
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 20 }} />}
      
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>儀表板</Title>
        <Text type="secondary">即時活動統計資料</Text>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card bordered={false} hoverable style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <Statistic
              title="總玩家數"
              value={totalPlayers}
              prefix={<UserOutlined style={{ color: '#4f46e5', marginRight: 8 }} />}
              valueStyle={{ color: '#1f2937', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered={false} hoverable style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <Statistic
              title="啟用關卡數"
              value={totalLevels}
              prefix={<UnorderedListOutlined style={{ color: '#0ea5e9', marginRight: 8 }} />}
              valueStyle={{ color: '#1f2937', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered={false} hoverable style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <Statistic
              title="全部過關玩家"
              value={fullyClear}
              prefix={<CheckCircleOutlined style={{ color: '#10b981', marginRight: 8 }} />}
              suffix={<span style={{ fontSize: 14, color: '#9ca3af', fontWeight: 400 }}> / {totalPlayers}</span>}
              valueStyle={{ color: '#10b981', fontWeight: 700 }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="各關卡通過率"
        bordered={false}
        style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
      >
        {levels.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#9ca3af' }}>尚無啟用的關卡</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {levels.map(level => {
              const passed = players.filter(p => (p.completed_levels ?? []).includes(level.id)).length
              const pct = totalPlayers > 0 ? Math.round((passed / totalPlayers) * 100) : 0
              return (
                <div key={level.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, fontSize: 14, flexWrap: 'wrap', gap: 8 }}>
                    <Text strong>{level.name}</Text>
                    <Text type="secondary" style={{ flexShrink: 0 }}>{passed} / {totalPlayers} 玩家 ({pct}%)</Text>
                  </div>
                  <Progress
                    percent={pct}
                    strokeColor={{
                      '0%': '#4f46e5',
                      '100%': '#0ea5e9',
                    }}
                    status="active"
                    strokeWidth={10}
                    style={{ margin: 0 }}
                  />
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </AdminLayout>
  )
}
