import { RECIPES, recipeCostList, recipeShortfall, canCraft } from '@/plugins/alchemy.js'

const mkPlayer = (level, props) => ({ level, props, pills: [], pillUses: {}, buffs: [] })

const p1 = mkPlayer(1, { spiritHerb: 3, money: 100, cultivateDan: 0, yeCao: 0 })
const r1 = RECIPES.find(r => r.tier === 1 && r.category === 'permanent')
console.log('丹方:', r1.name, JSON.stringify(r1.cost))
console.log('清单:', JSON.stringify(recipeCostList(p1, r1.id)))
console.log('缺失:', recipeShortfall(p1, r1.id), '| canCraft:', JSON.stringify(canCraft(p1, r1.id).ok))

const p2 = mkPlayer(200, { spiritHerb: 999999, money: 9999999, cultivateDan: 999, lingZhi: 50 })
const r2 = RECIPES.find(r => r.tier === 11)
console.log('道阶丹方:', r2.name, JSON.stringify(r2.cost))
console.log('清单:', JSON.stringify(recipeCostList(p2, r2.id)))
console.log('缺失:', recipeShortfall(p2, r2.id) || '(空)', '| canCraft:', canCraft(p2, r2.id).ok)
