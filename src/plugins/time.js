// 时间流逝 —— 现实 1 秒 = 1 游戏小时；修仙历照此推进
// 岁数随日推进，寿元随境界/转生增长，界内显示"岁数 + 寿元"

export const DAYS_PER_SECOND = 1 / 6 // 现实 1 秒 ≈ 4 游戏小时
export const DAYS_PER_YEAR = 365
export const DAYS_PER_MONTH = 30

import { equippedExtras } from './setBonus.js'

import { daoBonus } from './rebirthShop.js'

export const rollInitAge = () => 6 + Math.floor(Math.random() * 7) // 6~12 岁

// 凡人与各境界寿元(按大境界梯级)：凡人100年，越高越久，仙人不老
const MORTAL_LIFESPAN = 100
const REALM_LIFESPANS = [
  150, 300, 600, 1200, 2400, 5000, 10000, 20000, 40000, 80000, 150000, 300000, 500000, 800000, 1200000, 2000000
]

export const realmLifespanBase = level => {
  const lv = Math.max(1, Math.floor(level || 1))
  const stage = Math.min(15, Math.floor((lv - 1) / 9))
  return REALM_LIFESPANS[stage]
}

// 突破所需余寿：按当前大境界寿元上限的比例递增（低境界要求低，高境界逐步提高）
export const breakthroughLifespanNeed = level => {
  const lv = Math.max(1, Math.floor(level || 1))
  const stage = Math.min(15, Math.floor((lv - 1) / 9))
  const ratio = Math.min(0.35, 0.12 + stage * 0.015)
  return Math.max(15, Math.round(REALM_LIFESPANS[stage] * ratio))
}

const now = () => Date.now()

// 自游戏开始累计的游戏天数(含当前未结算的实时部分)
export const totalGameDays = player => {
  if (typeof player.timeDays !== 'number') player.timeDays = 0
  if (typeof player.timeAnchor !== 'number') player.timeAnchor = now()
  return player.timeDays + Math.floor((now() - player.timeAnchor) / 1000) * DAYS_PER_SECOND
}

// 修仙历日期
export const gameDate = player => {
  const d = totalGameDays(player)
  const year = Math.floor(d / DAYS_PER_YEAR) + 1
  const dayOfYear = Math.floor(d % DAYS_PER_YEAR)
  const month = Math.floor(dayOfYear / DAYS_PER_MONTH) + 1
  const day = (dayOfYear % DAYS_PER_MONTH) + 1
  return { year, month, day, days: d }
}

// 岁数 = 初始寿数 + 经过年数
export const gameAge = player => (player.ageBase || 16) + Math.floor(totalGameDays(player) / DAYS_PER_YEAR)

// 寿元上限：凡人100年，随大境界梯级提升；延寿丹(奇遇)再叠加
export const playerLifespan = player => {
  const lv = player.level || 0
  const stage = lv <= 0 ? -1 : Math.min(15, Math.floor((lv - 1) / 9))
  const base = stage < 0 ? MORTAL_LIFESPAN : REALM_LIFESPANS[stage]
  const fateMult = 1 + (player.fateLifespanMult || 0)
  return Math.floor((base + (player.lifespanBonus || 0) + (daoBonus(player).lifespanBonus || 0) + (equippedExtras(player).lifespan || 0)) * fateMult)
}

// 寿元是否耗尽
export const isLifespanExhausted = player => gameAge(player) >= playerLifespan(player)

// 初始化时间字段(兼容旧存档)
export const ensureTime = player => {
  if (typeof player.timeDays !== 'number') player.timeDays = 0
  if (typeof player.timeAnchor !== 'number') player.timeAnchor = now()
  if (typeof player.ageBase !== 'number') player.ageBase = player.age || rollInitAge()
  if (typeof player.age !== 'number') player.age = player.ageBase
}

// 定期结算：把推算出的天数/岁数写回并重置锚点(避免每次渲染都写存档)
export const syncTime = player => {
  const d = totalGameDays(player)
  player.timeDays = d
  player.timeAnchor = now()
  player.age = gameAge(player)
}
