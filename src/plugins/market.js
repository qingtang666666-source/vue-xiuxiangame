// 下界贸易 —— 交易坊市 / 交易会 / 黑市 / 拍卖会 / 赌石，均带等级规模
//
// 市场规模(凡/黄/玄/地/天/仙/神)随境界提升：越高规模解锁越多货品，价格越优。
// 所有物品均有价格(灵石)；坊市标准价买卖，交易会折扣+大宗，黑市高价收稀有，
// 拍卖会出价拍得，赌石赌远古石(50%垃圾/5%百倍/45%等值)。

import { RECIPES } from './alchemy.js'
import { TALISMANS } from './talisman.js'
import equip from './equip.js'
import { MATERIALS, materialByKey } from './materialDb.js'
import { totalGameDays } from './time.js'
import { craftLevelOfTier } from './craft.js'
import { sourceOfEquip, sourceOfMaterial, sourceOfPill, sourceOfTalisman } from './itemSource.js'

export const MARKET_SCALES = [
  { idx: 0, name: '凡级', minLevel: 1, buy: 1.0, sell: 0.55, fair: 0.9, black: 1.7, auction: 1.2 },
  { idx: 1, name: '黄级', minLevel: 10, buy: 0.97, sell: 0.57, fair: 0.87, black: 1.8, auction: 1.35 },
  { idx: 2, name: '玄级', minLevel: 20, buy: 0.94, sell: 0.6, fair: 0.84, black: 1.9, auction: 1.5 },
  { idx: 3, name: '地级', minLevel: 32, buy: 0.9, sell: 0.63, fair: 0.8, black: 2.0, auction: 1.7 },
  { idx: 4, name: '天级', minLevel: 46, buy: 0.86, sell: 0.66, fair: 0.76, black: 2.1, auction: 1.9 },
  { idx: 5, name: '仙级', minLevel: 64, buy: 0.82, sell: 0.7, fair: 0.72, black: 2.2, auction: 2.1 },
  { idx: 6, name: '神级', minLevel: 91, buy: 0.78, sell: 0.74, fair: 0.68, black: 2.35, auction: 2.4 }
]

export const ITEM_DB = [
  { key: 'spiritHerb', name: '灵草', price: 60, desc: '炼丹 / 制符原料', minScale: 0 },
  { key: 'strengtheningStone', name: '炼器石', price: 120, desc: '炼器材料', minScale: 0 },
  { key: 'zhuSha', name: '朱砂', price: 180, desc: '制符灵墨', minScale: 0 },
  { key: 'qingyuan', name: '情缘', price: 200, desc: '情缘信物', minScale: 1 },
  { key: 'flying', name: '传送符', price: 300, desc: '遁行宝物', minScale: 1 },
  { key: 'cultivateDan', name: '培养丹', price: 90, desc: '培养灵宠 / 丹药原料', minScale: 2 },
  { key: 'zhenQi', name: '阵旗', price: 380, desc: '布阵圣物', minScale: 2 },
  { key: 'xuanTie', name: '玄铁', price: 450, desc: '炼器天材', minScale: 3 },
  { key: 'rootBone', name: '悟性丹', price: 600, desc: '增强悟性', minScale: 4 },
  { key: 'yaoDan', name: '妖丹', price: 900, desc: '妖兽内丹', minScale: 5 },
  { key: 'currency', name: '混沌石', price: 1600, desc: '稀世货币', minScale: 6 },
  // 大目录：修仙材料/灵药（含品级/种类/描述），可批量交易、掉落与GM生成
  ...MATERIALS
]

export const itemDb = key => ITEM_DB.find(i => i.key === key)

const PILL_TYPES = ['药材', '灵果', '丹药']
const EQUIP_TYPES = ['矿石', '矿材', '兽材', '精萃', '奇珍']

