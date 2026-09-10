// 功法体系 —— 参考凡人修仙传等传统玄幻的功法库（本次大幅扩充并重平衡）
//
// 玩法（本次重构）：
//   · 功法分「主动(带神通，战斗使用) / 被动(纯增益)」；主动最多选 5 门、被动最多选 3 门生效。
//   · 功法稀有度 凡/灵/仙/圣/帝/神/上古：越高越难获得、越难参悟。
//   · 无修炼等级门槛；先「获得功法卷轴/传承」，再「参悟」——成功率由 资质(根骨) × 悟性 决定。
//   · 功法阁只展示「已获得卷轴/已习得」的功法，未获得不显示。
//   · methodStats 只结算选中的主动+被动；旧存档未设置时自动回退旧逻辑(主修全额+其余30%)。
//   · 流派库覆盖 攻击/防御/气血/暴击/闪避/修炼速度/灵石 七属性，且每属性均有主动与被动，
//     但避免单属性堆叠过强（暴击/闪避会被钳到 85%、修炼速度封顶 10、灵石封顶 30）。

import { insightDiscount } from './insight.js'

export const TECH_GRADES = [
  { g: 1, name: '黄阶', q: 'info', mult: 1 },
  { g: 2, name: '玄阶', q: 'success', mult: 1.5 },
  { g: 3, name: '地阶', q: 'primary', mult: 2.2 },
  { g: 4, name: '天阶', q: 'purple', mult: 3.5 },
  { g: 5, name: '仙阶', q: 'pink', mult: 5.5 },
  { g: 6, name: '帝阶', q: 'warning', mult: 11 },
  { g: 7, name: '神阶', q: 'danger', mult: 17 },
  { g: 8, name: '灵阶', q: 'cyan', mult: 26 },
  { g: 9, name: '皇阶', q: 'orange', mult: 40 },
  { g: 10, name: '圣阶', q: 'gold', mult: 62 },
  { g: 11, name: '道阶', q: 'legendary', mult: 100 }
]

// 功法稀有度（越高越稀有，参悟成功率越低、获取途径越少）
export const RARITIES = [
  { idx: 0, name: '凡阶', base: 0.9 },
  { idx: 1, name: '灵阶', base: 0.72 },
  { idx: 2, name: '仙阶', base: 0.55 },
  { idx: 3, name: '圣阶', base: 0.4 },
  { idx: 4, name: '帝阶', base: 0.28 },
  { idx: 5, name: '神阶', base: 0.18 },
  { idx: 6, name: '上古', base: 0.11 }
]
export const rarityOfGrade = grade => (grade <= 1 ? 0 : grade <= 3 ? 1 : grade <= 5 ? 2 : grade <= 6 ? 3 : grade <= 7 ? 4 : grade <= 9 ? 5 : 6)
export const RARITY_NAMES = RARITIES.map(r => r.name)

export const STAT_NAMES = { attack: '攻击', defense: '防御', health: '气血', critical: '暴击', dodge: '闪避', cultivationSpeed: '修炼速度', moneyMult: '灵石', critDamage: '暴伤', accuracy: '命中', armorPen: '破甲', block: '格挡', damageReduction: '减伤', tenacity: '韧性' }
export const statName = s => STAT_NAMES[s] || s
// 被动功法数值统一放大倍率（主动功法的被动附带数值不变）
export const PASSIVE_TECH_MULT = 10
export const passiveValueMult = t => (t?.type === 'passive' ? PASSIVE_TECH_MULT : 1)
export const passivePer = (t, key = 'per') => (key === 'per2' ? t?.per2 || 0 : t?.per || 0) * passiveValueMult(t)

// 神通四类效果的说明与结算口径（与 battleEngine 实现严格对应），供功法阁与战斗悬浮共用
export const DIVINE_KINDS = {
  burst: { name: '爆发', color: '#f56c6c', desc: '单次高倍率伤害，无附加效果', formula: '伤害 =（我方攻击 − 对方防御）× 威力倍率' },
  control: { name: '控制', color: '#409eff', desc: '伤害打 8 折，命中后有机会定身对手 1 回合', formula: '定身几率 = 触发率 × 35%（封顶 30%）' },
  heal: { name: '回复', color: '#67c23a', desc: '不造成伤害，按威力回复自身气血', formula: '回复 = 我方最大气血 × 12% × 威力倍率' },
  lifesteal: { name: '吸血', color: '#e6a23c', desc: '造成伤害后按比例吸血，续航强', formula: '回复 = 本次伤害 × 35%' }
}
export const divineKind = k => DIVINE_KINDS[k] || { name: k || '未知', color: '#909399', desc: '战斗中的神通效果', formula: '' }

