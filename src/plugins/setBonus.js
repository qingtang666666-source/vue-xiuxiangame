// 装备套装效果 —— 穿戴同品阶装备达到 2/3/4 件时触发递增加成
//
// 加成在「穿戴组合」上实时计算，不写入基础属性，避免穿脱装备导致重复/漏加。
// 战斗/挂机通过 effectivePlayerStats / idleRates 取最终值，套装加成自然生效。
// 4 件套额外提升特效触发率(effectBoost)与修炼速度。

import { buffStats } from './buffs.js'
import { formationStats } from './formation.js'
import { skillStats } from './npcSystem.js'
import { sectStats } from './sect.js'
import { aptitudeStats } from './aptitude.js'
import { methodStats } from './technique.js'
import { realmBonus } from './ascension.js'
import { rebirthStats } from './rebirth.js'
import { natalArtifactStats } from './natalArtifact.js'
import { setById, setBonusOf } from './equipSetDb.js'

const SET_QUALITY_INDEX = {
  info: 0,
  success: 1,
  primary: 2,
  purple: 3,
  pink: 4,
  warning: 5,
  danger: 6,
  cyan: 7,
  orange: 8,
  gold: 9,
  legendary: 10
}

export const SET_QUALITY_NAMES = {
  info: '黄阶',
  success: '玄阶',
  primary: '地阶',
  purple: '天阶',
  pink: '仙阶',
  warning: '帝阶',
  danger: '神阶',
  cyan: '灵阶',
  orange: '皇阶',
  gold: '圣阶',
  legendary: '道阶'
}

// 统计当前穿戴装备按品阶的数量
export const equippedCountByQuality = player => {
  const counts = {}
  Object.values(player?.equipment || {}).forEach(slot => {
    if (slot && slot.quality) counts[slot.quality] = (counts[slot.quality] || 0) + 1
  })
  return counts
}

// 汇总所有生效的套装加成
export const setStats = player => {
  const counts = equippedCountByQuality(player)
  const acc = { attack: 0, defense: 0, health: 0, critical: 0, dodge: 0, cultivationSpeed: 0, effectBoost: 0 }
  Object.entries(counts).forEach(([quality, n]) => {
    if (n < 2) return
    const qi = SET_QUALITY_INDEX[quality]
    if (qi == null) return
    const s = 1 + qi * 0.7
    if (n >= 2) {
      acc.attack += Math.round(6 * s)
      acc.defense += Math.round(5 * s)
      acc.critical += 0.005 * s
      acc.dodge += 0.005 * s
    }
    if (n >= 3) {
      acc.attack += Math.round(12 * s)
      acc.defense += Math.round(10 * s)
      acc.critical += 0.01 * s
      acc.dodge += 0.01 * s
    }
    if (n >= 4) {
      acc.attack += Math.round(24 * s)
      acc.defense += Math.round(20 * s)
      acc.critical += 0.02 * s
      acc.dodge += 0.02 * s
      acc.cultivationSpeed += 0.05 * s
      acc.effectBoost += 0.02
    }
  })
  // 专属套装（按 setId 2/3/4 件）叠加
  const namedCounts = {}
  Object.values(player?.equipment || {}).forEach(slot => {
    if (slot && slot.setId) namedCounts[slot.setId] = (namedCounts[slot.setId] || 0) + 1
  })
  Object.entries(namedCounts).forEach(([id, n]) => {
    if (n < 2) return
    const set = setById(id)
    if (!set) return
    const b = setBonusOf(set, n)
    Object.keys(b).forEach(k => {
      acc[k] = (acc[k] || 0) + b[k]
    })
  })
  return acc
}

// 攻速词条聚合：装备上所有 speed 词条 = 出手频率(额外一击概率)
export const equippedSpeed = player => {
  let speed = 0
  Object.values(player?.equipment || {}).forEach(slot => {
    ;(slot?.affixes || []).forEach(a => {
      if (a.type === 'stat' && a.stat === 'speed') speed += a.value || 0
    })
  })
  return Math.min(0.5, speed)
}