const hashStr = s => {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

// 快捷出售：统一 8 折（0.8）回收手上物品/丹药/符箓
export const QUICK_SELL_RATE = 0.8
export const quickSellUnit = (kind, key) => {
  if (kind === 'pill') {
    const r = RECIPES.find(x => x.id === key)
    return r ? Math.floor(pillPrice(r) * QUICK_SELL_RATE) : 0
  }
  if (kind === 'tal') {
    const t = TALISMANS.find(x => x.id === key)
    return t ? Math.floor(talismanPrice(t) * QUICK_SELL_RATE) : 0
  }
  const it = itemDb(key)
  return it ? Math.floor(it.price * QUICK_SELL_RATE) : 0
}

export const quickSell = (player, kind, key, qty = 1) => {
  if (kind === 'pill') {
    const p = (player.pills || []).find(x => x.id === key)
    if (!p || p.count < qty) return { ok: false, reason: '数量不足' }
    const unit = quickSellUnit('pill', key)
    p.count -= qty
    if (p.count <= 0) player.pills = player.pills.filter(x => x.id !== key)
    player.props.money = (player.props.money || 0) + unit * qty
    return { ok: true, gain: unit * qty, name: RECIPES.find(x => x.id === key)?.name || key }
  }
  if (kind === 'tal') {
    const t = (player.talismans || []).find(x => x.id === key)
    if (!t || t.count < qty) return { ok: false, reason: '数量不足' }
    const unit = quickSellUnit('tal', key)
    t.count -= qty
    if (t.count <= 0) player.talismans = player.talismans.filter(x => x.id !== key)
    player.props.money = (player.props.money || 0) + unit * qty
    return { ok: true, gain: unit * qty, name: TALISMANS.find(x => x.id === key)?.name || key }
  }
  const owned = player.props[key] || 0
  if (owned < qty) return { ok: false, reason: '数量不足' }
  const unit = quickSellUnit('prop', key)
  player.props[key] = owned - qty
  player.props.money = (player.props.money || 0) + unit * qty
  return { ok: true, gain: unit * qty, name: itemDb(key)?.name || key }
}

export const equipQuickSellPrice = eq => Math.floor(equipSellPrice(eq) * QUICK_SELL_RATE)

// 装备快捷出售（8折）：从背包移除，折价换灵石
export const quickSellEquip = (player, eqId) => {
  const idx = (player.inventory || []).findIndex(x => x.id === eqId)
  if (idx < 0) return { ok: false, reason: '未找到该装备' }
  const eq = player.inventory[idx]
  const gain = equipQuickSellPrice(eq)
  player.inventory.splice(idx, 1)
  player.props.money = (player.props.money || 0) + gain
  return { ok: true, gain, name: eq.name }
}

// 贴近当前档位的加权随机：同级权重1，每低一级权重减半；
// 只纳入「minScale <= 档位 且 不低于档位-2」的物品，避免高等级源疯狂掉低品。
export const tierPool = (targetTier = 0) =>
  ITEM_DB.filter(i => i.minScale <= targetTier && i.minScale >= Math.max(0, targetTier - 2))

export const weightedTierPick = (pool, targetTier = 0) => {
  if (!pool || !pool.length) return null
  const weights = pool.map(it => Math.pow(0.5, Math.max(0, (targetTier || 0) - (it.minScale ?? 0))))
  const total = weights.reduce((a, b) => a + b, 0)
  let r = Math.random() * total
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i]
    if (r <= 0) return pool[i]
  }
  return pool[pool.length - 1]
}

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min

// 市场行情：随游戏时间周期性起伏（约 45 游戏天一个周期，0.85~1.15）
// >1 牛市：卖出更值钱；<1 熊市：买入更便宜。用于低买高卖/囤货。
export const marketTide = player => {
  const days = totalGameDays(player)
  const phase = Math.sin((days / 45) * Math.PI * 2)
  return 1 + phase * 0.15
}
export const tideLabel = tide => (tide > 1.05 ? '牛市' : tide < 0.95 ? '熊市' : '平稳')

// 当前市场规模
export const marketScale = player => {
  const lv = player.level || 0
  let cur = MARKET_SCALES[0]
  MARKET_SCALES.forEach(s => {
    if (lv >= s.minLevel) cur = s
  })
  return cur
}