// 流派库：尽力覆盖 攻击/防御/气血/暴击/闪避/修炼速度/灵石 七个属性，且每属性都同时有主动与被动。
// per/per2 为「每重 × 品阶倍率 × 熟练度倍率」的基础值，已在下方 balanceAudit 里校准。
export const FAMILIES = [
  // ============ 主动：带神通，战斗中触发 ============
  { key: 'sword', type: 'active', name: '剑修', suffix: '剑诀', stems: ['青莲', '万剑', '御风', '无尘', '惊鸿', '紫青', '太虚'], passive: 'attack', per: 4, passive2: 'critical', per2: 0.00003, divine: { name: '万剑归宗', kind: 'burst', dmg: 1.6, chance: 0.10 } },
  { key: 'fire', type: 'active', name: '火修', suffix: '焚天功', stems: ['烈焰', '焚天', '南明', '丹阳', '赤帝', '离火', '祝融'], passive: 'attack', per: 3, passive2: 'critical', per2: 0.00003, divine: { name: '焚天烈焰', kind: 'burst', dmg: 1.8, chance: 0.10 } },
  { key: 'gold', type: 'active', name: '金修', suffix: '庚金诀', stems: ['庚金', '玄金', '太白', '金鼎', '锐金', '天兵', '金乌'], passive: 'attack', per: 3, passive2: 'defense', per2: 2, divine: { name: '庚金斩天', kind: 'burst', dmg: 1.5, chance: 0.09 } },
  { key: 'blade', type: 'active', name: '刀修', suffix: '裂空刀', stems: ['裂空', '斩云', '断岳', '霸刀', '天刀', '玄冥', '破军'], passive: 'attack', per: 4, passive2: 'defense', per2: 1.5, divine: { name: '一刀两断', kind: 'burst', dmg: 1.7, chance: 0.10 } },
  { key: 'ice', type: 'active', name: '冰修', suffix: '冰心诀', stems: ['寒冰', '玄冰', '凝霜', '冰魄', '太阴', '霜天', '幽莲'], passive: 'defense', per: 3, passive2: 'critical', per2: 0.00003, divine: { name: '冰封万里', kind: 'control', dmg: 1.4, chance: 0.12 } },
  { key: 'armor', type: 'active', name: '甲修', suffix: '玄甲功', stems: ['玄甲', '不动', '磐石', '金钟', '玄武', '镇岳', '铁壁'], passive: 'defense', per: 3, passive2: 'health', per2: 8, divine: { name: '不动明王', kind: 'heal', dmg: 1.2, chance: 0.12 } },
  { key: 'thunder', type: 'active', name: '雷修', suffix: '雷诀', stems: ['紫霄', '天雷', '九霄', '震雷', '真武', '都天', '神霄'], passive: 'critical', per: 0.00005, divine: { name: '九天雷劫', kind: 'burst', dmg: 2.0, chance: 0.10 } },
  { key: 'star', type: 'active', name: '星修', suffix: '周天诀', stems: ['周天', '北辰', '南斗', '万星', '天罡', '紫微', '织女'], passive: 'critical', per: 0.00004, passive2: 'attack', per2: 3, divine: { name: '星河倒卷', kind: 'burst', dmg: 1.9, chance: 0.09 } },
  { key: 'illusion', type: 'active', name: '幻修', suffix: '幻心诀', stems: ['幻心', '大梦', '万相', '千幻', '迷离', '蜃楼', '梦蝶'], passive: 'dodge', per: 0.00004, passive2: 'critical', per2: 0.00002, divine: { name: '海市蜃楼', kind: 'control', dmg: 1.4, chance: 0.12 } },
  { key: 'wind', type: 'active', name: '风修', suffix: '御风诀', stems: ['御风', '扶摇', '长歌', '青冥', '疾风', '太虚', '摩云'], passive: 'dodge', per: 0.00003, passive2: 'cultivationSpeed', per2: 0.0002, divine: { name: '风卷残云', kind: 'burst', dmg: 1.5, chance: 0.10 } },
  { key: 'dao', type: 'active', name: '道修', suffix: '长生诀', stems: ['长生', '坐忘', '无为', '逍遥', '抱元', '混元', '问天'], passive: 'cultivationSpeed', per: 0.0003, passive2: 'moneyMult', per2: 0.00015, divine: { name: '大道归一', kind: 'burst', dmg: 1.7, chance: 0.12 } },
  { key: 'spirit', type: 'active', name: '神修', suffix: '神识诀', stems: ['神识', '观微', '天眼', '冥思', '灵犀', '神游', '照心'], passive: 'cultivationSpeed', per: 0.00025, passive2: 'critical', per2: 0.00002, divine: { name: '识海焚天', kind: 'control', dmg: 1.5, chance: 0.11 } },
  { key: 'blood', type: 'active', name: '血修', suffix: '血煞功', stems: ['血煞', '噬灵', '血河', '幽冥', '赤练', '修罗', '饮血'], passive: 'attack', per: 3, passive2: 'health', per2: 10, divine: { name: '血海无涯', kind: 'lifesteal', dmg: 1.3, chance: 0.12 } },
  { key: 'verdant', type: 'active', name: '木修', suffix: '青帝诀', stems: ['青帝', '长春', '木灵', '扶桑', '苍梧', '建木', '碧梧'], passive: 'attack', per: 2.5, passive2: 'cultivationSpeed', per2: 0.0002, divine: { name: '春回大地', kind: 'heal', dmg: 1.4, chance: 0.12 } },
  { key: 'vajra', type: 'active', name: '体修', suffix: '金刚体', stems: ['金刚', '不坏', '罗汉', '梵圣', '天罡', '丈六', '明王'], passive: 'health', per: 15, passive2: 'defense', per2: 2, divine: { name: '金刚不坏', kind: 'heal', dmg: 1.3, chance: 0.12 } },
  { key: 'merchant', type: 'active', name: '商修', suffix: '聚宝诀', stems: ['聚宝', '金算', '万利', '天宝', '白璧', '润屋', '招财'], passive: 'moneyMult', per: 0.00015, passive2: 'cultivationSpeed', per2: 0.0002, divine: { name: '点石成金', kind: 'burst', dmg: 1.4, chance: 0.10 } },

  // ============ 被动：纯增益，不占神通 ============
  { key: 'earth', type: 'passive', name: '土修', suffix: '厚土功', stems: ['厚土', '山岳', '川岳', '坤元', '后土', '玄黄', '地脉'], passive: 'defense', per: 3, passive2: 'health', per2: 8 },
  { key: 'water', type: 'passive', name: '水修', suffix: '沧浪诀', stems: ['沧浪', '碧波', '水灵', '沧海', '天河', '止水', '渊深'], passive: 'dodge', per: 0.00003 },
  { key: 'wood', type: 'passive', name: '木修', suffix: '青木功', stems: ['青木', '春生', '灵木', '枯荣', '百草', '浩然', '长青'], passive: 'cultivationSpeed', per: 0.0003 },
  { key: 'body', type: 'passive', name: '体修', suffix: '九转玄功', stems: ['九转', '不灭', '金刚', '武体', '浑天', '磐石', '镇狱'], passive: 'health', per: 12, passive2: 'defense', per2: 1.5 },
  { key: 'mountain', type: 'passive', name: '山修', suffix: '移山功', stems: ['移山', '镇岳', '擎天', '泰岳', '横断', '不周', '安澜'], passive: 'defense', per: 2.5, passive2: 'health', per2: 6 },
  { key: 'thunderp', type: 'passive', name: '雷意', suffix: '霆音诀', stems: ['雷意', '霆音', '惊雷', '紫电', '电母', '郁雷', '云雷'], passive: 'critical', per: 0.00005 },
  { key: 'starp', type: 'passive', name: '星辉', suffix: '辰光诀', stems: ['星辉', '流萤', '荧惑', '天枢', '暗星', '参宿', '辰光'], passive: 'critical', per: 0.00004, passive2: 'attack', per2: 2 },
  { key: 'swordi', type: 'passive', name: '剑意', suffix: '承影诀', stems: ['剑意', '剑心', '承影', '龙泉', '湛卢', '纯钧', '鱼肠'], passive: 'attack', per: 3, passive2: 'critical', per2: 0.00002 },
  { key: 'firecore', type: 'passive', name: '火灵', suffix: '真阳诀', stems: ['火灵', '真阳', '地火', '神焰', '火德', '灯芯', '炽阳'], passive: 'attack', per: 2.5, passive2: 'critical', per2: 0.00002 },
  { key: 'icec', type: 'passive', name: '寒晶', suffix: '玄霜诀', stems: ['寒晶', '玄霜', '冰髓', '寒玉', '玄阴', '雪魄', '霜华'], passive: 'defense', per: 2.5, passive2: 'dodge', per2: 0.00002 },
  { key: 'windp', type: 'passive', name: '巽风', suffix: '天岚诀', stems: ['巽风', '清风', '天岚', '松风', '玄风', '去留', '枕雪'], passive: 'dodge', per: 0.00003, passive2: 'cultivationSpeed', per2: 0.0002 },
  { key: 'lotus', type: 'passive', name: '莲修', suffix: '功德莲', stems: ['青莲', '白莲', '金莲', '九品', '净台', '宝幢', '妙华'], passive: 'health', per: 8, passive2: 'dodge', per2: 0.00002 },
  { key: 'dan', type: 'passive', name: '丹修', suffix: '丹元功', stems: ['丹元', '紫丹', '精气', '还丹', '灵台', '九转丹', '道种'], passive: 'health', per: 6, passive2: 'moneyMult', per2: 0.00012 },
  { key: 'coin', type: 'passive', name: '财修', suffix: '如意功', stems: ['如意', '纳福', '聚财', '富贵', '天禄', '生财', '万贯'], passive: 'moneyMult', per: 0.00015, passive2: 'cultivationSpeed', per2: 0.0001 },
  { key: 'merit', type: 'passive', name: '功德修', suffix: '醮修功', stems: ['功德', '醮修', '焚香', '祈天', '积善', '香火', '登坛'], passive: 'cultivationSpeed', per: 0.00025, passive2: 'moneyMult', per2: 0.0001 },
  { key: 'moon', type: 'passive', name: '月修', suffix: '月华功', stems: ['月华', '清辉', '桂魄', '望舒', '寒月', '冰轮', '婵娟'], passive: 'dodge', per: 0.00003, passive2: 'cultivationSpeed', per2: 0.00015 },

  // ============ 核心属性拓展功法（暴伤/破甲/命中/格挡/减伤） ============
  { key: 'rupture', type: 'active', name: '破军', suffix: '裂甲功', stems: ['裂甲', '破军', '穿云', '碎岳', '贯日'], passive: 'armorPen', per: 1.5, divine: { name: '贯日一击', kind: 'burst', dmg: 1.6, chance: 0.10 } },
  { key: 'precision', type: 'active', name: '神射', suffix: '锁魂诀', stems: ['锁魂', '穿杨', '贯心', '破空', '定星'], passive: 'accuracy', per: 0.00004, divine: { name: '穿杨一击', kind: 'burst', dmg: 1.5, chance: 0.10 } },
  { key: 'fury', type: 'active', name: '狂战', suffix: '怒涛诀', stems: ['怒涛', '焚心', '亢龙', '泣血', '狂澜'], passive: 'critDamage', per: 0.0002, divine: { name: '怒涛千击', kind: 'burst', dmg: 1.7, chance: 0.10 } },
  { key: 'ward', type: 'passive', name: '坚壁', suffix: '守御诀', stems: ['坚壁', '不动', '磐石', '镇岳', '固元'], passive: 'block', per: 0.00004, passive2: 'damageReduction', per2: 0.00003 }
]

