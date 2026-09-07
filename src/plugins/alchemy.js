// 炼丹系统 —— 消耗灵草/灵石/培养丹炼制的丹药
//
// 丹方库由「品阶 × 效果类别」组合生成，共 10 品阶 × 12 类别 = 120 种。
//   品阶：凡/黄/玄/地/天/仙/神/灵/圣/道，数值逐阶递增
//   类别：修炼/气血/攻击/防御/暴击/闪避/灵石/离线(永久)，悟道/聚财/养神(限时)，混元(复合永久)
//
// 同时提供挂机速率聚合：把玩家基础 + 洞府 + 炼丹(永久/限时) 统一算出，
// 供 修炼页 / 离线结算 / 在线挂机 三处共用，避免散落重复计算。

import { manorOfflineBonus, manorCultivationSpeed } from './manor.js'
import { setStats, equippedExtras } from './setBonus.js'
import { formationStats } from './formation.js'
import { skillStats } from './npcSystem.js'
import { sectStats } from './sect.js'
import { aptitudeStats } from './aptitude.js'
import { methodStats } from './technique.js'
import { realmBonus } from './ascension.js'
import { rebirthStats } from './rebirth.js'
import { insightMult } from './insight.js'
import { realmCultSpeedMult } from './game.js'
import { bumpCraftRank, TIER_CRAFT_SUCCESS, craftLevelOfTier, costRows, costShortfallText } from './craft.js'
import { bumpDaily } from './dailyGoals.js'
import { codexBonus } from './codex.js'
import { tierMaterial, matNameOf } from './materialDb.js'

// ---- 品阶表：数值倍率逐阶递增，颜色与稀有度对应 ----
export const TIERS = [
  { t: 1, name: '黄阶', q: 'info', mult: 1 },
  { t: 2, name: '玄阶', q: 'success', mult: 1.7 },
  { t: 3, name: '地阶', q: 'primary', mult: 2.8 },
  { t: 4, name: '天阶', q: 'purple', mult: 4.5 },
  { t: 5, name: '仙阶', q: 'pink', mult: 7 },
  { t: 6, name: '帝阶', q: 'warning', mult: 11 },
  { t: 7, name: '神阶', q: 'danger', mult: 17 },
  { t: 8, name: '灵阶', q: 'cyan', mult: 26 },
  { t: 9, name: '皇阶', q: 'orange', mult: 40 },
  { t: 10, name: '圣阶', q: 'gold', mult: 62 },
  { t: 11, name: '道阶', q: 'legendary', mult: 100 }
]

