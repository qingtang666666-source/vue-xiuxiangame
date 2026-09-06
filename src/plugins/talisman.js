// 符箓系统 —— 朱砂灵墨书就的一次性法符，炼制后可即时使用或增益
//
// 丹方思维：10 品阶 × 12 类别 = 120 种符箓。
//   即时类：疗伤(回血)/聚气(涨修为)/化财(得灵石)
//   增益类：攻伐(攻击%)/御守(防御%)/锐目(暴击)/幻身(闪避)/悟道(修炼)/聚财(灵石)/养神(离线)/破邪(特效)/混元(复合)

import { addBuff } from './buffs.js'
import { bumpCraftRank, craftLevelOfTier } from './craft.js'
import { tierMaterial, matNameOf } from './materialDb.js'

export const TALISMAN_TIERS = [
  { t: 1, name: '黄符', q: 'info', mult: 1 },
  { t: 2, name: '玄符', q: 'success', mult: 1.7 },
  { t: 3, name: '地符', q: 'primary', mult: 2.8 },
  { t: 4, name: '天符', q: 'purple', mult: 4.5 },
  { t: 5, name: '仙符', q: 'pink', mult: 7 },
  { t: 6, name: '帝符', q: 'warning', mult: 11 },
  { t: 7, name: '神符', q: 'danger', mult: 17 },
  { t: 8, name: '灵符', q: 'cyan', mult: 26 },
  { t: 9, name: '皇符', q: 'orange', mult: 40 },
  { t: 10, name: '圣符', q: 'gold', mult: 62 },
  { t: 11, name: '道符', q: 'legendary', mult: 100 }
]

const CATEGORIES = [
  { key: 'heal', kind: 'instant', type: 'heal', desc: '朱砂书就，回天续命。', stems: ['回春', '续命', '活络', '生肌', '固本', '培元'], eff: m => ({ value: 0.05 * m }) },
  { key: 'cultivate', kind: 'instant', type: 'cultivation', desc: '聚灵成符，修为暴涨。', stems: ['聚气', '凝元', '吐纳', '化灵', '汇海', '归一'], eff: m => ({ value: 0.05 * m }) },
  { key: 'money', kind: 'instant', type: 'money', desc: '点石成金，财源滚滚。', stems: ['点石', '聚宝', '招财', '纳福', '金雨', '富甲'], eff: m => ({ value: m }) },
  { key: 'atkbuff', kind: 'buff', desc: '加持攻伐，战意昂扬。', stems: ['破军', '裂山', '斩龙', '碎星', '镇岳', '开天'], eff: m => ({ attack: Math.min(3, 0.03 * m) }) },
  { key: 'defbuff', kind: 'buff', desc: '金刚护体，外邪难侵。', stems: ['金刚', '铁壁', '御岳', '磐石', '玄龟', '不动'], eff: m => ({ defense: Math.min(3, 0.03 * m) }) },
  { key: 'critbuff', kind: 'buff', desc: '锐目洞微，招招致命。', stems: ['锐眼', '入微', '点睛', '贯日', '屠龙', '灭世'], eff: m => ({ critical: Math.min(0.5, 0.01 * m) }) },
  { key: 'dodgebuff', kind: 'buff', desc: '幻身无影，难以捉摸。', stems: ['轻身', '飘渺', '凌波', '踏风', '无影', '无形'], eff: m => ({ dodge: Math.min(0.5, 0.01 * m) }) },
  { key: 'cultbuff', kind: 'buff', desc: '悟道加持，修行如飞。', stems: ['顿悟', '灵感', '入神', '坐照', '明心', '慧心'], eff: m => ({ cultivation: Math.min(3, 0.03 * m) }) },
  { key: 'moneybuff', kind: 'buff', desc: '财气附体，灵石如雨。', stems: ['财来', '进宝', '运旺', '纳财', '广进', '如山'], eff: m => ({ moneyMult: Math.min(3, 0.03 * m) }) },
  { key: 'offlbuff', kind: 'buff', desc: '养神安魂，离线亦有得。', stems: ['安神', '长息', '坐忘', '抱元', '大定', '养精'], eff: m => ({ offlineMult: Math.min(3, 0.03 * m) }) },
  { key: 'effectbuff', kind: 'buff', desc: '破邪祛魅，特效频出。', stems: ['破邪', '镇煞', '驱魔', '诛邪', '荡寇', '净世'], eff: m => ({ effectBoost: Math.min(0.2, 0.008 * m) }) },
  { key: 'compoundbuff', kind: 'buff', desc: '混元一气，全面加持。', stems: ['混元', '太一', '紫府', '周天', '先天', '无极'], eff: m => ({ attack: Math.min(2, 0.02 * m), defense: Math.min(2, 0.02 * m), cultivation: Math.min(2, 0.02 * m) }) },
  { key: 'dual', kind: 'buff', desc: '攻守兼备，进退自如。', stems: ['兼修', '刚柔', '两仪', '太极', '乾坤', '阴阳'], eff: m => ({ attack: Math.min(2, 0.015 * m), defense: Math.min(2, 0.015 * m) }) },
  { key: 'finesse', kind: 'buff', desc: '灵犀一点，身随意动。', stems: ['灵犀', '神行', '妙法', '入微', '意动', '心随'], eff: m => ({ critical: Math.min(0.4, 0.008 * m), dodge: Math.min(0.4, 0.008 * m) }) },
  { key: 'harvest', kind: 'buff', desc: '机缘连连，诸运汇聚。', stems: ['机缘', '天缘', '福运', '鸿运', '文运', '武运'], eff: m => ({ cultivation: Math.min(2, 0.02 * m), moneyMult: Math.min(2, 0.02 * m), offlineMult: Math.min(2, 0.02 * m) }) },
  { key: 'maim', kind: 'buff', desc: '一念破敌，锐不可当。', stems: ['破敌', '诛心', '裂胆', '碎魂', '斩念', '灭志'], eff: m => ({ attack: Math.min(2, 0.02 * m), critical: Math.min(0.3, 0.006 * m) }) }
]

