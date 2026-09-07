// 装备词条系统 —— 数值型 + 特效型（网游风格），含概率上限与冷却

// 品质权重：高品质装备更容易出/出更多词条
export const affixQualityMultiplier = {
  info: 1, // 凡阶
  success: 1, // 玄阶
  primary: 2, // 地阶
  purple: 2, // 天阶
  pink: 2, // 仙阶
  warning: 3, // 帝阶
  danger: 3, // 神阶
  cyan: 4, // 灵阶
  orange: 4, // 皇阶
  gold: 5, // 圣阶
  legendary: 5 // 道阶
}

// 特效型词条：网游风，含触发概率、冷却/持续。
// triggerChance 为词条自带概率；player 总控制率有上限(见 resolveTriggerChance)。
export const EFFECT_AFFIXES = [
  { key: 'paralyze', name: '麻痹', type: 'effect', desc: '攻击时有几率令目标麻痹，无法行动', triggerChance: 0.10, cooldown: 3 },
  { key: 'freeze', name: '冰冻', type: 'effect', desc: '攻击时有几率冻结目标，跳过行动', triggerChance: 0.08, cooldown: 4 },
  { key: 'stun', name: '眩晕', type: 'effect', desc: '攻击时有几率眩晕目标，打断出手', triggerChance: 0.06, cooldown: 4 },
  { key: 'poison', name: '中毒', type: 'effect', desc: '攻击使目标中毒，持续造成伤害', triggerChance: 0.12, cooldown: 3 },
  { key: 'burn', name: '灼烧', type: 'effect', desc: '攻击使目标灼烧，持续造成伤害', triggerChance: 0.10, cooldown: 3 },
  { key: 'lifesteal', name: '吸血', type: 'effect', desc: '造成伤害时恢复生命', triggerChance: 0.20, cooldown: 0 }
]

// 数值型词条：直接加属性
export const STAT_AFFIXES = [
  { key: 'attack', name: '攻击', type: 'stat', stat: 'attack' },
  { key: 'defense', name: '防御', type: 'stat', stat: 'defense' },
  { key: 'health', name: '生命', type: 'stat', stat: 'health' },
  { key: 'critical', name: '暴击率', type: 'stat', stat: 'critical' },
  { key: 'dodge', name: '闪避率', type: 'stat', stat: 'dodge' },
  { key: 'speed', name: '攻速', type: 'stat', stat: 'speed' },
  // —— 基础核心 & 攻防生存 ——
  { key: 'critDamage', name: '暴击伤害', type: 'stat', stat: 'critDamage' },
  { key: 'accuracy', name: '命中率', type: 'stat', stat: 'accuracy' },
  { key: 'armorPen', name: '破甲', type: 'stat', stat: 'armorPen' },
  { key: 'block', name: '格挡率', type: 'stat', stat: 'block' },
  { key: 'damageReduction', name: '伤害减免', type: 'stat', stat: 'damageReduction' },
  { key: 'hpRegen', name: '气血回复', type: 'stat', stat: 'hpRegen' },
  { key: 'tenacity', name: '韧性', type: 'stat', stat: 'tenacity' },
  // —— 功能辅助 ——
  { key: 'cultivationSpeed', name: '修炼速度', type: 'stat', stat: 'cultivationSpeed' },
  { key: 'moneyMult', name: '灵石加成', type: 'stat', stat: 'moneyMult' },
  { key: 'expGain', name: '经验加成', type: 'stat', stat: 'expGain' },
  { key: 'luck', name: '幸运值', type: 'stat', stat: 'luck' },
  { key: 'lifespan', name: '寿元', type: 'stat', stat: 'lifespan' },
  { key: 'cooldownReduction', name: '冷却缩减', type: 'stat', stat: 'cooldownReduction' },
  { key: 'backpackCap', name: '背包容量', type: 'stat', stat: 'backpackCap' },
  { key: 'alchemyRate', name: '炼丹成功率', type: 'stat', stat: 'alchemyRate' },
  { key: 'forgeRate', name: '炼器成功率', type: 'stat', stat: 'forgeRate' },
  { key: 'breakthroughRate', name: '突破成功率', type: 'stat', stat: 'breakthroughRate' },
  // —— 特效型(被动) ——
  { key: 'thorns', name: '反伤', type: 'stat', stat: 'thorns' },
  { key: 'shield', name: '护盾', type: 'stat', stat: 'shield' },
  { key: 'slow', name: '减速', type: 'stat', stat: 'slow' }
]

