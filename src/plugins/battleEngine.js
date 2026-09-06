// 回合制战斗引擎 —— 玩家 vs 1~3 个敌人
// 参考传统回合制修仙设计：速度决定行动顺序；普攻/技能(耗灵力)/防御/逃跑；分回合、有战斗日志；
// 状态(眩晕/中毒/灼烧)、暴击、闪避、格挡、吸血、反伤、破甲、境界压制皆纳入结算。
//
// 用法（UI 驱动）：
//   const st = startBattle(player, enemies)
//   phase === 'player' → 玩家点击动作 chooseAction(st, action)
//   phase === 'enemy'  → 延时后调用 enemyTurn(st)
//   phase ∈ victory/defeat/fled → 结算奖励/失败
// 每次动作后调用 nextTurn(st) 推进到下一个行动者。

import { effectivePlayerStats } from './setBonus.js'
import { techniqueById, methodChapter, TECH_GRADES } from './technique.js'
import { realmSuppressionMult } from './game.js'
import { applyDotDamage, isStunned, clearStun, aggregatePlayerEffects, resolveHitEffects, applyLifesteal } from './effectCombat.js'
import monsters from './monster.js'

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
const clamp0 = v => Math.max(0, v)
const clamp01 = v => Math.min(1, Math.max(0, v))

// —— 把玩家快照成战斗实体 ——
export const createPlayerEntity = player => {
  const eff = effectivePlayerStats(player)
  const ex = eff.extras || {}
  const maxHp = eff.maxHealth || player.maxHealth || 1000
  return {
    id: '__player__',
    isPlayer: true,
    name: '你',
    level: player.level || 1,
    hp: maxHp,
    maxHp,
    mp: Math.floor(maxHp * 0.5),
    maxMp: Math.floor(maxHp * 0.5),
    atk: eff.attack || 1,
    def: eff.defense || 0,
    spd: 10 + (ex.speed || 0) * 20 + (player.level || 0) * 0.1,
    crit: Math.min(0.8, clamp01(eff.critical || 0)),
    dodge: Math.min(0.8, clamp01(eff.dodge || 0)),
    accuracy: ex.accuracy || 0,
    armorPen: ex.armorPen || 0,
    critDmg: 1.5 + (ex.critDamage || 0),
    block: ex.block || 0,
    damageReduction: ex.damageReduction || 0,
    tenacity: ex.tenacity || 0,
    hpRegen: ex.hpRegen || 0,
    thorns: ex.thorns || 0,
    shield: ex.shield || 0,
    slow: ex.slow || 0,
    effects: aggregatePlayerEffects(player),
    abilities: getPlayerAbilities(player),
    _stunned: false, _dot: {}, _defending: false
  }
}

// 从主动功法的「神通」生成可释放的技能（耗灵力 + 类型效果）
export const getPlayerAbilities = player => {
  const list = []
  // 已选择「上阵」则用选中集合；未选择则回退到所有已习得的主动功法，保证学过的神通都能用
  const set = player.techniqueSet
  const hasSet = set && set.active && set.active.length
  const activeIds = hasSet ? set.active : Object.keys(player.methods || {}).filter(id => techniqueById(id)?.type === 'active')
  for (const id of activeIds) {
    const t = techniqueById(id)
    if (!t || !t.divine) continue
    if (!player.methods?.[id]) continue
    const g = TECH_GRADES[t.grade - 1]?.mult || 1
    const chapter = methodChapter(player, id)
    // 控制型神通削弱：伤害打折，且定身改为按 chance 概率触发
    const power = t.divine.dmg * (1 + chapter * 0.04) * (t.divine.kind === 'control' ? 0.8 : 1)
    const mpCost = Math.max(15, Math.floor(18 + g * 6))
    list.push({
      id: `ab-${id}`,
      name: t.divine.name,
      kind: t.divine.kind || 'burst',
      power,
      mpCost,
      chance: t.divine.chance ?? 0.1,
      tier: t.grade
    })
    if (list.length >= 5) break // 主动最多 5 门
  }
  return list
}

