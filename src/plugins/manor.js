// 洞府系统 —— 离线挂机的核心放大模块
//
// 洞府由若干建筑构成，可消耗灵石与炼器石升级。主要价值：
//   1. 放大离线收益（修炼 / 灵石），并延长离线上限
//   2. 被动产出灵草（日后炼丹原料）
//   3. 提升在线修炼速度、高品天赋概率、炼器成功率并降耗
//
// 所有加成均按“建筑等级”实时计算，不改动玩家基础属性，避免重复计算。

// 建筑定义
export const MANOR_BUILDINGS = [
  {
    id: 'hall',
    name: '聚灵大殿',
    icon: '🏯',
    effect: ['离线修炼 +6%/级', '离线挂机上限 +1小时/级'],
    desc: '洞府命脉，聚拢四方灵气。修为增长与挂机时长都看它，是升级的首选。',
    costBase: 500,
    costExp: 1.7,
    maxLevel: 30
  },
  {
    id: 'mine',
    name: '灵石矿脉',
    icon: '⛏️',
    effect: ['离线灵石 +8%/级'],
    desc: '地底深处富藏灵石，洞府等级越高，矿脉挖掘越深、产出越丰。',
    costBase: 400,
    costExp: 1.7,
    maxLevel: 30
  },
  {
    id: 'farm',
    name: '灵田',
    icon: '🌿',
    effect: ['离线产灵草 +1株/时/级'],
    desc: '栽种灵草灵药，为日后炼丹备足材料。等级越高，灵草越茂盛。',
    costBase: 300,
    costExp: 1.7,
    maxLevel: 30
  },
  {
    id: 'library',
    name: '藏经阁',
    icon: '📜',
    effect: ['修炼速度 +2%/级'],
    desc: '收录功法典籍，闭关修炼事半功倍。在线挂机与离线收益同时受益。',
    costBase: 600,
    costExp: 1.7,
    maxLevel: 30
  },
  {
    id: 'dao',
    name: '悟道台',
    icon: '🧘',
    effect: ['高品天赋概率提升', '修炼速度 +1%/级'],
    desc: '坐坛印道，灵台清明。境界越高，参悟珍稀天赋的几率越大。',
    costBase: 800,
    costExp: 1.7,
    maxLevel: 30
  },
  {
    id: 'forge',
    name: '炼器炉',
    icon: '🔥',
    effect: ['炼器消耗 -2%/级', '炼器成功率 +1%/级'],
    desc: '地火淬炼，熔锤百兵。炼器既省料又易成，强化词条也更稳。',
    costBase: 700,
    costExp: 1.7,
    maxLevel: 30
  }
]

export const manorBuilding = id => MANOR_BUILDINGS.find(b => b.id === id)

// 初始化 / 补齐洞府数据结构（兼容旧存档）
export const getManor = player => {
  if (!player || typeof player !== 'object') return {}
  if (!player.manor || typeof player.manor !== 'object') player.manor = {}
  const manor = player.manor
  if (!manor.buildings || typeof manor.buildings !== 'object') manor.buildings = {}
  MANOR_BUILDINGS.forEach(b => {
    if (typeof manor.buildings[b.id] !== 'number' || manor.buildings[b.id] < 0) manor.buildings[b.id] = 0
  })
  if (typeof manor.totalInvested !== 'number') manor.totalInvested = 0
  return manor
}

export const manorLevel = (player, id) => getManor(player).buildings?.[id] || 0

export const manorMaxLevel = id => (manorBuilding(id) ? manorBuilding(id).maxLevel : 30)

// 计算某建筑升级所需花费
export const manorUpgradeCost = (player, id) => {
  const b = manorBuilding(id)
  const level = manorLevel(player, id)
  const money = Math.floor(b.costBase * Math.pow(level + 1, b.costExp))
  // 高阶建筑额外需要炼器石，提升资源回收价值
  let stone = 0
  if (level >= 12) stone += Math.floor((level - 11) * 5)
  if (level >= 22) stone += Math.floor((level - 21) * 10)
  return { money, stone }
}

// 判断能否升级
export const canUpgrade = (player, id) => {
  const level = manorLevel(player, id)
  if (level >= manorMaxLevel(id)) return { ok: false, reason: '已满级' }
  const cost = manorUpgradeCost(player, id)
  const props = player.props || {}
  if ((props.money || 0) < cost.money) return { ok: false, reason: '灵石不足' }
  if ((props.strengtheningStone || 0) < cost.stone) return { ok: false, reason: '炼器石不足' }
  return { ok: true, cost }
}

// 升级建筑：扣费、升级、累计投资
export const upgradeManor = (player, id) => {
  const check = canUpgrade(player, id)
  if (!check.ok) return { ok: false, reason: check.reason }
  const manor = getManor(player)
  manor.buildings[id] += 1
  manor.totalInvested += check.cost.money + check.cost.stone
  player.props.money -= check.cost.money
  player.props.strengtheningStone -= check.cost.stone
  return { ok: true, level: manor.buildings[id], cost: check.cost }
}

