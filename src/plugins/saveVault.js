// 存档保险库 —— 加密 + 完整性签名 + 数值体检
//
// 目标：让“改存档数值”不再是改几个字符就能生效的事。
//   1) 存档体：PBKDF2(随机盐) 派生密钥 → AES-256-CBC 加密；
//   2) 完整性：对 salt+iv+密文做 HMAC-SHA256，导入/加载时先验签，改一个字节即判损坏；
//   3) 数值体检：解出来后按境界战力标准做合理性检查，明显超模的档直接拒绝导入；
//   4) 兼容：旧版本 localStorage 的 {"boss":AES,"player":AES} 仍可读取，下次落盘自动升级。
//
// 说明：这是单机游戏，密钥必然在前端代码里（构建时还会混淆），所以它是“抬高作弊门槛”，
// 不是密码学意义上不可破解。但手动改 JSON 已经不可能生效。

import CryptoJS from 'crypto-js'
import { playerPowerScore } from './breakthroughGate.js'
import { trimPlayerWealth } from './wealthGuard.js'
import crypto from './crypto.js'

export const SAVE_KEY = 'vuex'
export const BACKUP_PREFIX = 'vuex.bak-'
const BACKUP_KEEP = 5
const MAGIC = 'XSYX2'
const KDF_ITERS = 1300
const LEGACY_MAGIC = 'XSYX1-legacy'
export const IMPORT_POWER_LIMIT = 5_000_000_000
export const IMPORT_CHIP_CAP = 500_000_000

// 主密钥分片：集中成一段可读字符串太容易被直接替换
const SECRET_PARTS = ['qin', 'gTang', '#xiu', 'Xian', '7z', '9Y', 'DaoZu', '@2026']
const appSecret = () => SECRET_PARTS.join('')

const b64 = wordArray => wordArray.toString(CryptoJS.enc.Base64).replace(/=+$/, '')
const fromB64 = str => CryptoJS.enc.Base64.parse(str.replace(/-/g, '+').replace(/_/g, '/'))

const deriveKey = (salt, iterations) =>
  CryptoJS.PBKDF2(appSecret(), salt, { keySize: 256 / 32, iterations: iterations || KDF_ITERS })

// 明文里再嵌一层校验摘要（纵深防御：即使有人重算 HMAC，也要同时凑出这个摘要）
const digestOf = plain => CryptoJS.SHA256(plain + '|' + appSecret()).toString(CryptoJS.enc.Hex).slice(0, 16)

/**
 * 封装：任意可序列化对象 → 签名字符串
 */
export const seal = data => {
  const plain = JSON.stringify(data)
  const salt = CryptoJS.lib.WordArray.random(16)
  const iv = CryptoJS.lib.WordArray.random(16)
  const key = deriveKey(salt)
  const body = { k: digestOf(plain), d: plain }
  const ct = CryptoJS.AES.encrypt(JSON.stringify(body), key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  })
  const s = b64(salt)
  const i = b64(iv)
  const c = ct.ciphertext.toString(CryptoJS.enc.Base64).replace(/=+$/, '')
  const mac = CryptoJS.HmacSHA256(`${MAGIC}|${s}|${i}|${c}`, key).toString(CryptoJS.enc.Base64).replace(/=+$/, '')
  return `${MAGIC}|${s}|${i}|${c}|${mac}`
}

/**
 * 解封：验签 → 解密 → 校验内嵌摘要；任何一步失败都抛错并给出原因
 */
