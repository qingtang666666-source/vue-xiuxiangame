// 存档持久化 —— 脏标记 + 延迟落盘
//
// 不再每次状态变更都全量加密写 localStorage（此前主 store 的 persistedstate 插件如此），
// 而是：变更则打脏标记 → 800ms 空闲后保存；持续变更则每 5s 强制保存一次；
// 切后台/关页面时立即落盘，避免丢档。

import { ElNotification } from 'element-plus'
import { seal, open, writeVault, readVault, backupSave, wipeVault, restoreBackup, listBackups, dropBackups, exportSaveText, importSaveText, auditPlayer, SAVE_KEY } from './saveVault.js'
import { trimPlayerWealth, trimWealth } from './wealthGuard.js'

export const SAVE_VERSION = 2
export {
  seal,
  open,
  readVault,
  backupSave,
  wipeVault,
  restoreBackup,
  listBackups,
  dropBackups,
  exportSaveText,
  importSaveText,
  auditPlayer,
  writeVault,
  SAVE_KEY
}
const SAVE_DELAY = 800
const MAX_WAIT = 5000
// 序列化后接近浏览器单源存储上限(约 5MB)时提前预警，避免满量后静默丢档
const QUOTA_LIMIT = 4.2 * 1024 * 1024

let saveTimer = null
let maxTimer = null
let dirty = false
let quotaWarned = false
let lastSaveWarn = 0
// 删档后置为 true：阻止卸载钩子/订阅回调把“已删除的存档”又写回去（旧版删档后会复活）
let dead = false

// 存档体：签名封装（加密 + HMAC + 内嵌摘要），见 saveVault.js
const encryptState = store => writeVault(store.boss, store.player)

const warnSaveIssue = nearQuota => {
  const now = Date.now()
  if (now - lastSaveWarn < 30000) return
  lastSaveWarn = now
  const message = nearQuota
    ? '存档体积已接近浏览器上限，为防进度丢失，建议尽快“导出存档”备份。'
    : '存档写入失败（可能存储空间已满），当前进度尚未保存。请尽快“导出存档”备份。'
  try {
    ElNotification.closeAll()
    ElNotification({ title: '存档提示', message, type: 'error', duration: 6000 })
  } catch (e) {
    /* 忽略 */
  }
}

const persistNow = store => {
  if (dead) return
  try {
    // 落盘前体检：灵石 + 筹码合计超限的部分按异常数据清空，脏数据不写进存档
    trimWealth(store && store.player && store.player.props)
    let raw
    try {
      if (store?.player) store.player.lastSaveAt = Date.now()
      raw = encryptState(store)
    } catch (e) {
      return
    }
    if (!quotaWarned && raw.length > QUOTA_LIMIT) {
      quotaWarned = true
      warnSaveIssue(true)
    }
  } catch (e) {
    // 容量超限等异常不阻断游戏，但给出提示避免玩家误以为已保存
    warnSaveIssue(false)
  }
  dirty = false
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
  if (maxTimer) {
    clearTimeout(maxTimer)
    maxTimer = null
  }
}

// 立即落盘（切后台 / 关页面前调用）
export const flushPersistence = store => {
  if (dead) return
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
  if (maxTimer) {
    clearTimeout(maxTimer)
    maxTimer = null
  }
  if (dirty) persistNow(store)
}

const scheduleSave = store => {
  if (dead) return
  dirty = true
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    saveTimer = null
    persistNow(store)
  }, SAVE_DELAY)
  // 兜底：持续变更时最多每 MAX_WAIT 强制落盘一次
  if (!maxTimer) {
    maxTimer = setTimeout(() => {
      if (dirty) {
        if (saveTimer) {
          clearTimeout(saveTimer)
          saveTimer = null
        }
        persistNow(store)
      }
    }, MAX_WAIT)
  }
}

const loadState = () => {
  let data
  try {
    data = readVault()
  } catch (e) {
    // 验签失败：不覆盖原档（readVault 已把它另存为 corrupt 副本 + 自动备份），提示后可回滚
    const msg = String((e && e.message) || e)
    console.warn('[persistence] 存档校验未通过', msg)
    try {
      backupSave('corrupt')
      ElNotification.closeAll()
      ElNotification({
        title: '存档校验未通过',
        message: '本地存档疑似被修改或已损坏，本次已按新档启动。原文件保留在浏览器里，可在“游戏设置 → 存档备份”回滚上一个自动备份。',
        type: 'error',
        duration: 12000
      })
    } catch (err) {
      /* 通知失败不影响启动 */
    }
    return null
  }
  if (!data) return null
  const player = data.player
  // 老存档背包容量兜底到 1000（避免改默认值后老玩家仍是 50）
  if (player && typeof player === 'object') {
    player.backpackCapacity = Math.max(player.backpackCapacity || 0, 1000)
    if (typeof data.at === 'number') player.lastSaveAt = Math.max(player.lastSaveAt || 0, data.at)
    // 读档体检：灵石 + 筹码合计超限的部分按异常数据直接清空
    trimPlayerWealth(player)
  }
  return { boss: data.boss, player: migratePlayer(player) }
}

