<template>
  <el-drawer
    title="功法阁"
    :model-value="visible"
    @update:model-value="v => emit('update:visible', v)"
    direction="rtl"
    size="min(440px, 100vw)"
    class="technique-drawer"
  >
    <div class="tech-body">
      <div class="tech-hint">
        主动功法（≤{{ ACTIVE_MAX }}）战斗出手，被动功法（≤{{ PASSIVE_MAX }}）常驻增益。
        参悟成败取决于根骨资质 × 悟性，失败仅耗损半数资源。点每门功法的「上阵 / 辅修」即可选择出战功法。
      </div>
      <div class="tech-res">
        <el-tag type="warning">灵石 {{ formatNumberToChineseUnit(player.props.money || 0) }}</el-tag>
        <el-tag type="primary">培养丹 {{ player.props.cultivateDan || 0 }}</el-tag>
        <el-tag v-if="mainInfo" type="danger">主修：{{ short(mainInfo.name) }}</el-tag>
      </div>

      <div class="tech-set-banner">
        <div class="set-line">主动上阵：<b>{{ activeSel.length }}/{{ ACTIVE_MAX }}</b></div>
        <div class="set-line">被动辅修：<b>{{ passiveSel.length }}/{{ PASSIVE_MAX }}</b></div>
      </div>

      <div class="tech-summary">
        <div class="sum-line" v-for="s in summaryList" :key="s.k">
          <span>{{ s.label }}</span><b>{{ s.value }}</b>
        </div>
      </div>

      <div class="tech-list-scroll">
        <el-tabs v-model="tab">
          <el-tab-pane :label="`主动 · ${activeOwned.length}`" name="active">
            <template v-if="!activeOwned.length">
              <el-empty description="尚未获得任何主动功法" :image-size="70" />
            </template>
            <div class="tech-item" v-for="t in activeOwned" :key="t.id">
              <TechniqueCard :t="t" :player="player" :active="activeTask" />
            </div>
          </el-tab-pane>
          <el-tab-pane :label="`被动 · ${passiveOwned.length}`" name="passive">
            <template v-if="!passiveOwned.length">
              <el-empty description="尚未获得任何被动功法" :image-size="70" />
            </template>
            <div class="tech-item" v-for="t in passiveOwned" :key="t.id">
              <TechniqueCard :t="t" :player="player" :active="activeTask" />
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </div>
  </el-drawer>
</template>

<script setup>
  import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
  import { useMainStore } from '@/plugins/store'
  import { formatNumberToChineseUnit, gameNotifys } from '@/plugins/game'
  import {
    ACTIVE_MAX,
    PASSIVE_MAX,
    ownedTechniques,
    methodStats,
    techniqueById,
    statName,
    techniqueActive,
    techniquePassive,
    techTask,
    techTaskResultMessage,
    tickTechniques
  } from '@/plugins/technique'
  import TechniqueCard from './TechniqueCard.vue'

  const props = defineProps({ visible: Boolean })
  const emit = defineEmits(['update:visible'])

  const store = useMainStore()
  const player = computed(() => store.player)
  const tab = ref('active')

  const owned = computed(() => ownedTechniques(player.value))
  const activeOwned = computed(() => owned.value.filter(t => t.type === 'active'))
  const passiveOwned = computed(() => owned.value.filter(t => t.type === 'passive'))
  const activeSel = computed(() => techniqueActive(player.value))
  const passiveSel = computed(() => techniquePassive(player.value))
  const mainInfo = computed(() => (player.value.mainMethod ? techniqueById(player.value.mainMethod) : null))
  const short = n => (n && n.length > 9 ? n.slice(0, 9) + '…' : n)

  // 每秒刷新当前正在参悟/修炼的功法进度，并结算到期任务
  const nowTick = ref(Date.now())
  let techTimer = null
  onMounted(() => {
    nowTick.value = Date.now()
    techTimer = setInterval(() => {
      nowTick.value = Date.now()
      const r = tickTechniques(player.value)
      if (r) gameNotifys({ title: '功法', message: techTaskResultMessage(r), type: r.ok ? 'success' : 'warning' })
    }, 1000)
  })
  onBeforeUnmount(() => { if (techTimer) clearInterval(techTimer) })

  const activeTask = computed(() => {
    const task = techTask(player.value)
    if (!task) return null
    const total = task.duration || 1
    const remain = Math.max(0, task.start + total - nowTick.value)
    const percent = Math.min(100, Math.max(0, Math.round((1 - remain / total) * 100)))
    return { id: task.id, type: task.type, name: task.name, remain, total, percent }
  })

  const summaryList = computed(() => {
    const m = methodStats(player.value)
    const fmt = (k, v) => ({ attack: Math.round(v), defense: Math.round(v), health: Math.round(v), critical: (v * 100).toFixed(1) + '%', dodge: (v * 100).toFixed(1) + '%', cultivationSpeed: v.toFixed(2), moneyMult: '×' + v.toFixed(2) }[k])
    const keys = ['attack', 'defense', 'health', 'critical', 'dodge', 'cultivationSpeed', 'moneyMult']
    return keys.filter(k => (m[k] || 0) > 0).map(k => ({ k, label: statName(k), value: fmt(k, m[k]) }))
  })
</script>

<style scoped>
  .technique-drawer :deep(.el-drawer__body) {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding-bottom: 0;
  }
  .tech-body { display: flex; flex: 1 1 auto; flex-direction: column; gap: 10px; min-height: 0; padding-bottom: 0; }
  .tech-list-scroll {
    flex: 1 1 auto;
    min-height: 0;
    max-height: calc(100vh - 260px);
    max-height: calc(100dvh - 260px);
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
    touch-action: pan-y;
    padding-bottom: calc(24px + env(safe-area-inset-bottom, 0px));
  }
  .technique-drawer :deep(.el-tabs__content) {
    overflow: visible;
  }
  .tech-hint { font-size: 12px; color: var(--el-text-color-secondary); line-height: 1.6; }
  .tech-res { display: flex; flex-wrap: wrap; gap: 6px; }
  .tech-set-banner { display: flex; gap: 12px; font-size: 13px; color: var(--el-text-color-primary); background: var(--el-fill-color-light); border-radius: 8px; padding: 8px 12px; }
  .set-line b { color: var(--el-color-primary); }
  .tech-summary { display: flex; flex-wrap: wrap; gap: 6px 14px; font-size: 12px; color: var(--el-text-color-secondary); }
  .sum-line { display: flex; gap: 4px; }
  .sum-line b { color: var(--el-color-success); font-weight: 600; }
  .tech-item { margin-bottom: 8px; }
  @media only screen and (max-width: 768px) {
    .tech-body { gap: 6px; }
    .tech-hint { font-size: 11px; line-height: 1.5; }
    .tech-res { gap: 4px; }
    .tech-set-banner { padding: 6px 8px; font-size: 12px; }
    .tech-summary { font-size: 11px; }
    .tech-item { margin-bottom: 6px; }
  }
</style>
