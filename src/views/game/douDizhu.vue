<template>
  <div class="game-container dd-game">
    <div class="game-title">斗地主</div>
    <div class="setup-bar" v-if="phase === 'setup'">
      <div class="opt-group">
        <span class="label">底分（筹码）</span>
        <el-radio-group v-model="anteIdx" class="ante-group">
          <el-radio-button v-for="(a, i) in anteList" :key="i" :value="i">{{ a }} 分</el-radio-button>
        </el-radio-group>
      </div>
      <div class="balance">持有筹码：<b>{{ chips }}</b></div>
      <el-button type="primary" @click="startGame">开始游戏</el-button>
    </div>
    <div class="table" v-if="phase !== 'setup'">
      <div class="board">
        <div class="community">
          <span class="hand-label">底牌</span>
          <div class="cards">
            <div v-for="(c, i) in bottom" :key="i" class="card" :class="suitClass(c.suit)">{{ cardText(c) }}</div>
          </div>
        </div>
        <div class="pot">倍数：x{{ multiplier }} · 底分：{{ currentAnte }}</div>
        <div v-if="lastPlay" class="current-play">
          <span class="hand-label">上家出牌（{{ names[lastPlay.player] }}）</span>
          <div class="cards">
            <div v-for="(c, i) in lastPlay.cards" :key="i" class="card" :class="suitClass(c.suit)">{{ cardText(c) }}</div>
          </div>
        </div>
      </div>
      <div class="seats">
        <div
          v-for="idx in [0, 1, 2]"
          :key="idx"
          class="seat"
          :class="{ active: current === idx && (phase === 'playing' || phase === 'bidding'), win: phase === 'over' && winnerSide === side(idx) }"
        >
          <div class="seat-name" :class="{ human: idx === 0 }">{{ names[idx] }}</div>
          <div class="seat-role">{{ roleOf(idx) }}</div>
          <div class="seat-count">剩 {{ hands[idx].length }} 张</div>
          <div class="seat-status" v-if="phase === 'bidding'">{{ bidStatus[idx] }}</div>
        </div>
      </div>
    </div>
    <div class="bidding-actions" v-if="phase === 'bidding' && bidTurn === 0">
      <el-button type="primary" @click="humanBid(true)">叫地主</el-button>
      <el-button @click="humanBid(false)">不叫</el-button>
    </div>
    <div class="human-hand" v-if="(phase === 'playing' || phase === 'bidding') && !humanEmpty">
      <div class="cards hand-cards">
        <div
          v-for="c in hands[0]"
          :key="c.id"
          class="card"
          :class="[suitClass(c.suit), { sel: selected.has(c.id) }]"
          @click="toggleSelect(c.id)"
        >
          {{ cardText(c) }}
        </div>
      </div>
    </div>
    <div class="actions" v-if="phase === 'playing' && current === 0 && !humanEmpty">
      <el-button type="primary" :disabled="!humanCanPlay" @click="humanPlay">出牌</el-button>
      <el-button v-if="!humanLeading" @click="humanPass">不出</el-button>
    </div>
    <div class="result" v-if="phase === 'over'">
      <p class="result-msg">{{ resultMsg }}</p>
      <p class="result-net">{{ netMsg }}</p>
      <el-button type="primary" @click="startGame">再来一局</el-button>
    </div>
    <div class="log">{{ log }}</div>
  </div>
</template>

