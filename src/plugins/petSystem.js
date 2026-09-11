// 灵宠系统 —— 统一收服、培养、悟性、转生、出战与放生规则
//
// 战力口径（本次重做）：灵宠走玩家同一套「境界战力标准体系」，取标准的 0.1 倍，再乘品质倍率。
//   · 标准：petPowerStandard(level, quality) = realmPower(level) × 0.1 × 品质倍率
//   · 品质倍率：凡 1 / 灵 1.7 / 仙 2.9 / 神 5 / 圣 8.6（品质差距直接放大到 8.6 倍）
//   · 攻/防/血按定位形状分摊这份战力预算；闪避/暴击按品质上限（凡 6% → 圣 35%）随境界成长
//   · 悟性(后天增加的部分)与转生继续在标准之上加成
//   界面上显示的「灵宠战力」= 它给玩家总体实力带来的增量（同一套权重，不会再出现两个口径）
import { maxLv } from './game.js'
import { applyPlayerAttribute } from './playerAttr.js'
import { realmPower, POWER_SCALE } from './breakthroughGate.js'

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
const num = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d)

export const PET_QUALITIES = [
  { key: 'mortal', name: '凡品', color: 'info', mult: 1 },
  { key: 'spirit', name: '灵品', color: 'success', mult: 1.7 },
  { key: 'immortal', name: '仙品', color: 'primary', mult: 2.9 },
  { key: 'divine', name: '神品', color: 'warning', mult: 5 },
  { key: 'saint', name: '圣品', color: 'danger', mult: 8.6 }
]

// 灵宠战力标准：境界战力标准的这一比例（0.1 = 同境界玩家总体实力的一成）
export const PET_STANDARD_RATIO = 0.1

// 各定位的成长形状：攻/防/血按比例分摊战力预算，闪避/暴击按其占比取品质上限
const PET_ROLE_SHAPE = {
  attack: { attack: 1, health: 0.42, defense: 0.3, dodge: 0.55, critical: 1 },
  defense: { attack: 0.42, health: 0.7, defense: 1, dodge: 0.55, critical: 0.55 },
  health: { attack: 0.45, health: 1, defense: 0.55, dodge: 0.5, critical: 0.6 },
  agility: { attack: 0.5, health: 0.4, defense: 0.28, dodge: 1, critical: 0.85 },
  balance: { attack: 0.7, health: 0.65, defense: 0.62, dodge: 0.72, critical: 0.72 }
}

// 品质对应的闪避/暴击率上限：凡 5% → 圣 28%
const PET_RATE_CAP = [0.05, 0.09, 0.14, 0.2, 0.28]

export const PET_ROLES = {
  attack: { key: 'attack', name: '攻宠', icon: '⚔️', skill: '撕咬', desc: '出战时侧重攻击加成' },
  defense: { key: 'defense', name: '防宠', icon: '🛡️', skill: '护主', desc: '出战时侧重防御加成' },
  health: { key: 'health', name: '血宠', icon: '🫀', skill: '回春', desc: '出战时侧重气血加成' },
  agility: { key: 'agility', name: '敏宠', icon: '💨', skill: '疾风', desc: '出战时侧重闪避与暴击' },
  balanced: { key: 'balance', name: '全能', icon: '✨', skill: '灵光', desc: '攻防气血均衡成长' }
}

export const PET_SOURCE = '获取途径：大世界探索收服灵宠'

export const petQualityOf = pet => {
  const root = num(pet?.initial?.rootBone, num(pet?.rootBone, 1))
  if (root >= 45) return PET_QUALITIES[4]
  if (root >= 35) return PET_QUALITIES[3]
  if (root >= 25) return PET_QUALITIES[2]
  if (root >= 15) return PET_QUALITIES[1]
  return PET_QUALITIES[0]
}

