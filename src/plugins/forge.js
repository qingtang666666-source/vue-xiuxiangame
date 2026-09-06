// 炼器系统 —— 自选配方打一套趁手的神兵
//
// 与炼丹的广度思路一致，但炼器是「确定性打造」：可自定义
//   装备类型(神兵/护甲/灵宝/法器) × 品阶(11) × 细分级(下品~绝品) × 等级 × 指定词条 × 精炼
// 炼制出的装备直接复用 equip.js 的基础属性与 affix.js 的词条/特效体系，
// 可穿戴、可强化、可分解，与野外掉落完全互通。

import { gradeMultiplier, gradeNames, levelNames } from './game.js'
import {
  rollAffixes,
  sumStatAffixes,
  rollStatValue,
  STAT_AFFIXES,
  EFFECT_AFFIXES
} from './affix.js'
import equip from './equip.js'
import { manorEnhanceBonus } from './manor.js'
import { bumpCraftRank, TIER_CRAFT_SUCCESS } from './craft.js'
import { pickSetForQuality, pieceName } from './equipSetDb.js'
import { equippedExtras } from './setBonus.js'
import { tierMaterial, matNameOf } from './materialDb.js'

export const FORGE_TYPES = [
  { key: 'weapon', name: '神兵', desc: '主攻击，可在武器/灵宝/法器槽位' },
  { key: 'armor', name: '护甲', desc: '主防御与气血' },
  { key: 'accessory', name: '灵宝', desc: '攻防血兼修' },
  { key: 'sutra', name: '法器', desc: '攻防血兼修' }
]

// 11 品阶，含解锁所需境界
export const FORGE_QUALITIES = [
  { key: 'info', name: '黄阶', minLevel: 1, materialMult: 1 },
  { key: 'success', name: '玄阶', minLevel: 6, materialMult: 1.4 },
  { key: 'primary', name: '地阶', minLevel: 12, materialMult: 2 },
  { key: 'purple', name: '天阶', minLevel: 20, materialMult: 2.8 },
  { key: 'pink', name: '仙阶', minLevel: 28, materialMult: 4 },
  { key: 'warning', name: '帝阶', minLevel: 36, materialMult: 5.6 },
  { key: 'danger', name: '神阶', minLevel: 45, materialMult: 8 },
  { key: 'cyan', name: '灵阶', minLevel: 55, materialMult: 11 },
  { key: 'orange', name: '皇阶', minLevel: 70, materialMult: 15 },
  { key: 'gold', name: '圣阶', minLevel: 90, materialMult: 21 },
  { key: 'legendary', name: '道阶', minLevel: 110, materialMult: 30 }
]

const QUALITY_MULTIPLIER = {
  info: 1.2,
  success: 2,
  primary: 3.2,
  purple: 5,
  pink: 6.5,
  warning: 8.5,
  danger: 11,
  cyan: 14,
  orange: 18,
  gold: 23,
  legendary: 30
}

// 炼器产物命名池：结合品阶名，产出「道阶·开天」之类的名字
const NAME_POOL = {
  weapon: ['青锋', '赤霄', '破军', '紫电', '碧波', '烈焰', '寒霜', '雷光', '龙吟', '风影'],
  armor: ['玄甲', '宝衣', '战袍', '云裳', '金鳞', '玉衣', '龙铠', '凤羽', '锦袍', '道袍'],
  accessory: ['玉佩', '宝珠', '灵链', '仙镯', '项链', '坠子', '指环', '手环', '耳坠', '佩环'],
  sutra: ['法宝', '灵镜', '宝塔', '葫芦', '灵珠', '法杖', '印玺', '琴箫', '幡旗', '炉鼎']
}

export const forgeType = key => FORGE_TYPES.find(t => t.key === key)
export const forgeQuality = key => FORGE_QUALITIES.find(q => q.key === key)