export const TECHNIQUES = (() => {
  const arr = []
  TECH_GRADES.forEach(g => {
    FAMILIES.forEach((f, i) => {
      const stem = f.stems[(g.g - 1) % f.stems.length]
      arr.push({
        id: `${g.g}-${f.key}`,
        name: `${g.name}·${stem}${f.suffix}`,
        type: f.type,
        grade: g.g,
        gradeName: g.name,
        quality: g.q,
        rarity: rarityOfGrade(g.g),
        rarityName: RARITY_NAMES[rarityOfGrade(g.g)],
        family: f.key,
        familyName: f.name,
        passive: f.passive,
        per: f.per,
        passive2: f.passive2 || null,
        per2: f.per2 || 0,
        divine: f.divine ? { ...f.divine } : null,
        desc: `${f.name}功法，主修${statName(f.passive)}${f.passive2 ? `、兼修${statName(f.passive2)}` : ''}，${f.type === 'active' ? '战斗可引动神通' : '辅修之玄功'}`
      })
    })
  })
  return arr
})()

export const techniqueById = id => TECHNIQUES.find(t => t.id === id)
export const TECH_MAX_CHAPTER = 20

const getMethods = player => {
  if (!player.methods) player.methods = {}
  return player.methods
}
export const methodChapter = (player, id) => getMethods(player)[id]?.chapter || 0
export const mainMethod = player => player.mainMethod || null

