// 筹码商店 —— 每 1 游戏日自动刷新；也可花 500 筹码立即刷新
// 售卖中阶/高阶物品，价格与市场价一致（同数值，但用筹码购买）
// 固定商品：盲盒宝箱，1000 筹码/个。开箱：5% 开出超出自身价值 1000 倍 / 70% 垃圾≤50筹码 / 25% 300~600筹码

import { RECIPES } from './alchemy.js'
import { TALISMANS } from './talisman.js'
import { MATERIALS } from './materialDb.js'
import { TREASURES, addTreasure } from './treasure.js'
import { pillPrice, talismanPrice } from './market.js'
import { totalGameDays } from './time.js'
import { TECHNIQUES, techGradeForLevel, ownedTechniqueIds, grantScroll } from './technique.js'
import equip from './equip.js'
import { equipSellPrice } from './market.js'
import { pickSetForQuality, pieceName, CHEST_SET, CHEST_SET2 } from './equipSetDb.js'

const pick = arr => arr[Math.floor(Math.random() * arr.length)]

// 每 1 游戏月（30 天）为一轮
export const chipShopCycle = player => Math.floor(totalGameDays(player) / 30)

const midPills = () => RECIPES.filter(r => r.tier >= 4)
const midMaterials = () => MATERIALS.filter(m => m.tier >= 3)
const midTreasures = () => TREASURES.filter(t => t.tier >= 4)
// 中高阶功法卷轴：品阶随境界抬升，且偏中高阶（可买到玩家尚未获得的功法）
const midTechPool = player => {
  const gate = techGradeForLevel(player.level)
  const hi = Math.min(11, Math.max(5, gate + 2))
  const lo = Math.max(3, hi - 3)
  const owned = ownedTechniqueIds(player)
  return TECHNIQUES.filter(t => t.grade >= lo && t.grade <= hi && !owned.has(t.id))
}

// 固定宝箱（含新增的功法宝箱/高阶功法宝箱）：始终出现在商店
const FIXED_CHEST_DEFS = [
  { key: 'chipBlindBox', name: '盲盒宝箱', kind: 'blindbox', qty: 5, price: 1000, fixed: true },
  { key: 'chipEquipChest', name: '装备宝箱', kind: 'equipchest', qty: 9999, unlimited: true, price: 10000, fixed: true, desc: '90% 2000~8000筹码装备 / 9% 10000~20000筹码 / 1% 无上套装(约3万筹码)' },
  { key: 'chipHighChest', name: '高阶装备宝箱', kind: 'highchest', qty: 9999, unlimited: true, price: 100000, fixed: true, desc: '90% 20000~80000筹码神装 / 9% 100000~200000筹码绝世神装 / 1% 无上神装套装(约30万筹码)' },
  { key: 'chipPillChest', name: '丹药宝箱', kind: 'pillchest', qty: 9999, unlimited: true, price: 10000, fixed: true, desc: '90% 2000~8000筹码丹药 / 9% 10000~20000筹码珍品丹 / 1% 丹药大礼包(约3万筹码)' },
  { key: 'chipHighPillChest', name: '高阶丹药宝箱', kind: 'highpillchest', qty: 9999, unlimited: true, price: 100000, fixed: true, desc: '90% 20000~80000筹码 / 9% 100000~200000筹码 / 1% 丹药大礼包(约30万筹码)' },
  { key: 'chipTalChest', name: '符箓宝箱', kind: 'talchest', qty: 9999, unlimited: true, price: 10000, fixed: true, desc: '90% 2000~8000筹码符箓 / 9% 10000~20000筹码珍品符 / 1% 符箓大礼包(约3万筹码)' },
  { key: 'chipHighTalChest', name: '高阶符箓宝箱', kind: 'hightalchest', qty: 9999, unlimited: true, price: 100000, fixed: true, desc: '90% 20000~80000筹码 / 9% 100000~200000筹码 / 1% 符箓大礼包(约30万筹码)' },
  { key: 'chipTechChest', name: '功法宝箱', kind: 'techchest', qty: 9999, unlimited: true, price: 10000, fixed: true, desc: '90% 中高阶功法卷轴 / 9% 珍品功法 / 1% 无上功法篇(三卷)' },
  { key: 'chipHighTechChest', name: '高阶功法宝箱', kind: 'hightechchest', qty: 9999, unlimited: true, price: 100000, fixed: true, desc: '90% 高阶功法卷轴 / 9% 绝世功法 / 1% 无上神功篇(三卷)' }
]