// 计算炼器花费（会受洞府炼器炉降耗影响）
export const forgeCost = ({ type, quality, grade, level, affixChoice, refine }, player) => {
  const q = forgeQuality(quality)
  const base = (q?.materialMult || 1)
  const gi = Math.min(5, Math.max(1, grade || 3))
  const gradeBonus = 1 + (gi - 1) * 0.3
  const qi = Math.max(0, FORGE_QUALITIES.findIndex(x => x.key === quality))
  const mat = tierMaterial(['矿材', '精萃', '矿石'], Math.max(1, qi + 1))
  let stone = Math.floor(level * 2 * base * gradeBonus)
  let money = Math.floor(level * 50 * base * gradeBonus)
  let herb = Math.floor(level * 1 * base * gradeBonus)
  let dan = q?.minLevel >= 28 ? Math.floor(level * 0.25 * base * gradeBonus) : 0
  if (affixChoice) {
    stone += Math.floor(level * 2 * base)
    money += Math.floor(level * 40 * base)
  }
  if (refine) {
    stone += Math.floor(level * 3 * base)
    money += Math.floor(level * 60 * base)
    herb += Math.floor(level * 1 * base)
  }
  // 洞府炼器炉降低消耗
  const discount = manorEnhanceBonus(player).costDiscount || 0
  const m = 1 - discount
  return {
    stone: Math.max(0, Math.floor(stone * m)),
    money: Math.max(0, Math.floor(money * m)),
    herb: Math.max(0, Math.floor(herb * m)),
    dan: Math.max(0, Math.floor(dan * m)),
    material: mat ? { key: mat.key, qty: Math.max(1, Math.ceil((qi + 1) / 2)) } : null
  }
}

// 校验能否炼制
export const canForge = (player, opts) => {
  const q = forgeQuality(opts.quality)
  if (!q) return { ok: false, reason: '未知品阶' }
  if (opts.level > player.level + 2 && !player.reincarnation) return { ok: false, reason: `炼器等级不足（最多可越 2 级，需 ${opts.level - 2} 级）` }
  if (player.level < q.minLevel - 2) return { ok: false, reason: `该品阶需达到 ${levelNames(Math.max(1, q.minLevel - 2))}（可越 2 级）` }
  const cost = forgeCost(opts, player)
  const props = player.props || {}
  if ((props.strengtheningStone || 0) < cost.stone) return { ok: false, reason: '炼器石不足' }
  if ((props.money || 0) < cost.money) return { ok: false, reason: '灵石不足' }
  if ((props.spiritHerb || 0) < cost.herb) return { ok: false, reason: '灵草不足' }
  if ((props.cultivateDan || 0) < cost.dan) return { ok: false, reason: '培养丹不足' }
  if (cost.material && cost.material.key && (props[cost.material.key] || 0) < cost.material.qty) return { ok: false, reason: `缺少核心材料【${matNameOf(cost.material.key)}】` }
  return { ok: true, cost }
}

// 生成一件装备（类型/品阶/细分级/等级/词条可控），并复用词条与特效体系
const buildEquipment = ({ type, quality, grade, level, affixChoice, refine }) => {
  const gi = Math.min(5, Math.max(1, grade || 3))
  const baseMultiplier = (QUALITY_MULTIPLIER[quality] || 1) * (gradeMultiplier[gi - 1] || 1)
  const dodge = ['accessory', 'sutra'].includes(type) ? equip.equip_Criticalhitrate() : 0
  const crit = ['weapon', 'accessory', 'sutra'].includes(type) ? equip.equip_Criticalhitrate() : 0
  const attack = ['weapon', 'accessory', 'sutra'].includes(type)
    ? Math.floor(equip.equip_Attack(level) * baseMultiplier)
    : 0
  const health = ['armor', 'accessory', 'sutra'].includes(type) ? Math.floor(equip.equip_Health(level) * baseMultiplier) : 0
  const defense = ['armor', 'accessory', 'sutra'].includes(type) ? Math.floor(equip.equip_Attack(level) * baseMultiplier) : 0

  let affixes = rollAffixes(level, quality)
  if (affixChoice) affixes = ensureAffix(affixes, affixChoice, level, quality)
  if (refine) affixes = dedupeAffixes([...rollAffixes(level, quality), ...affixes])
  const statSum = sumStatAffixes(affixes)

  const name = `${forgeQuality(quality).name}·${NAME_POOL[type][Math.floor(Math.random() * NAME_POOL[type].length)]}`
  const set = pickSetForQuality(quality, Math.floor(Math.random() * 100000))
  const eName = set ? pieceName(set, type, Math.floor(Math.random() * 100000)) : name
  const finalAttack = attack + Math.floor(statSum.attack)
  const finalHealth = health + Math.floor(statSum.health)
  const finalDefense = defense + Math.floor(statSum.defense)
  const finalCritical = crit + statSum.critical
  const finalDodge = dodge + statSum.dodge

  return {
    id: Date.now() + Math.floor(Math.random() * 100000),
    name: eName,
    type,
    lock: false,
    level,
    quality,
    setId: set ? set.id : null,
    setName: set ? set.name : null,
    grade: gi,
    gradeName: gradeNames[gi - 1],
    initial: { dodge, attack, health, defense, critical: crit },
    dodge: finalDodge,
    attack: finalAttack,
    health: finalHealth,
    defense: finalDefense,
    critical: finalCritical,
    affixes,
    strengthen: 0,
    score: equip.calculateEquipmentScore(finalDodge, finalAttack, finalHealth, finalCritical, finalDefense)
  }
}

