import { setRewardStatus, setRewardSummary, checkSetRewards, setRewardForTier, setRewardText } from '@/plugins/setReward.js'
import { formatNumberToChineseUnit } from '@/plugins/game.js'

const mk = equipment => ({ equipment, props: { money: 0, cultivateDan: 0, strengtheningStone: 0, spiritHerb: 0, currency: 0 }, level: 144, setRewards: {} })
const e = (id, type, quality, setId) => ({ id, type, quality, setId })

const p1 = mk([e(1, 'weapon', 'legendary', 'd_wg'), e(2, 'armor', 'legendary', 'd_wg'), e(3, 'accessory', 'legendary', 'd_wg'), e(4, 'sutra', 'legendary', 'd_wg')])
console.log('汇总:', JSON.stringify(setRewardSummary(p1)))
const g = checkSetRewards(p1)
console.log('发放:', g.map(x => `${x.label} → ${x.text}`).join('\n'))
console.log('资源:', JSON.stringify(p1.props))
console.log('再次结算(应为空):', checkSetRewards(p1).length)
console.log('黄阶奖励:', setRewardText(setRewardForTier(1)), '| 道阶奖励:', setRewardText(setRewardForTier(11)))
const st = setRewardStatus(p1).filter(x => x.done)
console.log('已完成条目:', st.map(x => `${x.key}(${x.have}/${x.need}) claimed=${x.claimed}`).join(' '))
