<template>
  <div class="dg">
    <div class="dg-head">
      <div class="dg-title">今日修行</div>
      <div class="dg-streak">连续完成 <b>{{ streak }}</b> 天<span v-if="streak >= 7" class="dg-hot">🔥</span></div>
    </div>
    <div class="dg-sub">完成全部今日目标，领取连签奖励。每日 0 点刷新。</div>
    <div class="dg-list">
      <div v-for="t in tasks" :key="t.key" class="dg-item" :class="{ done: isDone(t) }">
        <span class="dg-icon">{{ t.icon }}</span>
        <div class="dg-mid">
          <div class="dg-name">{{ t.name }}<span class="dg-desc">{{ t.desc }}</span></div>
          <el-progress :percentage="Math.min(100, (count(t.key) / t.target) * 100)" :show-text="false" :stroke-width="6" />
        </div>
        <div class="dg-num">{{ count(t.key) }} / {{ t.target }}</div>
      </div>
    </div>
    <el-button
      :disabled="!claimable"
      type="primary"
      size="large"
      class="dg-claim"
      @click="claim"
    >{{ done ? (claimable ? '领取今日奖励' : '今日已领取') : '完成目标后领取' }}</el-button>
    <div v-if="claimedMsg" class="dg-msg">{{ claimedMsg }}</div>
  </div>
</template>

<script setup>
  import { ref, computed } from 'vue'
  import { useMainStore } from '@/plugins/store'
  import { DAILY_TASKS, initDaily, dailyDone, dailyClaimable, claimDaily } from '@/plugins/dailyGoals'
  import { gameNotifys } from '@/plugins/game'

  const store = useMainStore()
  const player = ref(store.player)
  const claimedMsg = ref('')
  initDaily(player.value)
  const tasks = DAILY_TASKS
  const count = k => (player.value.dailyGoals?.counts?.[k] || 0)
  const isDone = t => count(t.key) >= t.target
  const done = computed(() => dailyDone(player.value))
  const claimable = computed(() => dailyClaimable(player.value))
  const streak = computed(() => player.value.dailyGoals?.streak || 0)

  const claim = () => {
    const r = claimDaily(player.value)
    if (r.ok) { claimedMsg.value = `领取成功：灵石 +${r.money}、培养丹 +${r.dan}、强化石 +${r.stone}（连签 ${r.streak} 天）` }
    gameNotifys({ title: r.ok ? '今日修行完成' : '提示', message: r.ok ? (claimedMsg.value) : r.reason, type: r.ok ? 'success' : 'warning' })
  }
</script>

<style scoped>
  .dg { padding: 22px; max-width: 520px; margin: 0 auto; }
  .dg-head { display: flex; align-items: center; justify-content: space-between; }
  .dg-title { font-size: 22px; font-weight: 800; }
  .dg-streak { font-size: 14px; color: var(--el-color-warning); }
  .dg-sub { font-size: 12px; color: var(--el-text-color-secondary); margin: 8px 0 16px; }
  .dg-list { display: flex; flex-direction: column; gap: 10px; }
  .dg-item { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 12px; background: var(--el-fill-color-light); }
  .dg-item.done { background: rgba(103, 194, 58, 0.14); }
  .dg-icon { font-size: 22px; }
  .dg-mid { flex: 1; }
  .dg-name { font-size: 14px; display: flex; gap: 8px; align-items: baseline; }
  .dg-desc { font-size: 12px; color: var(--el-text-color-secondary); }
  .dg-num { font-weight: 700; }
  .dg-claim { margin-top: 18px; width: 100%; }
  .dg-msg { margin-top: 10px; font-size: 13px; color: var(--el-color-success); text-align: center; }
</style>
