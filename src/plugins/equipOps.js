// 装备操作（佩戴/卸下/批量分解出售）—— 供 homePage 及背包/批量面板复用
// 属性加减统一走 applyPlayerAttribute，行为与原 homePage 内联逻辑一致。

import { applyPlayerAttribute } from './playerAttr.js'

export const findEquip = (id, list) => (list || []).find(x => x.id === id)

// 卸下：当前穿戴装备放回背包，移除其属性加成
export const removeEquip = (player, type) => {
  const eq = player.equipment?.[type]
  if (!eq || Object.keys(eq).length === 0) return { ok: false }
  applyPlayerAttribute(player, -(eq.dodge || 0), -(eq.attack || 0), -(eq.health || 0), -(eq.critical || 0), -(eq.defense || 0))
  eq.id = Date.now()
  player.inventory.push(eq)
  player.equipment[type] = {}
  return { ok: true }
}

// 佩戴：从背包穿到对应部位；若该部位已有装备则先卸下放回背包
export const wearEquip = (player, id, type) => {
  const item = findEquip(id, player.inventory)
  if (!item) return { ok: false, reason: '该装备不存在' }
  if (!player.reincarnation && !item.noReq && item.level > player.level) {
    return { ok: false, reason: '当前境界不足' }
  }
  const cur = player.equipment?.[type]
  if (cur && Object.keys(cur).length > 0) {
    applyPlayerAttribute(player, -(cur.dodge || 0), -(cur.attack || 0), -(cur.health || 0), -(cur.critical || 0), -(cur.defense || 0))
    player.inventory.push(cur)
  }
  player.equipment[type] = item
  applyPlayerAttribute(player, item.dodge || 0, item.attack || 0, item.health || 0, item.critical || 0, item.defense || 0)
  player.inventory = player.inventory.filter(x => x.id && x.id !== id)
  return { ok: true, type }
}

// 批量分解：按选中品阶，把背包内未锁定装备折成 炼器石(等级和) + 灵石(件数)
export const dismantleEquipsByQuality = (player, qualities) => {
  if (!qualities || !qualities.length) return { ok: false, reason: 'noSelection' }
  const sell = (player.inventory || []).filter(i => qualities.includes(i.quality) && !i.lock)
  if (!sell.length) return { ok: false, reason: 'noStock' }
  const stone = sell.reduce((total, i) => {
    let level = i.level + (i.level * player.reincarnation) / 10
    level = Number(level) || 0
    return total + Math.floor(level)
  }, 0)
  player.props.money = (player.props.money || 0) + sell.length
  player.props.strengtheningStone = (player.props.strengtheningStone || 0) + stone
  player.inventory = player.inventory.filter(i => !qualities.includes(i.quality) || i.lock)
  return { ok: true, stone, count: sell.length }
}