// ---- 效果类别：每类 10 个专属炼名，组合后名称唯一 ----
const CATEGORIES = [
  {
    key: 'cult',
    kind: 'permanent',
    suffix: '丹',
    descBase: '固本培元，灵气淬体',
    stems: ['聚气', '凝神', '洗髓', '悟道', '融灵', '炼心', '明性', '化气', '归元', '合道'],
    effect: m => ({ cultivationSpeed: 0.02 * m })
  },
  {
    key: 'health',
    kind: 'permanent',
    suffix: '丹',
    descBase: '温养经脉，气血充盈',
    stems: ['养脉', '回春', '固本', '培元', '续命', '生骨', '通玄', '洗骨', '脱胎', '换骨'],
    effect: m => ({ health: Math.round(30 * m) })
  },
  {
    key: 'attack',
    kind: 'permanent',
    suffix: '丹',
    descBase: '锋芒毕露，出手如风',
    stems: ['淬锋', '裂山', '破军', '星火', '斩龙', '裂天', '焚海', '碎星', '镇岳', '开天'],
    effect: m => ({ attack: Math.round(10 * m) })
  },
  {
    key: 'defense',
    kind: 'permanent',
    suffix: '丹',
    descBase: '铜皮铁骨，坚不可摧',
    stems: ['铁壁', '金刚', '御岳', '磐石', '玄龟', '镇守', '不动', '重甲', '明王', '冥王'],
    effect: m => ({ defense: Math.round(8 * m) })
  },
  {
    key: 'critical',
    kind: 'permanent',
    suffix: '丹',
    descBase: '眼到手到，招招致命',
    stems: ['锐眼', '入微', '点睛', '杀意', '锋芒', '战意', '贯日', '屠龙', '九击', '灭世'],
    effect: m => ({ critical: 0.0015 * m })
  },
  {
    key: 'dodge',
    kind: 'permanent',
    suffix: '丹',
    descBase: '身法飘渺，难以捉摸',
    stems: ['轻身', '飘渺', '影遁', '惊鸿', '凌波', '踏风', '瞬影', '幻身', '无影', '无形'],
    effect: m => ({ dodge: 0.0015 * m })
  },
  {
    key: 'econ',
    kind: 'permanent',
    suffix: '丹',
    descBase: '聚财纳福，灵石渐丰',
    stems: ['聚宝', '金池', '招财', '厚土', '矿精', '龙涎', '聚灵', '纳福', '财帛', '天地'],
    effect: m => ({ moneyMult: 1 + 0.01 * m })
  },
  {
    key: 'offl',
    kind: 'permanent',
    suffix: '丹',
    descBase: '养精蓄锐，闭关收益更丰',
    stems: ['定神', '安眠', '入定', '无忧', '长息', '抱元', '守一', '养神', '坐忘', '大定'],
    effect: m => ({ offlineMult: 1 + 0.01 * m })
  },
  {
    key: 'bcult',
    kind: 'buff',
    suffix: '散',
    minutes: 30,
    descBase: '灵感涌现，修行提速',
    stems: ['顿悟', '灵感', '入神', '焚香', '坐照', '观想', '明心', '再燃', '通明', '慧心'],
    effect: m => ({ cultivation: Math.min(3, 0.02 * m) })
  },
  {
    key: 'becon',
    kind: 'buff',
    suffix: '散',
    minutes: 30,
    descBase: '财气汇聚，灵石滚滚而来',
    stems: ['财来', '进宝', '运旺', '纳财', '添丁', '广进', '聚泉', '流水', '雨金', '如山'],
    effect: m => ({ moneyMult: Math.min(3, 0.02 * m) })
  },
  {
    key: 'boffl',
    kind: 'buff',
    suffix: '露',
    minutes: 60,
    descBase: '静心安神，离线收益大增',
    stems: ['长梦', '酣眠', '大睡', '安神', '足眠', '养精', '藏锋', '蓄锐', '隐世', '太极'],
    effect: m => ({ offlineMult: Math.min(3, 0.02 * m) })
  },
  {
    key: 'compound',
    kind: 'permanent',
    suffix: '丹',
    descBase: '阴阳调和，攻防气血俱增',
    stems: ['混元', '太一', '紫府', '周天', '先天', '无极', '鸿蒙', '造化', '轮回', '大衍'],
    effect: m => ({ attack: Math.round(7 * m), defense: Math.round(5 * m), health: Math.round(24 * m) })
  },
  {
    key: 'longevity',
    kind: 'permanent',
    suffix: '丹',
    descBase: '增补寿元，绵延命数',
    stems: ['延寿', '续命', '增元', '固寿', '长生', '驻颜', '不老', '命石', '寿昌', '万寿'],
    effect: m => ({ lifespan: Math.round(5 * m) })
  },
  {
    key: 'berserk',
    kind: 'permanent',
    suffix: '丹',
    descBase: '怒意滔天，攻伐皆裂',
    stems: ['怒啸', '焚心', '狂战', '暴血', '凶威', '扬威', '破浪', '裂岳', '霸体', '辟易'],
    effect: m => ({ attack: Math.round(7 * m), critical: 0.0008 * m })
  },
  {
    key: 'ironwall',
    kind: 'permanent',
    suffix: '丹',
    descBase: '玄武之壁，坚不可摧',
    stems: ['铁壁', '玄壁', '重楼', '镇岳', '不动', '磐石', '金城', '玉垒', '山岳', '天堑'],
    effect: m => ({ defense: Math.round(5 * m), health: Math.round(18 * m) })
  },
  {
    key: 'gale',
    kind: 'permanent',
    suffix: '丹',
    descBase: '身随风动，招招难避',
    stems: ['疾风', '惊鸿', '掠影', '残影', '瞬影', '踏月', '追云', '无影', '化风', '折光'],
    effect: m => ({ dodge: 0.0008 * m, critical: 0.0008 * m })
  },
  {
    key: 'sagacity',
    kind: 'permanent',
    suffix: '丹',
    descBase: '慧光内照，道行渐深',
    stems: ['通玄', '见性', '明心', '坐照', '观澜', '照见', '忘机', '洗心', '凝神', '守元'],
    effect: m => ({ cultivationSpeed: 0.008 * m, lifespan: Math.round(2 * m) })
  },
  {
    key: 'fortuna',
    kind: 'permanent',
    suffix: '丹',
    descBase: '福泽加身，财运亨通',
    stems: ['鸿运', '天赐', '紫气', '纳福', '万福', '聚宝', '迎祥', '瑞气', '呈祥', '招财'],
    effect: m => ({ moneyMult: 1 + 0.004 * m, health: Math.round(20 * m) })
  }
]