export const open = text => {
  const raw = String(text || '').trim()
  if (!raw) throw new Error('EMPTY:存档为空')
  if (raw.startsWith(MAGIC)) {
    const parts = raw.split('|')
    if (parts.length !== 5) throw new Error('FORMAT:存档格式不完整')
    const [, s, i, c, mac] = parts
    const key = deriveKey(fromB64(s))
    const expect = CryptoJS.HmacSHA256(`${MAGIC}|${s}|${i}|${c}`, key).toString(CryptoJS.enc.Base64).replace(/=+$/, '')
    if (expect !== mac) throw new Error('TAMPER:存档校验失败，可能被修改或损坏')
    let plain
    try {
      const dec = CryptoJS.AES.decrypt(CryptoJS.enc.Base64.parse(c).toString(CryptoJS.enc.Base64), key, {
        iv: fromB64(i),
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      })
      plain = dec.toString(CryptoJS.enc.Utf8)
    } catch (e) {
      throw new Error('CRYPTO:存档解密失败')
    }
    if (!plain) throw new Error('CRYPTO:存档解密失败')
    let body
    try {
      body = JSON.parse(plain)
    } catch (e) {
      throw new Error('FORMAT:存档内容无法解析')
    }
    if (!body || typeof body !== 'object' || !body.d) throw new Error('FORMAT:存档缺少数据')
    if (digestOf(body.d) !== body.k) throw new Error('TAMPER:存档内容被改动')
    return JSON.parse(body.d)
  }
  // 兼容旧格式（v1 导出文件 / 旧 localStorage）：{"boss":"<aes>","player":"<aes>"}
  try {
    const legacy = JSON.parse(raw)
    if (legacy && (legacy.boss || legacy.player)) {
      return {
        v: 1,
        boss: crypto.decryption(legacy.boss),
        player: crypto.decryption(legacy.player)
      }
    }
  } catch (e) {
    /* 继续走统一报错 */
  }
  throw new Error('FORMAT:不是本游戏的存档文件（或文件已被改动）')
}

// ---- 数值体检：只查“明显不可能”的值，避免误伤正常老档 ----
const finiteNum = v => typeof v === 'number' && Number.isFinite(v)

export const auditPlayer = player => {
  const issues = []
  if (!player || typeof player !== 'object') return ['存档缺少玩家数据']
  const lv = player.level || 0
  if (!finiteNum(lv) || lv < 0 || lv > 200) issues.push(`境界等级异常(${lv})`)
  ;['attack', 'defense', 'maxHealth', 'health', 'cultivation', 'maxCultivation', 'score'].forEach(k => {
    const v = player[k]
    if (v != null && !finiteNum(v)) issues.push(`${k} 不是有效数值`)
    else if (typeof v === 'number' && v < -1) issues.push(`${k} 为负(${v})`)
  })
  ;['critical', 'dodge'].forEach(k => {
    if (typeof player[k] === 'number' && (player[k] < 0 || player[k] > 1.5)) issues.push(`${k} 超出概率范围(${player[k]})`)
  })
  const props = player.props || {}
  ;['money', 'spiritHerb', 'cultivateDan', 'strengtheningStone', 'currency', 'chips'].forEach(k => {
    const v = props[k]
    if (v != null && (!finiteNum(v) || v < 0)) issues.push(`${k} 异常(${v})`)
  })
  // 导入战力上限：统一放宽到 50 亿
  if (lv >= 1 && lv <= 200) {
    const power = playerPowerScore(player)
    const ceiling = IMPORT_POWER_LIMIT
    if (power > ceiling) issues.push(`总体实力超出合理区间(${Math.round(power / 10000)}万 > ${Math.round(ceiling / 10000)}万)`)
  }
  return issues
}

// ---- localStorage 读写（签名版）----
export const writeVault = (boss, player) => {
  const text = seal({ v: 2, at: Date.now(), boss, player })
  localStorage.setItem(SAVE_KEY, text)
  return text
}

export const readVault = () => {
  const raw = localStorage.getItem(SAVE_KEY)
  if (!raw) return null
  try {
    const data = open(raw)
    return { ...data, legacy: data.v === 1 }
  } catch (e) {
    // 校验失败：把原始档另存一份，避免“读坏档 → 顺手覆盖 → 真档没了”
    try {
      localStorage.setItem(`${SAVE_KEY}.corrupt-${Date.now()}`, raw)
    } catch (err) {
      /* 容量不足就算了 */
    }
    throw e
  }
}

