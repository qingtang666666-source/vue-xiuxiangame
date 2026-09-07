<template>
  <span class="animated-num">{{ display }}</span>
</template>

<script setup>
  import { ref, watch } from 'vue'
  import { formatNumberToChineseUnit } from '@/plugins/game'
  const props = defineProps({
    value: { type: Number, default: 0 },
    dur: { type: Number, default: 700 },
    locale: { type: Boolean, default: true },
    chineseUnit: { type: Boolean, default: false }
  })
  const display = ref('0')
  let raf = null
  const fmt = v => {
    if (props.chineseUnit) return formatNumberToChineseUnit(v)
    return props.locale ? Math.round(v).toLocaleString('zh-CN') : String(Math.round(v))
  }

  watch(
    () => props.value,
    (nv, ov) => {
      const from = Number(ov) || 0
      const to = Number(nv) || 0
      if (raf) cancelAnimationFrame(raf)
      if (from === to) { display.value = fmt(to); return }
      const start = performance.now()
      const dur = Math.max(200, props.dur)
      const tick = t => {
        const p = Math.min(1, (t - start) / dur)
        const eased = 1 - Math.pow(1 - p, 3)
        display.value = fmt(from + (to - from) * eased)
        if (p < 1) raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    },
    { immediate: true }
  )
</script>
