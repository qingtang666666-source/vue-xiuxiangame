// 技艺阶位(1~11) —— 炼丹/炼器/符箓/阵法 各自有师名与阶位
// 每成功炼制到某阶，即晋升为该阶大师（rank = 最高炼制阶位）

export const CRAFT_SKILLS = [
  { key: 'alchemy', name: '丹药', titles: ['药童', '药徒', '药师', '丹师', '炼丹师', '丹道师', '丹宗', '丹王', '丹圣', '丹皇', '丹帝'] },
  { key: 'forge', name: '炼器', titles: ['铁匠', '铸徒', '器师', '炼器师', '器宗', '器王', '器圣', '器皇', '器帝', '器神', '器尊'] },
  { key: 'talisman', name: '符箓', titles: ['符童', '画符匠', '符师', '符箓师', '符宗', '符王', '符圣', '符皇', '符帝', '符神', '符尊'] },
  { key: 'formation', name: '阵法', titles: ['阵童', '布阵匠', '阵师', '阵法师', '阵宗', '阵王', '阵圣', '阵皇', '阵帝', '阵神', '阵尊'] }
]

export const CRAFT_MAX = 11

// 炼制等级上限：境界允许的品级 + 可越级(默认+2)
export const craftTierByLevel = level => Math.min(11, Math.max(1, Math.floor((level || 1) / 13) + 1))
export const craftTierMax = (player, over = 2) => Math.min(11, craftTierByLevel(player.level) + over)

// 品级(1~11) → 所需修为等级：低阶低、道阶高(≈144)
export const craftLevelOfTier = tier => Math.min(144, Math.max(1, 1 + (tier - 1) * 14))

// 炼制成功率（按档位 1~11）：炼丹/炼器共用，道阶(11)=40%、地阶(3)=85% 等锚点插值取整
export const TIER_CRAFT_SUCCESS = [0.95, 0.90, 0.85, 0.75, 0.70, 0.65, 0.60, 0.55, 0.50, 0.45, 0.40]

export const craftTitle = (key, rank) => {
  const s = CRAFT_SKILLS.find(x => x.key === key)
  if (!s) return ''
  if (!rank || rank <= 0) return '未入阶(0阶)'
  const idx = Math.min(s.titles.length - 1, Math.max(0, rank - 1))
  return `${s.titles[idx]}(${rank}阶)`
}

// 炼制成功后晋升：rank = 取最大
export const bumpCraftRank = (player, key, tier) => {
  if (!player.skills) player.skills = { alchemy: 0, forge: 0, talisman: 0, formation: 0 }
  player.skills[key] = Math.max(player.skills[key] || 0, Math.min(CRAFT_MAX, tier || 0))
  return player.skills[key]
}