export const availableItems = (player, place) => {
  const idx = marketScale(player).idx
  const day = Math.floor(totalGameDays(player) / 2) // 每 2 游戏日轮换上架
  const pfx = place ? place.id + ':' : 'common:'
  const spec = place?.specialty
  const CRAFT_TYPES = ['药材', '灵果', '矿石', '矿材', '兽材', '精萃', '奇珍']
  // 当前修为最多可炼的品级（含越 2 级），据此只常驻上架所需的核心材料
  const cap = (player.level || 0) + 2
  let maxTier = 1
  for (let i = 1; i <= 11; i++) if (craftLevelOfTier(i) <= cap) maxTier = i
  const matTierCap = Math.max(0, Math.min(10, maxTier - 1))
  return ITEM_DB.filter(i => {
    if (i.minScale > idx) return false
    if (spec === 'pill' && !PILL_TYPES.includes(i.type)) return false
    if (spec === 'equip' && !EQUIP_TYPES.includes(i.type)) return false
    if (spec === 'material' && !i.type) return false
    // 炼丹/炼器/制符核心材料：始终上架（限定当前可炼品级）
    if (i.type && CRAFT_TYPES.includes(i.type)) return (i.tier ?? 0) <= matTierCap
    if (spec === 'pill' || spec === 'equip' || spec === 'material') return true
    return hashStr(pfx + i.key + ':' + day) % 100 < 62
  })
}

// ---- 交易坊市：标准价买 / 折价卖 ----
export const marketBuy = (player, key, qty = 1) => {
  const it = itemDb(key)
  if (!it || it.minScale > marketScale(player).idx) return { ok: false, reason: '本坊市未供应' }
  const bulk = qty >= 10
  const mult = bulk ? (qty >= 100 ? 0.8 : qty >= 50 ? 0.85 : 0.9) : 1
  const cost = Math.max(1, Math.floor(it.price * marketScale(player).buy * marketTide(player) * mult * qty))
  if ((player.props.money || 0) < cost) return { ok: false, reason: '灵石不足' }
  player.props.money -= cost
  player.props[key] = (player.props[key] || 0) + qty
  return { ok: true, name: it.name, qty, cost, bulk }
}

export const marketSell = (player, key, qty = 1) => {
  const it = itemDb(key)
  if (!it) return { ok: false, reason: '未知商品' }
  const owned = player.props[key] || 0
  if (owned < qty) return { ok: false, reason: '数量不足' }
  const gain = Math.max(1, Math.floor(it.price * marketScale(player).sell * marketTide(player) * qty))
  player.props[key] = owned - qty
  player.props.money += gain
  return { ok: true, name: it.name, qty, gain }
}

// ---- 交易会：折扣 + 大宗优惠 ----
export const fairPrice = (player, key, qty = 1) => {
  const it = itemDb(key)
  if (!it || it.minScale > marketScale(player).idx) return -1
  const bulk = qty >= 10
  const mult = bulk ? (qty >= 100 ? 0.8 : qty >= 50 ? 0.85 : 0.9) : 1
  const base = it.price * marketScale(player).fair * marketTide(player) * mult
  return Math.max(1, Math.floor(base))
}

export const fairBuy = (player, key, qty = 1) => {
  const it = itemDb(key)
  if (!it) return { ok: false, reason: '未知商品' }
  const bulk = qty >= 10
  const unit = fairPrice(player, key, qty)
  if (unit < 0) return { ok: false, reason: '本交易会未供应' }
  const cost = unit * qty
  if ((player.props.money || 0) < cost) return { ok: false, reason: '灵石不足' }
  player.props.money -= cost
  player.props[key] = (player.props[key] || 0) + qty
  return { ok: true, name: it.name, qty, cost, bulk }
}

export const fairSell = (player, key, qty = 1) => {
  const it = itemDb(key)
  if (!it) return { ok: false, reason: '未知商品' }
  const owned = player.props[key] || 0
  if (owned < qty) return { ok: false, reason: '数量不足' }
  const gain = Math.max(1, Math.floor(it.price * 0.62 * qty))
  player.props[key] = owned - qty
  player.props.money += gain
  return { ok: true, name: it.name, qty, gain }
}