// 由怪物数值生成敌人实体
const makeEnemy = (lv, idx) => {
  const name = monsters.monster_Names ? monsters.monster_Names(lv) : monsters.n(lv) || '妖'
  const health = monsters.monster_Health ? monsters.monster_Health(lv) : 100
  const attack = monsters.monster_Attack ? monsters.monster_Attack(lv) : 10
  const defense = monsters.monster_Defense ? monsters.monster_Defense(lv) : 1
  const crit = monsters.monster_Criticalhitrate ? monsters.monster_Criticalhitrate(lv) : 0.01
  return {
    id: `e-${idx}`,
    isPlayer: false,
    name,
    level: lv,
    hp: health,
    maxHp: health,
    mp: Math.floor(health * 0.25),
    maxMp: Math.floor(health * 0.25),
    atk: attack,
    def: defense,
    spd: 8 + idx * 1.5 + lv * 0.05,
    crit: clamp01(crit),
    dodge: 0.02 * 0.4,
    critDmg: 1.5,
    accuracy: 0,
    armorPen: 0,
    effects: { paralyze: 0, freeze: 0, stun: 0, poison: 0, burn: 0, lifesteal: 0 },
    _stunned: false, _dot: {}, _defending: false
  }
}

// 生成一批敌人：敌人按**自身等级**用现有 monster 表独立成长，不随玩家战力缩放。
// levelOffset 决定敌人境界相对玩家高/低几级——高境界打低境界是碾压，反之被碾压（由境界压制口径体现）。
export const buildEnemies = (player, { count = 1, boss = false, levelOffset = 0, reincarnation = 0 } = {}) => {
  const pLv = Math.max(1, player.level || 1)
  const out = []
  const n = Math.max(1, count)
  for (let i = 0; i < n; i++) {
    let lv = Math.max(1, pLv + levelOffset + randInt(-2, 2))
    const e = makeEnemy(lv, i)
    if (boss) {
      const m = 2.0 + reincarnation * 0.2
      e.maxHp = Math.floor(e.maxHp * m)
      e.hp = e.maxHp
      e.atk = Math.floor(e.atk * 1.5)
      e.def = Math.floor(e.def * 1.6)
      e.crit = Math.min(0.3, e.crit * 1.5 + 0.08)
      e.mp = Math.floor(e.maxHp * 0.5)
      e.maxMp = e.mp
      e.name = (monsters.monster_Names ? monsters.monster_Names(lv) : '秘境之主') + '·首领'
    }
    out.push(e)
  }
  return out
}

// 按速度排序行动顺序
const buildOrder = st => {
  st.order = [st.player, ...st.enemies]
    .filter(e => e.hp > 0)
    .sort((a, b) => (b.spd - a.spd) || (a.isPlayer ? -1 : 1))
    .map(e => e.id)
}

export const startBattle = (player, enemies = buildEnemies(player.level || 1, {}), opts = {}) => {
  const st = {
    player: createPlayerEntity(player),
    realPlayer: player,
    enemies,
    round: 1,
    turnIdx: -1,
    order: [],
    phase: 'idle',
    activeId: null,
    log: [],
    reward: null,
    award: opts.award !== false // 由调用方决定是否自动发放奖励（探索用 false，自行结算）
  }
  buildOrder(st)
  st.phase = 'idle'
  nextTurn(st)
  return st
}

// 把探索/BOSS 的野怪原数据(health/attack/defense/critical/dodge/level)转成对战实体，供 startBattle 使用
export const monsterToEntity = (m, idx = 0) => {
  const hp = m?.health || m?.maxHp || 100
  return {
    id: `cm-${idx}`,
    isPlayer: false,
    name: m?.name || '妖物',
    level: m?.level || 1,
    hp,
    maxHp: hp,
    mp: Math.floor(hp * 0.25),
    maxMp: Math.floor(hp * 0.25),
    atk: m?.attack || 10,
    def: m?.defense || 1,
    spd: 8 + (m?.level || 1) * 0.05,
    crit: clamp01(m?.critical || 0.01),
    dodge: clamp01((m?.dodge || 0.02) * 0.4),
    critDmg: 1.5,
    accuracy: 0,
    armorPen: 0,
    block: 0,
    damageReduction: 0,
    effects: { paralyze: 0, freeze: 0, stun: 0, poison: 0, burn: 0, lifesteal: 0 },
    _stunned: false,
    _dot: {},
    _defending: false
  }
}

