<template>
  <div class="money-bar" :class="{ compact }">
    <div class="mb-line mb-gold">
      💰 <b class="mb-num">{{ fmt(player.props.money) }}</b> <span class="mb-lbl">灵石</span><span v-if="moneyDelta" class="mb-delta" :class="moneyDelta.gain ? 'mb-gain' : 'mb-loss'">{{ moneyDelta.text }}</span>
    </div>
    <div v-if="showCurrency" class="mb-line mb-cur">
      🔮 <b class="mb-num">{{ fmt(player.props.currency) }}</b> <span class="mb-lbl">混沌石</span><span v-if="currencyDelta" class="mb-delta" :class="currencyDelta.gain ? 'mb-gain' : 'mb-loss'">{{ currencyDelta.text }}</span>
    </div>
  </div>
</template>

<script setup>
  import { ref, watch, onBeforeUnmount } from 'vue'
  import { useMainStore } from '@/plugins/store'
  import { formatNumberToChineseUnit } from '@/plugins/game'

  const props = defineProps({ showCurrency: { type: Boolean, default: true }, compact: { type: Boolean, default: false } })
  const store = useMainStore()
  const player = store.player
  const fmt = formatNumberToChineseUnit
  const moneyDelta = ref(null)
  const currencyDelta = ref(null)
  let lastMoney = player.props?.money
  let lastCurrency = player.props?.currency
  let t1 = null
  let t2 = null
  const fmtDelta = d => (d > 0 ? '+' : '') + d.toLocaleString('zh-CN')

  watch(
    () => player.props?.money,
    v => {
      const d = v - (lastMoney || 0)
      lastMoney = v
      if (d !== 0) {
        moneyDelta.value = { text: fmtDelta(d), gain: d > 0 }
        clearTimeout(t1)
        t1 = setTimeout(() => { moneyDelta.value = null }, 1400)
      }
    }
  )
  watch(
    () => player.props?.currency,
    v => {
      const d = v - (lastCurrency || 0)
      lastCurrency = v
      if (d !== 0) {
        currencyDelta.value = { text: fmtDelta(d), gain: d > 0 }
        clearTimeout(t2)
        t2 = setTimeout(() => { currencyDelta.value = null }, 1400)
      }
    }
  )
  onBeforeUnmount(() => { clearTimeout(t1); clearTimeout(t2) })
</script>

<style scoped>
  .money-bar { display: flex; flex-direction: column; gap: 4px; font-weight: bold; color: #7a5b12; }
  .mb-gold .mb-num { color: #c8861f; }
  .mb-cur .mb-num { color: #6a5acd; }
  .money-bar.compact { flex-direction: row; gap: 8px; align-items: center; font-size: 13px; }
  .mb-line { position: relative; line-height: 1.3; font-size: 14px; }
  .mb-num { font-size: 16px; }
  .compact .mb-line { font-size: 13px; }
  .mb-lbl { font-size: 12px; opacity: 0.8; }
  .mb-delta {
    position: absolute;
    right: -20px;
    top: 2px;
    font-size: 13px;
    font-weight: bold;
    animation: moneyFloat 1.4s ease-out forwards;
    pointer-events: none;
  }
  .mb-delta.mb-gain { color: #e6a23c; }
  .mb-delta.mb-loss { color: #2e8b57; }
  @keyframes moneyFloat {
    0% { opacity: 0; transform: translateY(4px); }
    20% { opacity: 1; transform: translateY(0); }
    100% { opacity: 0; transform: translateY(-16px); }
  }
</style>