// ---- 黑市：高价收稀有，限量 ----
export const blackStock = (player, place) => {
  const scale = marketScale(player)
  // 黑市主收“高一档”的稀有货：越高阶黑市，越能见到稀缺高品
  const cap = Math.min(6, scale.idx + 1)
  const day = Math.floor(totalGameDays(player) / 2)
  const pfx = place ? place.id + ':' : 'common:'
  const spec = place?.specialty
  const rareTypes = ['精萃', '奇珍', '兽材']
  const keep = i => hashStr(pfx + i.key + ':' + day) % 100 < 74
  const inRange = i => i.minScale >= Math.max(0, scale.idx - 1) && i.minScale <= cap
  let pool = ITEM_DB.filter(i => inRange(i) && keep(i) && (spec === 'rare' ? rareTypes.includes(i.type) : true))
  if (!pool.length) pool = ITEM_DB.filter(i => i.minScale <= cap && keep(i) && (spec === 'rare' ? rareTypes.includes(i.type) : true))
  return pool.map(i => ({ ...i, base: i.price, price: Math.max(1, Math.floor(i.price * scale.black)), stock: randInt(1, 8) }))
}

export const blackBuy = (player, item, qty = 1) => {
  if (item.stock < qty) return { ok: false, reason: '库存不足' }
  const cost = item.price * qty
  if ((player.props.money || 0) < cost) return { ok: false, reason: '灵石不足' }
  player.props.money -= cost
  player.props[item.key] = (player.props[item.key] || 0) + qty
  item.stock -= qty
  return { ok: true, name: item.name, qty, cost }
}

// ---- 拍卖会：出价拍得，可能被抬价 ----
// ---- 成品货（丹药 / 符箓 / 装备）：按成本或评分定价，可拍卖/黑市/寄售 ----

const ingredientValue = r => {
  const c = r.cost || {}
  return (c.spiritHerb || 0) * 60 + (c.money || 0) + (c.cultivateDan || 0) * (itemDb('cultivateDan')?.price || 90) + (c.material?.qty || 0) * (materialByKey(c.material?.key)?.price || 0)
}

// 按服用效果强度定价：永久属性 / 限时幅度×时长 参与估值，效果越强越值钱
const effectValue = r => {
  const p = r.permanent || {}
  const b = r.buff || {}
  let v = 0
  v += (p.attack || 0) * 6
  v += (p.defense || 0) * 5
  v += (p.health || 0) * 0.6
  v += (p.critical || 0) * 3000
  v += (p.dodge || 0) * 3000
  v += (p.cultivationSpeed || 0) * 30000
  v += (p.moneyMult || 0) * 20000
  v += (p.lifespan || 0) * 500
  if (r.category === 'buff' && b) {
    const mins = b.minutes || 30
    let inc = ((b.cultivation || 0) + (b.moneyMult || 0) + (b.offlineMult || 0)) * 20000
    inc += ((b.attack || 0) + (b.defense || 0)) * 2000
    inc += ((b.critical || 0) + (b.dodge || 0)) * 6000
    inc += (b.effectBoost || 0) * 25000
    v += inc * (mins / 30)
  }
  return Math.floor(v)
}

const recipeValue = r => ingredientValue(r) + effectValue(r)

export const pillPrice = r => Math.max(100, Math.floor(recipeValue(r) * 1.5 + (r.tier || 0) * 60))
export const talismanPrice = t => Math.max(100, Math.floor(recipeValue(t) * 1.5 + (t.tier || 0) * 60))
export const pillSellPrice = r => Math.floor(pillPrice(r) * 0.8)
export const talismanSellPrice = t => Math.floor(talismanPrice(t) * 0.8)
export const equipSellPrice = eq => {
  const base = QUALITY_BASE[eq.quality] || 100
  const grade = eq.grade || 1
  const lv = eq.level || 1
  const stg = eq.strengthen || 0
  const gradeBoost = 1 + (grade - 1) * 0.35
  const statPart = Math.floor((eq.score || 0) * 0.45)
  const lvBoost = 1 + lv / 60
  const stgBoost = Math.floor(base * 0.08 * stg * gradeBoost)
  return Math.max(50, Math.floor((statPart + base) * gradeBoost * lvBoost + stgBoost))
}

