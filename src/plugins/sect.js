// 宗门系统 —— 每轮回随机遇一宗，职位按境界晋升，任务赚贡献兑换
//
// 职位阶梯：外门弟子 → 内门弟子 → 核心弟子 → 外门执事 → 亲传弟子 →
//           内门执事 → 外门长老 → 内门长老 → 副峰主 → 峰主 → 副宗主 → 宗主
// 每升一阶需达到对应境界 + 贡献度，并通过守关考核(战力判定)。
// 宗门特色提供该宗专属被动加成，随职位提升而增强。

import { ensureAptitude } from './aptitude.js'
import { rollTechniqueDrop, techGradeForLevel } from './technique.js'
import { levelNames } from './game.js'
import { playerPowerScore, realmPower } from './breakthroughGate.js'

// 宗门品级：从强到弱。index 0 = 超一流，index 6 = 六流（入门最易，8成）。
// rootReq 为加入该宗所需的根骨品阶(0~5)，entry 为入门考核基准成功率。
export const SECT_GRADES = [
  { name: '超一流', entry: 0.35, rootReq: 5, mult: 2.2 },
  { name: '一流', entry: 0.42, rootReq: 4, mult: 1.9 },
  { name: '二流', entry: 0.48, rootReq: 3, mult: 1.6 },
  { name: '三流', entry: 0.56, rootReq: 2, mult: 1.35 },
  { name: '四流', entry: 0.64, rootReq: 1, mult: 1.15 },
  { name: '五流', entry: 0.72, rootReq: 0, mult: 1.0 },
  { name: '六流', entry: 0.8, rootReq: 0, mult: 0.85 }
]

const NAME_POOL = [
  '青云宗', '太虚门', '紫霄剑派', '丹霞谷', '百炼宗', '天机阁', '万象山', '御灵宗', '灵犀谷', '九幽教',
  '五行宗', '万剑宗', '归元派', '浩然书院', '玄天宗', '抱朴道院', '禅心寺', '青冥剑宗', '焚月谷', '乾坤宗',
  '逍遥派', '七星观', '山河宗', '云海门', '大衍宗', '听雨楼', '梨花宫', '问道阁', '寒潭派', '巍巍山',
  '补天阁', '天机府', '造化宗', '万象宗', '昆仑墟', '蓬莱阁', '瀛洲岛', '方寸山', '落霞谷', '碧游宫',
  // 扩充：名山大泽中的宗门（补至 100+）
  '青城派', '峨眉宗', '武当山', '嵩山派', '华山派', '泰山宗', '衡山派', '恒山派', '终南派', '崆峒派',
  '龙虎山', '茅山宗', '青羊宫', '白云观', '全真教', '神霄派', '清微派', '上清宫', '太乙宗', '东华派',
  '西昆宗', '南华派', '北冥宗', '中天派', '丹鼎宗', '器宗山', '符箓宗', '阵道宗', '御剑阁', '铸剑阁',
  '万兽山庄', '驯灵谷', '驭兽岭', '灵犀宫', '百草园', '药王谷', '丹道宫', '灵丹阁', '妙手谷', '回春堂',
  '玄冰宗', '烈焰宗', '厚土宗', '青木宗', '沧浪宗', '紫雷宗', '罡风宗', '幽泉宗', '皇极宗', '大日宗',
  '玲珑阁', '天音阁', '妙音宫', '天璇宗', '天玑宗', '天权宗', '玉衡宗', '摇光宗', '紫微宫', '太微垣',
  '幽冥宗', '血煞教', '白骨宗', '阴鬼宗', '尸魔教', '蚀骨宗', '魔刀宗', '修罗宗', '阿修罗教', '血海宗',
  '星海宗', '月华宗', '日曜宗', '阳炎宗', '玄冥宫', '苍梧山', '缥缈峰', '灵鹫宫', '天狼峰', '玄龟岛',
  '凤凰山', '青龙宗', '白虎宗', '朱雀宗', '玄武宗', '麒麟门', '饕餮谷', '金乌宗', '玉兔宫', '九尾宫',
  '法相宗', '净土宗', '禅武宗', '金刚宗', '密宗', '大乘教', '菩提寺', '瓦屋山', '竹海宗', '烟雨楼'
]

