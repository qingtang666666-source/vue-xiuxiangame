// 神通介绍与收益预览 —— 功法阁、功法卡、回合制战斗共用同一套口径
//
//   divineAbilityInfo(player, id)   神通的战斗施放信息（battleEngine 亦以此生成技能表）
//   divineTipText(ab, extra)        悬浮介绍正文（多行，配 white-space: pre-line）
//   divineTipForTech(player, id)    按功法 id 直接取介绍（未习得则按 0 重/入门估算）
//   proficiencyPreview(player, id)  熟练度晋升「当前 → 下一级」收益预览
//   chapterPreview(player, id)      修炼提升 1 重的收益预览

import {
  techniqueById,
  TECH_GRADES,
  TECH_MAX_CHAPTER,
  PROF_MAX,
  profMult,
  profName,
  statName,
  methodChapter
} from './technique.js'
import { DIVINE_KINDS, divineKind } from './technique.js'

const methodsOf = player => (player && player.methods) || {}
const mpCostOf = (g, chapter, proficiency) =>
  Math.max(15, Math.floor((18 + g * 6) * (1 + (chapter || 0) * 0.02 + Math.max(0, (proficiency || 1) - 1) * 0.03)))

// 威力/耗灵/触发率的算法与 battleEngine.getPlayerAbilities 完全一致
export const divineAbilityInfo = (player, id) => {
  const t = techniqueById(id)
  if (!t || !t.divine) return null
  const m = methodsOf(player)[id]
  if (!m) return null
  const g = TECH_GRADES[t.grade - 1]?.mult || 1
  const chapter = m.chapter || 0
  const proficiency = m.proficiency || 1
  const pm = profMult(proficiency)
  const kind = t.divine.kind || 'burst'
  const chance = Math.min(0.3, (t.divine.chance ?? 0.1) + 0.004 * chapter)
  return {
    techId: id,
    techName: t.name,
    name: t.divine.name,
    kind,
    familyName: t.familyName,
    gradeName: t.gradeName,
    rarityName: t.rarityName,
    base: t.divine.dmg,
    power: t.divine.dmg * (1 + chapter * 0.04) * (kind === 'control' ? 0.8 : 1),
    // 功法升级后灵力消耗小幅增加：重数 +2%/重，熟练度 +3%/级
    mpCost: mpCostOf(g, chapter, proficiency),
    chance,
    stunChance: kind === 'control' ? Math.min(0.3, chance * 0.35) : 0,
    chapter,
    proficiency,
    profName: profName(proficiency),
    pm
  }
}

// 悬浮介绍正文
export const divineTipText = (ab, extra = '') => {
  if (!ab) return ''
  const kd = divineKind(ab.kind)
  const pct = v => `${(v * 100).toFixed(1)}%`
  const lines = [
    `【${ab.name}】${ab.techName ? ` · ${ab.techName}` : ''}`,
    `流派：${ab.familyName || '-'} · ${ab.gradeName || '-'}　类型：${kd.name}`,
    `威力：×${(ab.power ?? 0).toFixed(2)}${ab.chapter ? `（含 ${ab.chapter} 重加成 +${(ab.chapter * 4).toFixed(0)}%）` : ''}`,
    `耗灵力：${ab.mpCost ?? '-'}　自动触发率：${ab.chance != null ? pct(ab.chance) : '-'}`,
    `效果：${kd.desc}`
  ]
  if (kd.formula) lines.push(`结算：${kd.formula}`)
  if (ab.kind === 'control' && ab.stunChance) lines.push(`当前定身几率：${pct(ab.stunChance)}`)
  if (ab.kind === 'heal') lines.push(`预计回复：约最大气血的 ${(12 * (ab.power ?? 1)).toFixed(0)}%`)
  if (ab.profName) lines.push(`熟练度「${ab.profName}」倍率：×${(ab.pm ?? 1).toFixed(2)}`)
  if (extra) lines.push(extra)
  return lines.join('\n')
}

