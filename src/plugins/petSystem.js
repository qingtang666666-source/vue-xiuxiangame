// 灵宠系统 —— 统一收服、培养、悟性、转生、出战与放生规则
import { maxLv } from './game.js'
import { applyPlayerAttribute } from './playerAttr.js'
import equip from './equip.js'

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
const num = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d)

export const PET_QUALITIES = [
  { key: 'mortal', name: '凡品', color: 'info', mult: 1.0 },
  { key: 'spirit', name: '灵品', color: 'success', mult: 1.08 },
  { key: 'immortal', name: '仙品', color: 'primary', mult: 1.16 },
  { key: 'divine', name: '神品', color: 'warning', mult: 1.25 },
  { key: 'saint', name: '圣品', color: 'danger', mult: 1.35 }
]

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
  const level = clamp(Math.floor(num(pet?.level, 1)), 1, maxLv)
  const rootGain = Math.max(0, Math.floor(num(pet?.rootBone, 1)) - Math.floor(num(p.rootBone, 1)))
  const reincarnation = Math.max(0, Math.floor(num(pet?.reincarnation)))
  const levelFactor = 1 + (level - 1) * 0.025 * quality.mult
  const rootFactor = 1 + rootGain * 0.03
  const reincFactor = 1 + reincarnation * 0.3
  const mult = levelFactor * rootFactor * reincFactor
  const dodgeFactor = 1 + (level - 1) * 0.003 + rootGain * 0.015 + reincarnation * 0.04
  const critFactor = 1 + (level - 1) * 0.004 + rootGain * 0.02 + reincarnation * 0.05
  return {
    attack: Math.floor(num(p.attack) * mult),
    health: Math.floor(num(p.health) * mult),
    defense: Math.floor(num(p.defense) * mult),
    dodge: clamp(num(p.dodge) * dodgeFactor, 0, 0.5),
    critical: clamp(num(p.critical) * critFactor, 0, 0.5)
  }
}

export const syncPetStats = pet => {
  if (!pet) return null
  const s = petStats(pet)
  Object.assign(pet, s)
  pet.score = equip.calculateEquipmentScore(s.dodge, s.attack, s.health, s.critical, s.defense)
  return pet
}

export const petPowerScore = pet => {
  const s = petStats(pet)
  return Math.round(equip.calculateEquipmentScore(s.dodge, s.attack, s.health, s.critical, s.defense))
}

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