// 货品档位上限：随境界抬升，允许多 2 档（「稍微超一点但不离谱」）
export const tierCapOf = (player, over = 2) => Math.min(11, Math.max(1, Math.floor((player.level || 1) / 13) + over))

export const pillListing = (player) => {
  const cap = tierCapOf(player)
  const pool = RECIPES.filter(r => (r.tier || 0) <= cap)
  const r = pool[randInt(0, pool.length - 1)] || RECIPES[0]
  const v = pillPrice(r)
  return { kind: 'pill', refId: r.id, name: r.name, quality: r.quality, price: v, value: v, bid: v, desc: r.effectText, qty: 1 }
}
export const talismanListing = (player) => {
  const cap = tierCapOf(player)
  const pool = TALISMANS.filter(t => (t.tier || 0) <= cap)
  const t = pool[randInt(0, pool.length - 1)] || TALISMANS[0]
  const v = talismanPrice(t)
  return { kind: 'talisman', refId: t.id, name: t.name, quality: t.quality, price: v, value: v, bid: v, desc: t.effectText, qty: 1 }
}

const QUALITY_BASE = { info: 100, success: 200, primary: 350, purple: 600, pink: 900, warning: 1400, danger: 2000, cyan: 2800, orange: 3800, gold: 5200, legendary: 7000 }
export const equipListing = player => {
  const types = ['weapon', 'armor', 'accessory', 'sutra']
  const type = types[randInt(0, types.length - 1)]
  const level = Math.max(1, Math.min(player.level || 1, 144))
  const eq = equip['equip_' + (type === 'armor' ? 'Armors' : type === 'weapon' ? 'Weapons' : type === 'accessory' ? 'Accessorys' : 'Sutras')](level)
  const base = equipSellPrice(eq)
  const price = Math.max(300, Math.floor(base * 1.3))
  return { kind: 'equip', equip: eq, name: eq.name, quality: eq.quality, price, value: base, bid: base, desc: `${eq.gradeName || ''}${eq.level}级`, qty: 1 }
}

const grantCraft = (player, item, qty) => {
  if (item.kind === 'pill') {
    if (!player.pills) player.pills = []
    const ex = player.pills.find(p => p.id === item.refId)
    if (ex) ex.count += qty
    else player.pills.push({ id: item.refId, count: qty })
  } else if (item.kind === 'talisman') {
    if (!player.talismans) player.talismans = []
    const ex = player.talismans.find(p => p.id === item.refId)
    if (ex) ex.count += qty
    else player.talismans.push({ id: item.refId, count: qty })
  } else if (item.kind === 'equip') {
    if (!player.inventory) player.inventory = []
    for (let i = 0; i < qty; i++) player.inventory.push({ ...item.equip, id: Date.now() + i })
  } else {
    player.props[item.key] = (player.props[item.key] || 0) + qty
  }
}

const buyListing = (player, item, qty = 1) => {
  const cost = item.price * qty
  if ((player.props.money || 0) < cost) return { ok: false, reason: '灵石不足' }
  player.props.money -= cost
  grantCraft(player, item, qty)
  return { ok: true, name: item.name, qty, cost }
}

// 拍卖拍品：随机资源 / 丹药 / 符箓 / 装备
export const auctionRoll = player => {
  const roll = Math.random()
  if (roll < 0.4) {
    const pool = availableItems(player)
    const it = pool[randInt(0, pool.length - 1)] || ITEM_DB[0]
    const bid = Math.max(10, Math.floor(it.price * marketScale(player).auction * (1 + Math.random() * 0.5)))
    return { kind: 'resource', key: it.key, name: it.name, quality: 'info', bid, value: it.price, desc: it.desc, qty: 1 }
  }
  if (roll < 0.62) return pillListing(player)
  if (roll < 0.82) return talismanListing(player)
  return equipListing(player)
}

export const auctionBuy = (player, item) => {
  if ((player.props.money || 0) < item.bid) return { ok: false, reason: '灵石不足' }
  player.props.money -= item.bid
  grantCraft(player, item, item.qty || 1)
  return { ok: true, name: item.name, bid: item.bid }
}

