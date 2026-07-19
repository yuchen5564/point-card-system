// src/components/AdminLayout.jsx — Ant Design 版
import { useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Avatar, Dropdown, Typography, Breadcrumb, theme } from 'antd'
import {
  DashboardOutlined,
  OrderedListOutlined,
  TeamOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ThunderboltOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { useAuth } from '../hooks/useAuth'

const { Sider, Header, Content } = Layout
const { Text } = Typography

const NAV_ITEMS = [
  { key: '/admin/dashboard', icon: <DashboardOutlined />, label: '儀表板' },
  { key: '/admin/levels',    icon: <OrderedListOutlined />, label: '關卡管理' },
  { key: '/admin/players',   icon: <TeamOutlined />,       label: '玩家管理' },
]

const BREADCRUMB_MAP = {
  '/admin/dashboard': '儀表板',
  '/admin/levels':    '關卡管理',
  '/admin/players':   '玩家管理',
}

export default function AdminLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false)
  const { signOut, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleSignOut = async () => {
    await signOut()
    navigate('/admin/login')
  }

  const userMenuItems = [
    {
      key: 'email',
      label: <Text type="secondary" style={{ fontSize: 12 }}>{user?.email}</Text>,
      disabled: true,
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '登出',
      danger: true,
      onClick: handleSignOut,
    },
  ]

  const breadcrumbLabel = BREADCRUMB_MAP[location.pathname]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* ── 側邊欄 ── */}
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        trigger={null}
        width={220}
        style={{
          background: '#001529',
          boxShadow: '2px 0 8px rgba(0,0,0,0.15)',
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflow: 'hidden',
        }}
      >
        {/* Logo */}
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          gap: 10,
          padding: collapsed ? 0 : '0 20px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          transition: 'all 0.2s',
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: 'linear-gradient(135deg,#4f46e5,#0ea5e9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <ThunderboltOutlined style={{ color: '#fff', fontSize: 16 }} />
          </div>
          {!collapsed && (
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 14, lineHeight: 1.3 }}>
                集點闖關
              </div>
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11 }}>管理後台</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={NAV_ITEMS.map(item => ({
            ...item,
            label: <NavLink to={item.key} style={{ textDecoration: 'none' }}>{item.label}</NavLink>,
          }))}
          style={{ border: 'none', marginTop: 8 }}
        />
      </Sider>

      {/* ── 右側主體 ── */}
      <Layout>
        {/* Header */}
        <Header style={{
          background: '#fff',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 1px 4px rgba(0,21,41,0.08)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
          height: 64,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* 收合按鈕 */}
            <span
              onClick={() => setCollapsed(v => !v)}
              style={{
                fontSize: 18, cursor: 'pointer',
                color: '#00000073',
                transition: 'color 0.2s',
                display: 'flex', alignItems: 'center',
              }}
              onMouseEnter={e => e.currentTarget.style.color = '#1677ff'}
              onMouseLeave={e => e.currentTarget.style.color = '#00000073'}
            >
              {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </span>

            {/* 麵包屑 */}
            <Breadcrumb
              items={[
                { title: '管理後台' },
                ...(breadcrumbLabel ? [{ title: breadcrumbLabel }] : []),
              ]}
            />
          </div>

          {/* 使用者頭像 + 下拉 */}
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" arrow>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              cursor: 'pointer', padding: '4px 8px', borderRadius: 8,
              transition: 'background 0.15s',
            }}
              onMouseEnter={e => e.currentTarget.style.background = '#f5f5f5'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <Avatar
                size={32}
                style={{ background: 'linear-gradient(135deg,#4f46e5,#0ea5e9)', fontSize: 14, fontWeight: 700 }}
              >
                {user?.email?.[0]?.toUpperCase() ?? 'A'}
              </Avatar>
              <Text style={{ fontSize: 13, fontWeight: 500 }}>管理員</Text>
            </div>
          </Dropdown>
        </Header>

        {/* 內容 */}
        <Content style={{ padding: 24, background: '#f5f7fb', minHeight: 'calc(100vh - 64px)' }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  )
}