const FEATURES = {
  sword: { name: '剑修', icon: '⚔️', desc: '以剑证道，锋芒毕露。', stat: 'attack', per: 4 },
  alchemy: { name: '丹道', icon: '⚗️', desc: '丹炉造化，辅佐修行。', stat: 'cultivationSpeed', per: 0.003 },
  forger: { name: '器宗', icon: '🔥', desc: '百炼成兵，攻防兼修。', stat: 'attack', per: 2, stat2: 'defense', per2: 2 },
  talisman: { name: '符道', icon: '📜', desc: '符箓通神，迅捷无双。', stat: 'critical', per: 0.0006, stat2: 'dodge', per2: 0.0006 },
  formation: { name: '阵道', icon: '⛩️', desc: '布阵困敌，特效频出。', stat: 'effectBoost', per: 0.0006 },
  body: { name: '体修', icon: '🛡️', desc: '肉身成圣，血厚如山。', stat: 'health', per: 40 },
  beast: { name: '御兽', icon: '🐉', desc: '驯育灵兽，生生不息。', stat: 'health', per: 30, stat2: 'cultivationSpeed', per2: 0.0015 },
  technique: { name: '功法传承', icon: '📖', desc: '传承大道，修炼神速。', stat: 'cultivationSpeed', per: 0.003, stat2: 'moneyMult', per2: 0.0015 }
}

export const POSITIONS = [
  { name: '未入门', level: 0, cost: 0, contrib: 0 },
  { name: '外门弟子', level: 1, cost: 0, contrib: 0, entry: true },
  { name: '内门弟子', level: 10, cost: 60, contrib: 120 },
  { name: '外门执事', level: 20, cost: 150, contrib: 180 },
  { name: '外门长老', level: 28, cost: 300, contrib: 260 },
  { name: '核心弟子', level: 37, cost: 500, contrib: 320 },
  { name: '内门执事', level: 46, cost: 700, contrib: 400 },
  { name: '亲传弟子', level: 55, cost: 900, contrib: 480 },
  { name: '内门长老', level: 64, cost: 1300, contrib: 620 },
  { name: '副峰主', level: 82, cost: 2000, contrib: 800 },
  { name: '峰主', level: 91, cost: 2800, contrib: 1000 },
  { name: '副宗主', level: 100, cost: 4000, contrib: 1400 },
  { name: '宗主', level: 118, cost: 5500, contrib: 1800 }
]

export const EXCHANGE = [
  { key: 'money', name: '灵石', cat: '货币', contrib: 80, amount: 500 },
  { key: 'spiritHerb', name: '灵草', cat: '材料', contrib: 40, amount: 10 },
  { key: 'strengtheningStone', name: '炼器石', cat: '材料', contrib: 50, amount: 10 },
  { key: 'cultivateDan', name: '培养丹', cat: '丹药', contrib: 120, amount: 1 },
  { key: 'rootBone', name: '悟性丹', cat: '丹药', contrib: 200, amount: 1 },
  { key: 'currency', name: '混沌石', cat: '货币', contrib: 320, amount: 1 },
  { key: 'scroll', name: '功法卷轴', cat: '功法', contrib: 900, amount: 1 }
]

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
const pick = arr => arr[Math.floor(Math.random() * arr.length)]

// 任务模板
const MISSION_TEMPLATES = [
  { name: '采集灵草', desc: '为宗门药圃采集灵草。', herb: 4 },
  { name: '清扫妖患', desc: '镇守宗门外围，清剿作乱妖物。', combat: true },
  { name: '炼制法器', desc: '为宗门铸造一批法器。', stone: 4 },
  { name: '护送商队', desc: '护送宗门外出行商。', combat: true },
  { name: '整理经卷', desc: '抄录整理宗门功法典籍。' },
  { name: '切磋弟子', desc: '与门中弟子切磋印证。', combat: true },
  { name: '镇守山门', desc: '轮值镇守宗门山门。' }
]

