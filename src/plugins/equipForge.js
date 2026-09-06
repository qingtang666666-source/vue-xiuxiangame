// 炼器强化 —— 消耗 / 成功率 / 成功增强 / 失败回退，供背包与炼器面板复用
import { manorEnhanceBonus } from './manor.js'
import { sumStatAffixes } from './affix.js'
import equip from './equip.js'
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
  return Math.min(0.99, 1 - (item.strengthen * 0.03 - (increase ? 0.1 : 0)) + successBonus)
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
export const resolveEnhancement = (player, item, { protect = false, increase = false, roll = Math.random() } = {}) => {
  if ((item.strengthen || 0) >= 30) return { status: 'max' }
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
