// 秘境系统 —— 30 处秘境，参考主流玄幻，难度递增
//
// 名字与主题参考玄幻经典场景；按难度排序，入场费随难度递增，
// 探索按战力判定，胜则得物资 + 概率天材地宝。

import { ITEM_DB, tierPool, weightedTierPick } from './market.js'
import { TREASURES, addTreasure, treasureByTier } from './treasure.js'
import { rollTechniqueDrop } from './technique.js'
import { levelNames } from './game.js'

const LORE = [
  ['灵药园秘境', '灵雾缭绕，灵草遍地'],
  ['万兽谷', '凶兽盘踞，妖丹遍地'],
  ['古剑冢', '埋剑之地，玄铁无数'],
  ['灵墟秘境', '上古灵墟，宝物散落'],
  ['上古遗迹', '远古神城，机缘莫测'],
  ['九幽深渊', '幽冥鬼气，凶险与奇遇并存'],
  ['大荒秘境', '洪荒蛮荒，天材地宝'],
  ['混沌秘境', '混沌未开，大道机缘'],
  ['青莲秘境', '青莲古宗遗址，药香千年'],
  ['太虚秘境', '太虚一脉，石碑林立'],
  ['广寒洞天', '月华凝霜，冰系灵物'],
  ['金乌谷', '赤地千里，火系天材'],
  ['龙渊秘境', '深潭藏龙，龙涎灵髓'],
  ['凤鸣山', '梧桐栖凤，神木异火'],
  ['天罡秘境', '星罡淬体，罡风如刃'],
  ['归墟秘境', '万物归墟，规则残片'],
  ['造化秘境', '造化之气，万物有灵'],
  ['三生秘境', '三生轮回，因果纠葛'],
  ['罗摩秘境', '佛光普照，禅意盎然'],
  ['剑冢秘境', '万剑朝宗，剑意冲霄'],
  ['幽冥鬼窟', '鬼哭神嚎，阴煞汇聚'],
  ['星河秘境', '星河倒悬，星光凝露'],
  ['紫府仙府', '紫气东来，仙府洞天'],
  ['昆仑墟', '万山之祖，仙灵汇聚'],
  ['蓬莱仙岛', '海外仙山，云雾缥缈'],
  ['无尽沙海', '黄沙万里，古墓埋藏'],
  ['太乙秘境', '太乙玄门，道韵悠长'],
  ['大罗秘境', '大罗金仙，遗泽犹在'],
  ['周天秘境', '周天星斗，三百六十五'],
  ['天机秘境', '天机莫测，一线生机']
]

export const REALMS = LORE.map(([name, theme], idx) => {
  const minLevel = Math.round(3 + (idx / (LORE.length - 1)) * 135)
  const lootTier = Math.min(7, Math.floor(idx / (LORE.length / 8)))
  // 费用按几何倍数增长：最低约200灵石，最高一档约20万灵石(≥15万)
  const fee = Math.floor(200 * Math.pow(1.28, idx))
  const bossFee = 1 + Math.floor(idx / 4) // 混沌石
  return { id: `realm-${idx}`, name, minLevel, fee, lootTier, theme, bossFee }
})

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
export const realmById = id => REALMS.find(r => r.id === id)
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

const playerPower = player =>
  (player.attack || 0) * 3 + (player.defense || 0) + (player.maxHealth || 0) * 0.1 + (player.level || 0) * 6

const rollLoot = (player, r) => {
  const pool = tierPool(r.lootTier)
  // 收益与费用对等：约 1.3 倍入场费价值的物品
  const totalValue = Math.floor(r.fee * 1.3)
  const rewards = []
  const parts = randInt(2, 4)
  for (let i = 0; i < parts; i++) {
    const it = weightedTierPick(pool, r.lootTier) || ITEM_DB[0]
    const qty = Math.max(1, Math.floor(totalValue / parts / it.price))
    player.props[it.key] = (player.props[it.key] || 0) + qty
    rewards.push({ name: it.name, qty })
  }
  if (Math.random() < 0.12 + r.lootTier * 0.05) {
    const t = treasureByTier(Math.min(11, r.lootTier + 1))
    addTreasure(player, t.key, 1)
    rewards.push({ name: t.name, qty: 1, treasure: true })
  }
  if (Math.random() < 0.08 + r.lootTier * 0.03) {
    const s = rollTechniqueDrop(player)
    if (s.ok) rewards.push({ name: s.name, qty: 1, scroll: true })
  }
  return rewards
}

