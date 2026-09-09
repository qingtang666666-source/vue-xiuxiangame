// 豪杰榜 —— 300 名 NPC，可挑战排名更高者晋升；前100有周期性奖励
// 豪杰强度 = 境界基准值 + 排名对应的等效装备，不随玩家实时属性缩放
import { playerPowerScore, realmPower, enemyStatsForPower, POWER_SCALE } from './breakthroughGate'
import { levelNames, gradeMultiplier } from './game'
import { gearRealmMult } from './craft'

export const HERO_COUNT = 300
// 豪杰整体战力系数：按当前装备豪杰基准再削 0.4
export const HERO_POWER_MULT = 0.4

// 豪杰也按排名穿戴装备：越靠前品阶越高、强化越高。
// 后期限定“无视境界标准上限”，让顶级豪杰能跟上玩家+30道装的成长。
const HERO_GEAR_BRACKETS = [
  { maxRank: 20, quality: 'legendary', qualityName: '道阶', strengthen: 30, grade: 5 },
  { maxRank: 50, quality: 'gold', qualityName: '圣阶', strengthen: 28, grade: 5 },
  { maxRank: 90, quality: 'orange', qualityName: '皇阶', strengthen: 25, grade: 5 },
  { maxRank: 140, quality: 'cyan', qualityName: '灵阶', strengthen: 22, grade: 4 },
  { maxRank: 190, quality: 'danger', qualityName: '神阶', strengthen: 18, grade: 4 },
  { maxRank: 240, quality: 'warning', qualityName: '帝阶', strengthen: 14, grade: 3 },
  { maxRank: 270, quality: 'pink', qualityName: '仙阶', strengthen: 10, grade: 3 },
  { maxRank: 285, quality: 'purple', qualityName: '天阶', strengthen: 8, grade: 2 },
  { maxRank: 295, quality: 'primary', qualityName: '地阶', strengthen: 5, grade: 2 },
  { maxRank: 299, quality: 'success', qualityName: '玄阶', strengthen: 2, grade: 1 },
  { maxRank: HERO_COUNT, quality: 'info', qualityName: '黄阶', strengthen: 0, grade: 1 }
]

// 与 equip.js 的掉落品质倍率对齐，保证豪杰装备强度与玩家可获得的装备同源
const HERO_GEAR_QUALITY_MULT = {
  info: 1.2,
  success: 2,
  primary: 3.2,
  purple: 5,
  pink: 6.5,
  warning: 8.5,
  danger: 12,
  cyan: 16,
  orange: 21,
  gold: 28,
  legendary: 38
}

const clampRank = rank => Math.max(1, Math.min(HERO_COUNT, Math.floor(rank || HERO_COUNT)))
export const heroGearOfRank = rank => HERO_GEAR_BRACKETS.find(x => clampRank(rank) <= x.maxRank) || HERO_GEAR_BRACKETS[HERO_GEAR_BRACKETS.length - 1]

// 确定性姓名（不随刷新变化）
const SURNAMES = ['王','李','张','刘','陈','杨','赵','黄','周','吴','徐','孙','朱','马','胡','郭','何','高','林','罗','郑','梁','谢','宋','唐','许','韩','冯','邓','曹','彭','曾','萧','尹','黄','任']
const GIVEN = ['青山','长歌','无涯','玄机','凌云','子夜','明轩','青莲','扶摇','听风','天策','北冥','破军','星痕','问天','承影','夜阑','御风','山河','归鸿','慕白','流云','惊鸿','破晓','君临','飞雪','孤舟','剑心','绯烟','鸿影','守拙','听涛','玄清','宇轩','鹤鸣','未央','离尘','君陌','拂晓','望舒']
const nameOf = i => SURNAMES[(i * 3) % SURNAMES.length] + GIVEN[(i * 7) % GIVEN.length]

// rank: 1=最强(道祖/11阶)，300=最弱(炼气/1阶)；等级 1~144 全覆盖
export const heroLevelOfRank = rank => {
  rank = Math.max(1, Math.min(HERO_COUNT, Math.floor(rank)))
  return Math.round(144 - ((rank - 1) / (HERO_COUNT - 1)) * 143)
}