// 聚合已穿戴装备上的「扩展词条」：暴伤/命中/破甲/格挡/减伤/回复/韧性/修速/灵石/经验/增减益等
export const equippedExtras = player => {
  const acc = {
    critDamage: 0, accuracy: 0, armorPen: 0, block: 0, damageReduction: 0, hpRegen: 0,
    tenacity: 0, cultivationSpeed: 0, moneyMult: 0, expGain: 0, luck: 0, lifespan: 0,
    cooldownReduction: 0, backpackCap: 0, alchemyRate: 0, forgeRate: 0, breakthroughRate: 0,
    thorns: 0, shield: 0, slow: 0
  }
  Object.values(player?.equipment || {}).forEach(slot => {
    ;(slot?.affixes || []).forEach(a => {
      if (a.type === 'stat' && a.stat && acc[a.stat] != null) acc[a.stat] += a.value || 0
    })
  })
  // 平衡钳制：概率/比例类不失控
  acc.critDamage = Math.min(acc.critDamage, 1.5)
  acc.accuracy = Math.min(acc.accuracy, 0.5)
  acc.armorPen = Math.round(acc.armorPen)
  acc.block = Math.min(acc.block, 0.6)
  acc.damageReduction = Math.min(acc.damageReduction, 0.5)
  acc.tenacity = Math.min(acc.tenacity, 0.6)
  acc.expGain = Math.min(acc.expGain, 2)
  acc.luck = Math.min(acc.luck, 80)
  acc.lifespan = Math.round(acc.lifespan)
  acc.cooldownReduction = Math.min(acc.cooldownReduction, 0.5)
  acc.backpackCap = Math.floor(acc.backpackCap)
  acc.alchemyRate = Math.min(acc.alchemyRate, 0.5)
  acc.forgeRate = Math.min(acc.forgeRate, 0.5)
  acc.breakthroughRate = Math.min(acc.breakthroughRate, 0.5)
  acc.thorns = Math.min(acc.thorns, 1.5)
  acc.shield = Math.round(acc.shield)
  acc.slow = Math.min(acc.slow, 0.4)
  return acc
}

// 经验倍率：1 + 装备/功法「经验加成」
export const expMult = player => 1 + (equippedExtras(player).expGain || 0)

// 背包容量：基础 + 装备/功法「背包容量」加成
export const effectiveBackpackCap = player => (player.backpackCapacity || 0) + (equippedExtras(player).backpackCap || 0)

// 掉落幸运倍率：1 + 幸运值×2%
export const luckMult = player => 1 + (equippedExtras(player).luck || 0) * 0.02

// 战斗 / 展示用有效属性 = 基础属性 + 套装加成
export const effectivePlayerStats = player => {
  const s = setStats(player)
  const f = formationStats(player)
  const b = buffStats(player)
  const sk = skillStats(player)
  const sect = sectStats(player)
  const apt = aptitudeStats(player)
  const tech = methodStats(player)
  const realm = realmBonus(player)
  const rb = rebirthStats(player)
  const na = natalArtifactStats(player)
  const ex = equippedExtras(player)
  // 功法也可提供扩展词条（暴伤/命中/破甲/格挡/减伤），并入 extras
  ex.critDamage = Math.min(1.5, (ex.critDamage || 0) + (tech.critDamage || 0))
  ex.accuracy = Math.min(0.5, (ex.accuracy || 0) + (tech.accuracy || 0))
  ex.armorPen = Math.round((ex.armorPen || 0) + (tech.armorPen || 0))
  ex.block = Math.min(0.6, (ex.block || 0) + (tech.block || 0))
  ex.damageReduction = Math.min(0.5, (ex.damageReduction || 0) + (tech.damageReduction || 0))
  ex.tenacity = Math.min(0.6, (ex.tenacity || 0) + (tech.tenacity || 0))
  const baseAtk = player.attack || 0
  const baseDef = player.defense || 0
  // 百分比加成上限，防止套装/阵法/符箓/丹药叠出天文数字
  const PCT_CAP = 3.6
  // 攻/防百分比总上限：套装+阵法(2.5) 之上，界域与转世商店仍可再叠加，但总百分比必须封顶，避免长期膨胀
  const PCT_ABS_CAP = 5.2
  const atkPct = Math.min(PCT_CAP, (b.attack || 0) + (f.attack || 0))
  const defPct = Math.min(PCT_CAP, (b.defense || 0) + (f.defense || 0))
  const atkTotal = Math.min(PCT_ABS_CAP, atkPct + (realm.attack || 0) + rb.attack)
  const defTotal = Math.min(PCT_ABS_CAP, defPct + (realm.defense || 0) + rb.defense)
  // 平衡上限：闪避/暴击最多 80%
  const clamp = v => Math.min(0.8, Math.max(0, v))
  // 将「固定加成之和」同样减半，确保攻击/防御/气血整体正好缩一半（基础值已随迁移/新装备减半）
  const half = v => v * 0.5
  return {
    attack: Math.floor(baseAtk + na.attack + half(s.attack + sk.attack + sect.attack + apt.attack + tech.attack) + baseAtk * atkTotal),
    defense: Math.floor(baseDef + na.defense + half(s.defense + sk.defense + sect.defense + apt.defense + tech.defense) + baseDef * defTotal),
    health: (player.health || 0),
    maxHealth: Math.floor((player.maxHealth || 0) * (1 + (rb.health || 0)) + half(sk.health + sect.health + apt.health + tech.health + (s.health || 0))),
    critical: clamp((player.critical || 0) + na.critical + s.critical + f.critical + b.critical + sk.critical + sect.critical + apt.critical + tech.critical + (realm.critical || 0) + rb.critical),
    // 闪避来源统一削弱：所有来源叠加后整体打 0.4 折，大幅削弱数值且更难顶到 80% 上限
    dodge: clamp(((player.dodge || 0) + na.dodge + s.dodge + f.dodge + b.dodge + sk.dodge + sect.dodge + apt.dodge + tech.dodge + (realm.dodge || 0) + rb.dodge) * 0.4),
    speed: equippedSpeed(player),
    // 扩展词条（供战斗/引擎读取）
    extras: ex
  }
}

