// 图鉴收集度：统计六类图鉴（材料/丹药/符箓/功法/阵法/天材地宝）已收集占比，给全局加成
// 另设收集里程碑，达到门槛后可领取一次性奖励，给长线收集提供阶段目标。
import { MATERIALS } from './materialDb.js'
import { RECIPES } from './alchemy.js'
import { TALISMANS } from './talisman.js'
import { TECHNIQUES } from './technique.js'
import { FORMATIONS } from './formation.js'
import { TREASURES } from './treasure.js'

const CATEGORY_NAMES = {
  material: '材料',
  pill: '丹药',
  talisman: '符箓',
  technique: '功法',
  formation: '阵法',
  treasure: '天材地宝'
}

const RESOURCE_NAMES = {
  money: '灵石',
  spiritHerb: '灵草',
  strengtheningStone: '炼器石',
  cultivateDan: '培养丹',
  rootBone: '悟性丹',
  currency: '混沌石',
  chips: '筹码',
  daoPoints: '道点',
  daoMark: '道痕',
  lifespanBonus: '寿元'
}

const PERK_NAMES = {
  attack: '攻击',
  defense: '防御',
  health: '气血',
  critical: '暴击',
  dodge: '闪避',
  cultivationSpeed: '修炼速度',
  moneyMult: '灵石收益'
}

export const CODEX_MILESTONES = [
  {
    id: 'codex-10',
    percent: 0.1,
    name: '初窥门径',
    rewards: { cultivateDan: 200, money: 20000 },
    perk: { cultivationSpeed: 0.01 }
  },
  {
    id: 'codex-25',
    percent: 0.25,
    name: '博览群书',
    rewards: { money: 100000, strengtheningStone: 200 },
    perk: { attack: 100, defense: 100 }
  },
  {
    id: 'codex-50',
    percent: 0.5,
    name: '学贯古今',
    rewards: { currency: 5, cultivateDan: 1000 },
    perk: { health: 1000, critical: 0.01 }
  },
  {
    id: 'codex-75',
    percent: 0.75,
    name: '道藏大成',
    rewards: { daoMark: 1, daoPoints: 20 },
    perk: { cultivationSpeed: 0.05, dodge: 0.01 }
  },
  {
    id: 'codex-100',
    percent: 1,
    name: '万法归宗',
    rewards: { currency: 20, daoPoints: 50, lifespanBonus: 50 },
    perk: { attack: 800, defense: 800, health: 8000 }
  }
]

const ensureCodexRewards = player => {
  if (!player.codexRewards || typeof player.codexRewards !== 'object') player.codexRewards = { claimed: [] }
  if (!Array.isArray(player.codexRewards.claimed)) player.codexRewards.claimed = []
}

const applyCodexReward = (player, milestone) => {
  const props = player.props || (player.props = {})
  Object.entries(milestone.rewards || {}).forEach(([key, value]) => {
    if (key === 'daoPoints') player.daoPoints = (player.daoPoints || 0) + value
    else if (key === 'daoMark') player.daoMark = (player.daoMark || 0) + value
    else if (key === 'lifespanBonus') player.lifespanBonus = (player.lifespanBonus || 0) + value
    else props[key] = (props[key] || 0) + value
  })
  Object.entries(milestone.perk || {}).forEach(([key, value]) => {
    if (key === 'attack' || key === 'defense' || key === 'critical' || key === 'dodge') player[key] = (player[key] || 0) + value
    else if (key === 'health') {
      player.maxHealth = (player.maxHealth || 0) + value
      player.health = (player.health || 0) + value
    } else if (key === 'cultivationSpeed') player.cultivationSpeed = (player.cultivationSpeed || 1) + value
    else if (key === 'moneyMult') {
      if (!player.alchemy) player.alchemy = { moneyMult: 1, offlineMult: 1 }
      player.alchemy.moneyMult *= 1 + value
    }
  })
}