// 备份/清理：导入前自动备份当前档，删除时保留可回滚副本
export const backupSave = (label = 'auto') => {
  const raw = localStorage.getItem(SAVE_KEY)
  if (!raw) return null
  const key = `${BACKUP_PREFIX}${label}-${Date.now()}`
  try {
    localStorage.setItem(key, raw)
    const all = Object.keys(localStorage).filter(k => k.startsWith(BACKUP_PREFIX)).sort()
    all.slice(0, Math.max(0, all.length - BACKUP_KEEP)).forEach(k => localStorage.removeItem(k))
    return key
  } catch (e) {
    return null
  }
}

export const listBackups = () =>
  Object.keys(localStorage)
    .filter(k => k.startsWith(BACKUP_PREFIX))
    .sort()
    .map(k => ({ key: k, at: Number((k.match(/(\d{13})$/) || [])[1]) || 0 }))

export const restoreBackup = key => {
  const raw = localStorage.getItem(key)
  if (!raw) return { ok: false, reason: '备份不存在' }
  try {
    open(raw)
  } catch (e) {
    return { ok: false, reason: String(e && e.message ? e.message : e).split(':')[1] || '备份校验失败' }
  }
  backupSave('before-restore')
  localStorage.setItem(SAVE_KEY, raw)
  return { ok: true }
}

export const dropBackups = () => {
  Object.keys(localStorage).filter(k => k.startsWith(BACKUP_PREFIX)).forEach(k => localStorage.removeItem(k))
}

// ---- 导出 / 导入文件 ----
export const exportSaveText = (boss, player) =>
  JSON.stringify({ format: MAGIC, game: '我的文字修仙全靠刷', at: new Date().toISOString(), payload: seal({ v: 2, boss, player }) }, null, 0)

export const importSaveText = text => {
  let payload = String(text || '').trim()
  if (!payload) return { ok: false, reason: '文件是空的' }
  // 允许两种壳：裸签名串 或 外层 JSON（带 format 头，便于识别）
  if (payload.startsWith('{') && !payload.startsWith(MAGIC)) {
    try {
      const wrapper = JSON.parse(payload)
      if (wrapper && wrapper.payload) payload = wrapper.payload
    } catch (e) {
      return { ok: false, reason: '文件不是有效的存档(JSON 解析失败)' }
    }
  }
  let data
  try {
    data = open(payload)
  } catch (e) {
    const msg = String((e && e.message) || e)
    const [code, detail] = msg.split(':')
    const hint = { TAMPER: '存档校验未通过：文件被改动过或已损坏', CRYPTO: '存档无法解密：文件损坏', FORMAT: '存档格式不对', EMPTY: '没有读到内容' }[code]
    return { ok: false, reason: detail || hint || '存档无效' }
  }
  if (!data || !data.player || typeof data.player !== 'object') return { ok: false, reason: '存档里没有玩家数据' }
  const bad = auditPlayer(data.player)
  if (bad.length) return { ok: false, reason: `存档数值异常，已拒绝导入：${bad.slice(0, 3).join('；')}` }
  const props = data.player.props || (data.player.props = {})
  const chipsBefore = Number(props.chips) || 0
  const chipsTrimmed = Math.max(0, chipsBefore - IMPORT_CHIP_CAP)
  if (chipsTrimmed > 0) props.chips = IMPORT_CHIP_CAP
  // 灵石 + 筹码合计超限的部分同样按异常数据清空（GM 豁免档跳过）
  const wealthTrimmed = trimPlayerWealth(data.player)
  return {
    ok: true,
    boss: data.boss,
    player: data.player,
    legacy: data.v === 1,
    chipsTrimmed,
    wealthTrimmed
  }
}

export const wipeVault = () => {
  backupSave('wipe')
  localStorage.removeItem(SAVE_KEY)
}
