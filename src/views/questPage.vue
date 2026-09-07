<template>
  <div class="quest">
    <div class="page-header">
      <div class="title">任务 · <span class="realm" v-text="levelNames(player.level)" /></div>
      <div class="resources">
        <el-tag type="warning">灵石 {{ formatNumberToChineseUnit(player.props.money || 0) }}</el-tag>
        <el-tag type="primary">培养丹 {{ player.props.cultivateDan || 0 }}</el-tag>
        <el-tag type="danger">任务等级 {{ questLv }}</el-tag>
        <el-tag type="warning">连续 {{ streak }} 天</el-tag>
      </div>
      <div class="hint">固定任务为里程碑；自选任务最多同时 {{ MAX_SELECTED }} 个，完成后可换。</div>
      <div class="hint2">下方「玩法引导」覆盖全部功能模块，每项都有入口说明，新手照着点一遍即可上手。</div>
    </div>

    <div class="section-title">玩法引导 · 新手必看</div>
    <div class="guide-list">
      <div class="guide-row" v-for="m in guides" :key="m.key">
        <div class="guide-n"><b>{{ m.icon }} {{ m.name }}</b><span class="sub">{{ m.desc }}</span></div>
        <el-tag v-if="m.done === true" size="small" type="success">已体验</el-tag>
        <el-tag v-else-if="m.done === false" size="small" type="warning">待体验</el-tag>
        <el-tag v-else size="small" type="info">待探索</el-tag>
        <el-button size="small" type="primary" plain @click="go(m.route)">前往</el-button>
      </div>
    </div>

    <div class="section-title">固定任务</div>
    <div class="fixed-list">
      <div class="fix-row" v-for="f in activeFixed" :key="f.id">
        <div class="fix-n"><b>{{ f.name }}</b><span class="sub">{{ f.desc }}</span></div>
        <div class="fix-reward">{{ rewardText(f.reward) }}</div>
        <el-button v-if="!f.claimed && f.done" size="small" type="success" @click="claimF(f)">领取</el-button>
        <el-tag v-else-if="f.claimed" size="small" type="info">已领取</el-tag>
        <el-tag v-else size="small" type="warning">进行中</el-tag>
      </div>
    </div>
    <div v-if="doneFixed.length" class="section-title">已完成任务（{{ doneFixed.length }}）</div>
    <div class="fixed-list done-list" v-if="doneFixed.length">
      <div class="fix-row" v-for="f in doneFixed" :key="f.id">
        <div class="fix-n"><b>{{ f.name }}</b><span class="sub">{{ f.desc }}</span></div>
        <div class="fix-reward">{{ rewardText(f.reward) }}</div>
        <el-tag size="small" type="info">已领取</el-tag>
      </div>
    </div>

    <div class="section-title">自选任务（已选 {{ selectedCount }}/{{ MAX_SELECTED }}）</div>
    <div class="sel-list">
      <div class="sel-row" v-for="s in selList" :key="s.id">
        <div class="sel-n"><b>{{ s.name }}</b><span class="sub">{{ s.desc }}</span></div>
        <el-progress :percentage="pct(s)" class="sel-bar" :status="s.progress >= s.target ? 'success' : ''" :show-text="false" />
        <span class="sel-progress">{{ s.progress }}/{{ s.target }}</span>
        <el-button v-if="s.progress >= s.target" size="small" type="success" @click="claimS(s)">领取</el-button>
        <el-button v-else size="small" type="info" plain @click="unselect(s)">放弃</el-button>
      </div>
    </div>

    <div class="section-title">可选任务池</div>
    <div class="pool-list">
      <div class="pool-row" v-for="s in poolList" :key="s.id">
        <div class="pool-n"><b>{{ s.name }}</b><span class="sub">{{ s.desc }}</span></div>
        <span class="pool-reward">{{ rewardText(s.reward) }}</span>
        <el-button v-if="s.claimed" size="small" type="info" plain disabled>已领取</el-button>
        <el-button v-else size="small" type="primary" :disabled="!canSelect || s.selected" @click="pick(s)">选择</el-button>
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
  import { formatNumberToChineseUnit, levelNames, gameNotifys } from '@/plugins/game'
  import {
    MAX_SELECTED,
    fixedQuests,
    claimFixed,
    selectableQuests,
    canSelectQuest,
    selectQuest,
    unselectQuest,
    claimSelected,
    questLevel,
    questStreak
  } from '@/plugins/quest'
  import { moduleGuides } from '@/plugins/guide'

  const store = useMainStore()
  const router = useRouter()
  const player = ref(store.player)

  const fixedList = computed(() => fixedQuests(player.value))
  const activeFixed = computed(() => fixedList.value.filter(f => !f.claimed))
  const doneFixed = computed(() => fixedList.value.filter(f => f.claimed))
  const poolList = computed(() => selectableQuests(player.value))
  const selList = computed(() => selectableQuests(player.value).filter(s => s.selected))
  const selectedCount = computed(() => selList.value.length)
  const canSelect = computed(() => canSelectQuest(player.value))
  const questLv = computed(() => questLevel(player.value))
  const streak = computed(() => questStreak(player.value))
  const guides = computed(() => moduleGuides(player.value))
  const go = r => router.push(r)

  const rewardText = r =>
    Object.entries(r)
      .map(([k, v]) => `${({ money: '灵石', cultivateDan: '培养丹', strengtheningStone: '炼器石', currency: '混沌石', spiritHerb: '灵草' }[k] || k)}×${v}`)
      .join('、')
  const pct = s => Math.min(100, Math.floor((s.progress / s.target) * 100))

  const claimF = f => {
    const r = claimFixed(player.value, f.id)
    if (r.ok) gameNotifys({ title: '任务完成', message: `获得 ${rewardText(r.reward)}`, type: 'success' })
    else gameNotifys({ title: '任务', message: r.reason, type: 'error' })
  }
  const claimS = s => {
    const r = claimSelected(player.value, s.id)
    if (r.ok) gameNotifys({ title: '自选完成', message: `获得 ${rewardText(r.reward)}`, type: 'success' })
    else gameNotifys({ title: '自选', message: r.reason, type: 'error' })
  }
  const pick = s => {
    const r = selectQuest(player.value, s.id)
    if (r.ok) gameNotifys({ title: '任务', message: `已选择【${s.name}】`, type: 'success' })
    else gameNotifys({ title: '任务', message: r.reason, type: 'error' })
  }
  const unselect = s => {
    unselectQuest(player.value, s.id)
    gameNotifys({ title: '任务', message: `已放弃【${s.name}】`, type: 'info' })
  }
