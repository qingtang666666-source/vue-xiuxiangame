<template>
  <el-dialog
    :model-value="visible"
    @update:model-value="v => emit('update:visible', v)"
    title="本命法宝"
    width="360px"
  >
    <div class="na-body">
      <div class="na-title">{{ naTier }} · {{ naLv }} 级<span class="na-hint">（伴生 · 轮回不丢）</span></div>
      <div class="na-line">攻 +{{ naStats.attack }} · 防 +{{ naStats.defense }}</div>
      <div class="na-line">词条：{{ naAffixes.length ? naAffixes.join(' / ') : '尚未觉醒' }}</div>
      <div class="na-line">温养消耗：炼器石 ×{{ naCost.stone }} · 灵石 {{ naCost.money }}<span v-if="naCost.herb"> · 灵草 {{ naCost.herb }}</span></div>
      <div class="na-note">每踏入新的大境界自动觉醒一条词条（上限 6 条）；境界越高可温养等级越高。</div>
    </div>
    <template #footer>
      <el-button type="primary" :disabled="naLv >= naCost.maxLv" @click="naUpgrade">温养（{{ naLv }}/{{ naCost.maxLv }}）</el-button>
      <el-button @click="emit('update:visible', false)">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
  import { computed } from 'vue'
  import { useMainStore } from '@/plugins/store'
  import { natalArtifactTier, natalArtifactStats, natalUpgrade, natalUpgradeCost } from '@/plugins/natalArtifact'
  import { gameNotifys } from '@/plugins/game'

  const props = defineProps({ visible: Boolean })
  const emit = defineEmits(['update:visible'])

  const store = useMainStore()
  const naTier = computed(() => natalArtifactTier(store.player))
  const naLv = computed(() => store.player.natalArtifact?.level || 1)
  const naAffixes = computed(() => (store.player.natalArtifact?.affixes || []).map(a => a.name))
  const naStats = computed(() => natalArtifactStats(store.player))
  const naCost = computed(() => natalUpgradeCost(store.player))
  const naUpgrade = () => {
    const r = natalUpgrade(store.player)
    if (r.ok) gameNotifys({ title: '温养成功', message: `本命法宝升至 ${r.level} 级`, type: 'success' })
    else gameNotifys({ title: '温养失败', message: r.reason, type: 'warning' })
  }
</script>

<style scoped>
  .na-body {
    line-height: 1.7;
  }
  .na-title {
    font-size: 16px;
    font-weight: bold;
    color: var(--el-color-primary);
  }
  .na-hint {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    font-weight: normal;
  }
  .na-line {
    color: var(--el-text-color-primary);
    font-size: 13px;
  }
  .na-note {
    margin-top: 8px;
    color: var(--el-text-color-secondary);
    font-size: 12px;
  }
</style>