export const petRoleOf = pet => {
  if (pet?.role && PET_ROLES[pet.role]) return PET_ROLES[pet.role]
  const i = pet?.initial || pet || {}
  const a = num(i.attack)
  const h = num(i.health)
  const d = num(i.defense)
  const c = num(i.critical)
  const v = num(i.dodge)
  const scores = {
    attack: a * 2,
    health: h * 0.2,
    defense: d * 8,
    agility: (c + v) * 10000,
    balanced: a + h / 100 + d * 2
  }
  const key = Object.keys(scores).sort((x, y) => scores[y] - scores[x])[0] || 'balanced'
  return PET_ROLES[key] || PET_ROLES.balanced
}

// 品质序号（0 凡品 ~ 4 圣品）
export const petQualityIndex = pet => Math.max(0, PET_QUALITIES.indexOf(petQualityOf(pet)))

// 灵宠战力标准：与玩家同一套境界战力标准体系，取 PET_STANDARD_RATIO 倍，再乘品质倍率
export const petPowerStandard = (level, quality) => {
  const lv = clamp(Math.floor(num(level, 1)), 1, maxLv)
  const mult = num(quality && quality.mult, 1)
  return Math.max(1, Math.floor(realmPower(lv) * PET_STANDARD_RATIO * mult))
}

// 灵宠评分：权重与 playerPowerScore 的实际属性部分完全一致
//   （攻×4 / 防×2.4 / 血÷100×0.4 / 暴×3.6×100 / 闪×3.2×100，再乘 POWER_SCALE）
// 这样「灵宠战力」就等于它给玩家总体实力带来的增量，两个口径不会再打架
export const petStatsScore = s =>
  Math.floor(
    (num(s && s.dodge) * 320 + num(s && s.attack) * 4 + (num(s && s.health) / 100) * 0.4 + num(s && s.defense) * 2.4 + num(s && s.critical) * 360) * POWER_SCALE
  )

export const ensurePet = pet => {
  if (!pet || typeof pet !== 'object') return null
  if (!pet.id) pet.id = Date.now() + Math.floor(Math.random() * 1000)
  const base = pet.initial || {}
  pet.initial = {
    attack: num(base.attack, num(pet.attack)),
    health: num(base.health, num(pet.health)),
    defense: num(base.defense, num(pet.defense)),
    dodge: clamp(num(base.dodge, num(pet.dodge)), 0, 0.5),
    critical: clamp(num(base.critical, num(pet.critical)), 0, 0.5),
    rootBone: Math.max(1, Math.floor(num(base.rootBone, num(pet.rootBone, 1))))
  }
  pet.level = clamp(Math.floor(num(pet.level, 1)), 1, maxLv)
  pet.rootBone = Math.max(pet.initial.rootBone, Math.floor(num(pet.rootBone, pet.initial.rootBone)))
  pet.reincarnation = Math.max(0, Math.floor(num(pet.reincarnation)))
  pet.lock = !!pet.lock
  pet.role = petRoleOf(pet).key
  return pet
}

export const petStats = pet => {
  const p = pet?.initial || {}
  const quality = petQualityOf(pet)
  const qi = Math.max(0, PET_QUALITIES.indexOf(quality))
  const shape = PET_ROLE_SHAPE[petRoleOf(pet).key] || PET_ROLE_SHAPE.balance
  const level = clamp(Math.floor(num(pet?.level, 1)), 1, maxLv)
  const rootGain = Math.max(0, Math.floor(num(pet?.rootBone, 1)) - Math.floor(num(p.rootBone, 1)))
  const reincarnation = Math.max(0, Math.floor(num(pet?.reincarnation)))
  // 目标战力：境界标准 × 0.1 × 品质倍率，再乘悟性/转生成长
  const target = petPowerStandard(level, quality) * (1 + rootGain * 0.03) * (1 + reincarnation * 0.3)
  // 闪避/暴击是「率」：随境界与悟性/转生成长，按品质上限封顶（不参与体量放大）
  const rateCap = PET_RATE_CAP[qi] || PET_RATE_CAP[0]
  const rateGrowth = Math.min(1, 0.3 + (level - 1) / 110) * (1 + rootGain * 0.01 + reincarnation * 0.06)
  const dodge = clamp(rateCap * shape.dodge * rateGrowth, 0, 0.45)
  const critical = clamp(rateCap * shape.critical * rateGrowth, 0, 0.45)
  // 剩下的战力预算全给攻/防/血，按定位形状分摊
  const bodyBudget = Math.max(1, target - petStatsScore({ dodge, critical }))
  const body = { attack: 100 * shape.attack, health: 400 * shape.health, defense: 12 * shape.defense }
  const bodyScore = petStatsScore(body)
  const k = bodyScore > 0 ? bodyBudget / bodyScore : 1
  return {
    attack: Math.max(1, Math.floor(body.attack * k)),
    health: Math.max(1, Math.floor(body.health * k)),
    defense: Math.max(1, Math.floor(body.defense * k)),
    dodge,
    critical
  }
}

