// 装备专属套装 —— 11 阶，每阶 2 套；穿戴同套 2/3/4 件触发递增强化
//
// 套装加成独立计算（不计入装备基础属性），通过 setBonus 汇入 effectivePlayerStats。
// 每套有侧重方向(focus)，同阶两套互补，避免单属性堆叠过强。

export const TIER_QUALITY = ['info', 'success', 'primary', 'purple', 'pink', 'warning', 'danger', 'cyan', 'orange', 'gold', 'legendary']
export const TIER_NAME = { info: '黄阶', success: '玄阶', primary: '地阶', purple: '天阶', pink: '仙阶', warning: '帝阶', danger: '神阶', cyan: '灵阶', orange: '皇阶', gold: '圣阶', legendary: '道阶' }

const SLOT_NOUN = {
  weapon: ['剑', '刀', '枪', '弓', '刃', '斧', '锤', '杖', '鞭', '钩'],
  armor: ['甲', '铠', '袍', '氅', '裘', '衣', '胄', '盾'],
  accessory: ['环', '佩', '珠', '戒', '铃', '镯', '链', '翎'],
  sutra: ['卷', '经', '书', '诀', '典', '铭', '章', '录']
}

// 各侧重方向：主属性全额 + 副属性较弱
const FOCUS = {
  attack: { attack: 1, critical: 0.4 },
  defense: { defense: 1, health: 0.5 },
  health: { health: 1, defense: 0.6 },
  critical: { critical: 1, attack: 0.4 },
  dodge: { dodge: 1, cultivationSpeed: 0.6 },
  cultivationSpeed: { cultivationSpeed: 1, moneyMult: 0.6, effectBoost: 0.4 }
}

// 每阶 2 套定义（root 用于拼装备名）
export const EQUIP_SETS = [
  { quality: 'info', sets: [{ id: 'h_cx', name: '晨曦套', focus: 'attack', roots: ['晨曦', '晨光', '旭日'] }, { id: 'h_dy', name: '丹野套', focus: 'health', roots: ['丹野', '青芜', '林泉'] }] },
  { quality: 'success', sets: [{ id: 'x_qy', name: '青岩套', focus: 'defense', roots: ['青岩', '苍磐', '玄岩'] }, { id: 'x_cl', name: '苍雷套', focus: 'critical', roots: ['苍雷', '霆音', '惊雷'] }] },
  { quality: 'primary', sets: [{ id: 'd_cx', name: '赤霄套', focus: 'attack', roots: ['赤霄', '炽阳', '炎陵'] }, { id: 'd_xm', name: '玄冥套', focus: 'dodge', roots: ['玄冥', '幽影', '暮烟'] }] },
  { quality: 'purple', sets: [{ id: 't_zh', name: '紫徽套', focus: 'critical', roots: ['紫徽', '紫霄', '星河'] }, { id: 't_sy', name: '霜月套', focus: 'attack', roots: ['霜月', '寒魄', '冰轮'] }] },
  { quality: 'pink', sets: [{ id: 'x_qd', name: '青帝套', focus: 'cultivationSpeed', roots: ['青帝', '长春', '扶桑'] }, { id: 'x_tx', name: '太虚套', focus: 'defense', roots: ['太虚', '渺渺', '云海'] }] },
  { quality: 'warning', sets: [{ id: 'd_mw', name: '明王套', focus: 'defense', roots: ['明王', '不动', '金刚'] }, { id: 'd_ft', name: '焚天套', focus: 'attack', roots: ['焚天', '赤乌', '离火'] }] },
  { quality: 'danger', sets: [{ id: 's_xl', name: '修罗套', focus: 'attack', roots: ['修罗', '血煞', '枯骨'] }, { id: 's_yq', name: '幽泉套', focus: 'dodge', roots: ['幽泉', '黄泉', '忘川'] }] },
  { quality: 'cyan', sets: [{ id: 'l_ts', name: '天枢套', focus: 'critical', roots: ['天枢', '北辰', '南斗'] }, { id: 'l_ch', name: '沧海套', focus: 'cultivationSpeed', roots: ['沧海', '潮生', '澜沧'] }] },
  { quality: 'orange', sets: [{ id: 'h_xh', name: '玄黄套', focus: 'attack', roots: ['玄黄', '混沌', '鸿蒙'] }, { id: 'h_tan', name: '太极套', focus: 'defense', roots: ['太极', '两仪', '四象'] }] },
  { quality: 'gold', sets: [{ id: 't_ty', name: '太一攻套', focus: 'attack', roots: ['太一', '无极', '无极剑'] }, { id: 't_hy', name: '混元守套', focus: 'health', roots: ['混元', '乾坤', '归一'] }] },
  { quality: 'legendary', sets: [{ id: 'd_wg', name: '万古套', focus: 'critical', roots: ['万古', '永恒', '太初'] }, { id: 'd_cs', name: '长生套', focus: 'cultivationSpeed', roots: ['长生', '不死', '轮回'] }] }
]

