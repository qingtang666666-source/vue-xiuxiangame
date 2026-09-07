// 阵法系统 —— 按「类型 × 品阶」布下大阵，持续提供被动加成
//
// 六大类型(战斗/防御/控制/修炼/经济/辅助) × 11 品阶(黄/玄/地/天/仙/帝/神/灵/圣/皇/道) = 66 座。
// 每座阵法可独立升级(等级越高加成越强)，全部同时生效。
// 阵法加成是持续被动，不占限时 buff，与 洞府/炼丹/装备/符箓 叠加。
// 加成语义：
//   attack/defense   攻/防 加成百分比（0.3 = +30%）
//   critical/dodge   暴击/闪避 加成百分点（0.06 = +6%）
//   cultivationSpeed 修炼速度加法值（0.25 = +25%）
//   moneyMult/offlineMult 灵石/离线 加法百分比（0.25 = +25%）
//   effectBoost      特效触发百分点

import { bumpCraftRank, craftLevelOfTier } from './craft.js'

// 阵法是百分比增益，故用「逐阶 ×1.55」的陡曲线（道阶 80，原 38），
// 且解锁等级与大境界边界对齐：跨一个大境界就能凝聚更高一档的阵。
const FORMATION_MULT = [1, 1.55, 2.4, 3.72, 5.77, 8.94, 13.9, 21.5, 33.3, 51.6, 80]
const FORMATION_META = [
  { t: 1, name: '黄阶', q: 'info' },
  { t: 2, name: '玄阶', q: 'success' },
  { t: 3, name: '地阶', q: 'primary' },
  { t: 4, name: '天阶', q: 'purple' },
  { t: 5, name: '仙阶', q: 'pink' },
  { t: 6, name: '帝阶', q: 'warning' },
  { t: 7, name: '神阶', q: 'danger' },
  { t: 8, name: '灵阶', q: 'cyan' },
  { t: 9, name: '皇阶', q: 'orange' },
  { t: 10, name: '圣阶', q: 'gold' },
  { t: 11, name: '道阶', q: 'legendary' }
]
export const FORMATION_TIERS = FORMATION_META.map(m => ({ ...m, mult: FORMATION_MULT[m.t - 1], minLevel: craftLevelOfTier(m.t) }))