export const exploreRealm = (player, realmId) => {
  const r = realmById(realmId)
  if (!r) return { ok: false, reason: '未知秘境' }
  if (player.level < r.minLevel) return { ok: false, reason: `需达到${levelNames(r.minLevel)}方可进入` }
  if ((player.props.money || 0) < r.fee) return { ok: false, reason: '入场灵石不足' }
  player.realmTimes = (player.realmTimes || 0) + 1
  player.props.money -= r.fee

  const guardian = Math.floor(r.minLevel * 7.5) + (r.lootTier + 1) * 75
  const chance = Math.min(0.95, Math.max(0.15, playerPower(player) / (playerPower(player) + guardian)))
  if (Math.random() < chance) {
    const rewards = rollLoot(player, r)
    return { ok: true, rewards, texts: [r.theme, '你闯过关隘，满载而归'] }
  }
  const refund = Math.floor(r.fee * 0.4)
  player.props.money += refund
  return { ok: false, reason: '秘境凶险，铩羽而归(返还部分入场费)', refund }
}

// 秘境首领挑战：耗混沌石，胜则大机缘
export const challengeRealmBoss = (player, realmId) => {
  const r = realmById(realmId)
  if (!r) return { ok: false, reason: '未知秘境' }
  if (player.level < r.minLevel) return { ok: false, reason: `需达${levelNames(r.minLevel)}` }
  if ((player.props.currency || 0) < r.bossFee) return { ok: false, reason: `混沌石不足(需 ${r.bossFee})` }
  player.props.currency -= r.bossFee
  const pp = playerPower(player)
  const boss = r.minLevel * 25 + (r.lootTier + 1) * 450
  const chance = clamp(pp / (pp + boss), 0.15, 0.9)
  if (Math.random() < chance) {
    const rewards = []
    const t = treasureByTier(Math.min(11, r.lootTier + 1))
    addTreasure(player, t.key, 1)
    rewards.push({ name: t.name, qty: 1, treasure: true })
    const g = randInt(1, 2 + r.lootTier)
    player.props.currency += g
    rewards.push({ name: '混沌石', qty: g })
    const pool = tierPool(r.lootTier)
    const it = weightedTierPick(pool, r.lootTier) || ITEM_DB[0]
    const qty = Math.max(1, Math.floor((r.fee * 0.4) / it.price))
    player.props[it.key] = (player.props[it.key] || 0) + qty
    rewards.push({ name: it.name, qty })
    if (Math.random() < 0.35) {
      const s = rollTechniqueDrop(player)
      if (s.ok) rewards.push({ name: s.name, qty: 1, scroll: true })
    }
    return { ok: true, rewards }
  }
  return { ok: false, reason: '不敌此界首领，可再来' }
}

// —— 回合制秘境辅助：敌人构造 + 胜利奖励 / 失败返还 ——
export const realmEnemy = (realm, boss = false) => {
  const lv = (realm.minLevel || 10) + (boss ? 8 : 0)
  return {
    name: realm.name + (boss ? '·首领' : '·守灵'),
    level: lv,
    attack: Math.floor(lv * 60),
    defense: Math.floor(lv * 40),
    health: Math.floor(lv * 400),
    critical: boss ? 0.08 : 0.03,
    dodge: boss ? 0.05 : 0.02
  }
}
export const realmWin = (player, realm, boss = false) => {
  if (boss) {
    const rewards = []
    const t = treasureByTier(Math.min(11, realm.lootTier + 1))
    addTreasure(player, t.key, 1)
    rewards.push({ name: t.name, qty: 1, treasure: true })
    const g = randInt(1, 2 + realm.lootTier)
    player.props.currency += g
    rewards.push({ name: '混沌石', qty: g })
    return { ok: true, rewards }
  }
  return { ok: true, rewards: rollLoot(player, realm) }
}
export const realmLose = (player, realm, boss = false) => {
  if (boss) {
    player.props.currency += realm.bossFee
    return { ok: false, reason: '不敌首领，退回混沌石', refund: realm.bossFee }
  }
  const refund = Math.floor(realm.fee * 0.4)
  player.props.money += refund
  return { ok: false, reason: '秘境凶险，返还部分入场费', refund }
}
