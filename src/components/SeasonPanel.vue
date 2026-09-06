<template>
  <el-drawer
    title="赛季天梯"
    :model-value="visible"
    @update:model-value="v => emit('update:visible', v)"
    direction="rtl"
    class="season"
  >
    <div class="season-body">
      <div class="season-top">第 {{ seasonInfo.id }} 赛季 · 每 14 天刷新</div>
      <div class="season-line">赛季积分：<b class="season-pts">{{ seasonInfo.points }}</b></div>
      <div class="season-line">
        当前段位：<b class="season-tier">{{ seasonInfo.tier.name }}</b>
        <span v-if="seasonInfo.next" class="season-next">距 {{ seasonInfo.next.name }} 还差 {{ seasonInfo.next.min - seasonInfo.points }} 分</span>
        <span v-else class="season-next">已登顶</span>
      </div>
      <div class="season-line">本季排名：第 <b class="season-rank">{{ seasonInfo.rank }}</b> / {{ seasonInfo.rivalCount }}</div>
      <div v-if="seasonInfo.settled" class="season-settle">
        上季结算：{{ seasonInfo.settled.tier }} · {{ seasonInfo.settled.points }} 分 → {{ tierRewardText(seasonInfo.settled.rewards) }}
      </div>
      <el-divider>道友天梯</el-divider>
      <div class="rival" v-for="(r, i) in seasonInfo.rivals" :key="i">
        <span>{{ i + 1 }}. {{ r.name }}</span>
        <span class="rival-pts">{{ r.points }} 分</span>
      </div>
      <el-divider>段位奖励（赛季结束按结算发放）</el-divider>
      <div class="tier-row" v-for="t in seasonTiers" :key="t.min">
        <span class="season-tier">{{ t.name }} ≥{{ t.min }}</span>
        <span class="tier-rewards">{{ tierRewardText(t.rewards) }}</span>
      </div>
    </div>
  </el-drawer>
</template>

<script setup>
  import { computed } from 'vue'
  import { useMainStore } from '@/plugins/store'
  import { seasonState, seasonTiers as seasonTiersFn, tierRewardText } from '@/plugins/season'

  const props = defineProps({ visible: Boolean })
  const emit = defineEmits(['update:visible'])

  const store = useMainStore()
  const seasonInfo = computed(() => seasonState(store.player))
  const seasonTiers = seasonTiersFn()
</script>

<style scoped>
  .season-body {
    min-height: 80vh;
  }
  .season-top {
    font-size: 15px;
    font-weight: bold;
    color: var(--el-color-primary);
    margin-bottom: 8px;
  }
  .season-line {
    margin: 6px 0;
    color: var(--el-text-color-primary);
    font-size: 13px;
  }
  .season-pts {
    color: #e6a23c;
    font-size: 18px;
  }
  .season-tier {
    color: #409eff;
    font-weight: bold;
  }
  .season-rank {
    color: #f56c6c;
  }
  .season-next {
    margin-left: 8px;
    color: var(--el-text-color-secondary);
    font-size: 12px;
  }
  .season-settle {
    margin: 6px 0;
    padding: 6px 10px;
    border-radius: 8px;
    background: var(--el-color-success-light-9);
    color: var(--el-color-success);
    font-size: 12px;
  }
  .rival {
    display: flex;
    justify-content: space-between;
    padding: 5px 8px;
    border-bottom: 1px dashed var(--el-border-color-light);
    color: var(--el-text-color-primary);
    font-size: 13px;
  }
  .rival-pts {
    color: var(--el-text-color-secondary);
  }
  .tier-row {
    display: flex;
    justify-content: space-between;
    padding: 5px 8px;
    border-bottom: 1px dashed var(--el-border-color-light);
    font-size: 12px;
  }
  .tier-rewards {
    color: var(--el-text-color-secondary);
  }
</style>
