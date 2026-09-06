<template>
  <div class="formation">
    <div class="page-header">
      <div class="title">阵法 · <span class="realm" v-text="levelNames(player.level)" /></div>
      <div class="resources">
        <el-tag v-for="res in resourceList" :key="res.key" :type="res.type" effect="plain" class="res-tag">
          {{ res.name }}: {{ formatNumberToChineseUnit(res.value) }}
        </el-tag>
      </div>
    </div>

    <div class="summary">
      <div class="section-title">当前阵法加持</div>
      <div class="summary-tags">
        <el-tag v-for="s in summaryList" :key="s.k" size="small" type="success" effect="plain">{{ s.text }}</el-tag>
      </div>
    </div>

    <div class="section-title">大阵库 · 共 {{ totalFormations }} 座</div>
    <div class="filter-bar">
      <el-radio-group v-model="groupFilter" size="small">
        <el-radio-button value="all">全部</el-radio-button>
        <el-radio-button v-for="g in FORMATION_GROUPS" :key="g.key" :value="g.key">{{ g.name }}</el-radio-button>
      </el-radio-group>
      <el-select v-model="tierFilter" size="small" placeholder="品阶" class="tier-select">
        <el-option label="全部品阶" :value="0" />
        <el-option v-for="t in FORMATION_TIERS" :key="t.t" :label="t.name" :value="t.t" />
      </el-select>
    </div>

    <div class="grid">
      <el-card v-for="f in displayList" :key="f.id" class="card" shadow="hover">
        <template #header>
          <div class="card-head">
            <span class="icon">{{ f.icon }}</span>
            <span class="name">{{ f.name }}</span>
            <tag :type="f.quality">{{ f.tierName }}</tag>
            <el-tag size="small" :type="f.level >= f.maxLevel ? 'success' : 'primary'" effect="dark">
              {{ f.level }} / {{ f.maxLevel }}
            </el-tag>
          </div>
        </template>
        <div class="group-line">
          <el-tag size="small" type="info" effect="plain">{{ f.groupName }}</el-tag>
          <span class="unlock">需 {{ levelNames(f.minLevel) }}</span>
        </div>
        <p class="desc">{{ f.desc }}</p>
        <p class="effect">{{ f.effectText }}</p>
        <div class="cost" v-if="f.level < f.maxLevel">
          <el-tag size="small" type="warning">灵石 {{ formatNumberToChineseUnit(f.cost.money) }}</el-tag>
          <el-tag size="small" type="danger" v-if="f.cost.stone">炼器石 {{ f.cost.stone }}</el-tag>
          <el-tag size="small" type="success" v-if="f.cost.herb">灵草 {{ f.cost.herb }}</el-tag>
          <el-tag size="small" type="primary" v-if="f.cost.dan">培养丹 {{ f.cost.dan }}</el-tag>
        </div>
        <el-button class="up-btn" type="primary" :disabled="!f.canUpgrade" @click="upgrade(f)" v-if="f.level < f.maxLevel">
          布阵
        </el-button>
        <el-tag class="up-btn" type="success" effect="plain" v-else>已至大圆满</el-tag>
      </el-card>
    </div>

    <div class="actions">
    </div>
  </div>
</template>

<script setup>
  import { ref, computed } from 'vue'
  import { useRouter } from 'vue-router'
  import { useMainStore } from '@/plugins/store'
  import { formatNumberToChineseUnit, levelNames, gameNotifys } from '@/plugins/game'
  import {
    FORMATION_GROUPS,
    FORMATION_TIERS,
    formationSummary,
    formationStats,
    upgradeFormation
  } from '@/plugins/formation'

  const store = useMainStore()
  const router = useRouter()
  const player = ref(store.player)
  const groupFilter = ref('all')
  const tierFilter = ref(1)
  const totalFormations = FORMATION_GROUPS.length * FORMATION_TIERS.length

  const resourceList = computed(() => {
    const p = player.value.props || {}
    return [
      { key: 'money', name: '灵石', value: p.money || 0, type: 'warning' },
      { key: 'strengtheningStone', name: '炼器石', value: p.strengtheningStone || 0, type: 'danger' },
      { key: 'spiritHerb', name: '灵草', value: p.spiritHerb || 0, type: 'success' },
      { key: 'cultivateDan', name: '培养丹', value: p.cultivateDan || 0, type: 'primary' }
    ]
  })

  const summaryList = computed(() => {
    const s = formationStats(player.value)
    const out = []
    if (s.attack) out.push({ k: 'atk', text: `攻击 +${(s.attack * 100).toFixed(1)}%` })
    if (s.defense) out.push({ k: 'def', text: `防御 +${(s.defense * 100).toFixed(1)}%` })
    if (s.critical) out.push({ k: 'crit', text: `暴击 +${(s.critical * 100).toFixed(1)}%` })
    if (s.dodge) out.push({ k: 'dodge', text: `闪避 +${(s.dodge * 100).toFixed(1)}%` })
    if (s.cultivationSpeed) out.push({ k: 'cult', text: `修炼 +${(s.cultivationSpeed * 100).toFixed(1)}%` })
    if (s.moneyMult) out.push({ k: 'money', text: `灵石 +${(s.moneyMult * 100).toFixed(1)}%` })
    if (s.offlineMult) out.push({ k: 'offl', text: `离线 +${(s.offlineMult * 100).toFixed(1)}%` })
    if (s.effectBoost) out.push({ k: 'eff', text: `特效 +${(s.effectBoost * 100).toFixed(1)}%` })
    return out
  })

  const displayList = computed(() => {
    const all = formationSummary(player.value)
    return all.filter(
      f => (groupFilter.value === 'all' || f.group === groupFilter.value) && (!tierFilter.value || f.tier === tierFilter.value)
    )
  })

  const upgrade = f => {
    const res = upgradeFormation(player.value, f.id)
    if (res.ok) gameNotifys({ title: '布局阵法', message: `【${f.name}】升至 ${res.level} 重`, type: 'success' })
    else gameNotifys({ title: '布局阵法', message: res.reason, type: 'error' })
  }
</script>

<style scoped>
  .formation { text-align: left; padding: 0 4px; }
  .page-header { margin-bottom: 12px; }
  .title { font-size: 22px; font-weight: bold; margin-bottom: 10px; }
  .realm { color: var(--el-color-primary); }
  .resources { display: flex; flex-wrap: wrap; gap: 6px; }
  .res-tag { font-size: 13px; }
  .section-title { font-size: 15px; font-weight: bold; margin: 12px 0 8px; }
  .summary { background: var(--el-fill-color-light); border-radius: 6px; padding: 8px 12px; margin-bottom: 8px; }
  .summary-tags { display: flex; flex-wrap: wrap; gap: 6px; }
  .filter-bar { display: flex; gap: 10px; margin-bottom: 10px; flex-wrap: wrap; }
  .tier-select { width: 140px; }
  .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
  .card { margin: 0; }
  .card-head { display: flex; align-items: center; gap: 6px; }
  .icon { font-size: 18px; }
  .name { font-weight: bold; flex: 1; }
  .group-line { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
  .unlock { font-size: 11px; color: var(--el-text-color-placeholder); }
  .desc { font-size: 12px; color: var(--el-text-color-secondary); margin: 2px 0; min-height: 18px; }
  .effect { font-size: 12px; color: var(--el-color-success); margin-bottom: 8px; min-height: 18px; }
  .cost { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
  .up-btn { width: 100%; }
  .actions { margin-top: 16px; display: flex; justify-content: center; }
  @media only screen and (max-width: 768px) { .grid { grid-template-columns: 1fr; } }
</style>
