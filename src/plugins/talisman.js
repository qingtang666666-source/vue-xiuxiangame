// 符箓系统 —— 朱砂灵墨书就的一次性法符，炼制后可即时使用或增益
//
// 丹方思维：10 品阶 × 12 类别 = 120 种符箓。
//   即时类：疗伤(回血)/聚气(涨修为)/化财(得灵石)
//   增益类：攻伐(攻击%)/御守(防御%)/锐目(暴击)/幻身(闪避)/悟道(修炼)/聚财(灵石)/养神(离线)/破邪(特效)/混元(复合)

import { addBuff } from './buffs.js'
import { bumpCraftRank, craftLevelOfTier, tierFlat, tierPct, tierBuff, tierCapBoost } from './craft.js'
import { tierMaterial, matNameOf } from './materialDb.js'

// mult = 数值型倍率（化财等直接得灵石、炼制消耗），pct = 百分比型倍率（攻/防/暴/闪/修炼/收益）
const TALISMAN_META = [
  { t: 1, name: '黄符', q: 'info' },
  { t: 2, name: '玄符', q: 'success' },
  { t: 3, name: '地符', q: 'primary' },
  { t: 4, name: '天符', q: 'purple' },
  { t: 5, name: '仙符', q: 'pink' },
  { t: 6, name: '帝符', q: 'warning' },
  { t: 7, name: '神符', q: 'danger' },
  { t: 8, name: '灵符', q: 'cyan' },
  { t: 9, name: '皇符', q: 'orange' },
  { t: 10, name: '圣符', q: 'gold' },
  { t: 11, name: '道符', q: 'legendary' }
]
export const TALISMAN_TIERS = TALISMAN_META.map(m => ({ ...m, mult: tierFlat(m.t), pct: tierPct(m.t) }))