// 符箓类型表（战斗/防御/控制/修炼/经济/辅助），用于界面筛选
export const TALISMAN_GROUPS = [
  { key: 'combat', name: '战斗', icon: '⚔️' },
  { key: 'defense', name: '防御', icon: '🛡️' },
  { key: 'control', name: '控制', icon: '⛩️' },
  { key: 'cultivate', name: '修炼', icon: '🌀' },
  { key: 'economy', name: '经济', icon: '💰' },
  { key: 'support', name: '辅助', icon: '🌿' }
]

const GROUP_BY_CAT = {
  heal: 'support',
  cultivate: 'cultivate',
  money: 'economy',
  atkbuff: 'combat',
  defbuff: 'defense',
  critbuff: 'combat',
  dodgebuff: 'defense',
  cultbuff: 'cultivate',
  moneybuff: 'economy',
  offlbuff: 'cultivate',
  effectbuff: 'control',
  compoundbuff: 'combat',
  dual: 'combat',
  finesse: 'combat',
  harvest: 'cultivate',
  maim: 'combat'
}

const buildTalisman = (tier, cat) => {
  const m = tier.mult
  const stem = cat.stems[(tier.t - 1) % cat.stems.length]
  const recipe = {
    id: `${tier.t}-${cat.key}`,
    name: `${tier.name}${stem}符`,
    quality: tier.q,
    tier: tier.t,
    tierName: tier.name,
    level: craftLevelOfTier(tier.t),
    category: cat.kind,
    kind: cat.type,
    group: GROUP_BY_CAT[cat.key],
    desc: cat.desc,
    cost: {
      spiritHerb: Math.round(1 + m),
      money: tier.t >= 5 ? Math.round(30 * m) : 0,
      cultivateDan: tier.t >= 4 ? Math.ceil((tier.t - 3) / 2) : 0,
      material: { key: tierMaterial(['矿石', '精萃', '奇珍'], tier.t)?.key, qty: Math.max(1, Math.ceil(tier.t / 2)) }
    }
  }
  if (cat.kind === 'instant') {
    recipe.instant = cat.eff(m)
    recipe.effectText = instantText(cat.type, m)
  } else {
    recipe.buff = { ...cat.eff(m), minutes: 20 + tier.t * 4 }
    recipe.effectText = buffText(recipe.buff)
  }
  return recipe
}

const instantText = (type, m) => {
  if (type === 'heal') return `恢复气血 ${Math.round(0.05 * m * 100)}%`
  if (type === 'cultivation') return `获得修为 ${Math.round(0.05 * m * 100)}%`
  return `获得灵石（按境界 & 品阶）`
}

const buffText = buff => {
  const parts = []
  const min = buff.minutes
  if (buff.attack) parts.push(`攻击 +${Math.round(buff.attack * 100)}%（${min}分钟）`)
  if (buff.defense) parts.push(`防御 +${Math.round(buff.defense * 100)}%（${min}分钟）`)
  if (buff.critical) parts.push(`暴击 +${(buff.critical * 100).toFixed(1)}%（${min}分钟）`)
  if (buff.dodge) parts.push(`闪避 +${(buff.dodge * 100).toFixed(1)}%（${min}分钟）`)
  if (buff.cultivation) parts.push(`修炼 +${Math.round(buff.cultivation * 100)}%（${min}分钟）`)
  if (buff.moneyMult) parts.push(`灵石 +${Math.round(buff.moneyMult * 100)}%（${min}分钟）`)
  if (buff.offlineMult) parts.push(`离线 +${Math.round(buff.offlineMult * 100)}%（${min}分钟）`)
  if (buff.effectBoost) parts.push(`特效 +${(buff.effectBoost * 100).toFixed(1)}%（${min}分钟）`)
  return parts.join('，')
}

// 符箓库：10 品阶 × 12 类别 = 120 种
export const TALISMANS = (() => {
  const arr = []
  TALISMAN_TIERS.forEach(tier => CATEGORIES.forEach(cat => arr.push(buildTalisman(tier, cat))))
  return arr
})()