export const generateSect = (reincarnation, rootBone = 0) => {
  const name = pick(NAME_POOL)
  const featureKey = pick(Object.keys(FEATURES))
  const feature = FEATURES[featureKey]
  // 只生成根骨达标可加入的品级宗门；根骨越好，越容易遇到高品阶
  const joinable = SECT_GRADES.filter(g => g.rootReq <= rootBone)
  const grade = pick(joinable.length ? joinable : SECT_GRADES.slice(-2))
  const gradeIdx = SECT_GRADES.indexOf(grade)
  const missions = MISSION_TEMPLATES.slice(0, randInt(4, 5)).map(m => {
    const lv = randInt(5, 130)
    return {
      id: `ms-${reincarnation}-${Math.random().toString(36).slice(2, 7)}`,
      name: m.name,
      desc: m.desc,
      reqLevel: lv,
      contrib: randInt(20, 120) + Math.floor(lv / 2),
      combat: !!m.combat
    }
  })
  return {
    id: `sect-${reincarnation}-${Math.random().toString(36).slice(2, 6)}`,
    name,
    featureKey,
    featureName: feature.name,
    icon: feature.icon,
    desc: feature.desc,
    missions,
    position: 0,
    gradeIdx,
    gradeName: grade.name
  }
}

export const ensureSect = player => {
  if (!player.sect) player.sect = { reincarnation: -1 }
  if (player.sect.reincarnation !== player.reincarnation) {
    const apt = ensureAptitude(player)
    player.sect = { ...generateSect(player.reincarnation, apt.rootBone), reincarnation: player.reincarnation }
    player.sect.contribution = player.sect.contribution || 0
  }
  if (typeof player.sect.gradeIdx !== 'number') player.sect.gradeIdx = 6
  if (!player.sect.gradeName) player.sect.gradeName = SECT_GRADES[player.sect.gradeIdx]?.name || '六流'
  return player.sect
}

// 生成 n 个候选宗门（开局选择用，不落盘）
export const generateSectChoices = (player, count = 3) => {
  const apt = ensureAptitude(player)
  const arr = []
  for (let i = 0; i < count; i++) arr.push(generateSect(player.reincarnation, apt.rootBone))
  return arr
}

export const joinSect = (player, sect) => {
  if (!sect || !sect.name) return { ok: false, reason: '未知宗门' }
  // 加入宗门后至少为「外门弟子」（position 1），而非未入门（position 0）
  player.sect = { ...sect, reincarnation: player.reincarnation, contribution: 0, position: 1 }
  return { ok: true, name: player.sect.name }
}

const getSect = player => ensureSect(player)
export const positionIndex = player => getSect(player).position || 0
export const positionName = player => POSITIONS[positionIndex(player)]?.name || '外门弟子'

const playerPower = player =>
  (player.attack || 0) * 3 + (player.defense || 0) + (player.maxHealth || 0) * 0.1 + (player.level || 0) * 6

// 下一职位信息与晋升条件
export const nextPosition = player => {
  const idx = positionIndex(player)
  if (idx >= POSITIONS.length - 1) return null
  const next = POSITIONS[idx + 1]
  const entry = !!next.entry
  let chance
  if (entry) {
    // 入门考核：成功率由宗门品级决定(最低六流8成，越高越难)
    const sect = getSect(player)
    const grade = SECT_GRADES[sect.gradeIdx] || SECT_GRADES[SECT_GRADES.length - 1]
    // 改为双门槛：战力达标 + 战胜一名同境界门内弟子，难度随宗门品级提升
    const lv = Math.max(1, player.level || 1)
    const powerNeed = Math.floor((120 + lv * 40) * (0.7 + grade.mult * 0.6))
    const disciplePower = Math.floor(powerNeed * 1.15)
    const power = playerPowerScore(player)
    if (power >= disciplePower) chance = 0.98
    else if (power >= powerNeed) chance = Math.min(0.95, Math.max(0.2, 0.2 + ((power - powerNeed) / (disciplePower - powerNeed)) * 0.6))
    else chance = 0.05
  } else {
    // 其余按境界 + 战力上调难度
    const power = playerPowerScore(player)
    const guardian = Math.floor(realmPower(next.level) * 0.9)
    chance = Math.min(0.95, Math.max(0.1, power / (power + guardian)))
  }
  return {
    index: idx + 1,
    name: next.name,
    level: next.level,
    cost: next.cost,
    contribReward: next.contrib,
    chance
  }
}

