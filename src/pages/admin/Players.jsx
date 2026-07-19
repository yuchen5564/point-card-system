// src/pages/admin/Players.jsx — Ant Design 版

import { useState, useEffect } from 'react'
import { collection, getDocs, deleteDoc, doc, query, where } from 'firebase/firestore'
import { db } from '../../firebase'
import AdminLayout from '../../components/AdminLayout'
import {
  Table, Button, Card, Input, Space, Modal, Typography,
  message, Progress, Tag, Alert
} from 'antd'
import {
  SearchOutlined, DeleteOutlined, ExclamationCircleOutlined,
  CheckCircleOutlined
} from '@ant-design/icons'

const { Title, Text } = Typography
const { confirm } = Modal

export default function Players() {
  const [players, setPlayers] = useState([])
  const [levels, setLevels] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetch = async () => {
      try {
        const [pSnap, lSnap] = await Promise.all([
          getDocs(collection(db, 'players')),
          getDocs(query(collection(db, 'levels'), where('is_active', '==', true))),
        ])
        setPlayers(pSnap.docs.map(d => ({ docId: d.id, key: d.id, ...d.data() })))
        setLevels(lSnap.docs.map(d => d.id))
      } catch (err) {
        console.error(err)
        setError('載入數據時發生錯誤')
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [])

  const handleDelete = (record) => {
    confirm({
      title: '確定要刪除此玩家嗎？',
      icon: <ExclamationCircleOutlined />,
      content: `玩家暱稱: ${record.nickname}。這將永久刪除該玩家的所有集點進度！`,
      okText: '確認刪除',
      okType: 'danger',
      cancelText: '取消',
      async onOk() {
        try {
          await deleteDoc(doc(db, 'players', record.docId))
          setPlayers(prev => prev.filter(p => p.docId !== record.docId))
          message.success(`玩家「${record.nickname}」已刪除`)
        } catch (err) {
          console.error(err)
          message.error('刪除失敗')
        }
      },
    })
  }

  const filtered = players.filter(p =>
    p.nickname?.toLowerCase().includes(search.toLowerCase())
  )
  const totalLevels = levels.length

  const columns = [
    {
      title: '暱稱',
      dataIndex: 'nickname',
      key: 'nickname',
      render: (text, record) => {
        // 過濾已刪除關卡
        const completed = (record.completed_levels ?? []).filter(id => levels.includes(id))
        const isFull = completed.length === totalLevels && totalLevels > 0
        return (
          <Space>
            {isFull && <CheckCircleOutlined style={{ color: '#10b981' }} />}
            <Text strong={isFull}>{text}</Text>
          </Space>
        )
      },
    },
    {
      title: '已完成關卡',
      dataIndex: 'completed_levels',
      key: 'completed_levels',
      render: (_, record) => {
        // 只渲染在啟用關卡清單中的關卡 ID
        const completed = (record.completed_levels ?? []).filter(id => levels.includes(id))
        if (completed.length === 0) {
          return <Text type="secondary" style={{ fontSize: 13 }}>尚未過關</Text>
        }
        return (
          <Space size={[0, 4]} wrap>
            {completed.map(id => (
              <Tag key={id} color="blue" style={{ fontFamily: 'monospace' }}>
                {id}
              </Tag>
            ))}
          </Space>
        )
      },
    },
    {
      title: '完成率',
      key: 'progress',
      render: (_, record) => {
        // 過濾已刪除關卡
        const completed = (record.completed_levels ?? []).filter(id => levels.includes(id))
        const pct = totalLevels > 0 ? Math.round((completed.length / totalLevels) * 100) : 0
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 120 }}>
            <Progress
              percent={pct}
              size="small"
              strokeColor={pct === 100 ? '#10b981' : '#4f46e5'}
              showInfo={false}
              style={{ flex: 1, margin: 0 }}
            />
            <Text style={{ width: 36, textAlign: 'right', fontSize: 13 }}>{pct}%</Text>
          </div>
        )
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_, record) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleDelete(record)}
        />
      ),
    },
  ]

  return (
    <AdminLayout>
      {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 20 }} />}
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>玩家管理</Title>
          <Text type="secondary">共 {players.length} 位玩家</Text>
        </div>
        <Input
          placeholder="搜尋暱稱..."
          prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: 240, borderRadius: 8 }}
          allowClear
        />
      </div>

      <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <Table
          rowKey="nickname"
          columns={columns}
          dataSource={filtered}
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total, range) => `顯示第 ${range[0]} 至 ${range[1]} 項，共 ${total} 項`
          }}
        />
      </Card>
    </AdminLayout>
  )
}