export const currentEntity = st => {
  const all = [st.player, ...st.enemies]
  return all.find(e => e.id === st.activeId) || null
}

export const isPlayerTurn = st => st.phase === 'player'
export const isEnemyTurn = st => st.phase === 'enemy'
export const battleOver = st => st.phase === 'victory' || st.phase === 'defeat' || st.phase === 'fled'

const addLog = (st, html, cls = '') => {
  st.log.push({ round: st.round, text: html, cls })
  if (st.log.length > 120) st.log.shift()
}

const actorMpRegen = (st, actor) => {
  if (!actor.isPlayer) return
  actor.mp = Math.min(actor.maxMp, actor.mp + Math.floor(actor.maxMp * 0.06))
}

// 世界压制：玩家 vs 敌人按各自境界
const suppression = (aLv, dLv) => realmSuppressionMult(aLv, dLv)

// 一次命中结算：attacker 打 defender；mult 为技能倍率；返回 {miss, dmg, crit}
const dealDamage = (st, attacker, defender, mult = 1, { ignoreDodge = false } = {}) => {
  const atkDef = Math.max(0, defender.def - attacker.armorPen)
  let dmg = Math.max(1, attacker.atk - atkDef)
  // 闪避
  if (!ignoreDodge && Math.random() < clamp01(defender.dodge - attacker.accuracy)) {
    addLog(st, `<span class="dim">${defender.name}轻盈避开攻击。</span>`, 'dodge')
    return { miss: true, dmg: 0 }
  }
  // 暴击
  let crit = false
  if (Math.random() < attacker.crit) {
    dmg = Math.floor(dmg * attacker.critDmg)
    crit = true
  }
  dmg = Math.floor(dmg * mult)
  // 世界压制
  dmg = Math.floor(dmg * suppression(attacker.level, defender.level))
  // 格挡 / 减伤 / 防御
  if (Math.random() < clamp01(defender.block || 0)) dmg = Math.floor(dmg * 0.5)
  dmg = Math.floor(dmg * (1 - clamp01(defender.damageReduction || 0)))
  if (defender._defending) dmg = Math.floor(dmg * 0.4)
  dmg = Math.max(1, dmg)
  defender.hp = clamp0(defender.hp - dmg)
  return { miss: false, dmg, crit }
}

const applyOnHit = (st, attacker, defender) => {
  // 控制/持续伤害（复用玩家特效聚合）
  const logs = resolveHitEffects(attacker, attacker.effects || {}, defender)
  logs.forEach(l => addLog(st, `<span class="warn">${l}</span>`, 'debuff'))
}

const dotPhase = (st, ent) => {
  const d = applyDotDamage(ent)
  if (d > 0) addLog(st, `<span class="warn">${ent.name}受持续伤害流失 ${d} 点气血。</span>`, 'dot')
  return d
}

const heal = (st, ent, amount) => {
  ent.hp = Math.min(ent.maxHp, ent.hp + Math.floor(amount))
}

