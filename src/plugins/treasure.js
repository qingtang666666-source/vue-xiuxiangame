// 天材地宝 —— 50 种，功效多样（提升根骨/觉醒体质/永久属性/一次修为/灵石/修炼速度等）

import { ensureAptitude, ROOT_BONES, CON_GRADES } from './aptitude.js'

export const TREASURE_TIERS = [
  { t: 1, name: '黄阶', q: 'info', mult: 1 },
  { t: 2, name: '玄阶', q: 'success', mult: 1.7 },
  { t: 3, name: '地阶', q: 'primary', mult: 2.8 },
  { t: 4, name: '天阶', q: 'purple', mult: 4.5 },
  { t: 5, name: '仙阶', q: 'pink', mult: 7 },
  { t: 6, name: '帝阶', q: 'warning', mult: 11 },
  { t: 7, name: '神阶', q: 'danger', mult: 17 },
  { t: 8, name: '灵阶', q: 'cyan', mult: 26 },
  { t: 9, name: '皇阶', q: 'orange', mult: 40 },
  { t: 10, name: '圣阶', q: 'gold', mult: 62 },
  { t: 11, name: '道阶', q: 'legendary', mult: 100 }
]

// 功效类型：key / 名称 / 药名后缀 / 各品阶命名 / 基底值
const EFFECT_DEFS = [
  { key: 'rootBone', name: '易骨', suffix: '果', stems: ['洗髓', '易骨', '蜕胎', '换骨', '通天'], base: 0, price: 1200, desc: '洗伐骨髓，提升根骨' },
  { key: 'awaken', name: '觉性', suffix: '芝', stems: ['凝魂', '通窍', '明心', '觉性', '开灵'], base: 0, price: 1600, desc: '凝聚神魂，觉醒体质' },
  { key: 'attack', name: '淬锋', suffix: '丹', stems: ['淬锋', '裂山', '破军', '斩龙', '碎星'], base: 20, price: 800, desc: '永久提升攻击' },
  { key: 'defense', name: '御岳', suffix: '丹', stems: ['金刚', '铁壁', '御岳', '磐石', '玄龟'], base: 18, price: 800, desc: '永久提升防御' },
  { key: 'health', name: '续命', suffix: '丹', stems: ['养脉', '回春', '固本', '培元', '续命'], base: 80, price: 1000, desc: '永久提升气血' },
  { key: 'critical', name: '入微', suffix: '丹', stems: ['锐眼', '入微', '点睛', '贯日', '屠龙'], base: 0.004, price: 1400, desc: '永久提升暴击' },
  { key: 'dodge', name: '凌波', suffix: '丹', stems: ['轻身', '飘渺', '凌波', '踏风', '无影'], base: 0.004, price: 1400, desc: '永久提升闪避' },
  { key: 'cultivation', name: '聚元', suffix: '露', stems: ['聚气', '凝元', '吐纳', '化灵', '归一'], base: 0.08, price: 900, desc: '一次性获得大量修为' },
  { key: 'money', name: '聚宝', suffix: '珠', stems: ['点石', '聚宝', '招财', '纳福', '金雨'], base: 30, price: 700, desc: '一次性获得大量灵石' },
  { key: 'speed', name: '悟道', suffix: '果', stems: ['悟道', '灵感', '入神', '坐照', '明心'], base: 0.01, price: 1100, desc: '永久提升修炼速度' }
]

export const TREASURES = (() => {
  const arr = []
  TREASURE_TIERS.forEach(tier => {
    EFFECT_DEFS.forEach((e, i) => {
      const stem = e.stems[i % e.stems.length]
      arr.push({
        key: `${tier.t}-${e.key}`,
        name: `${tier.name}${stem}${e.suffix}`,
        quality: tier.q,
        tier: tier.t,
        tierName: tier.name,
        use: e.key,
        price: Math.max(200, Math.floor(e.price * tier.mult)),
        desc: `${e.desc}（${tier.name}）`
      })
    })
  })
  return arr
})()

export const treasureById = key => TREASURES.find(t => t.key === key)
export const treasureCount = (player, key) => player.treasures?.[key] || 0