// GM：无消耗直接构造任意装备（type/quality/grade/level/strengthen/指定词条）
export const forgeBuild = opts => {
  const eq = buildEquipment(opts)
  const s = Math.max(0, Math.min(30, opts.strengthen || 0))
  if (s > 0) {
    eq.attack = (eq.attack || 0) + Math.floor(eq.initial.attack * 0.2) * s
    eq.health = (eq.health || 0) + Math.floor(eq.initial.health * 0.2) * s
    eq.defense = (eq.defense || 0) + Math.floor(eq.initial.defense * 0.2) * s
    eq.strengthen = s
  }
  return eq
}

const ensureAffix = (affixes, key, level, quality) => {
  if (affixes.some(a => a.key === key)) return affixes
  const def = [...STAT_AFFIXES, ...EFFECT_AFFIXES].find(d => d.key === key)
  if (!def) return affixes
  const newAffix =
    def.type === 'stat'
      ? { type: 'stat', key: def.key, name: def.name, value: rollStatValue(def.stat, level, quality) }
      : { type: 'effect', key: def.key, name: def.name, triggerChance: def.triggerChance, cooldown: def.cooldown, desc: def.desc }
  return [newAffix, ...affixes]
}

const dedupeAffixes = affixes => {
  const seen = new Set()
  return affixes.filter(a => {
    if (seen.has(a.key)) return false
    seen.add(a.key)
    return true
  })
}

// 炼制入口：扣材料，产出装备放入背包
export const craftEquipment = (player, opts) => {
  const check = canForge(player, opts)
  if (!check.ok) return { ok: false, reason: check.reason }
  const cost = check.cost
  const props = player.props || {}
  props.strengtheningStone -= cost.stone
  props.money -= cost.money
  props.spiritHerb -= cost.herb
  props.cultivateDan -= cost.dan
  if (cost.material && cost.material.key) props[cost.material.key] = (props[cost.material.key] || 0) - cost.material.qty
  const qi = FORGE_QUALITIES.findIndex(q => q.key === opts.quality)
  // 成功率：品阶越高越低，保底约 5 成；词条「炼器成功率」加成
  const base = TIER_CRAFT_SUCCESS[Math.max(0, Math.min(10, qi))] || 0.4
  const chance = Math.min(0.98, Math.max(0.4, base + (equippedExtras(player).forgeRate || 0)))
  if (Math.random() > chance) {
    props.strengtheningStone += Math.floor(cost.stone / 2)
    props.money += Math.floor(cost.money / 2)
    props.spiritHerb += Math.floor(cost.herb / 2)
    props.cultivateDan += Math.floor(cost.dan / 2)
    return { ok: false, reason: '炼器失败，损耗一半材料' }
  }
  const equipment = buildEquipment(opts)
  if (!player.inventory) player.inventory = []
  player.inventory.push(equipment)
  bumpCraftRank(player, 'forge', qi + 1)
  return { ok: true, equipment }
}
