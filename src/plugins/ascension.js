// 界域飞升 —— 永恒晋升：人界 / 灵界 / 仙界 / 神界
//
// 到达当前界域尽头(人界圆满45/灵界圆满81/仙界圆满117)可发起飞升试炼，
// 消耗混沌石 + 战力判定，成功晋阶下一界，永久获得界域加成并解锁新系统。
// realmStage 为持久印记(转生不丢失)，加成由 realmBonus 实时计算。

import { levelNames } from './game.js'

export const ASCENSION_STAGES = [
  {
    stage: 0,
    name: '人界',
    desc: '凡体修仙，立道之基',
    endLevel: 45,
    trial: 0,
    cost: 0,
    bonus: {},
    unlocks: ['修炼', '炼丹', '炼器', '符箓', '阵法', '洞府', '宗门', '坊市', '秘境']
  },
  {
    stage: 1,
    name: '灵界',
    desc: '斩却凡胎，借天地之力',
    endLevel: 81,
    trial: 9000,
    cost: 5,
    bonus: { attack: 0.1, defense: 0.1, cultivationSpeed: 0.05, moneyMult: 0.05, effectBoost: 0.02 },
    unlocks: ['灵根', '灵物', '灵兽驯化', '跨界传送']
  },
  {
    stage: 2,
    name: '仙界',
    desc: '位列仙班，超然物外',
    endLevel: 117,
    trial: 42000,
    cost: 12,
    bonus: { attack: 0.25, defense: 0.2, cultivationSpeed: 0.1, moneyMult: 0.1, effectBoost: 0.04, critical: 0.03, dodge: 0.03 },
    unlocks: ['仙果', '仙缘', '先天灵宝', '洞天福地']
  },
  {
    stage: 3,
    name: '神界',
    desc: '执掌法则，叩问大道',
    endLevel: 144,
    trial: 120000,
    cost: 25,
    bonus: { attack: 0.4, defense: 0.35, cultivationSpeed: 0.18, moneyMult: 0.18, effectBoost: 0.08, critical: 0.06, dodge: 0.06 },
    unlocks: ['法则', '道果', '化身', '神职', '信仰']
  }
]

export const stageOf = player => player.realm?.stage ?? 0
export const stageInfo = stage => ASCENSION_STAGES[stage] || ASCENSION_STAGES[ASCENSION_STAGES.length - 1]

// 界域飞升给全属性的加成(按当前 stage 实时计算)
export const realmBonus = player => {
  const s = stageOf(player)
  const info = ASCENSION_STAGES[s]
  return info.bonus || {}
}

const playerPower = player =>
  (player.attack || 0) * 3 + (player.defense || 0) + (player.maxHealth || 0) * 0.1 + (player.level || 0) * 6

export const nextStage = player => {
  const s = stageOf(player)
  if (s >= ASCENSION_STAGES.length - 1) return null
  return ASCENSION_STAGES[s + 1]
}

export const canAscend = player => {
  const next = nextStage(player)
  if (!next) return { ok: false, reason: '已至神界之巅' }
  const cur = stageInfo(stageOf(player))
  if (player.level < cur.endLevel) return { ok: false, reason: `需修炼至${cur.name}圆满（${levelNames(cur.endLevel)}）` }
  if ((player.props.currency || 0) < next.cost) return { ok: false, reason: `混沌石不足(需 ${next.cost})` }
  return { ok: true, next }
}

export const ascendRealm = player => {
  const check = canAscend(player)
  if (!check.ok) return { ok: false, reason: check.reason }
  const next = check.next
  player.props.currency -= next.cost
  const pp = playerPower(player)
  const chance = Math.min(0.95, Math.max(0.25, pp / (pp + next.trial)))
  if (Math.random() < chance) {
    player.realm.stage = next.stage
    return { ok: true, name: next.name, bonus: next.bonus }
  }
  player.props.currency += Math.floor(next.cost * 0.5)
  return { ok: false, reason: '飞升试炼失败，混沌石损耗一半，可再试' }
}
