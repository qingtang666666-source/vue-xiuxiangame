// 随机剧情引擎 —— 抽剧情 → 按难度判定 → 结算奖励
// 奖励复用现有系统：装备(forgeBuild)/天材地宝(addTreasure)/材料(props)/功法(getMethods)/限时增益(addBuff)
import { forgeBuild } from './forge.js'
import { TREASURES, addTreasure } from './treasure.js'
import { MATERIALS } from './materialDb.js'
import { TECHNIQUES } from './technique.js'
import { addBuff } from './buffs.js'
import { STORY_EVENTS } from './storyDb.js'

const clamp = (min, max, v) => Math.max(min, Math.min(max, v))
const rand = arr => arr[Math.floor(Math.random() * arr.length)]

// 当前境界可触发哪些剧情（tier 为解锁档，每 10 级一档）
export const eligibleStories = player => {
  const lv = player.level || 0
  return STORY_EVENTS.filter(s => s.tier <= Math.floor(lv / 10))
}

// 抽剧情：越高难越偏稀有
export const rollStory = player => {
  const pool = eligibleStories(player)
  if (!pool.length) return null
  const weights = pool.map(s => s.difficulty)
  const total = weights.reduce((a, b) => a + b, 0)
  let r = Math.random() * total
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i]
    if (r <= 0) return pool[i]
  }
  return pool[pool.length - 1]
}

// 成功率：靠综合战力 vs 难度需求
export const storySuccessChance = (player, event) => {
  const power = (player.attack || 0) * 3 + (player.defense || 0) + (player.maxHealth || 0) * 0.1 + (player.level || 0) * 6
  const need = 260 + event.difficulty * 420 + event.tier * 180
  return clamp(0.12, 0.95, power / (power + need))
}

const randMaterial = tier => {
  const t = clamp(0, 10, tier)
  const pool = MATERIALS.filter(m => m.tier === t)
  return pool.length ? rand(pool) : MATERIALS[0]
}

const randTreasure = tier => {
  const t = clamp(1, 11, tier)
  const pool = TREASURES.filter(x => x.tier === t)
  return pool.length ? rand(pool) : TREASURES[0]
}

const randMethod = grade => {
  const g = clamp(1, 11, grade)
  const pool = TECHNIQUES.filter(x => x.grade === g)
  return pool.length ? rand(pool) : TECHNIQUES[0]
}

// 失败保底：小额灵石/杂材，避免空手
const applyFailConsolation = player => {
  const money = Math.max(0, Math.floor((player.level || 1) * 12))
  player.props.money = (player.props.money || 0) + money
  const texts = []
  if (money > 0) texts.push(`灵石 +${money}`)
  return texts
}

export const applyStoryReward = (player, reward) => {
  const texts = []
  if (reward.money) {
    player.props.money = (player.props.money || 0) + reward.money
    texts.push(`灵石 +${reward.money}`)
  }
  if (reward.currency) {
    player.props.currency = (player.props.currency || 0) + reward.currency
    texts.push(`混沌石 +${reward.currency}`)
  }
  if (reward.material) {
    const m = randMaterial(reward.material.tier)
    player.props[m.key] = (player.props[m.key] || 0) + reward.material.qty
    texts.push(`${m.name} ×${reward.material.qty}`)
  }
  if (reward.treasure) {
    const t = randTreasure(reward.treasure.tier)
    addTreasure(player, t.key, reward.treasure.qty)
    texts.push(`天材地宝【${t.name}】`)
  }
  if (reward.equip) {
    const eq = forgeBuild({
      type: 'weapon',
      quality: reward.equip.quality,
      grade: reward.equip.grade,
      level: Math.max(1, player.level || 10),
      strengthen: 0
    })
    if (!player.inventory) player.inventory = []
    player.inventory.push(eq)
    texts.push(`神兵【${eq.name}】`)
  }
  if (reward.methodGrade) {
    const tech = randMethod(reward.methodGrade)
    if (!player.methods) player.methods = {}
    player.methods[tech.id] = { chapter: 1 }
    if (!player.mainMethod) player.mainMethod = tech.id
    texts.push(`传承功法【${tech.name}】`)
  }
  if (reward.stat) {
    const s = reward.stat
    if (s.attack) player.attack = (player.attack || 0) + s.attack
    if (s.defense) player.defense = (player.defense || 0) + s.defense
    if (s.health) {
      player.health = (player.health || 0) + s.health
      player.maxHealth = (player.maxHealth || 0) + s.health
    }
    if (s.critical) player.critical = (player.critical || 0) + s.critical
    if (s.dodge) player.dodge = (player.dodge || 0) + s.dodge
    if (s.cultivationSpeed) player.cultivationSpeed = (player.cultivationSpeed || 1) + s.cultivationSpeed
    if (s.lifespan) player.lifespanBonus = (player.lifespanBonus || 0) + s.lifespan
  }
  if (reward.buff) {
    addBuff(player, {
      name: reward.buff.name,
      effect: reward.buff.effect,
      durationMinutes: reward.buff.minutes,
      quality: 'danger',
      expireAt: Date.now() + reward.buff.minutes * 60000
    })
    texts.push(`增益【${reward.buff.name}】`)
  }
  return texts
}

export const resolveStory = (player, event) => {
  const chance = storySuccessChance(player, event)
  if (Math.random() >= chance) return { ok: false, chance, reason: '你力有不逮，铩羽而归', texts: applyFailConsolation(player) }
  const texts = applyStoryReward(player, event.reward)
  return { ok: true, chance, texts }
}

// 分支剧情：按指定选项结算（难度/成败/奖励随选项不同）
export const resolveStoryChoice = (player, event, choice) => {
  const chance = storySuccessChance(player, { ...event, difficulty: choice.difficulty })
  if (Math.random() >= chance) return { ok: false, chance, reason: choice.fail || '此路不通，铩羽而归', texts: applyFailConsolation(player) }
  const texts = applyStoryReward(player, choice.reward)
  return { ok: true, chance, texts, outcome: choice.outcome }
}

// 分支前置条件：{ attack, defense, maxHealth, rootBone, level, currency } 满足才可选
export const choiceReqMet = (player, req) => {
  if (!req) return true
  for (const k of Object.keys(req)) {
    let v = 0
    if (k === 'rootBone') v = player.aptitude?.rootBone || 0
    else if (k === 'level') v = player.level || 0
    else if (k === 'currency') v = player.props?.currency || 0
    else v = player[k] || 0
    if (v < req[k]) return false
  }
  return true
}

export const choiceReqText = req => {
  if (!req) return ''
  const label = { attack: '攻击', defense: '防御', maxHealth: '气血', rootBone: '根骨', level: '境界', currency: '混沌石' }
  return Object.entries(req).map(([k, v]) => `${label[k] || k}≥${v}`).join('，')
}
