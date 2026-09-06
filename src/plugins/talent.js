// 天赋系统 —— 品质分级、属性加成、等级越高抽到好天赋概率越大

// 品质定义：key 用于权重计算，name 展示，color 对应 el-tag 类型
export const TALENT_QUALITY = {
  common: { name: '凡品', color: 'info' },
  uncommon: { name: '良品', color: 'primary' },
  rare: { name: '上品', color: 'success' },
  epic: { name: '极品', color: 'warning' },
  legendary: { name: '神品', color: 'danger' }
}

// 等级上限，用于把 player.level 归一化到 0~1 的“品质权重”区间
const MAX_LEVEL = 144

// 天赋池。bonus 里的字段对应玩家属性：
//   attack / defense / health(最大生命) / critical(暴击率, 0~1) / dodge(闪避率, 0~1)
//   cultivationSpeed(修炼速度加成)
export const TALENTS = [
  // ---- 凡品 ----
  { id: 1, quality: 'common', name: '强身健体', desc: '气血更旺，生命上限提升', bonus: { health: 50 } },
  { id: 2, quality: 'common', name: '气血充盈', desc: '生命上限提升', bonus: { health: 80 } },
  { id: 3, quality: 'common', name: '经脉畅通', desc: '修炼速度小幅提升', bonus: { cultivationSpeed: 0.05 } },
  { id: 4, quality: 'common', name: '筋骨坚韧', desc: '防御提升', bonus: { defense: 5 } },
  { id: 5, quality: 'common', name: '气力微增', desc: '攻击提升', bonus: { attack: 5 } },

  // ---- 良品 ----
  { id: 6, quality: 'uncommon', name: '气力过人', desc: '攻击提升', bonus: { attack: 15 } },
  { id: 7, quality: 'uncommon', name: '铁骨铮铮', desc: '防御提升', bonus: { defense: 15 } },
  { id: 8, quality: 'uncommon', name: '心如止水', desc: '修炼速度提升', bonus: { cultivationSpeed: 0.12 } },
  { id: 9, quality: 'uncommon', name: '灵活身法', desc: '闪避率提升', bonus: { dodge: 0.01 } },
  { id: 10, quality: 'uncommon', name: '眼疾手快', desc: '暴击率提升', bonus: { critical: 0.01 } },

  // ---- 上品 ----
  { id: 11, quality: 'rare', name: '天赋异禀', desc: '修炼速度明显提升', bonus: { cultivationSpeed: 0.25 } },
  { id: 12, quality: 'rare', name: '剑心通明', desc: '攻击显著提升', bonus: { attack: 40 } },
  { id: 13, quality: 'rare', name: '金身不坏', desc: '防御与生命提升', bonus: { defense: 30, health: 200 } },
  { id: 14, quality: 'rare', name: '疾风骤雨', desc: '闪避与暴击提升', bonus: { dodge: 0.02, critical: 0.02 } },

  // ---- 极品 ----
  { id: 15, quality: 'epic', name: '灵根天成', desc: '全属性小幅提升', bonus: { attack: 60, defense: 40, health: 300, cultivationSpeed: 0.4 } },
  { id: 16, quality: 'epic', name: '万中无一', desc: '攻击大增，暴击提升', bonus: { attack: 100, critical: 0.05 } },
  { id: 17, quality: 'epic', name: '大道之体', desc: '防御与生命大增', bonus: { defense: 80, health: 600 } },

  // ---- 神品 ----
  { id: 18, quality: 'legendary', name: '混沌道体', desc: '全属性大幅提升', bonus: { attack: 200, defense: 150, health: 1200, cultivationSpeed: 0.8 } },
  { id: 19, quality: 'legendary', name: '逆天改命', desc: '全属性极致提升，暴击与闪避兼得', bonus: { attack: 300, defense: 200, health: 2000, critical: 0.08, dodge: 0.08 } }
]

export const getTalentById = id => TALENTS.find(t => t.id === id)

/**
 * 依据玩家当前等级(境界)抽取一个天赋。
 * 等级越高，高品质天赋的权重越大。
 */
export const rollTalentForLevel = (level, goodBonus = 0) => {
  const t = Math.min(1, Math.max(0, level || 0) / MAX_LEVEL)
  // 基础权重，随等级向高品质倾斜
  // goodBonus（悟道台加成）额外推高上品及以上权重
  const weights = {
    common: 50 * (1 - t * 0.5), // 满级时降到一半
    uncommon: 30 * (1 + t * 0.5),
    rare: 12 * (1 + t * 4) + goodBonus * 10,
    epic: 6 * (1 + t * 10) + goodBonus * 25,
    legendary: 2 * (1 + t * 20) + goodBonus * 50
  }
  let total = 0
  for (const q in weights) total += weights[q]
  let r = Math.random() * total
  let picked = 'common'
  for (const q in weights) {
    r -= weights[q]
    if (r <= 0) {
      picked = q
      break
    }
  }
  const pool = TALENTS.filter(x => x.quality === picked)
  return pool[Math.floor(Math.random() * pool.length)] || TALENTS[0]
}

// 将天赋加成应用到玩家属性（仅在首次获得时生效）
const applyTalentBonus = (player, talent) => {
  const b = talent.bonus
  if (b.attack) player.attack += b.attack
  if (b.defense) player.defense += b.defense
  if (b.health) {
    player.maxHealth += b.health
    player.health += b.health
  }
  if (b.critical) player.critical += b.critical
  if (b.dodge) player.dodge += b.dodge
  if (b.cultivationSpeed) player.cultivationSpeed = (player.cultivationSpeed || 1) + b.cultivationSpeed
}

/**
 * 为玩家抽取一个天赋并写入 player.talents。
 * 重复获得同一天赋时 count 递增（不加属性，避免多抽导致属性无限膨胀）。
 * 返回 { talent, isNew }，isNew 表示是否首次获得。
 */
export const drawTalentForPlayer = (player, opts = {}) => {
  const talent = rollTalentForLevel(player.level, opts.goodBonus || 0)
  const existing = (player.talents || []).find(t => t.id === talent.id)
  if (existing) {
    existing.count += 1
    return { talent, isNew: false }
  }
  if (!player.talents) player.talents = []
  player.talents.push({ id: talent.id, count: 1 })
  applyTalentBonus(player, talent)
  return { talent, isNew: true }
}