const genStock = player => {
  const stock = []
  const add = (it, price) => stock.push({ ...it, price, qty: it.qty || 1 })
  const techPrice = t => 250 + t.grade * 120 + (t.rarity || 0) * 300
  // 高阶丹药（2 种）
  const pills = midPills()
  for (let i = 0; i < 2; i++) {
    if (!pills.length) break
    const p = pick(pills)
    if (!stock.some(s => s.key === p.id)) add({ key: p.id, name: p.name, kind: 'pill', qty: 3, tierName: p.tierName }, pillPrice(p))
  }
  // 中高阶材料（3 种）
  const mats = midMaterials()
  for (let i = 0; i < 3; i++) {
    if (!mats.length) break
    const m = pick(mats)
    if (!stock.some(s => s.key === m.key)) add({ key: m.key, name: m.name, kind: 'material', qty: 5, tierName: m.tierName }, m.price)
  }
  // 天材地宝（2 件）
  const tres = midTreasures()
  for (let i = 0; i < 2; i++) {
    if (!tres.length) break
    const t = pick(tres)
    if (!stock.some(s => s.key === t.key)) add({ key: t.key, name: t.name, kind: 'treasure', qty: 1, tierName: t.tierName }, t.price)
  }
  // 中高阶功法卷轴（1~2 门）
  let techs = midTechPool(player)
  const techCount = 1 + (Math.random() < 0.5 ? 1 : 0)
  for (let i = 0; i < techCount && techs.length; i++) {
    const t = pick(techs)
    techs = techs.filter(x => x.id !== t.id)
    if (!stock.some(s => s.key === t.id)) add({ key: t.id, name: t.name, kind: 'scroll', qty: 1, tierName: t.gradeName }, techPrice(t))
  }
  // 固定宝箱：始终在货架
  FIXED_CHEST_DEFS.forEach(c => stock.push({ ...c }))
  return stock
}

export const ensureChipShop = player => {
  if (!player.chipShop) player.chipShop = { day: -1, stock: [] }
  const day = chipShopCycle(player)
  if (player.chipShop.day !== day) {
    player.chipShop.day = day
    player.chipShop.stock = genStock(player)
    return { newDay: true, stock: player.chipShop.stock }
  }
  // 旧缓存：自动补齐缺失的固定宝箱（含新增的功法宝箱），无需刷新也能看到
  const missing = FIXED_CHEST_DEFS.filter(c => !(player.chipShop.stock || []).some(s => s.key === c.key))
  if (missing.length) player.chipShop.stock = [...(player.chipShop.stock || []), ...missing.map(c => ({ ...c }))]
  return { newDay: false, stock: player.chipShop.stock }
}

// 花 500 筹码立即刷新
export const refreshChipShop = player => {
  if ((player.props.chips || 0) < 500) return { ok: false, reason: '筹码不足（需 500 筹码）' }
  player.props.chips -= 500
  player.chipShop.day = chipShopCycle(player)
  player.chipShop.stock = genStock(player)
  return { ok: true, stock: player.chipShop.stock }
}

export const buyChipItem = (player, item) => {
  if (item.qty <= 0) return { ok: false, reason: '已售罄' }
  if ((player.props.chips || 0) < item.price) return { ok: false, reason: '筹码不足' }
  player.props.chips -= item.price
  item.qty -= 1
  if (item.kind === 'material') {
    player.props[item.key] = (player.props[item.key] || 0) + 1
  } else if (item.kind === 'pill') {
    if (!player.pills) player.pills = []
    const ex = player.pills.find(p => p.id === item.key)
    if (ex) ex.count += 1
    else player.pills.push({ id: item.key, count: 1 })
  } else if (item.kind === 'treasure') {
    addTreasure(player, item.key, 1)
  } else if (item.kind === 'scroll') {
    const r = grantScroll(player, item.key)
    if (!r.ok) {
      player.props.chips += item.price
      item.qty += 1
      return { ok: false, reason: r.reason }
    }
  }
  return { ok: true, name: item.name }
}

