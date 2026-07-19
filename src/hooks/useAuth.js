// src/hooks/useAuth.js
// 封裝 Firebase Auth 管理員登入/登出邏輯，供後台路由使用

import { useState, useEffect } from 'react'
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth'
import { auth } from '../firebase'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true) // 初始化時需等待 Firebase 回應
  const [authError, setAuthError] = useState(null)

  // ── 監聽 Firebase Auth 狀態變化 ──────────────────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setAuthLoading(false)
    })
    return () => unsubscribe()
  }, [])

  // ── 管理員登入 ────────────────────────────────────────────────────────
  const signIn = async (email, password) => {
    try {
      setAuthError(null)
      setAuthLoading(true)
      const credential = await signInWithEmailAndPassword(auth, email, password)
      return { success: true, user: credential.user }
    } catch (err) {
      console.error('signIn error:', err)
      const msg = getAuthErrorMessage(err.code)
      setAuthError(msg)
      return { success: false, error: msg }
    } finally {
      setAuthLoading(false)
    }
  }

  // ── 管理員登出 ────────────────────────────────────────────────────────
  const signOut = async () => {
    try {
      await firebaseSignOut(auth)
      return { success: true }
    } catch (err) {
      console.error('signOut error:', err)
      return { success: false, error: err.message }
    }
  }

  return {
    user,
    isAuthenticated: !!user,
    authLoading,
    authError,
    setAuthError,
    signIn,
    signOut,
  }
}

// ── Firebase Auth 錯誤代碼本地化 ─────────────────────────────────────────
function getAuthErrorMessage(code) {
  const messages = {
    'auth/invalid-email':         '電子郵件格式不正確。',
    'auth/user-not-found':        '找不到此管理員帳號。',
    'auth/wrong-password':        '密碼不正確，請重試。',
    'auth/invalid-credential':    '帳號或密碼錯誤，請重試。',
    'auth/too-many-requests':     '登入嘗試次數過多，請稍後再試。',
    'auth/user-disabled':         '此帳號已被停用。',
    'auth/network-request-failed':'網路連線失敗，請確認網路狀態。',
  }
  return messages[code] ?? `登入失敗（${code}）`
}
