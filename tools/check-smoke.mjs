import { setRewardSummary, checkSetRewards, setRewardStatus } from '@/plugins/setReward.js'
import { canCraft, recipeCostList, RECIPES } from '@/plugins/alchemy.js'
import { taxOnWin, netAfterTax, GAMBLING_TAX_RATE } from '@/plugins/gamblingTax.js'
import { petPowerStandard, petStats, petPowerScore, createCapturedPet, PET_QUALITIES } from '@/plugins/petSystem.js'
import { TECH_GRADES } from '@/plugins/technique.js'
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

// 灵宠：战力标准 = 境界战力标准 × 0.1 × 品质倍率（凡 1 → 圣 8.6）
const mkPet = (qi, lv) => {
  const pet = createCapturedPet({ name: '测试', potential: [8, 20, 30, 40, 47][qi], attack: 100, health: 400, defense: 12, dodge: 0.005, critical: 0.005 })
  pet.level = lv
  pet.role = 'attack'
  return pet
}
console.log('灵宠战力标准:', PET_QUALITIES.map((q, i) => `${q.name}(×${q.mult})=${petPowerStandard(144, q).toLocaleString('zh-CN')}`).join(' / '))
console.log('灵宠样例(lv144 圣品):', JSON.stringify({ ...petStats(mkPet(4, 144)), score: petPowerScore(mkPet(4, 144)) }))
console.log('灵宠样例(lv144 凡品):', JSON.stringify({ ...petStats(mkPet(0, 144)), score: petPowerScore(mkPet(0, 144)) }))

// 功法品阶倍率：逐阶 ×1.8（黄 1 → 道 357）
console.log('功法品阶倍率:', TECH_GRADES.map(g => `${g.name} ${g.mult}`).join(' / '))
