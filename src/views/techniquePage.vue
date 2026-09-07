<template>
  <div class="tech">
    <div class="page-header">
      <div class="title">功法阁 · <span class="realm" v-text="levelNames(player.level)" /></div>
      <div class="resources">
        <el-tag type="warning">灵石 {{ formatNumberToChineseUnit(player.props.money || 0) }}</el-tag>
        <el-tag type="primary">培养丹 {{ player.props.cultivateDan || 0 }}</el-tag>
        <el-tag v-if="mainInfo" type="danger">主修：{{ mainInfo.name }} · {{ profOf(methodChapter(player, player.mainMethod)) }} ({{ methodChapter(player, player.mainMethod) }}重)</el-tag>
        <el-button size="small" type="primary" plain @click="doSort">一键整理</el-button>
        <el-button size="small" type="warning" plain @click="doBatchSell">批量出售中低阶</el-button>
      </div>
    </div>

    <div class="filter-bar">
      <el-select v-model="gradeFilter" size="small" class="fselect">
        <el-option label="全部品阶" :value="0" />
        <el-option v-for="g in TECH_GRADES" :key="g.g" :label="g.name" :value="g.g" />
      </el-select>
      <el-select v-model="familyFilter" size="small" class="fselect">
        <el-option label="全部流派" value="all" />
        <el-option v-for="f in families" :key="f.key" :label="f.name" :value="f.key" />
      </el-select>
    </div>

    <div class="grid">
      <el-card v-for="t in displayList" :key="t.id" class="card" shadow="hover">
        <template #header>
          <div class="head">
            <tag :type="t.quality">{{ t.name }}</tag>
            <el-tag size="small" type="info" effect="plain">{{ t.familyName }}</el-tag>
          </div>
        </template>
        <p class="desc">{{ t.desc }}</p>
        <div class="passive">被动：{{ passiveText(t, methodChapter(player, t.id)) }}</div>
        <el-tooltip v-if="t.divine" :content="divineTip(t)" placement="top" :hide-after="0" popper-class="divine-tip">
          <div class="divine">神通：{{ t.divine.name }}（{{ t.type === 'active' ? '主动' : '被动' }}）</div>
        </el-tooltip>
        <div v-else class="divine">神通：无（被动）</div>
        <div class="req">{{ t.rarityName }} · {{ t.type === 'active' ? '战斗使用' : '辅修增益' }}</div>
        <el-progress v-if="mineTaskType(t.id)" :percentage="taskPercentOf(t.id)" :stroke-width="6" :show-text="false" class="tpbar2" />
        <div class="ops">
          <el-button v-if="methodChapter(player, t.id) <= 0 || !isLearned(t)" size="small" type="success" :disabled="taskBusy && !(mineTaskType(t.id) === 'learn')" @click="learn(t)">
            {{ mineTaskType(t.id) === 'learn' ? `参悟中 ${remainSecOf(t.id)}s` : '修习' }}
          </el-button>
          <template v-else>
            <el-button v-if="mineTaskType(t.id) === 'cultivate'" size="small" type="warning" disabled>修炼中 {{ remainSecOf(t.id) }}s</el-button>
            <el-button v-else size="small" type="primary" :disabled="taskBusy" @click="cultivate(t)">修炼 · {{ profName(profOfMethod(t.id)) }}({{ methodChapter(player, t.id) }}/{{ TECH_MAX_CHAPTER }})</el-button>
            <el-button size="small" type="danger" plain @click="upProf(t)" :disabled="profOfMethod(t.id) >= PROF_MAX || mineTaskType(t.id) === 'cultivate' || actionBusy">升熟练·{{ profName(profOfMethod(t.id)) }}</el-button>
            <el-button size="small" type="warning" plain @click="main(t)" :disabled="player.mainMethod === t.id">设主修</el-button>
            <el-button size="small" type="warning" plain :disabled="actionBusy" @click="doSell(t)">出售({{ techniqueSellPrice(player, t.id) }})</el-button>
            <el-button size="small" type="danger" plain :disabled="actionBusy" @click="doForget(t)">遗忘</el-button>
          </template>
        </div>
      </el-card>
    </div>

    <div class="outer-actions">
    </div>
  </div>
</template>

