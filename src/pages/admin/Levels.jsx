// src/pages/admin/Levels.jsx — Ant Design 版

import { useState, useEffect } from 'react'
import {
  collection, getDocs, doc, setDoc, updateDoc, deleteDoc,
  serverTimestamp, query, orderBy, getDoc
} from 'firebase/firestore'
import { db } from '../../firebase'
import AdminLayout from '../../components/AdminLayout'
import { generatePassToken } from '../../utils/tokenHelper'
import {
  Table, Button, Card, Form, Input, Switch, Space, Modal,
  Typography, message, Badge
} from 'antd'
import {
  PlusOutlined, DeleteOutlined, ExclamationCircleOutlined, EditOutlined
} from '@ant-design/icons'

const { Title, Text, Paragraph } = Typography
const { confirm } = Modal

const BASE_URL = window.location.origin

export default function Levels() {
  const [levels, setLevels] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingRecord, setEditingRecord] = useState(null) // null = 新增, 否則為正編輯 of 關卡
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)

  const fetchLevels = async () => {
    setLoading(true)
    try {
      const q = query(collection(db, 'levels'), orderBy('created_at', 'asc'))
      const snap = await getDocs(q)
      setLevels(snap.docs.map(d => ({ docId: d.id, key: d.id, id: d.id, ...d.data() })))
    } catch (err) {
      console.error(err)
      message.error('載入關卡失敗')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLevels()
  }, [])

  const handleEditClick = (record) => {
    setEditingRecord(record)
    form.setFieldsValue({
      id: record.id,
      name: record.name,
      description: record.description,
    })
    setModalVisible(true)
  }

  const handleCreateClick = () => {
    setEditingRecord(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleSubmit = (values) => {
    if (editingRecord) {
      handleUpdate(values)
    } else {
      handleAdd(values)
    }
  }

  const handleAdd = async (values) => {
    setSaving(true)
    const customId = values.id.trim()
    try {
      // 檢查是否已存在同名 ID
      const docRef = doc(db, 'levels', customId)
      const docSnap = await getDoc(docRef)
      if (docSnap.exists()) {
        message.error('此關卡 ID 已存在，請使用其他 ID。')
        return
      }

      await setDoc(docRef, {
        id: customId,
        name: values.name.trim(),
        description: (values.description || '').trim(),
        task_token: generatePassToken(),
        pass_token: generatePassToken(),
        is_active: true,
        created_at: serverTimestamp(),
      })
      message.success('關卡新增成功！')
      form.resetFields()
      setModalVisible(false)
      fetchLevels()
    } catch (err) {
      console.error(err)
      message.error('新增失敗，請稍後再試。')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async (values) => {
    setSaving(true)
    try {
      const ref = doc(db, 'levels', editingRecord.docId)
      await updateDoc(ref, {
        name: values.name.trim(),
        description: (values.description || '').trim(),
      })
      message.success('關卡更新成功！')
      form.resetFields()
      setModalVisible(false)
      setEditingRecord(null)
      fetchLevels()
    } catch (err) {
      console.error(err)
      message.error('更新失敗，請稍後再試。')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (record) => {
    const nextStatus = !record.is_active
    try {
      await updateDoc(doc(db, 'levels', record.docId), { is_active: nextStatus })
      setLevels(prev => prev.map(l => l.docId === record.docId ? { ...l, is_active: nextStatus } : l))
      message.success(`關卡已${nextStatus ? '啟用' : '停用'}`)
    } catch (err) {
      console.error(err)
      message.error('更新狀態失敗')
    }
  }

  const handleDelete = (record) => {
    confirm({
      title: '確定要刪除此關卡嗎？',
      icon: <ExclamationCircleOutlined />,
      content: `關卡名稱: ${record.name}。此操作無法復原，且會影響已過關玩家。`,
      okText: '確認刪除',
      okType: 'danger',
      cancelText: '取消',
      async onOk() {
        try {
          await deleteDoc(doc(db, 'levels', record.docId))
          setLevels(prev => prev.filter(l => l.docId !== record.docId))
          message.success(`關卡「${record.name}」已刪除`)
        } catch (err) {
          console.error(err)
          message.error('刪除失敗')
        }
      },
    })
  }

  const copyToClipboard = (url, type) => {
    navigator.clipboard.writeText(url)
    message.success(`已複製 ${type} 連結`)
  }

  const columns = [
    {
      title: '關卡 ID',
      dataIndex: 'id',
      key: 'id',
      render: (text) => <Text code>{text}</Text>,
    },
    {
      title: '關卡名稱',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: '任務描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '狀態',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (isActive, record) => (
        <Space>
          <Switch
            checked={isActive}
            onChange={() => handleToggle(record)}
            size="small"
          />
          <Badge status={isActive ? 'success' : 'default'} text={isActive ? '已啟用' : '已停用'} />
        </Space>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button
            type="text"
            icon={<EditOutlined style={{ color: '#4f46e5' }} />}
            onClick={() => handleEditClick(record)}
          />
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
          />
        </Space>
      ),
    },
  ]

  return (
    <AdminLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>關卡管理</Title>
          <Text type="secondary">共 {levels.length} 個關卡</Text>
        </div>
        <Space wrap>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreateClick}
            style={{
              borderRadius: 8,
              background: 'linear-gradient(135deg, #4f46e5, #0ea5e9)',
              border: 'none',
              height: 40,
              boxShadow: '0 4px 12px rgba(79,70,229,0.25)',
            }}
          >
            新增關卡
          </Button>
        </Space>
      </div>

      <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={levels}
          loading={loading}
          scroll={{ x: 800 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total, range) => `顯示第 ${range[0]} 至 ${range[1]} 項，共 ${total} 項`
          }}
        />
      </Card>

      <Modal
        title={editingRecord ? '編輯關卡' : '新增關卡'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="id"
            label="關卡 ID (不可重複，限英文與底線)"
            rules={[
              { required: true, message: '請輸入關卡 ID' },
              { pattern: /^[A-Za-z0-9_-]+$/, message: '限英數字、底線或破折號' }
            ]}
          >
            <Input placeholder="例如: level_math_1" style={{ borderRadius: 6 }} disabled={!!editingRecord} />
          </Form.Item>

          <Form.Item
            name="name"
            label="關卡名稱"
            rules={[{ required: true, message: '請輸入關卡名稱' }]}
          >
            <Input placeholder="例如: 趣味數學解謎" style={{ borderRadius: 6 }} />
          </Form.Item>

          <Form.Item
            name="description"
            label="關卡描述與任務說明"
          >
            <Input.TextArea placeholder="請輸入任務挑戰詳細步驟說明..." rows={4} style={{ borderRadius: 6 }} />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setModalVisible(false)} style={{ borderRadius: 6 }}>
                取消
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={saving}
                style={{
                  borderRadius: 6,
                  background: 'linear-gradient(135deg, #4f46e5, #0ea5e9)',
                  border: 'none',
                }}
              >
                {editingRecord ? '確認儲存' : '確認新增'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </AdminLayout>
  )
}
