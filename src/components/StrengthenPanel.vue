<template>
  <el-drawer
    :title="activeMode === 'refine' ? '精炼' : '强化'"
    :model-value="visible"
    @update:model-value="v => emit('update:visible', v)"
    direction="rtl"
    class="strengthen"
    size="min(440px, 100vw)"
  >
    <div class="strengthen-box" v-if="info && info.name">
      <el-radio-group v-model="activeMode" size="small" class="mode-tabs">
        <el-radio-button value="enhance">强化</el-radio-button>
        <el-radio-button value="refine">精炼</el-radio-button>
      </el-radio-group>
      <equip-tooltip
        :calculate-cost="calculateCost"
        :calculate-enhance-success-rate="successRate"
        :action-label="isRefine ? '精炼' : '强化'"
        :player="store.player"
        :strengthen-info="info"
      />
      <div class="gain-box" v-if="step && !step.maxed">
        <div class="gain-title">{{ isRefine ? '精炼' : '强化' }}收益预览 +{{ step.from }} → +{{ step.to }}</div>
        <div class="gain-row" v-for="g in gainRows" :key="g.k">
          <span class="gk">{{ g.k }}</span>
          <span class="gv">{{ g.cur }} → <b class="up">{{ g.next }}</b><span class="delta">（{{ g.delta }}）</span></span>
        </div>
        <div class="gain-foot">
          成功率 {{ (step.rate * 100).toFixed(1) }}% · 一次 {{ step.cost }} 炼器石 · 期望共 {{ formatNumberToChineseUnit(step.expectCost) }} 石
          <span class="risk" v-if="step.risky">（{{ isRefine ? `+${step.from} 起失败会掉 1 级，可用精炼保护` : `+${step.from} 起失败会受损，可用强化保护` }}）</span>
        </div>
      </div>
      <div class="value-trend" v-if="!isRefine">
        当前价值 {{ formatNumberToChineseUnit(equipSellPrice(info)) }} →
        强化后约 {{ formatNumberToChineseUnit(equipSellPrice({ ...info, strengthen: (info.strengthen || 0) + 1 })) }}
      </div>
      <div v-if="!isRefine && info.broken" class="repair-box">
        <div class="repair-tip">⚠ 该装备已受损，强化加成暂时失效。花【灵石 / 炼器石】修复即可恢复。</div>
        <el-button type="warning" @click="repairItem" :disabled="busy">修复装备</el-button>
      </div>
      <div v-else class="click-box">
        <el-checkbox v-model="protect" :label="isRefine ? '精炼保护' : '强化保护'" />
        <el-checkbox v-model="increase" :label="isRefine ? '精炼增幅' : '强化增幅'" />
        <el-popover
          trigger="hover" :hide-after="0"
          :width="350"
          :content="isRefine ? '精炼10级以上失败会掉1级；勾选精炼保护可避免掉级' : '强化等级大于等于15级时没有强化保护，强化失败装备会跌回+0'"
          placement="bottom"
        >
          <template #reference>
            <el-button type="primary" @click="runAction" :disabled="busy">{{ busy ? `${isRefine ? '精炼' : '强化'}中…` : `点击${isRefine ? '精炼' : '强化'}` }}</el-button>
          </template>
        </el-popover>
      </div>
    </div>
  </el-drawer>
</template>