<script setup>
  import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
  import { useRouter } from 'vue-router'
  import { useMainStore } from '@/plugins/store'
  import { formatNumberToChineseUnit, levelNames, gameNotifys } from '@/plugins/game'
  import { ElMessageBox } from 'element-plus'
  import { beginAction, actionTask, canUpgradeProficiency } from '@/plugins/actionTimer'
  import {
    TECHNIQUES,
    TECH_GRADES,
    TECH_MAX_CHAPTER,
    profName,
    proficiencyOf,
    upgradeProficiency,
    PROF_MAX,
    methodChapter,
    learnTechnique,
    learnCost,
    cultivateTechnique,
    chapterCost,
    setMainMethod,
    techniqueById,
    techTask,
    tickTechniques,
    techTaskResultMessage,
    sellTechnique,
    forgetTechnique,
    techniqueSellPrice
  } from '@/plugins/technique'
  import { divineTipForTech } from '@/plugins/divine'

  const store = useMainStore()
  const router = useRouter()
  const player = ref(store.player)
  const gradeFilter = ref(0)
  const familyFilter = ref('all')

  const families = TECHNIQUES.filter((t, i, a) => a.findIndex(x => x.family === t.family) === i).map(t => ({ key: t.family, name: t.familyName }))
  const mainInfo = computed(() => (player.value.mainMethod ? techniqueById(player.value.mainMethod) : null))

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
  const activeTaskInfo = computed(() => {
    const task = techTask(player.value)
    if (!task) return null
    const total = task.duration || 1
    const remain = Math.max(0, task.start + total - nowTick.value)
    return { id: task.id, type: task.type, remain, total, percent: Math.min(100, Math.max(0, Math.round((1 - remain / total) * 100))) }
  })
  const taskBusy = computed(() => !!techTask(player.value))
  const actionBusy = computed(() => !!actionTask(player.value))
  const mineTaskType = id => (activeTaskInfo.value && activeTaskInfo.value.id === id ? activeTaskInfo.value.type : null)
  const remainSecOf = id => (activeTaskInfo.value && activeTaskInfo.value.id === id ? Math.max(1, Math.ceil(activeTaskInfo.value.remain / 1000)) : 0)
  const taskPercentOf = id => (activeTaskInfo.value && activeTaskInfo.value.id === id ? activeTaskInfo.value.percent : 0)

  const displayList = computed(() =>
    TECHNIQUES.filter(t => {
      if (gradeFilter.value && t.grade !== gradeFilter.value) return false
      if (familyFilter.value !== 'all' && t.family !== familyFilter.value) return false
      return true
    }).sort((a, b) => (b.grade - a.grade) || (b.rarity - a.rarity) || String(a.familyName).localeCompare(String(b.familyName)))
  )

  const isLearned = t => !!player.value.methods?.[t.id]
  const divineTip = t => divineTipForTech(player.value, t.id)
  const statName = s => ({ attack: '攻击', defense: '防御', health: '气血', critical: '暴击', dodge: '闪避', cultivationSpeed: '修炼速度', moneyMult: '灵石' }[s] || s)

  const passiveText = (t, ch) => {
    if (!ch) return `每重 ${t.per} ${statName(t.passive)}`
    const g = TECH_GRADES[t.grade - 1]?.mult || 1
    const v = t.per * ch * g
    const s = `${v}${t.passive === 'critical' || t.passive === 'dodge' ? '%' : ''} ${statName(t.passive)}`
    return `${s}${t.passive2 ? ` + ${(t.per2 * ch * g * 100).toFixed(1)}% ${statName(t.passive2)}` : ''}`
  }

  const learn = t => {
    const c = learnCost(player.value)
    const res = learnTechnique(player.value, t.id)
    if (res.ok) gameNotifys({ title: '功法阁', message: `开始参悟【${t.name}】，约 ${Math.round((res.duration || 0) / 1000)}s`, type: 'info' })
    else gameNotifys({ title: '功法阁', message: res.reason, type: 'error' })
  }
  const cultivate = t => {
    const res = cultivateTechnique(player.value, t.id)
    if (res.ok) gameNotifys({ title: '修炼功法', message: `开始修炼【${t.name}】，约 ${Math.round((res.duration || 0) / 1000)}s`, type: 'info' })
    else gameNotifys({ title: '修炼功法', message: res.reason, type: 'error' })
  }
  const profOfMethod = id => proficiencyOf(player.value, id)
  const upProf = t => {
    const res = beginAction(player.value, {
      kind: 'proficiency', id: t.id, name: t.name, data: { prof: profOfMethod(t.id) },
      can: () => canUpgradeProficiency(player.value, t.id)
    })
    if (res.ok) gameNotifys({ title: '熟练度', message: `开始磨练【${t.name}】，约 ${Math.round(res.duration / 1000)}s`, type: 'info' })
    else gameNotifys({ title: '熟练度', message: res.reason, type: 'warning' })
  }
  const main = t => {
    const res = setMainMethod(player.value, t.id)
    if (res.ok) gameNotifys({ title: '主修', message: `立【${t.name}】为主修`, type: 'success' })
    else gameNotifys({ title: '主修', message: res.reason, type: 'error' })
  }
  const doSell = t => {
    const price = techniqueSellPrice(player.value, t.id)
    ElMessageBox.confirm(`出售【${t.name}】将获得约 ${price} 灵石（八折）并彻底移除该功法（连同卷轴，不可再参悟），是否继续？`, '出售功法', { type: 'warning', confirmButtonText: '出售' })
      .then(() => {
        const r = sellTechnique(player.value, t.id)
        if (r.ok) gameNotifys({ title: '功法阁', message: `【${r.name}】售出，得 ${r.price} 灵石`, type: 'success' })
        else gameNotifys({ title: '功法阁', message: r.reason, type: 'warning' })
      })
      .catch(() => {})
  }
  const doForget = t => {
    ElMessageBox.confirm(`遗忘【${t.name}】将永久移除该功法（不返还灵石），是否继续？`, '遗忘功法', { type: 'warning', confirmButtonText: '遗忘' })
      .then(() => {
        const r = forgetTechnique(player.value, t.id)
        if (r.ok) gameNotifys({ title: '功法阁', message: `已遗忘【${r.name}】`, type: 'info' })
        else gameNotifys({ title: '功法阁', message: r.reason, type: 'warning' })
      })
      .catch(() => {})
  }
  const doSort = () => {
    gameNotifys({ title: '一键整理', message: '已按品阶从高到低整理（高阶在上）', type: 'success' })
  }
  const doBatchSell = () => {
    const LOW_GRADE = 5 // 中低阶：黄/玄/地/天/仙 (1~5)
    const entries = Object.entries(player.value.methods || {}).filter(([id]) => {
      const t = techniqueById(id)
      return t && t.grade <= LOW_GRADE
    })
    if (!entries.length) { gameNotifys({ title: '批量出售', message: '没有可出售的中低阶功法', type: 'info' }); return }
    const total = entries.reduce((s, [id]) => s + techniqueSellPrice(player.value, id), 0)
    ElMessageBox.confirm(`将出售 ${entries.length} 门中低阶（≤仙阶）功法，共得约 ${total} 灵石（八折，含卷轴一并移除不可再参悟），是否继续？`, '批量出售', { type: 'warning', confirmButtonText: '出售' })
      .then(() => {
        let sold = 0
        let gain = 0
        entries.forEach(([id]) => {
          const r = sellTechnique(player.value, id)
          if (r.ok) { sold++; gain += r.price }
        })
        gameNotifys({ title: '批量出售', message: `出售 ${sold} 门中低阶功法，获得 ${gain} 灵石`, type: 'success' })
      })
      .catch(() => {})
  }
