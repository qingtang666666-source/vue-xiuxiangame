<template>
  <div class="game-container poker-game">
    <div class="game-title">炸金花</div>
    <div class="setup-bar">
      <div class="opt-group">
        <span class="label">模式</span>
        <el-radio-group v-model="mode" :disabled="inPlay">
          <el-radio-button value="solo">单挑</el-radio-button>
          <el-radio-button value="four">四人</el-radio-button>
          <el-radio-button value="six">六人</el-radio-button>
        </el-radio-group>
      </div>
      <div class="opt-group ante-group">
        <span class="label">底注（筹码）</span>
        <el-radio-group v-model="anteIdx" :disabled="inPlay" class="ante-group">
          <el-radio-button v-for="(a, i) in anteList" :key="i" :value="i">{{ a }} · 上限 {{ potCapOf(a) }}</el-radio-button>
        </el-radio-group>
      </div>
    </div>
    <div class="balance-row">
      <span>玩家筹码：<b>{{ chips }}</b></span>
      <span>当前底注：{{ currentAnte }}</span>
      <span>封顶：{{ potCapOf(currentAnte) }}</span>
    </div>
    <div class="table" v-if="state.phase !== 'idle'">
      <div class="players-row">
        <div
          v-for="p in state.players"
          :key="p.i"
          class="seat"
          :class="{ active: state.actIdx === p.i && state.phase === 'betting', fold: p.folded }"
        >
          <div class="seat-name" :class="{ human: p.isHuman }">{{ p.name }}</div>
          <div class="cards">
            <div
              v-for="(c, i) in p.hole"
              :key="i"
              class="card"
              :class="[showable(p) ? suitClass(c.suit) : 'back']"
            >
              {{ showable(p) ? cardName(c) : '' }}
            </div>
          </div>
          <div class="seat-hand" v-if="showable(p)">{{ bestName(p.hole, [], false) }}</div>
          <div class="seat-comm" v-if="!p.folded">
            <span>注 {{ p.committed }}</span>
            <span>剩 {{ p.stack }}</span>
          </div>
          <div class="seat-status" v-if="p.folded">弃牌</div>
          <div class="seat-status" v-else-if="p.allIn">全下</div>
        </div>
      </div>
      <div class="pot">彩池：{{ state.pot }} 筹码</div>
    </div>
    <div class="actions" v-if="state.phase === 'idle'">
      <el-button type="primary" @click="startRound">开始对局</el-button>
    </div>
    <div class="actions" v-else-if="state.phase === 'betting' && state.waitingHuman && humanActable">
      <el-button @click="lookCards" :disabled="humanSeen">看牌</el-button>
      <el-button @click="act('call')">{{ humanToCall > 0 ? '跟注' : '过牌' }}</el-button>
      <el-button @click="act('raise')">加注</el-button>
      <el-button type="danger" @click="act('fold')">弃牌</el-button>
      <el-button type="warning" @click="act('allin')">全下</el-button>
    </div>
    <div class="result" v-if="state.phase === 'over'">
      <p class="result-msg">{{ state.resultName }}</p>
      <p class="result-net" v-if="state.humanNet !== 0">
        {{ state.humanNet > 0 ? '你赢 ' + state.humanNet : '你输 ' + -state.humanNet }} 筹码
      </p>
      <el-button type="primary" @click="startRound">再来一局</el-button>
      <el-button @click="resetToIdle">换个模式</el-button>
    </div>
    <div class="log">{{ state.log }}</div>
  </div>
</template>