// 玩家普攻 / 释放技能
export const playerAttack = (st, enemyId, ability) => {
  const p = st.player
  if (st.phase !== 'player') return
  // 回血类技能：无需目标
  if (ability && ability.kind === 'heal') {
    if (p.mp < ability.mpCost) { addLog(st, `<span class="warn">灵力不足，无法施展【${ability.name}】。</span>`, 'warn'); return }
    p.mp -= ability.mpCost
    addLog(st, `<span class="skill">你催动【${ability.name}】！</span>`, 'skill')
    const amount = p.maxHp * 0.12 * ability.power
    heal(st, p, amount)
    addLog(st, `<span class="ok">你运转【${ability.name}】，恢复 ${Math.floor(amount)} 点气血。</span>`, 'heal')
    nextTurn(st)
    return
  }
  const target = st.enemies.find(e => e.id === enemyId && e.hp > 0)
  if (!target) return
  if (ability && ability.mpCost != null) {
    if (p.mp < ability.mpCost) {
      addLog(st, `<span class="warn">灵力不足，无法施展【${ability.name}】。</span>`, 'warn')
      return
    }
    p.mp -= ability.mpCost
    addLog(st, `<span class="skill">你催动【${ability.name}】！</span>`, 'skill')
    if (ability.kind === 'heal') {
      const amount = p.maxHp * 0.12 * ability.power
      heal(st, p, amount)
      addLog(st, `<span class="ok">你运转【${ability.name}】，恢复 ${Math.floor(amount)} 点气血。</span>`, 'heal')
    } else {
      const r = dealDamage(st, p, target, ability.power)
      if (!r.miss) {
        addLog(st, `<span class="dmg">你对${target.name}造成 <b>${r.dmg}</b> 点伤害${r.crit ? '（暴击）' : ''}。</span>`, 'dmg')
        applyOnHit(st, p, target)
        if (ability.kind === 'lifesteal') {
          const ls = applyLifesteal(p, r.dmg, 0.35)
          if (ls > 0) addLog(st, `<span class="ok">你吸取 ${ls} 点气血。</span>`, 'heal')
        } else if (ability.kind === 'control') {
          const stunChance = Math.min(0.5, (ability.chance ?? 0.1) * 0.6)
          if (Math.random() < stunChance) {
            target._stunned = true
            addLog(st, `<span class="warn">${target.name}被${ability.name}所缚，无法行动！</span>`, 'debuff')
          } else {
            addLog(st, `<span class="dodge">${target.name}挣脱了${ability.name}的束缚。</span>`, 'dodge')
          }
        }
      }
    }
  } else {
    const r = dealDamage(st, p, target, 1)
    if (!r.miss) {
      addLog(st, `<span class="dmg">你挥出攻击，对${target.name}造成 <b>${r.dmg}</b> 点伤害${r.crit ? '（暴击）' : ''}。</span>`, 'dmg')
      applyOnHit(st, p, target)
      if (p.effects?.lifesteal) {
        const ls = applyLifesteal(p, r.dmg, p.effects.lifesteal)
        if (ls > 0) addLog(st, `<span class="ok">你吸取 ${ls} 点气血。</span>`, 'heal')
      }
    }
  }
  nextTurn(st)
}

// 防御：本回合减伤并回灵力
export const playerDefend = st => {
  if (st.phase !== 'player') return
  const p = st.player
  p._defending = true
  addLog(st, '<span class="def">你凝神戒备，本回合所受伤害大幅降低。</span>', 'def')
  nextTurn(st)
}

// 逃跑：概率 = 我方速度 / (我方速度 + 敌方平均速度)
export const playerFlee = st => {
  if (st.phase !== 'player') return
  const p = st.player
  const avg = st.enemies.filter(e => e.hp > 0).reduce((s, e) => s + e.spd, 0) / Math.max(1, st.enemies.filter(e => e.hp > 0).length)
  const chance = clamp01(p.spd / (p.spd + avg + 1))
  if (Math.random() < chance) {
    st.phase = 'fled'
    addLog(st, '<span class="ok">你成功脱离战斗。</span>', 'ok')
  } else {
    addLog(st, '<span class="warn">你想退走，却被敌人截住去路！</span>', 'warn')
    nextTurn(st)
  }
}

// 敌人回合：简单 AI，通常普攻；首领有概率释放更强一击或防御
export const enemyTurn = st => {
  if (st.phase !== 'enemy') return
  const e = st.enemies.find(x => x.id === st.activeId)
  if (!e || e.hp <= 0) { nextTurn(st); return }
  const p = st.player
  // 被控制/眩晕则跳过
  if (isStunned(e)) {
    addLog(st, `<span class="warn">${e.name}被控无法行动。</span>`, 'debuff')
    clearStun(e)
    nextTurn(st)
    return
  }
  if (e._defending) e._defending = false
  const boss = e.name.includes('首领')
  const r = Math.random()
  if (boss && r < 0.25 && e.mp > 0) {
    e.mp -= 15
    const hit = dealDamage(st, e, p, 1.7)
    if (!hit.miss) addLog(st, `<span class="dmg">${e.name}施展绝学，对你造成 <b>${hit.dmg}</b> 点伤害${hit.crit ? '（暴击）' : ''}！</span>`, 'dmg')
  } else if (r > 0.9) {
    e._defending = true
    addLog(st, `<span class="def">${e.name}摆出守势，蓄势待发。</span>`, 'def')
  } else {
    const hit = dealDamage(st, e, p, 1)
    if (!hit.miss) addLog(st, `<span class="dmg">${e.name}向你扑来，造成 <b>${hit.dmg}</b> 点伤害${hit.crit ? '（暴击）' : ''}。</span>`, 'dmg')
  }
  // 敌人对玩家施加持续伤害（少量）
  applyOnHit(st, e, p)
  nextTurn(st)
}

