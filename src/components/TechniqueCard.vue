<template>
  <el-card class="tcard" shadow="never">
    <div class="thead">
      <el-tag :type="qType" size="small" effect="dark">{{ t.name }}</el-tag>
      <span class="ttype">{{ t.type === 'active' ? '主动' : '被动' }}</span>
    </div>
    <div class="tmeta">{{ t.familyName }} · {{ t.rarityName }} · {{ t.gradeName }}</div>
    <div class="tstat">{{ passiveText }}</div>
    <el-tooltip v-if="t.divine" :content="divineTip" placement="top" :hide-after="0" popper-class="divine-tip">
      <div class="tdivine">神通：{{ t.divine.name }}</div>
    </el-tooltip>

    <!-- 已习得 -->
    <div v-if="learned" class="tops">
      <div class="tinfo">第 {{ chapter }}/{{ TECH_MAX_CHAPTER }} 重 · {{ profName(proficiency) }}</div>
      <el-progress v-if="isCultivateMine" :percentage="myTask.percent" :stroke-width="6" :show-text="false" class="tpbar" />
      <div class="tbtns">
        <el-button v-if="isCultivateMine" size="small" type="warning" disabled>修炼中 {{ remainSec }}s</el-button>
        <el-button v-else size="small" type="primary" @click="cultivate" :disabled="taskBusy">修炼</el-button>
        <el-button size="small" type="warning" plain @click="upProf" :disabled="proficiency >= PROF_MAX || isCultivateMine || actionBusy">升熟练</el-button>
        <el-button v-if="t.type === 'active'" size="small" type="danger" plain @click="main" :disabled="isMain">主修</el-button>
        <el-button size="small" :type="onField ? 'success' : 'info'" plain @click="toggleField">
          {{ onField ? '卸下' : (t.type === 'active' ? '上阵' : '辅修') }}
        </el-button>
        <el-button size="small" type="warning" plain @click="doSell">出售({{ techniqueSellPrice(player, t.id) }})</el-button>
        <el-button size="small" type="danger" plain @click="doForget">遗忘</el-button>
      </div>
    </div>

    <!-- 仅卷轴 -->
    <div v-else-if="hasScroll" class="tops">
      <div class="tinfo">已得卷轴 · 可参悟；成功率 {{ (rate * 100).toFixed(1) }}%</div>
      <el-progress v-if="isLearnMine" :percentage="myTask.percent" :stroke-width="6" :show-text="false" class="tpbar" />
      <div class="tbtns">
        <el-button v-if="isLearnMine" size="small" type="success" disabled>参悟中 {{ remainSec }}s</el-button>
        <el-button v-else size="small" type="success" @click="learn" :disabled="taskBusy">参悟（{{ costText }}）</el-button>
      </div>
    </div>

    <div v-else class="tops">
      <el-empty :image-size="0" description="未获得" style="padding: 4px 0" />
    </div>
  </el-card>
</template>

