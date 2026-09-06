// 装备词条洗练 / 附魔
//
// 洗练：重掷装备词条，只替换「词条」部分的属性贡献，
//       保留基础属性与既有的强化（炼器）数值，避免破坏已有数值模型。
// 附魔：追加一条尚不存在的随机词条，具词条数量上限。
// 两者均返回 statDelta（对玩家面板的净增量），由调用方在「已穿戴」时同步面板。

import { STAT_AFFIXES, EFFECT_AFFIXES, rollAffixes, rollStatValue, sumStatAffixes, affixQualityMultiplier } from './affix.js'
import equip from './equip.js'

const qualityMult = item => affixQualityMultiplier[item.quality] || 1

const snap = item => ({
  dodge: item.dodge || 0,
  attack: item.attack || 0,
  health: item.health || 0,
  defense: item.defense || 0,
  critical: item.critical || 0
})

const delta = (before, after) => ({
  dodge: after.dodge - before.dodge,
  attack: after.attack - before.attack,
  health: after.health - before.health,
  defense: after.defense - before.defense,
  critical: after.critical - before.critical
})

// 洗练花费（受品质、等级影响）
export const rerollCost = item => ({
  money: Math.floor((item.level || 1) * 50 * qualityMult(item)),
  stone: Math.floor((item.level || 1) * 2 * qualityMult(item))
})

// 附魔花费
export const enchantCost = item => ({
  money: Math.floor((item.level || 1) * 100 * qualityMult(item)),
  stone: Math.floor((item.level || 1) * 4 * qualityMult(item)),
  dan: Math.max(1, Math.floor((item.level || 1) * 0.5 * qualityMult(item)))
})

export const canAfford = (player, cost) => {
  const p = player.props || {}
  if ((p.money || 0) < cost.money) return false
  if ((p.strengtheningStone || 0) < cost.stone) return false
  if (cost.dan && (p.cultivateDan || 0) < cost.dan) return false
  return true
}

export const payCost = (player, cost) => {
  const p = player.props || {}
  p.money = (p.money || 0) - cost.money
  p.strengtheningStone = (p.strengtheningStone || 0) - cost.stone
  if (cost.dan) p.cultivateDan = (p.cultivateDan || 0) - cost.dan
}

// 词条数量上限：品质基础数量 + 2
export const affixCap = item => (affixQualityMultiplier[item.quality] || 1) + 2

// 仅替换词条贡献，保留基础 + 强化
const reapply = (item, newAffixes, beforeStatSum) => {
  const cur = snap(item)
  const ns = sumStatAffixes(newAffixes)
  item.attack = Math.round(cur.attack - Math.floor(beforeStatSum.attack) + Math.floor(ns.attack))
  item.health = Math.round(cur.health - Math.floor(beforeStatSum.health) + Math.floor(ns.health))
  item.defense = Math.round(cur.defense - Math.floor(beforeStatSum.defense) + Math.floor(ns.defense))
  item.critical = cur.critical - beforeStatSum.critical + ns.critical
  item.dodge = cur.dodge - beforeStatSum.dodge + ns.dodge
  item.affixes = newAffixes
  item.score = equip.calculateEquipmentScore(item.dodge, item.attack, item.health, item.critical, item.defense)
  return item
}

// 洗练：重掷词条
export const rerollItemAffixes = item => {
  if (!item || !Array.isArray(item.affixes)) return { ok: false, reason: '该装备无词条可洗' }
  const before = snap(item)
  const beforeStatSum = sumStatAffixes(item.affixes)
  const affixes = rollAffixes(item.level, item.quality)
  reapply(item, affixes, beforeStatSum)
  return { ok: true, delta: delta(before, snap(item)), affixes }
}

// 附魔：追加一条不重复词条
export const enchantItemAffix = item => {
  if (!item || !Array.isArray(item.affixes)) return { ok: false, reason: '该装备无词条对象' }
  if (item.affixes.length >= affixCap(item)) return { ok: false, reason: '词条数量已达上限' }
  const used = new Set(item.affixes.map(a => a.key))
  const pool = [...STAT_AFFIXES, ...EFFECT_AFFIXES].filter(d => !used.has(d.key))
  if (!pool.length) return { ok: false, reason: '词条种类已集齐，无法再附魔' }
  const def = pool[Math.floor(Math.random() * pool.length)]
  const newAffix =
    def.type === 'stat'
      ? { type: 'stat', key: def.key, name: def.name, value: rollStatValue(def.stat, item.level, item.quality) }
      : { type: 'effect', key: def.key, name: def.name, triggerChance: def.triggerChance, cooldown: def.cooldown, desc: def.desc }
  const before = snap(item)
  const beforeStatSum = sumStatAffixes(item.affixes)
  reapply(item, [...item.affixes, newAffix], beforeStatSum)
  return { ok: true, delta: delta(before, snap(item)), newAffix }
}