export const syncPetStats = pet => {
  if (!pet) return null
  const s = petStats(pet)
  Object.assign(pet, s)
  pet.score = petStatsScore(s)
  return pet
}

export const petPowerScore = pet => petStatsScore(petStats(pet))

export const petUpgradeCost = (pet, { reincarnate = false } = {}) => {
  if (!pet) return 0
  if (reincarnate) return Math.max(20, Math.ceil(maxLv * 1.2 + num(pet.reincarnation) * 80))
  return Math.max(1, Math.ceil(num(pet.level, 1) * 0.6 + num(pet.reincarnation) * 12))
}

export const petRootCost = pet => Math.max(1, Math.ceil(num(pet?.rootBone, 1) * 0.5))

const applyPetDelta = (player, oldStats, newStats) => {
  if (!player || !oldStats || !newStats) return
  applyPlayerAttribute(
    player,
    newStats.dodge - oldStats.dodge,
    newStats.attack - oldStats.attack,
    newStats.health - oldStats.health,
    newStats.critical - oldStats.critical,
    newStats.defense - oldStats.defense
  )
}

const isActive = (player, pet) => player?.pet && pet && player.pet.id === pet.id

export const syncPetForPlayer = (player, pet) => {
  const p = ensurePet(pet)
  if (!p) return null
  const oldStats = petStats(p)
  syncPetStats(p)
  if (isActive(player, p)) applyPetDelta(player, oldStats, petStats(p))
  return p
}

// 旧档迁移：灵宠数值改成「战力标准」口径后，把已经生效在玩家属性里的旧数值换算成新口径。
// 不迁移的话，老存档里出战灵宠的加成会一直停在旧口径（玩家属性里已经烤进去的旧值不会被重算）。
export const migratePetStatsForPlayer = player => {
  if (!player || typeof player !== 'object') return 0
  const owned = Array.isArray(player.pets) ? player.pets : []
  owned.forEach(p => syncPetStats(p))
  const active = player.pet
  if (!active || !active.id) return 0
  // 存档里存的就是当时真正加到玩家身上的那份数值
  const stored = {
    attack: Math.floor(num(active.attack)),
    health: Math.floor(num(active.health)),
    defense: Math.floor(num(active.defense)),
    dodge: num(active.dodge),
    critical: num(active.critical)
  }
  const fresh = petStats(ensurePet(active))
  const dirty =
    stored.attack !== fresh.attack ||
    stored.health !== fresh.health ||
    stored.defense !== fresh.defense ||
    Math.abs(stored.dodge - fresh.dodge) > 1e-9 ||
    Math.abs(stored.critical - fresh.critical) > 1e-9
  if (!dirty) return 0
  applyPetDelta(player, stored, fresh)
  syncPetStats(active)
  return 1
}

