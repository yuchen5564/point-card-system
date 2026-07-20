// src/utils/pdfHelper.js
import QRCode from 'qrcode'
import { jsPDF } from 'jspdf'

/**
 * 將文字與 QRCode 繪製在 Canvas 上，並匯出成 PDF
 * @param {Array} activeLevels - 所有已啟用的關卡清單
 * @param {string} baseUrl - 根網址
 */
export async function exportLevelsToPdf(activeLevels, baseUrl, workflowMode = 'linear') {
  const doc = new jsPDF('p', 'mm', 'a4')
  
  // A4 大小：210mm x 297mm
  // 在 300 DPI 下，1mm 約等於 3.78 像素。我們使用固定尺寸畫布渲染
  const canvasWidth = 800
  const canvasHeight = 1130 // 接近 A4 比例

  for (let i = 0; i < activeLevels.length; i++) {
    const level = activeLevels[i]
    const isLast = workflowMode === 'independent' || i === activeLevels.length - 1
    
    // 生成 QR Code 的 Base64
    const taskUrl = `${baseUrl}/task?level=${level.id}&token=${level.task_token}`
    const completeUrl = `${baseUrl}/complete?level=${level.id}&token=${level.pass_token}`

    const taskQrData = await QRCode.toDataURL(taskUrl, { margin: 1, width: isLast ? 220 : 320 })
    let completeQrData = ''
    if (isLast) {
      completeQrData = await QRCode.toDataURL(completeUrl, { margin: 1, width: 220 })
    }

    // 建立畫布
    const canvas = document.createElement('canvas')
    canvas.width = canvasWidth
    canvas.height = canvasHeight
    const ctx = canvas.getContext('2d')

    // 1. 滿版白底
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)

    // 2. 繪製標題與邊框裝飾
    ctx.fillStyle = '#4f46e5'
    ctx.fillRect(40, 40, canvasWidth - 80, 15)

    ctx.fillStyle = '#1e293b'
    ctx.font = 'bold 28px "Microsoft JhengHei", "PingFang TC", sans-serif'
    ctx.fillText('NFC 集點闖關 — 關卡實體標籤', 40, 95)

    ctx.fillStyle = '#64748b'
    ctx.font = '16px sans-serif'
    ctx.fillText(`列印日期: ${new Date().toLocaleDateString()}  |  關卡 ID: ${level.id}`, 40, 125)

    // 繪製分隔線
    ctx.strokeStyle = '#e2e8f0'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(40, 145)
    ctx.lineTo(canvasWidth - 40, 145)
    ctx.stroke()

    // 3. 繪製關卡基本資訊
    ctx.fillStyle = '#4f46e5'
    ctx.font = 'bold 36px "Microsoft JhengHei", sans-serif'
    ctx.fillText(level.name, 40, 200)

    ctx.fillStyle = '#334155'
    ctx.font = '18px sans-serif'
    const desc = level.description || '無描述'
    ctx.fillText(`任務描述：${desc.length > 30 ? desc.slice(0, 30) + '...' : desc}`, 40, 240)

    if (!isLast) {
      // 4. 置中單一 QR Code 掃描貼紙區
      // 根據關卡順序決定標題與風格
      let qrTitle = ''
      let qrColor = '#4f46e5'
      let guide1 = ''
      let guide2 = ''
      let cardBg = '#f8fafc'
      let cardBorder = '#cbd5e1'

      if (i === 0) {
        qrTitle = '【 第一關：掃描起點領取任務 】'
        qrColor = '#4f46e5'
        guide1 = '請將此 QR Code 貼在起點位置'
        guide2 = '玩家掃描後即可登錄並領取第一關任務！'
        cardBg = '#f5f3ff'
        cardBorder = '#ddd6fe'
      } else {
        qrTitle = `【 第 ${i + 1} 關：掃描過關與領取任務 】`
        qrColor = '#0ea5e9'
        guide1 = `請將此 QR Code 貼在第 ${i + 1} 關位置`
        guide2 = '玩家完成前一關任務後，掃描此碼過關並領取下一關！'
        cardBg = '#f0f9ff'
        cardBorder = '#e0f2fe'
      }

      // 繪製外框卡片
      ctx.fillStyle = cardBg
      ctx.fillRect(100, 290, 600, 680)
      ctx.strokeStyle = cardBorder
      ctx.lineWidth = 3
      ctx.strokeRect(100, 290, 600, 680)

      // 繪製 QR Code 標題
      ctx.fillStyle = qrColor
      ctx.font = 'bold 24px "Microsoft JhengHei", sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(qrTitle, 400, 350)

      // 繪製 QR Code 圖片
      const imgTask = await loadImage(taskQrData)
      ctx.drawImage(imgTask, 240, 390, 320, 320)

      // 繪製 URL 與引導文字
      ctx.fillStyle = qrColor
      ctx.font = 'bold 15px "Microsoft JhengHei", sans-serif'
      ctx.fillText(guide1, 400, 755)
      
      ctx.fillStyle = '#64748b'
      ctx.font = '14px sans-serif'
      ctx.fillText(guide2, 400, 785)
      
      ctx.font = '11px monospace'
      wrapText(ctx, taskUrl, 400, 840, 520, 16)
    } else {
      // 雙卡片模式 (最後一關，或獨立模式下的所有關卡)
      // 5.1 左側：任務領取貼紙區
      ctx.fillStyle = '#f8fafc'
      ctx.fillRect(40, 290, 340, 660)
      ctx.strokeStyle = '#cbd5e1'
      ctx.lineWidth = 2
      ctx.strokeRect(40, 290, 340, 660)

      // 繪製 QR Code 標題
      ctx.fillStyle = '#ea580c'
      ctx.font = 'bold 22px "Microsoft JhengHei", sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(workflowMode === 'independent' ? '【 1. 領取關卡任務 】' : '【 1. 最後一關領取任務 】', 210, 340)

      // 繪製 QR Code 圖片
      const imgTask = await loadImage(taskQrData)
      ctx.drawImage(imgTask, 100, 380, 220, 220)

      // 繪製 URL 與引導文字
      ctx.fillStyle = '#64748b'
      ctx.font = '13px sans-serif'
      ctx.fillText('請將此 QR Code 貼在關卡入口', 210, 640)
      ctx.fillText(workflowMode === 'independent' ? '玩家掃描後可查看此關卡任務說明' : '玩家掃描後可查看最後一關任務說明', 210, 665)
      ctx.font = '11px monospace'
      wrapText(ctx, taskUrl, 210, 720, 300, 16)

      // 5.2 右側：過關完成貼紙區
      ctx.fillStyle = '#f0fdf4'
      ctx.fillRect(420, 290, 340, 660)
      ctx.strokeStyle = '#bbf7d0'
      ctx.strokeRect(420, 290, 340, 660)

      ctx.fillStyle = '#16a34a'
      ctx.font = 'bold 22px "Microsoft JhengHei", sans-serif'
      ctx.fillText(workflowMode === 'independent' ? '【 2. 挑戰過關完成 】' : '【 2. 終點完成掃描過關 】', 590, 340)

      const imgComplete = await loadImage(completeQrData)
      ctx.drawImage(imgComplete, 480, 380, 220, 220)

      ctx.fillStyle = '#16a34a'
      ctx.font = 'bold 13px "Microsoft JhengHei", sans-serif'
      ctx.fillText('⚠ 警示：請由工作人員/關主保管', 590, 640)
      ctx.fillStyle = '#64748b'
      ctx.font = '13px sans-serif'
      ctx.fillText(workflowMode === 'independent' ? '玩家完成此關卡任務後，掃描此碼過關' : '玩家完成全部任務後，掃描此碼過關', 590, 665)
      ctx.font = '11px monospace'
      wrapText(ctx, completeUrl, 590, 720, 300, 16)
    }

    // 重設 textAlign 為 left
    ctx.textAlign = 'left'

    // 5. 頁尾資訊
    ctx.fillStyle = '#94a3b8'
    ctx.font = '12px sans-serif'
    ctx.fillText('NFC Scavenger Hunt System - Generated by Admin Panel', 40, 1080)

    // 6. 將畫布轉換為圖片，並寫入 PDF 頁面
    const pageImgData = canvas.toDataURL('image/jpeg', 0.95)
    
    // 如果不是第一頁，先新增一頁
    if (i > 0) {
      doc.addPage()
    }
    doc.addImage(pageImgData, 'JPEG', 0, 0, 210, 297)
  }

  // 下載 PDF
  doc.save(`集點闖關_實體關卡QR_Codes.pdf`)
}

// 輔助函式：加載 Base64 圖片
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.src = src
    img.onload = () => resolve(img)
    img.onerror = reject
  })
}

// 輔助函式：文字折行
function wrapText(context, text, x, y, maxWidth, lineHeight) {
  const words = text.split('')
  let line = ''
  let currentY = y

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n]
    const metrics = context.measureText(testLine)
    const testWidth = metrics.width
    if (testWidth > maxWidth && n > 0) {
      context.fillText(line, x, currentY)
      line = words[n]
      currentY += lineHeight
    } else {
      line = testLine
    }
  }
  context.fillText(line, x, currentY)
}