// 按境界推算可获取的天材地宝档位(1~11)
export const treasureTierOf = player => Math.min(11, Math.max(1, 1 + Math.floor((player.level || 0) / 12)))

// 按档位抽取一件天材地宝（用于奇遇/秘境掉落，避免低阶拿到高阶灵药）
export const treasureByTier = tier => {
  const t = Math.max(1, Math.min(11, tier))
  const pool = TREASURES.filter(x => x.tier === t)
  return pool.length ? pool[Math.floor(Math.random() * pool.length)] : TREASURES[0]
}

// 使用天材地宝
export const useTreasure = (player, key) => {
  const t = treasureById(key)
  if (!t) return { ok: false, reason: '未知天材' }
  if (!player.treasures) player.treasures = {}
  if ((player.treasures[key] || 0) <= 0) return { ok: false, reason: '未持有' }
  player.treasures[key] -= 1
  const ef = EFFECT_DEFS.find(x => x.key === t.use) || EFFECT_DEFS[0]
  const m = TREASURE_TIERS.find(x => x.t === t.tier)?.mult || 1

  const a = ensureAptitude(player)
  switch (t.use) {
    case 'rootBone': {
      if (a.rootBone >= ROOT_BONES.length - 1) return { ok: true, reason: '根骨已至道骨之巅' }
      const success = Math.min(0.85, Math.max(0.1, 0.7 - a.rootBone * 0.1 + m * 0.08))
      if (Math.random() < success) {
        a.rootBone += 1
        a.rootBoneName = ROOT_BONES[a.rootBone].name
        return { ok: true, upgrade: 'rootBone', name: ROOT_BONES[a.rootBone].name }
      }
      return { ok: true, reason: '根骨未提升，灵材已耗' }
    }
    case 'awaken': {
      const c = a.constitution
      if (!c || c.type === 'none') return { ok: true, reason: '凡体无需觉醒' }
      if (c.awakened) return { ok: true, reason: '体质已觉醒' }
      const grade = CON_GRADES.find(x => x.grade === c.grade) || CON_GRADES[0]
      if (Math.random() < Math.min(0.98, grade.awaken + m * 0.08)) {
        c.awakened = true
        return { ok: true, upgrade: 'awaken', name: c.name }
      }
      return { ok: true, reason: '觉醒失败，灵材已耗' }
    }
    case 'attack':
      player.attack = (player.attack || 0) + Math.floor(ef.base * m)
      return { ok: true, reason: `攻击 +${Math.floor(ef.base * m)}` }
    case 'defense':
      player.defense = (player.defense || 0) + Math.floor(ef.base * m)
      return { ok: true, reason: `防御 +${Math.floor(ef.base * m)}` }
    case 'health': {
      const v = Math.floor(ef.base * m)
      player.maxHealth = (player.maxHealth || 0) + v
      player.health = (player.health || 0) + v
      return { ok: true, reason: `气血 +${v}` }
    }
    case 'critical':
      player.critical = (player.critical || 0) + ef.base * m
      return { ok: true, reason: `暴击 +${(ef.base * m * 100).toFixed(1)}%` }
    case 'dodge':
      player.dodge = (player.dodge || 0) + ef.base * m
      return { ok: true, reason: `闪避 +${(ef.base * m * 100).toFixed(1)}%` }
    case 'cultivation': {
      const v = Math.floor((player.maxCultivation || 100) * ef.base * m)
      player.cultivation = (player.cultivation || 0) + v
      return { ok: true, reason: `修为 +${v}` }
    }
    case 'money': {
      const v = Math.floor((player.level || 1) * ef.base * m)
      player.props.money = (player.props.money || 0) + v
      return { ok: true, reason: `灵石 +${v}` }
    }
    case 'speed':
      player.cultivationSpeed = (player.cultivationSpeed || 1) + ef.base * m
      return { ok: true, reason: `修炼速度 +${(ef.base * m * 100).toFixed(1)}%` }
    default:
      return { ok: true, reason: '天地灵韵荡涤全身' }
  }
}

export const addTreasure = (player, key, qty = 1) => {
  if (!player.treasures) player.treasures = {}
  player.treasures[key] = (player.treasures[key] || 0) + qty
}
