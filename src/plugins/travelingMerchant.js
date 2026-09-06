// 游商 —— 每 2 游戏月(60天)刷新，售卖契合当前境界突破/修行所需的丹药与材料
// 弹窗：本轮首次进入/刷新时弹出；可购买，售完即止。

import { RECIPES } from './alchemy.js'
import { MATERIALS } from './materialDb.js'
import { TREASURES, addTreasure } from './treasure.js'
import { pillPrice } from './market.js'
import { realmStageOf } from './game.js'
import { totalGameDays } from './time.js'
import { TECHNIQUES, techGradeForLevel, ownedTechniqueIds, grantScroll } from './technique.js'

const pick = arr => arr[Math.floor(Math.random() * arr.length)]
const clamp = (lo, hi, v) => Math.max(lo, Math.min(hi, v))
const DISCOUNTS = [0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9] // 5折~9折
const randDiscount = () => DISCOUNTS[Math.floor(Math.random() * DISCOUNTS.length)]

export const travellingCycle = player => Math.floor(totalGameDays(player) / 60) // 每60天=2个月

const genStock = player => {
  const lv = player.level || 1
  const stage = Math.max(0, realmStageOf(lv))
  const pillTier = clamp(1, 11, 1 + Math.floor(stage / 1.5))
  const matTier = clamp(0, 10, Math.floor(stage / 1.5))
  const danNeed = Math.max(1, Math.ceil(lv / 15))
  const stock = []
  const add = (item, basePrice) => {
    const d = randDiscount()
    stock.push({ ...item, price: Math.max(1, Math.floor(basePrice * d)), discount: d })
  }
  // 突破关键：培养丹（本境界突破所需，翻倍供应）
  add({ key: 'cultivateDan', name: '培养丹', kind: 'prop', qty: Math.max(4, danNeed * 2) }, 260 + lv * 2)
  // 2 枚本境界丹药
  const pillPool = RECIPES.filter(r => r.tier === pillTier)
  for (let i = 0; i < 2; i++) {
    if (pillPool.length) {
      const p = pick(pillPool)
      if (!stock.some(s => s.key === p.id)) add({ key: p.id, name: p.name, kind: 'pill', qty: 3, tierName: p.tierName }, pillPrice(p) * 1.2)
    }
  }
  // 3 份本境界材料
  const matPool = MATERIALS.filter(m => m.tier === matTier)
  for (let i = 0; i < 3; i++) {
    if (matPool.length) {
      const m = pick(matPool)
      if (!stock.some(s => s.key === m.key)) add({ key: m.key, name: m.name, kind: 'material', qty: 5, tierName: m.tierName }, m.price * 1.2)
    }
  }
  // 1~2 件天材地宝
  const treCount = Math.random() < 0.5 ? 2 : 1
  for (let i = 0; i < treCount; i++) {
    const t = pick(TREASURES)
    if (!stock.some(s => s.key === t.key)) add({ key: t.key, name: t.name, kind: 'treasure', qty: 1, tierName: t.tierName }, t.price * 1.3)
  }
  // 固定盲盒：1000~10000 灵石，开到惊喜
  stock.push({ key: 'blindBox', name: '神秘盲盒', kind: 'blindbox', qty: 3, price: 1000 + Math.floor(Math.random() * 9001) })
  // 少量功法卷轴：品阶随境界抬升，只上架未获得的
  const owned = ownedTechniqueIds(player)
  const scrollPool = TECHNIQUES.filter(t => t.grade <= techGradeForLevel(player.level) && !owned.has(t.id))
  if (scrollPool.length && Math.random() < 0.4) {
    const t = pick(scrollPool)
    const price = 400 + t.grade * 380 + (t.rarity || 0) * 1200
    stock.push({ key: t.id, name: t.name, kind: 'scroll', qty: 1, tierName: t.gradeName, price })
  }
  return stock
}

const topTreasure = () => {
  const pool = TREASURES.filter(x => x.tier >= 8)
  return pick(pool.length ? pool : TREASURES)
}
const topMaterial = () => {
  const pool = MATERIALS.filter(m => m.tier >= 8)
  return pick(pool.length ? pool : MATERIALS)
}
const nearTreasure = target => {
  const tier = Math.max(1, Math.min(11, Math.ceil(target / 4500)))
  const pool = TREASURES.filter(x => x.tier === tier)
  return pick(pool.length ? pool : TREASURES)
}
const junkItem = () => {
  const pool = MATERIALS.filter(m => m.tier <= 1)
  return pick(pool.length ? pool : MATERIALS)
}

export const blindBoxPity = player => player.blindBoxPity || 0

