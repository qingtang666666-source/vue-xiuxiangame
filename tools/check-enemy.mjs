import { towerFloorEnemy, towerReward, ladderEnemies, worldBossEnemy, exploreEnemy, anchorPower } from '@/plugins/enemyScale.js'
import { playerPowerScore } from '@/plugins/breakthroughGate.js'
import { effectivePlayerStats } from '@/plugins/setBonus.js'

// 造一个“像样”的玩家：不同等级给一套与境界标准相称的基础属性
const mk = (level, gear = 1) => {
  const base = Math.floor(200 * level * level * 0.35)
  return {
    level, name: '测试', reincarnation: 0,
    attack: Math.floor(600 * level * gear), defense: Math.floor(200 * level * gear),
    health: 99999999, maxHealth: Math.floor(60000 * level * gear),
    critical: 0.2, dodge: 0.1, pointAlloc: {}, props: {}, inventory: [], equipment: {}, methods: {}, pills: [], buffs: [], formations: {}, skills: {}
  }
}
for (const lv of [10, 30, 60, 90, 144]) {
  const p = mk(lv)
  const score = playerPowerScore(p)
  console.log(`\n玩家 lv${lv} 战力 ${score.toLocaleString()}  攻${p.attack} 血${p.maxHealth}`)
  for (const f of [1, 5, 10, 20, 40]) {
    const e = towerFloorEnemy(f, p)
    console.log(`  塔F${String(f).padStart(2)} 战力${e.power.toLocaleString().padStart(12)} (${(e.power / score * 100).toFixed(0)}%) 攻${String(e.attack).padStart(9)} 血${String(e.health).padStart(10)}`)
  }
  const boss = worldBossEnemy(p, { reincarnation: 1 })
  console.log(`  世界BOSS 战力${boss.power.toLocaleString()} (${(boss.power / score).toFixed(2)}x) 攻${boss.attack} 血${boss.health} 暴${boss.critical.toFixed(2)} 闪${boss.dodge.toFixed(2)}`)
  const lad = ladderEnemies(p, { count: 2, mult: 1.4 })
  console.log(`  历战·凶险×2 每只战力${lad[0].power.toLocaleString()} (${(lad[0].power / score).toFixed(2)}x/只)`)
  console.log('  探索(区3):', JSON.stringify(exploreEnemy(p, lv, 3).power))
}
console.log('\n塔奖励: F1', JSON.stringify(towerReward(1, mk(10))), 'F50', JSON.stringify(towerReward(50, mk(90))), 'F120', JSON.stringify(towerReward(120, mk(144))))
