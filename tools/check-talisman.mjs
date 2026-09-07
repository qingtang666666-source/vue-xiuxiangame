import { TALISMANS } from '@/plugins/talisman.js'
for (let t = 1; t <= 11; t++) {
  const a = TALISMANS.find(x => x.tier === t && x.id.endsWith('-atkbuff'))
  const c = TALISMANS.find(x => x.tier === t && x.id.endsWith('-critbuff'))
  const h = TALISMANS.find(x => x.tier === t && x.id.endsWith('-heal'))
  const m = TALISMANS.find(x => x.tier === t && x.id.endsWith('-money'))
  console.log(`T${String(t).padStart(2)} 攻+${(a.buff.attack * 100).toFixed(0)}% 暴+${(c.buff.critical * 100).toFixed(1)}% 时长${a.buff.minutes}分 | 疗伤符 ${Math.round(h.instant.value * 100)}% | 化财符 value=${m.instant.value}`)
}
