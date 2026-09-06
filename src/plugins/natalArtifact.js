// 本命法宝：随主角伴生、轮回不丢。随境界成长，可"温养"升等级提升攻防；
// 每踏入新的大境界"觉醒"一次，增加一条法宝词条（暴击/闪避），词条跨世累积、上限 6 条。

const TIER_NAMES = ['黄阶', '玄阶', '地阶', '天阶', '仙阶', '帝阶', '神阶', '灵阶', '皇阶', '圣阶', '道阶']

const AFFIX_POOL = [
  { key: 'crit', name: '通明', critical: 0.02 },
  { key: 'dodge', name: '如影', dodge: 0.02 },
  { key: 'crit2', name: '破妄', critical: 0.03 },
  { key: 'dodge2', name: '逍遥', dodge: 0.03 }
]

const stageOfPlayer = lv => Math.max(0, Math.min(15, Math.floor((lv - 1) / 9)))

export const natalArtifactTier = player => TIER_NAMES[Math.min(10, stageOfPlayer(player.level || 0))]

export const ensureNatalArtifact = player => {
  if (!player.natalArtifact) player.natalArtifact = { level: 1, stage: -1, affixes: [] }
  const na = player.natalArtifact
  if (na.stage == null) na.stage = -1
  const cur = stageOfPlayer(player.level || 0)
  if (cur > na.stage) {
    na.stage = cur
    if ((na.affixes || []).length < 6) {
      const pick = AFFIX_POOL[Math.floor(Math.random() * AFFIX_POOL.length)]
      na.affixes.push({ ...pick })
    }
  }
  return na
}

// 本命法宝攻防与词条加成（接入 effectivePlayerStats）
export const natalArtifactStats = player => {
  const na = ensureNatalArtifact(player)
  const stage = stageOfPlayer(player.level || 0)
  const tierMult = 1 + stage * 0.3
  const lv = Math.max(1, na.level || 1)
  let critical = 0
  let dodge = 0
  ;(na.affixes || []).forEach(a => {
    critical += a.critical || 0
    dodge += a.dodge || 0
  })
  return {
    attack: Math.floor(12 * lv * tierMult),
    defense: Math.floor(10 * lv * tierMult),
    critical: Math.min(0.3, critical),
    dodge: Math.min(0.3, dodge)
  }
}

export const natalUpgradeCost = player => {
  const na = ensureNatalArtifact(player)
  const lv = na.level || 1
  const stage = stageOfPlayer(player.level || 0)
  const maxLv = 5 + stage * 3
  return {
    maxLv,
    stone: Math.max(1, Math.floor(lv / 4)),
    money: Math.floor(200 * lv * (1 + stage * 0.3)),
    herb: Math.max(0, Math.floor(lv / 6))
  }
}

export const natalUpgrade = player => {
  const na = ensureNatalArtifact(player)
  const cost = natalUpgradeCost(player)
  if (na.level >= cost.maxLv) return { ok: false, reason: '已到当前境界温养上限，突破后解锁' }
  if ((player.props.strengtheningStone || 0) < cost.stone) return { ok: false, reason: `炼器石不足(需 ${cost.stone})` }
  if ((player.props.money || 0) < cost.money) return { ok: false, reason: `灵石不足(需 ${cost.money})` }
  if (cost.herb && (player.props.spiritHerb || 0) < cost.herb) return { ok: false, reason: `灵草不足(需 ${cost.herb})` }
  player.props.strengtheningStone -= cost.stone
  player.props.money -= cost.money
  if (cost.herb) player.props.spiritHerb -= cost.herb
  na.level += 1
  return { ok: true, level: na.level }
}

export const natalAffixNames = player => (ensureNatalArtifact(player).affixes || []).map(a => a.name)
