// 每日修行目标 + 连签
export const DAILY_TASKS = [
  { key: 'cultivate', name: '修炼', target: 5, icon: '☯️', desc: '突破/升级 5 次' },
  { key: 'battle', name: '历练', target: 3, icon: '⚔️', desc: '完成 3 场战斗' },
  { key: 'alchemy', name: '炼丹', target: 2, icon: '🔥', desc: '炼制 2 次丹药' },
  { key: 'boss', name: '讨伐', target: 2, icon: '🗡️', desc: '攻击世界BOSS 2 次' },
  { key: 'draw', name: '气运', target: 1, icon: '🎲', desc: '抽取 1 次气运' }
]

const today = () => new Date().toISOString().slice(0, 10)

export const initDaily = player => {
  if (!player.dailyGoals || typeof player.dailyGoals !== 'object') player.dailyGoals = { date: '', counts: {}, claimed: false, streak: 0 }
  if (player.dailyGoals.date !== today()) {
    player.dailyGoals = { date: today(), counts: {}, claimed: false, streak: player.dailyGoals.streak || 0 }
  }
  if (!player.dailyGoals.counts) player.dailyGoals.counts = {}
  return player.dailyGoals
}

export const bumpDaily = (player, key) => {
  const dg = initDaily(player)
  dg.counts[key] = (dg.counts[key] || 0) + 1
  return dg
}

export const dailyDone = player => {
  const dg = initDaily(player)
  return DAILY_TASKS.every(t => (dg.counts[t.key] || 0) >= t.target)
}

export const dailyClaimable = player => {
  const dg = initDaily(player)
  return dailyDone(player) && !dg.claimed
}

export const claimDaily = player => {
  const dg = initDaily(player)
  if (!dailyDone(player) || dg.claimed) return { ok: false, reason: '今日目标未完成或已领取' }
  dg.claimed = true
  dg.streak = (dg.streak || 0) + 1
  const streak = dg.streak
  const lv = Math.max(1, player.level || 1)
  const mult = streak >= 30 ? 4 : streak >= 14 ? 2.2 : streak >= 7 ? 1.6 : 1
  const money = Math.floor(lv * 220 * mult)
  const dan = streak >= 7 ? 2 : 1
  const stone = streak >= 14 ? 2 : 1
  player.props.money = (player.props.money || 0) + money
  player.props.cultivateDan = (player.props.cultivateDan || 0) + dan
  player.props.strengtheningStone = (player.props.strengtheningStone || 0) + stone
  return { ok: true, money, dan, stone, streak }
}