// 排名越靠前战力越高：榜尾约八成五，榜首批次可超过境界标准
export const heroBoostOfRank = rank => {
  const r = Math.max(1, Math.min(HERO_COUNT, Math.floor(rank || HERO_COUNT)))
  const t = 1 - (r - 1) / (HERO_COUNT - 1)
  return 0.85 + t * 0.15
}

// 同一小境界内可能有多个名次，再按名次位置拉开一点差距，避免完全同值
const sameLevelPosition = rank => {
  const lv = heroLevelOfRank(rank)
  let lo = rank
  let hi = rank
  while (lo > 1 && heroLevelOfRank(lo - 1) === lv) lo--
  while (hi < HERO_COUNT && heroLevelOfRank(hi + 1) === lv) hi++
  return hi === lo ? 0 : (rank - lo) / (hi - lo)
}

// 豪杰装备的“等效属性”：按排名配置品阶/强化/细分级，再用玩家战力同一套权重折算。
// 这样豪杰后期会跟着 +30 道装一起成长，而不是被 realmPower 的 1 亿上限卡死。
export const heroEquipmentStats = rank => {
  const r = clampRank(rank)
  const lv = heroLevelOfRank(r)
  const gear = heroGearOfRank(r)
  const qualityMult = HERO_GEAR_QUALITY_MULT[gear.quality] || 1
  const gradeMult = gradeMultiplier[gear.grade - 1] || 1
  const strengthenMult = 1 + gear.strengthen * 0.2
  // 词条按平均收益折算，避免豪杰属性完全靠白板
  const affixMult = 1.25
  const mult = qualityMult * gradeMult * strengthenMult * affixMult
  const realmMult = gearRealmMult(lv)
  const baseAttack = 12 * lv * realmMult
  const baseHealth = 120 * lv * realmMult
  // 四个部位：武器(攻)、护甲(血/防)、灵宝(攻/血/防)、法器(攻/血/防)
  const attack = (baseAttack + baseAttack + baseAttack) * mult
  const health = (baseHealth + baseHealth + baseHealth) * mult
  const defense = (baseAttack + baseAttack + baseAttack) * mult
  // 暴击/闪避不随品阶倍率膨胀，按装备细分级与强化温和成长（与玩家装备来源口径接近）
  const critical = Math.min(0.28, 0.02 + gear.grade * 0.012 + gear.strengthen * 0.001)
  const dodge = Math.min(0.2, 0.012 + gear.grade * 0.008 + gear.strengthen * 0.0006)
  return {
    level: lv,
    gear: gear.qualityName,
    gearQuality: gear.quality,
    strengthen: gear.strengthen,
    grade: gear.grade,
    gradeName: ['下品', '中品', '上品', '极品', '绝品'][gear.grade - 1] || '下品',
    attack: Math.floor(attack),
    health: Math.floor(health),
    defense: Math.floor(defense),
    critical,
    dodge
  }
}

export const heroPowerOfRank = rank => {
  const r = clampRank(rank)
  const lv = heroLevelOfRank(r)
  const gear = heroEquipmentStats(r)
  const gearScore = gear.dodge * 320 + gear.attack * 4 + (gear.health / 100) * 0.4 + gear.defense * 2.4 + gear.critical * 360
  const sameLevelFactor = 1 - sameLevelPosition(r) * 0.06
  return Math.floor((realmPower(lv) + gearScore * POWER_SCALE) * heroBoostOfRank(r) * sameLevelFactor * HERO_POWER_MULT)
}

// 生成挑战用的敌人实体（供 TurnCombat monsterToEntity 使用）
export const heroEnemy = (rank, name) => {
  const r = clampRank(rank)
  const lv = heroLevelOfRank(r)
  const gear = heroEquipmentStats(r)
  const st = enemyStatsForPower(heroPowerOfRank(r), 1.0)
  const s2 = Math.min(15, Math.max(0, Math.floor((lv - 1) / 9)))
  return {
    level: lv,
    name: name || '无名单客',
    gear: gear.gear,
    strengthen: gear.strengthen,
    health: st.health,
    maxHp: st.health,
    hp: st.health,
    attack: st.attack,
    defense: st.defense,
    critical: Math.min(0.28, gear.critical + s2 * 0.001),
    dodge: gear.dodge
  }
}

