// 多玩家纸牌引擎：统一管理底注、下注轮、封顶开牌、全下、翻前跑马
import { mkDeck, shuffle, evalThree, evalSeven } from './pokerUtil.js'

// 翻前牌力(0~1)：尽量贴近常见手牌胜率，避免把 K7o 这类弱牌估成“好牌”
function preflopStrength(h) {
  if (!h || h.length < 2) return 0.2
  const a = h[0]
  const b = h[1]
  const hi = Math.max(a.rank, b.rank)
  const lo = Math.min(a.rank, b.rank)
  if (hi === lo) return Math.min(0.88, 0.46 + hi * 0.028) // 对子：22~0.52，QQ~0.80，AA~0.85
  let s = (hi / 14) * 0.36 // 高牌本身
  const gap = hi - lo
  if (gap === 1) s += 0.12
  else if (gap === 2) s += 0.08
  else if (gap === 3) s += 0.05
  else if (gap === 4) s += 0.03
  if (a.suit === b.suit) s += 0.05 // 同花加成
  s += (lo / 14) * 0.06 // 跟牌小贡献
  return Math.max(0.28, Math.min(0.7, s))
}

// 对手强度档位：只调整 AI 性格与决策纪律，不改牌、不改发牌结果
const AI_PROFILES = [
  { tight: [0.1, 0.3], aggr: [0.28, 0.63], skill: 0 },
  { tight: [0.18, 0.34], aggr: [0.45, 0.72], skill: 0.25 },
  { tight: [0.24, 0.4], aggr: [0.6, 0.85], skill: 0.5 },
  { tight: [0.3, 0.46], aggr: [0.75, 0.95], skill: 0.8 },
  { tight: [0.36, 0.52], aggr: [0.9, 1.1], skill: 1 },
  { tight: [0.42, 0.58], aggr: [1.0, 1.2], skill: 1.15 }
]
const lerp = (a, b, t) => a + (b - a) * t