// —— 拍卖会（周期）—— 每 1 个真实自然日刷新一场，只上高价值拍品（丹/符/器），不再混入廉价资源
export const AUCTION_CYCLE_MS = 24 * 3600 * 1000
export const auctionCycleNow = () => Math.floor(Date.now() / AUCTION_CYCLE_MS)

const auctionGoodRoll = (player, place) => {
  const seed = place ? hashStr(place.id) : 0
  const r = (Math.random() + (seed % 5) * 0.05) % 1
  const cap = tierCapOf(player, 2)
  const spec = place?.specialty
  const kind = spec === 'equip' || spec === 'auction' ? (r < 0.6 ? 'equip' : r < 0.85 ? 'talisman' : 'pill') : (r < 0.4 ? 'pill' : r < 0.7 ? 'talisman' : 'equip')
  if (kind === 'pill') {
    let pool = RECIPES.filter(x => (x.tier || 0) >= 4 && (x.tier || 0) <= cap)
    if (!pool.length) pool = RECIPES.filter(x => (x.tier || 0) <= cap)
    const p = pool.length ? pool[randInt(0, pool.length - 1)] : RECIPES[0]
    const v = pillPrice(p)
    return { kind: 'pill', refId: p.id, name: p.name, quality: p.quality, price: v, value: v, bid: Math.max(v, Math.floor(v * (1 + Math.random() * 0.3))), desc: p.effectText, qty: 1 }
  }
  if (kind === 'talisman') {
    let pool = TALISMANS.filter(x => (x.tier || 0) >= 4 && (x.tier || 0) <= cap)
    if (!pool.length) pool = TALISMANS.filter(x => (x.tier || 0) <= cap)
    const t = pool.length ? pool[randInt(0, pool.length - 1)] : TALISMANS[0]
    const v = talismanPrice(t)
    return { kind: 'talisman', refId: t.id, name: t.name, quality: t.quality, price: v, value: v, bid: Math.max(v, Math.floor(v * (1 + Math.random() * 0.3))), desc: t.effectText, qty: 1 }
  }
  const types = ['weapon', 'armor', 'accessory', 'sutra']
  const type = types[randInt(0, 3)]
  const level = Math.max(1, Math.min(player.level || 1, 144))
  const eq = equip['equip_' + (type === 'armor' ? 'Armors' : type === 'weapon' ? 'Weapons' : type === 'accessory' ? 'Accessorys' : 'Sutras')](level)
  const base = equipSellPrice(eq)
  return { kind: 'equip', equip: eq, name: eq.name, quality: eq.quality, price: Math.max(300, Math.floor(base * 1.3)), value: base, bid: Math.max(base, Math.floor(base * (1 + Math.random() * 0.4))), desc: `${eq.gradeName || ''}${eq.level}级`, qty: 1 }
}

export const auctionLots = (player, place) => {
  const cycle = auctionCycleNow()
  if (!player.auction || player.auction.cycle !== cycle || (place && player.auction.place !== place.id)) {
    const count = 4 + randInt(0, 2)
    const lots = []
    for (let i = 0; i < count; i++) lots.push(auctionGoodRoll(player, place))
    player.auction = { cycle, lots, place: place ? place.id : null }
  }
  return { lots: player.auction.lots, nextIn: (cycle + 1) * AUCTION_CYCLE_MS - Date.now() }
}

export const auctionBuyLot = (player, item) => {
  if (!item || item.sold) return { ok: false, reason: '拍品已成交' }
  if ((player.props.money || 0) < item.bid) return { ok: false, reason: '灵石不足' }
  player.props.money -= item.bid
  grantCraft(player, item, item.qty || 1)
  item.sold = true
  return { ok: true, name: item.name, bid: item.bid }
}

