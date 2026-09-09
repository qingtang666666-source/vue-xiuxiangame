<template>
  <div class="pet-gacha">
    <div class="page-header">
      <div class="title">🎰 灵宠抽奖</div>
      <div class="resources">
        <el-tag type="warning">灵石 {{ formatNumberToChineseUnit(player.props.money || 0) }}</el-tag>
        <el-tag type="success">灵宠 {{ (player.pets || []).length }} / {{ player.backpackCapacity || 1000 }}</el-tag>
      </div>
      <div class="hint">不同品质奖池价格差距很大；每个奖池独立累计，50 抽必出本池灵宠。奖池内还会混入灵草、培养丹、炼器石、低阶丹药、符箓和材料。</div>
    </div>

    <div class="pool-grid">
      <el-card v-for="pool in PET_POOLS" :key="pool.key" class="pool-card" shadow="hover">
        <template #header>
          <div class="pool-head">
            <el-tag :type="qualityColor(pool.quality)" effect="dark">{{ pool.qualityName }}</el-tag>
            <span class="pool-name">{{ pool.name }}</span>
          </div>
        </template>
        <div class="pool-desc">{{ pool.desc }}</div>
        <div class="pool-rate">灵宠概率约 {{ Math.round(pool.petChance * 100) }}% · 50 抽必出本池灵宠</div>
        <div class="pool-pity">当前保底进度 {{ pityOf(pool) }}/50</div>
        <div class="pool-cost">
          <span>单抽 {{ formatNumberToChineseUnit(pool.cost) }} 灵石</span>
          <span>十连 {{ formatNumberToChineseUnit(pool.tenCost) }} 灵石</span>
        </div>
        <div class="pool-ops">
          <el-button type="primary" :disabled="!canDraw(pool.cost)" @click="draw(pool, false)">单抽</el-button>
          <el-button type="warning" :disabled="!canDraw(pool.tenCost)" @click="draw(pool, true)">十连抽</el-button>
        </div>
      </el-card>
    </div>

    <el-dialog v-model="resultShow" title="抽奖结果" width="min(560px, 94vw)" class="gacha-result">
      <div class="result-grid">
        <div v-for="(r, i) in rewards" :key="i" class="result-card" :class="{ pet: r.kind === 'pet' }">
          <template v-if="r.kind === 'pet'">
            <el-tag :type="petQualityOf(r.pet).color" effect="dark">{{ petQualityOf(r.pet).name }}灵宠</el-tag>
            <div class="result-name">{{ r.pet.name }}</div>
            <div class="result-sub">{{ petRoleOf(r.pet).icon }} {{ petRoleOf(r.pet).name }} · 战力 {{ petPowerScore(r.pet).toLocaleString('zh-CN') }}</div>
          </template>
          <template v-else>
            <el-tag type="info" effect="plain">杂物</el-tag>
            <div class="result-name">{{ r.name }}</div>
            <div class="result-sub">{{ r.desc }}</div>
          </template>
        </div>
      </div>
      <template #footer>
        <el-button type="primary" @click="resultShow = false">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
  import { computed, ref } from 'vue'
  import { useMainStore } from '@/plugins/store'
  import { formatNumberToChineseUnit, gameNotifys } from '@/plugins/game'
  import { PET_POOLS, drawPetGacha } from '@/plugins/petGacha'
  import { petQualityOf, petRoleOf, petPowerScore } from '@/plugins/petSystem'

  const store = useMainStore()
  const player = computed(() => store.player)
  const resultShow = ref(false)
  const rewards = ref([])

  const canDraw = cost => (player.value.props.money || 0) >= cost
  const pityOf = pool => (player.value.petGachaPity?.[pool.key] || 0)
  const qualityColor = q => ['info', 'success', 'primary', 'warning', 'danger'][q] || 'info'

  const draw = (pool, ten) => {
    const r = drawPetGacha(player.value, pool.key, ten ? 10 : 1)
    if (!r.ok) return gameNotifys({ title: '灵宠抽奖', message: r.reason, type: 'warning' })
    rewards.value = r.rewards
    resultShow.value = true
    const petCount = r.rewards.filter(x => x.kind === 'pet').length
    gameNotifys({
      title: ten ? '十连抽结果' : '单抽结果',
      message: petCount ? `获得灵宠 ${petCount} 只，其余为杂物` : '本次未获得灵宠，但获得了杂物',
      type: petCount ? 'success' : 'info'
    })
  }
</script>

<style scoped>
  .pet-gacha { text-align: left; padding: 0 4px; }
  .page-header { margin-bottom: 12px; }
  .title { font-size: 22px; font-weight: bold; margin-bottom: 8px; }
  .resources { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
  .hint { font-size: 12px; color: var(--el-text-color-secondary); line-height: 1.7; }
  .pool-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .pool-card { margin: 0; }
  .pool-head { display: flex; align-items: center; gap: 8px; }
  .pool-name { font-weight: bold; color: var(--el-text-color-primary); }
  .pool-desc { font-size: 12px; color: var(--el-text-color-secondary); min-height: 36px; line-height: 1.6; }
  .pool-rate { font-size: 12px; color: var(--el-color-warning); margin: 8px 0; }
  .pool-pity { font-size: 12px; color: var(--el-color-primary); margin: -4px 0 8px; }
  .pool-cost { display: flex; flex-direction: column; gap: 3px; font-size: 12px; color: var(--el-text-color-secondary); margin-bottom: 10px; }
  .pool-ops { display: flex; gap: 8px; }
  .result-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
  .result-card { padding: 10px; border-radius: 10px; background: var(--el-fill-color-light); border: 1px solid var(--el-border-color-lighter); min-height: 86px; }
  .result-card.pet { border-color: var(--el-color-warning); background: rgba(230, 162, 60, 0.1); }
  .result-name { font-weight: bold; margin-top: 6px; color: var(--el-text-color-primary); }
  .result-sub { font-size: 11px; color: var(--el-text-color-secondary); margin-top: 3px; }
  @media only screen and (max-width: 768px) {
    .pool-grid { grid-template-columns: 1fr; }
    .title { font-size: 18px; }
    .pool-desc { min-height: 0; }
  }
</style>