export const chooseAction = (st, action) => {
  if (st.phase === 'player') {
    if (isStunned(st.player)) {
      addLog(st, '<span class="warn">你被控定身，无法行动！</span>', 'debuff')
      clearStun(st.player)
      nextTurn(st)
      return
    }
    if (action.type === 'attack') playerAttack(st, action.target, action.ability)
    else if (action.type === 'defend') playerDefend(st)
    else if (action.type === 'flee') playerFlee(st)
  }
}

// 自动战斗：为玩家挑选一个合理动作（保命治疗 > 爆发出牌 > 集火最弱）
export const aiPlayerAction = st => {
  if (!st || st.phase !== 'player') return null
  const p = st.player
  const targets = st.enemies.filter(e => e.hp > 0)
  if (!targets.length) return null
  const hpPct = p.hp / Math.max(1, p.maxHp)
  const abilities = p.abilities || []
  const mp = p.mp
  const canCast = a => a.mpCost != null && mp >= a.mpCost
  const heals = abilities.filter(a => a.kind === 'heal')
  const others = abilities.filter(a => a.kind !== 'heal')
  const byAtk = targets.slice().sort((a, b) => b.atk - a.atk)
  const byHp = targets.slice().sort((a, b) => a.hp - b.hp)
  const strongest = byAtk[0]
  const weakest = byHp[0]
  const boss = targets.some(t => (t.name || '').includes('首领'))
  // 估算我方一次命中伤害（不含暴击/压制，仅用于选目标）
  const estDmg = t => Math.max(1, p.atk - (t.def || 0))
  // 可斩杀目标：当前一次攻击（含技能大致倍数）能收掉的
  const killable = targets.filter(t => estDmg(t) * 1.4 >= t.hp).sort((a, b) => a.hp - b.hp)[0]
  // 1) 濒死保命：治疗优先，其次吸血
  if (hpPct < 0.5) {
    const heal = heals.find(canCast)
    if (heal) return { type: 'attack', target: null, ability: heal }
    const drain = others.filter(a => a.kind === 'lifesteal' && canCast(a)).sort((a, b) => b.power - a.power)[0]
    if (drain) return { type: 'attack', target: killable || weakest, ability: drain }
  }
  // 2) 有威胁且我方血不健康：控住最强敌人，延缓其出手
  const control = others.filter(a => a.kind === 'control' && canCast(a)).sort((a, b) => b.power - a.power)[0]
  if (control && (boss || (targets.length >= 2 && hpPct < 0.75))) {
    return { type: 'attack', target: strongest.id, ability: control }
  }
  // 3) 濒死又无法治疗/吸血：防御苟一回合
  if (hpPct < 0.28 && targets.length >= 2 && !heals.some(canCast)) {
    return { type: 'defend' }
  }
  // 4) 灵力充足 / 对手很强 / 只剩最后一个：发大招（能斩则斩，否则打威胁最大者）
  const big = others.filter(canCast).sort((a, b) => b.power - a.power)[0]
  if (big && (mp >= p.maxMp * 0.5 || boss || targets.length <= 1)) {
    const tgt = (killable && estDmg(killable) * big.power >= killable.hp) ? killable : (targets.length > 1 ? strongest : weakest)
    return { type: 'attack', target: tgt.id, ability: big }
  }
  // 5) 普攻：目标 = 可斩杀 > 最强(压制) > 最弱
  const tgt = killable || (targets.length > 1 ? strongest : weakest)
  return { type: 'attack', target: tgt.id }
}

// 从当前指针往后找下一个存活行动者
const nextAlive = st => {
  const all = [st.player, ...st.enemies]
  const len = Math.max(1, st.order.length)
  for (let k = 0; k < len; k++) {
    const idx = (st.turnIdx + k + 1) % len
    const id = st.order[idx]
    const ent = all.find(e => e.id === id && e.hp > 0)
    if (ent) return { idx, ent, wrapped: idx <= st.turnIdx }
  }
  return null
}