const logOpen = (player, key, qty = 1) => {
  if (!player.blindBoxLog) player.blindBoxLog = { opened: 0, jackpot: 0, items: {} }
  player.blindBoxLog.items[key] = (player.blindBoxLog.items[key] || 0) + qty
}

// 开盲盒：5% 1000倍 / 45% 等值 / 50% 低值；保底888次必出1000倍
export const openBlindBox = (player, item) => {
  if (item.qty <= 0) return { ok: false, reason: '盲盒已售罄' }
  if ((player.props.money || 0) < item.price) return { ok: false, reason: '灵石不足' }
  player.props.money -= item.price
  item.qty -= 1
  if (!player.blindBoxLog) player.blindBoxLog = { opened: 0, jackpot: 0, items: {} }
  player.blindBoxLog.opened++
  const cost = item.price
  const texts = []
  const r = Math.random()
  if ((player.blindBoxPity || 0) >= 888 || r < 0.05) {
    player.blindBoxPity = 0
    player.blindBoxLog.jackpot++
    const t = topTreasure()
    addTreasure(player, t.key, 1)
    logOpen(player, t.key, 1)
    texts.push(`天材地宝【${t.name}】`)
    const m = topMaterial()
    const piles = Math.max(2, Math.min(30, Math.floor((cost * 1000) / 80000)))
    player.props[m.key] = (player.props[m.key] || 0) + piles
    logOpen(player, m.key, piles)
    texts.push(`${m.name} ×${piles}`)
    const cur = Math.max(5, Math.min(60, Math.floor((cost * 1000) / 150000)))
    player.props.currency = (player.props.currency || 0) + cur
    logOpen(player, 'currency', cur)
    texts.push(`混沌石 ×${cur}`)
    return { ok: true, jackpot: true, texts }
  }
  player.blindBoxPity = (player.blindBoxPity || 0) + 1
  if (r < 0.5) {
    const t = nearTreasure(cost)
    addTreasure(player, t.key, 1)
    logOpen(player, t.key, 1)
    texts.push(`天材地宝【${t.name}】`)
    return { ok: true, texts }
  }
  const m = junkItem()
  const q = 1 + Math.floor(Math.random() * 3)
  player.props[m.key] = (player.props[m.key] || 0) + q
  logOpen(player, m.key, q)
  texts.push(`${m.name} ×${q}`)
  return { ok: true, texts }
}

const recordSeen = (player, stock) => {
  if (!player.travSeen) player.travSeen = {}
  stock.forEach(it => {
    if (!player.travSeen[it.key]) player.travSeen[it.key] = { name: it.name, kind: it.kind, tierName: it.tierName || '' }
  })
}

export const ensureTravelingMerchant = player => {
  if (!player.travelingMerchant) player.travelingMerchant = { cycle: -1, stock: [], show: false }
  const cyc = travellingCycle(player)
  if (player.travelingMerchant.cycle !== cyc) {
    player.travelingMerchant.cycle = cyc
    player.travelingMerchant.stock = genStock(player)
    player.travelingMerchant.show = true
    recordSeen(player, player.travelingMerchant.stock)
    return { newCycle: true, stock: player.travelingMerchant.stock }
  }
  return { newCycle: false, stock: player.travelingMerchant.stock }
}

// 强制刷新（GM 用）：无视周期直接进一批新货
export const refreshTravelingMerchant = player => {
  if (!player.travelingMerchant) player.travelingMerchant = { cycle: -1, stock: [], show: false }
  player.travelingMerchant.cycle = travellingCycle(player)
  player.travelingMerchant.stock = genStock(player)
  player.travelingMerchant.show = true
  recordSeen(player, player.travelingMerchant.stock)
  return player.travelingMerchant.stock
}

export const buyTravItem = (player, item) => {
  if (item.qty <= 0) return { ok: false, reason: '已售罄' }
  if ((player.props.money || 0) < item.price) return { ok: false, reason: '灵石不足' }
  player.props.money -= item.price
  item.qty -= 1
  if (item.kind === 'prop' || item.kind === 'material') player.props[item.key] = (player.props[item.key] || 0) + 1
  else if (item.kind === 'pill') {
    if (!player.pills) player.pills = []
    const ex = player.pills.find(p => p.id === item.key)
    if (ex) ex.count += 1
    else player.pills.push({ id: item.key, count: 1 })
  } else if (item.kind === 'treasure') addTreasure(player, item.key, 1)
  else if (item.kind === 'scroll') {
    const r = grantScroll(player, item.key)
    if (!r.ok) {
      player.props.money += item.price
      item.qty += 1
      return { ok: false, reason: r.reason }
    }
  }
  return { ok: true, name: item.name }
}
