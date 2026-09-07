import { craftLevelOfTier, craftTierByLevel, tierFlat, tierPct, gearRealmMult, stageOfLevel, tierCapBoost } from '@/plugins/craft.js'
import { TIERS, RECIPES } from '@/plugins/alchemy.js'
import { TALISMANS } from '@/plugins/talisman.js'
import { FORMATIONS } from '@/plugins/formation.js'
import equips from '@/plugins/equip.js'
import { realmPower } from '@/plugins/breakthroughGate.js'

const REALM_NAMES = ['炼气','筑基','金丹','元婴','化神','炼虚','合体','大乘','渡劫','真仙','玄仙','金仙','大罗','太乙','混元','道祖']
const lvOfStage = s => s * 9 + 1

console.log('品阶 → 解锁等级：', Array.from({length:11}, (_, i) => `T${i+1}=${craftLevelOfTier(i+1)}(${REALM_NAMES[stageOfLevel(craftLevelOfTier(i+1))]})`).join(' '))
console.log('境界 → 可炼品阶：', [0,3,9,18,36,54,72,90,108,126,143].map(lv => `Lv${lv+1}→${craftTierByLevel(lv+1)}`).join(' '))
console.log('倍率表 flat/pct：', TIERS.map(t => `${t.tierName || t.name}:${t.mult}/${t.pct}`).join(' '))

console.log('\n===== 丹：数值型(攻击丹) / 百分比型(暴击丹) =====')
const danAtk = t => RECIPES.find(r => r.tier === t && r.id.endsWith('-attack')).permanent.attack
const danCrit = t => RECIPES.find(r => r.tier === t && r.id.endsWith('-critical')).permanent.critical
for (let t = 1; t <= 11; t++) console.log(`T${String(t).padStart(2)} 攻+${String(danAtk(t)).padStart(4)}  暴击+${(danCrit(t) * 100).toFixed(2)}%  灵草${RECIPES.find(r => r.tier === t).cost.spiritHerb}`)

console.log('\n===== 符：攻伐符(上限按阶放宽) + 持续 =====')
for (let t = 1; t <= 11; t++) {
  const r = TALISMANS.find(x => x.tier === t && x.id.endsWith('-atkbuff'))
  console.log(`T${String(t).padStart(2)} 攻击+${(r.buff.attack * 100).toFixed(0)}%  时长${r.buff.minutes}分  消耗灵草${TALISMANS.find(x => x.tier === t).cost.spiritHerb}`)
}

console.log('\n===== 阵：战斗阵 20 级 攻击% =====')
for (let t = 1; t <= 11; t++) {
  const f = FORMATIONS.find(x => x.tier === t && x.group === 'combat')
  console.log(`T${String(t).padStart(2)} 攻击+${(f.effect(20).attack * 100).toFixed(0)}%  单级消耗基准${f.costBase}  需境界 Lv${f.minLevel}`)
}

console.log('\n===== 装：同品质(神阶 danger)武器 基础攻（期望） =====')
const qm = { danger: 12 }
const rows = []
for (let s = 0; s < 16; s++) {
  const lv = lvOfStage(s) + 8
  const exp = 12 * lv * gearRealmMult(lv) * qm.danger * 1.35
  rows.push({ stage: REALM_NAMES[s], lv, exp })
}
let prev = null
rows.forEach(r => {
  const ratio = prev ? (r.exp / prev).toFixed(2) : '-'
  const powerRatio = (realmPower(r.lv) / realmPower(lvOfStage(0) + 8)).toFixed(1)
  console.log(`${r.stage.padEnd(4)} Lv${String(r.lv).padStart(3)}  期望攻 ${Math.round(r.exp).toString().padStart(8)}  相邻境界×${ratio}  境界战力×${powerRatio}`)
  prev = r.exp
})
const gearAt = rows[15].exp / rows[0].exp
const powerAt = realmPower(144) / realmPower(9)
console.log(`\n装(道祖/炼气 同品质) = ×${gearAt.toFixed(0)}   境界战力标准 = ×${powerAt.toFixed(0)}`)
console.log(`tierCapBoost: T1=${tierCapBoost(1)} T6=${tierCapBoost(6).toFixed(2)} T11=${tierCapBoost(11).toFixed(2)}`)
