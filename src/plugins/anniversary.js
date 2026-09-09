// 正式版本纪念日 —— 每年 9 月 9 日登录可领取一次
export const ANNIVERSARY_MONTH = 9
export const ANNIVERSARY_DAY = 9
export const ANNIVERSARY_REWARD = {
  money: 100000,
  chips: 50000
}

const ensureClaims = player => {
  if (!Array.isArray(player.anniversaryClaims)) player.anniversaryClaims = []
}

export const anniversaryInfo = (player, now = new Date()) => {
  ensureClaims(player)
  const year = now.getFullYear()
  const isAnniversary = now.getMonth() + 1 === ANNIVERSARY_MONTH && now.getDate() === ANNIVERSARY_DAY
  const claimed = player.anniversaryClaims.includes(year)
  return {
    year,
    isAnniversary,
    claimed,
    claimable: isAnniversary && !claimed,
    dateText: `${ANNIVERSARY_MONTH} 月 ${ANNIVERSARY_DAY} 日`,
    reward: { ...ANNIVERSARY_REWARD }
  }
}

export const claimAnniversaryReward = (player, now = new Date()) => {
  const info = anniversaryInfo(player, now)
  if (!info.isAnniversary) return { ok: false, reason: `今天不是正式版本纪念日（每年 ${info.dateText}）` }
  if (info.claimed) return { ok: false, reason: `${info.year} 年纪念日奖励已领取` }
  const props = player.props || (player.props = {})
  props.money = (props.money || 0) + ANNIVERSARY_REWARD.money
  props.chips = (props.chips || 0) + ANNIVERSARY_REWARD.chips
  player.anniversaryClaims.push(info.year)
  return { ok: true, year: info.year, reward: { ...ANNIVERSARY_REWARD } }
}