// 生成一条丹方
const buildRecipe = (tier, cat) => {
  const m = tier.mult
  const stem = cat.stems[(tier.t - 1) % cat.stems.length]
  const recipe = {
    id: `${tier.t}-${cat.key}`,
    name: `${tier.name}${stem}${cat.suffix}`,
    quality: tier.q,
    tier: tier.t,
    tierName: tier.name,
    level: craftLevelOfTier(tier.t),
    category: cat.kind,
    desc: `${cat.descBase}（${tier.name}）`,
    cost: {
      spiritHerb: Math.round(1 + m),
      money: tier.t >= 6 ? Math.round(20 * m) : 0,
      cultivateDan: tier.t >= 4 ? Math.ceil((tier.t - 3) / 2) : 0,
      material: { key: tierMaterial(['药材', '灵果'], tier.t)?.key, qty: Math.max(1, Math.ceil(tier.t / 2)) }
    }
  }
  if (cat.kind === 'buff') {
    recipe.buff = { ...cat.effect(m), minutes: cat.minutes }
  } else {
    recipe.permanent = cat.effect(m)
  }
  recipe.effectText = effectTextOf(recipe)
  return recipe
}

// 由效果对象生成可读文案
const effectTextOf = recipe => {
  const parts = []
  if (recipe.buff) {
    const min = recipe.buff.minutes
    if (recipe.buff.cultivation) parts.push(`修炼速度 +${Math.round(recipe.buff.cultivation * 100)}%（${min}分钟）`)
    if (recipe.buff.moneyMult) parts.push(`灵石收益 +${Math.round(recipe.buff.moneyMult * 100)}%（${min}分钟）`)
    if (recipe.buff.offlineMult) parts.push(`离线收益 +${Math.round(recipe.buff.offlineMult * 100)}%（${min}分钟）`)
    return parts.join('，')
  }
  const p = recipe.permanent || {}
  if (p.cultivationSpeed) parts.push(`修炼速度 +${Math.round(p.cultivationSpeed * 100)}%`)
  if (p.attack) parts.push(`攻击 +${p.attack}`)
  if (p.defense) parts.push(`防御 +${p.defense}`)
  if (p.health) parts.push(`气血 +${p.health}`)
  if (p.critical) parts.push(`暴击率 +${(p.critical * 100).toFixed(1)}%`)
  if (p.dodge) parts.push(`闪避率 +${(p.dodge * 100).toFixed(1)}%`)
  if (p.moneyMult) parts.push(`灵石收益 ×${p.moneyMult.toFixed(2)}`)
  if (p.offlineMult) parts.push(`离线收益 ×${p.offlineMult.toFixed(2)}`)
  if (p.lifespan) parts.push(`寿元 +${p.lifespan} 年`)
  return parts.join('，')
}

// 丹方库：120 种
export const RECIPES = (() => {
  const arr = []
  TIERS.forEach(tier => {
    CATEGORIES.forEach(cat => arr.push(buildRecipe(tier, cat)))
  })
  return arr
})()