// 未习得的功法也给出估算，避免悬浮只有一行名字
export const divineTipForTech = (player, id) => {
  const t = techniqueById(id)
  if (!t || !t.divine) return ''
  if (methodsOf(player)[id]) return divineTipText(divineAbilityInfo(player, id))
  const g = TECH_GRADES[t.grade - 1]?.mult || 1
  const kind = t.divine.kind || 'burst'
  const chance = t.divine.chance ?? 0.1
  return divineTipText(
    {
      techName: t.name,
      name: t.divine.name,
      kind,
      familyName: t.familyName,
      gradeName: t.gradeName,
      power: t.divine.dmg * (kind === 'control' ? 0.8 : 1),
      mpCost: mpCostOf(g, 0, 1),
      chance,
      stunChance: kind === 'control' ? Math.min(0.3, chance * 0.35) : 0,
      chapter: 0
    },
    '尚未习得：以上为参悟后初始（0 重、入门）估算'
  )
}

const fmtStat = (k, v) => (k === 'critical' || k === 'dodge' ? `${(v * 100).toFixed(2)}%` : k === 'cultivationSpeed' || k === 'moneyMult' ? v.toFixed(2) : Math.round(v).toString())

// 熟练度晋升收益预览
export const proficiencyPreview = (player, id) => {
  const t = techniqueById(id)
  const m = methodsOf(player)[id]
  if (!t || !m) return null
  const cur = m.proficiency || 1
  const next = Math.min(PROF_MAX, cur + 1)
  const g = TECH_GRADES[t.grade - 1]?.mult || 1
  const chapter = methodChapter(player, id)
  const cm = profMult(cur)
  const nm = profMult(next)
  const curMp = mpCostOf(g, chapter, cur)
  const nextMp = mpCostOf(g, chapter, next)
  const rows = []
  ;[t.passive, t.passive2].forEach((k, i) => {
    if (!k) return
    const per = i === 0 ? t.per : t.per2
    const c = per * chapter * g * cm
    const n = per * chapter * g * nm
    if (!n) return
    rows.push({ stat: statName(k), cur: fmtStat(k, c), next: fmtStat(k, n), delta: `+${fmtStat(k, n - c)}` })
  })
  const divineBase = t.divine ? t.divine.dmg * (1 + chapter * 0.04) * (t.divine.kind === 'control' ? 0.8 : 1) : 0
  return {
    cur,
    next,
    curName: profName(cur),
    nextName: profName(next),
    curMult: cm,
    nextMult: nm,
    mpCost: { cur: curMp, next: nextMp },
    maxed: cur >= PROF_MAX,
    needChapter: cur * 4,
    chapterOk: chapter >= cur * 4,
    rows,
    divine: t.divine ? { name: t.divine.name, cur: divineBase, next: divineBase * (nm / cm) } : null
  }
}

// 修炼提升 1 重的收益预览
export const chapterPreview = (player, id) => {
  const t = techniqueById(id)
  const m = methodsOf(player)[id]
  if (!t || !m) return null
  const g = TECH_GRADES[t.grade - 1]?.mult || 1
  const chapter = methodChapter(player, id)
  const pm = profMult(m.proficiency || 1)
  const curMp = mpCostOf(g, chapter, m.proficiency || 1)
  const nextMp = mpCostOf(g, chapter + 1, m.proficiency || 1)
  const rows = []
  ;[t.passive, t.passive2].forEach((k, i) => {
    if (!k) return
    const per = (i === 0 ? t.per : t.per2) * g * pm
    if (!per) return
    rows.push({ stat: statName(k), gain: `+${fmtStat(k, per)}` })
  })
  return {
    chapter,
    next: Math.min(TECH_MAX_CHAPTER, chapter + 1),
    maxed: chapter >= TECH_MAX_CHAPTER,
    mpCost: { cur: curMp, next: nextMp },
    rows,
    divineGain: t.divine ? t.divine.dmg * (1 + (chapter + 1) * 0.04) : 0
  }
}

export { DIVINE_KINDS, divineKind }
