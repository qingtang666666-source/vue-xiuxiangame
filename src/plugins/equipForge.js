// 炼器强化 —— 消耗 / 成功率 / 成功增强 / 失败回退，供背包与炼器面板复用
import { manorEnhanceBonus } from './manor.js'
import { sumStatAffixes } from './affix.js'
import equip from './equip.js'
import { scoreTierBoost } from './equip.js'
import { applyPlayerAttribute } from './playerAttr.js'
import { gradeNames } from './game.js'

// 炼器消耗（炼器石）
export const enhanceCost = (player, item, { protect = false, increase = false } = {}) => {
  const baseCost = item.level * 5
  const incrementPerLevel = item.strengthen * 50
  const { costDiscount } = manorEnhanceBonus(player)
  return Math.max(1, Math.floor((baseCost + incrementPerLevel) * (protect ? 10 : 1) * (increase ? 5 : 1) * (1 - costDiscount)))
}

// 炼器成功率
export const enhanceSuccessRate = (player, item, { increase = false } = {}) => {
  const { successBonus } = manorEnhanceBonus(player)
  const s = item.strengthen || 0
  // 分段陡降：0~10 (95%→52%)；10~30 (50%×0.7^n → +30 ≈0.04%)，+30 上限被钳到 <0.1%
  let c = s <= 10 ? 0.95 - s * 0.043 : 0.5 * Math.pow(0.7, s - 10)
  c += successBonus + (increase ? 0.08 : 0)
  return Math.max(0.0006, Math.min(0.99, c))
}

// 成功时：词条按 0.2 比例增强，累加到装备并从 player 面板同步
const applyAffixBoost = (item, player) => {
  if (!item || !Array.isArray(item.affixes)) return
  let addAttack = 0
  let addDefense = 0
  let addHealth = 0
  let addCritical = 0
  let addDodge = 0
  item.affixes.forEach(affix => {
    if (affix.type !== 'stat') return
    const boost = affix.value * 0.2
    switch (affix.stat) {
      case 'attack':
        addAttack += boost
        break
      case 'defense':
        addDefense += boost
        break
      case 'health':
        addHealth += boost
        break
      case 'critical':
        addCritical += boost
        break
      case 'dodge':
        addDodge += boost
        break
    }
  })
  item.attack = (item.attack || 0) + Math.floor(addAttack)
  item.defense = (item.defense || 0) + Math.floor(addDefense)
  item.health = (item.health || 0) + Math.floor(addHealth)
  item.critical = (item.critical || 0) + addCritical
  item.dodge = (item.dodge || 0) + addDodge
  applyPlayerAttribute(player, addDodge, Math.floor(addAttack), Math.floor(addHealth), addCritical, Math.floor(addDefense))
}

// 执行一次炼器：roll 为 0..1 判定值，返回结构化结果供 UI 通知
// 返回：{ status: 'success'|'fail'|'max', gradeUp, gradeName, drop }
// 强化累计加成系数：0.08/级 + 0.02 递增，后期每级加成极高
const cumFactor = s => (s <= 0 ? 0 : 0.08 * s + 0.02 * s * (s + 1) / 2)
const baseStats = item => {
  const a = sumStatAffixes(item.affixes)
  return {
    attack: (item.initial?.attack || 0) + (a.attack || 0),
    health: (item.initial?.health || 0) + (a.health || 0),
    defense: (item.initial?.defense || 0) + (a.defense || 0)
  }
}
const enhanceBonusFor = (item, s) => {
  const f = cumFactor(s)
  const b = baseStats(item)
  switch (item.type) {
    case 'weapon': return { attack: Math.floor(b.attack * f), health: 0, defense: 0 }
    case 'armor': return { attack: 0, health: Math.floor(b.health * f), defense: Math.floor(b.defense * f) }
    default: return { attack: Math.floor(b.attack * f), health: Math.floor(b.health * f), defense: Math.floor(b.defense * f) }
  }
}
const syncStrengthen = (item, player, s, broken) => {
  const bonus = broken ? { attack: 0, health: 0, defense: 0 } : enhanceBonusFor(item, s)
  const dA = bonus.attack - (item.attack || 0)
  const dH = bonus.health - (item.health || 0)
  const dD = bonus.defense - (item.defense || 0)
  applyPlayerAttribute(player, 0, dA, dH, 0, dD)
  item.attack = bonus.attack
  item.health = bonus.health
  item.defense = bonus.defense
  item.score = equip.calculateEquipmentScore(item.dodge, item.attack, item.health, item.critical, item.defense, scoreTierBoost(item.quality))
}