const highTreasure = () => {
  const pool = TREASURES.filter(t => t.tier >= 10)
  return pick(pool.length ? pool : TREASURES)
}
const highMaterial = () => {
  const pool = MATERIALS.filter(m => m.tier >= 8)
  return pick(pool.length ? pool : MATERIALS)
}
const midValueItem = () => {
  // 价值 300~600
  const tres = TREASURES.filter(t => t.price >= 300 && t.price <= 600)
  if (tres.length) return { kind: 'treasure', it: pick(tres) }
  const mats = MATERIALS.filter(m => m.price >= 300 && m.price <= 600)
  if (mats.length) return { kind: 'material', it: pick(mats) }
  const maybe = MATERIALS[MATERIALS.length - 1]
  return { kind: 'material', it: maybe }
}
const junkItem = () => {
  const pool = MATERIALS.filter(m => m.price <= 50)
  return pick(pool.length ? pool : MATERIALS)
}

// 开盲盒宝箱：5% 千倍 / 40% 300~600 / 55% 返还300筹码+灵材
export const openChipBlindBox = (player, item) => {
  if (item.qty <= 0) return { ok: false, reason: '盲盒已售罄' }
  if ((player.props.chips || 0) < item.price) return { ok: false, reason: '筹码不足' }
  player.props.chips -= item.price
  item.qty -= 1
  if (!player.chipBoxLog) player.chipBoxLog = { opened: 0, jackpot: 0 }
  player.chipBoxLog.opened++
  const r = Math.random()
  const texts = []
  if ((player.chipBoxPity || 0) >= 887 || r < 0.05) {
    player.chipBoxPity = 0
    player.chipBoxLog.jackpot++
    const t = highTreasure()
    addTreasure(player, t.key, 1)
    texts.push(`顶级天材地宝【${t.name}】`)
    const m = highMaterial()
    const piles = Math.max(10, Math.min(60, Math.floor((1000000) / m.price / 4))) // 价值约 100 万筹码
    player.props[m.key] = (player.props[m.key] || 0) + piles
    texts.push(`${m.name} ×${piles}`)
    return { ok: true, jackpot: true, texts }
  }
  player.chipBoxPity = (player.chipBoxPity || 0) + 1
  if (r < 0.45) {
    const it = midValueItem()
    if (it.kind === 'treasure') {
      addTreasure(player, it.it.key, 1)
      texts.push(`天材地宝【${it.it.name}】`)
    } else {
      player.props[it.it.key] = (player.props[it.it.key] || 0) + 1
      texts.push(`${it.it.name} ×1`)
    }
    return { ok: true, texts }
  }
  const back = 300
  player.props.chips = (player.props.chips || 0) + back
  const m = junkItem()
  const q = 1 + Math.floor(Math.random() * 2)
  player.props[m.key] = (player.props[m.key] || 0) + q
  texts.push(`返还筹码 ${back}`)
  texts.push(`${m.name} ×${q}`)
  return { ok: true, texts }
}

// 依据目标价值(灵石)/品级生成一件随机装备（限类型），返回装备对象
const genEquip = (level, forceQuality) => {
  const types = ['weapon', 'armor', 'accessory', 'sutra']
  const type = types[Math.floor(Math.random() * types.length)]
  const eq = equip['equip_' + (type === 'armor' ? 'Armors' : type === 'weapon' ? 'Weapons' : type === 'accessory' ? 'Accessorys' : 'Sutras')](level, false, forceQuality)
  return eq
}

// 开装备宝箱：10000 筹码，90% / 9% / 1% 三档，无保底
export const openChipEquipChest = (player, item) => {
  if (!item.unlimited && item.qty <= 0) return { ok: false, reason: '宝箱已售罄' }
  if ((player.props.chips || 0) < 10000) return { ok: false, reason: '筹码不足(需 10000)' }
  player.props.chips -= 10000
  if (!item.unlimited) item.qty -= 1
  if (!player.inventory) player.inventory = []
  const rand = Math.random()
  const texts = []
  let jackpot = false
  const valChips = eq => Math.round(equipSellPrice(eq) / 10)
  if (rand < 0.9) {
    const eq = genEquip(Math.max(55, Math.min(player.level || 55, 110)), 'orange')
    eq.noReq = true
    player.inventory.push(eq)
    texts.push(`装备【${eq.name}】（价值约 ${valChips(eq)} 筹码）`)
  } else if (rand < 0.99) {
    const eq = genEquip(Math.max(95, Math.min(player.level || 95, 135)), 'gold')
    eq.noReq = true
    player.inventory.push(eq)
    texts.push(`珍品装备【${eq.name}】（价值约 ${valChips(eq)} 筹码）`)
  } else {
    jackpot = true
    const lv = Math.max(90, Math.min(player.level || 90, 144))
    const slots = ['weapon', 'armor', 'accessory', 'sutra']
    let total = 0
    slots.forEach(type => {
      let eq = null
      for (let i = 0; i < 40; i++) {
        const cand = genEquip(lv, 'warning')
        if (equipSellPrice(cand) >= 65000) { eq = cand; break }
      }
      if (!eq) eq = genEquip(lv, 'warning')
      eq.noReq = true
      eq.setId = CHEST_SET.id
      eq.setName = CHEST_SET.name
      player.inventory.push(eq)
      total += equipSellPrice(eq)
    })
    texts.push(`无上套装【${CHEST_SET.name}】全套（价值约 ${Math.round(total / 10)} 筹码）`)
  }
  return { ok: true, jackpot, texts }
}

