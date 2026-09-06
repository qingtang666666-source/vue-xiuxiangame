<template>
  <el-drawer
    title="世界 Boss"
    :model-value="visible"
    @update:model-value="v => emit('update:visible', v)"
    direction="rtl"
    class="wb"
  >
    <div class="wb-body">
      <div class="wb-head">今日刷新 <b>{{ bosses.length }}</b> 只 Boss · 每只每天可攻击 {{ cap }} 次</div>
      <div v-for="b in bosses" :key="b.id" class="wb-card" :class="{ dead: b.dead }">
        <div class="wb-top">
          <span class="wb-name">{{ b.name }}</span>
          <span class="wb-ct">今日 {{ b.attacks }}/{{ b.cap }} 次</span>
        </div>
        <div class="wb-bar"><div class="wb-bar-in" :style="{ width: b.pct + '%' }"></div></div>
        <div class="wb-hp">气血 {{ b.hp }} / {{ b.maxHp }}<span v-if="b.dead" class="wb-dead"> 已讨伐</span></div>
        <div class="wb-line">本次伤害 {{ b.damage }}</div>
        <el-button
          type="danger"
          size="small"
          :class="{ done: b.dead || b.attacks >= b.cap }"
          :disabled="b.dead || b.attacks >= b.cap"
          @click="wbFight(b)"
        >{{ b.dead ? '已讨伐' : b.attacks >= b.cap ? '今日已满' : '挑战一次' }}</el-button>
      </div>
    </div>
  </el-drawer>
</template>

<script setup>
  import { computed } from 'vue'
  import { useMainStore } from '@/plugins/store'
  import { worldBossState, fightWorldBoss } from '@/plugins/worldBoss'
  import { gameNotifys } from '@/plugins/game'

  const props = defineProps({ visible: Boolean })
  const emit = defineEmits(['update:visible'])

  const store = useMainStore()
  const bosses = computed(() => worldBossState(store.player))
  const cap = computed(() => (bosses.value[0]?.cap || 3))

  const wbFight = b => {
    const r = fightWorldBoss(store.player, b.id)
    if (r.ok) {
      const rewardText = [r.treasure ? `天材地宝【${r.treasure}】` : '', r.scroll ? `功法卷轴【${r.scroll}】` : ''].filter(Boolean).join(' + ')
      const msg = `造成 ${r.dmg} 伤害${r.dead ? `，讨伐成功！击杀奖励 ${r.kill} 灵石${rewardText ? ' +' + rewardText : ''}` : ''}`
      gameNotifys({ title: r.dead ? '🌍 世界Boss已讨伐' : '挑战世界Boss', message: msg, type: r.dead ? 'success' : 'info' })
    } else {
      gameNotifys({ title: '挑战失败', message: r.reason, type: 'warning' })
    }
  }
</script>

<style scoped>
  .wb-body { display: flex; flex-direction: column; gap: 12px; }
  .wb-head { font-size: 12px; color: var(--el-text-color-secondary); }
  .wb-card { border: 1px solid var(--el-border-color-light); border-radius: 8px; padding: 10px; }
  .wb-card.dead { opacity: 0.55; }
  .wb-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
  .wb-name { font-size: 15px; font-weight: bold; color: #f56c6c; }
  .wb-ct { font-size: 12px; color: var(--el-text-color-secondary); }
  .wb-bar { height: 12px; border-radius: 7px; background: var(--el-fill-color-light); overflow: hidden; }
  .wb-bar-in { height: 100%; background: linear-gradient(90deg, #f56c6c, #e6a23c); transition: width 0.3s; }
  .wb-hp, .wb-line { color: var(--el-text-color-primary); font-size: 12px; margin: 4px 0; }
  .wb-dead { color: #67c23a; font-weight: bold; }
</style>
