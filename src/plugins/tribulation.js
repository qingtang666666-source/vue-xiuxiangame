// 天劫系统 —— 关键境界节点渡劫方可突破
// 雷劫按“突破境界”施加雷威伤害，抗住(存活)则成功，反之失败并进入冷却。
import { equippedExtras } from './setBonus'
import { playerPowerScore, tribulationPowerNeed, TRIBULATION_CD_FAIL, initGateState } from './breakthroughGate'
import { realmStageOf } from './game'

export const TRIBULATIONS = [
  { lv: 19, name: '金丹天劫', kind: 'thunder', bonus: { attack: 200, health: 800 }, penalty: '雷火噬身' },
  { lv: 37, name: '化神心魔劫', kind: 'heart', bonus: { critical: 0.03, dodge: 0.03 }, penalty: '心魔反噬' },
  { lv: 55, name: '合体天雷劫', kind: 'thunder', bonus: { attack: 600, health: 2500 }, penalty: '天雷贯体' },
  { lv: 73, name: '渡劫飞升劫', kind: 'heart', bonus: { cultivationSpeed: 0.2 }, penalty: '道心破碎' },
  { lv: 82, name: '真仙雷劫', kind: 'thunder', bonus: { attack: 1500, defense: 800 }, penalty: '仙雷加身' },
  { lv: 100, name: '金仙心魔劫', kind: 'heart', bonus: { critical: 0.08, dodge: 0.05 }, penalty: '金身染尘' },
  { lv: 118, name: '太乙大天劫', kind: 'thunder', bonus: { attack: 4000, health: 12000, cultivationSpeed: 0.1 }, penalty: '太乙雷落' },
  { lv: 136, name: '混元道祖劫', kind: 'heart', bonus: { attack: 8000, defense: 5000, cultivationSpeed: 0.2, critical: 0.1 }, penalty: '道基动摇' }
]

export const tribulationOf = lv => TRIBULATIONS.find(t => t.lv === lv)
export const isTribulationLevel = lv => !!tribulationOf(lv)

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

// 雷劫伤害：按突破境界(大阶段)递增的“最大气血百分比”，可被防御削减
const thunderDamage = (player, lv) => {
  const stage = realmStageOf(lv)
  const hp = Math.max(1000, player.maxHealth || 1000)
  const pct = Math.min(1.2, 0.3 + stage * 0.055)
  const defMit = Math.min(0.6, (player.defense || 0) / (hp * 0.08 + 1))
  return { dmg: Math.max(1, Math.floor(hp * pct * (1 - defMit))), pct: pct * (1 - defMit), defMit }
}

// 渡劫：抗住雷威则成功，否则失败并进入冷却
export const conductTribulation = player => {
  initGateState(player)
  const lv = player.level + 1
  const t = tribulationOf(lv)
  if (!t) return { ok: false, reason: '当前无需渡劫' }
  if ((player.passedTribulation || []).includes(lv)) return { ok: false, reason: '已渡此劫' }

  const cd = player.tribulationCdUntil || 0
  if (Date.now() < cd) {
    const sec = Math.max(1, Math.ceil((cd - Date.now()) / 1000))
    return { ok: false, reason: `渡劫失败冷却中，还需 ${sec} 秒`, cd: true }
  }

  // 战力门槛（仍保留：威压过盛无资格渡劫）
  const power = playerPowerScore(player)
  const needPower = tribulationPowerNeed(lv)
  if (power < needPower) {
    return failTribulation(player, `${t.penalty}·威压过盛，需战力 ${needPower.toLocaleString('zh-CN')} 方可渡劫（当前 ${power.toLocaleString('zh-CN')}）`)
  }

  const { dmg, pct } = thunderDamage(player, lv)
  player.health -= dmg
  if (player.health > 0) {
    if (!player.passedTribulation) player.passedTribulation = []
    player.passedTribulation.push(lv)
    applyBonus(player, t.bonus)
    return { ok: true, name: t.name, bonus: t.bonus, dmg }
  }
  player.health = Math.max(1, player.health)
  return failTribulation(player, `${t.penalty}！雷劫造成 ${dmg} 点伤害（${(pct * 100).toFixed(0)}%），未能抗住，渡劫失败`, dmg)
}

const failTribulation = (player, reason, dmg = 0) => {
  const cultLost = Math.floor((player.cultivation || 0) * 0.15)
  player.cultivation = (player.cultivation || 0) - cultLost
  player.health = Math.max(1, (player.health || 1))
  player.tribulationCdUntil = Date.now() + TRIBULATION_CD_FAIL
  return { ok: false, reason, cd: true, cultLost, dmg }
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