<script setup>
  import { ref, computed, watch } from 'vue'
  import { useMainStore } from '@/plugins/store'
  import { enhanceCost, enhanceSuccessRate, repairEnhancement, enhanceStepPreview, refineCost, refineSuccessRate, refineStepPreview, REFINE_MAX } from '@/plugins/equipForge'
  import { beginAction, actionTask } from '@/plugins/actionTimer'
  import { equipSellPrice } from '@/plugins/market'
  import { gameNotifys, formatNumberToChineseUnit } from '@/plugins/game'
  import { ElMessageBox } from 'element-plus'
  import equipTooltip from '@/components/equipTooltip.vue'

  const props = defineProps({ visible: Boolean, info: { type: Object, default: null }, mode: { type: String, default: 'enhance' } })
  const emit = defineEmits(['update:visible'])

  const store = useMainStore()
  const protect = ref(false)
  const increase = ref(false)
  const activeMode = ref(props.mode || 'enhance')
  watch(() => props.mode, v => { if (v) activeMode.value = v })
  const isRefine = computed(() => activeMode.value === 'refine')
  const busy = computed(() => !!actionTask(store.player))

  const calculateCost = computed(() => (props.info
    ? (isRefine.value ? refineCost(store.player, props.info, { protect: protect.value, increase: increase.value }) : enhanceCost(store.player, props.info, { protect: protect.value, increase: increase.value }))
    : 0))
  const successRate = computed(() => (props.info
    ? (isRefine.value ? refineSuccessRate(store.player, props.info, { increase: increase.value }) : enhanceSuccessRate(store.player, props.info, { increase: increase.value }))
    : 0))
  // 收益预览：本次成功能净增多少三维、成功率与期望消耗
  const step = computed(() => (props.info
    ? (isRefine.value ? refineStepPreview(store.player, props.info, { protect: protect.value, increase: increase.value }) : enhanceStepPreview(store.player, props.info, { protect: protect.value, increase: increase.value }))
    : null))
  const gainRows = computed(() => {
    const s = step.value
    const item = props.info
    if (!s || !item) return []
    const rows = [
      { k: '攻击', cur: item.attack || 0, add: s.gain.attack },
      { k: '防御', cur: item.defense || 0, add: s.gain.defense },
      { k: '气血', cur: item.health || 0, add: s.gain.health }
    ]
    return rows
      .filter(r => r.cur || r.add)
      .map(r => ({
        k: r.k,
        cur: formatNumberToChineseUnit(r.cur),
        next: formatNumberToChineseUnit(r.cur + r.add),
        delta: `+${formatNumberToChineseUnit(r.add)}`
      }))
  })

  const runAction = () => {
    const item = props.info
    if (!item) return
    const maxed = isRefine.value ? (item.refine || 0) >= REFINE_MAX : (item.strengthen || 0) >= 30
    if (maxed) {
      gameNotifys({ title: isRefine.value ? '精炼提示' : '强化提示', message: `当前装备${isRefine.value ? '精炼' : '强化'}等级已满`, position: 'top-left' })
      return
    }
    const cost = calculateCost.value
    if (cost > (store.player.props.strengtheningStone || 0)) {
      gameNotifys({ title: isRefine.value ? '精炼提示' : '强化提示', message: '炼器石不足, 无法操作', position: 'top-left' })
      return
    }
    const risky = isRefine.value
      ? (item.refine || 0) >= 10 && !protect.value
      : (item.strengthen || 0) >= 15 && !protect.value
    ElMessageBox.confirm(
      risky
        ? (isRefine.value
          ? `当前装备精炼等级已达到+${item.refine || 0}, 如果精炼失败将掉1级, 请问还需要精炼吗?`
          : `当前装备强化等级已达到+${item.strengthen}, 如果强化失败装备将跌回+0, 请问还需要强化吗?`)
        : `你确定要${isRefine.value ? '精炼' : '强化'}吗?`,
      isRefine.value ? '精炼提示' : '强化提示',
      { cancelButtonText: '我点错了', confirmButtonText: '确定以及肯定' }
    )
      .then(() => {
        const res = beginAction(store.player, {
          kind: isRefine.value ? 'refine' : 'enhance',
          id: item.id,
          name: item.name,
          data: isRefine.value
            ? { protect: protect.value, increase: increase.value, refine: item.refine || 0, name: item.name }
            : { protect: protect.value, increase: increase.value, strengthen: item.strengthen || 0, name: item.name },
          can: () => {
            if (isRefine.value ? (item.refine || 0) >= REFINE_MAX : (item.strengthen || 0) >= 30) return { ok: false, reason: `${isRefine.value ? '精炼' : '强化'}等级已满` }
            const c = isRefine.value
              ? refineCost(store.player, item, { protect: protect.value, increase: increase.value })
              : enhanceCost(store.player, item, { protect: protect.value, increase: increase.value })
            if (c > (store.player.props.strengtheningStone || 0)) return { ok: false, reason: '炼器石不足, 无法操作' }
            return { ok: true }
          }
        })
        if (res.ok) gameNotifys({ title: isRefine.value ? '精炼' : '强化', message: `开始${isRefine.value ? '精炼' : '强化'}【${item.name}】，约 ${Math.round(res.duration / 1000)}s`, position: 'top-left', type: 'info' })
        else gameNotifys({ title: isRefine.value ? '精炼' : '强化', message: res.reason, position: 'top-left', type: 'error' })
      })
      .catch(() => {})
  }

  const repairItem = () => {
    const item = props.info
    if (!item) return
    const r = repairEnhancement(store.player, item)
    if (r.ok) gameNotifys({ title: '修复完成', message: `装备已修复，强化加成恢复！`, position: 'top-left', type: 'success' })
    else gameNotifys({ title: '修复提示', message: r.reason, position: 'top-left', type: 'warning' })
  }
</script>

<style scoped>
  /* 抽屉（尤其手机端 30% 默认宽度）要能装下整套强化面板；
     body 交给 flex 算高度并给底部留安全区，最下面的操作区才滚得出来 */
  .strengthen :deep(.el-drawer__body) {
    display: block;
    flex: 1 1 auto;
    min-height: 0;
    height: auto;
    box-sizing: border-box;
    overflow-y: auto !important;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
    padding-bottom: calc(18px + env(safe-area-inset-bottom, 0px)) !important;
  }
  .strengthen-box {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding-bottom: calc(4px + env(safe-area-inset-bottom, 0px));
  }
  .mode-tabs { align-self: flex-start; }
  .gain-box {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 8px 10px;
    border-radius: 8px;
    background: var(--el-fill-color-light);
    border: 1px solid var(--el-border-color-lighter);
  }
  .gain-title { font-size: 13px; font-weight: bold; color: var(--el-color-primary); }
  .gain-row { display: flex; justify-content: space-between; gap: 8px; font-size: 12px; }
  .gain-row .gk { color: var(--el-text-color-secondary); }
  .gain-row .up { color: var(--el-color-success); }
  .gain-row .delta { color: var(--el-color-success); }
  .gain-foot { font-size: 12px; color: var(--el-text-color-secondary); }
  .gain-foot .risk { color: var(--el-color-danger); }
  .value-trend {
    margin: 8px 0;
    font-size: 13px;
    color: var(--el-color-warning);
  }
  .click-box {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    /* 关键：操作区常驻底部，手机端不用滚到底也能看到并点到「点击强化」 */
    position: sticky;
    bottom: 0;
    z-index: 2;
    padding: 10px 0;
    background: var(--el-bg-color);
    border-top: 1px solid var(--el-border-color-lighter);
  }
  .repair-box {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    padding: 10px 12px;
    border-radius: 8px;
    background: rgba(214, 69, 69, 0.12);
    position: sticky;
    bottom: 0;
    z-index: 2;
  }
  .repair-tip { font-size: 13px; color: var(--el-color-danger); }
</style>
