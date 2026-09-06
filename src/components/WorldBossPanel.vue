<template>
  <el-drawer
    title="世界 Boss"
    :model-value="visible"
    @update:model-value="v => emit('update:visible', v)"
    direction="rtl"
    class="wb"
  >
    <div class="wb-body">
      <div class="wb-name">{{ wbState.name }}<span class="wb-day">（第 {{ wbState.day }} 天）</span></div>
      <div class="wb-bar"><div class="wb-bar-in" :style="{ width: wbState.pct + '%' }"></div></div>
      <div class="wb-hp">气血 {{ wbState.hp }} / {{ wbState.maxHp }}<span v-if="wbState.dead" class="wb-dead"> 已讨伐</span></div>
      <div class="wb-line">今日已挑战 {{ wbState.attacks }}/{{ wbState.cap }} 次 · 参战伤害 {{ wbState.damage }}</div>
      <div class="wb-line">你的排位：第 <b>{{ wbState.rank }}</b> 名</div>
      <el-divider>今日伤害榜</el-divider>
      <div class="rival" v-for="(r, i) in wbState.rivals" :key="i">
        <span>{{ i + 1 }}. {{ r.name }}</span><span class="rival-pts">{{ r.damage }}</span>
      </div>
    </div>
    <template #footer>
      <el-button type="danger" :disabled="wbState.dead || wbState.attacks >= wbState.cap" @click="wbFight">挑战一次</el-button>
    </template>
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
  const wbState = computed(() => worldBossState(store.player))
  const wbFight = () => {
    const r = fightWorldBoss(store.player)
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
  .wb-body {
    min-height: 60vh;
  }
  .wb-name {
    font-size: 16px;
    font-weight: bold;
    color: #f56c6c;
  }
  .wb-day {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    font-weight: normal;
  }
  .wb-bar {
    margin: 8px 0 2px;
    height: 14px;
    border-radius: 8px;
    background: var(--el-fill-color-light);
    overflow: hidden;
  }
  .wb-bar-in {
    height: 100%;
    background: linear-gradient(90deg, #f56c6c, #e6a23c);
    transition: width 0.3s;
  }
  .wb-hp,
  .wb-line {
    color: var(--el-text-color-primary);
    font-size: 13px;
    margin: 4px 0;
  }
  .wb-dead {
    color: #67c23a;
    font-weight: bold;
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
</style>
