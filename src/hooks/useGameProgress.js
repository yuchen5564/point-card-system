// src/hooks/useGameProgress.js
// 管理玩家暱稱 (localStorage) 與 Firestore 進度/解鎖同步

import { useState, useEffect, useCallback } from 'react'
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore'
import { db } from '../firebase'

const LS_KEY = 'nfc_game_nickname'
const LS_UNLOCKED_KEY = 'nfc_game_unlocked'

export function useGameProgress() {
  const [nickname, setNickname] = useState(() => localStorage.getItem(LS_KEY) || '')
  const [progress, setProgress] = useState([])      // completed_levels 陣列
  const [unlocked, setUnlocked] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(LS_UNLOCKED_KEY)) || []
    } catch {
      return []
    }
  })
  const [levels, setLevels] = useState([])          // 全部啟用的關卡
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // ── 解鎖關卡 (寫入本地，也寫入 Firestore) ─────────────────────────────
  const unlockLevel = useCallback(async (levelId) => {
    // 1. 先更新本地 state 與 localStorage
    setUnlocked(prev => {
      if (prev.includes(levelId)) return prev
      const next = [...prev, levelId]
      localStorage.setItem(LS_UNLOCKED_KEY, JSON.stringify(next))
      return next
    })

    // 2. 如果已登入暱稱，同步更新 Firestore
    const activeNick = nickname || localStorage.getItem(LS_KEY)
    if (activeNick) {
      try {
        const ref = doc(db, 'players', activeNick)
        await updateDoc(ref, {
          unlocked_levels: arrayUnion(levelId),
          last_updated: serverTimestamp(),
        })
      } catch (err) {
        console.error('Failed to sync unlocked levels to Firestore:', err)
      }
    }
  }, [nickname])

  // ── 讀取所有啟用關卡 ──────────────────────────────────────────────────
  const fetchLevels = useCallback(async () => {
    try {
      const q = query(collection(db, 'levels'), where('is_active', '==', true))
      const snap = await getDocs(q)
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setLevels(data)
      return data
    } catch (err) {
      console.error('fetchLevels error:', err)
      setError('無法取得關卡資料，請稍後再試。')
      return []
    }
  }, [])

  // ── 讀取玩家進度與解鎖清單 (從 Firestore 載入並覆蓋本地) ─────────────
  const fetchPlayerProgress = useCallback(async (nick) => {
    const target = nick ?? nickname
    if (!target) return { completed: [], unlockedList: [] }
    try {
      setLoading(true)
      const ref = doc(db, 'players', target)
      const snap = await getDoc(ref)
      
      let completed = []
      let unlockedList = []
      
      if (snap.exists()) {
        const data = snap.data()
        completed = data.completed_levels ?? []
        unlockedList = data.unlocked_levels ?? []
      }
      
      setProgress(completed)
      setUnlocked(unlockedList)
      localStorage.setItem(LS_UNLOCKED_KEY, JSON.stringify(unlockedList))
      
      return { completed, unlockedList }
    } catch (err) {
      console.error('fetchPlayerProgress error:', err)
      setError('無法讀取進度，請稍後再試。')
      return { completed: [], unlockedList: [] }
    } finally {
      setLoading(false)
    }
  }, [nickname])

  // ── 檢查暱稱是否已存在 ────────────────────────────────────────────────
  const checkNicknameExists = useCallback(async (nick) => {
    const ref = doc(db, 'players', nick)
    const snap = await getDoc(ref)
    return snap.exists()
  }, [])

  // ── 登錄暱稱（建立/載入玩家文件） ───────────────────────────────────────
  const registerNickname = useCallback(async (nick) => {
    try {
      setLoading(true)
      setError(null)
      const ref = doc(db, 'players', nick)
      const snap = await getDoc(ref)
      
      let completed = []
      let unlockedList = []

      if (!snap.exists()) {
        // 第一次登錄，建立全新玩家文件
        await setDoc(ref, {
          nickname: nick,
          completed_levels: [],
          unlocked_levels: [],
          last_updated: serverTimestamp(),
        })
      } else {
        // 已存在帳號：從 Firestore 載入先前的關卡記錄與解鎖紀錄
        const data = snap.data()
        completed = data.completed_levels ?? []
        unlockedList = data.unlocked_levels ?? []
      }
      
      // 更新本地快取
      localStorage.setItem(LS_KEY, nick)
      localStorage.setItem(LS_UNLOCKED_KEY, JSON.stringify(unlockedList))
      
      setNickname(nick)
      setProgress(completed)
      setUnlocked(unlockedList)
      
      return { success: true }
    } catch (err) {
      console.error('registerNickname error:', err)
      setError('登錄失敗，請稍後再試。')
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }, [])

  // ── 新增已完成關卡 ──────────────────────────────────────────────────
  const addCompletedLevel = useCallback(async (levelId) => {
    const activeNick = nickname || localStorage.getItem(LS_KEY)
    if (!activeNick) return { success: false, error: '尚未登錄暱稱' }
    try {
      setLoading(true)
      const ref = doc(db, 'players', activeNick)
      await updateDoc(ref, {
        completed_levels: arrayUnion(levelId),
        unlocked_levels: arrayUnion(levelId), // 已完成的關卡，理所當然也屬於已解鎖
        last_updated: serverTimestamp(),
      })
      
      setProgress(prev => prev.includes(levelId) ? prev : [...prev, levelId])
      setUnlocked(prev => {
        if (prev.includes(levelId)) return prev
        const next = [...prev, levelId]
        localStorage.setItem(LS_UNLOCKED_KEY, JSON.stringify(next))
        return next
      })
      
      return { success: true }
    } catch (err) {
      console.error('addCompletedLevel error:', err)
      setError('更新進度失敗，請稍後再試。')
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }, [nickname])

  // ── 清除暱稱（登出） ─────────────────────────────────────────────────
  const clearNickname = useCallback(() => {
    localStorage.removeItem(LS_KEY)
    localStorage.removeItem(LS_UNLOCKED_KEY)
    setNickname('')
    setProgress([])
    setUnlocked([])
  }, [])

  // 初始化時若已有暱稱，自動同步進度
  useEffect(() => {
    if (nickname) {
      fetchPlayerProgress(nickname)
      fetchLevels()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    nickname,
    progress,
    unlocked,
    levels,
    loading,
    error,
    setError,
    registerNickname,
    fetchPlayerProgress,
    fetchLevels,
    addCompletedLevel,
    unlockLevel,
    checkNicknameExists,
    clearNickname,
  }
}
