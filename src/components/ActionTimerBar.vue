<template>
  <div v-if="show" class="atbar">
    <div class="atbar-icon">{{ icon }}</div>
    <div class="atbar-body">
      <div class="atbar-name">{{ label }}</div>
      <el-progress :percentage="percent" :stroke-width="6" :show-text="false" class="atbar-prog" />
      <div class="atbar-sub">剩余约 {{ remainSec }}s</div>
    </div>
    <div class="atbar-ops" v-if="isAction">
      <el-button size="small" @click="doCancel">取消</el-button>
      <el-button size="small" type="primary" @click="doFinish">跳过</el-button>
    </div>
  </div>
</template>

<script setup>
  import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
  import { gameNotifys } from '@/plugins/game'
  import {
    actionTask,
    actionRemainMs,
    actionPercent,
    cancelAction,
    finishNow,
    tickActions
  } from '@/plugins/actionTimer'
  import { techTask, remainMs as techRemainMs, techTaskResultMessage, tickTechniques } from '@/plugins/technique'

  const props = defineProps({ player: Object })
  const nowTick = ref(Date.now())
  let timer = null
  onMounted(() => {
    nowTick.value = Date.now()
    timer = setInterval(() => {
      nowTick.value = Date.now()
      const a = tickActions(props.player)
      if (a) gameNotifys({ title: '工坊', message: a.message, type: a.type })
      const tr = tickTechniques(props.player)
      if (tr) gameNotifys({ title: '功法', message: techTaskResultMessage(tr), type: tr.ok ? 'success' : 'warning' })
    }, 1000)
  })
  onBeforeUnmount(() => { if (timer) clearInterval(timer) })

  const action = computed(() => actionTask(props.player))
  const tech = computed(() => techTask(props.player))
  const isAction = computed(() => !!action.value)

  const show = computed(() => !!(action.value || tech.value))
  const label = computed(() => {
    if (action.value) return action.value.label || '工坊进行中'
    if (tech.value) return tech.value.type === 'learn' ? `参悟中【${tech.value.name}】` : `修炼中【${tech.value.name}】`
    return ''
  })
  const icon = computed(() => {
    if (action.value) return '⚒️'
    if (tech.value) return tech.value.type === 'learn' ? '📖' : '🌀'
    return ''
  })
  const percent = computed(() => {
    if (action.value) return actionPercent(props.player)
    if (tech.value) {
      const total = tech.value.duration || 1
      const remain = Math.max(0, tech.value.start + total - nowTick.value)
      return Math.min(100, Math.max(0, Math.round((1 - remain / total) * 100)))
    }
    return 0
  })
  const remainSec = computed(() => {
    if (action.value) return Math.max(0, Math.ceil(actionRemainMs(props.player) / 1000))
    if (tech.value) return Math.max(0, Math.ceil(Math.max(0, tech.value.start + tech.value.duration - nowTick.value) / 1000))
    return 0
  })

  const doCancel = () => {
    if (cancelAction(props.player)) gameNotifys({ title: '工坊', message: '已取消当前动作', type: 'info' })
  }
  const doFinish = () => {
    const r = finishNow(props.player)
    if (r) gameNotifys({ title: '工坊', message: r.message, type: r.type })
  }
</script>

<style scoped>
  .atbar {
    display: flex; align-items: center; gap: 12px;
    background: var(--el-color-primary-light-9);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 8px; padding: 8px 12px; margin: 0 0 10px;
  }
  .atbar-icon { font-size: 22px; }
  .atbar-body { flex: 1; min-width: 0; }
  .atbar-name { font-size: 13px; font-weight: 600; color: var(--el-color-primary); margin-bottom: 4px; }
  .atbar-sub { font-size: 12px; color: var(--el-text-color-secondary); }
  .atbar-prog { margin-bottom: 2px; }
  .atbar-ops { display: flex; gap: 6px; }
</style>
