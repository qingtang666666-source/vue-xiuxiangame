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

// 玩家正式战力（与“总体实力/装备评分”一致；不引入 equip 避免循环依赖，公式相同）
export const playerPowerScore = player => {
  const eff = effectivePlayerStats(player)
  const dodge = eff.dodge || 0
  const attack = eff.attack || 0
  const health = eff.maxHealth || player.maxHealth || 0
  const critical = eff.critical || 0
  const defense = eff.defense || 0
  return Math.floor(dodge * 1.6 * 100 + attack * 2 + (health / 100) * 0.2 + defense * 1.2 + critical * 1.8 * 100)
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
export const breakthroughPowerNeed = lv => Math.floor(sameLevelEnemyScore(lv) * RIVAL_COUNT * RIVAL_FACTOR)

// 渡劫所需最低战力（威压门槛）
export const tribulationPowerNeed = lv => Math.floor(lv * 150)

export const initGateState = player => {
  if (!player.stageFails) player.stageFails = {}
  if (typeof player.btCdUntil !== 'number') player.btCdUntil = 0
  if (typeof player.tribulationCdUntil !== 'number') player.tribulationCdUntil = 0
  return player
}