export const PROF_NAMES = ['入门', '小成', '大成', '圆满', '化劲']
export const PROF_MAX = 5
export const profName = prof => PROF_NAMES[Math.min(4, Math.max(0, (prof || 1) - 1))]
export const profOf = prof => profName(typeof prof === 'object' ? (prof.proficiency || 1) : prof)
export const profMult = prof => 1 + (Math.max(1, Math.min(5, prof || 1)) - 1) * 0.5
export const proficiencyOf = (player, id) => getMethods(player)[id]?.proficiency || 1

// —— 获得 / 参悟 ——
export const hasScroll = (player, id) => (player.techniqueScrolls || []).includes(id)

export const grantScroll = (player, id) => {
  const t = techniqueById(id)
  if (!t) return { ok: false, reason: '未知功法' }
  if (!player.techniqueScrolls) player.techniqueScrolls = []
  if (hasScroll(player, id)) return { ok: false, reason: '已有此卷轴' }
  player.techniqueScrolls.push(id)
  return { ok: true, name: t.name, rarityName: t.rarityName }
}

// 参悟成功率 = 基础(稀有度) × 资质(根骨) × 悟性；封顶 0.95，最低 0.03
export const learnSuccessRate = (player, id) => {
  const t = techniqueById(id)
  if (!t) return 0
  const base = RARITIES[t.rarity]?.base || 0.5
  const a = player.aptitude || { rootBone: 0 }
  const rootMult = [1, 1.12, 1.28, 1.5, 1.85, 2.3][a.rootBone || 0] || 1
  const ins = 1 + ((player.insight || 1) - 1) * 0.02
  let rate = Math.min(0.95, Math.max(0.03, base * rootMult * ins))
  // 参悟保底：仅初始成功率 <70% 时，每失败一次 +15%，封顶 70%
  if (rate < 0.7) {
    const fails = (player.learnFails || {})[id] || 0
    rate = Math.min(0.7, rate + fails * 0.15)
  }
  return rate
}

