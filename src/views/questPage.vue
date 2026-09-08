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
    </div>

    <el-tabs v-model="tab" stretch class="quest-tabs">
      <el-tab-pane :label="'进行中 ' + selectedCount + '/' + MAX_SELECTED" name="sel">
        <div class="list-body">
          <div class="sel-row" v-for="s in selItems" :key="s.id">
            <div class="n"><b>{{ s.name }}</b><span class="sub">{{ s.desc }}</span></div>
            <el-progress :percentage="pct(s)" class="bar" :status="s.progress >= s.target ? 'success' : ''" :show-text="false" />
            <span class="prog">{{ s.progress }}/{{ s.target }}</span>
            <el-button v-if="s.progress >= s.target" size="small" type="success" @click="claimS(s)">领取</el-button>
            <el-button v-else size="small" type="info" plain @click="unselect(s)">放弃</el-button>
          </div>
          <el-empty v-if="!selList.length" description="尚未接取自选任务，去「任务池」挑选" :image-size="60" />
        </div>
        <PageNav :page="selPage" :total="selTotal" @change="setSelPage" />
      </el-tab-pane>

      <el-tab-pane label="任务池" name="pool">
        <div class="list-body">
          <div class="pool-row" v-for="s in poolItems" :key="s.id">
            <div class="n"><b>{{ s.name }}</b><span class="sub">{{ s.desc }}</span></div>
            <span class="reward">{{ rewardText(s.reward) }}</span>
            <el-button v-if="s.claimed" size="small" type="info" plain disabled>已领取</el-button>
            <el-button v-else size="small" type="primary" :disabled="!canSelect || s.selected" @click="pick(s)">{{ s.selected ? '已选' : '选择' }}</el-button>
          </div>
        </div>
        <PageNav :page="poolPage" :total="poolTotal" @change="setPoolPage" />
      </el-tab-pane>

      <el-tab-pane :label="'固定任务 ' + doneFixed.length + '/' + fixedList.length" name="fixed">
        <div class="list-body">
          <div class="fix-row" v-for="f in fixedItems" :key="f.id" :class="{ done: f.claimed }">
            <div class="n"><b>{{ f.name }}</b><span class="sub">{{ f.desc }}</span></div>
            <div class="reward">{{ rewardText(f.reward) }}</div>
            <el-button v-if="!f.claimed && f.done" size="small" type="success" @click="claimF(f)">领取</el-button>
            <el-tag v-else-if="f.claimed" size="small" type="info">已领取</el-tag>
            <el-tag v-else size="small" type="warning">进行中</el-tag>
          </div>
        </div>
        <PageNav :page="fixedPage" :total="fixedTotal" @change="setFixedPage" />
      </el-tab-pane>

      <el-tab-pane label="玩法引导" name="guide">
        <div class="list-body">
          <div class="guide-row" v-for="m in guideItems" :key="m.key">
            <div class="n"><b>{{ m.icon }} {{ m.name }}</b><span class="sub">{{ m.desc }}</span></div>
            <el-tag v-if="m.done === true" size="small" type="success">已体验</el-tag>
            <el-tag v-else-if="m.done === false" size="small" type="warning">待体验</el-tag>
            <el-tag v-else size="small" type="info">待探索</el-tag>
            <el-button size="small" type="primary" plain @click="go(m.route)">前往</el-button>
          </div>
        </div>
        <PageNav :page="guidePage" :total="guideTotal" @change="setGuidePage" />
      </el-tab-pane>
    </el-tabs>
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
  import { usePager, useViewportPageSize } from '@/plugins/pager'
  import PageNav from '@/components/PageNav.vue'

  const store = useMainStore()
  const router = useRouter()
  const player = ref(store.player)
  const tab = ref('sel')

  const fixedList = computed(() => fixedQuests(player.value))
  const activeFixed = computed(() => fixedList.value.filter(f => !f.claimed))
  const doneFixed = computed(() => fixedList.value.filter(f => f.claimed))
  const fixedSorted = computed(() => [...activeFixed.value, ...doneFixed.value])
  const poolList = computed(() => selectableQuests(player.value))
  const selList = computed(() => selectableQuests(player.value).filter(s => s.selected))
  const selectedCount = computed(() => selList.value.length)
  const canSelect = computed(() => canSelectQuest(player.value))
  const questLv = computed(() => questLevel(player.value))
  const streak = computed(() => questStreak(player.value))
  const guides = computed(() => moduleGuides(player.value))

  const qSize = useViewportPageSize(100, 8)
  const { page: selPage, total: selTotal, pageItems: selItems, setPage: setSelPage } = usePager(selList, qSize)
  const { page: poolPage, total: poolTotal, pageItems: poolItems, setPage: setPoolPage } = usePager(poolList, qSize)
  const { page: fixedPage, total: fixedTotal, pageItems: fixedItems, setPage: setFixedPage } = usePager(fixedSorted, qSize)
  const { page: guidePage, total: guideTotal, pageItems: guideItems, setPage: setGuidePage } = usePager(guides, qSize)

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
  .page-header { margin-bottom: 8px; }
  .title { font-size: 20px; font-weight: bold; margin-bottom: 6px; }
  .realm { color: var(--el-color-primary); }
  .resources { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 6px; }
  .hint { font-size: 12px; color: var(--el-text-color-secondary); }
  .list-body { display: flex; flex-direction: column; gap: 6px; min-height: 0; }
  .guide-row, .fix-row, .sel-row, .pool-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border-radius: 8px;
    background: var(--el-fill-color-light);
    flex-wrap: wrap;
  }
  .n { display: flex; flex-direction: column; flex: 1; min-width: 150px; }
  .sub { font-size: 12px; color: var(--el-text-color-secondary); }
  .reward { font-size: 12px; color: var(--el-color-warning); }
  .bar { width: 120px; }
  .prog { font-size: 12px; min-width: 46px; color: var(--el-text-color-secondary); }
  .fix-row.done { opacity: 0.55; }

  @media only screen and (max-width: 768px) {
    .quest {
      height: 100%;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      padding: 0 2px;
    }
    .page-header { flex: 0 0 auto; }
    .hint { display: none; }
    .resources { gap: 4px; }
    .quest-tabs {
      flex: 1 1 auto;
      min-height: 0;
      display: flex;
      flex-direction: column;
    }
    .quest-tabs :deep(.el-tabs__header) { margin: 0; }
    .quest-tabs :deep(.el-tabs__content) {
      flex: 1 1 auto;
      min-height: 0;
      overflow: hidden;
    }
    .quest-tabs :deep(.el-tab-pane) {
      height: 100%;
      display: flex;
      flex-direction: column;
    }
    .list-body { flex: 1 1 auto; min-height: 0; overflow: hidden; }
    .sel-row, .pool-row, .guide-row { padding: 6px 8px; gap: 6px; }
    .n { min-width: 0; }
    .bar { width: 80px; }
  }
</style>
