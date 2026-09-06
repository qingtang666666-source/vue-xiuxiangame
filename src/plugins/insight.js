// 悟性(1~20) —— 影响 修炼功法 / 学习技艺 / 修炼速度
// 开局/每轮回随机：1~7 档 30%，8~14 档 50%，15~20 档 20%

const roll = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1))

export const rollInsight = () => {
  const r = Math.random()
  if (r < 0.3) return roll(1, 7)
  if (r < 0.8) return roll(8, 14)
  return roll(15, 20)
}

// 悟性倍率：1~20 → 1.00 ~ 1.38
export const insightMult = player => {
  const i = player.insight || 1
  return 1 + (i - 1) * 0.02
}

// 高悟性在学艺/修功时更快（额外熟练度）
export const insightSkillBonus = player => {
  const i = player.insight || 1
  return i >= 15 ? 1 : i >= 8 ? 0 : 0
}

// 悟性带来的成本折扣（修功/学艺）
export const insightDiscount = player => Math.min(0.4, ((player.insight || 1) - 1) * 0.01)

export const insightLabelOf = player => {
  const i = player.insight || 1
  return i >= 15 ? '天纵之资' : i >= 8 ? '上上之资' : '中人之资'
}
