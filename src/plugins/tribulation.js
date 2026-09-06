// 天劫系统 —— 参考凡人修仙传：关键境界节点渡劫方可突破
//
// 天劫分两类：雷劫(战力判定)、心魔劫(心境判定)。渡劫成功得永久劫后加成，
// 失败有反噬(损失修为/气血)，可重试。已渡过的不再触发。

import { effectivePlayerStats, equippedExtras } from './setBonus.js'

export const TRIBULATIONS = [
  { lv: 19, name: '金丹天劫', kind: 'thunder', bonus: { attack: 200, health: 800 }, penalty: '雷火噬身' },
  { lv: 37, name: '化神心魔劫', kind: 'heart', bonus: { critical: 0.03, dodge: 0.03 }, penalty: '心魔反噬' },
  { lv: 55, name: '合体天雷劫', kind: 'thunder', bonus: { attack: 600, health: 2500 }, penalty: '天雷轰体' },
  { lv: 73, name: '渡劫飞升劫', kind: 'heart', bonus: { cultivationSpeed: 0.2 }, penalty: '道心破碎' },
  { lv: 82, name: '真仙雷劫', kind: 'thunder', bonus: { attack: 1500, defense: 800 }, penalty: '仙雷加身' },
  { lv: 100, name: '金仙心魔劫', kind: 'heart', bonus: { critical: 0.08, dodge: 0.05 }, penalty: '金身染尘' },
  { lv: 118, name: '太乙大天劫', kind: 'thunder', bonus: { attack: 4000, health: 12000, cultivationSpeed: 0.1 }, penalty: '太乙雷落' },
  { lv: 136, name: '混元道祖劫', kind: 'heart', bonus: { attack: 8000, defense: 5000, cultivationSpeed: 0.2, critical: 0.1 }, penalty: '道基动摇' }
]

export const tribulationOf = lv => TRIBULATIONS.find(t => t.lv === lv)
export const isTribulationLevel = lv => !!tribulationOf(lv)

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

const playerPower = player => {
  const eff = effectivePlayerStats(player)
  return eff.attack * 3 + eff.defense + eff.maxHealth * 0.1 + (player.level || 0) * 8
}

// 渡劫：kind 决定判定方式
export const conductTribulation = player => {
  const lv = player.level + 1
  const t = tribulationOf(lv)
  if (!t) return { ok: false, reason: '当前无需渡劫' }
  if ((player.passedTribulation || []).includes(lv)) return { ok: false, reason: '已渡此劫' }
  const pp = playerPower(player)
  const power = t.lv * 60
  let chance
  const br = equippedExtras(player).breakthroughRate || 0
  if (t.kind === 'heart') {
    // 心魔劫：侧重心境(暴击/闪避/道心)
    chance = clamp(0.5 + (player.critical || 0) * 4 + (player.dodge || 0) * 2 - t.lv * 0.001 + br, 0.2, 0.95)
  } else {
    chance = clamp(pp / (pp + power) + br, 0.2, 0.97)
  }
  if (Math.random() < chance) {
    if (!player.passedTribulation) player.passedTribulation = []
    player.passedTribulation.push(lv)
    applyBonus(player, t.bonus)
    return { ok: true, name: t.name, bonus: t.bonus }
  }
  // 反噬：损失修为与气血
  const cultLost = Math.floor((player.cultivation || 0) * 0.15)
  const hpLost = Math.floor((player.health || 0) * 0.2)
  player.cultivation = (player.cultivation || 0) - cultLost
  player.health = Math.max(1, (player.health || 1) - hpLost)
  return { ok: false, reason: `${t.penalty}，修为受损，可再试`, cultLost, hpLost }
}

const applyBonus = (player, bonus) => {
  if (bonus.attack) player.attack = (player.attack || 0) + bonus.attack
  if (bonus.defense) player.defense = (player.defense || 0) + bonus.defense
  if (bonus.health) {
    player.maxHealth = (player.maxHealth || 0) + bonus.health
    player.health = (player.health || 0) + bonus.health
  }
  if (bonus.critical) player.critical = (player.critical || 0) + bonus.critical
  if (bonus.dodge) player.dodge = (player.dodge || 0) + bonus.dodge
  if (bonus.cultivationSpeed) player.cultivationSpeed = (player.cultivationSpeed || 1) + bonus.cultivationSpeed
}