// 参悟：需已获得卷轴（或旧档已习得）；按成功率判定，失败消耗资源
export const learnCost = player => {
  const n = Object.keys(getMethods(player)).length
  return { money: Math.floor(120 * Math.pow(n + 1, 1.3)), dan: n >= 3 ? Math.ceil((n - 2) * 1.5) : 0 }
}

// 参悟失败保底：记录失败次数（成功后清零）
const bumpLearnFail = (player, id, ok) => {
  if (!player.learnFails) player.learnFails = {}
  if (ok) player.learnFails[id] = 0
  else player.learnFails[id] = (player.learnFails[id] || 0) + 1
}

export const attemptLearn = (player, id) => {
  const t = techniqueById(id)
  if (!t) return { ok: false, reason: '未知功法' }
  if (getMethods(player)[id]) return { ok: false, reason: '已修此功' }
  if (!hasScroll(player, id)) return { ok: false, reason: '未获得此功法卷轴' }
  const cost = learnCost(player)
  const disc = insightDiscount(player)
  cost.money = Math.max(0, Math.floor(cost.money * (1 - disc)))
  if ((player.props.money || 0) < cost.money) return { ok: false, reason: '灵石不足' }
  if ((player.props.cultivateDan || 0) < cost.dan) return { ok: false, reason: '培养丹不足' }
  const rate = learnSuccessRate(player, id)
  if (Math.random() <= rate) {
    player.props.money -= cost.money
    player.props.cultivateDan -= cost.dan
    getMethods(player)[id] = { chapter: 1, grade: t.grade, proficiency: 1 }
    if (!player.mainMethod || techniqueById(player.mainMethod)?.type !== 'active') player.mainMethod = id
    bumpLearnFail(player, id, true)
    return { ok: true, name: t.name, rate }
  }
  // 失败仍消耗一半资源
  player.props.money -= Math.floor(cost.money / 2)
  player.props.cultivateDan -= Math.floor(cost.dan / 2)
  bumpLearnFail(player, id, false)
  return { ok: false, reason: '参悟失败，心境未合（资质悟性不足）', rate }
}

// 兼容旧接口：原「修习」按钮 → 参悟（现在改为开启一段时间参悟，完成后结算）
export const learnTechnique = (player, id) => startLearn(player, id)

// 修炼章节（不受等级门槛限制，只看资源）
export const chapterCost = (player, id) => {
  const t = techniqueById(id)
  const chapter = methodChapter(player, id)
  const base = (t?.grade || 1) * 150
  return { money: Math.floor(base * Math.pow(chapter + 1, 1.4)), dan: chapter >= 8 ? Math.floor((chapter - 7) * 2) : 0 }
}

// 兼容旧接口：原「修炼」按钮 → 修炼章节（现在改为开启一段时间的修炼，完成后提升）
export const cultivateTechnique = (player, id) => startCultivate(player, id)

// ================================================================
// 功法时间成本：参悟 / 修炼都需要现实时间（离线也会推进）
// 同一时间只能进行一门功法动作（闭关专注），参悟完成按成功率结算，失败返还一半资源
// ================================================================
const now = () => Date.now()

export const TECH_NO_TASK = '正闭关参悟/修炼其他功法，请待其完成'

// 当前在途的功法任务（无则 null）
export const techTask = player => {
  if (!player) return null
  const t = player.techTask
  if (!t || typeof t.start !== 'number') return null
  return t
}

// 参悟时长（毫秒）：随品阶提升，悟性越高越快
export const learnTimeMs = (player, id) => {
  const t = techniqueById(id)
  const g = t?.grade || 1
  const base = 5 + g * 1.4 // 秒：黄阶约6s，道阶(11)约20s；再受悟性减免（更快）
  const before = Math.min(20000, Math.max(8000, Math.floor(base * (1 - insightDiscount(player))) * 1000))
  return Math.max(1000, Math.floor(before * 0.5)) // 参悟时间减半
}

// 修炼章节时长（毫秒）：随品阶与当前重数提升
export const cultivateTimeMs = (player, id) => {
  const t = techniqueById(id)
  const g = t?.grade || 1
  const ch = methodChapter(player, id)
  const base = 4 + g * 0.8 + ch * 0.5 // 秒：初阶约5s，高阶高重(11阶20重)约22s（再受悟性减免）
  return Math.min(20000, Math.max(5000, Math.floor(base * (1 - insightDiscount(player))) * 1000)) // 硬性封顶 20s
}

// 剩余毫秒
export const remainMs = player => {
  const task = techTask(player)
  if (!task) return 0
  return Math.max(0, task.start + task.duration - now())
}

