import { ElNotification } from 'element-plus'
import { MATERIALS } from './materialDb.js'

export const maxLv = 144

// 突破所需修为（可控成长曲线）：避免了 100*2^(level*转生) 在后期超过 2^53 精度
// base 1.15 缓增 + 转生加法加成，保证数值长期可读且不溢出
export const computeMaxCultivation = (level, reincarnation = 0) => {
  const lv = Math.max(0, level || 0)
  const base = lv <= 1 ? 1 : Math.pow(1.15, lv - 1)
  const rebirth = 1 + (reincarnation || 0) * 0.4
  return Math.max(1, Math.floor(100 * base * rebirth))
}

// 境界越深，修炼越慢：中高境界略降（1 → 0.5，随等级线性递减）
export const realmCultSpeedMult = level => {
  const lv = Math.max(0, Math.min(144, level || 0))
  return Math.max(0.5, 1 - (lv / 144) * 0.5)
}

// 界域定义：宏观主线。level 仍为 1~144 统一刻度，这里做"界域 + 大境界"归档。
export const realms = [
  { id: 'mortal', name: '人界', desc: '凡人修仙，踏出长生第一步', minLevel: 1, maxLevel: 45 },
  { id: 'spirit', name: '灵界', desc: '灵力充沛，斩却凡胎脱尘', minLevel: 46, maxLevel: 81 },
  { id: 'immortal', name: '仙界', desc: '渡劫飞升，位列真仙班列', minLevel: 82, maxLevel: 117 },
  { id: 'divine', name: '神界', desc: '执掌法则，叩问大道尽头', minLevel: 118, maxLevel: 144 }
]

// 大境界表（16 个，每境 9 层），参考《凡人修仙传》并向上扩展。
export const stages = [
  { name: '炼气', realm: 'mortal' },
  { name: '筑基', realm: 'mortal' },
  { name: '金丹', realm: 'mortal' },
  { name: '元婴', realm: 'mortal' },
  { name: '化神', realm: 'mortal' },
  { name: '炼虚', realm: 'spirit' },
  { name: '合体', realm: 'spirit' },
  { name: '大乘', realm: 'spirit' },
  { name: '渡劫', realm: 'spirit' },
  { name: '真仙', realm: 'immortal' },
  { name: '玄仙', realm: 'immortal' },
  { name: '金仙', realm: 'immortal' },
  { name: '大罗金仙', realm: 'immortal' },
  { name: '太乙', realm: 'divine' },
  { name: '混元', realm: 'divine' },
  { name: '道祖', realm: 'divine' }
]

// 根据 level 返回所在界域对象
export const realmOf = level => {
  if (level <= 0) return realms[0]
  return realms.find(r => level >= r.minLevel && level <= r.maxLevel) || realms[realms.length - 1]
}

// 大境界序号(0~15)：用于境界压制
export const realmStageOf = level => (level <= 0 ? -1 : Math.min(15, Math.floor((level - 1) / 9)))

// 境界压制倍率：攻击方相对防御方的大境界差
//   高对手 1 阶 +15%，封顶 +60%；低(越级)每阶 -15%，下限 -60%
//   越级仍有可能(未封死)，靠装备/词条/加成弥补
export const realmSuppressionMult = (atkLevel, defLevel) => {
  const d = realmStageOf(atkLevel) - realmStageOf(defLevel)
  return 1 + Math.min(0.6, Math.max(-0.6, d * 0.15))
}

// 境界压制百分比(供界面显示)：正值增伤，负值减伤
export const realmSuppressionPct = (atkLevel, defLevel) => Math.round((realmSuppressionMult(atkLevel, defLevel) - 1) * 100)

// 境界压制短标签：+60%增伤 / -60%减伤 / 持平（供战斗页双向往返显示复用）
export const realmSuppressionLabel = pct =>
  pct > 0 ? `+${pct}%增伤` : pct < 0 ? `${pct}%减伤` : '持平'

export const gameNotifys = data => {
  ElNotification.closeAll()
  ElNotification(data)
}

