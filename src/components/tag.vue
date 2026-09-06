<template>
  <el-tag :disable-transitions="true" :class="customTypeClass">
    <slot></slot>
  </el-tag>
</template>

<script setup>
  import { computed } from 'vue'

  const props = defineProps({
    type: {
      type: String,
      default: 'info'
    }
  })

  const customTypeClass = computed(() => {
    if (['pink', 'purple', 'cyan', 'orange', 'gold', 'legendary'].includes(props.type)) return `el-tag--${props.type}`
    else return `el-tag--${props.type}`
  })
</script>