let _heroes = null
// 生成 300 名豪杰（模块级缓存；转生后可再调 regenerateHeroes）
export const generateHeroes = () => {
  if (_heroes) return _heroes
  const out = []
  for (let i = 1; i <= HERO_COUNT; i++) {
    const gear = heroEquipmentStats(i)
    out.push({
      id: `hero-${i}`,
      rank: i,
      name: nameOf(i),
      level: gear.level,
      realm: levelNames(gear.level),
      gear: gear.gear,
      strengthen: gear.strengthen,
      gradeName: gear.gradeName,
      power: heroPowerOfRank(i)
    })
  }
  _heroes = out
  return out
}

export const regenerateHeroes = () => {
  _heroes = null
  return generateHeroes()
}

export const getHeroById = id => generateHeroes().find(h => h.id === id)
export const getHeroAtRank = rank => generateHeroes().find(h => h.rank === rank)

// 玩家栏位：默认在 301（未上榜，需挑战 #300 进入）。胜利则插入目标名次，后续豪杰顺延。
export const playerSlot = player => (player.heroRank || 301)

export const initHero = player => {
  if (typeof player.heroRank !== 'number') player.heroRank = HERO_COUNT + 1
  if (typeof player.heroClaimDate !== 'string') player.heroClaimDate = ''
  return player
}

// 前100奖励（排名越高越好，但不要过强）
export const heroReward = rank => {
  rank = Math.max(1, Math.min(HERO_COUNT, Math.floor(rank || HERO_COUNT + 1)))
  const diff = heroLevelOfRank(rank) // 用境界当奖励强度参考
  const money = Math.floor(500 + diff * 60)
  const dan = Math.max(1, Math.floor(diff / 12))
  const currency = rank <= 20 ? Math.max(1, Math.floor((101 - rank) / 20)) : 0
  return { money, dan, currency }
}

// 能否挑战：目标排名必须严格高于玩家当前排名（数字更小）
export const canChallenge = (player, targetRank) => {
  const p = playerSlot(player)
  return targetRank >= 1 && targetRank < p
}

// 结算挑战胜利：玩家插入目标名次，目标及其后豪杰依次顺延；榜尾豪杰仍保留在 301 名
export const applyWin = (player, targetRank) => {
  initHero(player)
  const cur = playerSlot(player)
  const to = Math.max(1, Math.min(HERO_COUNT, Math.floor(targetRank || 0)))
  if (!canChallenge(player, to)) return { ok: false, from: cur, to: cur }
  player.heroRank = to
  return { ok: true, from: cur, to }
}

export const applyLose = () => ({ ok: false })

// 玩家战力是否已足够上榜(参考) —— 仅用于提示，不强制
export const canEnterHint = player => playerPowerScore(player) >= heroPowerOfRank(HERO_COUNT)

// 当前榜单上“某个展示名次”对应的豪杰（玩家占位返回 null）
export const heroAtDisplayedRank = (player, rank) => {
  initHero(player)
  const ptr = Math.max(1, Math.min(HERO_COUNT + 1, player.heroRank || HERO_COUNT + 1))
  const r = Math.max(1, Math.min(HERO_COUNT + 1, Math.floor(rank || 0)))
  if (r === ptr) return null
  const baseRank = r < ptr ? r : r - 1
  return getHeroAtRank(baseRank)
}

// 榜单展示：1..301，玩家插入自己的名次，后续豪杰顺延一位而不是消失
export const boardList = player => {
  initHero(player)
  const ptr = Math.max(1, Math.min(HERO_COUNT + 1, player.heroRank || HERO_COUNT + 1))
  const out = []
  for (let r = 1; r <= HERO_COUNT + 1; r++) {
    if (ptr === r) {
      out.push({ rank: r, name: '你', level: player.level || 1, realm: levelNames(player.level || 1), power: playerPowerScore(player), isPlayer: true, id: '__player__' })
      continue
    }
    const baseRank = r < ptr ? r : r - 1
    const h = getHeroAtRank(baseRank)
    if (h) out.push({ ...h, rank: r })
  }
  return out
}