export const FORMATION_GROUPS = [
  { key: 'combat', name: '战斗', icon: '⚔️', desc: '以杀伐之阵，主攻城拔寨。', costBase: 900, stems: ['荧惑杀', '五雷诛邪', '烈焰焚', '罡风裂', '庚金斩', '九霄雷', '万剑归宗', '焚天', '破军', '斩龙', '灭世'], effect: lv => ({ attack: 0.006 * lv, critical: 0.0012 * lv }) },
  { key: 'defense', name: '防御', icon: '🛡️', desc: '以固守之阵，护体如山。', costBase: 900, stems: ['金刚伏魔', '玄武镇岳', '玄龟御', '不动明王', '磐石定', '铁壁守', '万岳镇', '不动如山', '龙鳞御', '镇北', '不灭金身'], effect: lv => ({ defense: 0.006 * lv }) },
  { key: 'control', name: '控制', icon: '⛩️', desc: '以困杀之阵，缚敌无形。', costBase: 1500, stems: ['九宫困仙', '天罗地网', '八卦锁魂', '轩辕封印', '七星缚', '龙虎困', '六合锁', '八荒困', '周天禁', '万象缚', '大道禁'], effect: lv => ({ effectBoost: 0.0015 * lv }) },
  { key: 'cultivate', name: '修炼', icon: '🌀', desc: '以聚灵之阵，事半功倍。', costBase: 700, stems: ['聚灵', '太清周天', '大道鸿蒙', '混元养', '万灵汇', '周天流转', '紫气东来', '一气化三', '九九归元', '参悟', '大衍'], effect: lv => ({ cultivationSpeed: 0.005 * lv, offlineMult: 0.003 * lv }) },
  { key: 'economy', name: '经济', icon: '💰', desc: '以聚宝之阵，财源广进。', costBase: 1800, stems: ['聚宝纳财', '万载养元', '金池', '招财进宝', '八荒聚宝', '五行生财', '无量聚财', '万宝归宗', '富甲天下', '聚灵纳福', '天地元宝'], effect: lv => ({ moneyMult: 0.005 * lv, offlineMult: 0.003 * lv }) },
  { key: 'support', name: '辅助', icon: '🌿', desc: '以生生之阵，增益万象。', costBase: 2200, stems: ['回春生机', '青木长春', '万灵护体', '生生不息', '甘露', '九转回天', '凤凰涅槃', '起死回生', '万木逢春', '枯木逢春', '造化'], effect: lv => ({ effectBoost: 0.001 * lv, critical: 0.0012 * lv, dodge: 0.0012 * lv }) },
  { key: 'aura', name: '领域', icon: '🌀', desc: '以天地为域，杀伐与悟道并进。', costBase: 1400, stems: ['周天星斗', '天地法域', '万灵领域', '太初之界', '道域流转', '罗天', '周界', '化界', '寰宇', '无量界', '须弥'], effect: lv => ({ attack: 0.005 * lv, cultivationSpeed: 0.004 * lv }) },
  { key: 'guardian', name: '御守', icon: '🛡️', desc: '以不破之壁，御敌养身。', costBase: 1200, stems: ['铁卫', '玄甲', '金钟', '玉壁', '不动明王', '玄武背', '龙鳞甲', '镇岳', '护体', '金刚', '大衍'], effect: lv => ({ defense: 0.005 * lv, critical: 0.001 * lv }) },
  { key: 'domain', name: '道域', icon: '☯️', desc: '以大道之境，万法皆备。', costBase: 2000, stems: ['万道归一', '混元一气', '太一之界', '无极道域', '鸿蒙道', '周天境', '太虚境', '混沌界', '道基', '道心', '大道境'], effect: lv => ({ attack: 0.004 * lv, defense: 0.004 * lv, cultivationSpeed: 0.003 * lv }) }
]

const mulEffect = (eff, mult) => {
  const out = {}
  Object.keys(eff).forEach(k => (out[k] = eff[k] * mult))
  return out
}

// 生成矩阵：6 类型 × 11 品阶 = 66 座
export const FORMATIONS = (() => {
  const arr = []
  FORMATION_GROUPS.forEach(g => {
    FORMATION_TIERS.forEach((tier, ti) => {
      const stem = g.stems[ti] || g.stems[0]
      arr.push({
        id: `${g.key}-${tier.t}`,
        name: `${tier.name}·${stem}阵`,
        group: g.key,
        groupName: g.name,
        icon: g.icon,
        quality: tier.q,
        tier: tier.t,
        tierName: tier.name,
        minLevel: tier.minLevel,
        maxLevel: 20,
        // 消耗只按倍率的 0.72 次方增长：高阶更强，但不至于强到买不起
        costBase: Math.floor(g.costBase * Math.pow(tier.mult, 0.72)),
        desc: g.desc,
        effect: lv => mulEffect(g.effect(lv), tier.mult)
      })
    })
  })
  return arr
})()

export const formationTier = t => FORMATION_TIERS.find(x => x.t === t)
export const formationGroup = key => FORMATION_GROUPS.find(g => g.key === key)
export const formationById = id => FORMATIONS.find(f => f.id === id)

const getBoard = player => {
  if (!player.formations || typeof player.formations !== 'object') player.formations = {}
  return player.formations
}

export const formationLevel = (player, id) => getBoard(player)[id] || 0

export const formationCost = (player, id) => {
  const f = formationById(id)
  const level = formationLevel(player, id)
  const money = Math.floor(f.costBase * Math.pow(level + 1, 1.5))
  const stone = level >= 6 ? Math.floor(level * 3) : 0
  const herb = level >= 12 ? Math.floor(level * 2) : 0
  const dan = level >= 18 ? Math.floor(level * 0.5) : 0
  return { money, stone, herb, dan }
}