export const upgradePet = (player, pet, { reincarnate = false } = {}) => {
  const p = ensurePet(pet)
  if (!p) return { ok: false, reason: '灵宠不存在' }
  if (reincarnate) {
    if (p.level < maxLv) return { ok: false, reason: '灵宠境界未满，无法转生' }
    if (num(player.reincarnation) <= p.reincarnation) return { ok: false, reason: '人物转生次数需高于灵宠' }
  } else if (p.level >= maxLv) {
    return { ok: false, reason: '灵宠境界已满，请转生' }
  }
  const cost = petUpgradeCost(p, { reincarnate })
  if (num(player.props?.cultivateDan) < cost) return { ok: false, reason: `培养丹不足（需 ${cost}）` }
  const oldStats = petStats(p)
  if (reincarnate) {
    p.level = 1
    p.reincarnation += 1
  } else {
    p.level += 1
  }
  syncPetStats(p)
  const newStats = petStats(p)
  if (isActive(player, p)) applyPetDelta(player, oldStats, newStats)
  player.props.cultivateDan -= cost
  return { ok: true, pet: p, cost, oldStats, newStats, reincarnate }
}

export const upgradePetRoot = (player, pet) => {
  const p = ensurePet(pet)
  if (!p) return { ok: false, reason: '灵宠不存在' }
  const cost = petRootCost(p)
  if (num(player.props?.rootBone) < cost) return { ok: false, reason: `悟性丹不足（需 ${cost}）` }
  const oldStats = petStats(p)
  p.rootBone += 1
  syncPetStats(p)
  const newStats = petStats(p)
  if (isActive(player, p)) applyPetDelta(player, oldStats, newStats)
  player.props.rootBone -= cost
  return { ok: true, pet: p, cost, oldStats, newStats }
}

export const setActivePet = (player, petId) => {
  if (!Array.isArray(player.pets)) player.pets = []
  const next = player.pets.find(p => p.id === petId)
  if (!next) return { ok: false, reason: '灵宠不存在' }
  if (player.pet && player.pet.id) {
    const old = ensurePet(player.pet)
    applyPetDelta(player, petStats(old), { attack: 0, health: 0, defense: 0, dodge: 0, critical: 0 })
    syncPetStats(old)
    player.pets.push(old)
  }
  const p = ensurePet(next)
  syncPetStats(p)
  player.pet = p
  applyPetDelta(player, { attack: 0, health: 0, defense: 0, dodge: 0, critical: 0 }, petStats(p))
  player.pets = player.pets.filter(x => x.id !== p.id)
  return { ok: true, pet: p }
}

export const retractActivePet = player => {
  if (!player.pet || !player.pet.id) return { ok: false, reason: '当前没有出战灵宠' }
  const p = ensurePet(player.pet)
  applyPetDelta(player, petStats(p), { attack: 0, health: 0, defense: 0, dodge: 0, critical: 0 })
  syncPetStats(p)
  player.pets.push(p)
  player.pet = {}
  return { ok: true, pet: p }
}

export const releasePet = (player, petId) => {
  const idx = (player.pets || []).findIndex(p => p.id === petId)
  if (idx < 0) return { ok: false, reason: '请先收回出战灵宠再放生' }
  const p = ensurePet(player.pets[idx])
  const dan = Math.max(1, Math.floor(p.level * (1 + p.reincarnation) + p.rootBone * 0.5))
  player.props.cultivateDan = num(player.props.cultivateDan) + dan
  player.pets.splice(idx, 1)
  return { ok: true, pet: p, dan }
}

export const createCapturedPet = ({ name, potential, attack, health, defense, dodge, critical }) => {
  const root = Math.max(1, Math.floor(num(potential, 1)))
  const pet = {
    id: Date.now() + Math.floor(Math.random() * 1000),
    lock: false,
    name: name || '无名灵宠',
    level: 1,
    rootBone: root,
    reincarnation: 0,
    favorability: 0,
    initial: {
      attack: Math.max(1, Math.floor(num(attack, 50))),
      health: Math.max(1, Math.floor(num(health, 100))),
      defense: Math.max(1, Math.floor(num(defense, 5))),
      dodge: clamp(num(dodge), 0, 0.5),
      critical: clamp(num(critical), 0, 0.5),
      rootBone: root
    }
  }
  pet.role = petRoleOf(pet).key
  syncPetStats(pet)
  return pet
}
