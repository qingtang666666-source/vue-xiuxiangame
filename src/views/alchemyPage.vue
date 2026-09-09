<template>
  <div class="alchemy">
    <div class="alchemy-header">
      <div class="title">
        炼丹 · <span class="realm" v-text="levelNames(player.level)" />
      </div>
      <div class="resources">
        <el-tag v-for="res in resourceList" :key="res.key" :type="res.type" effect="plain" class="res-tag">
          {{ res.name }}: {{ formatNumberToChineseUnit(res.value) }}
        </el-tag>
      </div>
    </div>

    <div class="buffs" v-if="buffs.length">
      <div class="section-title">当前增益</div>
      <el-tag v-for="b in buffs" :key="b.name + b.expireAt" :type="b.quality" effect="dark" class="buff-tag">
        {{ b.name }} · {{ formatBuffRemaining(b.expireAt, buffNow) }}<span v-if="buffEffectText(b.effect)"> · {{ buffEffectText(b.effect) }}</span>
      </el-tag>
    </div>

    <div class="pills" v-if="pills.length">
      <div class="section-title">丹药背包</div>
      <div class="pill-strip">
        <el-card class="pill-card" v-for="p in pills" :key="p.id" shadow="never">
          <div class="pill-row">
            <el-tag :type="p.recipe.quality" effect="dark" class="clickable" @click="showPill(p)">{{ p.recipe.name }}</el-tag>
            <span class="pill-count">×{{ p.count }}</span>
            <span class="pill-val">价值 {{ formatNumberToChineseUnit(pillVal(p.recipe)) }} 灵石</span>
            <el-button size="small" type="primary" @click.stop="use(p)">服用</el-button>
          </div>
        </el-card>
      </div>
    </div>

    <div class="section-title">
      丹方
      <span class="count">共 {{ recipes.length }} 种</span>
    </div>
    <div class="filter-bar">
      <div class="chips-row">
        <button class="chip" :class="{ on: tierFilter === 0 }" @click="tierFilter = 0">全部品阶</button>
        <button v-for="t in TIERS" :key="t.t" class="chip" :class="{ on: tierFilter === t.t }" @click="tierFilter = t.t">{{ t.name }}</button>
      </div>
      <div class="chips-row">
        <el-radio-group v-model="kindFilter" size="small">
          <el-radio-button value="all">全部</el-radio-button>
          <el-radio-button value="permanent">永久</el-radio-button>
          <el-radio-button value="buff">限时</el-radio-button>
        </el-radio-group>
        <el-checkbox v-model="onlyReady" size="small" label="只看可炼制" border />
      </div>
    </div>
    <div v-if="crafting" class="crafting-bar">
      正在炼制【{{ recipeById(crafting)?.name }}】...
      <el-button size="small" type="primary" @click="skipCraft">跳 过</el-button>
    </div>
    <div class="recipe-grid">
      <el-card v-for="r in recipeItems" :key="r.id" class="recipe-card" shadow="hover" @click="showRecipe(r)">
        <template #header>
          <div class="card-head">
            <el-tag :type="r.quality" effect="dark">{{ r.name }}</el-tag>
            <el-tag size="small" :type="r.category === 'buff' ? 'warning' : 'info'" effect="plain">
              {{ r.category === 'buff' ? '限时' : '永久' }}
            </el-tag>
          </div>
        </template>
        <p class="desc">{{ r.desc }}</p>
        <p class="effect">{{ r.effectText }}</p>
        <p class="detail">{{ r.detail }}</p>
        <p class="source">{{ sourceOfPill() }}</p>
        <div class="cost">
          <div class="cost-head">
            <span>炼制消耗</span>
            <span class="cost-val">成品价值 {{ formatNumberToChineseUnit(pillVal(r)) }} 灵石</span>
          </div>
          <div class="cost-row" v-for="c in costMap[r.id]" :key="c.key" :class="{ lack: !c.ok }">
            <span class="cname" :title="c.core ? '核心药材' : ''">{{ c.core ? '★ ' : '' }}{{ c.name }}</span>
            <span class="cost-bar"><i :style="{ width: costPct(c) + '%' }" /></span>
            <span class="cnum">{{ formatNumberToChineseUnit(c.have) }} / {{ formatNumberToChineseUnit(c.need) }}</span>
            <span class="cflag">{{ c.ok ? '✔ 已有' : '缺 ' + formatNumberToChineseUnit(Math.max(1, c.need - c.have)) }}</span>
          </div>
        </div>
        <div class="verdict" :class="canCraftMap[r.id] ? 'ready' : 'lack'">
          {{ canCraftMap[r.id] ? '✔ 材料齐全，可入炉' : shortMap[r.id] || '材料不足' }}
        </div>
        <el-button
          class="craft-btn"
          type="primary"
          :disabled="!canCraftMap[r.id]"
          @click.stop="craft(r)"
        >
          炼制
        </el-button>
      </el-card>
    </div>

    <PageNav :page="recipePage" :total="recipeTotal" @change="setRecipePage" />
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
  import { RECIPES, TIERS, recipeById, canCraft, usePill, activeBuffs } from '@/plugins/alchemy'
  import { buffEffectText, formatBuffRemaining, useBuffClock } from '@/plugins/buffs'
  import { sourceOfPill } from '@/plugins/itemSource'
  import { beginAction, actionTask, finishNow } from '@/plugins/actionTimer'
  import { recipeCostList, recipeShortfall } from '@/plugins/alchemy'
  import { pillPrice } from '@/plugins/market'
  import itemInfo from '@/components/itemInfo.vue'
