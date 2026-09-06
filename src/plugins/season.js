// 赛季与排名 —— 每 14 个自然日一个赛季；玩家通过突破/轮回/成就积攒赛季分，达到分段领奖
// 单机天梯：本季虚拟"道友"榜单，玩家与之争夺名次

import { rollTechniqueDrop } from './technique.js'

const SEASON_DAYS = 14

export const seasonIdNow = () => Math.floor(Date.now() / (SEASON_DAYS * 24 * 3600 * 1000))

const TIERS = [
  { min: 0, name: '凡尘', rewards: { money: 10000 } },
  { min: 60, name: '炼气', rewards: { money: 40000 } },
  { min: 180, name: '筑基', rewards: { money: 120000, daoPoints: 5 } },
  { min: 400, name: '金丹', rewards: { money: 300000, daoPoints: 8 } },
  { min: 900, name: '元婴', rewards: { money: 400000, daoPoints: 15, currency: 2, scroll: true } },
  { min: 1800, name: '化神', rewards: { money: 600000, daoPoints: 30, currency: 5, scroll: true } },
  { min: 3600, name: '合体', rewards: { money: 1500000, daoPoints: 60, currency: 10, scroll: true } },
  { min: 7000, name: '大乘', rewards: { money: 3000000, daoPoints: 120, currency: 25, scroll: true } },
  { min: 14000, name: '道祖', rewards: { money: 5000000, daoPoints: 300, currency: 60, daoMark: 2, scroll: true } }
]

const RIVAL_NAMES = ['玄清子', '紫霄道君', '青冥剑仙', '丹霞真人', '北冥散人', '云中鹤', '赤炎魔尊', '天机老人', '渡厄尊者']

const tierOf = points => {
  let t = TIERS[0]
  for (const x of TIERS) if (points >= x.min) t = x
  return t
}
const nextTier = points => TIERS.find(x => x.min > points) || null

export const addSeasonPoints = (player, n) => {
  if (!n) return
  if (!player.season) player.season = {}
  player.season.points = (player.season.points || 0) + Math.floor(n)
}

const grant = (player, rewards) => {
  if (!rewards) return
  if (rewards.chips) player.props.chips = (player.props.chips || 0) + rewards.chips
  if (rewards.money) player.props.money = (player.props.money || 0) + rewards.money
  if (rewards.daoPoints) player.daoPoints = (player.daoPoints || 0) + rewards.daoPoints
  if (rewards.currency) player.props.currency = (player.props.currency || 0) + rewards.currency
  if (rewards.lifespanBonus) player.lifespanBonus = (player.lifespanBonus || 0) + rewards.lifespanBonus
  if (rewards.daoMark) player.daoMark = (player.daoMark || 0) + rewards.daoMark
  if (rewards.scroll) rollTechniqueDrop(player)
}

// 首次进入 / 跨赛季：结算上一季奖励，重置赛季
export const ensureSeason = player => {
  const sid = seasonIdNow()
  if (!player.season) player.season = { id: -1, points: 0, lastTier: '', rivals: [] }
  if (player.season.id !== sid) {
    const lastTier = player.season.lastTier || tierOf(player.season.points || 0).name
    const lastReward = tierOf(player.season.points || 0).rewards
    if (player.season.id >= 0) {
      grant(player, lastReward)
      player.season.lastSettle = { tier: lastTier, points: player.season.points || 0, rewards: lastReward }
    }
    player.season.id = sid
    player.season.points = 0
    player.season.rivals = RIVAL_NAMES.map(name => ({ name, points: Math.floor(40 + Math.random() * (18000 - 40)) })).sort((a, b) => b.points - a.points)
    return { newSeason: true, settled: player.season.lastSettle || null }
  }
  if (!player.season.rivals || !player.season.rivals.length) {
    player.season.rivals = RIVAL_NAMES.map(name => ({ name, points: Math.floor(40 + Math.random() * (18000 - 40)) })).sort((a, b) => b.points - a.points)
  }
  return { newSeason: false, settled: null }
}

const rankOf = player => {
  const pts = player.season?.points || 0
  const rivals = player.season?.rivals || []
  return 1 + rivals.filter(r => r.points > pts).length
}

export const seasonState = player => {
  const pts = player.season?.points || 0
  return {
    id: player.season?.id ?? -1,
    points: pts,
    tier: tierOf(pts),
    next: nextTier(pts),
    rank: rankOf(player),
    rivalCount: (player.season?.rivals || []).length + 1,
    rivals: player.season?.rivals || [],
    settled: player.season?.lastSettle || null
  }
}

export const seasonTiers = () => TIERS
export const tierRewardText = rewards => {
  if (!rewards) return ''
  const parts = []
  if (rewards.chips) parts.push(`筹码${rewards.chips}`)
  if (rewards.money) parts.push(`灵石${rewards.money}`)
  if (rewards.daoPoints) parts.push(`道行${rewards.daoPoints}`)
  if (rewards.currency) parts.push(`混沌石${rewards.currency}`)
  if (rewards.lifespanBonus) parts.push(`寿元+${rewards.lifespanBonus}`)
  if (rewards.daoMark) parts.push(`道痕+${rewards.daoMark}`)
  if (rewards.scroll) parts.push('功法卷轴')
  return parts.join(' / ')
}
