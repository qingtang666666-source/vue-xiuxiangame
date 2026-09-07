// 统一敌人强度口径 —— 历战 / 无尽塔 / 大世界探索 / 世界BOSS
//
// 旧问题：这些玩法直接吃 monster 表的“裸数值”（攻≈等级×系数），而玩家战力口径
// （playerPowerScore = 境界标准 + 装备/加点）早已高出它一个数量级，
// 于是随便越一个大境界都能碾压；同时无尽塔在 144→145 级处一次跳 480 倍，72 层实质封顶。
//
// 现在统一改成：以“挑战者自己的战力”为锚，按玩法给倍率，再反推敌人三围。
// 装备/丹药再强也只是把锚一起抬高，越级不再白送，难度回到“倍率”本身。

import monsters from './monster.js'
import { playerPowerScore, enemyStatsForPower, enemyPowerForLevel, realmPower } from './breakthroughGate.js'
import { stageOfLevel } from './craft.js'

const clamp = (v, min, max) => Math.min(max, Math.max(min, v))

// 玩家当前战力（一切敌人的锚）
export const anchorPower = player => Math.max(1000, playerPowerScore(player))

// 由战力反推敌人对象（字段与旧 monster 表兼容，供 monsterToEntity / 页面直接显示）
export const enemyFromPower = (level, power, { name, eliteTag = false, extra = {} } = {}) => {
  const lv = Math.max(1, Math.floor(level) || 1)
  const p = Math.max(1000, Math.floor(power) || 1000)
  const st = enemyStatsForPower(p)
  const stage = stageOfLevel(lv)
  const display = name || monsters.monster_Names(Math.min(144, lv))
  return {
    name: eliteTag ? `${display}·首领` : display,
    level: lv,
    attack: st.attack,
    defense: st.defense,
    health: st.health,
    maxHealth: st.health,
    maxhealth: st.health,
    // 双暴/闪避随境界温和成长，不再出现 145 级 100% 暴击的断崖
    critical: clamp(0.02 + stage * 0.016, 0.02, 0.28) * (eliteTag ? 1.3 : 1),
    dodge: clamp(0.01 + stage * 0.012, 0.01, 0.22) * (eliteTag ? 1.2 : 1),
    power: p,
    ...extra
  }
}

// 反秒杀保护：敌人单刀攻击不超过挑战者气血的一定比例，
// 否则早期玩家（真实属性远低于境界标准战力）会被一回合带走。
const guardOneShot = (e, player, ratio = 0.42) => {
  const hp = Math.max(1, player?.maxHealth || player?.health || 0)
  if (hp > 1) e.attack = Math.max(1, Math.min(e.attack, Math.floor(hp * ratio)))
  return e
}

// —— 历战（回合制竞技场）——
// mult 由难度决定；多只时单只按比例削弱，避免“三只=三倍难度”的陡增。
export const ladderEnemies = (player, { count = 1, boss = false, levelOffset = 0, mult = 1, reincarnation = 0 } = {}) => {
  const ref = anchorPower(player)
  const pLv = Math.max(1, player.level || 1)
  const n = Math.max(1, Math.floor(count) || 1)
  const split = n > 1 ? 1 / Math.pow(n, 0.7) : 1
  const elite = boss ? 1.8 + reincarnation * 0.15 : 1
  const out = []
  for (let i = 0; i < n; i++) {
    const lv = Math.max(1, Math.min(160, pLv + levelOffset + Math.floor(Math.random() * 5) - 2))
    const power = ref * mult * split * elite
    out.push(guardOneShot(enemyFromPower(lv, power, { eliteTag: boss, extra: { idx: i } }), player))
  }
  return out
}

// 难度档位 → 战力倍率（相对玩家自己）
export const LADDER_DIFFICULTIES = {
  easy: { mult: 0.6, label: '低于你一头' },
  normal: { mult: 1.0, label: '与你相当' },
  hard: { mult: 1.4, label: '高出你四成' },
  boss: { mult: 1.8, label: '首领（含额外加压）' }
}

// —— 无尽塔：层数无限，且以玩家战力为锚持续加压 ——
//   第 1 层 ≈ 玩家 4 成战力；每层 +7%；每 5 层×1.12、10 层×1.4、50 层×1.8
//   玩家变强 → 锚变高 → 能重新往上推，但层数增长比成长更快，早晚撞墙，符合“无尽塔”。
export const towerFloorGrowth = floor => 0.25 + (Math.max(1, floor) - 1) * 0.065
export const towerElite = floor => (floor % 50 === 0 ? 1.8 : floor % 10 === 0 ? 1.4 : floor % 5 === 0 ? 1.12 : 1)

export const towerFloorEnemy = (floor, player) => {
  const f = Math.max(1, Math.floor(floor) || 1)
  const ref = anchorPower(player)
  const elite = towerElite(f)
  const power = ref * towerFloorGrowth(f) * elite
  // 等级只用于名称与境界压制展示：随层数缓慢抬升，上限 144
  const lv = Math.min(144, Math.max(1, Math.round((player.level || 1) + f / 12)))
  const m = guardOneShot(enemyFromPower(lv, power, { eliteTag: elite > 1, extra: { floor: f, elite } }), player)
  if (elite >= 1.4) m.name = `${m.name}·塔${f}`
  return m
}

// 无尽塔奖励：按层数持续增长（旧实现按怪物等级算，满级后不再成长）
export const towerReward = (floor, player) => {
  const f = Math.max(1, Math.floor(floor) || 1)
  const lv = Math.max(1, Math.floor(player?.level) || 1)
  const boss = f % 10 === 0
  return {
    exp: Math.floor((lv * 24 + f * 90) * (1 + f * 0.01)),
    money: Math.floor(lv * 2 + f * 26),
    dan: Math.floor((1 + f * 0.2) * (boss ? 5 : 1)),
    herb: Math.floor((2 + f * 0.3) * (boss ? 3 : 1)),
    stone: Math.floor((1 + f * 0.2) * (boss ? 3 : 1)),
    boss
  }
}

// —— 大世界探索：按区域递增，但整体略弱于玩家，保持“刷怪”手感 ——
export const exploreEnemy = (player, level, regionIdx = 0) => {
  const ref = anchorPower(player)
  const mult = clamp(0.42 + (Number(regionIdx) || 0) * 0.11, 0.3, 1.15)
  return guardOneShot(enemyFromPower(level, ref * mult), player)
}

// —— 拦路 / 领地怪：比普通探索怪更硬 ——
export const territoryEnemy = (player, level, regionIdx = 0) => {
  const ref = anchorPower(player)
  const mult = clamp(0.75 + (Number(regionIdx) || 0) * 0.16, 0.6, 1.9)
  return guardOneShot(enemyFromPower(level, ref * mult, { eliteTag: true }), player)
}

// —— 个人世界BOSS（/boss 页）：明显高出一截，需要配装与神通 ——
export const worldBossEnemy = (player, { reincarnation = 0 } = {}) => {
  const ref = anchorPower(player)
  const power = ref * (2.2 + reincarnation * 0.18)
  const names = monsters.monster_Names(Math.min(144, player?.level || 144))
  return guardOneShot(enemyFromPower(144, power, {
    name: `${names}`,
    eliteTag: true,
    extra: {
      desc: '上古凶兽，横行四海',
      text: '斩杀可得高阶装备与稀有材料',
      time: Math.floor(Date.now() / 1000),
      conquer: false
    }
  }), player, 0.5)
}

export { realmPower, enemyPowerForLevel, playerPowerScore }