// 开启参悟：扣资源，计时，完成后结算成功率
export const startLearn = (player, id) => {
  const t = techniqueById(id)
  if (!t) return { ok: false, reason: '未知功法' }
  if (getMethods(player)[id]) return { ok: false, reason: '已修此功' }
  if (!hasScroll(player, id)) return { ok: false, reason: '未获得此功法卷轴' }
  if (techTask(player)) return { ok: false, reason: TECH_NO_TASK }
  const cost = learnCost(player)
  const disc = insightDiscount(player)
  cost.money = Math.max(0, Math.floor(cost.money * (1 - disc)))
  if ((player.props.money || 0) < cost.money) return { ok: false, reason: '灵石不足' }
  if ((player.props.cultivateDan || 0) < cost.dan) return { ok: false, reason: '培养丹不足' }
  player.props.money -= cost.money
  player.props.cultivateDan -= cost.dan
  const rate = learnSuccessRate(player, id)
  player.techTask = {
    type: 'learn', id, name: t.name, rate,
    cost: { money: cost.money, dan: cost.dan },
    start: now(), duration: learnTimeMs(player, id)
  }
  return { ok: true, pending: true, task: player.techTask, duration: player.techTask.duration }
}

// 开启修炼：扣资源，计时，完成后章节 +1
export const startCultivate = (player, id) => {
  const t = techniqueById(id)
  const chapter = methodChapter(player, id)
  if (!t || !chapter) return { ok: false, reason: '未习得此功' }
  if (chapter >= TECH_MAX_CHAPTER) return { ok: false, reason: '已至上乘' }
  if (techTask(player)) return { ok: false, reason: TECH_NO_TASK }
  const cost = chapterCost(player, id)
  const disc = insightDiscount(player)
  cost.money = Math.max(0, Math.floor(cost.money * (1 - disc)))
  if ((player.props.money || 0) < cost.money) return { ok: false, reason: '灵石不足' }
  if ((player.props.cultivateDan || 0) < cost.dan) return { ok: false, reason: '培养丹不足' }
  player.props.money -= cost.money
  player.props.cultivateDan -= cost.dan
  player.techTask = {
    type: 'cultivate', id, name: t.name, chapter,
    cost: { money: cost.money, dan: cost.dan },
    start: now(), duration: cultivateTimeMs(player, id)
  }
  return { ok: true, pending: true, task: player.techTask, duration: player.techTask.duration }
}

// 结算：任务到期后调用；未到期或无任务返回 null
export const tickTechniques = player => {
  const task = techTask(player)
  if (!task) return null
  if (now() - task.start < task.duration) return null
  if (task.type === 'learn') {
    const ok = Math.random() <= task.rate
    if (ok) {
      const t = techniqueById(task.id)
      getMethods(player)[task.id] = { chapter: 1, grade: t?.grade, proficiency: 1 }
      if (!player.mainMethod || techniqueById(player.mainMethod)?.type !== 'active') player.mainMethod = task.id
      bumpLearnFail(player, task.id, true)
    } else {
      player.props.money += Math.floor((task.cost.money || 0) / 2)
      player.props.cultivateDan += Math.floor((task.cost.dan || 0) / 2)
      bumpLearnFail(player, task.id, false)
    }
    player.techTask = null
    return { ok, kind: 'learn', name: task.name, rate: task.rate }
  }
  if (task.type === 'cultivate') {
    const m = getMethods(player)[task.id]
    if (m) {
      m.chapter = Math.min(TECH_MAX_CHAPTER, (m.chapter || 0) + 1)
      const ch = m.chapter
      player.techTask = null
      return { ok: true, kind: 'cultivate', name: task.name, chapter: ch }
    }
    player.techTask = null
    return { ok: true, kind: 'cultivate', name: task.name, chapter: null }
  }
  player.techTask = null
  return null
}

// 供通知/提示使用的结算文案
export const techTaskResultMessage = r => {
  if (!r) return ''
  if (r.kind === 'learn') {
    return r.ok ? `参悟【${r.name}】功成，习得此法！` : `参悟【${r.name}】失败，心境未合，损耗半数资源`
  }
  if (r.kind === 'cultivate') {
    return r.chapter ? `【${r.name}】修至 ${r.chapter} 重` : `【${r.name}】修炼中断`
  }
  return ''
}

export const upgradeProficiency = (player, id) => {
  const m = getMethods(player)[id]
  if (!m) return { ok: false, reason: '未习得此功' }
  const cur = m.proficiency || 1
  if (cur >= PROF_MAX) return { ok: false, reason: '已至化劲' }
  const needChapter = cur * 4
  if ((m.chapter || 0) < needChapter) return { ok: false, reason: `需章节达 ${needChapter} 重方可晋升` }
  const cost = { money: Math.floor(350 * Math.pow(2, cur - 1)), dan: cur >= 3 ? cur - 2 : 0 }
  const save = Math.min(0.5, insightDiscount(player) + Math.min(0.15, ((player.level || 0) / 144) * 0.15))
  cost.money = Math.max(0, Math.floor(cost.money * (1 - save)))
  const props = player.props || {}
  if ((props.money || 0) < cost.money) return { ok: false, reason: '灵石不足' }
  if ((props.cultivateDan || 0) < cost.dan) return { ok: false, reason: '培养丹不足' }
  props.money -= cost.money
  props.cultivateDan -= cost.dan
  m.proficiency = cur + 1
  return { ok: true, proficiency: m.proficiency, profName: profName(m.proficiency) }
}

