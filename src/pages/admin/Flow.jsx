// src/pages/admin/Flow.jsx — Ant Design 版
import { useState, useEffect } from 'react'
import {
  collection, getDocs, doc, setDoc, updateDoc,
  serverTimestamp, query, where, getDoc
} from 'firebase/firestore'
import { db } from '../../firebase'
import AdminLayout from '../../components/AdminLayout'
import { generatePassToken, buildTaskUrl, buildCompleteUrl } from '../../utils/tokenHelper'
import { exportLevelsToPdf } from '../../utils/pdfHelper'
import {
  Table, Button, Card, Space, Typography, message, Row, Col, Alert, Steps, Tag, Empty, Badge, Radio
} from 'antd'
import {
  ArrowUpOutlined, ArrowDownOutlined, SaveOutlined, FilePdfOutlined,
  ThunderboltOutlined, LinkOutlined, StarOutlined, FlagOutlined, TrophyOutlined
} from '@ant-design/icons'

const { Title, Text, Paragraph } = Typography

const BASE_URL = window.location.origin

export default function Flow() {
  const [activeLevels, setActiveLevels] = useState([])
  const [sortedLevels, setSortedLevels] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [finalized, setFinalized] = useState(false)
  const [mode, setMode] = useState('linear') // linear | independent

  // 1. 取得所有啟用的關卡與目前的順序設定
  const fetchFlowLevels = async () => {
    setLoading(true)
    try {
      // 取得所有啟用的關卡
      const q = query(collection(db, 'levels'), where('is_active', '==', true))
      const snap = await getDocs(q)
      const levelsData = snap.docs.map(d => ({
        docId: d.id,
        key: d.id,
        id: d.id,
        ...d.data()
      }))

      setActiveLevels(levelsData)

      // 取得目前儲存的順序與模式
      const flowSnap = await getDoc(doc(db, 'settings', 'flow'))
      let sequence = []
      let loadedMode = 'linear'
      if (flowSnap.exists()) {
        const flowData = flowSnap.data()
        sequence = flowData.sequence || []
        loadedMode = flowData.mode || 'linear'
      }
      setMode(loadedMode)

      // 進行排序
      const sorted = [...levelsData].sort((a, b) => {
        const idxA = sequence.indexOf(a.id)
        const idxB = sequence.indexOf(b.id)

        if (idxA !== -1 && idxB !== -1) return idxA - idxB
        if (idxA !== -1) return -1
        if (idxB !== -1) return 1

        const tA = a.created_at?.seconds || 0
        const tB = b.created_at?.seconds || 0
        return tA - tB
      })

      setSortedLevels(sorted)
      // 如果已經有儲存順序，就視為已定案
      if (sequence.length > 0) {
        setFinalized(true)
      }
    } catch (err) {
      console.error(err)
      message.error('載入關卡流程失敗')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFlowLevels()
  }, [])

  // 2. 移動順序 (Up/Down)
  const moveItem = (index, direction) => {
    const nextIndex = index + direction
    if (nextIndex < 0 || nextIndex >= sortedLevels.length) return
    const nextList = [...sortedLevels]
    const temp = nextList[index]
    nextList[index] = nextList[nextIndex]
    nextList[nextIndex] = temp
    setSortedLevels(nextList)
    setFinalized(false) // 順序改變，需要重新儲存
  }

  // 3. 儲存排序並確保每個關卡都有 task_token
  const handleSaveFlow = async () => {
    setSaving(true)
    try {
      const sequence = sortedLevels.map(l => l.id)

      // 確保每個關卡都有 token，且最後一關有 pass_token
      const updatedLevels = await Promise.all(
        sortedLevels.map(async (level, idx) => {
          const isLast = idx === sortedLevels.length - 1
          const updates = {}
          let changed = false

          if (!level.task_token) {
            updates.task_token = generatePassToken()
            level.task_token = updates.task_token
            changed = true
          }
          if (isLast && !level.pass_token) {
            updates.pass_token = generatePassToken()
            level.pass_token = updates.pass_token
            changed = true
          }

          if (changed) {
            await updateDoc(doc(db, 'levels', level.docId), updates)
          }
          return level
        })
      )

      // 儲存順序與模式設定
      await setDoc(doc(db, 'settings', 'flow'), {
        sequence,
        mode,
        last_updated: serverTimestamp(),
      })

      setSortedLevels(updatedLevels)
      setFinalized(true)
      message.success('流程排序儲存成功，關卡連結與 QR Code 已統一產生！')
    } catch (err) {
      console.error(err)
      message.error('儲存失敗，請稍後再試。')
    } finally {
      setSaving(false)
    }
  }

  // 4. 匯出 PDF 所有 QR Codes
  const handleExportPdf = async () => {
    if (sortedLevels.length === 0) {
      message.warning('目前沒有已啟用的關卡可供下載')
      return
    }
    setExporting(true)
    message.loading({ content: '正在產生 QR Code PDF 文件...', key: 'pdf_export' })
    try {
      await exportLevelsToPdf(sortedLevels, BASE_URL, mode)
      message.success({ content: 'PDF 檔案下載成功！', key: 'pdf_export' })
    } catch (err) {
      console.error(err)
      message.error({ content: 'PDF 檔案產生失敗，請稍後再試。', key: 'pdf_export' })
    } finally {
      setExporting(false)
    }
  }

  const columns = [
    {
      title: '順序',
      key: 'index',
      width: 80,
      render: (_, __, index) => <Text strong style={{ fontSize: 16 }}>{index + 1}</Text>,
    },
    {
      title: '關卡資訊',
      key: 'info',
      render: (_, record, index) => {
        let tagColor = 'blue'
        let tagText = '後續關卡'
        let icon = <FlagOutlined />

        if (index === 0) {
          tagColor = 'purple'
          tagText = '起點關卡'
          icon = <StarOutlined />
        } else if (index === sortedLevels.length - 1) {
          tagColor = 'gold'
          tagText = '終點關卡'
          icon = <TrophyOutlined />
        }

        return (
          <Space direction="vertical" size={2}>
            <Space>
              <Text strong style={{ fontSize: 15 }}>{record.name}</Text>
              <Tag color={tagColor} icon={icon}>{tagText}</Tag>
            </Space>
            <Text type="secondary" style={{ fontSize: 12 }}>ID: <Text code>{record.id}</Text></Text>
          </Space>
        )
      }
    },
    {
      title: '流程動作說明',
      key: 'action_desc',
      render: (_, __, index) => {
        if (index === 0) {
          return <Text type="secondary" style={{ fontSize: 13 }}>掃描此關卡 Tag 代表：<strong>領取第一關任務</strong></Text>
        } else if (index === sortedLevels.length - 1) {
          return <Text type="secondary" style={{ fontSize: 13 }}>掃描此關卡 Tag 代表：<strong>完成前一關，同時通關並結束任務</strong></Text>
        } else {
          const prevName = sortedLevels[index - 1]?.name || '前一關'
          return <Text type="secondary" style={{ fontSize: 13 }}>掃描此關卡 Tag 代表：<strong>完成「{prevName}」，同時領取本關任務</strong></Text>
        }
      }
    },
    {
      title: '排序調整',
      key: 'sort_action',
      width: 120,
      render: (_, __, index) => (
        <Space>
          <Button
            size="small"
            icon={<ArrowUpOutlined />}
            disabled={index === 0}
            onClick={() => moveItem(index, -1)}
          />
          <Button
            size="small"
            icon={<ArrowDownOutlined />}
            disabled={index === sortedLevels.length - 1}
            onClick={() => moveItem(index, 1)}
          />
        </Space>
      )
    }
  ]

  const linkColumns = [
    {
      title: '順序',
      key: 'index',
      width: 60,
      render: (_, __, index) => <Badge count={index + 1} style={{ backgroundColor: index === 0 ? '#4f46e5' : index === sortedLevels.length - 1 ? '#ea580c' : '#0ea5e9' }} />
    },
    {
      title: '關卡名稱',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <Text strong>{text}</Text>
    },
    {
      title: '關卡 QR Code / NFC 連結 (Scan URL)',
      key: 'scan_url',
      render: (_, record, index) => {
        const taskUrl = buildTaskUrl(BASE_URL, record.id, record.task_token)
        const isLast = index === sortedLevels.length - 1
        const isInd = mode?.startsWith('independent')
        
        if (isInd || isLast) {
          const completeUrl = buildCompleteUrl(BASE_URL, record.id, record.pass_token)
          return (
            <Space direction="vertical" style={{ width: '100%' }} size={4}>
              <div>
                <Tag color={isLast && !isInd ? 'orange' : 'blue'}>
                  {isInd ? '任務領取貼紙 (Task URL)' : '任務領取說明 (Task URL)'}
                </Tag>
                <Text copyable={{ text: taskUrl }} style={{ fontSize: 12, wordBreak: 'break-all', fontFamily: 'monospace' }}>
                  {taskUrl}
                </Text>
              </div>
              <div style={{ marginTop: 4 }}>
                <Tag color="success">
                  {isInd ? '過關完成貼紙 (Complete URL)' : '終點完成過關 (Complete URL)'}
                </Tag>
                <Text copyable={{ text: completeUrl }} style={{ fontSize: 12, wordBreak: 'break-all', fontFamily: 'monospace' }}>
                  {completeUrl}
                </Text>
              </div>
            </Space>
          )
        }

        return (
          <Space style={{ width: '100%' }}>
            <Text copyable={{ text: taskUrl }} style={{ fontSize: 12, wordBreak: 'break-all', fontFamily: 'monospace' }}>
              {taskUrl}
            </Text>
          </Space>
        )
      }
    }
  ]

  return (
    <AdminLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>關卡流程排序設定</Title>
          <Text type="secondary">在此設定關卡的先後順序與模式，定案後系統將統一產生所有實體貼紙的連結</Text>
        </div>
      </div>

      {/* 闖關流程模式設定 */}
      <Card
        title="闖關流程模式設定"
        bordered={false}
        style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', marginBottom: 24 }}
      >
        <Radio.Group onChange={(e) => setMode(e.target.value)} value={mode}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Radio value="linear">
              <Text strong>線性闖關模式 (預設)</Text>
              <Paragraph type="secondary" style={{ margin: '4px 0 0 24px', fontSize: 13 }}>
                玩家掃描下一關的貼紙，即代表「完成前一關任務」並「領取新關卡任務」；僅有最後一關設有獨立的過關確認貼紙。（強制限性順序）
              </Paragraph>
            </Radio>
            <Radio value="independent_sequential" style={{ marginTop: 12 }}>
              <Text strong>獨立關卡模式 - 依序完成</Text>
              <Paragraph type="secondary" style={{ margin: '4px 0 0 24px', fontSize: 13 }}>
                每一關皆包含「領取任務貼紙」與「過關完成貼紙」，且**必須完成前一關**並掃描過關貼紙後，才能領取下一關的任務。
              </Paragraph>
            </Radio>
            <Radio value="independent_random" style={{ marginTop: 12 }}>
              <Text strong>獨立關卡模式 - 隨機完成</Text>
              <Paragraph type="secondary" style={{ margin: '4px 0 0 24px', fontSize: 13 }}>
                每一關皆包含「領取任務貼紙」與「過關完成貼紙」，玩家可以**任意順序**自由挑戰與過關，無任何先後關卡順序限制。
              </Paragraph>
            </Radio>
          </Space>
        </Radio.Group>
      </Card>

      <Row gutter={[24, 24]}>
        {/* 左側：排序與流程展示 */}
        <Col xs={24} lg={14}>
          <Card
            title="排定關卡順序"
            bordered={false}
            style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
            extra={
              <Button
                type="primary"
                icon={<SaveOutlined />}
                loading={saving}
                disabled={sortedLevels.length === 0}
                onClick={handleSaveFlow}
                style={{
                  borderRadius: 8,
                  background: 'linear-gradient(135deg, #4f46e5, #0ea5e9)',
                  border: 'none',
                  boxShadow: '0 4px 12px rgba(79,70,229,0.2)'
                }}
              >
                儲存流程並產生連結
              </Button>
            }
          >
            {sortedLevels.length === 0 ? (
              <Empty description="目前尚無啟用的關卡，請先至關卡管理頁面建立關卡並啟用。" />
            ) : (
              <Table
                rowKey="id"
                columns={columns}
                dataSource={sortedLevels}
                loading={loading}
                pagination={false}
                size="middle"
              />
            )}
          </Card>
        </Col>

        {/* 右側：流程可視化 */}
        <Col xs={24} lg={10}>
          <Card
            title="關卡流程示意圖"
            bordered={false}
            style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
          >
            {sortedLevels.length === 0 ? (
              <Empty description="無啟用關卡" />
            ) : (
              <div style={{ padding: '8px 16px' }}>
                <Steps
                  direction="vertical"
                  current={-1}
                  items={sortedLevels.map((level, idx) => {
                    let desc = ''
                    let icon = undefined
                    if (idx === 0) {
                      desc = '第一關：掃描此關 Tag 領取任務'
                      icon = <StarOutlined style={{ color: '#4f46e5' }} />
                    } else if (idx === sortedLevels.length - 1) {
                      desc = '最後一關：掃描此關 Tag 自動完成前一關與本關，通關任務'
                      icon = <TrophyOutlined style={{ color: '#ea580c' }} />
                    } else {
                      desc = `第 ${idx + 1} 關：掃描此關 Tag 自動完成「${sortedLevels[idx - 1]?.name || '前一關'}」並領取本關`
                    }
                    return {
                      title: (
                        <Space>
                          <span style={{ fontWeight: 600, fontSize: 14 }}>{level.name}</span>
                          <Tag style={{ fontSize: 10, margin: 0 }}>Step {idx + 1}</Tag>
                        </Space>
                      ),
                      description: (
                        <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>
                          {desc}
                        </div>
                      ),
                      icon: icon
                    }
                  })}
                />
              </div>
            )}
          </Card>
        </Col>

        {/* 下方：已產生的連結資訊 (已定案時顯示) */}
        <Col xs={24}>
          <Card
            title={
              <Space>
                <span>NFC / QR Code 實體連結資訊</span>
                {finalized ? (
                  <Tag color="success">已定案並產生連結</Tag>
                ) : (
                  <Tag color="warning">順序已變更，請點擊上方儲存以重新產生連結</Tag>
                )}
              </Space>
            }
            bordered={false}
            style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
            extra={
              <Button
                type="default"
                icon={<FilePdfOutlined />}
                disabled={!finalized || sortedLevels.length === 0}
                onClick={handleExportPdf}
                loading={exporting}
                style={{ borderRadius: 8, fontWeight: 500 }}
              >
                下載所有 QR Code (PDF)
              </Button>
            }
          >
            {!finalized ? (
              <Alert
                message="請先在上方調整好關卡順序並點擊「儲存流程並產生連結」後，此處才會統一顯示與提供下載 PDF 實體貼紙。"
                type="info"
                showIcon
              />
            ) : (
              <Table
                rowKey="id"
                columns={linkColumns}
                dataSource={sortedLevels}
                loading={loading}
                pagination={false}
                size="middle"
              />
            )}
          </Card>
        </Col>
      </Row>
    </AdminLayout>
  )
}
