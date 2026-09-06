<template>
  <div class="ascend">
    <div class="page-header">
      <div class="title">界域飞升 · <span class="realm" v-text="current.name" />（{{ stageOf(player) }}/3）</div>
      <div class="resources">
        <el-tag type="danger">混沌石 {{ player.props.currency || 0 }}</el-tag>
        <el-tag type="warning">境界 {{ levelNames(player.level) }}</el-tag>
      </div>
    </div>

    <div class="summary">
      <div class="section-title">当前界域加成</div>
      <div class="tags">
        <el-tag v-for="b in bonusTags" :key="b.text" size="small" type="success" effect="plain">{{ b.text }}</el-tag>
      </div>
    </div>

    <div class="section-title">界域阶梯</div>
    <div class="ladder">
      <div
        class="slot"
        v-for="(s, i) in ASCENSION_STAGES"
        :key="s.stage"
        :class="{ current: i === stageOf(player), next: i === stageOf(player) + 1, locked: i > stageOf(player) + 1 }"
      >
        <div class="slot-head">
          <span class="slot-name">{{ s.name }}</span>
          <el-tag size="small" :type="i === stageOf(player) ? 'success' : i === stageOf(player) + 1 ? 'warning' : 'info'" effect="dark">
            {{ i < stageOf(player) ? '已飞升' : i === stageOf(player) ? '当前' : i <= stageOf(player) ? '' : '未达' }}
          </el-tag>
        </div>
        <div class="slot-desc">{{ s.desc }}</div>
        <div class="slot-unlock">解锁：{{ s.unlocks.join(' / ') }}</div>
        <div v-if="bonusText(s)" class="slot-bonus">加成 {{ bonusText(s) }}</div>
        <el-button
          v-if="i === stageOf(player) + 1"
          class="ascend-btn"
          size="small"
          type="primary"
          @click="doAscend"
          :disabled="!canAscend.ok"
        >
          飞升试炼（{{ canAscend.ok ? '可飞升' : canAscend.reason }}）
        </el-button>
      </div>
    </div>

    <div class="outer-actions">
    </div>
  </div>
</template>

<script setup>
  import { ref, computed } from 'vue'
  import { useRouter } from 'vue-router'
  import { useMainStore } from '@/plugins/store'
  import { levelNames, gameNotifys } from '@/plugins/game'
  import { ASCENSION_STAGES, stageOf, stageInfo, nextStage, canAscend as canAscendCheck, ascendRealm, realmBonus } from '@/plugins/ascension'
  import { celebrate } from '@/plugins/celebrate'

  const store = useMainStore()
  const router = useRouter()
  const player = ref(store.player)

  const current = computed(() => stageInfo(stageOf(player.value)))
  const canAscend = computed(() => canAscendCheck(player.value))

  const bonusTags = computed(() => {
    const b = realmBonus(player.value)
    const out = []
    if (b.attack) out.push({ text: `攻击 +${(b.attack * 100).toFixed(1)}%` })
    if (b.defense) out.push({ text: `防御 +${(b.defense * 100).toFixed(1)}%` })
    if (b.cultivationSpeed) out.push({ text: `修炼 +${(b.cultivationSpeed * 100).toFixed(1)}%` })
    if (b.moneyMult) out.push({ text: `灵石 +${(b.moneyMult * 100).toFixed(1)}%` })
    if (b.critical) out.push({ text: `暴击 +${(b.critical * 100).toFixed(1)}%` })
    if (b.dodge) out.push({ text: `闪避 +${(b.dodge * 100).toFixed(1)}%` })
    if (b.effectBoost) out.push({ text: `特效 +${(b.effectBoost * 100).toFixed(1)}%` })
    return out
  })

  const bonusText = s => {
    const b = s.bonus || {}
    const parts = []
    if (b.attack) parts.push(`攻+${(b.attack * 100).toFixed(0)}%`)
    if (b.defense) parts.push(`防+${(b.defense * 100).toFixed(0)}%`)
    if (b.cultivationSpeed) parts.push(`修+${(b.cultivationSpeed * 100).toFixed(0)}%`)
    if (b.moneyMult) parts.push(`灵+${(b.moneyMult * 100).toFixed(0)}%`)
    if (b.critical) parts.push(`暴+${(b.critical * 100).toFixed(0)}%`)
    if (b.dodge) parts.push(`闪+${(b.dodge * 100).toFixed(0)}%`)
    if (b.effectBoost) parts.push(`效+${(b.effectBoost * 100).toFixed(0)}%`)
    return parts.join(' ')
  }

  const doAscend = () => {
    const res = ascendRealm(player.value)
    if (res.ok) {
      celebrate(`飞升【${res.name}】`)
      gameNotifys({ title: '界域飞升', message: `飞升【${res.name}】！获得界域加成`, type: 'success' })
    }
    else gameNotifys({ title: '界域飞升', message: res.reason, type: 'error' })
  }
</script>

<style scoped>
  .ascend { text-align: left; padding: 0 4px; }
  .page-header { margin-bottom: 10px; }
  .title { font-size: 20px; font-weight: bold; margin-bottom: 8px; }
  .realm { color: var(--el-color-primary); }
  .resources { display: flex; gap: 8px; }
  .section-title { font-size: 15px; font-weight: bold; margin: 14px 0 8px; }
  .summary { background: var(--el-fill-color-light); border-radius: 6px; padding: 8px 12px; }
  .tags { display: flex; flex-wrap: wrap; gap: 6px; }
  .ladder { display: flex; flex-direction: column; gap: 10px; }
  .slot { border: 1px solid var(--el-border-color-lighter); border-radius: 6px; padding: 10px 12px; background: var(--el-fill-color-light); }
  .slot.current { border-color: var(--el-color-success); background: var(--el-color-success-light-9); }
  .slot.next { border-color: var(--el-color-warning); background: var(--el-color-warning-light-9); }
  .slot.locked { opacity: 0.55; }
  .slot-head { display: flex; justify-content: space-between; align-items: center; }
  .slot-name { font-size: 16px; font-weight: bold; }
  .slot-desc { font-size: 12px; color: var(--el-text-color-secondary); margin: 4px 0; }
  .slot-unlock { font-size: 12px; color: var(--el-text-color-secondary); }
  .slot-bonus { font-size: 12px; color: var(--el-color-success); margin: 4px 0; }
  .ascend-btn { margin-top: 6px; }
  .outer-actions { margin-top: 16px; display: flex; justify-content: center; }
</style>
