<template>
  <div class="guild">
    <div class="page-header">
      <div class="title">行会商会 · <span class="realm" v-text="scale.name" /></div>
      <div class="resources">
        <el-tag type="warning">灵石 {{ formatNumberToChineseUnit(player.props.money || 0) }}</el-tag>
        <el-tag type="primary">商会贡献 {{ guild.points || 0 }}</el-tag>
      </div>
      <div class="hint">订单每日刷新，随商会规模升级，利润更丰厚。</div>
    </div>

    <div class="section-title">今日订单（{{ orders.length }}）</div>
    <div class="orders" v-if="orders.length">
      <div class="order" v-for="o in orders" :key="o.id">
        <div class="ogive">
          <b>{{ o.name }}</b>
          <span class="need">持有 {{ player.props[o.give.key] || 0 }} / {{ o.give.qty }}</span>
        </div>
        <div class="oreward">
          得 <b class="money">{{ formatNumberToChineseUnit(o.gain) }}</b> 灵石 + {{ o.points }} 贡献
        </div>
        <el-button size="small" type="success" @click="trade(o)" :disabled="!canTrade(o)">交付</el-button>
      </div>
    </div>
    <el-empty v-else description="今日订单已全部完成" />

    <div class="outer-actions">
    </div>
  </div>
</template>

<script setup>
  import { ref, computed } from 'vue'
  import { useRouter } from 'vue-router'
  import { useMainStore } from '@/plugins/store'
  import { formatNumberToChineseUnit, gameNotifys } from '@/plugins/game'
  import { guildScale, guildOrders, guildPoints, doGuildTrade, canGuildTrade } from '@/plugins/guild'

  const store = useMainStore()
  const router = useRouter()
  const player = ref(store.player)
  const guild = computed(() => ({ date: player.value.guild?.date, orders: guildOrders(player.value), points: guildPoints(player.value) }))
  const scale = computed(() => guildScale(player.value))
  const orders = computed(() => guildOrders(player.value))

  const canTrade = o => canGuildTrade(player.value, o.id)
  const trade = o => {
    const r = doGuildTrade(player.value, o.id)
    if (r.ok) gameNotifys({ title: '商会交易', message: `完成【${r.name}】，得 ${r.gain} 灵石 + ${r.points} 贡献`, type: 'success' })
    else gameNotifys({ title: '商会交易', message: r.reason, type: 'error' })
  }
</script>

<style scoped>
  .guild { text-align: left; padding: 0 4px; }
  .page-header { margin-bottom: 10px; }
  .title { font-size: 20px; font-weight: bold; margin-bottom: 8px; }
  .realm { color: var(--el-color-primary); }
  .resources { display: flex; gap: 8px; margin-bottom: 6px; }
  .hint { font-size: 12px; color: var(--el-text-color-secondary); }
  .section-title { font-size: 15px; font-weight: bold; margin: 12px 0 8px; }
  .orders { display: flex; flex-direction: column; gap: 6px; }
  .order { display: flex; align-items: center; gap: 12px; padding: 8px 12px; border-radius: 4px; background: var(--el-fill-color-light); }
  .ogive { display: flex; flex-direction: column; flex: 1; }
  .need { font-size: 12px; color: var(--el-text-color-secondary); }
  .oreward { font-size: 13px; }
  .money { color: var(--el-color-warning); }
  .outer-actions { margin-top: 16px; display: flex; justify-content: center; }
</style>