const CATEGORIES = [
  { key: 'heal', kind: 'instant', type: 'heal', desc: '朱砂书就，回天续命。', stems: ['回春', '续命', '活络', '生肌', '固本', '培元'], eff: (m, p) => ({ value: 0.05 * p }) },
  { key: 'cultivate', kind: 'instant', type: 'cultivation', desc: '聚灵成符，修为暴涨。', stems: ['聚气', '凝元', '吐纳', '化灵', '汇海', '归一'], eff: (m, p) => ({ value: 0.05 * p }) },
  { key: 'money', kind: 'instant', type: 'money', desc: '点石成金，财源滚滚。', stems: ['点石', '聚宝', '招财', '纳福', '金雨', '富甲'], eff: m => ({ value: m }) },
  { key: 'atkbuff', kind: 'buff', desc: '加持攻伐，战意昂扬。', stems: ['破军', '裂山', '斩龙', '碎星', '镇岳', '开天'], eff: (m, p, cb) => ({ attack: Math.min(3 * cb, 0.03 * p) }) },
  { key: 'defbuff', kind: 'buff', desc: '金刚护体，外邪难侵。', stems: ['金刚', '铁壁', '御岳', '磐石', '玄龟', '不动'], eff: (m, p, cb) => ({ defense: Math.min(3 * cb, 0.03 * p) }) },
  { key: 'critbuff', kind: 'buff', desc: '锐目洞微，招招致命。', stems: ['锐眼', '入微', '点睛', '贯日', '屠龙', '灭世'], eff: (m, p, cb) => ({ critical: Math.min(0.5 * cb, 0.01 * p) }) },
  { key: 'dodgebuff', kind: 'buff', desc: '幻身无影，难以捉摸。', stems: ['轻身', '飘渺', '凌波', '踏风', '无影', '无形'], eff: (m, p, cb) => ({ dodge: Math.min(0.5 * cb, 0.01 * p) }) },
  { key: 'cultbuff', kind: 'buff', desc: '悟道加持，修行如飞。', stems: ['顿悟', '灵感', '入神', '坐照', '明心', '慧心'], eff: (m, p, cb) => ({ cultivation: Math.min(3 * cb, 0.03 * p) }) },
  { key: 'moneybuff', kind: 'buff', desc: '财气附体，灵石如雨。', stems: ['财来', '进宝', '运旺', '纳财', '广进', '如山'], eff: (m, p, cb) => ({ moneyMult: Math.min(3 * cb, 0.03 * p) }) },
  { key: 'offlbuff', kind: 'buff', desc: '养神安魂，离线亦有得。', stems: ['安神', '长息', '坐忘', '抱元', '大定', '养精'], eff: (m, p, cb) => ({ offlineMult: Math.min(3 * cb, 0.03 * p) }) },
  { key: 'effectbuff', kind: 'buff', desc: '破邪祛魅，特效频出。', stems: ['破邪', '镇煞', '驱魔', '诛邪', '荡寇', '净世'], eff: (m, p, cb) => ({ effectBoost: Math.min(0.2 * cb, 0.008 * p) }) },
  { key: 'compoundbuff', kind: 'buff', desc: '混元一气，全面加持。', stems: ['混元', '太一', '紫府', '周天', '先天', '无极'], eff: (m, p, cb) => ({ attack: Math.min(2 * cb, 0.02 * p), defense: Math.min(2 * cb, 0.02 * p), cultivation: Math.min(2 * cb, 0.02 * p) }) },
  { key: 'dual', kind: 'buff', desc: '攻守兼备，进退自如。', stems: ['兼修', '刚柔', '两仪', '太极', '乾坤', '阴阳'], eff: (m, p, cb) => ({ attack: Math.min(2 * cb, 0.015 * p), defense: Math.min(2 * cb, 0.015 * p) }) },
  { key: 'finesse', kind: 'buff', desc: '灵犀一点，身随意动。', stems: ['灵犀', '神行', '妙法', '入微', '意动', '心随'], eff: (m, p, cb) => ({ critical: Math.min(0.4 * cb, 0.008 * p), dodge: Math.min(0.4 * cb, 0.008 * p) }) },
  { key: 'harvest', kind: 'buff', desc: '机缘连连，诸运汇聚。', stems: ['机缘', '天缘', '福运', '鸿运', '文运', '武运'], eff: (m, p, cb) => ({ cultivation: Math.min(2 * cb, 0.02 * p), moneyMult: Math.min(2 * cb, 0.02 * p), offlineMult: Math.min(2 * cb, 0.02 * p) }) },
  { key: 'maim', kind: 'buff', desc: '一念破敌，锐不可当。', stems: ['破敌', '诛心', '裂胆', '碎魂', '斩念', '灭志'], eff: (m, p, cb) => ({ attack: Math.min(2 * cb, 0.02 * p), critical: Math.min(0.3 * cb, 0.006 * p) }) }
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
  const p = tier.pct
  const cb = tierCapBoost(tier.t)
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
    recipe.instant = cat.eff(m, p)
    recipe.effectText = instantText(cat.type, recipe.instant.value)
  } else {
    // 高品阶符箓三处同时拉开：增益倍率(tierBuff)、增益上限(talismanBuffCap)、持续时间
    recipe.buff = { ...clampBuff(cat.eff(m, tierBuff(tier.t), cb), tier.t), minutes: talismanMinutes(tier.t) }
    recipe.effectText = buffText(recipe.buff)
  }
  return recipe
}

// 符箓持续时间：黄符 20 分钟 → 道符 约 172 分钟
export const talismanMinutes = tier => Math.round(12 + 8 * Math.pow(Math.max(1, tier || 1), 1.25))

// 符箓增益的生效上限按品阶放宽：
//   攻/防/修/财/离线 1.2 → 3.36（道阶）
//   暴击/闪避/特效   0.25 → 0.40（道阶，这类本就受 80% 总封顶，只小幅放宽）
// 这是「高阶符一定比上一个大境界的符更强」的关键——否则五阶以后全部撞同一个天花板。
export const talismanBuffCap = (key, tier) => {
  const t = Math.max(1, Math.min(11, Math.round(tier || 1)))
  const soft = key === 'critical' || key === 'dodge' || key === 'effectBoost'
  return soft ? 0.25 * (1 + (t - 1) * 0.06) : 1.2 * tierCapBoost(t)
}

// 把配方算出的增益裁到该品阶上限内，保证「界面显示 = 实际生效」
const clampBuff = (eff, tier) => {
  const out = {}
  Object.keys(eff).forEach(k => {
    out[k] = k === 'minutes' ? eff[k] : Math.min(eff[k], talismanBuffCap(k, tier))
  })
  return out
}

const instantText = (type, m) => {
  if (type === 'heal') return `恢复气血 ${Math.round(m * 100)}%`
  if (type === 'cultivation') return `获得修为 ${Math.round(m * 100)}%`
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
    // 上限已按品阶写在配方里（见 talismanBuffCap），这里只做兜底裁剪
    Object.keys(r.buff).forEach(k => {
      if (k !== 'minutes') eff[k] = Math.min(r.buff[k] || 0, talismanBuffCap(k, r.tier))
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