<script setup>
  import { ref, computed, defineEmits, watch } from 'vue'
  import { useMainStore } from '@/plugins/store'
  import { createPokerEngine, bestName } from './pokerEngine'
  import { cardName, evalThree } from './pokerUtil'

  const store = useMainStore()
  const player = ref(store.player)
  const emit = defineEmits(['game-result'])

  const MODES = { solo: 2, four: 4, six: 6 }
  const ANTE_LIST = [10, 50, 100, 200, 300, 500, 800, 1200, 2000, 3000, 5000, 10000, 200000, 300000, 500000, 1000000, 2000000, 3000000, 4000000, 5000000]

  const mode = ref('solo')
  const anteIdx = ref(0)
  const humanSeen = ref(false)
  const settled = ref(false)
  let engine = null
  const state = ref(null)

  const chips = computed(() => player.value.props.chips)
  const anteList = computed(() => ANTE_LIST)
  const currentAnte = computed(() => ANTE_LIST[anteIdx.value])
  const playerCount = computed(() => MODES[mode.value])

  const potCapOf = ante => ante * (6 + playerCount.value * 2)

  const inPlay = computed(() => state.value && state.value.phase === 'betting')

  const human = computed(() => (state.value ? state.value.players[0] : null))
  const humanActable = computed(() => human.value && !human.value.folded && !human.value.allIn)
  const humanToCall = computed(() => (human.value && state.value ? state.value.currentBet - human.value.streetBet : 0))

  const suitClass = suit => (suit === '♥' || suit === '♦' ? 'red' : 'black')
  const showable = p => p.revealed || (p.isHuman && humanSeen.value)

  const refresh = () => {
    if (engine) state.value = engine.snapshot()
  }

  const startRound = () => {
    if (chips.value < currentAnte.value) {
      state.value = { ...emptyState(), log: '玩家筹码不足，请先兑换筹码' }
      settled.value = true
      return
    }
    humanSeen.value = false
    settled.value = false
    engine = createPokerEngine({
      playerCount: playerCount.value,
      ante: currentAnte.value,
      potCap: potCapOf(currentAnte.value),
      isTexas: false,
      communityPerStreet: [],
      holeCards: 3,
      // 买入 = 底池封顶 ÷ 当前人数：全下后对手仍有空间补出同等筹码，避免“全下立刻开牌”
      chipsPerPlayer: Math.min(chips.value, Math.max(currentAnte.value, Math.floor(potCapOf(currentAnte.value) / playerCount.value))),
      maxType: 6,
      evalBest: hole => evalThreeSafe(hole),
      makeName: i => (i === 0 ? '你' : '玩家' + i)
    })
    engine.startHand()
    state.value = engine.snapshot()
    engine.step()
    refresh()
    settleIfOver()
  }

  const lookCards = () => {
    humanSeen.value = true
  }

  const act = action => {
    if (!engine) return
    engine.humanAction(action)
    refresh()
    settleIfOver()
  }

  const resetToIdle = () => {
    engine = null
    humanSeen.value = false
    settled.value = false
    state.value = emptyState()
  }

  const settleIfOver = () => {
    if (state.value && state.value.phase === 'over' && !settled.value) {
      settled.value = true
      const net = state.value.humanNet
      emit('game-result', { success: net >= 0, reward: Math.abs(net), currency: 'chips' })
    }
  }

  watch(state, () => settleIfOver())

  const emptyState = () => ({
    phase: 'idle',
    community: [],
    pot: 0,
    currentBet: 0,
    winnerIdx: [],
    humanNet: 0,
    resultName: '',
    log: '',
    players: []
  })

  const evalThreeSafe = hole => {
    const m = { type: 0, name: '', key: [] }
    try {
      return evalThree(hole)
    } catch (e) {
      return m
    }
  }

  state.value = emptyState()
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

  .balance-row {
    display: flex;
    gap: 22px;
    font-size: 15px;
    color: #606266;
  }

  .table {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
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

  .players-row {
    display: flex;
    flex-wrap: wrap;
    gap: 22px;
    justify-content: center;
  }

  .seat {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 14px 16px;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.10);
    min-width: 150px;
    transition: box-shadow 0.2s, background 0.2s;
  }

  .seat.active {
    box-shadow: 0 0 0 2px #ffe082, 0 4px 14px rgba(0, 0, 0, 0.25);
    background: rgba(255, 255, 255, 0.16);
  }

  .seat.fold {
    opacity: 0.5;
  }

  .seat-name {
    color: #fff;
    font-size: 15px;
    font-weight: bold;
  }

  .seat-name.human {
    color: #ffe082;
  }

  .cards {
    display: flex;
    gap: 6px;
  }

  .card {
    width: 56px;
    height: 78px;
    border-radius: 9px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    font-weight: bold;
    background: #fff;
    box-shadow: 0 3px 8px rgba(0, 0, 0, 0.28);
  }

  .card.red {
    color: #c0392b;
  }

  .card.black {
    color: #2c3e50;
  }

  .card.back {
    background: linear-gradient(135deg, #b71c1c, #880e4f);
    color: transparent;
  }

  .seat-hand {
    color: #ffe082;
    font-size: 14px;
    min-height: 18px;
  }

  .seat-comm {
    color: #fff;
    font-size: 13px;
    display: flex;
    flex-direction: column;
  }

  .seat-status {
    color: #ffd54f;
    font-size: 14px;
    font-weight: bold;
  }

  .pot {
    color: #fff;
    font-size: 20px;
    font-weight: bold;
  }

  .actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
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
    .card { width: 46px; height: 64px; font-size: 15px; }
    .seat { min-width: 116px; padding: 10px 12px; }
    .players-row { gap: 14px; }
    .game-title { font-size: 20px; }
  }

  @media only screen and (max-width: 560px) {
    .card { width: 40px; height: 56px; font-size: 13px; }
    .seat { min-width: 88px; padding: 8px 8px; }
    .seat-name { font-size: 13px; }
    .pot { font-size: 17px; }
  }
</style>
