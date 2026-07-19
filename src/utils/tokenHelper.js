// src/utils/tokenHelper.js
// 生成隨機過關 Token，供後台新增關卡時使用

/**
 * 生成指定長度的隨機英數字 Token
 * @param {number} length - Token 長度，預設 16
 * @returns {string}
 */
export function generatePassToken(length = 16) {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return Array.from(array, byte => chars[byte % chars.length]).join('')
}

/**
 * 建立完整的 NFC Task URL (含 task_token)
 * @param {string} baseUrl - 網站根網址
 * @param {string} levelId - 關卡 ID
 * @param {string} token - task_token
 * @returns {string}
 */
export function buildTaskUrl(baseUrl, levelId, token) {
  return `${baseUrl}/task?level=${levelId}&token=${token}`
}

/**
 * 建立完整的 NFC Complete URL（含 pass_token）
 * @param {string} baseUrl - 網站根網址
 * @param {string} levelId - 關卡 ID
 * @param {string} token - pass_token
 * @returns {string}
 */
export function buildCompleteUrl(baseUrl, levelId, token) {
  return `${baseUrl}/complete?level=${levelId}&token=${token}`
}