export const recipeById = id => RECIPES.find(r => r.id === id)

// ---- 挂机速率聚合（玩家基础 + 洞府 + 炼丹）----

export const buffStats = player => {
  const now = Date.now()
  let cultivation = 0
  let moneyMult = 0
  let offlineMult = 0
  ;(player.buffs || []).forEach(b => {
    if (b.expireAt && b.expireAt <= now) return
    const e = b.effect || {}
    cultivation += e.cultivation || 0
    moneyMult += e.moneyMult || 0
    offlineMult += e.offlineMult || 0
  })
  return { cultivation, moneyMult, offlineMult }
}

// 清理已过期的临时增益
export const reapBuffs = player => {
  const now = Date.now()
  player.buffs = (player.buffs || []).filter(b => !b.expireAt || b.expireAt > now)
}

// 当前有效的临时增益（用于展示）
export const activeBuffs = player => {
  const now = Date.now()
  return (player.buffs || []).filter(b => !b.expireAt || b.expireAt > now).sort((a, b) => a.expireAt - b.expireAt)
}

// 综合挂机速率：修炼速度 / 灵石倍率 / 离线倍率
export const idleRates = player => {
  const b = buffStats(player)
  const cd = codexBonus(player)
  const alch = player.alchemy || { moneyMult: 1, offlineMult: 1 }
  const set = setStats(player)
  const f = formationStats(player)
  const sk = skillStats(player)
  const sect = sectStats(player)
  const apt = aptitudeStats(player)
  const tech = methodStats(player)
  const realm = realmBonus(player)
  const rb = rebirthStats(player)
  const ex = equippedExtras(player)
  const cult = Math.min(10, ((player.cultivationSpeed || 1) * manorCultivationSpeed(player) * (1 + b.cultivation + cd.cultivation) * insightMult(player) +
    (set.cultivationSpeed || 0) +
    (f.cultivationSpeed || 0) +
    (sk.cultivationSpeed || 0) +
    (sect.cultivationSpeed || 0) +
    (ex.cultivationSpeed || 0) +
    (tech.cultivationSpeed || 0) +
    (realm.cultivationSpeed || 0) +
    (rb.cultivationSpeed || 0)) * apt.cultivationMult + apt.cultivationSpeed) * realmCultSpeedMult(player.level || 0)
  const money = Math.min(30, (1 + b.moneyMult + cd.money + (f.moneyMult || 0) + (sk.moneyMult || 0) + (sect.moneyMult || 0) + (ex.moneyMult || 0) + (tech.moneyMult || 0) + (realm.moneyMult || 0) + (rb.moneyMult || 0)))
  const offl = Math.min(30, (1 + b.offlineMult + (f.offlineMult || 0) + (rb.offlineMult || 0)))
  return {
    cultivationSpeed: cult,
    moneyMult: alch.moneyMult * money,
    offlineMult: alch.offlineMult * offl
  }
}

// 在线被动挂机：综合所有加成的小额产出
export const idleTick = (player, seconds = 10) => {
  reapBuffs(player)
  const bonus = manorOfflineBonus(player)
  const rates = idleRates(player)
  const scale = Math.max(1, Math.min(1e14, player.maxCultivation || 100))
  const gainedCultivation = Math.min(1e14, Math.floor(scale * 0.002 * (seconds / 10) * rates.cultivationSpeed))
  const gainedMoney = Math.floor((player.level || 1) * 0.5 * (seconds / 10) * rates.moneyMult)
  const gainedHerb = Math.floor(bonus.herbsPerHour * (seconds / 3600))
  player.cultivation = (player.cultivation || 0) + gainedCultivation
  player.props.money = (player.props.money || 0) + gainedMoney
  player.props.spiritHerb = (player.props.spiritHerb || 0) + gainedHerb
  return { gainedCultivation, gainedMoney, gainedHerb }
}

// ---- 炼制与服用 ----