// 停止一切落盘（导入/删档前调用，防止自动保存或卸载钩子把旧状态倒灌回去）
export const stopPersistence = () => {
  dead = true
  dirty = false
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
  if (maxTimer) {
    clearTimeout(maxTimer)
    maxTimer = null
  }
}

// 彻底停表 + 删档：先停表，再留一份可回滚备份，最后清 key（调用方负责刷新）
export const wipeSave = store => {
  stopPersistence()
  try {
    if (store && store.player) backupSave('last')
  } catch (e) {
    /* 备份失败也要继续删 */
  }
  wipeVault()
}

// 当前是否有未落盘的改动（导出前先 flush 用）
export const isDirty = () => dirty

// —— 数值减半迁移（旧档 version<0.9）：仅战斗属性（攻/防/气血/评分）减半，暴闪等概率不动 ——
const halve = v => Math.floor((v || 0) / 2)

const migrateItem = it => {
  if (!it || typeof it !== 'object') return
  if (typeof it.attack === 'number') it.attack = halve(it.attack)
  if (typeof it.health === 'number') it.health = halve(it.health)
  if (typeof it.defense === 'number') it.defense = halve(it.defense)
  if (typeof it.score === 'number') it.score = halve(it.score)
  const ini = it.initial
  if (ini && typeof ini === 'object') {
    if (typeof ini.attack === 'number') ini.attack = halve(ini.attack)
    if (typeof ini.health === 'number') ini.health = halve(ini.health)
    if (typeof ini.defense === 'number') ini.defense = halve(ini.defense)
  }
  ;(it.affixes || []).forEach(a => {
    if (a && a.type === 'stat' && (a.stat === 'attack' || a.stat === 'defense' || a.stat === 'health') && typeof a.value === 'number') {
      a.value = halve(a.value)
    }
  })
}

const migratePlayer = player => {
  if (!player || (player.version || 0) >= 0.9) return player
  player.attack = halve(player.attack)
  player.defense = halve(player.defense)
  player.maxHealth = halve(player.maxHealth)
  player.health = Math.min(halve(player.health), player.maxHealth)
  player.score = halve(player.score)
  ;(player.inventory || []).forEach(migrateItem)
  Object.values(player.equipment || {}).forEach(migrateItem)
  player.version = 0.9
  return player
}

// 深合并：以 saved 为准、defaults 补缺（兼容旧存档缺少新字段），纯对象，不触碰响应式代理
const isPlain = v => v && typeof v === 'object' && !Array.isArray(v)
const deepMerge = (saved, defaults) => {
  if (saved === undefined) return defaults
  if (!isPlain(saved) || !isPlain(defaults)) return saved
  const out = { ...defaults }
  for (const k of Object.keys(saved)) {
    out[k] = isPlain(saved[k]) && isPlain(defaults[k]) ? deepMerge(saved[k], defaults[k]) : saved[k]
  }
  return out
}

// 初始化：先加载归档（旧档缺新字段由 $patch 深合并补默认），再订阅变更
export const setupPersistence = store => {
  const saved = loadState()
  if (saved) {
    try {
      // 先对默认状态做一次纯对象快照，再与存档深合并，最后整体赋值
      // 避免 Pinia $patch 在极端旧档/异常结构上抛错导致白屏
      const snapshot = JSON.parse(JSON.stringify(store.$state))
      if (saved.boss) store.$patch({ boss: deepMerge(saved.boss, snapshot.boss) })
      if (saved.player) store.$patch({ player: deepMerge(saved.player, snapshot.player) })
    } catch (e) {
      console.warn('[persistence] 存档合并失败，已使用默认状态启动', e)
    }
  }
  try {
    store.$subscribe(() => scheduleSave(store), { detached: true })
  } catch (e) {
    console.warn('[persistence] 订阅失败', e)
  }
  const onVisibility = () => {
    if (document.hidden) flushPersistence(store)
  }
  const onUnload = () => flushPersistence(store)
  try {
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('beforeunload', onUnload)
  } catch (e) {
    /* ignore */
  }

  return { flush: () => flushPersistence(store) }
}
