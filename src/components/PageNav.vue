<template>
  <div v-if="total > 1" class="page-nav">
    <button class="pn-btn" :disabled="page <= 1" @click="emitChange(page - 1)">‹ 上一页</button>
    <span class="pn-info">{{ page }} / {{ total }}</span>
    <button class="pn-btn" :disabled="page >= total" @click="emitChange(page + 1)">下一页 ›</button>
  </div>
</template>

<script setup>
  const props = defineProps({
    page: { type: Number, default: 1 },
    total: { type: Number, default: 1 }
  })
  const emit = defineEmits(['change'])
  const emitChange = p => emit('change', p)
</script>

<style scoped>
  .page-nav {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 6px 0;
  }
  .pn-btn {
    border: 1px solid var(--el-border-color-lighter);
    background: var(--el-fill-color-light);
    color: var(--el-text-color-primary);
    border-radius: 999px;
    padding: 5px 12px;
    font-size: 12px;
    cursor: pointer;
    min-width: 76px;
  }
  .pn-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .pn-btn:active:not(:disabled) {
    transform: scale(0.96);
  }
  .pn-info {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    font-variant-numeric: tabular-nums;
  }
</style>
