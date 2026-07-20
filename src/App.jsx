// src/App.jsx
// 根路由設定：前台 (/) + 後台 (/admin/*)

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Home      from './pages/Home'
import Task      from './pages/Task'
import Complete  from './pages/Complete'
import Login     from './pages/admin/Login'
import Dashboard from './pages/admin/Dashboard'
import Levels    from './pages/admin/Levels'
import Flow      from './pages/admin/Flow'
import Players   from './pages/admin/Players'
import ProtectedRoute from './components/ProtectedRoute'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── 前台路由 ── */}
        <Route path="/"         element={<Home />} />
        <Route path="/task"     element={<Task />} />
        <Route path="/complete" element={<Complete />} />

        {/* ── 後台路由 ── */}
        <Route path="/admin/login" element={<Login />} />
        <Route path="/admin/dashboard" element={
          <ProtectedRoute><Dashboard /></ProtectedRoute>
        } />
        <Route path="/admin/levels" element={
          <ProtectedRoute><Levels /></ProtectedRoute>
        } />
        <Route path="/admin/flow" element={
          <ProtectedRoute><Flow /></ProtectedRoute>
        } />
        <Route path="/admin/players" element={
          <ProtectedRoute><Players /></ProtectedRoute>
        } />

        {/* ── /admin → 導向 dashboard ── */}
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

        {/* ── 404 → 回首頁 ── */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
