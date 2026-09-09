// 灵宠抽奖 —— 多品质奖池，单抽/十连，灵宠与低价值杂物混合
import { RECIPES } from './alchemy.js'
import { TALISMANS } from './talisman.js'
import { MATERIALS } from './materialDb.js'
import { createCapturedPet, syncPetStats, PET_QUALITIES } from './petSystem.js'

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
const pick = arr => arr[Math.floor(Math.random() * arr.length)]

const QUALITY_RANGES = [
  [5, 14],
  [15, 24],
  [25, 34],
  [35, 44],
  [45, 49]
]
const QUALITY_STAT_MULT = [1, 2.2, 4.8, 10, 22]

const ROLE_PROFILE = {
  attack: { attack: 150, health: 550, defense: 18, dodge: 0.015, critical: 0.02 },
  defense: { attack: 80, health: 900, defense: 45, dodge: 0.005, critical: 0.005 },
  health: { attack: 100, health: 1200, defense: 25, dodge: 0.01, critical: 0.01 },
  agility: { attack: 110, health: 500, defense: 15, dodge: 0.04, critical: 0.03 },
  balance: { attack: 130, health: 700, defense: 25, dodge: 0.02, critical: 0.02 }
}

const SPECIES_BY_QUALITY = [
  [
    { name: '灵狐', role: 'agility' },
    { name: '灰狼', role: 'attack' },
    { name: '山猿', role: 'defense' },
    { name: '云雀', role: 'agility' },
    { name: '石龟', role: 'defense' },
    { name: '灵鹿', role: 'balance' }
  ],
  [
    { name: '青鸾', role: 'agility' },
    { name: '火麟兽', role: 'attack' },
    { name: '玄龟', role: 'defense' },
    { name: '雷貂', role: 'agility' },
    { name: '风灵鹿', role: 'balance' },
    { name: '月兔', role: 'health' }
  ],
  [
    { name: '九尾灵狐', role: 'agility' },
    { name: '紫电麒麟', role: 'attack' },
    { name: '玄武幼崽', role: 'defense' },
    { name: '金翅鹏鸟', role: 'attack' },
    { name: '冰晶凤凰', role: 'balance' },
    { name: '幽冥白虎', role: 'attack' }
  ],
  [
    { name: '烛龙', role: 'attack' },
    { name: '白泽', role: 'balance' },
    { name: '鲲鹏', role: 'agility' },
    { name: '朱雀', role: 'attack' },
    { name: '应龙', role: 'health' },
    { name: '饕餮', role: 'defense' }
  ],
  [
    { name: '太初祖龙', role: 'attack' },
    { name: '混沌神凰', role: 'balance' },
    { name: '鸿蒙麒麟', role: 'defense' },
    { name: '大道金乌', role: 'attack' },
    { name: '虚无鲲鹏', role: 'agility' },
    { name: '造化玉兽', role: 'health' }
  ]
]

export const createPetFromSpecies = (species, qualityIndex) => {
  const q = Math.max(0, Math.min(4, Math.floor(qualityIndex)))
  const profile = ROLE_PROFILE[species.role] || ROLE_PROFILE.balance
  const mult = QUALITY_STAT_MULT[q] * (0.88 + Math.random() * 0.24)
  const [minRoot, maxRoot] = QUALITY_RANGES[q]
  const pet = createCapturedPet({
    name: species.name,
    potential: randInt(minRoot, maxRoot),
    attack: Math.round(profile.attack * mult),
    health: Math.round(profile.health * mult),
    defense: Math.round(profile.defense * mult),
    dodge: profile.dodge * (1 + q * 0.08),
    critical: profile.critical * (1 + q * 0.08)
  })
  pet.role = species.role
  pet.species = species.name
  syncPetStats(pet)
  return pet
}

const rollSpecies = qualityIndex => {
  const q = Math.max(0, Math.min(4, Math.floor(qualityIndex)))
  const list = SPECIES_BY_QUALITY[q] || SPECIES_BY_QUALITY[0]
  return { species: pick(list), qualityIndex: q }
}