// 离线收益加成：洞府的核心价值
export const manorOfflineBonus = player => {
  const lv = id => manorLevel(player, id)
  return {
    cultivationMult: 1 + lv('hall') * 0.06,
    moneyMult: 1 + lv('mine') * 0.08,
    // 洞府扩展离线上限：基础 24 小时 + 聚灵大殿等级
    capHours: 24 + lv('hall'),
    herbsPerHour: lv('farm') * 1
  }
}

// 修炼速度加成（藏经阁 + 悟道台）
export const manorCultivationSpeed = player => {
  return 1 + manorLevel(player, 'library') * 0.02 + manorLevel(player, 'dao') * 0.01
}

// 高品天赋概率加成（悟道台）：0~0.5，越大越高品容易出
export const manorTalentBoost = player => {
  return Math.min(0.5, manorLevel(player, 'dao') * 0.01)
}

// 炼器加成（炼器炉）：降耗 + 成功率
export const manorEnhanceBonus = player => {
  const lv = manorLevel(player, 'forge')
  return {
    costDiscount: Math.min(0.5, lv * 0.02),
    successBonus: Math.min(0.15, lv * 0.01)
  }
}

// 下一级收益预览：把「升一级到底多赚多少」算给玩家看，而不是只给百分比
//   rows: [{ label, cur, next }]        建筑效果 当前 → 下一级
//   moneyPerHour                        离线灵石 每小时估算（与 idleTick 同口径：每 10 秒 level×0.5×倍率）
//   paybackHours                        按新增灵石产出估算的回本小时数（仅矿脉有值）
export const manorGainPreview = (player, id) => {
  const b = manorBuilding(id)
  const max = manorMaxLevel(id)
  const lv = manorLevel(player, id)
  const next = Math.max(lv, Math.min(max, lv + 1))
  const pct = v => `×${v.toFixed(2)}`
  const TABLE = {
    hall: [
      { label: '离线修炼倍率', fmt: pct, cur: 1 + lv * 0.06, next: 1 + next * 0.06 },
      { label: '离线上限', fmt: v => `${v} 小时`, cur: 24 + lv, next: 24 + next }
    ],
    mine: [{ label: '离线灵石倍率', fmt: pct, cur: 1 + lv * 0.08, next: 1 + next * 0.08 }],
    farm: [{ label: '灵草产出', fmt: v => `${v} 株/时`, cur: lv, next }],
    library: [{ label: '修炼速度倍率', fmt: pct, cur: 1 + lv * 0.02, next: 1 + next * 0.02 }],
    dao: [
      { label: '高品天赋概率', fmt: v => `${Math.round(Math.min(0.5, v) * 100)}%`, cur: lv * 0.01, next: next * 0.01 },
      { label: '修炼速度', fmt: v => `+${Math.round(v)}%`, cur: lv, next }
    ],
    forge: [
      { label: '炼器消耗', fmt: v => `-${Math.round(Math.min(0.5, v) * 100)}%`, cur: lv * 0.02, next: next * 0.02 },
      { label: '炼器成功率', fmt: v => `+${Math.round(Math.min(0.15, v) * 100)}%`, cur: lv * 0.01, next: next * 0.01 }
    ]
  }
  const rows = (TABLE[id] || []).map(r => ({ label: r.label, cur: r.fmt(r.cur), next: r.fmt(r.next) }))
  const perHour = mult => Math.floor(180 * (player.level || 1) * mult)
  const moneyPerHour = id === 'mine' ? { cur: perHour(1 + lv * 0.08), next: perHour(1 + next * 0.08) } : null
  const cost = manorUpgradeCost(player, id)
  const gain = moneyPerHour ? moneyPerHour.next - moneyPerHour.cur : 0
  return {
    id,
    name: b ? b.name : '',
    level: lv,
    max,
    maxed: lv >= max,
    rows,
    moneyPerHour,
    paybackHours: gain > 0 ? Math.max(1, Math.ceil(cost.money / gain)) : null,
    cost
  }
}

// 汇总所有洞府加成，便于展示
export const manorStats = player => {
  const bonus = manorOfflineBonus(player)
  return {
    capHours: bonus.capHours,
    offlineCultivationMult: bonus.cultivationMult,
    offlineMoneyMult: bonus.moneyMult,
    herbsPerHour: bonus.herbsPerHour,
    cultivationSpeedMult: manorCultivationSpeed(player),
    talentBoost: manorTalentBoost(player),
    enhance: manorEnhanceBonus(player),
    totalInvested: getManor(player).totalInvested || 0
  }
}

// 在线被动产出：页面打开时按秒小量累积，让洞府“活着”
export const manorOnlineTick = (player, seconds = 10) => {
  const bonus = manorOfflineBonus(player)
  const speed = manorCultivationSpeed(player)
  const scale = Math.max(1, player.maxCultivation || 100)
  const gainedCultivation = Math.floor(scale * 0.002 * (seconds / 10) * speed)
  const gainedMoney = Math.floor((player.level || 1) * 0.5 * (seconds / 10) * bonus.moneyMult)
  const gainedHerb = Math.floor(bonus.herbsPerHour * (seconds / 3600))
  player.cultivation = (player.cultivation || 0) + gainedCultivation
  player.props.money = (player.props.money || 0) + gainedMoney
  player.props.spiritHerb = (player.props.spiritHerb || 0) + gainedHerb
  return { gainedCultivation, gainedMoney, gainedHerb }
}