export function createPokerEngine(opts) {
  // opts: playerCount, ante, potCap, isTexas, communityPerStreet[], maxStreet,
  //       evalBest(hole, community), makeName(i)
  const playerCount = opts.playerCount
  const ante = opts.ante
  const potCap = opts.potCap
  const deck = shuffle(mkDeck())
  const aiLevel = Math.max(0, Math.min(AI_PROFILES.length - 1, Math.floor(opts.aiLevel || 0)))
  const aiProfile = AI_PROFILES[aiLevel]

  const players = Array.from({ length: playerCount }, (_, i) => ({
    i,
    isHuman: i === 0,
    name: opts.makeName(i),
    hole: [],
    stack: opts.chipsPerPlayer,
    committed: 0,
    streetBet: 0,
    folded: false,
    allIn: false,
    acted: false,
    revealed: false,
    tight: i === 0 ? 0 : lerp(aiProfile.tight[0], aiProfile.tight[1], Math.random()), // 松紧度：AI 性格
    aggr: i === 0 ? 0 : lerp(aiProfile.aggr[0], aiProfile.aggr[1], Math.random()), // 激进程度：AI 性格
    skill: i === 0 ? 0 : aiProfile.skill // 决策纪律：只影响策略，不影响牌
  }))

  const totalCommunity = opts.communityPerStreet.reduce((a, b) => a + b, 0)

  const state = {
    phase: 'idle', // idle | betting | runchoice | over
    street: 0,
    currentBet: 0,
    minRaise: ante,
    community: [],
    pot: 0,
    actIdx: 0,
    lastRaiseIdx: -1,
    winnerIdx: [],
    winAmount: 0,
    humanWin: 0,
    humanNet: 0,
    waitingHuman: false,
    pendingRunTwice: false,
    log: '',
    resultName: '',
    runCount: 1
  }

  const commit = (p, add) => {
    p.committed += add
    p.streetBet += add
    p.stack -= add
  }

  const activePlayers = () => players.filter(p => !p.folded)
  const actablePlayers = () => players.filter(p => !p.folded && !p.allIn)

  const betRoundComplete = () => {
    const actable = actablePlayers()
    if (actable.length === 0) return true
    return actable.every(p => p.acted && p.streetBet === state.currentBet)
  }

  const resetActedExcept = keep => {
    players.forEach(p => {
      if (p !== keep && !p.folded && !p.allIn) p.acted = false
    })
  }

  const needsAct = p => !p.folded && !p.allIn && !p.acted

  const nextActor = () => {
    for (let k = 1; k <= playerCount; k++) {
      const idx = (state.actIdx + k) % playerCount
      const p = players[idx]
      if (needsAct(p)) {
        state.actIdx = idx
        return p
      }
    }
    return null
  }

  const firstActable = () => players.find(p => !p.folded && !p.allIn)

  const strengthOf = p => {
    if (opts.isTexas && state.community.length < 3) return preflopStrength(p.hole)
    const best = opts.evalBest(p.hole, state.community)
    return (best ? best.type : 0) / (opts.maxType || 8)
  }

  const aiDecide = p => {
    const toCall = state.currentBet - p.streetBet
    const str = strengthOf(p)
    const tight = p.tight || 0.5
    const aggr = p.aggr || 0.5
    const skill = p.skill || 0
    const pot = state.pot || 0
    const stack = p.stack || 0
    // 阈值收紧：67o / K7o 等低杂连张被归为“弱牌”
    const isStrong = str >= 0.75
    const isGood = str >= 0.52
    const isMed = str >= 0.35
    const isWeak = str < 0.35
    const canBet = p.streetBet < potCap / 2 // 还有下注空间
    const equity = Math.min(1, str * 0.85 + 0.06)
    const potOdds = toCall > 0 ? toCall / (pot + toCall) : 0
    // 需要明显优势才继续；大注/全下必须能赢才跟，避免弱牌“赔率不算但也硬跟”
    const profitable = toCall > 0 && equity > potOdds + 0.04
    const bigBet = toCall >= pot * 0.8 || toCall >= stack * 0.3
    const allInBet = toCall >= stack * 0.7
    // 下注大小的目标（依据牌力：越强下越大）
    const target = mult => {
      const base = Math.max(state.currentBet || 1, pot * 0.35)
      const t = state.currentBet + Math.round(base * mult)
      return Math.max(state.currentBet, t)
    }
    // 面对下注：先判断要不要被 "吓" 到弃牌
    if (toCall > 0) {
      let foldP = 0.05
      if (isWeak) foldP += 0.16 + skill * 0.12
      else if (isMed) foldP += 0.04 - skill * 0.02
      if (bigBet) foldP -= 0.06
      if (profitable) foldP -= 0.24
      if (isStrong) foldP = Math.max(0.005, 0.02 - skill * 0.015)
      if (allInBet && !isGood) foldP -= 0.12
      foldP += (tight - 0.5) * 0.3
      foldP = Math.max(0.02, Math.min(0.95, foldP))
      if (Math.random() < foldP) return { action: 'fold' }
      // 弱牌面对「非全下」的大注：必弃；全下交给上面的概率路径（弱牌以极低概率接、接了多半输），
      // 避免“只接必赢”的错觉，也防止 67o 无脑硬跟。
      // 弱牌面对非全下的大注：不再是必弃，改为约 40% 概率弃牌（松弱 AI 更敢跟）
      if (isWeak && bigBet && !allInBet && Math.random() < 0.12) return { action: 'fold' }
    }
    // 可过牌：考虑价值下注 / 半诈唬 / 偷鸡 / 慢打
    if (toCall <= 0) {
      const slowPlay = isStrong && Math.random() < 0.25 + (1 - aggr) * 0.25 // 强牌慢打陷阱
      const valueBet = (isGood || isStrong) && Math.random() < 0.45 + (aggr - 0.5) * 0.4
      // 松弱：少诈唬、少加注，多数过牌看牌
      const semiBluff = isMed && Math.random() < 0.12 + (aggr - 0.5) * 0.12 - skill * 0.03
      const bluff = isWeak && canBet && Math.random() < (0.02 + (1 - tight) * 0.05) * aggr * 2 * (1 - skill * 0.5)
      if (isStrong && valueBet) return { action: 'raise', raiseTo: target(0.7 + Math.random() * 1.1 + skill * 0.2) }
      if (isGood && valueBet) return { action: 'raise', raiseTo: target(0.4 + Math.random() * 0.4 + skill * 0.15) }
      if (semiBluff && canBet) return { action: 'raise', raiseTo: target(0.3 + Math.random() * 0.3) }
      if (bluff && canBet) return { action: 'raise', raiseTo: target(0.2 + Math.random() * 0.25) }
      return { action: 'check' }
    }
    // 面对下注：先处理全下——松弱 AI 用较宽范围 + 概率接全下（也会拿中等/弱牌接并输掉），
    // 避免“只接必赢的强牌”造成像是透视；但弱牌接全下概率极低，防止 67o 无脑硬跟。
    if (allInBet) {
      const looseBias = Math.max(0, 0.45 - tight) // 越松，接全下概率越高（0~0.27）
      let callP
      if (str >= 0.7) callP = 0.92 + skill * 0.06
      else if (str >= 0.55) callP = 0.7 + looseBias * 0.3 + skill * 0.08
      else if (str >= 0.42) callP = 0.44 + looseBias * 0.5 + skill * 0.04
      else callP = (0.05 + looseBias * 0.2) * (1 - skill * 0.5) // 弱牌极低概率接
      // 若下注相对底池极离谱，再压低一点；但保留一定“接单”率使其看起来像真人
      if (potOdds > 0.8 && str < 0.5) callP *= 0.6
      if (Math.random() < Math.min(0.95, callP)) return { action: 'allin' }
      return { action: 'fold' }
    }
    // 加注：仅强/好牌，且面对的不是过于巨大的注码
    if (isStrong && Math.random() < 0.35 + aggr * 0.15 + skill * 0.15) return { action: 'raise', raiseTo: target(0.7 + Math.random() * 1.1 + skill * 0.2) }
    if (isGood && Math.random() < 0.15 + aggr * 0.1 + skill * 0.1) return { action: 'raise', raiseTo: target(0.45 + Math.random() * 0.4 + skill * 0.1) }
    if (isMed && canBet && toCall <= pot * 0.5 && Math.random() < 0.03 + (1 - tight) * 0.03 - skill * 0.01) return { action: 'raise', raiseTo: target(0.3 + Math.random() * 0.3) }
    // 松弱：跟注得更宽松——中注只要牌不差就咬，小额注几乎都跟
    if (profitable) return { action: 'call' }
    if (toCall <= pot * 0.6 && str >= 0.3) return { action: 'call' }
    if (toCall <= pot * 0.3) return Math.random() < 0.75 ? { action: 'call' } : { action: 'fold' }
    return { action: 'fold' }
  }

  const applyAction = (p, action, raiseTo) => {
    const toCall = state.currentBet - p.streetBet
    if (action === 'fold') {
      p.folded = true
      p.acted = true
    } else if (action === 'check') {
      p.acted = true
    } else if (action === 'call') {
      const add = Math.max(0, Math.min(toCall, p.stack))
      commit(p, add)
      if (p.stack === 0) p.allIn = true
      p.acted = true
    } else if (action === 'allin') {
      const add = p.stack
      commit(p, add)
      p.allIn = true
      p.acted = true
      if (p.streetBet > state.currentBet) {
        state.currentBet = p.streetBet
        resetActedExcept(p)
      }
    } else if (action === 'raise') {
      let target = raiseTo || state.currentBet * 2
      if (target <= state.currentBet) target = state.currentBet + Math.max(state.minRaise, state.currentBet)
      target = Math.min(target, p.streetBet + p.stack)
      const add = Math.max(0, Math.min(target - p.streetBet, p.stack))
      commit(p, add)
      if (p.stack === 0) p.allIn = true
      p.acted = true
      if (p.streetBet > state.currentBet) {
        state.currentBet = p.streetBet
        state.minRaise = Math.max(state.minRaise, state.currentBet)
        resetActedExcept(p)
      }
    }
    state.pot = players.reduce((s, q) => s + q.committed, 0)
  }

  const dealCommunity = count => {
    for (let i = 0; i < count; i++) state.community.push(deck.pop())
  }

  const runoutAll = () => {
    while (state.community.length < totalCommunity) dealCommunity(1)
  }

  const finishLastStanding = winner => {
    state.phase = 'over'
    state.winnerIdx = [winner.i]
    state.winAmount = state.pot
    state.humanWin = winner.i === 0 ? state.pot : 0
    state.humanNet = state.humanWin - players[0].committed
    state.resultName = `${winner.name} 赢得 ${state.pot} 筹码`
    state.log = '其他玩家已弃牌'
  }

  const showdown = () => {
    const active = activePlayers()
    active.forEach(p => (p.revealed = true))
    const ranked = active
      .map(p => ({ p, best: opts.evalBest(p.hole, state.community) }))
      .sort((a, b) => cmpBest(b.best, a.best))
    // 边池结算：按各玩家投入分档，每档只由投入达到该档的玩家竞争（低筹码全下者只能赢到“自己投入×2”之外的主池）
    const amounts = active.map(p => p.committed)
    const levels = [...new Set(amounts)].sort((a, b) => a - b)
    const pots = []
    let prev = 0
    for (const lv of levels) {
      const elig = active.filter(p => p.committed >= lv)
      const slice = (lv - prev) * elig.length
      if (slice > 0) pots.push({ amount: slice, elig })
      prev = lv
    }
    const winnerIdxSet = new Set()
    let humanWin = 0
    const parts = []
    for (const pot of pots) {
      const eligRanked = ranked.filter(r => pot.elig.some(e => e.i === r.p.i))
      const best = eligRanked[0].best
      const ws = eligRanked.filter(r => cmpBest(r.best, best) === 0).map(r => r.p)
      const share = Math.floor(pot.amount / ws.length) + (pot.amount % ws.length)
      ws.forEach(w => {
        winnerIdxSet.add(w.i)
        if (w.i === 0) humanWin += share
      })
      parts.push(ws.length === 1 ? `${ws[0].name} 得 ${pot.amount}` : `${ws.map(w => w.name).join('、')} 平分 ${pot.amount}`)
    }
    const totalPot = pots.reduce((s, x) => s + x.amount, 0)
    state.winnerIdx = [...winnerIdxSet]
    state.winAmount = totalPot
    state.humanWin = humanWin
    state.humanNet = humanWin - players[0].committed
    state.phase = 'over'
    state.resultName = parts.length > 1 ? `摊牌：${parts.join('；')}` : parts[0] || '摊牌结束'
    state.log = '摊牌结束（含边池）'
  }

  const nextStreet = () => {
    if (state.street < opts.communityPerStreet.length) {
      dealCommunity(opts.communityPerStreet[state.street])
      state.street++
    }
    state.currentBet = 0
    state.minRaise = ante
    state.lastRaiseIdx = -1
    players.forEach(p => {
      if (!p.folded && !p.allIn) p.acted = false
      p.streetBet = 0
    })
    const first = firstActable()
    state.actIdx = first ? first.i : 0
    state.waitingHuman = false
  }

  const startHand = () => {
    players.forEach(p => {
      p.stack = Math.max(0, p.stack)
      p.committed = 0
      p.streetBet = 0
      p.folded = false
      p.allIn = false
      p.acted = false
      p.revealed = false
    })
    state.phase = 'betting'
    state.street = 0
    state.community = []
    state.runCount = 1
    state.pendingRunTwice = false
    // 发牌
    for (let i = 0; i < opts.holeCards; i++) {
      for (const p of players) p.hole.push(deck.pop())
    }
    // 底注
    players.forEach(p => {
      const add = Math.min(ante, p.stack)
      commit(p, add)
    })
    state.currentBet = ante
    state.minRaise = ante
    state.pot = players.reduce((s, q) => s + q.committed, 0)
    const first = firstActable()
    state.actIdx = first ? first.i : 0
    state.waitingHuman = false
    state.winnerIdx = []
    state.winAmount = 0
    state.resultName = ''
    state.log = '对局开始，请选择操作'
  }

  const step = () => {
    if (state.phase === 'over') return 'over'
    if (state.waitingHuman && state.phase !== 'runchoice') return 'waiting'
    while (true) {
      const active = activePlayers()
      if (active.length === 1) {
        finishLastStanding(active[0])
        return 'over'
      }
      if (state.pot >= potCap) {
        runoutAll()
        showdown()
        return 'over'
      }
      if (betRoundComplete()) {
        const isTexasPreflopAllin =
          opts.isTexas &&
          state.street === 0 &&
          active.length === 2 &&
          active.some(p => p.allIn) &&
          state.community.length === 0
        if (isTexasPreflopAllin && !state.pendingRunTwice) {
          state.pendingRunTwice = true
          state.phase = 'runchoice'
          state.waitingHuman = true
          state.log = '翻前全下，请选择发一次或发两次'
          return 'runchoice'
        }
        if (state.street < opts.communityPerStreet.length) {
          nextStreet()
          continue
        }
        runoutAll()
        showdown()
        return 'over'
      }
      const p = nextActor()
      if (!p) {
        runoutAll()
        showdown()
        return 'over'
      }
      if (p.isHuman) {
        state.waitingHuman = true
        return 'waiting'
      }
      const decision = aiDecide(p)
      applyAction(p, decision.action, decision.raiseTo)
      state.log = `${p.name} ${labelOf(decision.action)}`
    }
  }

  const humanAction = (action, raiseTo) => {
    if (state.phase !== 'betting') return
    const p = players[0]
    if (p.folded || p.allIn) return
    if (action === 'raise') {
      const toCall = state.currentBet - p.streetBet
      const target = Math.min(raiseTo || state.currentBet * 2, p.streetBet + p.stack)
      applyAction(p, 'raise', target)
    } else {
      applyAction(p, action)
    }
    state.waitingHuman = false
    state.log = `你 ${labelOf(action)}`
    step()
  }

  const chooseRun = count => {
    if (state.phase !== 'runchoice') return
    state.runCount = count
    state.pendingRunTwice = false
    state.waitingHuman = false
    const active = activePlayers()
    if (count === 2 && active.length === 2) {
      // 跑两次：两副公共牌，各赢一半底池
      const finalists = active
      const boards = []
      for (let r = 0; r < 2; r++) {
        const b = []
        for (let i = 0; i < totalCommunity; i++) b.push(deck.pop())
        boards.push(b)
      }
      finalists.forEach(p => (p.revealed = true))
      let half = Math.floor(state.pot / 2)
      const winnersSet = new Set()
      let humanWin = 0
      boards.forEach(b => {
        const ranked = finalists
          .map(p => ({ p, best: opts.evalBest(p.hole, b) }))
          .sort((x, y) => cmpBest(y.best, x.best))
        const best = ranked[0].best
        const ws = ranked.filter(r => cmpBest(r.best, best) === 0).map(r => r.p)
        const share = Math.floor(half / ws.length)
        ws.forEach(w => winnersSet.add(w.i))
        if (ws.includes(players[0])) humanWin += share
      })
      state.winnerIdx = [...winnersSet]
      state.winAmount = state.pot
      state.humanWin = humanWin
      state.humanNet = humanWin - players[0].committed
      state.phase = 'over'
      const names = state.winnerIdx.map(i => players[i].name).join('、')
      state.resultName = `跑马两次，${names} 获得 ${state.pot} 筹码`
      state.log = '跑马结束'
    } else {
      runoutAll()
      showdown()
    }
  }

  const snapshot = () => ({
    phase: state.phase,
    street: state.street,
    community: state.community,
    pot: state.pot,
    currentBet: state.currentBet,
    actIdx: state.actIdx,
    winnerIdx: state.winnerIdx,
    winAmount: state.winAmount,
    humanWin: state.humanWin,
    humanNet: state.humanNet,
    waitingHuman: state.waitingHuman,
    pendingRunTwice: state.pendingRunTwice,
    runCount: state.runCount,
    resultName: state.resultName,
    log: state.log,
    players: players.map(p => ({
      i: p.i,
      isHuman: p.isHuman,
      name: p.name,
      hole: p.hole.map(c => ({ ...c })),
      stack: p.stack,
      committed: p.committed,
      streetBet: p.streetBet,
      folded: p.folded,
      allIn: p.allIn,
      acted: p.acted,
      revealed: p.revealed
    }))
  })

  return {
    startHand,
    step,
    humanAction,
    chooseRun,
    snapshot
  }
}

function labelOf(action) {
  return {
    fold: '弃牌',
    check: '过牌',
    call: '跟注',
    allin: '全下',
    raise: '加注'
  }[action] || action
}

function cmpBest(a, b) {
  if (a.type !== b.type) return a.type - b.type
  for (let i = 0; i < Math.max(a.key.length, b.key.length); i++) {
    const x = a.key[i] == null ? 0 : a.key[i]
    const y = b.key[i] == null ? 0 : b.key[i]
    if (x !== y) return x - y
  }
  return 0
}

// 供组件渲染牌型名
export function bestName(hole, community, isTexas) {
  if (isTexas) {
    const h = evalSeven([...hole, ...community])
    return h ? h.name : ''
  }
  const h = evalThree(hole)
  return h ? h.name : ''
}
