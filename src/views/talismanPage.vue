<template>
  <div class="talisman">
    <div class="page-header">
      <div class="title">符箓 · <span class="realm" v-text="levelNames(player.level)" /></div>
      <div class="resources">
        <el-tag v-for="res in resourceList" :key="res.key" :type="res.type" effect="plain" class="res-tag">
          {{ res.name }}: {{ formatNumberToChineseUnit(res.value) }}
        </el-tag>
      </div>
    </div>

    <div class="section-title" v-if="ownedList.length">符箓背包</div>
    <div class="owned" v-if="ownedList.length">
      <el-card class="owned-card" v-for="o in ownedList" :key="o.id" shadow="never">
        <div class="owned-row">
          <tag :type="o.recipe.quality" class="clickable" @click="showTalisman(o)">{{ o.recipe.name }}</tag>
          <span class="count">×{{ o.count }}</span>
          <span class="val">价值 {{ formatNumberToChineseUnit(talVal(o.recipe)) }} 灵石</span>
          <el-button size="small" type="primary" @click="use(o)">使用</el-button>
        </div>
      </el-card>
    </div>

    <div class="section-title">符箓库 <span class="count">共 {{ recipes.length }} 种</span></div>
    <div class="filter-bar">
      <div class="chips-row">
        <el-radio-group v-model="groupFilter" size="small">
          <el-radio-button value="all">全部</el-radio-button>
          <el-radio-button v-for="g in TALISMAN_GROUPS" :key="g.key" :value="g.key">{{ g.name }}</el-radio-button>
        </el-radio-group>
      </div>
      <div class="chips-row">
        <button class="chip" :class="{ on: tierFilter === 0 }" @click="tierFilter = 0">全部品阶</button>
        <button v-for="t in TALISMAN_TIERS" :key="t.t" class="chip" :class="{ on: tierFilter === t.t }" @click="tierFilter = t.t">{{ t.name }}</button>
      </div>
    </div>
    <div class="recipe-grid">
      <el-card v-for="r in displayRecipes" :key="r.id" class="recipe-card" shadow="hover">
        <template #header>
          <div class="card-head">
            <tag :type="r.quality">{{ r.name }}</tag>
            <el-tag size="small" type="info" effect="plain">{{ groupName(r.group) }}</el-tag>
          </div>
        </template>
        <p class="desc">{{ r.desc }}</p>
        <p class="effect">{{ r.effectText }}</p>
        <div class="cost">
          <el-tag size="small" type="info">价值 {{ formatNumberToChineseUnit(talVal(r)) }} 灵石</el-tag>
          <el-tag size="small" v-if="r.cost.spiritHerb" type="success">灵草 {{ r.cost.spiritHerb }}</el-tag>
          <el-tag size="small" v-if="r.cost.money" type="warning">灵石 {{ formatNumberToChineseUnit(r.cost.money) }}</el-tag>
          <el-tag size="small" v-if="r.cost.cultivateDan" type="primary">培养丹 {{ r.cost.cultivateDan }}</el-tag>
          <el-tag size="small" v-if="r.cost.material && r.cost.material.key" type="danger">核心灵材 {{ matNameOf(r.cost.material.key) }}×{{ r.cost.material.qty }}</el-tag>
        </div>
        <el-button class="craft-btn" type="primary" :disabled="!craftable[r.id]" @click="craft(r)">炼制</el-button>
      </el-card>
    </div>

    <div class="actions">
    </div>
    <item-info :visible="infoShow" :data="infoData" @update:visible="infoShow = $event" />
  </div>
</template>