<script setup>
  import { computed } from 'vue'
  import { gameNotifys } from '@/plugins/game'
  import { formatNumberToChineseUnit } from '@/plugins/game'
  import { ElMessageBox } from 'element-plus'
  import { beginAction, actionTask, canUpgradeProficiency } from '@/plugins/actionTimer'
  import {
    TECH_GRADES,
    TECH_MAX_CHAPTER,
    PROF_MAX,
    profName,
    proficiencyOf,
    methodChapter,
    hasScroll,
    learnTechnique,
    learnCost,
    learnSuccessRate,
    cultivateTechnique,
    chapterCost,
    upgradeProficiency,
    setMainMethod,
    toggleTechniqueSet,
    techniqueActive,
    techniquePassive,
    techTask,
    sellTechnique,
    forgetTechnique,
    techniqueSellPrice,
    statName
  } from '@/plugins/technique'
  import { divineTipForTech } from '@/plugins/divine'

  const props = defineProps({ t: Object, player: Object, active: { type: Object, default: null } })
  const t = computed(() => props.t)
  const player = computed(() => props.player)

  const learned = computed(() => !!player.value.methods?.[t.value.id])
  const chapter = computed(() => methodChapter(player.value, t.value.id))
  const proficiency = computed(() => proficiencyOf(player.value, t.value.id))
  const isMain = computed(() => player.value.mainMethod === t.value.id)
  const rate = computed(() => learnSuccessRate(player.value, t.value.id))
  const cost = computed(() => learnCost(player.value))
  const costText = computed(() => `${formatNumberToChineseUnit(cost.value.money)}灵${cost.value.dan ? `+${cost.value.dan}丹` : ''}`)
  const onField = computed(() => (t.value.type === 'active' ? techniqueActive(player.value).includes(t.value.id) : techniquePassive(player.value).includes(t.value.id)))

  const taskBusy = computed(() => !!techTask(player.value))
  const actionBusy = computed(() => !!actionTask(player.value))
  const myTask = computed(() => (props.active && props.active.id === t.value.id ? props.active : null))
  const isLearnMine = computed(() => myTask.value && myTask.value.type === 'learn')
  const isCultivateMine = computed(() => myTask.value && myTask.value.type === 'cultivate')
  const remainSec = computed(() => myTask.value ? Math.max(1, Math.ceil(myTask.value.remain / 1000)) : 0)

  const qType = computed(() => ({ info: 'info', success: 'success', primary: 'primary', purple: 'primary', pink: 'warning', warning: 'warning', danger: 'danger', cyan: 'info', orange: 'warning', gold: 'warning', legendary: 'danger' }[t.value.quality] || 'info'))

  const passiveText = computed(() => {
    const g = TECH_GRADES[t.value.grade - 1]?.mult || 1
    const fmtStat = (k, per) => {
      const base = chapter.value ? per * chapter.value * g : per
      if (k === 'critical' || k === 'dodge') return `+${(base * 100).toFixed(2)}% ${statName(k)}`
      if (k === 'cultivationSpeed' || k === 'moneyMult') return `+${base > 0 ? base.toFixed(2) : base} ${statName(k)}`
      return `+${Math.round(base)} ${statName(k)}`
    }
    const parts = [fmtStat(t.value.passive, t.value.per)]
    if (t.value.passive2) parts.push(fmtStat(t.value.passive2, t.value.per2))
    return chapter.value ? parts.join('，') : `每重 +${parts.join('，')}`
  })
  const divineTip = computed(() => divineTipForTech(player.value, t.value.id))

  const learn = () => {
    const r = learnTechnique(player.value, t.value.id)
    if (r.ok) gameNotifys({ title: '参悟', message: `开始参悟【${t.value.name}】，约 ${Math.round((r.duration || 0) / 1000)}s`, type: 'info' })
    else gameNotifys({ title: '参悟', message: r.reason, type: 'error' })
  }
  const cultivate = () => {
    const r = cultivateTechnique(player.value, t.value.id)
    if (r.ok) gameNotifys({ title: '修炼', message: `开始修炼【${t.value.name}】，约 ${Math.round((r.duration || 0) / 1000)}s`, type: 'info' })
    else gameNotifys({ title: '修炼', message: r.reason, type: 'warning' })
  }
  const upProf = () => {
    const r = beginAction(player.value, {
      kind: 'proficiency', id: t.value.id, name: t.value.name,
      data: { prof: proficiency.value },
      can: () => canUpgradeProficiency(player.value, t.value.id)
    })
    if (r.ok) gameNotifys({ title: '熟练', message: `开始磨练【${t.value.name}】，约 ${Math.round(r.duration / 1000)}s`, type: 'info' })
    else gameNotifys({ title: '熟练', message: r.reason, type: 'warning' })
  }
  const main = () => {
    const r = setMainMethod(player.value, t.value.id)
    if (r.ok) gameNotifys({ title: '主修', message: `立【${t.value.name}】为主修`, type: 'success' })
    else gameNotifys({ title: '主修', message: r.reason, type: 'error' })
  }
  const toggleField = () => {
    const r = toggleTechniqueSet(player.value, t.value.id)
    if (r.ok) gameNotifys({ title: '功法', message: `${t.value.type === 'active' ? '上阵' : '辅修'}${r.on ? '成功' : '已卸下'}`, type: r.on ? 'success' : 'info' })
    else gameNotifys({ title: '功法', message: r.reason, type: 'warning' })
  }
  const doSell = () => {
    const price = techniqueSellPrice(player.value, t.value.id)
    ElMessageBox.confirm(`出售【${t.value.name}】将获得约 ${price} 灵石（八折）并彻底移除该功法（连同卷轴，不可再参悟），是否继续？`, '出售功法', { type: 'warning', confirmButtonText: '出售' })
      .then(() => {
        const r = sellTechnique(player.value, t.value.id)
        if (r.ok) gameNotifys({ title: '出售功法', message: `【${r.name}】售出，得 ${r.price} 灵石`, type: 'success' })
        else gameNotifys({ title: '出售功法', message: r.reason, type: 'warning' })
      })
      .catch(() => {})
  }
  const doForget = () => {
    ElMessageBox.confirm(`遗忘【${t.value.name}】将永久移除该功法（不返还灵石），是否继续？`, '遗忘功法', { type: 'warning', confirmButtonText: '遗忘' })
      .then(() => {
        const r = forgetTechnique(player.value, t.value.id)
        if (r.ok) gameNotifys({ title: '遗忘功法', message: `已遗忘【${r.name}】`, type: 'info' })
        else gameNotifys({ title: '遗忘功法', message: r.reason, type: 'warning' })
      })
      .catch(() => {})
  }
</script>

<style scoped>
  .tcard { margin-bottom: 8px; }
  .thead { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
  .ttype { font-size: 12px; color: var(--el-text-color-placeholder); }
  .tmeta { font-size: 12px; color: var(--el-text-color-secondary); margin-bottom: 2px; }
  .tstat { font-size: 12px; color: var(--el-color-success); margin-bottom: 2px; }
  .tdivine { font-size: 12px; color: var(--el-color-warning); margin-bottom: 4px; }
  .tops { margin-top: 4px; }
  .tinfo { font-size: 12px; color: var(--el-text-color-secondary); margin-bottom: 6px; }
  .tbtns { display: flex; flex-wrap: wrap; gap: 6px; }
  .tpbar { margin-bottom: 6px; }
</style>
