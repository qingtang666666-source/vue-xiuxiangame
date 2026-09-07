import { buildEnemies } from '@/plugins/battleEngine.js'
const p = { level: 60, name: '我', reincarnation: 2, attack: 36000, defense: 12000, health: 3600000, maxHealth: 3600000, critical: 0.2, dodge: 0.1, props: {}, inventory: [], equipment: {}, methods: {}, pills: [], buffs: [], formations: {}, skills: {}, pointAlloc: {} }
for (const d of [{ mult: 0.6, levelOffset: -9 }, { mult: 1, levelOffset: 0 }, { mult: 1.4, levelOffset: 9 }, { mult: 1.4, levelOffset: 18, boss: true }]) {
  const es = buildEnemies(p, { count: d.boss ? 1 : 2, boss: !!d.boss, levelOffset: d.levelOffset, reincarnation: 2, mult: d.mult })
  console.log(`mult=${d.mult} boss=${!!d.boss} n=${es.length} →`, es.map(e => `${e.name}(lv${e.level}) atk${e.atk} def${e.def} hp${e.maxHp} crit${e.crit.toFixed(2)} dodge${e.dodge.toFixed(2)}`).join(' | '))
}
