// 斗地主：牌型判定、大小比较、AI 出牌
// rank: 3..14(A), 15(2), 16(小王), 17(大王)

export const mkWareDeck = () => {
  const suits = ['♠', '♥', '♣', '♦']
  const cards = []
  let id = 0
  for (let r = 3; r <= 15; r++) {
    for (const s of suits) cards.push({ id: id++, rank: r, suit: s })
  }
  cards.push({ id: id++, rank: 16, suit: 'joker' })
  cards.push({ id: id++, rank: 17, suit: 'joker' })
  return cards
}

export const shuffle = arr => {
  const cryptoObj = globalThis.crypto
  for (let i = arr.length - 1; i > 0; i--) {
    const r = cryptoObj && cryptoObj.getRandomValues ? cryptoObj.getRandomValues(new Uint32Array(1))[0] / 4294967296 : Math.random()
    const j = Math.floor(r * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export const RANK_TEXT = r =>
  r <= 10 ? String(r) : r === 11 ? 'J' : r === 12 ? 'Q' : r === 13 ? 'K' : r === 14 ? 'A' : r === 15 ? '2' : r === 16 ? '小王' : '大王'

export const cardText = c => `${RANK_TEXT(c.rank)}${c.suit === 'joker' ? '' : c.suit}`

const group = cards => {
  const g = new Map()
  cards.forEach(c => {
    if (!g.has(c.rank)) g.set(c.rank, [])
    g.get(c.rank).push(c)
  })
  return g
}

const consecutive = ranks => ranks[ranks.length - 1] - ranks[0] === ranks.length - 1 && ranks.length >= 1

const ranksOf = m => [...m.keys()].sort((a, b) => a - b)

// 返回牌型 {type, rank, len, name} 或 null
export const evaluate = cards => {
  const n = cards.length
  if (n === 0) return null
  const cnt = {}
  cards.forEach(c => (cnt[c.rank] = (cnt[c.rank] || 0) + 1))
  const rs = Object.keys(cnt).map(Number).sort((a, b) => a - b)

  if (n === 2 && cnt[16] && cnt[17]) return { type: 'rocket', rank: 17, len: 1, name: '王炸' }
  if (n === 4 && rs.length === 1) return { type: 'bomb', rank: rs[0], len: 1, name: '炸弹' }
  if (n === 1) return { type: 'single', rank: rs[0], len: 1, name: '单张' }
  if (n === 2 && rs.length === 1) return { type: 'pair', rank: rs[0], len: 1, name: '对子' }
  if (n === 3 && rs.length === 1) return { type: 'triple', rank: rs[0], len: 1, name: '三张' }
  if (n === 4 && rs.length === 2) {
    const t = rs.find(r => cnt[r] === 3)
    if (t) return { type: 'triple1', rank: t, len: 1, name: '三带一' }
  }
  if (n === 5 && rs.length === 2) {
    const t = rs.find(r => cnt[r] === 3)
    const p = rs.find(r => cnt[r] === 2)
    if (t && p) return { type: 'triple2', rank: t, len: 1, name: '三带二' }
  }
  if (n === 6) {
    const q = rs.find(r => cnt[r] === 4)
    if (q) return { type: 'four2', rank: q, len: 1, name: '四带二' }
  }
  if (n === 8) {
    const q = rs.find(r => cnt[r] === 4)
    const pairs = rs.filter(r => cnt[r] === 2)
    if (q && pairs.length === 2) return { type: 'four22', rank: q, len: 1, name: '四带两对' }
  }
  if (n >= 5 && n <= 12 && rs.length === n && rs.every(r => r <= 14) && consecutive(rs))
    return { type: 'straight', rank: rs[rs.length - 1], len: n, name: '顺子' }
  if (n >= 6 && n % 2 === 0 && rs.length === n / 2 && n / 2 >= 3 && rs.every(r => r <= 14 && cnt[r] === 2) && consecutive(rs))
    return { type: 'doubleStraight', rank: rs[rs.length - 1], len: n / 2, name: '连对' }
  if (n >= 6 && n % 3 === 0 && rs.length === n / 3 && rs.every(r => r <= 14 && cnt[r] === 3) && consecutive(rs))
    return { type: 'airplane', rank: rs[rs.length - 1], len: n / 3, name: '飞机' }
  // 飞机带单 / 飞机带对
  const tripleRs = rs.filter(r => cnt[r] === 3 && r <= 14)
  for (let m = tripleRs.length; m >= 2; m--) {
    for (let s = 0; s + m <= tripleRs.length; s++) {
      const win = tripleRs.slice(s, s + m)
      if (!consecutive(win)) continue
      const set = new Set(win)
      const remain = cards.filter(c => !set.has(c.rank))
      if (remain.length === m) return { type: 'airplane1', rank: win[m - 1], len: m, name: '飞机带单' }
      if (remain.length === 2 * m) {
        const rc = {}
        remain.forEach(c => (rc[c.rank] = (rc[c.rank] || 0) + 1))
        if (Object.values(rc).every(v => v === 2) && Object.keys(rc).length === m)
          return { type: 'airplane2', rank: win[m - 1], len: m, name: '飞机带对' }
      }
    }
  }
  return null
}

export const canBeat = (play, target) => {
  if (!play || !target) return false
  if (play.type === 'rocket') return true
  if (target.type === 'rocket') return false
  if (play.type === 'bomb' && target.type !== 'bomb') return true
  if (target.type === 'bomb') return play.type === 'bomb' && play.rank > target.rank
  if (play.type === 'bomb') return play.rank > target.rank
  if (play.type !== target.type || play.len !== target.len) return false
  return play.rank > target.rank
}

export const jokers = hand => {
  const j = []
  hand.forEach(c => {
    if (c.rank === 16 || c.rank === 17) j.push(c)
  })
  return j
}

const hasRocket = hand => {
  let small = false
  let big = false
  hand.forEach(c => {
    if (c.rank === 16) small = true
    if (c.rank === 17) big = true
  })
  return small && big
}

// 生成能压过 target 的出牌候选（含炸弹/王炸），返回排序后的数组
export const findBeats = (hand, target) => {
  const g = group(hand)
  const rs = ranksOf(g)
  const res = []
  const addBombs = () => {
    rs.forEach(r => {
      if (g.get(r).length === 4) res.push([...g.get(r)])
    })
    if (hasRocket(hand)) res.push(jokers(hand))
  }
  if (target.type === 'rocket') return []
  if (target.type === 'bomb') {
    rs.forEach(r => {
      if (g.get(r).length === 4 && r > target.rank) res.push([...g.get(r)])
    })
    if (hasRocket(hand)) res.push(jokers(hand))
    return res
  }
  addBombs()
  const needRanks = rankCnt => {
    return rs.filter(r => (rankCnt ? g.get(r).length >= rankCnt : true))
  }
  switch (target.type) {
    case 'single':
      rs.filter(r => r > target.rank).forEach(r => res.push([g.get(r)[0]]))
      break
    case 'pair':
      rs.filter(r => g.get(r).length >= 2 && r > target.rank).forEach(r => res.push(g.get(r).slice(0, 2)))
      break
    case 'triple':
      rs.filter(r => g.get(r).length >= 3 && r > target.rank).forEach(r => res.push(g.get(r).slice(0, 3)))
      break
    case 'triple1':
      rs.forEach(r => {
        if (g.get(r).length >= 3 && r > target.rank) {
          rs.forEach(w => {
            if (w !== r) res.push([...g.get(r).slice(0, 3), g.get(w)[0]])
          })
        }
      })
      break
    case 'triple2':
      rs.forEach(r => {
        if (g.get(r).length >= 3 && r > target.rank) {
          rs.forEach(w => {
            if (w !== r && g.get(w).length >= 2) res.push([...g.get(r).slice(0, 3), ...g.get(w).slice(0, 2)])
          })
        }
      })
      break
    case 'straight': {
      const len = target.len
      for (let s = 3; s + len - 1 <= 14; s++) {
        let ok = true
        const arr = []
        for (let r = s; r < s + len; r++) {
          if (!g.has(r) || g.get(r).length < 1) {
            ok = false
            break
          }
          arr.push(g.get(r)[0])
        }
        if (ok && s + len - 1 > target.rank) res.push(arr)
      }
      break
    }
    case 'doubleStraight': {
      const pc = target.len
      for (let s = 3; s + pc - 1 <= 14; s++) {
        let ok = true
        const arr = []
        for (let r = s; r < s + pc; r++) {
          if (!g.has(r) || g.get(r).length < 2) {
            ok = false
            break
          }
          arr.push(...g.get(r).slice(0, 2))
        }
        if (ok && s + pc - 1 > target.rank) res.push(arr)
      }
      break
    }
    case 'airplane': {
      const tc = target.len
      for (let s = 3; s + tc - 1 <= 14; s++) {
        let ok = true
        const arr = []
        for (let r = s; r < s + tc; r++) {
          if (!g.has(r) || g.get(r).length < 3) {
            ok = false
            break
          }
          arr.push(...g.get(r).slice(0, 3))
        }
        if (ok && s + tc - 1 > target.rank) res.push(arr)
      }
      break
    }
    default:
      // airplane1 / airplane2 / four2 / four22：AI 仅用炸弹/王炸应对
      break
  }
  // 去重（按卡 id 排序后字符串）
  const seen = new Set()
  const out = []
  res.forEach(cards => {
    if (!cards || cards.length === 0) return
    const key = cards.map(c => c.id).join(',')
    if (seen.has(key)) return
    seen.add(key)
    const ev = evaluate(cards)
    if (ev && canBeat(ev, target)) out.push(cards)
  })
  out.sort((a, b) => comboPriority(evaluate(a)) - comboPriority(evaluate(b)) || evaluate(a).rank - evaluate(b).rank)
  return out
}

// 找出 rank 3..14 连续、每组 need 张、至少 minGroups 组的最大组合
function longestRun(g, need, minGroups) {
  let best = null
  for (let s = 3; s <= 14; s++) {
    const arr = []
    for (let r = s; r <= 14; r++) {
      if (!g.has(r) || g.get(r).length < need) break
      for (let k = 0; k < need; k++) arr.push(g.get(r)[k])
    }
    const groups = Math.floor(arr.length / need)
    if (groups >= minGroups && (best === null || arr.length > best.length)) best = arr.slice()
  }
  return best
}

// AI 领出：优先甩顺子/连对/飞机，其次小牌三带，再出小单，保留大牌与炸弹
export const aiLead = hand => {
  const sorted = [...hand].sort((a, b) => a.rank - b.rank)
  const g = group(hand)
  const rs = ranksOf(g)
  const straight = longestRun(g, 1, 5)
  if (straight) return straight
  const double = longestRun(g, 2, 3)
  if (double) return double
  const plane = longestRun(g, 3, 2)
  if (plane) return plane
  // 三张/翅膀可含 A(14)、2(15)，避免 AI 埋没大牌型三带
  const tri = rs.find(r => g.get(r).length >= 3 && r >= 3 && r <= 15)
  if (tri) {
    const wings = rs.find(r => g.get(r).length >= 2 && r !== tri && r >= 3 && r <= 15)
    if (wings) return [...g.get(tri).slice(0, 3), ...g.get(wings).slice(0, 2)]
    const s1 = rs.find(r => g.get(r).length >= 1 && r !== tri && r <= 15)
    if (s1) return [...g.get(tri).slice(0, 3), g.get(s1)[0]]
  }
  for (const r of rs) {
    if (g.get(r).length >= 4) continue
    if (r === 15 || r === 16 || r === 17) continue
    return [g.get(r)[0]]
  }
  return [sorted[0]]
}

export const aiPlay = (hand, target) => {
  if (target) {
    const beats = findBeats(hand, target)
    if (!beats.length) return null
    const nonBomb = beats.filter(b => {
      const e = evaluate(b)
      return e && e.type !== 'bomb' && e.type !== 'rocket'
    })
    // 优先用最小普通牌压，避免轻易拆炸
    if (nonBomb.length) return nonBomb[0]
    // 只有炸弹/王炸能压：牌多时省一手，牌少或对手贴地时果断炸
    if (hand.length > 8 && Math.random() < 0.6) return null
    return beats[0]
  }
  return aiLead(hand)
}

function comboPriority(ev) {
  if (!ev) return 99
  return ev.type === 'rocket' ? 3 : ev.type === 'bomb' ? 2 : 1
}
