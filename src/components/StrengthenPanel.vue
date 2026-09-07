<template>
  <el-drawer
    title="强化"
    :model-value="visible"
    @update:model-value="v => emit('update:visible', v)"
    direction="rtl"
    class="strengthen"
  >
    <div class="strengthen-box" v-if="info && info.name">
      <equip-tooltip
        :calculate-cost="enhanceCost(store.player, info, { protect, increase })"
        :calculate-enhance-success-rate="enhanceSuccessRate(store.player, info, { increase })"
        :player="store.player"
        :strengthen-info="info"
      />
      <div class="value-trend">
        当前价值 {{ formatNumberToChineseUnit(equipSellPrice(info)) }} →
        强化后约 {{ formatNumberToChineseUnit(equipSellPrice({ ...info, strengthen: (info.strengthen || 0) + 1 })) }}
      </div>
      <div v-if="info.broken" class="repair-box">
        <div class="repair-tip">⚠ 该装备已受损，强化加成暂时失效。花【灵石 / 炼器石】修复即可恢复。</div>
        <el-button type="warning" @click="repairItem" :disabled="busy">修复装备</el-button>
      </div>
      <div v-else class="click-box">
        <el-checkbox v-model="protect" label="强化保护" />
        <el-checkbox v-model="increase" label="强化增幅" />
        <el-popover
          trigger="hover" :hide-after="0"
          :width="350"
          content="强化等级大于等于15级时没有强化保护，强化失败装备会跌回+0"
          placement="bottom"
        >
          <template #reference>
            <el-button type="primary" @click="enhance" :disabled="busy">{{ busy ? '强化中…' : '点击强化' }}</el-button>
          </template>
        </el-popover>
      </div>
    </div>
  </el-drawer>
</template>

<script setup>
  import { ref, computed } from 'vue'
  import { useMainStore } from '@/plugins/store'
  import { enhanceCost, enhanceSuccessRate, repairEnhancement } from '@/plugins/equipForge'
  import { beginAction, actionTask } from '@/plugins/actionTimer'
  import { equipSellPrice } from '@/plugins/market'
  import { gameNotifys, formatNumberToChineseUnit } from '@/plugins/game'
  import { ElMessageBox } from 'element-plus'
  import equipTooltip from '@/components/equipTooltip.vue'

  const props = defineProps({ visible: Boolean, info: { type: Object, default: null } })
  const emit = defineEmits(['update:visible'])

  const store = useMainStore()
  const protect = ref(false)
  const increase = ref(false)
  const busy = computed(() => !!actionTask(store.player))

  const enhance = () => {
    const item = props.info
    if (!item) return
    if ((item.strengthen || 0) >= 30) {
      gameNotifys({ title: '强化提示', message: '当前装备强化等级已满', position: 'top-left' })
      return
    }
    const calculateCost = enhanceCost(store.player, item, { protect: protect.value, increase: increase.value })
    if (calculateCost > (store.player.props.strengtheningStone || 0)) {
      gameNotifys({ title: '强化提示', message: '炼器石不足, 无法强化', position: 'top-left' })
      return
    }
    ElMessageBox.confirm(
      (item.strengthen || 0) >= 15 && !protect.value
        ? `当前装备强化等级已达到+${item.strengthen}, 如果强化失败装备将跌回+0, 请问还需要强化吗?`
        : '你确定要强化吗?',
      '强化提示',
      { cancelButtonText: '我点错了', confirmButtonText: '确定以及肯定' }
    )
      .then(() => {
        const res = beginAction(store.player, {
          kind: 'enhance',
          id: item.id,
          name: item.name,
          data: { protect: protect.value, increase: increase.value, strengthen: item.strengthen || 0, name: item.name },
          can: () => {
            if ((item.strengthen || 0) >= 30) return { ok: false, reason: '强化等级已满' }
            const c = enhanceCost(store.player, item, { protect: protect.value, increase: increase.value })
            if (c > (store.player.props.strengtheningStone || 0)) return { ok: false, reason: '炼器石不足, 无法强化' }
            return { ok: true }
          }
        })
        if (res.ok) gameNotifys({ title: '强化', message: `开始强化【${item.name}】，约 ${Math.round(res.duration / 1000)}s`, position: 'top-left', type: 'info' })
        else gameNotifys({ title: '强化', message: res.reason, position: 'top-left', type: 'error' })
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
  .strengthen-box {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
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
  }
  .repair-box {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    padding: 10px 12px;
    border-radius: 8px;
    background: rgba(214, 69, 69, 0.12);
  }
  .repair-tip { font-size: 13px; color: var(--el-color-danger); }
</style>