export const enhanceRepairCost = (player, item) => ({
  money: Math.floor((item.level || 1) * 6 + (item.strengthen || 0) * 90),
  stone: Math.max(1, Math.floor((item.strengthen || 0) / 4))
})

export const repairEnhancement = (player, item) => {
  if (!item.broken) return { ok: false, reason: '装备未受损' }
  const c = enhanceRepairCost(player, item)
  if ((player.props?.money || 0) < c.money) return { ok: false, reason: '灵石不足' }
  if ((player.props?.strengtheningStone || 0) < c.stone) return { ok: false, reason: '炼器石不足' }
  player.props.money = (player.props.money || 0) - c.money
  player.props.strengtheningStone = (player.props.strengtheningStone || 0) - c.stone
  item.broken = false
  syncStrengthen(item, player, item.strengthen || 0, false)
  return { ok: true, cost: c }
}

export const resolveEnhancement = (player, item, { protect = false, increase = false, roll = Math.random() } = {}) => {
  if ((item.strengthen || 0) >= 30) return { status: 'max' }
  const s = item.strengthen || 0
  if (roll <= enhanceSuccessRate(player, item, { increase })) {
    item.strengthen = s + 1
    syncStrengthen(item, player, s + 1, false)
    const prevGrade = item.grade || 1
    const newGrade = Math.min(5, 1 + Math.floor(item.strengthen / 5))
    item.grade = newGrade
    item.gradeName = gradeNames[newGrade - 1]
    return { status: 'success', gradeUp: newGrade > prevGrade, gradeName: item.gradeName }
  }
  if (s >= 10) {
    item.broken = true
    syncStrengthen(item, player, s, true)
    return { status: 'fail', broke: true }
  }
  return { status: 'fail', broke: false }
  // 判定成功
  if (roll <= enhanceSuccessRate(player, item, { increase })) {
    const attack = Math.floor((item.initial?.attack || 0) * 0.2)
    const health = Math.floor((item.initial?.health || 0) * 0.2)
    const defense = Math.floor((item.initial?.defense || 0) * 0.2)
    switch (item.type) {
      case 'weapon':
        item.attack += attack
        applyPlayerAttribute(player, 0, attack, 0, 0, 0)
        break
      case 'armor':
        item.health += health
        item.defense += defense
        applyPlayerAttribute(player, 0, 0, health, 0, defense)
        break
      case 'accessory':
      case 'sutra':
        item.attack += attack
        item.health += health
        item.defense += defense
        applyPlayerAttribute(player, 0, attack, health, 0, defense)
        break
      default:
        break
    }
    item.strengthen = (item.strengthen || 0) + 1
    applyAffixBoost(item, player)
    const prevGrade = item.grade || 1
    const newGrade = Math.min(5, 1 + Math.floor(item.strengthen / 5))
    let gradeUp = false
    if (newGrade > prevGrade) {
      item.grade = newGrade
      item.gradeName = gradeNames[newGrade - 1]
      gradeUp = true
    }
    item.score = equip.calculateEquipmentScore(item.dodge, item.attack, item.health, item.critical, item.defense)
    return { status: 'success', gradeUp, gradeName: item.gradeName }
  }
  // 失败：>=15 且未开保护 → 精确回退 +0
  if ((item.strengthen || 0) >= 15 && !protect) {
    const statSum = sumStatAffixes(item.affixes)
    const newDodge = (item.initial?.dodge || 0) + (statSum.dodge || 0)
    const newAttack = (item.initial?.attack || 0) + (statSum.attack || 0)
    const newHealth = (item.initial?.health || 0) + (statSum.health || 0)
    const newDefense = (item.initial?.defense || 0) + (statSum.defense || 0)
    const newCritical = (item.initial?.critical || 0) + (statSum.critical || 0)
    applyPlayerAttribute(player, -item.dodge, -item.attack, -item.health, -item.critical, -item.defense)
    item.dodge = newDodge
    item.attack = newAttack
    item.health = newHealth
    item.defense = newDefense
    item.critical = newCritical
    item.strengthen = 0
    applyPlayerAttribute(player, newDodge, newAttack, newHealth, newCritical, newDefense)
    item.score = equip.calculateEquipmentScore(newDodge, newAttack, newHealth, newCritical, newDefense)
    return { status: 'fail', drop: true }
  }
  return { status: 'fail', drop: false }
}
