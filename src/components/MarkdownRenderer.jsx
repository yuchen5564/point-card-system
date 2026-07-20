// src/components/MarkdownRenderer.jsx
import React from 'react'

function renderInlineStyles(text) {
  if (!text) return ''
  
  // 匹配 [text](url)
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
  // 匹配 **bold**
  const boldRegex = /\*\*([^*]+)\*\*/g
  // 匹配 `code`
  const codeRegex = /`([^`]+)`/g

  let parts = [{ type: 'text', content: text }]

  // 1. 解析連結
  let match
  let newParts = []
  for (let part of parts) {
    if (part.type !== 'text') {
      newParts.push(part)
      continue
    }
    let lastIndex = 0
    linkRegex.lastIndex = 0
    while ((match = linkRegex.exec(part.content)) !== null) {
      const before = part.content.substring(lastIndex, match.index)
      if (before) newParts.push({ type: 'text', content: before })
      newParts.push({ type: 'link', text: match[1], url: match[2] })
      lastIndex = linkRegex.lastIndex
    }
    const after = part.content.substring(lastIndex)
    if (after) newParts.push({ type: 'text', content: after })
  }
  parts = newParts

  // 2. 解析粗體
  newParts = []
  for (let part of parts) {
    if (part.type !== 'text') {
      newParts.push(part)
      continue
    }
    let lastIndex = 0
    boldRegex.lastIndex = 0
    while ((match = boldRegex.exec(part.content)) !== null) {
      const before = part.content.substring(lastIndex, match.index)
      if (before) newParts.push({ type: 'text', content: before })
      newParts.push({ type: 'bold', content: match[1] })
      lastIndex = boldRegex.lastIndex
    }
    const after = part.content.substring(lastIndex)
    if (after) newParts.push({ type: 'text', content: after })
  }
  parts = newParts

  // 3. 解析程式碼
  newParts = []
  for (let part of parts) {
    if (part.type !== 'text') {
      newParts.push(part)
      continue
    }
    let lastIndex = 0
    codeRegex.lastIndex = 0
    while ((match = codeRegex.exec(part.content)) !== null) {
      const before = part.content.substring(lastIndex, match.index)
      if (before) newParts.push({ type: 'text', content: before })
      newParts.push({ type: 'code', content: match[1] })
      lastIndex = codeRegex.lastIndex
    }
    const after = part.content.substring(lastIndex)
    if (after) newParts.push({ type: 'text', content: after })
  }
  parts = newParts

  // 4. 轉換為 React 節點
  return parts.map((part, index) => {
    if (part.type === 'link') {
      return (
        <a key={index} href={part.url} target="_blank" rel="noopener noreferrer" style={{ color: '#4f46e5', textDecoration: 'underline' }}>
          {part.text}
        </a>
      )
    }
    if (part.type === 'bold') {
      return <strong key={index}>{part.content}</strong>
    }
    if (part.type === 'code') {
      return (
        <code key={index} style={{ backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: 4, fontFamily: 'monospace', fontSize: '0.9em', color: '#e11d48' }}>
          {part.content}
        </code>
      )
    }
    return part.content
  })
}

export default function MarkdownRenderer({ content }) {
  if (!content) return null

  const lines = content.split('\n')
  const elements = []
  
  let currentListItems = []

  const flushList = (key) => {
    if (currentListItems.length > 0) {
      elements.push(
        <ul key={key} style={{ paddingLeft: 20, margin: '8px 0 16px 0', listStyleType: 'disc' }}>
          {currentListItems.map((item, idx) => (
            <li key={idx} style={{ marginBottom: 4, fontSize: 15, lineHeight: 1.6, color: '#334155' }}>
              {renderInlineStyles(item)}
            </li>
          ))}
        </ul>
      )
      currentListItems = []
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    // 處理清單
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      currentListItems.push(trimmed.substring(2))
      continue
    }

    // 若不是清單，先清空並輸出之前的清單
    flushList(`list-${i}`)

    // 處理標題
    if (trimmed.startsWith('### ')) {
      elements.push(
        <h5 key={`h3-${i}`} style={{ margin: '16px 0 8px 0', fontSize: 16, fontWeight: 700, color: '#1e293b' }}>
          {renderInlineStyles(trimmed.substring(4))}
        </h5>
      )
    } else if (trimmed.startsWith('## ')) {
      elements.push(
        <h4 key={`h2-${i}`} style={{ margin: '20px 0 10px 0', fontSize: 18, fontWeight: 700, color: '#1e293b' }}>
          {renderInlineStyles(trimmed.substring(3))}
        </h4>
      )
    } else if (trimmed.startsWith('# ')) {
      elements.push(
        <h3 key={`h1-${i}`} style={{ margin: '24px 0 12px 0', fontSize: 20, fontWeight: 700, color: '#1e293b' }}>
          {renderInlineStyles(trimmed.substring(2))}
        </h3>
      )
    } else if (trimmed === '') {
      // 空行
      elements.push(<div key={`br-${i}`} style={{ height: 8 }} />)
    } else {
      // 一般段落
      elements.push(
        <p key={`p-${i}`} style={{ margin: '0 0 12px 0', fontSize: 15, lineHeight: 1.6, color: '#334155' }}>
          {renderInlineStyles(line)}
        </p>
      )
    }
  }

  // 結尾清單
  flushList(`list-end`)

  return <div style={{ wordBreak: 'break-all' }}>{elements}</div>
}