export const setsForQuality = quality => EQUIP_SETS.find(e => e.quality === quality)?.sets || null

export const setById = id => {
  if (CHEST_SET && CHEST_SET.id === id) return CHEST_SET
  if (CHEST_SET2 && CHEST_SET2.id === id) return CHEST_SET2
  for (const e of EQUIP_SETS) {
    for (const s of e.sets) if (s.id === id) return { ...s, quality: e.quality, tierName: TIER_NAME[e.quality] }
  }
  return null
}

// 装备宝箱专属套装：无限制可穿戴，4 件套触发强效（帝阶档价值约 3 万筹码）
export const CHEST_SET = { id: 'chest_bao', name: '鸿蒙万宝套', focus: 'attack', quality: 'warning', roots: ['鸿蒙', '万宝', '宝光'], tierName: '帝阶' }
export const CHEST_SET2 = { id: 'chest_taixu', name: '太虚无极套', focus: 'critical', quality: 'legendary', roots: ['太虚', '无极', '永恒'], tierName: '道阶' }

// 按套装生成装备名：root + 槽位名词（同套不同部位/词根组合出大量名字）
export const pieceName = (set, slot, seed) => {
  const roots = set.roots || ['灵']
  const nouns = SLOT_NOUN[slot] || ['器']
  const r = roots[seed % roots.length] || roots[0]
  const n = nouns[(seed >> 2) % nouns.length] || nouns[0]
  const m = (seed % 3) === 0 ? '灵' : ''
  return `${r}${m}${n}`
}

const qiOf = quality => TIER_QUALITY.indexOf(quality)

// 套装加成：count>=4→三级，>=3→二级，>=2→一级（不叠加，取最高档）
export const setBonusOf = (set, count) => {
  if (!set || count < 2) return {}
  const qi = qiOf(set.quality)
  const scale = 1 + qi * 0.7
  const f = FOCUS[set.focus] || FOCUS.attack
  const lvl = count >= 4 ? 2 : count >= 3 ? 1 : 0
  const base = [
    { attack: 16, defense: 12, health: 55, critical: 0.004, dodge: 0.004, cultivationSpeed: 0.015, effectBoost: 0.01 },
    { attack: 30, defense: 22, health: 100, critical: 0.008, dodge: 0.008, cultivationSpeed: 0.03, effectBoost: 0.02 },
    { attack: 50, defense: 38, health: 175, critical: 0.013, dodge: 0.013, cultivationSpeed: 0.05, effectBoost: 0.035 }
  ][lvl]
  const acc = {}
  Object.keys(base).forEach(k => {
    const w = f[k] != null ? f[k] : (k === 'effectBoost' ? 0.5 : 0.2)
    const v = base[k] * scale * w
    acc[k] = (k === 'attack' || k === 'defense' || k === 'health') ? Math.round(v) : Math.round(v * 1000) / 1000
  })
  return acc
}

export const pickSetForQuality = (quality, seed) => {
  const sets = setsForQuality(quality)
  if (!sets || !sets.length) return null
  return sets[(seed ?? Math.floor(Math.random() * 100)) % sets.length]
}