// 检查炼制材料是否足够
export const canCraft = (player, id) => {
  const r = recipeById(id)
  if (!r) return { ok: false, reason: '未知丹方' }
  if (r.level > (player.level || 0) + 2) return { ok: false, reason: `炼丹等级不足（需达到 ${r.level - 2} 级）` }
  const props = player.props || {}
  if ((props.spiritHerb || 0) < (r.cost.spiritHerb || 0)) return { ok: false, reason: '灵草不足' }
  if ((props.money || 0) < (r.cost.money || 0)) return { ok: false, reason: '灵石不足' }
  if ((props.cultivateDan || 0) < (r.cost.cultivateDan || 0)) return { ok: false, reason: '培养丹不足' }
  if (r.cost.material && r.cost.material.key && (props[r.cost.material.key] || 0) < (r.cost.material.qty || 0)) return { ok: false, reason: `缺少核心材料【${matNameOf(r.cost.material.key)}】` }
  return { ok: true, recipe: r }
}

// ---- 材料标注（供界面显示“已有 / 需要 / 所缺”）----

// 单张丹方的材料清单：[{ key, name, need, have, ok, type, core }]
export const recipeCostList = (player, id) => {
  const r = typeof id === 'object' ? id : recipeById(id)
  return r ? costRows(player, r.cost, matNameOf) : []
}

// 炼制此丹方还需的境界等级（0 表示当前境界已够）
export const recipeNeedLevel = (player, id) => {
  const r = typeof id === 'object' ? id : recipeById(id)
  if (!r) return 0
  return r.level > (player.level || 0) + 2 ? Math.max(1, r.level - 2) : 0
}

// 缺失汇总文案（空串=材料齐全且境界达标）
export const recipeShortfall = (player, id) => costShortfallText(recipeCostList(player, id), recipeNeedLevel(player, id))

// 炼制丹药：扣材料，入背包（可叠加）
export const craftPill = (player, id) => {
  const check = canCraft(player, id)
  if (!check.ok) return { ok: false, reason: check.reason }
  const r = check.recipe
  const props = player.props || {}
  props.spiritHerb -= r.cost.spiritHerb || 0
  props.money -= r.cost.money || 0
  props.cultivateDan -= r.cost.cultivateDan || 0
  if (r.cost.material && r.cost.material.key) props[r.cost.material.key] = (props[r.cost.material.key] || 0) - (r.cost.material.qty || 0)
  // 成功率：品阶越高越低，保底约 5 成；词条「炼丹成功率」加成
  const base = TIER_CRAFT_SUCCESS[Math.max(0, Math.min(10, r.tier - 1))] || 0.4
  const chance = Math.min(0.98, Math.max(0.4, base + (equippedExtras(player).alchemyRate || 0)))
  if (Math.random() > chance) {
    props.spiritHerb += Math.floor((r.cost.spiritHerb || 0) / 2)
    props.money += Math.floor((r.cost.money || 0) / 2)
    props.cultivateDan += Math.floor((r.cost.cultivateDan || 0) / 2)
    return { ok: false, reason: '炼制失败，损耗一半材料' }
  }
  if (!player.pills) player.pills = []
  const existing = player.pills.find(p => p.id === id)
  if (existing) existing.count += 1
  else player.pills.push({ id, count: 1 })
  bumpDaily(player, 'alchemy')
  bumpCraftRank(player, 'alchemy', r.tier)
  return { ok: true, recipe: r }
}

// 永久加成的落点：基础属性直接加到玩家
const applyPermanent = (player, eff = {}) => {
  // 永久属性随境界成长，避免后期跟不上百分比型限时加成
  const lvlMult = 1 + (player.level || 0) * 0.015
  if (eff.attack) player.attack = (player.attack || 0) + eff.attack * lvlMult
  if (eff.defense) player.defense = (player.defense || 0) + eff.defense * lvlMult
  if (eff.health) {
    const v = eff.health * lvlMult
    player.health = (player.health || 0) + v
    player.maxHealth = (player.maxHealth || 0) + v
  }
  if (eff.critical) player.critical = (player.critical || 0) + eff.critical
  if (eff.dodge) player.dodge = (player.dodge || 0) + eff.dodge
  if (eff.cultivationSpeed) player.cultivationSpeed = (player.cultivationSpeed || 1) + eff.cultivationSpeed
  if (eff.lifespan) player.lifespanBonus = (player.lifespanBonus || 0) + eff.lifespan
  if (eff.moneyMult || eff.offlineMult) {
    if (!player.alchemy) player.alchemy = { moneyMult: 1, offlineMult: 1 }
    if (eff.moneyMult) player.alchemy.moneyMult *= eff.moneyMult
    if (eff.offlineMult) player.alchemy.offlineMult *= eff.offlineMult
  }
  // 重新估算评分（与装备面板一致）
  player.score = scoreOf(player)
}