const junkReward = (player, pool) => {
  const kind = pick(['herb', 'dan', 'stone', 'money', 'pill', 'talisman', 'material'])
  if (kind === 'herb') {
    const qty = randInt(pool.junk.herb[0], pool.junk.herb[1])
    player.props.spiritHerb = (player.props.spiritHerb || 0) + qty
    return { kind: 'item', name: '灵草', qty, desc: `灵草 ×${qty}` }
  }
  if (kind === 'dan') {
    const qty = randInt(pool.junk.dan[0], pool.junk.dan[1])
    player.props.cultivateDan = (player.props.cultivateDan || 0) + qty
    return { kind: 'item', name: '培养丹', qty, desc: `培养丹 ×${qty}` }
  }
  if (kind === 'stone') {
    const qty = randInt(pool.junk.stone[0], pool.junk.stone[1])
    player.props.strengtheningStone = (player.props.strengtheningStone || 0) + qty
    return { kind: 'item', name: '炼器石', qty, desc: `炼器石 ×${qty}` }
  }
  if (kind === 'money') {
    const qty = randInt(pool.junk.money[0], pool.junk.money[1])
    player.props.money = (player.props.money || 0) + qty
    return { kind: 'item', name: '灵石', qty, desc: `灵石 ×${qty}` }
  }
  if (kind === 'pill') {
    const poolPills = RECIPES.filter(r => r.tier <= pool.maxTier)
    const recipe = pick(poolPills.length ? poolPills : RECIPES)
    if (!player.pills) player.pills = []
    const ex = player.pills.find(p => p.id === recipe.id)
    if (ex) ex.count += 1
    else player.pills.push({ id: recipe.id, count: 1 })
    return { kind: 'item', name: recipe.name, qty: 1, desc: `${recipe.name} ×1`, quality: recipe.quality }
  }
  if (kind === 'talisman') {
    const poolTal = TALISMANS.filter(t => t.tier <= pool.maxTier)
    const recipe = pick(poolTal.length ? poolTal : TALISMANS)
    if (!player.talismans) player.talismans = []
    const ex = player.talismans.find(t => t.id === recipe.id)
    if (ex) ex.count += 1
    else player.talismans.push({ id: recipe.id, count: 1 })
    return { kind: 'item', name: recipe.name, qty: 1, desc: `${recipe.name} ×1`, quality: recipe.quality }
  }
  const poolMats = MATERIALS.filter(m => m.tier <= pool.maxTier)
  const material = pick(poolMats.length ? poolMats : MATERIALS)
  const qty = randInt(pool.junk.material[0], pool.junk.material[1])
  player.props[material.key] = (player.props[material.key] || 0) + qty
  return { kind: 'item', name: material.name, qty, desc: `${material.name} ×${qty}`, quality: material.quality }
}

const grantPet = (player, qualityIndex) => {
  const { species, qualityIndex: q } = rollSpecies(qualityIndex)
  const pet = createPetFromSpecies(species, q)
  player.pets = player.pets || []
  player.pets.push(pet)
  return { kind: 'pet', pet, name: pet.name, desc: `${PET_QUALITIES[q].name}灵宠【${pet.name}】`, quality: PET_QUALITIES[q].color }
}

const drawOne = (player, pool, pity) => {
  if (pity >= 50) return grantPet(player, pool.quality)
  if (Math.random() < pool.petChance) return grantPet(player, pool.quality)
  // 小概率越级灵宠，增加惊喜
  if (Math.random() < 0.04 && pool.quality < 4) return grantPet(player, pool.quality + 1)
  return junkReward(player, pool)
}

export const PET_POOLS = [
  {
    key: 'mortal', name: '凡品灵宠池', quality: 0, qualityName: '凡品',
    cost: 1000, tenCost: 9000, petChance: 0.12, maxTier: 2,
    desc: '适合刚起步，主要产出凡品灵宠与低阶杂物。',
    junk: { herb: [10, 30], dan: [1, 3], stone: [1, 4], money: [500, 2000], material: [1, 3] }
  },
  {
    key: 'spirit', name: '灵品灵宠池', quality: 1, qualityName: '灵品',
    cost: 10000, tenCost: 90000, petChance: 0.1, maxTier: 4,
    desc: '有较高概率获得灵品灵宠，杂物价值同步提升。',
    junk: { herb: [30, 90], dan: [2, 6], stone: [3, 10], money: [3000, 12000], material: [2, 5] }
  },
  {
    key: 'immortal', name: '仙品灵宠池', quality: 2, qualityName: '仙品',
    cost: 100000, tenCost: 900000, petChance: 0.08, maxTier: 6,
    desc: '仙品灵宠出没，50 抽内必出本池灵宠。',
    junk: { herb: [100, 260], dan: [5, 15], stone: [8, 24], money: [20000, 90000], material: [3, 8] }
  },
  {
    key: 'divine', name: '神品灵宠池', quality: 3, qualityName: '神品',
    cost: 1000000, tenCost: 9000000, petChance: 0.06, maxTier: 8,
    desc: '高阶修士专属，神品灵宠与高阶杂物混合。',
    junk: { herb: [300, 800], dan: [15, 45], stone: [20, 70], money: [150000, 700000], material: [5, 14] }
  },
  {
    key: 'saint', name: '圣品灵宠池', quality: 4, qualityName: '圣品',
    cost: 10000000, tenCost: 90000000, petChance: 0.05, maxTier: 11,
    desc: '顶级奖池，圣品灵宠与道阶杂物混池，价格昂贵。',
    junk: { herb: [1000, 2500], dan: [50, 150], stone: [80, 240], money: [1000000, 5000000], material: [10, 30] }
  }
]

export const petPoolByKey = key => PET_POOLS.find(p => p.key === key)

export const drawPetGacha = (player, poolKey, count = 1) => {
  const pool = petPoolByKey(poolKey)
  if (!pool) return { ok: false, reason: '未知奖池' }
  const n = count >= 10 ? 10 : 1
  const cost = n === 10 ? pool.tenCost : pool.cost
  if ((player.props?.money || 0) < cost) return { ok: false, reason: `灵石不足，需要 ${cost.toLocaleString('zh-CN')}` }
  player.props.money -= cost
  if (!player.petGachaPity) player.petGachaPity = {}
  const rewards = []
  let pity = player.petGachaPity[pool.key] || 0
  for (let i = 0; i < n; i++) {
    pity += 1
    const reward = drawOne(player, pool, pity)
    if (reward.kind === 'pet') pity = 0
    rewards.push(reward)
  }
  player.petGachaPity[pool.key] = pity
  return { ok: true, pool, count: n, cost, rewards }
}