<script setup>
  import { ref, computed, defineEmits, onMounted } from 'vue'
  import { useMainStore } from '@/plugins/store'
  import { mkWareDeck, shuffle, evaluate, canBeat, aiPlay, cardText, RANK_TEXT } from './douDizhu'

  const store = useMainStore()
  const player = ref(store.player)
  const emit = defineEmits(['game-result'])

  const ANTE_LIST = [10, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000, 300000, 500000, 1000000, 2000000, 3000000, 4000000, 5000000]
  const names = ['你', '玩家1', '玩家2']

  const phase = ref('setup')
  const anteIdx = ref(0)
  const hands = ref([[], [], []])
  const bottom = ref([])
  const landlord = ref(-1)
  const current = ref(0)
  const lastPlay = ref(null)
  const lastPlayer = ref(0)
  const passes = ref(0)
  const selected = ref(new Set())
  const multiplier = ref(1)
  const bidTurn = ref(0)
  const bidStatus = ref(['', '', ''])
  const landlordPlayCount = ref(0)
  const farmerPlayed = ref(false)
  const winnerSide = ref('')
  const resultMsg = ref('')
  const netMsg = ref('')
  const log = ref('')

  const chips = computed(() => player.value.props.chips)
  const anteList = computed(() => ANTE_LIST)
  const currentAnte = computed(() => ANTE_LIST[anteIdx.value])
  const humanEmpty = computed(() => hands.value[0].length === 0)
  const humanLeading = computed(() => !lastPlay.value || lastPlay.value.player === 0)
  const humanCanPlay = computed(() => {
    const sel = currentSelection()
    if (!sel.length) return false
    const ev = evaluate(sel)
    if (!ev) return false
    if (!lastPlay.value || lastPlay.value.player === 0) return true
    return canBeat(ev, lastPlay.value.combo)
  })

  const suitClass = suit => (suit === '♥' || suit === '♦' ? 'red' : suit === 'joker' ? 'joker' : 'black')

  const roleOf = idx => {
    if (landlord.value === -1) return ''
    if (landlord.value === idx) return '地主'
    return '农民'
  }
  const side = idx => (idx === landlord.value ? 'landlord' : 'farmer')

  const currentSelection = () => {
    return hands.value[0].filter(c => selected.value.has(c.id))
  }

  const toggleSelect = id => {
    const s = new Set(selected.value)
    if (s.has(id)) s.delete(id)
    else s.add(id)
    selected.value = s
  }

  const startGame = () => {
    if (chips.value < currentAnte.value) {
      log.value = '玩家筹码不足，请先兑换筹码'
      return
    }
    dealNew()
    phase.value = 'bidding'
    bidTurn.value = 0
    bidStatus.value = ['', '', '']
    landlord.value = -1
    multiplier.value = 1
    selected.value = new Set()
    resultMsg.value = ''
    netMsg.value = ''
    log.value = '叫地主阶段：你先叫'
  }

  const dealNew = () => {
    const deck = shuffle(mkWareDeck())
    hands.value = [[], [], []]
    for (let i = 0; i < 17; i++) {
      for (let p = 0; p < 3; p++) hands.value[p].push(deck.pop())
    }
    bottom.value = deck.slice(0, 3)
    hands.value.forEach(h => h.sort((a, b) => b.rank - a.rank))
    landlordPlayCount.value = 0
    farmerPlayed.value = false
    passes.value = 0
    lastPlay.value = null
    lastPlayer.value = 0
    current.value = 0
  }

  const humanBid = call => {
    if (bidTurn.value !== 0) return
    bidStatus.value[0] = call ? '叫地主' : '不叫'
    if (call) {
      setLandlord(0)
      return
    }
    bidTurn.value = 1
    aiBid(1)
  }

  const aiBid = idx => {
    const call = aiWantsLandlord(hands.value[idx])
    bidStatus.value[idx] = call ? '叫地主' : '不叫'
    if (call) {
      setLandlord(idx)
      return
    }
    if (idx === 1) {
      bidTurn.value = 2
      aiBid(2)
    } else {
      // 三家都不叫 -> 重发
      log.value = '三家都不叫，重新发牌'
      dealNew()
      bidTurn.value = 0
      bidStatus.value = ['', '', '']
    }
  }

  const aiWantsLandlord = hand => {
    let score = 0
    const cnt = {}
    hand.forEach(c => (cnt[c.rank] = (cnt[c.rank] || 0) + 1))
    if (cnt[16] && cnt[17]) score += 5
    if (cnt[15]) score += cnt[15] * 1.5
    if (cnt[14]) score += cnt[14] * 0.8
    let bombs = 0
    for (const rk in cnt) if (cnt[rk] === 4) bombs++
    score += bombs * 2
    return score >= 4 || Math.random() < 0.3
  }

  const setLandlord = idx => {
    landlord.value = idx
    // 底牌归地主
    hands.value[idx].push(...bottom.value)
    hands.value[idx].sort((a, b) => b.rank - a.rank)
    phase.value = 'playing'
    current.value = idx
    lastPlay.value = null
    passes.value = 0
    lastPlayer.value = idx
    multiplier.value = 1
    selected.value = new Set()
    log.value = `${names[idx]} 成为地主`
    processAIs()
  }

  const processAIs = () => {
    while (phase.value === 'playing' && current.value !== 0) {
      const idx = current.value
      const play = aiPlay(hands.value[idx], lastPlay.value && lastPlay.value.player !== idx ? lastPlay.value.combo : null)
      if (play && play.length) {
        applyPlay(idx, play)
      } else {
        applyPass(idx)
      }
      if (phase.value === 'over') break
    }
  }

  const applyPlay = (idx, cards) => {
    const ev = evaluate(cards)
    hands.value[idx] = hands.value[idx].filter(c => !cards.some(k => k.id === c.id))
    lastPlay.value = { cards, player: idx, combo: ev }
    lastPlayer.value = idx
    passes.value = 0
    if (ev.type === 'bomb' || ev.type === 'rocket') multiplier.value *= 2
    if (idx === landlord.value) landlordPlayCount.value++
    if (idx !== landlord.value) farmerPlayed.value = true
    log.value = `${names[idx]} 出 ${ev.name}`
    if (hands.value[idx].length === 0) {
      endGame(idx)
      return
    }
    current.value = (idx + 1) % 3
  }

  const applyPass = idx => {
    passes.value++
    log.value = `${names[idx]} 不出`
    if (passes.value >= 2) {
      current.value = lastPlayer.value
      lastPlay.value = null
      passes.value = 0
    } else {
      current.value = (idx + 1) % 3
    }
  }

  const humanPlay = () => {
    const sel = currentSelection()
    if (!sel.length) return
    const ev = evaluate(sel)
    if (!ev) {
      log.value = '不是合法牌型'
      return
    }
    if (lastPlay.value && lastPlay.value.player !== 0 && !canBeat(ev, lastPlay.value.combo)) {
      log.value = '压不过上家的牌'
      return
    }
    selected.value = new Set()
    applyPlay(0, sel)
    processAIs()
  }

  const humanPass = () => {
    if (humanLeading.value) return
    selected.value = new Set()
    applyPass(0)
    processAIs()
  }

  const endGame = winnerIdx => {
    phase.value = 'over'
    const wl = winnerIdx === landlord.value
    winnerSide.value = wl ? 'landlord' : 'farmer'
    // 春天 / 反春
    let mult = multiplier.value
    const farmersEmpty = hands.value.filter((_, i) => i !== landlord.value).every(h => h.length === 0)
    if (wl && !farmersEmpty && !farmerPlayed.value) {
      mult *= 2
      resultMsg.value = '地主春天！'
    } else if (!wl && landlordPlayCount.value === 1) {
      mult *= 2
      resultMsg.value = '农民反春！'
    }
    const base = currentAnte.value
    const stake = base * mult
    // 结算人类
    const humanRole = side(0)
    let net = 0
    if (wl) {
      // 地主赢：地主 +2 底分，农民各 -底分
      net = humanRole === 'landlord' ? 2 * stake : -stake
    } else {
      // 农民赢
      net = humanRole === 'landlord' ? -2 * stake : stake
    }
    const lose = Math.min(Math.abs(net), chips.value)
    const reward = net >= 0 ? net : lose
    resultMsg.value = resultMsg.value || (wl ? '地主胜！' : '农民胜！')
    netMsg.value = net >= 0 ? `你赢 ${net} 筹码` : `你输 ${lose} 筹码`
    emit('game-result', { success: net >= 0, reward, currency: 'chips' })
  }

  onMounted(() => {
    // 初始已到 setup
  })