// 推进到下一个行动者；行动开始时结算其持续伤害，回合结束即判定胜负
export const nextTurn = st => {
  // 先判定胜负
  if (st.player.hp <= 0) {
    st.phase = 'defeat'
    addLog(st, '<span class="err">你气血耗尽，修炼之路暂且受挫……</span>', 'err')
    return
  }
  if (st.enemies.every(e => e.hp <= 0)) {
    st.phase = 'victory'
    awardVictory(st)
    addLog(st, '<span class="ok">战斗胜利！你清除了眼前的敌人。</span>', 'ok')
    return
  }
  const res = nextAlive(st)
  if (!res) {
    // 无存活者：按玩家/敌人判定
    if (st.player.hp > 0 && st.enemies.every(e => e.hp <= 0)) { st.phase = 'victory'; awardVictory(st); addLog(st, '<span class="ok">战斗胜利！你清除了眼前的敌人。</span>', 'ok'); return }
    if (st.player.hp <= 0) { st.phase = 'defeat'; addLog(st, '<span class="err">你气血耗尽，修炼之路暂且受挫……</span>', 'err'); return }
    st.phase = 'player'; return
  }
  if (res.wrapped) st.round++
  if (res.ent.hp <= 0) { nextTurn(st); return }
  st.turnIdx = res.idx
  st.activeId = res.ent.id
  // 该行动者回合开始时先结算持续伤害
  dotPhase(st, res.ent)
  // 若被持续伤害放倒
  if (res.ent.hp <= 0) {
    if (res.ent.isPlayer) { st.phase = 'defeat'; addLog(st, '<span class="err">你气血耗尽，修炼之路暂且受挫……</span>', 'err'); return }
    if (st.enemies.every(e => e.hp <= 0)) { st.phase = 'victory'; awardVictory(st); addLog(st, '<span class="ok">战斗胜利！你清除了眼前的敌人。</span>', 'ok'); return }
    nextTurn(st); return
  }
  st.phase = res.ent.isPlayer ? 'player' : 'enemy'
  if (res.ent.isPlayer) {
    res.ent._defending = false
    actorMpRegen(st, res.ent)
    if (res.ent.hpRegen > 0) heal(st, res.ent, res.ent.hpRegen)
  }
}

const awardVictory = st => {
  const p = st.realPlayer
  if (st.award === false) {
    // 仅计算奖励用于展示，不发放（探索/BOSS 有自己的奖励结算）
    st.reward = { exp: 0, money: 0, dan: 0, herb: 0, stone: 0, enemies: st.enemies.length }
    st.reward.exp = st.enemies.reduce((s, e) => s + Math.floor(e.level * e.level * 3), 0)
    st.reward.money = st.enemies.reduce((s, e) => s + Math.floor(e.maxHp * 0.6), 0)
    st.reward.dan = st.enemies.reduce((s, e) => s + Math.max(1, Math.floor(e.level / 30)), 0)
    st.reward.herb = st.enemies.reduce((s, e) => s + Math.max(1, Math.floor(e.level / 15)), 0)
    st.reward.stone = st.enemies.reduce((s, e) => s + Math.max(1, Math.floor(e.level / 20)), 0)
    return
  }
  let exp = 0; let money = 0; let dan = 0; let herb = 0; let stone = 0
  st.enemies.forEach(e => {
    exp += Math.floor(e.level * e.level * 3)
    money += Math.floor(e.maxHp * 0.6)
    dan += Math.max(1, Math.floor(e.level / 30))
    herb += Math.max(1, Math.floor(e.level / 15))
    stone += Math.max(1, Math.floor(e.level / 20))
  })
  p.cultivation = (p.cultivation || 0) + exp
  p.props.money = (p.props.money || 0) + money
  p.props.cultivateDan = (p.props.cultivateDan || 0) + dan
  p.props.spiritHerb = (p.props.spiritHerb || 0) + herb
  p.props.strengtheningStone = (p.props.strengtheningStone || 0) + stone
  st.reward = { exp, money, dan, herb, stone, enemies: st.enemies.length }
}
