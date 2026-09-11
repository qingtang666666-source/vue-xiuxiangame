<template>
  <div class="game-container poker-game">
    <div class="game-title">德州扑克</div>
    <div class="setup-bar">
      <div class="opt-group">
        <span class="label">模式</span>
        <el-radio-group v-model="mode" :disabled="inPlay">
          <el-radio-button value="solo">单挑</el-radio-button>
          <el-radio-button value="four">四人</el-radio-button>
          <el-radio-button value="six">六人</el-radio-button>
          <el-radio-button value="nine">九人</el-radio-button>
        </el-radio-group>
      </div>
      <div class="opt-group">
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
          <div class="seat-hand" v-if="showable(p)">{{ p.isHuman ? humanBestName : aiBestName(p) }}</div>
          <div class="seat-comm" v-if="!p.folded">
            <span>注 {{ p.committed }}</span>
            <span>剩 {{ p.stack }}</span>
          </div>
          <div class="seat-status" v-if="p.folded">弃牌</div>
          <div class="seat-status" v-else-if="p.allIn">全下</div>
        </div>
      </div>
      <div class="community">
        <div class="hand-label">公共牌</div>
        <div class="cards">
          <div v-for="(c, i) in state.community" :key="i" class="card" :class="suitClass(c.suit)">
            {{ cardName(c) }}
          </div>
        </div>
      </div>
      <div class="pot">底池：{{ state.pot }} 筹码</div>
    </div>
    <div class="runchoice" v-if="state.phase === 'runchoice'">
      <p>翻前全下，是否跑马？</p>
      <el-button type="primary" @click="chooseRun(1)">发一次</el-button>
      <el-button @click="chooseRun(2)">发两次</el-button>
    </div>
    <div class="actions" v-if="state.phase === 'idle'">
      <el-button type="primary" @click="startRound">开始对局</el-button>
    </div>
    <div class="actions" v-else-if="state.phase === 'betting' && state.waitingHuman && humanActable">
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
      <p class="result-tax" v-if="roundTax > 0">对局抽税 10%：-{{ roundTax }} 筹码（实收 {{ state.humanNet - roundTax }}）</p>
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
  import { cardName, evalSeven } from './pokerUtil'
  import { taxOnWin } from '@/plugins/gamblingTax'

  const store = useMainStore()
  const player = ref(store.player)
  const emit = defineEmits(['game-result'])

  const MODES = { solo: 2, four: 4, six: 6, nine: 9 }
  const ANTE_LIST = [10, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000, 300000, 500000, 1000000]

  const mode = ref('solo')
  const anteIdx = ref(0)
  const settled = ref(false)
  let engine = null
  const state = ref(null)

  const chips = computed(() => player.value.props.chips)
  const anteList = computed(() => ANTE_LIST)
  const currentAnte = computed(() => ANTE_LIST[anteIdx.value])
  const playerCount = computed(() => MODES[mode.value])

  // 底池封顶放大：让翻牌/转牌/河牌能正常打完，避免一加注就触顶秒开牌
  const potCapOf = ante => ante * (60 + playerCount.value * 20)

  const inPlay = computed(() => state.value && (state.value.phase === 'betting' || state.value.phase === 'runchoice'))

  const human = computed(() => (state.value ? state.value.players[0] : null))
  // 本局应收的筹码税（只对净赢的部分收 10%）
  const roundTax = computed(() => taxOnWin(state.value && state.value.humanNet))
  const humanActable = computed(() => human.value && !human.value.folded && !human.value.allIn)
  const humanToCall = computed(() => (human.value && state.value ? state.value.currentBet - human.value.streetBet : 0))
  const humanBestName = computed(() => {
    if (!human.value || state.value.community.length < 3) return '??'
    return bestName(human.value.hole, state.value.community, true)
  })

  const suitClass = suit => (suit === '♥' || suit === '♦' ? 'red' : 'black')
  const showable = p => p.isHuman || p.revealed
  const aiBestName = p => (p.revealed && state.value.community.length >= 3 ? bestName(p.hole, state.value.community, true) : '??')

  const refresh = () => {
    if (engine) state.value = engine.snapshot()
  }

  const startRound = () => {
    if (chips.value < currentAnte.value) {
      state.value = { ...emptyState(), log: '玩家筹码不足，请先兑换筹码' }
      settled.value = true
      return
    }
    settled.value = false
    engine = createPokerEngine({
      playerCount: playerCount.value,
      ante: currentAnte.value,
      potCap: potCapOf(currentAnte.value),
      isTexas: true,
      communityPerStreet: [3, 1, 1],
      holeCards: 2,
      // 每局买入 = 底池封顶 ÷ 当前人数：让你 All-in 后对手仍有空间补出同样筹码，
      // 且总底池是「全员补齐后」才到封顶（避免你 All-in 一瞬间就提前开牌，导致多投的部分被退回）
      chipsPerPlayer: Math.min(chips.value, Math.max(currentAnte.value, Math.floor(potCapOf(currentAnte.value) / playerCount.value))),
      maxType: 8,
      evalBest: (hole, community) => (community.length >= 3 ? evalSeven([...hole, ...community]) : null),
      makeName: i => (i === 0 ? '你' : '玩家' + i)
    })
    engine.startHand()
    state.value = engine.snapshot()
    engine.step()
    refresh()
    settleIfOver()
  }

  const act = action => {
    if (!engine) return
    engine.humanAction(action)
    refresh()
    settleIfOver()
  }

  const resetToIdle = () => {
    engine = null
    settled.value = false
    state.value = emptyState()
  }

  const chooseRun = count => {
    if (!engine) return
    engine.chooseRun(count)
    refresh()
    settleIfOver()
  }

  const settleIfOver = () => {
    if (state.value && state.value.phase === 'over' && !settled.value) {
      settled.value = true
      const net = state.value.humanNet
      const tax = taxOnWin(net)
      // 上报税后金额，税在结算这一步就扣掉了（赢钱局：入账 = 净赢 − 税）
      emit('game-result', { success: net >= 0, reward: Math.abs(net) - tax, currency: 'chips', tax })
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
  .ante-group { flex-wrap: wrap; gap: 4px; }

  .label {
    color: #909399;
    font-size: 15px;
  }

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
    min-height: 440px;
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
    gap: 18px;
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
    transition: box-shadow 0.2s;
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

  .community {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  .hand-label {
    color: #fff;
    font-size: 15px;
  }

  .pot {
    color: #fff;
    font-size: 20px;
    font-weight: bold;
  }

  .runchoice {
    text-align: center;
    color: #fff;
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

  .result-tax {
    color: #909399;
    font-size: 13px;
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
