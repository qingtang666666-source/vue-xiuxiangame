<template>
  <el-drawer
    title="修仙境界表"
    :model-value="visible"
    @update:model-value="v => emit('update:visible', v)"
    direction="ltr"
    class="levels"
  >
    <tag
      class="inventory-item"
      :type="player.level == index ? 'primary' : index > player.level ? 'danger' : 'success'"
      :key="index"
      v-for="(item, index) in maxLv"
    >
      {{ levelNames(item) }}
    </tag>
  </el-drawer>
</template>

<script setup>
  import { computed } from 'vue'
  import { useMainStore } from '@/plugins/store'
  import { maxLv, levelNames } from '@/plugins/game'
  import tag from '@/components/tag.vue'

  const props = defineProps({ visible: Boolean })
  const emit = defineEmits(['update:visible'])

  const store = useMainStore()
  const player = computed(() => store.player)
</script>

<style scoped>
  .inventory-item {
    margin: 4px;
  }
</style>