import { usePager, useViewportPageSize } from '@/plugins/pager'
import PageNav from '@/components/PageNav.vue'

  const store = useMainStore()
  const router = useRouter()
  const player = ref(store.player)

  const recipes = RECIPES
  const tierFilter = ref(1)
  const kindFilter = ref('all')
  const onlyReady = ref(false)
  const crafting = computed(() => actionTask(player.value)?.id || null)
  const infoShow = ref(false)
  const infoData = ref(null)

  const displayRecipes = computed(() => {
    return recipes.filter(r => {
      if (tierFilter.value && r.tier !== tierFilter.value) return false
      if (kindFilter.value !== 'all' && r.category !== kindFilter.value) return false
      if (onlyReady.value && !canCraft(player.value, r.id).ok) return false
      return true
    })
  })
  const alSize = useViewportPageSize(100, 4)
  const { page: recipePage, total: recipeTotal, pageItems: recipeItems, setPage: setRecipePage } = usePager(displayRecipes, alSize)

  const resourceList = computed(() => {
    const p = player.value.props || {}
    return [
      { key: 'spiritHerb', name: '灵草', value: p.spiritHerb || 0, type: 'success' },
      { key: 'money', name: '灵石', value: p.money || 0, type: 'warning' },
      { key: 'cultivateDan', name: '培养丹', value: p.cultivateDan || 0, type: 'primary' }
    ]
  })

  const buffNow = useBuffClock(1000)
  const buffs = computed(() => {
    buffNow.value
    return activeBuffs(player.value)
  })

  const pills = computed(() => {
    return (player.value.pills || [])
      .map(p => ({ ...p, recipe: recipeById(p.id) }))
      .filter(p => p.recipe)
  })

  // 各丹方是否可炼制，用于按钮置灰
  const canCraftMap = computed(() => {
    const map = {}
    RECIPES.forEach(r => {
      map[r.id] = canCraft(player.value, r.id).ok
    })
    return map
  })

  // 每张丹方的「已有 / 需要 / 所缺」清单
  const costMap = computed(() => {
    const map = {}
    RECIPES.forEach(r => {
      map[r.id] = recipeCostList(player.value, r.id)
    })
    return map
  })

  // 缺失汇总文案（卡片底部一行标注）
  const shortMap = computed(() => {
    const map = {}
    RECIPES.forEach(r => {
      map[r.id] = recipeShortfall(player.value, r.id)
    })
    return map
  })

  const costPct = c => (c.need > 0 ? Math.max(4, Math.min(100, Math.floor((c.have / c.need) * 100))) : 100)

  const craft = r => {
    if (actionTask(player.value)) {
      gameNotifys({ title: '炼丹中', message: '请等待当前一炉完成或点击跳过', type: 'info' })
      return
    }
    const check = canCraft(player.value, r.id)
    if (!check.ok) {
      gameNotifys({ title: '炼丹失败', message: check.reason, type: 'error' })
      return
    }
    const res = beginAction(player.value, { kind: 'craft-pill', id: r.id, name: r.name, data: { tier: r.tier }, can: () => canCraft(player.value, r.id) })
    if (res.ok) gameNotifys({ title: '炼丹', message: `开始炼制【${r.name}】，约 ${Math.round(res.duration / 1000)}s`, type: 'info' })
    else gameNotifys({ title: '炼丹', message: res.reason, type: 'error' })
  }

  const skipCraft = () => {
    const out = finishNow(player.value)
    if (out) gameNotifys({ title: '工坊', message: out.message, type: out.type })
  }

  const showPill = p => {
    const r = p.recipe
    infoData.value = {
      title: r.name,
      rows: [
        { k: '品阶', v: r.tierName },
        { k: '类型', v: r.category === 'buff' ? '限时' : '永久' },
        { k: '库存', v: p.count }
      ],
      effects: [r.effectText, r.detail, sourceOfPill()]
    }
    infoShow.value = true
  }

  const showRecipe = r => {
    infoData.value = {
      title: r.name,
      rows: [
        { k: '品阶', v: r.tierName },
        { k: '类型', v: r.category === 'buff' ? '限时' : '永久' }
      ],
      effects: [r.effectText, r.detail, sourceOfPill()]
    }
    infoShow.value = true
  }

  const pillVal = r => pillPrice(r)

  const use = p => {
    const res = usePill(player.value, p.id)
    if (res.ok) {
      gameNotifys({
        title: '丹药服用',
        message: res.buff ? `服下【${p.recipe.name}】，${p.recipe.effectText}` : `服下【${p.recipe.name}】，${p.recipe.effectText}`,
        type: 'success'
      })
    } else {
      gameNotifys({ title: '丹药服用', message: res.reason, type: 'error' })
    }
  }