// 套装明细（用于界面展示）
export const setSummary = player => {
  const counts = equippedCountByQuality(player)
  return Object.entries(counts)
    .map(([quality, n]) => {
      if (n < 2) return null
      const qi = SET_QUALITY_INDEX[quality]
      if (qi == null) return null
      const s = 1 + qi * 0.7
      const mk = (need) => ({
        need,
        active: n >= need,
        text: tierText(need, s)
      })
      return {
        quality,
        name: SET_QUALITY_NAMES[quality] || quality,
        pieces: n,
        tiers: [mk(2), mk(3), mk(4)]
      }
    })
    .filter(Boolean)
}

const tierText = (need, s) => {
  switch (need) {
    case 2:
      return `攻+${Math.round(6 * s)} 防+${Math.round(5 * s)} 暴+${(0.005 * s * 100).toFixed(1)}% 闪+${(0.005 * s * 100).toFixed(1)}%`
    case 3:
      return `攻+${Math.round(12 * s)} 防+${Math.round(10 * s)} 暴+${(0.01 * s * 100).toFixed(1)}% 闪+${(0.01 * s * 100).toFixed(1)}%`
    case 4:
      return `攻+${Math.round(24 * s)} 防+${Math.round(20 * s)} 暴+${(0.02 * s * 100).toFixed(1)}% 闪+${(0.02 * s * 100).toFixed(1)}% 修+${(0.05 * s * 100).toFixed(0)}% 特效+${(0.02 * 100).toFixed(0)}%`
    default:
      return ''
  }
}

const SLOTS = ['weapon', 'armor', 'accessory', 'sutra']
const QUALITY_ORDER = ['info', 'success', 'primary', 'purple', 'pink', 'warning', 'danger', 'cyan', 'orange', 'gold', 'legendary']
const COLLECT_NAMES = ['凡', '玄', '地', '天', '仙', '帝', '神', '灵', '皇', '圣', '道']

// 套装收集：玩家已拥有（含穿戴+背包）某品阶完整四件套
export const collectSetInfo = player => {
  const pool = [...(player.inventory || []), ...Object.values(player.equipment || {})].filter(e => e && e.type && e.quality)
  for (let q = QUALITY_ORDER.length - 1; q >= 0; q--) {
    const qual = QUALITY_ORDER[q]
    if (SLOTS.every(slot => pool.some(e => e.type === slot && e.quality === qual))) {
      return { name: `${COLLECT_NAMES[q]}阶藏家`, tier: q }
    }
  }
  return { name: '', tier: -1 }
}
