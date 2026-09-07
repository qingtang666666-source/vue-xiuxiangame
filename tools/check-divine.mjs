import { TECHNIQUES } from '@/plugins/technique.js'
import { getPlayerAbilities } from '@/plugins/battleEngine.js'
import { divineTipText, divineTipForTech, proficiencyPreview } from '@/plugins/divine.js'

const actives = TECHNIQUES.filter(t => t.type === 'active')
const pick = kind => actives.find(t => t.divine.kind === kind)
const ids = [pick('burst'), pick('control'), pick('heal'), pick('lifesteal')].filter(Boolean)
const player = {
  level: 60,
  techniqueSet: { active: ids.map(t => t.id), passive: [] },
  methods: Object.fromEntries(ids.map((t, i) => [t.id, { chapter: 6 + i * 3, proficiency: 1 + (i % 4) }]))
}
const abs = getPlayerAbilities(player)
abs.forEach(ab => {
  console.log('---', ab.name, '| tech:', ab.techName, '| kind:', ab.kind, '| power:', ab.power.toFixed(2), '| mp:', ab.mpCost, '| chance:', ab.chance.toFixed(3), '| prof:', ab.profName, '| stun:', (ab.stunChance || 0).toFixed(3))
})
console.log('\n===== tooltip 示例 =====')
console.log(divineTipText(abs[1]))
console.log('\n===== 未习得估算 =====')
const unowned = actives.find(t => !ids.includes(t))
console.log(divineTipForTech({ level: 10, methods: {} }, unowned.id))
console.log('\n===== 熟练度预览 =====')
console.log(JSON.stringify(proficiencyPreview(player, ids[0].id), null, 1))
