// 技艺阶位(1~11) —— 炼丹/炼器/符箓/阵法 各自有师名与阶位
// 每成功炼制到某阶，即晋升为该阶大师（rank = 最高炼制阶位）

export const CRAFT_SKILLS = [
  { key: 'alchemy', name: '丹药', titles: ['药童', '药徒', '药师', '丹师', '炼丹师', '丹道师', '丹宗', '丹王', '丹圣', '丹皇', '丹帝'] },
  { key: 'forge', name: '炼器', titles: ['铁匠', '铸徒', '器师', '炼器师', '器宗', '器王', '器圣', '器皇', '器帝', '器神', '器尊'] },
  { key: 'talisman', name: '符箓', titles: ['符童', '画符匠', '符师', '符箓师', '符宗', '符王', '符圣', '符皇', '符帝', '符神', '符尊'] },
  { key: 'formation', name: '阵法', titles: ['阵童', '布阵匠', '阵师', '阵法师', '阵宗', '阵王', '阵圣', '阵皇', '阵帝', '阵神', '阵尊'] }
]

export const CRAFT_MAX = 11

// ---- 大境界节奏：16 个大境界 × 每境界 9 级 = 1~144 ----
export const REALM_STAGES = 16
export const LEVELS_PER_STAGE = 9
export const stageOfLevel = level => Math.max(0, Math.min(REALM_STAGES - 1, Math.floor(((level || 1) - 1) / LEVELS_PER_STAGE)))
export const stageStartLevel = stage => stage * LEVELS_PER_STAGE + 1

// 11 品阶各自解锁的大境界，正好落在境界边界上：跨一个大境界 = 换一个档位
//   黄=炼气 玄=金丹 地=元婴 天=炼虚 仙=合体 帝=大乘 神=渡劫 灵=真仙 皇=金仙 圣=大罗金仙 道=道祖
const TIER_STAGE = [0, 2, 3, 5, 6, 7, 9, 10, 12, 13, 15]
const clampTier = tier => Math.max(1, Math.min(11, Math.round(tier || 1)))

// 品级(1~11) → 解锁所需修为等级（按大境界边界对齐）
export const craftLevelOfTier = tier => stageStartLevel(TIER_STAGE[clampTier(tier) - 1])

// 当前境界对应的品阶（用于技艺阶位展示与炼制上限）
export const craftTierByLevel = level => {
  const lv = Math.max(1, level || 1)
  let tier = 1
  for (let i = 1; i <= 11; i++) if (craftLevelOfTier(i) <= lv) tier = i
  return tier
}
export const craftTierMax = (player, over = 2) => Math.min(11, craftTierByLevel(player.level) + over)

// ---- 品阶效果曲线：拉大「大境界之间」的 丹/符/阵/装 差距 ----
// 数值型（攻/防/气血等直接加值）：逐阶 ×1.9，道阶 611（原 100）
export const TIER_FLAT = [1, 2, 4, 8, 13, 25, 47, 89, 169, 322, 611]
// 百分比型（暴/闪/修炼速度/收益等本就受封顶约束）：沿用原曲线，不轻易顶满 80% 上限
export const TIER_PCT = [1, 1.7, 2.8, 4.5, 7, 11, 17, 26, 40, 62, 100]
export const tierFlat = tier => TIER_FLAT[clampTier(tier) - 1]
export const tierPct = tier => TIER_PCT[clampTier(tier) - 1]
// 限时增益专用（符箓 buff）：逐阶 ×1.75，道阶 269 —— 让高阶符不只是“撞同一个上限”，
// 而是真的比上一个大境界的符强一档（最终仍受 setBonus 的攻/防百分比总封顶约束）
export const TIER_BUFF = [1, 1.75, 3.06, 5.36, 9.38, 16.4, 28.7, 50.3, 88, 154, 269]
export const tierBuff = tier => TIER_BUFF[clampTier(tier) - 1]

// 装备基础值的境界超线性增长：每上一个大境界 ×1.09（同等级道祖装 ≈ 炼气装的 3.6 倍）
export const GEAR_STAGE_RATIO = 1.09
export const gearRealmMult = level => Math.pow(GEAR_STAGE_RATIO, stageOfLevel(level))

// 高品阶限时增益的百分比上限按阶放宽，保证「高阶一定强于低阶」而不是早早撞顶
export const tierCapBoost = tier => 1 + (clampTier(tier) - 1) * 0.18

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

// ---- 通用「已有 / 需要 / 所缺」材料清单（炼丹 / 制符 / 炼器共用）----

// 常见消耗项的显示名与配色
export const COST_META = [
  { key: 'spiritHerb', name: '灵草', type: 'success' },
  { key: 'money', name: '灵石', type: 'warning' },
  { key: 'cultivateDan', name: '培养丹', type: 'primary' },
  { key: 'strengtheningStone', name: '炼器石', type: 'danger' }
]

// cost = { spiritHerb, money, cultivateDan, strengtheningStone, material?: { key, qty } }
// matName(key) 把核心材料 key 翻成中文显示名
export const costRows = (player, cost, matName) => {
  if (!cost) return []
  const props = player?.props || {}
  const rows = COST_META.filter(c => (cost[c.key] || 0) > 0).map(c => {
    const need = cost[c.key] || 0
    const have = props[c.key] || 0
    return { key: c.key, name: c.name, need, have, ok: have >= need, type: c.type, core: false }
  })
  const mat = cost.material
  if (mat && mat.key) {
    const need = mat.qty || 0
    const have = props[mat.key] || 0
    rows.push({ key: mat.key, name: matName ? matName(mat.key) : mat.key, need, have, ok: have >= need, type: 'danger', core: true })
  }
  return rows
}

// 缺失清单 → 文案（传 needLevel 则一并提示境界不足）
export const costShortfallText = (rows, needLevel = 0) => {
  const parts = []
  if (needLevel) parts.push(`境界需 ${needLevel} 级`)
  const lack = rows.filter(r => !r.ok).map(r => `${r.name}×${Math.max(1, r.need - r.have)}`)
  if (lack.length) parts.push(`缺 ${lack.join('、')}`)
  return parts.join(' · ')
}
