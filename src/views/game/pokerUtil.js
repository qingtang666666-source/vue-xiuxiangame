// 纸牌公共工具：52 张牌、牌型评估（炸金花三张 / 德州 7 选 5）

export const SUITS = ['♠', '♥', '♣', '♦']
export const RANK = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] // 11=J 12=Q 13=K 14=A
export const RANK_NAME = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' }

export const cardName = c => `${RANK_NAME[c.rank] || c.rank}${c.suit}`
export const handName = list => list.map(cardName).join(' ')

export const mkDeck = () => {
  const d = []
  SUITS.forEach(s => RANK.forEach(r => d.push({ suit: s, rank: r })))
  return d
}

export const shuffle = deck => {
  const cryptoObj = globalThis.crypto
  for (let i = deck.length - 1; i > 0; i--) {
    // 使用加密安全随机数，保证洗牌真正均匀、无法预测
    const r = cryptoObj && cryptoObj.getRandomValues ? cryptoObj.getRandomValues(new Uint32Array(1))[0] / 4294967296 : Math.random()
    const j = Math.floor(r * (i + 1))
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }
  return deck
}

const counts = ranks => {
  const m = {}
  ranks.forEach(r => { m[r] = (m[r] || 0) + 1 })
  return m
}

const isStraightRanks = ranks => {
  const s = [...ranks].sort((a, b) => a - b)
  // 含 A 的轮子：A,2,3,4,5
  const uniq = [...new Set(s)]
  if (uniq.length !== 5) return null
  if (s[4] - s[0] === 4) return { high: s[4] }
  if (uniq.includes(14) && uniq.includes(2) && uniq.includes(3) && uniq.includes(4) && uniq.includes(5)) return { high: 5 }
  return null
}

// 5 张牌型：返回 {type, name, key}
const eval5 = cards => {
  const ranks = cards.map(c => c.rank).sort((a, b) => b - a)
  const cnt = counts(ranks)
  const uniq = Object.keys(cnt).map(Number).sort((a, b) => b - a)
  const flush = cards.every(c => c.suit === cards[0].suit)
  const straight = isStraightRanks(ranks)
  const groups = Object.entries(cnt).map(([r, n]) => [Number(r), n]).sort((a, b) => b[1] - a[1] || b[0] - a[0])
  if (flush && straight) return { type: 8, name: '同花顺', key: [8, straight.high] }
  if (groups[0][1] === 4) return { type: 7, name: '四条', key: [7, groups[0][0], groups[1][0]] }
  if (groups[0][1] === 3 && groups[1][1] === 2) return { type: 6, name: '葫芦', key: [6, groups[0][0], groups[1][0]] }
  if (flush) return { type: 5, name: '同花', key: [5, ...ranks] }
  if (straight) return { type: 4, name: '顺子', key: [4, straight.high] }
  if (groups[0][1] === 3) return { type: 3, name: '三条', key: [3, groups[0][0], ...groups.slice(1).map(g => g[0])] }
  if (groups[0][1] === 2 && groups[1][1] === 2) return { type: 2, name: '两对', key: [2, groups[0][0], groups[1][0], groups[2][0]] }
  if (groups[0][1] === 2) return { type: 1, name: '一对', key: [1, groups[0][0], ...groups.slice(1).map(g => g[0])] }
  return { type: 0, name: '高牌', key: [0, ...ranks] }
}

// 7 张选最优 5 张
export const evalSeven = cards => {
  let best = null
  for (let a = 0; a < cards.length; a++)
    for (let b = a + 1; b < cards.length; b++)
      for (let c = b + 1; c < cards.length; c++)
        for (let d = c + 1; d < cards.length; d++)
          for (let e = d + 1; e < cards.length; e++) {
            const hand = [cards[a], cards[b], cards[c], cards[d], cards[e]]
            const ev = eval5(hand)
            if (!best || cmpKey(ev.key, best.key) > 0) best = { ...ev, cards: hand }
          }
  return best
}

export const cmpKey = (a, b) => {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] == null ? 0 : a[i]
    const y = b[i] == null ? 0 : b[i]
    if (x !== y) return x - y
  }
  return 0
}

// 炸金花 3 张：豹子>同花顺>金花>顺子>对子>散牌
const isStraight3 = ranges => {
  const s = [...ranges].sort((a, b) => a - b)
  // 三张必须互异才是顺子；对子(533)不能当成顺子
  if (s[0] === s[1] || s[1] === s[2]) return null
  if (s[2] - s[0] === 2) return { high: s[2] }
  if (s.includes(14) && s.includes(2) && s.includes(3)) return { high: 3 }
  return null
}

export const evalThree = cards => {
  const ranks = cards.map(c => c.rank).sort((a, b) => b - a)
  const cnt = counts(ranks)
  const uniq = Object.keys(cnt).map(Number)
  const flush = cards.every(c => c.suit === cards[0].suit)
  const straight = isStraight3(ranks)
  if (uniq.length === 1) return { type: 6, name: '豹子', key: [6, ranks[0]] }
  if (flush && straight) return { type: 5, name: '同花顺', key: [5, straight.high] }
  if (flush) return { type: 4, name: '金花', key: [4, ...ranks] }
  if (straight) return { type: 3, name: '顺子', key: [3, straight.high] }
  if (uniq.length === 2) {
    const pair = uniq.filter(r => cnt[r] === 2)[0]
    const kick = uniq.filter(r => cnt[r] === 1)[0]
    return { type: 2, name: '对子', key: [2, pair, kick] }
  }
  return { type: 1, name: '散牌', key: [1, ...ranks] }
}
