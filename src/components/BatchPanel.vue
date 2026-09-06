<template>
  <el-dialog
    title="批量处理"
    :model-value="visible"
    @update:model-value="v => emit('update:visible', v)"
    :lock-scroll="false"
    width="600px"
  >
    <el-divider>装备</el-divider>
    <el-checkbox-group v-model="player.sellingEquipmentData">
      <el-checkbox v-for="(item, index) in AllEquipmenType" :value="item" :key="index" :label="levels[item]" />
    </el-checkbox-group>
    <div class="dialog-footer" style="margin-top: 20px">
      <el-button class="dialog-footer-button" @click="splitEquip">分解装备</el-button>
    </div>
    <el-divider>灵宠</el-divider>
    <div class="dialog-footer" style="margin-top: 20px">
      <el-button class="dialog-footer-button" @click="releasePet">放生灵宠</el-button>
    </div>
  </el-dialog>
</template>

<script setup>
  import { ref } from 'vue'
  import { useMainStore } from '@/plugins/store'
  import { dismantleEquipsByQuality } from '@/plugins/equipOps'
  import { releasePets } from '@/plugins/petOps'
  import { gameNotifys, levels } from '@/plugins/game'

  const props = defineProps({ visible: Boolean })
  const emit = defineEmits(['update:visible'])

  const store = useMainStore()
  const player = store.player
  const AllEquipmenType = ref(['info', 'success', 'primary', 'purple', 'pink', 'warning', 'danger', 'cyan', 'orange', 'gold', 'legendary'])

  const splitEquip = () => {
    const r = dismantleEquipsByQuality(player, player.sellingEquipmentData)
    if (!r.ok) {
      gameNotifys({
        title: '背包装备分解提示',
        message: r.reason === 'noStock' ? '背包内并没有可以售卖的装备' : '你没有选择勾选需要分解的品阶'
      })
      return
    }
    emit('update:visible', false)
    gameNotifys({ title: '背包装备分解提示', message: `背包内所有非锁定装备已成功分解, 你获得了${r.stone}个炼器石和${r.count}个灵石` })
  }

  const releasePet = () => {
    const r = releasePets(player)
    if (!r.ok) {
      gameNotifys({
        title: '灵宠放生提示',
        message: r.reason === 'noPet' ? '你没有可以放生的灵宠' : '你没有可以放生的未锁定灵宠'
      })
      return
    }
    emit('update:visible', false)
    gameNotifys({ title: '灵宠放生提示', message: `所有非锁定灵宠已成功放生, 他们临走前一起赠与了你${r.dan}个培养丹` })
  }
</script>

<style scoped>
  .dialog-footer {
    margin-top: 10px;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  .dialog-footer .el-button {
    margin: 0;
    margin-bottom: 10px;
  }
  .dialog-footer-button {
    margin: 10px 0 0 0 !important;
    width: 100%;
  }
  .dialog-footer-button:nth-child(2 + n) {
    margin-top: 10px;
    width: 100%;
  }
</style>