export const canPromote = player => {
  const info = nextPosition(player)
  if (!info) return { ok: false, reason: '已至宗主之位' }
  const sect = getSect(player)
  if (player.level < info.level) return { ok: false, reason: `需达到${levelNames(info.level)}方可晋升` }
  if ((sect.contribution || 0) < info.cost) return { ok: false, reason: `贡献度不足(需 ${info.cost})` }
  return { ok: true, info }
}

// 晋升考核：战力判定，通过则晋阶
export const promote = player => {
  const check = canPromote(player)
  if (!check.ok) return { ok: false, reason: check.reason }
  const info = check.info
  const sect = getSect(player)
  const chance = info.chance
  if (Math.random() < chance) {
    sect.position = info.index
    sect.contribution -= info.cost
    sect.contribution += info.contribReward
    return { ok: true, name: info.name, contribReward: info.contribReward }
  }
  sect.contribution = Math.max(0, sect.contribution - Math.floor(info.cost / 5))
  return { ok: false, reason: '考核失利，损失部分贡献，可再试' }
}

// 完成任务
export const completeMission = (player, missionId) => {
  const sect = getSect(player)
  const mission = (sect.missions || []).find(m => m.id === missionId)
  if (!mission) return { ok: false, reason: '任务不存在' }
  if (player.level < mission.reqLevel) return { ok: false, reason: `实力不足(需${levelNames(mission.reqLevel)})` }
  // 战斗类任务：战力判定
  if (mission.combat) {
    const pp = playerPowerScore(player)
    const monster = Math.floor(realmPower(mission.reqLevel) * 0.9)
    if (Math.random() > pp / (pp + monster)) return { ok: false, reason: '除妖失利，可再试' }
  }
  sect.contribution = (sect.contribution || 0) + mission.contrib
  return { ok: true, contrib: mission.contrib }
}

// 贡献度兑换
export const exchange = (player, itemKey) => {
  const item = EXCHANGE.find(x => x.key === itemKey)
  if (!item) return { ok: false, reason: '兑换项不存在' }
  const sect = getSect(player)
  if ((sect.contribution || 0) < item.contrib) return { ok: false, reason: '贡献度不足' }
  sect.contribution -= item.contrib
  if (itemKey === 'scroll') {
    const r = rollTechniqueDrop(player, { maxGrade: Math.min(11, techGradeForLevel(player.level) + 1) })
    if (!r.ok) {
      sect.contribution += item.contrib
      return { ok: false, reason: r.reason }
    }
    return { ok: true, item, amount: 1, name: r.name }
  }
  player.props[itemKey] = (player.props[itemKey] || 0) + item.amount
  return { ok: true, item, amount: item.amount }
}

// 宗门捐献：灵石 / 丹药 / 符箓 / 装备 → 贡献
export const donate = (player, kind, payload, value) => {
  const sect = getSect(player)
  if (!sect || sect.position === 0) return { ok: false, reason: '尚未入宗门，无法捐献' }
  const rate = 150 // 贡献 = floor(灵石价值 / 150)
  if (kind === 'money') {
    const amount = Math.max(1, Math.floor(payload || 0))
    if ((player.props.money || 0) < amount) return { ok: false, reason: '灵石不足' }
    player.props.money -= amount
    const c = Math.max(1, Math.floor(amount / rate))
    sect.contribution = (sect.contribution || 0) + c
    return { ok: true, contrib: c, kind: 'money', amount }
  }
  if (kind === 'pill') {
    const p = (player.pills || []).find(x => x.id === payload.id)
    if (!p || p.count < payload.qty) return { ok: false, reason: '丹药不足' }
    p.count -= payload.qty
    if (p.count <= 0) player.pills = player.pills.filter(x => x.id !== payload.id)
    const c = Math.max(1, Math.floor((value || 0) * payload.qty / rate))
    sect.contribution = (sect.contribution || 0) + c
    return { ok: true, contrib: c, kind: 'pill', qty: payload.qty, name: payload.name }
  }
  if (kind === 'talisman') {
    const p = (player.talismans || []).find(x => x.id === payload.id)
    if (!p || p.count < payload.qty) return { ok: false, reason: '符箓不足' }
    p.count -= payload.qty
    if (p.count <= 0) player.talismans = player.talismans.filter(x => x.id !== payload.id)
    const c = Math.max(1, Math.floor((value || 0) * payload.qty / rate))
    sect.contribution = (sect.contribution || 0) + c
    return { ok: true, contrib: c, kind: 'talisman', qty: payload.qty, name: payload.name }
  }
  if (kind === 'equip') {
    const idx = (player.inventory || []).findIndex(x => x.id === payload.id)
    if (idx < 0) return { ok: false, reason: '未持有该装备' }
    const eq = player.inventory[idx]
    player.inventory.splice(idx, 1)
    const c = Math.max(1, Math.floor((value || 0) / rate))
    sect.contribution = (sect.contribution || 0) + c
    return { ok: true, contrib: c, kind: 'equip', name: eq.name }
  }
  return { ok: false, reason: '未知捐献类型' }
}

