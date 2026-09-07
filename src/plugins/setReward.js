// 集齐全套奖励 —— 「同品阶穿戴四件」与「同名套装四件」的一次性收藏奖励
//
//   setRewardStatus(player)   界面用：每条成套目标的进度/是否已发奖
//   checkSetRewards(player)   结算：把当前已达成且未发过的奖励一次性发放（自动，带文案）
//
// 奖励额度直接挂在大境界战力标准上（realmPower），所以高品阶成套的回报天然远高于低品阶。
// 记录写在 player.setRewards，轮回转世不清除（属于永久收藏进度）。

import { equippedCountByQuality, SET_QUALITY_NAMES, setStats } from './setBonus.js'
import { EQUIP_SETS, CHEST_SET, CHEST_SET2, setById, setBonusOf } from './equipSetDb.js'
import { craftLevelOfTier, tierFlat } from './craft.js'
import { realmPower } from './breakthroughGate.js'
import { formatNumberToChineseUnit } from './game.js'

const QUALITY_ORDER = ['info', 'success', 'primary', 'purple', 'pink', 'warning', 'danger', 'cyan', 'orange', 'gold', 'legendary']

// 全部可收集的成套目标（品阶套 11 + 专属套装 22 + 宝箱套装 2）
export const setRewardDefs = () => {
  const defs = []
  QUALITY_ORDER.forEach((quality, i) => {
    const tier = i + 1
    defs.push({ key: `qual:${quality}`, kind: 'quality', quality, tier, label: `${SET_QUALITY_NAMES[quality]}·同阶四件`, hint: '穿戴 4 件同品阶装备' })
  })
  EQUIP_SETS.forEach(e => {
    const tier = QUALITY_ORDER.indexOf(e.quality) + 1
    e.sets.forEach(s => defs.push({ key: `named:${s.id}`, kind: 'named', setId: s.id, quality: e.quality, tier, label: `${s.name}·四件齐备`, hint: '穿戴同一套装的 4 个部位' }))
  })
  // 装备宝箱专属套装同样计入收藏
  ;[CHEST_SET, CHEST_SET2].forEach(s => {
    const tier = QUALITY_ORDER.indexOf(s.quality) + 1
    defs.push({ key: `named:${s.id}`, kind: 'named', setId: s.id, quality: s.quality, tier, label: `${s.name}·四件齐备`, hint: '穿戴同一套装的 4 个部位' })
  })
  return defs
}

// 各品阶的一次性奖励额度
export const setRewardForTier = tier => {
  const t = Math.max(1, Math.min(11, Math.round(tier || 1)))
  const lv = craftLevelOfTier(t)
  return {
    money: Math.max(2000, Math.floor(realmPower(lv) * 0.015)),
    cultivateDan: t,
    strengtheningStone: t * 4,
    currency: t >= 7 ? t - 6 : 0,
    // 圣阶/道阶成套另给一枚高阶装备宝箱券等价的稀有材料
    herb: Math.round(20 * tierFlat(t) * 0.5)
  }
}

export const setRewardText = r => {
  const parts = [`灵石 ${formatNumberToChineseUnit(r.money)}`, `培养丹 ${r.cultivateDan}`, `炼器石 ${r.strengtheningStone}`]
  if (r.currency) parts.push(`混沌石 ${r.currency}`)
  if (r.herb) parts.push(`灵草 ${formatNumberToChineseUnit(r.herb)}`)
  return parts.join(' · ')
}

const ensured = player => {
  if (!player.setRewards || typeof player.setRewards !== 'object') player.setRewards = {}
  return player.setRewards
}

// 当前穿戴的成套统计
const equippedSets = player => {
  const byQuality = equippedCountByQuality(player)
  const named = {}
  Object.values(player?.equipment || {}).forEach(slot => {
    if (slot && slot.setId) named[slot.setId] = (named[slot.setId] || 0) + 1
  })
  return { byQuality, named }
}

// 收集进度（供界面）：[{ key,label,tier,have,need,done,claimed,rewardText }]
export const setRewardStatus = player => {
  const owned = ensured(player)
  const { byQuality, named } = equippedSets(player)
  return setRewardDefs().map(d => {
    const have = d.kind === 'quality' ? byQuality[d.quality] || 0 : named[d.setId] || 0
    const reward = setRewardForTier(d.tier)
    return {
      ...d,
      have,
      need: 4,
      done: have >= 4,
      claimed: !!owned[d.key],
      reward,
      rewardText: setRewardText(reward)
    }
  })
}

// 结算并发放所有「已达成且未发过」的成套奖励
export const checkSetRewards = player => {
  const owned = ensured(player)
  const { byQuality, named } = equippedSets(player)
  const granted = []
  setRewardDefs().forEach(d => {
    if (owned[d.key]) return
    const have = d.kind === 'quality' ? byQuality[d.quality] || 0 : named[d.setId] || 0
    if (have < 4) return
    owned[d.key] = Date.now()
    const r = setRewardForTier(d.tier)
    const props = player.props || (player.props = {})
    props.money = (props.money || 0) + r.money
    props.cultivateDan = (props.cultivateDan || 0) + r.cultivateDan
    props.strengtheningStone = (props.strengtheningStone || 0) + r.strengtheningStone
    props.spiritHerb = (props.spiritHerb || 0) + r.herb
    if (r.currency) props.currency = (props.currency || 0) + r.currency
    granted.push({ key: d.key, label: d.label, tier: d.tier, reward: r, text: setRewardText(r) })
  })
  return granted
}

// 汇总展示：已领 / 可领 / 总
export const setRewardSummary = player => {
  const list = setRewardStatus(player)
  const claimed = list.filter(x => x.claimed).length
  const claimable = list.filter(x => x.done && !x.claimed).length
  return { claimed, claimable, total: list.length, percent: Math.round((claimed / list.length) * 100) }
}

// 已生效的套装数（用于「集齐」提示里的属性核对）
export const equippedSetStats = player => setStats(player)

export { setById, setBonusOf }