// 突破/渡劫门槛 —— 战力判定统一走“总体实力”口径，不另造临时战力
// 敌人(同阶对手)按境界基准值(monster 表)生成，不随玩家属性缩放
import { effectivePlayerStats } from './setBonus'
import monsters from './monster'

// 可调系数：战力门槛强度（×2 表示需击败 2 名同阶对手）
export const RIVAL_COUNT = 2
export const RIVAL_FACTOR = 1.0
// 失败冷却（毫秒）
export const BREAKTHROUGH_CD_FAIL = 30 * 1000
export const TRIBULATION_CD_FAIL = 60 * 1000
// 大境界突破失败上限
export const MAX_STAGE_FAILS = 5

// 境界战力标准：11阶(道祖, Lv~144)≈500万，几何递减到 Lv1≈8000
export const STANDARD_TOP_POWER = 5000000
export const STANDARD_BOTTOM_POWER = 8000
// 按 16 大境界阶梯：中高境界战力更高(更丰满)，道祖=500万起步，仅最底层陡降
const STAGE_POWER = [
  24000,   // 炼气
  64000,   // 筑基
  144000,  // 金丹
  288000,  // 元婴
  520000,  // 化神
  680000,  // 炼虚
  880000,  // 合体
  1240000, // 大乘
  1600000, // 渡劫
  1920000, // 真仙
  2240000, // 玄仙
  2520000, // 金仙
  2760000, // 大罗金仙
  3000000, // 太乙
  3200000, // 混元
  4000000  // 道祖
]
export const realmPower = level => {
  const lv = Math.max(1, Math.min(144, Math.floor(level || 1)))
  const stage = Math.max(0, Math.min(15, Math.floor((lv - 1) / 9)))
  return STAGE_POWER[stage]
}

// 玩家正式战力（与“总体实力/装备评分”一致；不引入 equip 避免循环依赖，公式相同）
export const playerPowerScore = player => {
  const eff = effectivePlayerStats(player)
  const dodge = eff.dodge || 0
  const attack = eff.attack || 0
  const health = eff.maxHealth || player.maxHealth || 0
  const critical = eff.critical || 0
  const defense = eff.defense || 0
  // 境界基础战力(标准曲线) + 装备/加点等实际加成：正常玩家≥本境界标准，装备/加点再往上叠加
  const realmBase = realmPower(player.level || 1)
  return Math.floor(realmBase + dodge * 1.6 * 100 + attack * 2 + (health / 100) * 0.2 + defense * 1.2 + critical * 1.8 * 100)
}

// 与 above 同权重，用于敌手评分
const scoreOfStats = (atk, hp, def, crit, dodge) =>
  Math.floor(dodge * 1.6 * 100 + atk * 2 + (hp / 100) * 0.2 + def * 1.2 + crit * 1.8 * 100)

// 按境界基准(monster 表)生成“同阶对手”战力
export const sameLevelEnemyScore = lv => {
  lv = Math.max(1, Math.floor(lv || 1))
  const atk = monsters.monster_Attack(lv)
  const hp = monsters.monster_Health(lv)
  const def = monsters.monster_Defense(lv)
  const crit = monsters.monster_Criticalhitrate(lv)
  return scoreOfStats(atk, hp, def, crit, 0.02)
}

// 突破所需战力：击败 RIVAL_COUNT 名同阶对手
export const breakthroughPowerNeed = lv => Math.floor(realmPower(lv) * 1.25)

// 渡劫所需最低战力（威压门槛）
export const tribulationPowerNeed = lv => Math.floor(realmPower(lv) * 1.1)

// 由目标战力反推“攻/防/血”三围，用于同阶对手/豪杰/渡劫敌手生成
export const enemyStatsForPower = (targetPower, eliteMult = 1.0) => {
  const p = Math.max(1, Math.floor(targetPower || 1))
  const attack = Math.floor((p * 0.42 / 2) * eliteMult)
  const defense = Math.floor((p * 0.18 / 1.2) * eliteMult)
  const health = Math.floor((p * 0.28 / 0.002) * eliteMult)
  return { attack, defense, health }
}

export const initGateState = player => {
  if (!player.stageFails) player.stageFails = {}
  if (typeof player.btCdUntil !== 'number') player.btCdUntil = 0
  if (typeof player.tribulationCdUntil !== 'number') player.tribulationCdUntil = 0
  return player
}