</script>

<style scoped>
  .alchemy {
    text-align: left;
    padding: 0 4px;
  }

  .alchemy-header {
    margin-bottom: 12px;
  }

  .title {
    font-size: 22px;
    font-weight: bold;
    margin-bottom: 10px;
  }

  .realm {
    color: var(--el-color-primary);
  }

  .resources {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .res-tag {
    font-size: 13px;
  }

  .section-title {
    font-size: 15px;
    font-weight: bold;
    margin: 12px 0 8px;
  }

  .count {
    font-size: 12px;
    font-weight: normal;
    color: var(--el-text-color-secondary);
    margin-left: 6px;
  }

  .filter-bar {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 10px;
    align-items: stretch;
  }

  .chips-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
  }

  .chip {
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 999px;
    padding: 3px 11px;
    background: var(--el-fill-color-light);
    color: var(--el-text-color-primary);
    cursor: pointer;
    font-size: 12px;
    line-height: 1.4;
  }

  .chip.on {
    border-color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
    color: var(--el-color-primary);
    font-weight: bold;
  }

  .buffs {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
  }

  .buff-tag {
    font-size: 12px;
  }

  .pills {
    display: block;
  }

  .pill-strip {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }

  .pill-card {
    width: 200px;
    cursor: pointer;
  }

  .clickable {
    cursor: pointer;
  }

  .pill-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .pill-count {
    font-weight: bold;
  }

  .pill-val {
    font-size: 12px;
    color: var(--el-color-warning);
  }

  .recipe-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  .recipe-card {
    margin: 0;
  }

  .card-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .desc {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    margin: 4px 0;
    min-height: 18px;
  }

  .effect {
    font-size: 12px;
    color: var(--el-color-success);
    margin-bottom: 8px;
  }

  .detail {
    font-size: 11px;
    color: var(--el-text-color-secondary);
    line-height: 1.55;
    margin: 0 0 8px;
  }

  .source {
    font-size: 11px;
    color: var(--el-text-color-placeholder);
    margin: 0 0 8px;
  }

  .cost {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 8px;
  }
  .cost-head {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
    color: var(--el-text-color-secondary);
    margin-bottom: 2px;
  }
  .cost-val {
    color: var(--el-color-warning);
  }
  .cost-row {
    width: 100%;
    display: grid;
    grid-template-columns: 82px 1fr auto auto;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    padding: 2px 0;
  }
  .cost-row .cname {
    color: var(--el-text-color-regular);
    white-space: nowrap;
  }
  .cost-row .cnum {
    font-variant-numeric: tabular-nums;
    color: var(--el-text-color-secondary);
  }
  .cost-row .cflag {
    color: var(--el-color-success);
    min-width: 60px;
    text-align: right;
  }
  .cost-row.lack .cname,
  .cost-row.lack .cnum {
    color: var(--el-color-danger);
  }
  .cost-row.lack .cflag {
    color: var(--el-color-danger);
    font-weight: bold;
  }
  .cost-bar {
    display: block;
    height: 6px;
    border-radius: 3px;
    background: var(--el-fill-color);
    overflow: hidden;
  }
  .cost-bar i {
    display: block;
    height: 100%;
    border-radius: 3px;
    background: var(--el-color-success);
    transition: width 0.3s ease;
  }
  .cost-row.lack .cost-bar i {
    background: var(--el-color-danger);
  }
  .verdict {
    font-size: 12px;
    padding: 4px 8px;
    border-radius: 6px;
    margin-bottom: 8px;
    background: var(--el-fill-color-light);
  }
  .verdict.ready {
    color: var(--el-color-success);
    background: rgba(103, 194, 58, 0.12);
  }
  .verdict.lack {
    color: var(--el-color-danger);
    background: rgba(245, 108, 108, 0.12);
  }

  .craft-btn {
    width: 100%;
  }

  .crafting-bar {
    display: flex;
    align-items: center;
    gap: 10px;
    background: var(--el-fill-color-light);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 6px;
    padding: 8px 12px;
    margin-bottom: 10px;
    font-size: 13px;
  }

  .actions {
    margin-top: 16px;
    display: flex;
    justify-content: center;
  }

  @media only screen and (min-width: 1200px) {
    .recipe-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  @media only screen and (max-width: 768px) {
    .recipe-grid {
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
    }
    .desc {
      display: none;
    }
    .effect {
      font-size: 11px;
      margin-bottom: 6px;
      min-height: 30px;
      overflow: hidden;
    }
    .cost-row {
      grid-template-columns: 68px 1fr auto;
      gap: 4px;
      font-size: 11px;
    }
    .cost-row .cflag {
      display: none;
    }
    .verdict {
      font-size: 11px;
      padding: 3px 6px;
      margin-bottom: 6px;
    }
  }

  @media only screen and (max-width: 768px) {
    .alchemy { height: 100%; display: flex; flex-direction: column; overflow: hidden; padding: 0 2px; }
    .alchemy-header { margin-bottom: 6px; }
    .title { font-size: 17px; margin-bottom: 4px; }
    .resources { gap: 4px; }
    .count { display: none; }
    .pills { flex: 0 0 auto; margin-bottom: 4px; }
    .pills .section-title { margin: 0 0 4px; }
    .pill-strip { flex-wrap: nowrap; gap: 6px; overflow-x: auto; padding-bottom: 2px; }
    .pill-card { flex: 0 0 132px; width: auto; }
    .pill-card :deep(.el-card__body) { padding: 6px 8px; }
    .pill-row { gap: 6px; }
    .pill-count { font-size: 12px; }
    .pill-val { display: none; }
    .section-title { margin: 6px 0 4px; font-size: 14px; }
    .filter-bar { gap: 3px; margin-bottom: 4px; }
    .chips-row { flex-wrap: nowrap; overflow-x: auto; gap: 4px; padding-bottom: 2px; }
    .chip { flex: 0 0 auto; padding: 2px 8px; font-size: 11px; }
    .recipe-grid { flex: 1; min-height: 0; grid-template-columns: repeat(2, 1fr); gap: 6px; overflow-y: auto; }
    .recipe-card { cursor: pointer; }
    .recipe-card :deep(.el-card__header) { padding: 6px 8px; }
    .recipe-card :deep(.el-card__body) { padding: 6px 8px; }
    .desc, .detail, .source, .cost { display: none; }
    .effect { min-height: 0; margin-bottom: 4px; font-size: 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .verdict { font-size: 10px; padding: 2px 4px; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .craft-btn { min-height: 26px; font-size: 11px; padding: 4px 8px; }
    .actions { display: none; }
    .crafting-bar { margin-bottom: 6px; padding: 6px 10px; }
  }
</style>