// 宗门特色加成（随职位提升而增强）
export const sectStats = player => {
  const sect = getSect(player)
  const feat = FEATURES[sect.featureKey] || FEATURES.sword
  const rank = Math.min(positionIndex(player), 12)
  const gradeMult = SECT_GRADES[sect.gradeIdx]?.mult || 1
  const acc = { attack: 0, defense: 0, health: 0, critical: 0, dodge: 0, cultivationSpeed: 0, moneyMult: 0, effectBoost: 0 }
  acc[feat.stat] = (acc[feat.stat] || 0) + feat.per * rank * gradeMult
  if (feat.stat2) acc[feat.stat2] = (acc[feat.stat2] || 0) + feat.per2 * rank * gradeMult
  return acc
}

export const sectFeature = player => {
  const sect = getSect(player)
  return FEATURES[sect.featureKey] || FEATURES.sword
}

// 宗门品级考核：晋升到更高品级（需内门长老及以上 + 贡献 + 守卫挑战）
export const sectGradeInfo = player => {
  const sect = getSect(player)
  const idx = typeof sect.gradeIdx === 'number' ? sect.gradeIdx : 6
  if (idx <= 0) return null
  const next = SECT_GRADES[idx - 1]
  const power = playerPower(player)
  const guardian = (7 - (idx - 1)) * 800
  const chance = Math.min(0.9, Math.max(0.1, power / (power + guardian)))
  return { nextIdx: idx - 1, name: next.name, reqPosition: 8, cost: 1500 + idx * 800, chance }
}

export const canUpgradeSectGrade = player => {
  const info = sectGradeInfo(player)
  if (!info) return { ok: false, reason: '宗门已至超一流' }
  const sect = getSect(player)
  if (positionIndex(player) < info.reqPosition) return { ok: false, reason: '需担任内门长老及以上方可主持品级考核' }
  if ((sect.contribution || 0) < info.cost) return { ok: false, reason: `贡献度不足(需 ${info.cost})` }
  return { ok: true, info }
}

export const upgradeSectGrade = player => {
  const check = canUpgradeSectGrade(player)
  if (!check.ok) return { ok: false, reason: check.reason }
  const sect = getSect(player)
  const info = check.info
  if (Math.random() < info.chance) {
    sect.contribution -= info.cost
    sect.contribution += 800
    sect.gradeIdx = info.nextIdx
    sect.gradeName = SECT_GRADES[info.nextIdx].name
    return { ok: true, name: info.name }
  }
  sect.contribution = Math.max(0, sect.contribution - Math.floor(info.cost / 6))
  return { ok: false, reason: '品级考核失利，损失部分贡献，可再试' }
}

// 退出宗门：付一笔灵石，清空贡献度，退回未入门
export const leaveSectCost = player => {
  const sect = getSect(player)
  const idx = typeof sect.gradeIdx === 'number' ? sect.gradeIdx : 6
  return Math.floor(300 + positionIndex(player) * 150 + idx * 200)
}

export const leaveSect = player => {
  const sect = getSect(player)
  const cost = leaveSectCost(player)
  const props = player.props || {}
  if ((props.money || 0) < cost) return { ok: false, reason: '灵石不足' }
  props.money -= cost
  sect.contribution = 0
  sect.position = 0
  return { ok: true, cost }
}