// 开高阶装备宝箱：100000 筹码，价值 10 倍，无保底
export const openChipHighEquipChest = (player, item) => {
  if (!item.unlimited && item.qty <= 0) return { ok: false, reason: '宝箱已售罄' }
  if ((player.props.chips || 0) < 100000) return { ok: false, reason: '筹码不足(需 100000)' }
  player.props.chips -= 100000
  if (!item.unlimited) item.qty -= 1
  if (!player.inventory) player.inventory = []
  const rand = Math.random()
  const texts = []
  let jackpot = false
  const valChips = eq => Math.round(equipSellPrice(eq) / 10)
  if (rand < 0.9) {
    const lv = Math.max(120, Math.min(player.level || 120, 144))
    let eq = null
    for (let i = 0; i < 25; i++) { const c = genEquip(lv, 'legendary'); if (equipSellPrice(c) >= 800000) { eq = c; break } }
    if (!eq) eq = genEquip(lv, 'legendary')
    eq.noReq = true
    player.inventory.push(eq)
    texts.push(`神装【${eq.name}】（价值约 ${valChips(eq)} 筹码）`)
  } else if (rand < 0.99) {
    const lv = Math.max(138, Math.min(player.level || 138, 144))
    let eq = null
    for (let i = 0; i < 25; i++) { const c = genEquip(lv, 'legendary'); if (equipSellPrice(c) >= 1600000) { eq = c; break } }
    if (!eq) eq = genEquip(lv, 'legendary')
    eq.noReq = true
    player.inventory.push(eq)
    texts.push(`绝世神装【${eq.name}】（价值约 ${valChips(eq)} 筹码）`)
  } else {
    jackpot = true
    const lv = 144
    const slots = ['weapon', 'armor', 'accessory', 'sutra']
    let total = 0
    slots.forEach(type => {
      let eq = null
      for (let i = 0; i < 60; i++) {
        const cand = genEquip(lv, 'legendary')
        if (equipSellPrice(cand) >= 650000) { eq = cand; break }
      }
      if (!eq) eq = genEquip(lv, 'legendary')
      eq.noReq = true
      eq.setId = CHEST_SET2.id
      eq.setName = CHEST_SET2.name
      player.inventory.push(eq)
      total += equipSellPrice(eq)
    })
    texts.push(`无上神装【${CHEST_SET2.name}】全套（价值约 ${Math.round(total / 10)} 筹码）`)
  }
  return { ok: true, jackpot, texts }
}

const grantConsume = (player, kind, id, qty = 1) => {
  if (kind === 'pill') {
    if (!player.pills) player.pills = []
    const ex = player.pills.find(p => p.id === id)
    if (ex) ex.count += qty
    else player.pills.push({ id, count: qty })
  } else {
    if (!player.talismans) player.talismans = []
    const ex = player.talismans.find(p => p.id === id)
    if (ex) ex.count += qty
    else player.talismans.push({ id, count: qty })
  }
}

// 开功法宝箱：10万/1万筹码，90% 中高阶卷轴 / 9% 珍品 / 1% 无上功法（出一套高阶卷轴）
const grantTechBand = (player, lo, hi) => {
  const pool = TECHNIQUES.filter(t => t.grade >= lo && t.grade <= hi)
  const owned = ownedTechniqueIds(player)
  const avail = pool.filter(t => !owned.has(t.id))
  if (!avail.length) return null
  const t = avail[Math.floor(Math.random() * avail.length)]
  return grantScroll(player, t.id).ok ? t : null
}

const grantTechBundle = (player, lo, hi, n) => {
  const out = []
  for (let k = 0; k < n; k++) {
    const t = grantTechBand(player, lo, hi)
    if (t) out.push(t)
  }
  return out
}