// 黑市：稀有成品
export const blackCraftList = (player) => {
  const list = []
  if (Math.random() < 0.8) list.push(pillListing(player))
  if (Math.random() < 0.7) list.push(talismanListing(player))
  if (Math.random() < 0.6) list.push(equipListing(player))
  return list.map(x => ({ ...x, stock: randInt(1, 3), value: x.value || x.price, price: Math.floor(x.price * 1.6) }))
}
export const blackCraftBuy = (player, item, qty = 1) => {
  if (item.stock < qty) return { ok: false, reason: '库存不足' }
  const cost = item.price * qty
  if ((player.props.money || 0) < cost) return { ok: false, reason: '灵石不足' }
  player.props.money -= cost
  item.stock -= qty
  grantCraft(player, item, qty)
  return { ok: true, name: item.name, qty, cost }
}

// 坊市·奇珍阁：随机成品（丹药/符箓/灵器）
export const randomCraftList = (player, count = 3, place) => {
  const arr = []
  const seed = place ? hashStr(place.id) : 0
  const spec = place?.specialty
  for (let i = 0; i < count; i++) {
    const r = (Math.random() + (seed % 7) * 0.04) % 1
    if (spec === 'pill') arr.push(r < 0.7 ? pillListing(player) : r < 0.9 ? talismanListing(player) : equipListing(player))
    else if (spec === 'equip') arr.push(r < 0.7 ? equipListing(player) : r < 0.9 ? talismanListing(player) : pillListing(player))
    else if (spec === 'auction') arr.push(r < 0.5 ? equipListing(player) : r < 0.8 ? talismanListing(player) : pillListing(player))
    else arr.push(r < 0.4 ? pillListing(player) : r < 0.7 ? talismanListing(player) : equipListing(player))
  }
  return arr
}
export const marketCraftBuy = (player, item, qty = 1) => buyListing(player, item, qty)

// 市场地点（多处坊市/拍卖行/黑市/商会），各带特色与价格微调
export const MARKET_PLACES = [
  { id: 'jinguan', name: '锦官城坊市', kind: 'market', flavor: '车水马龙，货通八方', mod: 1.0, specialty: 'general' },
  { id: 'tiangong', name: '天工阁拍卖行', kind: 'auction', flavor: '奇珍云集，价高者得', mod: 1.05, specialty: 'auction' },
  { id: 'wanbao', name: '万宝斋商店', kind: 'market', flavor: '老字号，诚信经营', mod: 0.97, specialty: 'general' },
  { id: 'heiyun', name: '黑云寨黑市', kind: 'black', flavor: '来路不明，童叟无欺', mod: 1.1, specialty: 'rare' },
  { id: 'jubao', name: '聚宝商会', kind: 'guild', flavor: '替人跑腿，薄利多销', mod: 0.96, specialty: 'bulk' },
  { id: 'lingbao', name: '灵宝阁', kind: 'auction', flavor: '灵物荟萃，机缘难得', mod: 1.02, specialty: 'equip' },
  { id: 'danshi', name: '丹师坊', kind: 'market', flavor: '丹药飘香，以丹会友', mod: 1.0, specialty: 'pill' },
  { id: 'zhenyi', name: '镇夷交易所', kind: 'guild', flavor: '南北通商，眼力为王', mod: 0.98, specialty: 'material' }
]
export const marketPlace = id => MARKET_PLACES.find(p => p.id === id)

// 悬停物品详情文本（购买场景通用）：丹药/符箓/装备/材料 各自拼出关键信息
export const itemTip = it => {
  if (!it) return ''
  if (it.kind === 'pill' && it.refId) {
    const r = RECIPES.find(x => x.id === it.refId)
    return `【${it.name}】${r?.tierName || ''}\n${r?.effectText || ''}${r?.detail ? `\n${r.detail}` : ''}\n${sourceOfPill()}\n市价约 ${pillPrice(r || {})} 灵石`
  }
  if (it.kind === 'talisman' && it.refId) {
    const t = TALISMANS.find(x => x.id === it.refId)
    return `【${it.name}】${t?.tierName || ''}\n${t?.effectText || ''}\n${sourceOfTalisman()}\n市价约 ${talismanPrice(t || {})} 灵石`
  }
  if (it.kind === 'equip') {
    const eq = it.equip || it
    return `【${eq.name}】${eq.gradeName || ''}${eq.level || ''}级\n攻击 ${Math.round(eq.attack || 0)} · 防御 ${Math.round(eq.defense || 0)} · 气血 ${Math.round(eq.health || 0)} · 暴击 ${((eq.critical || 0) * 100).toFixed(1)}%\n${sourceOfEquip(eq)}`
  }
  const db = itemDb(it.key || it.refId) || (it.minScale != null ? it : null)
  return `${db?.name || it.name}${db?.tierName ? '（' + db.tierName + '）' : ''}\n${db?.desc || ''}\n${sourceOfMaterial(db)}\n市价约 ${it.price ?? db?.price ?? 0} 灵石`
}