// —— 主动/被动选择（最高主动 5、被动 3）——
export const ACTIVE_MAX = 5
export const PASSIVE_MAX = 3

const ensureSet = player => {
  if (!player.techniqueSet) player.techniqueSet = { active: [], passive: [] }
  if (!Array.isArray(player.techniqueSet.active)) player.techniqueSet.active = []
  if (!Array.isArray(player.techniqueSet.passive)) player.techniqueSet.passive = []
  return player.techniqueSet
}
export const techniqueActive = player => ensureSet(player).active
export const techniquePassive = player => ensureSet(player).passive

// 已习得功法的出售价值（按品阶/章节评估，八折回收灵石）
export const techniqueSellPrice = (player, id) => {
  const t = techniqueById(id)
  const m = getMethods(player)[id]
  if (!t || !m) return 0
  const g = TECH_GRADES[t.grade - 1]?.mult || 1
  const chapter = m.chapter || 0
  const value = Math.floor((t.grade * 60 + chapter * 25) * g)
  return Math.max(20, Math.floor(value * 0.8))
}

const removeMethod = (player, id) => {
  delete getMethods(player)[id]
  // 出售/遗忘后连卷轴一并移除，不可再参悟
  player.techniqueScrolls = (player.techniqueScrolls || []).filter(x => x !== id)
  const set = player.techniqueSet
  if (set) {
    set.active = (set.active || []).filter(x => x !== id)
    set.passive = (set.passive || []).filter(x => x !== id)
  }
  if (player.mainMethod === id) player.mainMethod = null
  if (player.techTask && player.techTask.id === id) player.techTask = null
}

// 出售已习得功法：八折回收灵石，保留卷轴（可参悟重修）
export const sellTechnique = (player, id) => {
  const t = techniqueById(id)
  const m = getMethods(player)[id]
  if (!t || !m) return { ok: false, reason: '未习得此功' }
  const price = techniqueSellPrice(player, id)
  removeMethod(player, id)
  player.props.money = (player.props.money || 0) + price
  return { ok: true, price, name: t.name }
}

// 遗忘已习得功法：清除记忆，不返还灵石
export const forgetTechnique = (player, id) => {
  const t = techniqueById(id)
  const m = getMethods(player)[id]
  if (!t || !m) return { ok: false, reason: '未习得此功' }
  removeMethod(player, id)
  return { ok: true, name: t.name }
}

export const toggleTechniqueSet = (player, id) => {
  const t = techniqueById(id)
  if (!t) return { ok: false, reason: '未知功法' }
  if (!getMethods(player)[id]) return { ok: false, reason: '尚未习得' }
  const set = ensureSet(player)
  const key = t.type === 'active' ? 'active' : 'passive'
  const max = key === 'active' ? ACTIVE_MAX : PASSIVE_MAX
  const list = set[key]
  const idx = list.indexOf(id)
  if (idx >= 0) {
    list.splice(idx, 1)
    return { ok: true, on: false }
  }
  if (list.length >= max) return { ok: false, reason: `${t.type === 'active' ? '主动功法' : '被动功法'}最多选 ${max} 门` }
  list.push(id)
  return { ok: true, on: true }
}

export const setMainMethod = (player, id) => {
  const m = getMethods(player)[id]
  if (!m) return { ok: false, reason: '未习得' }
  const t = techniqueById(id)
  if (t && t.type === 'passive') return { ok: false, reason: '被动功法不能设为主修' }
  if (!player.techniqueSet?.active?.includes(id)) ensureSet(player).active.push(id)
  player.mainMethod = id
  return { ok: true }
}