<script setup>
  import { ref, computed } from 'vue'
  import { useRouter } from 'vue-router'
  import { useMainStore } from '@/plugins/store'
  import { formatNumberToChineseUnit, levelNames, gameNotifys } from '@/plugins/game'
  import {
    TALISMANS,
    TALISMAN_TIERS,
    TALISMAN_GROUPS,
    talismanById,
    canCraftTalisman,
    useTalisman
  } from '@/plugins/talisman'
  import { beginAction, actionTask } from '@/plugins/actionTimer'
  import { matNameOf } from '@/plugins/materialDb'
  import { talismanPrice } from '@/plugins/market'
  import itemInfo from '@/components/itemInfo.vue'

  const store = useMainStore()
  const router = useRouter()
  const player = ref(store.player)
  const recipes = TALISMANS
  const groupFilter = ref('all')
  const tierFilter = ref(1)

  const resourceList = computed(() => {
    const p = player.value.props || {}
    return [
      { key: 'spiritHerb', name: '灵草', value: p.spiritHerb || 0, type: 'success' },
      { key: 'money', name: '灵石', value: p.money || 0, type: 'warning' },
      { key: 'cultivateDan', name: '培养丹', value: p.cultivateDan || 0, type: 'primary' }
    ]
  })

  const groupName = key => (TALISMAN_GROUPS.find(g => g.key === key) || {}).name || ''

  const displayRecipes = computed(() => {
    return recipes.filter(r => {
      if (groupFilter.value !== 'all' && r.group !== groupFilter.value) return false
      if (tierFilter.value && r.tier !== tierFilter.value) return false
      return true
    })
  })

  const craftable = computed(() => {
    const map = {}
    TALISMANS.forEach(r => {
      map[r.id] = canCraftTalisman(player.value, r.id).ok
    })
    return map
  })

  const ownedList = computed(() => {
    return (player.value.talismans || [])
      .map(o => ({ ...o, recipe: talismanById(o.id) }))
      .filter(o => o.recipe)
  })

  const infoShow = ref(false)
  const infoData = ref(null)
  const showTalisman = o => {
    const r = o.recipe
    infoData.value = {
      title: r.name,
      rows: [{ k: '品阶', v: r.tierName }, { k: '库存', v: o.count }],
      effects: [r.effectText]
    }
    infoShow.value = true
  }

  const talVal = r => talismanPrice(r)

  const craft = r => {
    if (actionTask(player.value)) {
      gameNotifys({ title: '制符中', message: '请等待当前绘制完成', type: 'info' })
      return
    }
    const res = beginAction(player.value, { kind: 'craft-talisman', id: r.id, name: r.name, data: { tier: r.tier }, can: () => canCraftTalisman(player.value, r.id) })
    if (res.ok) gameNotifys({ title: '制符', message: `开始绘制【${r.name}】，约 ${Math.round(res.duration / 1000)}s`, type: 'info' })
    else gameNotifys({ title: '制符', message: res.reason, type: 'error' })
  }

  const use = o => {
    const res = useTalisman(player.value, o.id)
    if (res.ok) gameNotifys({ title: '使用符箓', message: res.buff ? `激发【${o.recipe.name}】，${o.recipe.effectText}` : `使用【${o.recipe.name}】，${o.recipe.effectText}`, type: 'success' })
    else gameNotifys({ title: '使用符箓', message: res.reason, type: 'error' })
  }
</script>

<style scoped>
  .talisman { text-align: left; padding: 0 4px; }
  .page-header { margin-bottom: 12px; }
  .title { font-size: 22px; font-weight: bold; margin-bottom: 10px; }
  .realm { color: var(--el-color-primary); }
  .resources { display: flex; flex-wrap: wrap; gap: 6px; }
  .res-tag { font-size: 13px; }
  .section-title { font-size: 15px; font-weight: bold; margin: 12px 0 8px; }
  .count { font-size: 12px; font-weight: normal; color: var(--el-text-color-secondary); margin-left: 6px; }
  .owned { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 4px; }
  .owned-card { width: 220px; }
  .clickable { cursor: pointer; }
  .owned-row { display: flex; align-items: center; gap: 8px; }
  .val { font-size: 12px; color: var(--el-color-warning); }
  .filter-bar { display: flex; flex-direction: column; gap: 8px; margin-bottom: 10px; align-items: stretch; }
  .chips-row { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
  .chip { border: 1px solid var(--el-border-color-lighter); border-radius: 999px; padding: 3px 11px; background: var(--el-fill-color-light); color: var(--el-text-color-primary); cursor: pointer; font-size: 12px; line-height: 1.4; }
  .chip.on { border-color: var(--el-color-primary); background: var(--el-color-primary-light-9); color: var(--el-color-primary); font-weight: bold; }
  .recipe-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
  .recipe-card { margin: 0; }
  .card-head { display: flex; justify-content: space-between; align-items: center; gap: 6px; }
  .desc { font-size: 12px; color: var(--el-text-color-secondary); margin: 4px 0; min-height: 18px; }
  .effect { font-size: 12px; color: var(--el-color-success); margin-bottom: 8px; }
  .cost { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
  .craft-btn { width: 100%; }
  .actions { margin-top: 16px; display: flex; justify-content: center; }
  @media only screen and (min-width: 1400px) {
    .recipe-grid { grid-template-columns: repeat(3, 1fr); }
  }
  @media only screen and (max-width: 768px) {
    .recipe-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
    .desc { display: none; }
    .effect { font-size: 11px; margin-bottom: 6px; min-height: 30px; overflow: hidden; }
    .owned-card { width: 100%; }
  }
</style>