export const codexRewardText = milestone => {
  const parts = []
  Object.entries(milestone?.rewards || {}).forEach(([key, value]) => {
    parts.push(`${RESOURCE_NAMES[key] || key} ×${value}`)
  })
  Object.entries(milestone?.perk || {}).forEach(([key, value]) => {
    const name = PERK_NAMES[key] || key
    if (key === 'critical' || key === 'dodge' || key === 'moneyMult') parts.push(`${name} +${(value * 100).toFixed(1)}%`)
    else if (key === 'cultivationSpeed') parts.push(`${name} +${(value * 100).toFixed(0)}%`)
    else parts.push(`${name} +${value}`)
  })
  return parts.join('、')
}

export const codexStats = player => {
  const matOwn = MATERIALS.filter(m => (player.props?.[m.key] || 0) > 0).length
  const matTotal = MATERIALS.length
  const pillOwn = RECIPES.filter(r => player.pills?.some(p => p.id === r.id)).length
  const pillTotal = RECIPES.length
  const talOwn = TALISMANS.filter(t => player.talismans?.some(x => x.id === t.id)).length
  const talTotal = TALISMANS.length
  const techOwn = TECHNIQUES.filter(t => player.methods?.[t.id]).length
  const techTotal = TECHNIQUES.length
  const formOwn = FORMATIONS.filter(f => (player.formations?.[f.id] || 0) > 0).length
  const formTotal = FORMATIONS.length
  const treOwn = TREASURES.filter(t => (player.treasures?.[t.key] || 0) > 0).length
  const treTotal = TREASURES.length
  const total = matTotal + pillTotal + talTotal + techTotal + formTotal + treTotal
  const owned = matOwn + pillOwn + talOwn + techOwn + formOwn + treOwn
  return {
    owned,
    total,
    percent: total ? owned / total : 0,
    counts: {
      material: [matOwn, matTotal],
      pill: [pillOwn, pillTotal],
      talisman: [talOwn, talTotal],
      technique: [techOwn, techTotal],
      formation: [formOwn, formTotal],
      treasure: [treOwn, treTotal]
    }
  }
}

export const codexMilestoneState = player => {
  ensureCodexRewards(player)
  const { percent } = codexStats(player)
  return CODEX_MILESTONES.map(milestone => {
    const reached = percent + 1e-9 >= milestone.percent
    const claimed = player.codexRewards.claimed.includes(milestone.id)
    return {
      ...milestone,
      reached,
      claimed,
      claimable: reached && !claimed,
      progress: Math.min(1, percent / milestone.percent)
    }
  })
}

export const claimCodexMilestone = (player, id) => {
  ensureCodexRewards(player)
  const milestone = CODEX_MILESTONES.find(m => m.id === id)
  if (!milestone) return { ok: false, reason: '未知图鉴里程碑' }
  if (player.codexRewards.claimed.includes(id)) return { ok: false, reason: '该里程碑奖励已领取' }
  const { percent } = codexStats(player)
  if (percent + 1e-9 < milestone.percent) {
    return { ok: false, reason: `图鉴收集度需达到 ${Math.round(milestone.percent * 100)}%` }
  }
  applyCodexReward(player, milestone)
  player.codexRewards.claimed.push(id)
  return { ok: true, milestone, rewardText: codexRewardText(milestone) }
}

export const claimAllCodexMilestones = player => {
  const claimed = []
  CODEX_MILESTONES.forEach(milestone => {
    const result = claimCodexMilestone(player, milestone.id)
    if (result.ok) claimed.push(result)
  })
  return claimed
}

export const codexCategoryNames = CATEGORY_NAMES

// 全局加成：每 1% 图鉴 +0.1% 修为、+0.05% 灵石
export const codexBonus = player => {
  const { percent } = codexStats(player)
  return {
    cultivation: percent * 0.1,
    money: percent * 0.05
  }
}
