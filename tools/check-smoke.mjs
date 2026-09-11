import { setRewardSummary, checkSetRewards, setRewardStatus } from '@/plugins/setReward.js'
import { canCraft, recipeCostList, RECIPES } from '@/plugins/alchemy.js'
import { taxOnWin, netAfterTax, GAMBLING_TAX_RATE } from '@/plugins/gamblingTax.js'
import { TALISMANS, canCraftTalisman } from '@/plugins/talisman.js'
import { FORMATIONS, formationStats, canUpgradeFormation } from '@/plugins/formation.js'
import { craftTierMax, craftLevelOfTier } from '@/plugins/craft.js'

const empty = { level: 1, props: {} }
console.log('空玩家汇总:', JSON.stringify(setRewardSummary(empty)), '| 结算:', checkSetRewards(empty).length)

const p = { level: 144, props: { spiritHerb: 100000, money: 1e9, cultivateDan: 5000, strengtheningStone: 9e5, mtl_天玄参: 40 }, equipment: {}, formations: {}, methods: {} }
const pill = RECIPES.find(r => r.tier === 11 && r.id.endsWith('-attack'))
const tal = TALISMANS.find(r => r.tier === 11 && r.id.endsWith('-atkbuff'))
const form = FORMATIONS.find(f => f.tier === 11 && f.group === 'combat')
console.log('道阶丹:', pill.name, pill.effectText, '| canCraft:', JSON.stringify(canCraft(p, pill.id)))
console.log('道阶符:', tal.name, tal.effectText, '| canCraft:', JSON.stringify(canCraftTalisman(p, tal.id)))
console.log('道阶阵:', form.name, '| 需境界', form.minLevel, '| 0级升1级消耗', JSON.stringify((p.formations[form.id] = 0, canUpgradeFormation(p, form.id).cost)))
console.log('阵法加成(空):', JSON.stringify(formationStats(p)))
console.log('可炼上限(道祖, 越级2):', craftTierMax(p), '| 各阶解锁:', Array.from({length:11}, (_, i) => craftLevelOfTier(i + 1)).join(','))
console.log('丹方清单样例:', JSON.stringify(recipeCostList(p, pill.id)))
console.log('赌局赢钱税:', GAMBLING_TAX_RATE, '| 赢 1000 抽', taxOnWin(1000), '| 输 500 抽', taxOnWin(-500), '| 赢 999 税后', netAfterTax(999))