</script>

<style scoped>
  .quest { text-align: left; padding: 0 4px; }
  .page-header { margin-bottom: 10px; }
  .title { font-size: 20px; font-weight: bold; margin-bottom: 8px; }
  .realm { color: var(--el-color-primary); }
  .resources { display: flex; gap: 8px; margin-bottom: 6px; }
  .hint { font-size: 12px; color: var(--el-text-color-secondary); }
  .hint2 { font-size: 12px; color: var(--el-color-warning); margin-top: 4px; }
  .section-title { font-size: 15px; font-weight: bold; margin: 14px 0 8px; }
  .fixed-list, .sel-list, .pool-list { display: flex; flex-direction: column; gap: 6px; }
  .guide-list { display: flex; flex-direction: column; gap: 6px; }
  .guide-row { display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-radius: 8px; background: var(--el-fill-color-light); flex-wrap: wrap; }
  .guide-n { display: flex; flex-direction: column; flex: 1; min-width: 210px; }
  .fix-row, .sel-row, .pool-row { display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-radius: 4px; background: var(--el-fill-color-light); }
  .fix-n, .sel-n, .pool-n { display: flex; flex-direction: column; flex: 1; }
  .sub { font-size: 12px; color: var(--el-text-color-secondary); }
  .fix-reward, .pool-reward { font-size: 12px; color: var(--el-color-warning); min-width: 140px; }
  .done-list .fix-row { opacity: 0.5; }
  .sel-bar { width: 160px; }
  .sel-progress { font-size: 12px; min-width: 56px; }
  .outer-actions { margin-top: 16px; display: flex; justify-content: center; }
</style>