export const openChipTechChest = (player, item) => {
  if (!item.unlimited && item.qty <= 0) return { ok: false, reason: '宝箱已售罄' }
  if ((player.props.chips || 0) < 10000) return { ok: false, reason: '筹码不足(需 10000)' }
  player.props.chips -= 10000
  if (!item.unlimited) item.qty -= 1
  const gate = techGradeForLevel(player.level)
  const texts = []
  let jackpot = false
  let ok = false
  const rand = Math.random()
  if (rand < 0.9) {
    const t = grantTechBand(player, Math.max(1, gate - 4), gate)
    if (t) { ok = true; texts.push(`功法卷轴【${t.name}】`) }
  } else if (rand < 0.99) {
    const t = grantTechBand(player, Math.min(gate, 11), Math.min(11, gate + 3))
    if (t) { ok = true; texts.push(`珍品功法卷轴【${t.name}】`) }
  } else {
    jackpot = true
    const bundle = grantTechBundle(player, Math.max(1, gate - 2), 11, 3)
    if (bundle.length) { ok = true; texts.push(`无上功法篇：${bundle.map(t => `【${t.name}】`).join(' ')}`) }
  }
  if (!ok) {
    player.props.chips += 10000
    return { ok: false, reason: '此档功法你已集齐，已退还筹码' }
  }
  return { ok: true, jackpot, texts }
}

export const openChipHighTechChest = (player, item) => {
  if (!item.unlimited && item.qty <= 0) return { ok: false, reason: '宝箱已售罄' }
  if ((player.props.chips || 0) < 100000) return { ok: false, reason: '筹码不足(需 100000)' }
  player.props.chips -= 100000
  if (!item.unlimited) item.qty -= 1
  const gate = techGradeForLevel(player.level)
  const texts = []
  let jackpot = false
  let ok = false
  const rand = Math.random()
  if (rand < 0.9) {
    const t = grantTechBand(player, Math.min(11, gate + 1), Math.min(11, gate + 4))
    if (t) { ok = true; texts.push(`高阶功法卷轴【${t.name}】`) }
  } else if (rand < 0.99) {
    const t = grantTechBand(player, Math.min(11, Math.max(10, gate)), 11)
    if (t) { ok = true; texts.push(`绝世功法卷轴【${t.name}】`) }
  } else {
    jackpot = true
    const bundle = grantTechBundle(player, 9, 11, 3)
    if (bundle.length) { ok = true; texts.push(`无上神功篇：${bundle.map(t => `【${t.name}】`).join(' ')}`) }
  }
  if (!ok) {
    player.props.chips += 100000
    return { ok: false, reason: '此档功法你已集齐，已退还筹码' }
  }
  return { ok: true, jackpot, texts }
}
const pickConsumeByValue = (kind, minChips, maxChips) => {
  const list = kind === 'pill' ? RECIPES : TALISMANS
  const val = it => (kind === 'pill' ? pillPrice(it) : talismanPrice(it)) / 10
  let best = null, bestDiff = Infinity
  for (let i = 0; i < 100; i++) {
    const it = list[Math.floor(Math.random() * list.length)]
    const v = val(it)
    if (v >= minChips && v <= maxChips) return it
    const diff = Math.abs(v - (minChips + maxChips) / 2)
    if (diff < bestDiff) { bestDiff = diff; best = it }
  }
  return best
}
export const openChipConsumableChest = (player, item, kind, price, scale) => {
  if (!item.unlimited && item.qty <= 0) return { ok: false, reason: '宝箱已售罄' }
  if ((player.props.chips || 0) < price) return { ok: false, reason: `筹码不足(需 ${price})` }
  player.props.chips -= price
  if (!item.unlimited) item.qty -= 1
  const rand = Math.random()
  const texts = []
  let jackpot = false
  const lab = kind === 'pill' ? '丹药' : '符箓'
  const val = it => Math.round((kind === 'pill' ? pillPrice(it) : talismanPrice(it)) / 10)
  const grantBand = (min, max, lab) => {
    const it = pickConsumeByValue(kind, min, max)
    const unit = (kind === 'pill' ? pillPrice(it) : talismanPrice(it)) / 10
    let qty = 1
    if (unit < min) qty = Math.max(1, Math.ceil(min / unit))
    if (qty * unit > max) qty = Math.max(1, Math.floor(max / unit))
    grantConsume(player, kind, it.id, qty)
    texts.push(`${lab}【${it.name}】×${qty}（价值约 ${Math.round(unit * qty)} 筹码）`)
  }
  if (rand < 0.9) {
    grantBand(2000 * scale, 8000 * scale, lab)
  } else if (rand < 0.99) {
    grantBand(10000 * scale, 20000 * scale, `珍品${lab}`)
  } else {
    jackpot = true
    let total = 0
    const names = []
    for (let i = 0; i < 25 && total < 30000 * scale; i++) {
      const it = pickConsumeByValue(kind, 5000 * scale, 12000 * scale)
      grantConsume(player, kind, it.id, 1)
      total += (kind === 'pill' ? pillPrice(it) : talismanPrice(it)) / 10
      names.push(it.name)
    }
    texts.push(`${lab}大礼包（${names.slice(0, 6).join('、')}${names.length > 6 ? '…' : ''}）`)
  }
  return { ok: true, jackpot, texts }
}
export const openChipPillChest = (player, item) => openChipConsumableChest(player, item, 'pill', 10000, 1)
export const openChipHighPillChest = (player, item) => openChipConsumableChest(player, item, 'pill', 100000, 10)
export const openChipTalChest = (player, item) => openChipConsumableChest(player, item, 'talisman', 10000, 1)
export const openChipHighTalChest = (player, item) => openChipConsumableChest(player, item, 'talisman', 100000, 10)