</script>

<style scoped>
  .game-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 18px;
    width: 100%;
    max-width: 1080px;
    padding: 16px 12px;
  }

  .game-title {
    font-size: 24px;
    font-weight: bold;
  }

  .setup-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    justify-content: center;
    align-items: center;
  }

  .opt-group {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .label {
    color: #909399;
    font-size: 15px;
  }
  .ante-group { flex-wrap: wrap; gap: 4px; }

  .balance {
    color: #606266;
    font-size: 15px;
  }

  .table {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 18px;
    width: 100%;
    max-width: 1040px;
    min-height: 420px;
    padding: 28px 20px;
    border-radius: 24px;
    background:
      radial-gradient(ellipse at 50% 42%, rgba(255, 255, 255, 0.10), transparent 46%),
      linear-gradient(135deg, #2f8b57, #1b5e3a 60%, #124d2f);
    box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.06), 0 10px 30px rgba(0, 0, 0, 0.18);
  }

  .board {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }

  .community,
  .current-play {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
  }

  .hand-label {
    color: #fff;
    font-size: 15px;
  }

  .cards {
    display: flex;
    gap: 6px;
  }

  .card {
    width: 48px;
    height: 68px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    font-weight: bold;
    background: #fff;
    box-shadow: 0 3px 8px rgba(0, 0, 0, 0.28);
    cursor: default;
  }

  .card.red {
    color: #c0392b;
  }

  .card.black {
    color: #2c3e50;
  }

  .card.joker {
    color: #8e44ad;
  }

  .pot {
    color: #ffe082;
    font-size: 18px;
    font-weight: bold;
  }

  .seats {
    display: flex;
    gap: 20px;
    justify-content: center;
  }

  .seat {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 12px 18px;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.12);
    min-width: 132px;
  }

  .seat.active {
    box-shadow: 0 0 0 2px #ffe082, 0 4px 14px rgba(0, 0, 0, 0.25);
    background: rgba(255, 255, 255, 0.18);
  }

  .seat.win {
    box-shadow: 0 0 0 2px #ff5252, 0 4px 14px rgba(0, 0, 0, 0.25);
  }

  .seat-name {
    color: #fff;
    font-size: 15px;
    font-weight: bold;
  }

  .seat-name.human {
    color: #ffe082;
  }

  .seat-role,
  .seat-count {
    color: #fff;
    font-size: 13px;
  }

  .seat-status {
    color: #ffd54f;
    font-size: 14px;
  }

  .human-hand {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    max-width: 1040px;
    gap: 0;
  }

  .hand-cards .card {
    cursor: pointer;
    transition: transform 0.15s;
    border: 1px solid rgba(0, 0, 0, 0.05);
    width: 64px;
    height: 90px;
    font-size: 22px;
  }

  /* 手牌扇形叠放 */
  .hand-cards .card + .card {
    margin-left: -16px;
  }

  .hand-cards .card.sel {
    transform: translateY(-12px);
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.35);
    outline: 2px solid #ffe082;
  }

  .actions {
    display: flex;
    gap: 8px;
    justify-content: center;
  }

  .result {
    text-align: center;
    color: #67c23a;
  }

  .result-msg {
    font-weight: bold;
  }

  .result-net {
    color: #e6a23c;
  }

  .log {
    color: #909399;
    min-height: 20px;
    font-size: 14px;
  }

  @media only screen and (max-width: 900px) {
    .table { min-height: 0; padding: 18px 12px; border-radius: 16px; }
    .card { width: 42px; height: 60px; font-size: 14px; }
    .hand-cards .card { width: 54px; height: 76px; font-size: 19px; }
    .human-hand { max-width: 100%; }
    .hand-cards .card + .card { margin-left: -12px; }
    .seat { min-width: 112px; padding: 10px 12px; }
    .game-title { font-size: 20px; }
  }

  @media only screen and (max-width: 560px) {
    .card { width: 38px; height: 54px; font-size: 13px; }
    .hand-cards .card { width: 46px; height: 66px; font-size: 16px; }
    .hand-cards .card + .card { margin-left: -10px; }
    .seat { min-width: 88px; padding: 8px 8px; }
    .seat-name { font-size: 13px; }
    .pot { font-size: 15px; }
    .seats { gap: 12px; }
  }
</style>
