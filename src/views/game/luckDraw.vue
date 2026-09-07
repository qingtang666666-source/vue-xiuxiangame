<template>
  <div class="luck">
    <div class="luck-card" :class="{ 'is-jackpot': result && result.jackpot }">
      <div class="luck-title">每日气运</div>
      <div class="luck-sub">一日一抽 · 免费 · 天降机缘</div>
      <div class="luck-orbs">
        <span class="orb">🌕</span>
        <span class="orb">☯️</span>
        <span class="orb">✨</span>
      </div>
      <transition name="reveal">
        <div v-if="result" class="luck-result" :class="{ jackpot: result.jackpot }">
          <div class="luck-result-head">{{ result.jackpot ? '🎉 天降气运！' : '🎁 获得' }}</div>
          <div class="luck-result-main">{{ result.name }}</div>
          <div v-if="result.detail" class="luck-result-detail">{{ result.detail }}</div>
        </div>
      </transition>
      <el-button
        @click="draw"
        :disabled="!canDraw"
        class="luck-button"
        size="large"
      >
        {{ canDraw ? '抽取气运' : '今日已抽 · 明日再来' }}
      </el-button>
      <div class="luck-streak">气运值：{{ luckValue }} · 今日 {{ canDraw ? '可抽' : '已抽' }}</div>
    </div>
  </div>
</template>

<script setup>
  import { ref, computed } from 'vue'
  import { useMainStore } from '@/plugins/store'
  import { gameNotifys } from '@/plugins/game'
  import { bumpDaily } from '@/plugins/dailyGoals'

  const store = useMainStore()
  const player = ref(store.player)
  const result = ref(null)

  const lastDate = computed(() => player.value.lastLuckDate ? new Date(player.value.lastLuckDate).toDateString() : '')
  const canDraw = computed(() => new Date().toDateString() !== lastDate.value)
  const luckValue = computed(() => (player.value.luckDraws || 0) + 1)

  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
  const lv = () => Math.max(1, player.value.level || 1)

  const draw = () => {
    if (!canDraw.value) return
    player.value.luckDraws = (player.value.luckDraws || 0) + 1
    bumpDaily(player.value, 'draw')
    player.value.lastLuckDate = new Date().toISOString()

    // 加权随机奖励（随境界缩放）
    const roll = Math.random()
    let r
    if (roll < 0.04) {
      const amt = Math.floor((300 + rand(0, 30)) * lv())
      player.value.props.money = (player.value.props.money || 0) + amt
      r = { name: '天降财缘', detail: `灵石 +${amt}`, jackpot: true }
    } else if (roll < 0.14) {
      player.value.props.currency = (player.value.props.currency || 0) + 1
      r = { name: '一缕混沌', detail: '混沌石 +1', unique: true }
    } else if (roll < 0.34) {
      const amt = rand(1, 3)
      player.value.props.cultivateDan = (player.value.props.cultivateDan || 0) + amt
      r = { name: '培元丹', detail: `培养丹 +${amt}`, color: 'pill' }
    } else if (roll < 0.62) {
      const amt = rand(2, 6)
      player.value.props.spiritHerb = (player.value.props.spiritHerb || 0) + amt
      r = { name: '灵草', detail: `灵草 +${amt}`, color: 'herb' }
    } else if (roll < 0.82) {
      const amt = rand(1, 3)
      player.value.props.strengtheningStone = (player.value.props.strengtheningStone || 0) + amt
      r = { name: '强化石', detail: `强化石 +${amt}`, color: 'ore' }
    } else {
      const amt = Math.floor((60 + rand(0, 40)) * lv())
      player.value.props.money = (player.value.props.money || 0) + amt
      r = { name: '灵石', detail: `灵石 +${amt}`, color: 'money' }
    }
    result.value = r
    gameNotifys({ title: r.jackpot ? '天降气运！' : '气运到手', message: r.name + (r.detail ? ' · ' + r.detail : ''), type: r.jackpot ? 'success' : 'info' })
  }
</script>

<style scoped>
  .luck { padding: 20px; }
  .luck-card {
    max-width: 420px; margin: 0 auto; padding: 28px 24px;
    text-align: center; border-radius: 18px;
    background: linear-gradient(160deg, #2a2140 0%, #1a1630 60%, #241a3a 100%);
    border: 1px solid rgba(180, 140, 255, 0.35);
    box-shadow: 0 10px 40px rgba(80, 40, 160, 0.35);
    color: #f0e6ff;
  }
  .luck-card.is-jackpot { border-color: #ffd76a; box-shadow: 0 0 40px rgba(255, 200, 90, 0.55); }
  .luck-title { font-size: 24px; font-weight: 800; letter-spacing: 3px; }
  .luck-sub { margin-top: 6px; font-size: 13px; color: #b7a4e6; }
  .luck-orbs { margin: 18px 0; display: flex; justify-content: center; gap: 14px; font-size: 26px; }
  .orb { animation: floatOrb 2.6s ease-in-out infinite; }
  .orb:nth-child(2) { animation-delay: .3s; }
  .orb:nth-child(3) { animation-delay: .6s; }
  @keyframes floatOrb { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
  .luck-result { margin: 14px 0; padding: 16px; border-radius: 14px; background: rgba(255,255,255,0.06); }
  .luck-result.jackpot { background: rgba(255, 210, 90, 0.16); }
  .luck-result-head { font-size: 14px; color: #cbb8ff; }
  .luck-result-main { font-size: 24px; font-weight: 800; margin-top: 6px; }
  .luck-result-detail { margin-top: 6px; font-size: 14px; color: #b7a4e6; }
  .luck-button { margin-top: 10px; width: 100%; background: linear-gradient(90deg,#8b5cf6,#6d28d9); color:#fff; border:none; font-size:16px; }
  .luck-button:disabled { background:#4b4465; color:#a99cc9; }
  .luck-streak { margin-top: 12px; font-size: 13px; color: #b7a4e6; }
  .reveal-enter-active { transition: all .5s cubic-bezier(.2,.9,.3,1.3); }
  .reveal-leave-active { transition: all .2s; }
  .reveal-enter-from, .reveal-leave-to { opacity: 0; transform: scale(.7); }
</style>