export const canUpgradeFormation = (player, id) => {
  const f = formationById(id)
  const level = formationLevel(player, id)
  if (level >= f.maxLevel) return { ok: false, reason: '已至大圆满' }
  if (player.level < f.minLevel) return { ok: false, reason: '境界不足，无法凝聚此阵' }
  const cost = formationCost(player, id)
  const props = player.props || {}
  if ((props.money || 0) < cost.money) return { ok: false, reason: '灵石不足' }
  if ((props.strengtheningStone || 0) < cost.stone) return { ok: false, reason: '炼器石不足' }
  if ((props.spiritHerb || 0) < cost.herb) return { ok: false, reason: '灵草不足' }
  if ((props.cultivateDan || 0) < cost.dan) return { ok: false, reason: '培养丹不足' }
  return { ok: true, cost }
}

export const upgradeFormation = (player, id) => {
  const check = canUpgradeFormation(player, id)
  if (!check.ok) return { ok: false, reason: check.reason }
  const board = getBoard(player)
  board[id] = (board[id] || 0) + 1
  const props = player.props || {}
  props.money -= check.cost.money
  props.strengtheningStone -= check.cost.stone
  props.spiritHerb -= check.cost.herb
  props.cultivateDan -= check.cost.dan
  const f = formationById(id)
  if (f) bumpCraftRank(player, 'formation', f.tier)
  return { ok: true, level: board[id] }
}

// 汇总所有已布阵法的加成
export const formationStats = player => {
  const acc = { attack: 0, defense: 0, critical: 0, dodge: 0, cultivationSpeed: 0, moneyMult: 0, offlineMult: 0, effectBoost: 0 }
  FORMATIONS.forEach(f => {
    const lv = formationLevel(player, f.id)
    if (lv <= 0) return
    const e = f.effect(lv)
    Object.keys(acc).forEach(k => {
      if (e[k]) acc[k] += e[k]
    })
  })
  // 阵法加成上限，避免 66 阵叠出天文数字
  const CAPS = { attack: 4, defense: 4, critical: 0.5, dodge: 0.5, cultivationSpeed: 2.5, moneyMult: 2.5, offlineMult: 2.5, effectBoost: 0.6 }
  Object.keys(acc).forEach(k => {
    if (CAPS[k] != null) acc[k] = Math.min(CAPS[k], acc[k])
  })
  return acc
}

const effectTextOf = (f, lv) => {
  const parts = []
  const e = lv > 0 ? f.effect(lv) : {}
  if (e.attack) parts.push(`攻击 +${(e.attack * 100).toFixed(1)}%`)
  if (e.defense) parts.push(`防御 +${(e.defense * 100).toFixed(1)}%`)
  if (e.critical) parts.push(`暴击 +${(e.critical * 100).toFixed(1)}%`)
  if (e.dodge) parts.push(`闪避 +${(e.dodge * 100).toFixed(1)}%`)
  if (e.cultivationSpeed) parts.push(`修炼 +${(e.cultivationSpeed * 100).toFixed(1)}%`)
  if (e.moneyMult) parts.push(`灵石 +${(e.moneyMult * 100).toFixed(1)}%`)
  if (e.offlineMult) parts.push(`离线 +${(e.offlineMult * 100).toFixed(1)}%`)
  if (e.effectBoost) parts.push(`特效 +${(e.effectBoost * 100).toFixed(1)}%`)
  return parts.join('，') || '尚未布阵'
}

// 阵法展示明细（支持按类型/品阶筛选）
export const formationSummary = player => {
  return FORMATIONS.map(f => {
    const lv = formationLevel(player, f.id)
    const check = canUpgradeFormation(player, f.id)
    return {
      ...f,
      level: lv,
      cost: formationCost(player, f.id),
      canUpgrade: check.ok,
      reason: check.reason,
      effectText: effectTextOf(f, lv)
    }
  })
}
