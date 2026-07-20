// scratch/testPlayer.js
import { initializeApp } from 'firebase/app'
import { getFirestore, doc, getDoc, collection, getDocs } from 'firebase/firestore'
import fs from 'fs'

// 簡易解析 .env
if (fs.existsSync('.env')) {
  const content = fs.readFileSync('.env', 'utf-8')
  content.split('\n').forEach(line => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return
    const index = trimmed.indexOf('=')
    if (index !== -1) {
      const key = trimmed.substring(0, index).trim()
      const val = trimmed.substring(index + 1).trim().replace(/^['"]|['"]$/g, '')
      process.env[key] = val
    }
  })
}

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

async function test() {
  try {
    console.log('--- 讀取所有玩家進度 ---')
    const snap = await getDocs(collection(db, 'players'))
    snap.docs.forEach(d => {
      const data = d.data()
      console.log(`Player: ${d.id}, Completed:`, data.completed_levels, `, Unlocked:`, data.unlocked_levels)
    })
  } catch (err) {
    console.error('Error:', err)
  }
}

test()