// 寄售：把自己的丹药/符箓/装备卖出
export const sellPill = (player, refId, qty = 1) => {
  const r = RECIPES.find(x => x.id === refId)
  if (!r) return { ok: false, reason: '未知丹药' }
  const p = (player.pills || []).find(x => x.id === refId)
  if (!p || p.count < qty) return { ok: false, reason: '数量不足' }
  const gain = Math.floor(pillPrice(r) * 0.8) * qty
  p.count -= qty
  if (p.count <= 0) player.pills = player.pills.filter(x => x.id !== refId)
  player.props.money += gain
  return { ok: true, name: r.name, qty, gain }
}

export const sellTalisman = (player, refId, qty = 1) => {
  const t = TALISMANS.find(x => x.id === refId)
  if (!t) return { ok: false, reason: '未知符箓' }
  const p = (player.talismans || []).find(x => x.id === refId)
  if (!p || p.count < qty) return { ok: false, reason: '数量不足' }
  const gain = Math.floor(talismanPrice(t) * 0.8) * qty
  p.count -= qty
  if (p.count <= 0) player.talismans = player.talismans.filter(x => x.id !== refId)
  player.props.money += gain
  return { ok: true, name: t.name, qty, gain }
}

export const sellEquip = (player, equipId, qty = 1) => {
  const idx = (player.inventory || []).findIndex(e => e.id === equipId)
  if (idx < 0) return { ok: false, reason: '未持有' }
  const eq = player.inventory[idx]
  const gain = equipSellPrice(eq)
  player.inventory.splice(idx, qty)
  player.props.money += gain
  return { ok: true, name: eq.name, gain }
}

// ---- 赌石：远古石 ----
export const STONE_PRICE = 500
export const GAMBLE_DAILY = 50

const giveValueItem = (player, targetValue) => {
  const it = ITEM_DB[randInt(0, ITEM_DB.length - 1)]
  const qty = Math.max(1, Math.floor(targetValue / it.price))
  player.props[it.key] = (player.props[it.key] || 0) + qty
  return { name: it.name, qty, value: it.price * qty }
}

export const gambleStone = player => {
  // 每日次数上限，避免 100 倍高期望被无限刷
  const today = new Date().toDateString()
  if (player.gambleDay !== today) {
    player.gambleDay = today
    player.gambleCount = 0
  }
  if ((player.gambleCount || 0) >= GAMBLE_DAILY) return { ok: false, reason: `今日赌石次数已用完(${GAMBLE_DAILY}次)，明日再来` }
  if ((player.props.money || 0) < STONE_PRICE) return { ok: false, reason: '灵石不足，买不起远古石' }
  player.gambleCount = (player.gambleCount || 0) + 1
  player.props.money -= STONE_PRICE
  // 保底：连续 60 次未出百倍，必出一次
  const pity = player.gamblePity || 0
  const forceJackpot = pity >= 60
  const r = forceJackpot ? 0.54 : Math.random()
  player.gamblePity = pity + 1
  if (r < 0.5) {
    const garbage = randInt(5, 30)
    player.props.money += garbage
    return { ok: true, tier: 'garbage', stone: STONE_PRICE, result: { name: '废石渣', qty: 1, value: garbage }, garbage }
  }
  if (r < 0.55) {
    player.gamblePity = 0
    const result = giveValueItem(player, STONE_PRICE * 120)
    return { ok: true, tier: 'jackpot', stone: STONE_PRICE, result }
  }
  const result = giveValueItem(player, Math.floor(STONE_PRICE * randInt(9, 12) / 10))
  return { ok: true, tier: 'normal', stone: STONE_PRICE, result }
}
