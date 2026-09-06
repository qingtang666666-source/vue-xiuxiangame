// 资质系统 —— 根骨(修炼天赋) + 体质(一般/特殊，多品阶，觉醒概率随品级递增)
//
// 根骨：修炼速度倍率，品阶越高越快，每轮回随机。
// 体质：凡体(65%) / 一般体质(25%) / 特殊体质(10%)；每种体质分品阶，
//       品阶越高觉醒概率越低(觉醒后获得加成)，可消耗灵石重新觉醒。


export const ROOT_BONES = [
  { name: '凡骨', mult: 1.0, weight: 52 },
  { name: '灵骨', mult: 1.12, weight: 24 },
  { name: '仙骨', mult: 1.28, weight: 12 },
  { name: '圣骨', mult: 1.5, weight: 7 },
  { name: '神骨', mult: 1.85, weight: 3.5 },
  { name: '道骨', mult: 2.3, weight: 1.5 }
]

export const CON_TYPES = [
  { key: 'none', name: '凡体', chance: 65 },
  { key: 'normal', name: '一般体质', chance: 25 },
  { key: 'special', name: '特殊体质', chance: 10 }
]

export const CON_GRADES = [
  { grade: 1, name: '下品', awaken: 0.9, weight: 40 },
  { grade: 2, name: '中品', awaken: 0.7, weight: 28 },
  { grade: 3, name: '上品', awaken: 0.5, weight: 18 },
  { grade: 4, name: '极品', awaken: 0.35, weight: 10 },
  { grade: 5, name: '绝品', awaken: 0.25, weight: 4 }
]

const weightedPick = list => {
  const total = list.reduce((s, x) => s + (x.weight ?? x.chance ?? 1), 0)
  let r = Math.random() * total
  for (const x of list) {
    r -= x.weight ?? x.chance ?? 1
    if (r <= 0) return x
  }
  return list[list.length - 1]
}

// 每轮回随机一次根骨+体质
export const rollAptitude = () => {
  const rootBone = weightedPick(ROOT_BONES)
  const type = weightedPick(CON_TYPES)
  if (type.key === 'none') {
    return { rootBone: ROOT_BONES.indexOf(rootBone), rootBoneName: rootBone.name, constitution: { type: 'none', grade: 0, name: '凡体', awakened: false } }
  }
  const grade = weightedPick(CON_GRADES)
  const awakened = Math.random() < grade.awaken
  return {
    rootBone: ROOT_BONES.indexOf(rootBone),
    rootBoneName: rootBone.name,
    constitution: { type: type.key, grade: grade.grade, name: grade.name, awakened }
  }
}

// 轮回刷新资质
export const ensureAptitude = player => {
  if (player.aptitudeReincarnation !== player.reincarnation) {
    player.aptitude = rollAptitude()
    player.aptitudeReincarnation = player.reincarnation
  }
  if (!player.aptitude) player.aptitude = rollAptitude()
  return player.aptitude
}

// 资质加成：根骨倍率 + 体质(觉醒后)属性
export const aptitudeStats = player => {
  const a = ensureAptitude(player)
  const root = ROOT_BONES[a.rootBone] || ROOT_BONES[0]
  const st = { cultivationMult: root.mult || 1, cultivationSpeed: 0, attack: 0, defense: 0, health: 0, critical: 0, dodge: 0, effectBoost: 0 }
  const c = a.constitution
  if (c && c.awakened) {
    const g = c.grade || 0
    if (c.type === 'normal') {
      st.cultivationSpeed += 0.04 * g
      st.health += 40 * g
    } else if (c.type === 'special') {
      st.cultivationSpeed += 0.05 * g
      st.attack += 15 * g
      st.defense += 12 * g
      st.critical += 0.003 * g
      st.dodge += 0.003 * g
      st.effectBoost += 0.0015 * g
    }
  }
  return st
}

// 尝试重新觉醒体质（品阶越高越难，越贵）
export const awakenCost = player => {
  const a = ensureAptitude(player)
  const g = a.constitution?.grade || 1
  return { money: Math.floor(40 * g * g) }
}

export const awakenConstitution = player => {
  const a = ensureAptitude(player)
  const c = a.constitution
  if (!c || c.type === 'none') return { ok: false, reason: '凡体无需觉醒' }
  if (c.awakened) return { ok: false, reason: '体质已觉醒' }
  const grade = CON_GRADES.find(x => x.grade === c.grade) || CON_GRADES[0]
  const cost = awakenCost(player)
  if ((player.props.money || 0) < cost.money) return { ok: false, reason: '灵石不足' }
  player.props.money -= cost.money
  if (Math.random() < grade.awaken) {
    c.awakened = true
    return { ok: true, awakened: true, name: grade.name }
  }
  return { ok: false, reason: '觉醒失败，可再试' }
}