// 商品详情（点击查看介绍/属性）
export const itemInfo = it => {
  let desc = ''
  let tier = it.tierName || ''
  if (it.kind === 'material') {
    const m = MATERIALS.find(x => x.key === it.key)
    if (m) {
      desc = m.desc || ''
      tier = m.tierName || tier
    }
  } else if (it.kind === 'pill') {
    const r = RECIPES.find(x => x.id === it.key)
    if (r) {
      desc = r.effectText || ''
      tier = r.tierName || tier
    }
  } else if (it.kind === 'treasure') {
    const t = TREASURES.find(x => x.key === it.key)
    if (t) {
      desc = t.desc || ''
      tier = t.tierName || tier
    }
  } else if (it.kind === 'blindbox') {
    desc = '不定的宝物：5% 千倍暴击 / 70% 垃圾(≤50筹码) / 25% 300~600筹码；888 次保底必出千倍暴击。'
  } else if (it.kind === 'equipchest') {
    desc = '90% 开出一件 无限制可装备(价值约2000~8000筹码) / 9% 珍品(约10000~20000筹码) / 1% 无上套装「鸿蒙万宝套」(约30000筹码)，无保底。'
  } else if (it.kind === 'highchest') {
    desc = '90% 开出一件 无限制神装(约20000~80000筹码) / 9% 绝世神装(约100000~200000筹码) / 1% 无上神装套装「太虚无极套」(约300000筹码)，无保底。'
  } else if (it.kind === 'pillchest') {
    desc = '90% 开出 2000~8000筹码丹药 / 9% 10000~20000筹码珍品丹 / 1% 丹药大礼包(约3万筹码)，无保底。'
  } else if (it.kind === 'highpillchest') {
    desc = '90% 开出 20000~80000筹码丹药 / 9% 100000~200000筹码珍品丹 / 1% 丹药大礼包(约30万筹码)，无保底。'
  } else if (it.kind === 'talchest') {
    desc = '90% 开出 2000~8000筹码符箓 / 9% 10000~20000筹码珍品符 / 1% 符箓大礼包(约3万筹码)，无保底。'
  } else if (it.kind === 'hightalchest') {
    desc = '90% 开出 20000~80000筹码符箓 / 9% 100000~200000筹码珍品符 / 1% 符箓大礼包(约30万筹码)，无保底。'
  } else if (it.kind === 'scroll') {
    const t = TECHNIQUES.find(x => x.id === it.key)
    desc = t ? `${t.familyName}功法（${t.gradeName}），主修、参悟后按熟练度生效；参悟以根骨资质 × 悟性判定成败。` : '功法卷轴，参悟以根骨资质 × 悟性判定成败。'
    tier = t?.gradeName || tier
  } else if (it.kind === 'prop') {
    desc = '通用修士物资。'
  }
  return {
    name: it.name,
    tier,
    desc,
    price: it.price,
    kind: it.kind,
    kindLabel: { pill: '丹药', material: '材料', treasure: '天材地宝', blindbox: '宝箱', equipchest: '装备宝箱', highchest: '高阶装备宝箱', pillchest: '丹药宝箱', highpillchest: '高阶丹药宝箱', talchest: '符箓宝箱', hightalchest: '高阶符箓宝箱', scroll: '功法', prop: '杂货' }[it.kind] || it.kind
  }
}
