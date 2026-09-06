// 世界 Boss —— 每日刷新多只，每只每天可攻击3次；按贡献领奖，含虚拟道友伤害榜。
import { effectivePlayerStats } from './setBonus.js'
import { addTreasure, TREASURES } from './treasure.js'
import { rollTechniqueDrop } from './technique.js'

// 多只 Boss 定义：tier 表示境界加成（越高越难、击杀奖励越丰厚）
const BOSS_DEFS = [
  { name: '天妖皇', tier: 0 },
  { name: '九幽魔尊', tier: 1 },
  { name: '混沌凶兽', tier: 2 },
  { name: '太虚古龙', tier: 3 },
  { name: '荒古神猿', tier: 4 },
  { name: '噬天螭王', tier: 5 },
  { name: '万古魔帝', tier: 6 },
  { name: '轮回之主', tier: 7 }
]
const RIVAL_NAMES = ['紫虚道友', '青玄剑仙', '北冥散人', '赤炎魔尊', '云中鹤', '天机老人']
export const DAILY_ATTACK_CAP = 3

export const worldBossCycle = () => Math.floor(Date.now() / 86400000)

const stageOf = lv => Math.max(0, Math.min(15, Math.floor((lv - 1) / 9)))

// 每日刷新，保证一天内重复调用不重刷；兼容旧单Boss存档
export const ensureWorldBosses = player => {
  const day = worldBossCycle()
  if (player.worldBoss && !player.worldBosses) {
    player.worldBosses = [player.worldBoss]
    delete player.worldBoss
  }
  if (!Array.isArray(player.worldBosses)) player.worldBosses = []
  const stale = player.worldBosses.length === 0 || player.worldBosses.some(b => b.day !== day)
  if (stale) {
    const power = effectivePlayerStats(player)
    const baseStage = stageOf(player.level || 0)
    player.worldBosses = BOSS_DEFS.slice(0, 6).map((def, idx) => {
      const t = Math.min(15, baseStage + def.tier)
      const atk = Math.max(100, power.attack || 100)
      const maxHp = Math.floor(Math.max(50, atk * (16 + t * 2)))
      return {
        day,
        id: `wb-${idx}`,
        name: def.name,
        tier: def.tier,
        bossStage: t,
        hp: maxHp,
        maxHp,
        dead: false,
        damage: 0,
        attacks: 0,
        rewards: { kill: 0, daily: 0 }
      }
    })
    return { newBoss: true }
  }
  player.worldBosses.forEach(b => {
    if (!b.rewards) b.rewards = { kill: 0, daily: 0 }
  })
  return { newBoss: false }
}

export const ensureWorldBoss = player => ensureWorldBosses(player)

export const fightWorldBoss = (player, id) => {
  ensureWorldBosses(player)
  const wb = (player.worldBosses || []).find(b => b.id === id || id == null && b.day === worldBossCycle())
  if (!wb) return { ok: false, reason: '未找到该 Boss' }
  if (wb.dead) return { ok: false, reason: '该 Boss 已被讨伐' }
  if ((wb.attacks || 0) >= DAILY_ATTACK_CAP) return { ok: false, reason: `该 Boss 今日已攻击 ${DAILY_ATTACK_CAP} 次，明日再来` }
  const power = effectivePlayerStats(player)
  let dmg = Math.max(1, Math.floor(power.attack - 5))
  if (Math.random() < (power.critical || 0)) dmg = Math.floor(dmg * 1.5)
  wb.hp = Math.max(0, wb.hp - dmg)
  wb.damage = (wb.damage || 0) + dmg
  wb.attacks = (wb.attacks || 0) + 1
  const small = Math.floor((player.level || 1) * 2)
  player.props.money = (player.props.money || 0) + small
  let dead = false
  if (wb.hp <= 0) {
    dead = true
    wb.dead = true
    const share = Math.min(1, (wb.damage || 0) / wb.maxHp)
    const tierBoost = 1 + (wb.tier || 0) * 0.5
    const kill = Math.floor((20000 + (player.level || 1) * 1000) * Math.max(0.2, share) * tierBoost)
    player.props.money = (player.props.money || 0) + kill
    player.props.cultivateDan = (player.props.cultivateDan || 0) + Math.floor(300 * Math.max(0.2, share) * tierBoost)
    wb.rewards.kill = kill
    if (Math.random() < 0.45) {
      const t = TREASURES[Math.floor(Math.random() * TREASURES.length)]
      addTreasure(player, t.key, 1)
      wb.rewards.treasure = t.name
    }
    if (Math.random() < 0.2) {
      const s = rollTechniqueDrop(player)
      if (s.ok) wb.rewards.scroll = s.name
    }
  }
  return { ok: true, dmg, small, dead, kill: wb.rewards.kill, treasure: wb.rewards.treasure, scroll: wb.rewards.scroll }
}

export const worldBossState = player => {
  ensureWorldBosses(player)
  const list = (player.worldBosses || []).map(b => {
    const pct = b.maxHp ? Math.floor((b.hp / b.maxHp) * 100) : 0
    const stage = stageOf(player.level || 0)
    const total = Math.max(1, (b.damage || 0))
    const rivals = RIVAL_NAMES.map((name, i) => ({
      name,
      damage: Math.floor(total * (0.4 + Math.random() * 1.2) * (1 + stage * 0.05))
    })).sort((x, y) => y.damage - x.damage)
    const all = [...rivals, { name: '你', damage: b.damage || 0 }].sort((x, y) => y.damage - x.damage)
    return {
      id: b.id,
      day: b.day,
      name: b.name,
      hp: b.hp,
      maxHp: b.maxHp,
      pct,
      damage: b.damage || 0,
      attacks: b.attacks || 0,
      dead: b.dead,
      cap: DAILY_ATTACK_CAP,
      kill: b.rewards.kill,
      daily: b.rewards.daily,
      rank: all.findIndex(x => x.name === '你') + 1,
      rivals: all
    }
  })
  return list
}