// 上限规则：单个玩家所有控制特效的累加触发概率封顶，避免无限控
export const CONTROL_PROB_CAP = 0.15 // 麻痹+冰冻+眩晕 总触发上限 15%
export const MAX_POISON_STACKS = 3 // 中毒/灼烧最多叠加 3 跳

// 计算一条特效词条实际的触发概率：按装备品质缩放，并受总控制率上限约束
export const resolveTriggerChance = (baseChance, player) => {
  let chance = baseChance
  // 数值型 / 吸血不计入控制率上限
  return chance
}

// 生成一个随机数值词条的值
export const rollStatValue = (stat, level, quality) => {
  const qm = affixQualityMultiplier[quality] || 1
  let base = 0
  switch (stat) {
    case 'attack':
      base = (5 + Math.floor(Math.random() * 20)) * level * 0.5
      break
    case 'defense':
      base = (4 + Math.floor(Math.random() * 15)) * level * 0.4
      break
    case 'health':
      base = (25 + Math.floor(Math.random() * 100)) * level
      break
    case 'critical':
    case 'dodge':
      base = (0.005 + Math.random() * 0.01)
      break
    case 'speed':
      base = (0.02 + Math.random() * 0.04)
      break
    case 'critDamage':
      base = (0.05 + Math.random() * 0.10)
      break
    case 'accuracy':
      base = (0.01 + Math.random() * 0.04)
      break
    case 'armorPen':
      base = (3 + Math.random() * 12) * level * 0.3
      break
    case 'block':
      base = (0.01 + Math.random() * 0.04)
      break
    case 'damageReduction':
      base = (0.01 + Math.random() * 0.03)
      break
    case 'hpRegen':
      base = (5 + Math.random() * 30) * level * 0.5
      break
    case 'tenacity':
      base = (0.01 + Math.random() * 0.03)
      break
    case 'cultivationSpeed':
      base = (0.002 + Math.random() * 0.006)
      break
    case 'moneyMult':
      base = (0.001 + Math.random() * 0.003)
      break
    case 'expGain':
      base = (0.02 + Math.random() * 0.06)
      break
    case 'luck':
      base = 1 + Math.random() * 9
      break
    case 'lifespan':
      base = 1 + Math.random() * 7
      break
    case 'cooldownReduction':
      base = (0.01 + Math.random() * 0.03)
      break
    case 'backpackCap':
      base = 5 + Math.random() * 25
      break
    case 'alchemyRate':
    case 'forgeRate':
      base = (0.005 + Math.random() * 0.015)
      break
    case 'breakthroughRate':
      base = (0.005 + Math.random() * 0.02)
      break
  }
  return Math.round(base * qm * 10) / 10
}

// 根据装备等级/品质随机生成 1~(品质系数) 条词条
export const rollAffixes = (level, quality) => {
  const count = affixQualityMultiplier[quality] || 1
  const affixes = []
  const pool = [...STAT_AFFIXES, ...EFFECT_AFFIXES]
  const used = new Set()
  for (let i = 0; i < count; i++) {
    if (pool.length === 0) break
    const idx = Math.floor(Math.random() * pool.length)
    const def = pool[idx]
    if (used.has(def.key)) continue
    used.add(def.key)
    if (def.type === 'stat') {
      affixes.push({
        type: 'stat',
        key: def.key,
        name: def.name,
        value: rollStatValue(def.stat, level, quality)
      })
    } else {
      affixes.push({
        type: 'effect',
        key: def.key,
        name: def.name,
        triggerChance: def.triggerChance,
        cooldown: def.cooldown,
        desc: def.desc
      })
    }
  }
  return affixes
}

// 汇总一件装备上所有数值词条属性
export const sumStatAffixes = affixes => {
  const result = {
    attack: 0, defense: 0, health: 0, critical: 0, dodge: 0, speed: 0,
    critDamage: 0, accuracy: 0, armorPen: 0, block: 0, damageReduction: 0, hpRegen: 0,
    tenacity: 0, cultivationSpeed: 0, moneyMult: 0, expGain: 0, luck: 0, lifespan: 0,
    cooldownReduction: 0, backpackCap: 0, alchemyRate: 0, forgeRate: 0, breakthroughRate: 0,
    thorns: 0, shield: 0, slow: 0
  }
  ;(affixes || []).forEach(a => {
    if (a.type === 'stat' && a.stat) {
      result[a.stat] = (result[a.stat] || 0) + a.value
    }
  })
  return result
}