export const talismanById = id => TALISMANS.find(t => t.id === id)

export const talismanCount = (player, id) => {
  const p = (player.talismans || []).find(x => x.id === id)
  return p ? p.count : 0
}

export const canCraftTalisman = (player, id) => {
  const r = talismanById(id)
  if (!r) return { ok: false, reason: '未知符箓' }
  if (r.level > (player.level || 0) + 2) return { ok: false, reason: `制符等级不足（需达到 ${r.level - 2} 级）` }
  const props = player.props || {}
  if ((props.spiritHerb || 0) < (r.cost.spiritHerb || 0)) return { ok: false, reason: '灵草不足' }
  if ((props.money || 0) < (r.cost.money || 0)) return { ok: false, reason: '灵石不足' }
  if ((props.cultivateDan || 0) < (r.cost.cultivateDan || 0)) return { ok: false, reason: '培养丹不足' }
  if (r.cost.material && r.cost.material.key && (props[r.cost.material.key] || 0) < (r.cost.material.qty || 0)) return { ok: false, reason: `缺少核心材料【${matNameOf(r.cost.material.key)}】` }
  return { ok: true, recipe: r }
}

export const craftTalisman = (player, id) => {
  const check = canCraftTalisman(player, id)
  if (!check.ok) return { ok: false, reason: check.reason }
  const r = check.recipe
  const props = player.props || {}
  props.spiritHerb -= r.cost.spiritHerb || 0
  props.money -= r.cost.money || 0
  props.cultivateDan -= r.cost.cultivateDan || 0
  if (r.cost.material && r.cost.material.key) props[r.cost.material.key] = (props[r.cost.material.key] || 0) - (r.cost.material.qty || 0)
  if (!player.talismans) player.talismans = []
  const ex = player.talismans.find(x => x.id === id)
  if (ex) ex.count += 1
  else player.talismans.push({ id, count: 1 })
  bumpCraftRank(player, 'talisman', r.tier)
  return { ok: true, recipe: r }
}

// 使用符箓：即时效果或追加限时增益
export const useTalisman = (player, id) => {
  const item = (player.talismans || []).find(x => x.id === id)
  if (!item || item.count <= 0) return { ok: false, reason: '没有该符箓' }
  const r = talismanById(id)
  if (!r) return { ok: false, reason: '未知符箓' }

  if (r.category === 'instant') {
    applyInstant(player, r)
  } else {
    const eff = {}
    Object.keys(r.buff).forEach(k => {
      if (k !== 'minutes') eff[k] = Math.min(r.buff[k] || 0, k === 'critical' || k === 'dodge' || k === 'effectBoost' ? 0.5 : 3)
    })
    addBuff(player, {
      name: r.name,
      effect: eff,
      durationMinutes: r.buff.minutes,
      quality: r.quality,
      expireAt: Date.now() + r.buff.minutes * 60000
    })
  }

  item.count -= 1
  if (item.count <= 0) player.talismans = player.talismans.filter(x => x.id !== id)
  return { ok: true, recipe: r, buff: r.category === 'buff' }
}

// 批量使用符箓：instant 逐个生效；buff 只激发一次并延长剩余时长，共消耗 count 张
export const useTalismanBatch = (player, id, count) => {
  const r = talismanById(id)
  if (!r) return { ok: false, reason: '未知符箓' }
  const item = (player.talismans || []).find(x => x.id === id)
  if (!item || item.count < count) return { ok: false, reason: `库存不足（${item?.count || 0}/${count}）` }
  const n = Math.max(1, Math.floor(count || 1))
  if (r.category === 'buff') {
    const first = useTalisman(player, id)
    if (!first.ok) return first
    if (n > 1) {
      const buff = (player.buffs || []).filter(b => b.name === r.name).sort((a, b) => b.expireAt - a.expireAt)[0]
      if (buff) buff.expireAt += (n - 1) * (r.buff.minutes || 1) * 60000
      const it = (player.talismans || []).find(x => x.id === id)
      if (it) {
        it.count -= (n - 1)
        if (it.count <= 0) player.talismans = player.talismans.filter(x => x.id !== id)
      }
    }
    return { ok: true, used: n, buff: r.name }
  }
  for (let k = 0; k < n; k++) {
    const u = useTalisman(player, id)
    if (!u.ok) return u
  }
  return { ok: true, used: n }
}

const applyInstant = (player, r) => {
  const k = r.kind
  const v = r.instant.value || 1
  if (k === 'heal') {
    const maxHp = player.maxHealth || 0
    player.health = Math.min(maxHp || player.health || 0, (player.health || 0) + Math.floor(maxHp * v))
  } else if (k === 'cultivation') {
    player.cultivation = (player.cultivation || 0) + Math.floor((player.maxCultivation || 100) * v)
  } else if (k === 'money') {
    player.props.money = (player.props.money || 0) + Math.floor((player.level || 1) * 20 * v)
  }
}
