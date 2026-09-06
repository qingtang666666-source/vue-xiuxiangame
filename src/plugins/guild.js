// 行会商会 —— 日常交易订单，带等级规模
//
// 商会规模(凡/黄/玄/地/天/仙/神)随境界提升：单日订单越多、利润越丰厚。
// 订单每日刷新：交付指定物资，获得灵石利润与商会贡献。

import { ITEM_DB, itemDb, tierPool, weightedTierPick } from './market.js'

export const GUILD_SCALES = [
  { idx: 0, name: '凡级商会', minLevel: 1, orders: 2, margin: 0.15 },
  { idx: 1, name: '黄级商会', minLevel: 10, orders: 3, margin: 0.2 },
  { idx: 2, name: '玄级商会', minLevel: 20, orders: 4, margin: 0.25 },
  { idx: 3, name: '地级商会', minLevel: 32, orders: 5, margin: 0.3 },
  { idx: 4, name: '天级商会', minLevel: 46, orders: 6, margin: 0.35 },
  { idx: 5, name: '仙级商会', minLevel: 64, orders: 7, margin: 0.4 },
  { idx: 6, name: '神级商会', minLevel: 91, orders: 8, margin: 0.5 }
]

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min

export const guildScale = player => {
  const lv = player.level || 0
  let cur = GUILD_SCALES[0]
  GUILD_SCALES.forEach(s => {
    if (lv >= s.minLevel) cur = s
  })
  return cur
}

const generateOrders = scale => {
  const pool = tierPool(scale.idx)
  const orders = []
  for (let i = 0; i < scale.orders; i++) {
    const it = weightedTierPick(pool, scale.idx) || ITEM_DB[0]
    const qty = randInt(3, 15)
    const gain = Math.floor(it.price * (1 + scale.margin * (0.8 + Math.random() * 0.4)) * qty)
    orders.push({
      id: `order-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
      name: `收「${it.name}」`,
      desc: `向商会交付 ${it.name} ×${qty}`,
      give: { key: it.key, qty },
      gain,
      points: randInt(5, 20)
    })
  }
  return orders
}

export const ensureGuild = player => {
  if (!player.guild) player.guild = { date: '', orders: [], points: 0 }
  const today = new Date().toDateString()
  if (player.guild.date !== today) {
    player.guild.date = today
    player.guild.orders = generateOrders(guildScale(player))
  }
  return player.guild
}

export const guildOrders = player => ensureGuild(player).orders
export const guildPoints = player => ensureGuild(player).points || 0

export const doGuildTrade = (player, orderId) => {
  const guild = ensureGuild(player)
  const order = guild.orders.find(o => o.id === orderId)
  if (!order) return { ok: false, reason: '订单不存在' }
  const own = player.props[order.give.key] || 0
  if (own < order.give.qty) return { ok: false, reason: `物资不足(需 ${order.give.qty})` }
  player.props[order.give.key] = own - order.give.qty
  player.props.money += order.gain
  guild.points = (guild.points || 0) + order.points
  // 完成后移除此订单(当日可再接新单？当日订单一次性)
  guild.orders = guild.orders.filter(o => o.id !== orderId)
  return { ok: true, gain: order.gain, points: order.points, name: order.name }
}

export const canGuildTrade = (player, orderId) => {
  const guild = ensureGuild(player)
  const order = guild.orders.find(o => o.id === orderId)
  if (!order) return false
  return (player.props[order.give.key] || 0) >= order.give.qty
}