// 汇总功法加成：有设置 → 仅结算选中的主动+被动；否则旧逻辑(主修全额+其余30%)
export const methodStats = player => {
  const acc = {
    attack: 0, defense: 0, health: 0, critical: 0, dodge: 0, cultivationSpeed: 0, moneyMult: 0,
    critDamage: 0, accuracy: 0, armorPen: 0, block: 0, damageReduction: 0, tenacity: 0
  }
  const methods = getMethods(player)
  const set = player.techniqueSet
  const hasSet = set && ((set.active && set.active.length) || (set.passive && set.passive.length))
  const divines = []

  const addPassive = (t, m, frac) => {
    const g = TECH_GRADES[t.grade - 1]?.mult || 1
    const pm = profMult(m.proficiency || 1)
    acc[t.passive] = (acc[t.passive] || 0) + passivePer(t) * m.chapter * g * frac * pm
    if (t.passive2) acc[t.passive2] = (acc[t.passive2] || 0) + passivePer(t, 'per2') * m.chapter * g * frac * pm
  }
  const addDivine = (t, m) => {
    if (!t.divine) return
    const d = { ...t.divine, g: TECH_GRADES[t.grade - 1]?.mult || 1, chapter: m.chapter, pm: profMult(m.proficiency || 1) }
    d.chance = Math.min(0.3, d.chance + 0.004 * d.chapter)
    d.mult = Math.min(3.5, d.dmg * d.pm + 0.02 * d.chapter)
    divines.push(d)
  }

  if (hasSet) {
    const ids = [...new Set([...set.active, ...set.passive])]
    ids.forEach(id => {
      const m = methods[id]
      if (!m) return
      const t = techniqueById(id)
      if (!t) return
      addPassive(t, m, 1)
      if (t.type === 'active' && t.divine) addDivine(t, m)
    })
  } else {
    Object.entries(methods).forEach(([id, m]) => {
      const t = techniqueById(id)
      if (!t) return
      const frac = id === player.mainMethod ? 1 : 0.3
      addPassive(t, m, frac)
      if (id === player.mainMethod && t.divine) addDivine(t, m)
    })
  }

  // 设置主力神通：优先主修对应的主动功法，否则第一门选中主动功法
  const divine = divines.find(d => d.name && techniqueById(player.mainMethod)?.divine?.name === d.name) || divines.find(d => d.name)
  if (divine) {
    acc.divineChance = divine.chance
    acc.divineMult = divine.mult
    acc.divineKind = divine.kind
    acc.divineName = divine.name
  } else {
    acc.divineChance = 0
    acc.divineMult = 1
    acc.divineKind = undefined
    acc.divineName = undefined
  }
  acc.divinePool = divines
  return acc
}

// —— 已获得功法（卷轴或已习得）——
export const ownedTechniqueIds = player => {
  const ids = new Set()
  ;(player.techniqueScrolls || []).forEach(id => ids.add(id))
  Object.keys(getMethods(player)).forEach(id => ids.add(id))
  return ids
}
export const ownedTechniques = player => TECHNIQUES.filter(t => ownedTechniqueIds(player).has(t.id))

// 掉落的品阶上限随境界（等级 1~144）抬升：低境界最多出黄/玄，后期才可能出圣/道
export const techGradeForLevel = level => Math.max(1, Math.min(11, Math.floor((level || 0) / 13) + 1))

// 随机掉落一门功法卷轴：品阶越高等概率越低；默认不重复给出已获得的门派
export const rollTechniqueDrop = (player, opts = {}) => {
  const { maxGrade, minGrade = 1, type, family, attempts = 10 } = opts
  const gate = techGradeForLevel(player.level)
  const top = Math.max(minGrade, Math.min(maxGrade || gate, gate))
  let pool = TECHNIQUES.filter(t => t.grade >= minGrade && t.grade <= top)
  if (type) pool = pool.filter(t => t.type === type)
  if (family) pool = pool.filter(t => t.family === family)
  const owned = ownedTechniqueIds(player)
  pool = pool.filter(t => !owned.has(t.id))
  if (!pool.length) return { ok: false, reason: '已得全或此境无功法可落' }

  const weight = t => 1 / Math.pow(t.grade, 2.2)
  let chosen = null
  for (let a = 0; a < attempts; a++) {
    let total = 0
    const ws = pool.map(t => { const w = Math.max(1e-6, weight(t)); total += w; return w })
    let r = Math.random() * total
    for (let i = 0; i < pool.length; i++) {
      r -= ws[i]
      if (r <= 0) { chosen = pool[i]; break }
    }
    if (!chosen) chosen = pool[pool.length - 1]
    if (!owned.has(chosen.id)) break
    chosen = null
  }
  if (!chosen) return { ok: false, reason: '已得全' }
  const res = grantScroll(player, chosen.id)
  return { ...res, tech: chosen }
}

// 确定性伪随机（mulberry32）：同一 seed 恒返回同一序列，用于“幸运数字→同款功法”
export const seededRandom = seed => {
  let t = (seed >>> 0) + 0x6d2b79f5
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

// 按幸运数字发放功法卷轴：不同数字 → 不同功法；彩蛋(easter) 允许高一档品阶
export const grantSeededScrolls = (player, seed, { easter = false, count = 1 } = {}) => {
  const rand = seededRandom(seed)
  const gate = techGradeForLevel(player.level)
  const maxG = easter ? Math.min(11, gate + 3) : gate
  const minG = easter ? 2 : 1 // 彩蛋至少玄阶（黄阶以上），且上限放宽到 gate+3
  const owned = ownedTechniqueIds(player)
  let pool = TECHNIQUES.filter(t => t.grade >= minG && t.grade <= maxG && !owned.has(t.id))
  const chosen = []
  for (let i = 0; i < count && pool.length; i++) {
    const idx = Math.floor(rand() * pool.length)
    const t = pool[idx]
    pool = pool.filter(x => x.id !== t.id)
    grantScroll(player, t.id)
    chosen.push(t)
  }
  return chosen
}
