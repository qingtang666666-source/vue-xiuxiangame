// 转世商店 —— 以「道行」兑换永久传承加成（跨轮回生效）
//
// 道行由每次「轮回」结算产出；此处消费道行购买永久加成。
// 加成统一回到 idleRates / effectivePlayerStats / playerLifespan 等已有聚合点，
// 只需在 rebirth.js 里并入 daoBonus(player)，其余系统自然生效。

export const DAO_SHOP_ITEMS = [
  { key: 'cultivationSpeed', name: '悟道', icon: '🧠', desc: '修炼速度', unit: '%', per: 2, base: 12, step: 6, max: 25, group: 'attrs' },
  { key: 'maxHealth', name: '炼体', icon: '🫀', desc: '气血上限', unit: '%', per: 3, base: 12, step: 6, max: 25, group: 'attrs' },
  { key: 'attack', name: '强攻', icon: '⚔️', desc: '攻击力', unit: '%', per: 2, base: 12, step: 6, max: 25, group: 'attrs' },
  { key: 'defense', name: '御守', icon: '🛡️', desc: '防御力', unit: '%', per: 2, base: 12, step: 6, max: 25, group: 'attrs' },
  { key: 'critical', name: '凝神', icon: '🎯', desc: '暴击率', unit: '%', per: 0.4, base: 16, step: 8, max: 15, group: 'attrs' },
  { key: 'dodge', name: '踏云', icon: '💨', desc: '闪避率', unit: '%', per: 0.4, base: 16, step: 8, max: 15, group: 'attrs' },
  { key: 'moneyMult', name: '聚财', icon: '🪙', desc: '灵石收益', unit: '%', per: 2, base: 12, step: 6, max: 25, group: 'economy' },
  { key: 'offlineMult', name: '静修', icon: '🌙', desc: '离线收益', unit: '%', per: 2, base: 12, step: 6, max: 25, group: 'economy' },
  { key: 'lifespan', name: '增寿', icon: '🎂', desc: '寿元', unit: '年', per: 3, base: 10, step: 5, max: 30, group: 'meta' },
  { key: 'startMoney', name: '遗泽', icon: '💰', desc: '开局灵石', unit: '', per: 100, base: 10, step: 5, max: 60, group: 'meta' },
  { key: 'rootBone', name: '根骨源', icon: '🌳', desc: '根骨保底' + '阶', unit: '阶', per: 1, base: 40, step: 40, max: 3, group: 'meta' },
  { key: 'daoGain', name: '道蕴', icon: '✨', desc: '轮回道行', unit: '%', per: 5, base: 20, step: 10, max: 20, group: 'meta' }
]

const shop = player => player.daoShop || {}

export const daoShopLevel = (player, key) => shop(player)[key] || 0

export const itemCost = (item, level) => item.base + item.step * level

// 汇总当前道行商店提供的所有永久加成
export const daoBonus = player => {
  const s = shop(player)
  const out = {
    attack: 0,
    defense: 0,
    critical: 0,
    dodge: 0,
    health: 0, // 气血上限百分比
    cultivationSpeed: 0,
    moneyMult: 0,
    offlineMult: 0,
    lifespanBonus: 0,
    startMoney: 0,
    rootBoneFloor: 0,
    daoGainMult: 0
  }
  for (const it of DAO_SHOP_ITEMS) {
    const lv = s[it.key] || 0
    if (!lv) continue
    const val = it.per * lv
    switch (it.key) {
      case 'cultivationSpeed': out.cultivationSpeed += val / 100; break
      case 'maxHealth': out.health += val / 100; break
      case 'attack': out.attack += val / 100; break
      case 'defense': out.defense += val / 100; break
      case 'critical': out.critical += val / 100; break
      case 'dodge': out.dodge += val / 100; break
      case 'moneyMult': out.moneyMult += val / 100; break
      case 'offlineMult': out.offlineMult += val / 100; break
      case 'lifespan': out.lifespanBonus += val; break
      case 'startMoney': out.startMoney += val; break
      case 'rootBone': out.rootBoneFloor += val; break
      case 'daoGain': out.daoGainMult += val / 100; break
    }
  }
  return out
}

export const buyDaoItem = (player, key) => {
  const item = DAO_SHOP_ITEMS.find(i => i.key === key)
  if (!item) return { ok: false, reason: '不存在该商品' }
  if (!player.daoShop) player.daoShop = {}
  const cur = player.daoShop[key] || 0
  if (cur >= item.max) return { ok: false, reason: '已升至满级' }
  const cost = itemCost(item, cur)
  const dao = player.daoPoints || 0
  if (dao < cost) return { ok: false, reason: `道行不足（需 ${cost}）` }
  player.daoPoints = dao - cost
  player.daoShop[key] = cur + 1
  return { ok: true, name: item.name, level: cur + 1 }
}

// 轮回结算产出的道行（境界越高、轮回越深越多）
export const rebirthDaoGain = player => {
  const prevLevel = player.level || 0
  // 单次基础产出封顶，避免高轮回时代行无上限滚雪球（道蕴倍率仍可再放大）
  const base = Math.max(5, Math.min(200, Math.floor(prevLevel / 3) + (player.reincarnation || 0) * 2))
  const mult = 1 + (daoBonus(player).daoGainMult || 0)
  return Math.floor(base * mult)
}
