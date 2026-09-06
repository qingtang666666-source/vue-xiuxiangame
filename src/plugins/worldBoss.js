// 世界 Boss —— 每 24 小时刷新一只。玩家持续挑战削血，按贡献领奖；含虚拟道友伤害榜。

import { effectivePlayerStats } from './setBonus.js'
import { addTreasure, TREASURES } from './treasure.js'
import { rollTechniqueDrop } from './technique.js'

const BOSS_NAMES = ['天鹏妖皇', '九幽魔尊', '混沌凶兽', '太虚古龙', '荒古神猿', '噬天蟒王']
const RIVAL_NAMES = ['紫霄道君', '青冥剑仙', '北冥散人', '赤炎魔尊', '云中鹤', '天机老人']
const DAILY_ATTACK_CAP = 80

export const worldBossCycle = () => Math.floor(Date.now() / 86400000)

const stageOf = lv => Math.max(0, Math.min(15, Math.floor((lv - 1) / 9)))

export const ensureWorldBoss = player => {
  const day = worldBossCycle()
  if (!player.worldBoss || player.worldBoss.day !== day || !player.worldBoss.maxHp) {
    const power = effectivePlayerStats(player)
    const atk = Math.max(100, power.attack || 100)
    const stage = stageOf(player.level || 0)
    const maxHp = Math.floor(Math.max(50, atk * (16 + stage * 2)))
    player.worldBoss = {
      day,
      name: BOSS_NAMES[Math.floor(Math.random() * BOSS_NAMES.length)],
      hp: maxHp,
      maxHp,
      dead: false,
      damage: 0,
      attacks: 0,
      rewards: { kill: 0, daily: player.worldBoss?.rewards?.daily || 0 }
    }
    return { newBoss: true }
  }
  if (!player.worldBoss.rewards) player.worldBoss.rewards = { kill: 0, daily: 0 }
  return { newBoss: false }
}

export const fightWorldBoss = player => {
  ensureWorldBoss(player)
  const wb = player.worldBoss
  if (wb.dead) return { ok: false, reason: '本日世界 Boss 已被讨伐' }
  if ((wb.attacks || 0) >= DAILY_ATTACK_CAP) return { ok: false, reason: `今日已挑战 ${DAILY_ATTACK_CAP} 次，明日再来` }
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
    const kill = Math.floor((20000 + (player.level || 1) * 1000) * Math.max(0.2, share))
    player.props.money = (player.props.money || 0) + kill
    player.props.cultivateDan = (player.props.cultivateDan || 0) + Math.floor(300 * Math.max(0.2, share))
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
  ensureWorldBoss(player)
  const wb = player.worldBoss
  const pct = wb.maxHp ? Math.floor((wb.hp / wb.maxHp) * 100) : 0
  const stage = stageOf(player.level || 0)
  const total = Math.max(1, (wb.damage || 0))
  const rivals = RIVAL_NAMES.map((name, i) => ({
    name,
    damage: Math.floor(total * (0.4 + Math.random() * 1.2) * (1 + stage * 0.05))
  })).sort((a, b) => b.damage - a.damage)
  const all = [...rivals, { name: '你', damage: wb.damage || 0 }].sort((a, b) => b.damage - a.damage)
  return {
    day: wb.day,
    name: wb.name,
    hp: wb.hp,
    maxHp: wb.maxHp,
    pct,
    damage: wb.damage || 0,
    attacks: wb.attacks || 0,
    dead: wb.dead,
    cap: DAILY_ATTACK_CAP,
    kill: wb.rewards.kill,
    daily: wb.rewards.daily,
    rank: all.findIndex(x => x.name === '你') + 1,
    rivals: all
  }
}