// prettier-ignore
export const levelNames = level => {
  const levelsPerStage = 9
  const stageIndex = Math.floor((level - 1) / levelsPerStage)
  const stageLevel = ((level - 1) % levelsPerStage) + 1
  const numberName = {
    1: '一', 2: '二', 3: '三', 4: '四',
    5: '五', 6: '六', 7: '七', 8: '八', 9: '九'
  }
  const stageNames = [
    '炼气', '筑基', '金丹', '元婴',
    '化神', '炼虚', '合体', '大乘',
    '渡劫', '真仙', '玄仙', '金仙',
    '大罗金仙', '太乙', '混元', '道祖'
  ]
  if (level === 0) return '凡人'
  else if (level >= maxLv) return '道祖九层'
  else return `${stageNames[stageIndex]}${numberName[stageLevel]}层`
}

export const dropdownTypeObject = {
  id: '时间',
  level: '境界',
  score: '评分',
  health: '气血',
  attack: '攻击',
  defense: '防御',
  critical: '暴击',
  dodge: '闪避'
}
export const dropdownType = Object.entries(dropdownTypeObject).map(([type, name]) => ({ type, name }))

export const genre = {
  sutra: '法器',
  armor: '护甲',
  weapon: '神兵',
  accessory: '灵宝'
}

export const isAPP = location.host == 'appassets.androidplatform.net'

export const levels = {
  info: '黄阶',
  pink: '仙阶',
  danger: '神阶',
  purple: '天阶',
  primary: '地阶',
  success: '玄阶',
  warning: '帝阶',
  cyan: '灵阶',
  orange: '皇阶',
  gold: '圣阶',
  legendary: '道阶'
}

// 每个品质内的细分等级：下品 -> 绝品，等级越高属性越强
export const gradeNames = ['下品', '中品', '上品', '极品', '绝品']

// 细分等级系数：大品级倍率之上再乘此系数
export const gradeMultiplier = [1, 1.15, 1.35, 1.6, 2]

export const propItemNames = {
  spiritHerb: { name: '灵草', desc: '洞府灵田产出，日后炼丹的原料' },
  zhuSha: { name: '朱砂', desc: '制符灵墨，可在坊市购得' },
  zhenQi: { name: '阵旗', desc: '布阵圣物，可在坊市购得' },
  xuanTie: { name: '玄铁', desc: '炼器天材，可在坊市购得' },
  yaoDan: { name: '妖丹', desc: '妖兽内丹，可在坊市购得' },
  money: { name: '灵石', desc: '可以通过分解获得装备获得' },
  daoFruit: { name: '道果', desc: '历战专属掉落的大道机缘，突破大境界所需，灵石无法购买' },
  flying: { name: '传送符', desc: '可以通过赠送礼物给NPC获得' },
  rootBone: { name: '悟性丹', desc: '可以通过击败世界BOSS获得' },
  qingyuan: { name: '情缘', desc: '可以通过赠送礼物给NPC获得' },
  currency: { name: '混沌石', desc: '可以通过击败世界BOSS获得' },
  cultivateDan: { name: '培养丹', desc: '可以通过探索获得' },
  strengtheningStone: { name: '炼器石', desc: '可以通过分解装备获得' },
  // 大目录材料/灵药：名目与描述取自 materialDb
  ...Object.fromEntries(MATERIALS.map(m => [m.key, { name: m.name, desc: m.desc }]))
}

export const formatNumberToChineseUnit = number => {
  number = number > 0 ? Math.floor(number) : 0
  // 全部精确到个位数：不再用「万/亿」省略，千分位分组便于阅读
  return number.toLocaleString('zh-CN')
}

export const smoothScrollToBottom = element => {
  const start = element.scrollTop
  const end = element.scrollHeight
  const duration = 300
  const startTime = performance.now()
  const scroll = () => {
    const currentTime = performance.now()
    const timeElapsed = currentTime - startTime
    const progress = Math.min(timeElapsed / duration, 1)
    element.scrollTop = start + (end - start) * easeInOutCubic(progress)
    if (progress < 1) window.requestAnimationFrame(scroll)
  }
  const easeInOutCubic = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
  window.requestAnimationFrame(scroll)
}