</script>

<style scoped>
  .tech { text-align: left; padding: 0 4px; }
  .page-header { margin-bottom: 10px; }
  .title { font-size: 20px; font-weight: bold; margin-bottom: 8px; }
  .realm { color: var(--el-color-primary); }
  .resources { display: flex; flex-wrap: wrap; gap: 8px; }
  .filter-bar { display: flex; gap: 10px; margin-bottom: 10px; }
  .fselect { width: 150px; }
  .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
  .card { margin: 0; }
  .head { display: flex; justify-content: space-between; align-items: center; gap: 6px; }
  .desc { font-size: 12px; color: var(--el-text-color-secondary); margin: 2px 0 6px; }
  .passive { font-size: 12px; color: var(--el-color-success); margin-bottom: 2px; }
  .divine { font-size: 12px; color: var(--el-color-warning); margin-bottom: 2px; }
  .req { font-size: 11px; color: var(--el-text-color-placeholder); margin-bottom: 6px; }
  .ops { display: flex; flex-wrap: wrap; gap: 6px; }
  .tpbar2 { margin-bottom: 6px; }
  .outer-actions { margin-top: 16px; display: flex; justify-content: center; }
  @media only screen and (max-width: 768px) { .grid { grid-template-columns: 1fr; } }
</style>
