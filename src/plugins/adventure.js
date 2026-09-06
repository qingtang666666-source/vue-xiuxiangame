// 奇遇 —— 机缘赌运：70% 得好处 / 30% 遇坏事，带回冷却
//  好：灵石/材料/修为/天材地宝/丹药/符箓/装备/限时增益/寿元
//  坏：失灵石/修为/气血/材料/双失

import { RECIPES } from './alchemy.js'
import { TALISMANS } from './talisman.js'
import { TREASURES, addTreasure, treasureTierOf, treasureByTier } from './treasure.js'
import { addBuff } from './buffs.js'
import equip from './equip.js'
import { rollTechniqueDrop } from './technique.js'

export const ADVENTURE_COOLDOWN = 60000 // 现实 60 秒冷却

const GOOD_SCENES = ['大能传功', '神秘洞府', '遗落宝藏', '故人重逢', '仙缘垂青', '灵兽相随', '山间遗宝', '高人指点', '古碑参悟', '灵泉沐浴']
const BAD_SCENES = ['妖兽突袭', '心魔滋生', '陷入绝地', '被劫匪盯上', '天降横祸', '走火入魔', '误入幻阵', '天雷肆虐', '山崩地裂', '阴风入体']

const rand = arr => arr[Math.floor(Math.random() * arr.length)]
const pickScene = arr => rand(arr)

export const canAdventure = player => !player.lastAdventure || Date.now() - player.lastAdventure >= ADVENTURE_COOLDOWN
export const adventureCooldownLeft = player => {
  if (!player.lastAdventure) return 0
  return Math.max(0, Math.ceil((ADVENTURE_COOLDOWN - (Date.now() - player.lastAdventure)) / 1000))
}

const grantResource = (player, key, v) => {
  player.props[key] = (player.props[key] || 0) + v
}

const RESOURCE = {
  spiritHerb: '灵草',
  strengtheningStone: '炼器石',
  cultivateDan: '培养丹',
  zhuSha: '朱砂',
  xuanTie: '玄铁',
  zhenQi: '阵旗',
  yaoDan: '妖丹'
}

const goodAdventure = player => {
  const lv = player.level || 1
  const scene = pickScene(GOOD_SCENES)
  const roll = Math.random()
  if (roll < 0.06) {
    const s = rollTechniqueDrop(player)
    return { type: scene, title: '遗落秘籍', desc: s.ok ? `获得功法卷轴【${s.name}】` : '古籍残破，难窥真意', good: true, scroll: s.ok }
  }
  if (roll < 0.24) {
    const money = 300 + lv * 50
    player.props.money += money
    return { type: scene, title: '天降横财', desc: `获得 灵石 ×${money}`, good: true, reward: 'money' }
  }
  if (roll < 0.44) {
    const key = rand(Object.keys(RESOURCE))
    const v = Math.max(1, Math.floor(key === 'spiritHerb' ? 12 + lv * 0.6 : key === 'cultivateDan' ? 1 + lv * 0.15 : 3 + lv * 0.25))
    grantResource(player, key, v)
    return { type: scene, title: '山中灵物', desc: `获得 ${RESOURCE[key]} ×${v}`, good: true }
  }
  if (roll < 0.58) {
    const gain = Math.floor((player.maxCultivation || 100) * 0.12)
    player.cultivation = (player.cultivation || 0) + gain
    return { type: scene, title: '顿悟精进', desc: `修为 +${gain}`, good: true }
  }
  if (roll < 0.7) {
    const t = treasureByTier(treasureTierOf(player))
    addTreasure(player, t.key, 1)
    return { type: scene, title: '旷世机缘', desc: `获得天材地宝【${t.name}】`, good: true, treasure: true }
  }
  if (roll < 0.82) {
    const r = rand(RECIPES)
    if (!player.pills) player.pills = []
    const ex = player.pills.find(p => p.id === r.id)
    if (ex) ex.count++
    else player.pills.push({ id: r.id, count: 1 })
    return { type: scene, title: '丹师赠丹', desc: `获得丹药【${r.name}】`, good: true }
  }
  if (roll < 0.92) {
    const t = rand(TALISMANS)
    if (!player.talismans) player.talismans = []
    const ex = player.talismans.find(x => x.id === t.id)
    if (ex) ex.count++
    else player.talismans.push({ id: t.id, count: 1 })
    return { type: scene, title: '同气相求', desc: `获得符箓【${t.name}】`, good: true }
  }
  if (roll < 0.97) {
    const methods = ['equip_Weapons', 'equip_Armors', 'equip_Accessorys', 'equip_Sutras']
    const eq = equip[rand(methods)](Math.min(144, Math.max(1, lv)), false)
    if (!player.inventory) player.inventory = []
    player.inventory.push(eq)
    return { type: scene, title: '遗落神兵', desc: `获得装备【${eq.name}】`, good: true, reward: 'equip' }
  }
  if (roll < 0.99) {
    addBuff(player, {
      name: '奇遇·灵光乍现',
      effect: { cultivation: 0.35 },
      durationMinutes: 30,
      quality: 'warning',
      expireAt: Date.now() + 30 * 60000
    })
    return { type: scene, title: '灵光乍现', desc: '获得修炼速度 +35%（30分钟）', good: true }
  }
  player.lifespanBonus = (player.lifespanBonus || 0) + 2
  return { type: scene, title: '增寿天缘', desc: '寿元 +2 年', good: true }
}

const badAdventure = player => {
  const lv = player.level || 1
  const scene = pickScene(BAD_SCENES)
  const roll = Math.random()
  if (roll < 0.3) {
    const loss = Math.min(player.props.money || 0, 200 + lv * 25)
    player.props.money -= loss
    return { type: scene, title: '破财消灾', desc: `丢失 灵石 ×${loss}`, bad: true }
  }
  if (roll < 0.55) {
    const loss = Math.floor((player.cultivation || 0) * 0.08)
    player.cultivation = (player.cultivation || 0) - loss
    return { type: scene, title: '心魔噬体', desc: `修为损失 ${loss}`, bad: true }
  }
  if (roll < 0.72) {
    const loss = Math.floor((player.health || 1) * 0.15)
    player.health = Math.max(1, player.health - loss)
    return { type: scene, title: '遭遇凶险', desc: `受创，损失气血 ${loss}`, bad: true }
  }
  if (roll < 0.86) {
    const key = rand(Object.keys(RESOURCE))
    const loss = Math.min(player.props[key] || 0, 1 + Math.floor(lv * 0.1))
    player.props[key] = (player.props[key] || 0) - loss
    return { type: scene, title: '被劫匪盯上', desc: `被劫走 ${RESOURCE[key]} ×${loss}`, bad: true }
  }
  const cult = Math.floor((player.cultivation || 0) * 0.05)
  const money = Math.min(player.props.money || 0, 150 + lv * 15)
  player.cultivation -= cult
  player.props.money -= money
  return { type: scene, title: '走火入魔', desc: `修为 -${cult}，灵石 -${money}`, bad: true }
}

export const triggerAdventure = player => {
  const good = Math.random() < 0.7
  player.lastAdventure = Date.now()
  player.adventureTimes = (player.adventureTimes || 0) + 1
  return good ? goodAdventure(player) : badAdventure(player)
}