const scoreOf = player => {
  const weights = { attack: 1.5, health: 1.0, defense: 1.2, critRate: 1.8, dodgeRate: 1.6 }
  const dodge = player.dodge || 0
  const attack = player.attack || 0
  const health = player.maxHealth || 0
  const critical = player.critical || 0
  const defense = player.defense || 0
  return Math.floor(
    dodge * weights.dodgeRate * 100 + attack * weights.attack + (health / 100) * weights.health + defense * weights.defense + critical * weights.critRate * 100
  )
}

// 服用丹药
export const usePill = (player, id) => {
  const pill = (player.pills || []).find(p => p.id === id)
  if (!pill || pill.count <= 0) return { ok: false, reason: '没有该丹药' }
  const r = recipeById(id)
  if (!r) return { ok: false, reason: '未知丹方' }

  if (r.category === 'buff') {
    const eff = {}
    if (r.buff.cultivation) eff.cultivation = Math.min(r.buff.cultivation, 3)
    if (r.buff.offlineMult) eff.offlineMult = Math.min(r.buff.offlineMult, 3)
    if (r.buff.moneyMult) eff.moneyMult = Math.min(r.buff.moneyMult, 3)
    if (!player.buffs) player.buffs = []
    player.buffs.push({
      name: r.name,
      effect: eff,
      durationMinutes: r.buff.minutes,
      quality: r.quality,
      expireAt: Date.now() + r.buff.minutes * 60000
    })
  } else {
    // 永久属性丹：耐药性上限
    const resistCap = Math.max(3, 12 - r.tier)
    if (!player.pillUses) player.pillUses = {}
    if ((player.pillUses[id] || 0) >= resistCap) return { ok: false, reason: `已产生耐药性（上限 ${resistCap} 次），无法再服用` }
    player.pillUses[id] = (player.pillUses[id] || 0) + 1
    applyPermanent(player, r.permanent || {})
  }

  pill.count -= 1
  if (pill.count <= 0) player.pills = player.pills.filter(p => p.id !== id)
  return { ok: true, recipe: r, buff: r.category === 'buff' }
}

// 背包中已有丹药的合计数量
export const pillCount = (player, id) => {
  const p = (player.pills || []).find(x => x.id === id)
  return p ? p.count : 0
}

// 批量服用：永久丹逐颗生效；限时丹按颗数折算延长时长
export const usePillBatch = (player, id, count) => {
  const r = recipeById(id)
  if (!r) return { ok: false, reason: '未知丹方' }
  const held = pillCount(player, id)
  if (held < count) return { ok: false, reason: `库存不足（${held}/${count}）` }
  if (r.category === 'buff') {
    const first = usePill(player, id)
    if (!first.ok) return first
    if (count > 1) {
      const buff = (player.buffs || []).filter(b => b.name === r.name).sort((a, b) => b.expireAt - a.expireAt)[0]
      if (buff) buff.expireAt += (count - 1) * r.buff.minutes * 60000
      const pill = (player.pills || []).find(p => p.id === id)
      if (pill) {
        pill.count -= count - 1
        if (pill.count <= 0) player.pills = player.pills.filter(p => p.id !== id)
      }
    }
    return { ok: true, count, buff: true }
  }
  for (let i = 0; i < count; i++) {
    const u = usePill(player, id)
    if (!u.ok) return u
  }
  return { ok: true, count }
}
