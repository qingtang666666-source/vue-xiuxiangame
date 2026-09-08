import { ref, computed, watch } from 'vue'

// 根据视口宽度返回响应式每页条数（移动端条数更少，避免溢出滚动）。
export function useViewportPageSize(desktop = 8, mobile = 4, breakpoint = 768) {
  const isMobile = () => typeof window !== 'undefined' && window.innerWidth <= breakpoint
  const size = ref(isMobile() ? mobile : desktop)
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', () => {
      size.value = isMobile() ? mobile : desktop
    })
  }
  return size
}

// 通用的“分页不滚动”辅助：给定一个 ref/computed 列表，按每页 pageSize 条分页。
// pageSize 可以传数字，也可以传 useViewportPageSize 返回的响应式 ref。
export function usePager(items, pageSize = 8) {
  const size = pageSize && typeof pageSize === 'object' && 'value' in pageSize
    ? pageSize
    : computed(() => pageSize)
  const page = ref(1)
  const total = computed(() => Math.max(1, Math.ceil((items.value?.length || 0) / size.value)))
  const pageItems = computed(() => {
    const list = items.value || []
    const start = (page.value - 1) * size.value
    return list.slice(start, start + size.value)
  })
  watch([items, size], () => {
    if (page.value > total.value) page.value = total.value
  })
  const setPage = v => {
    page.value = Math.max(1, Math.min(total.value, Math.floor(v || 1)))
  }
  const prev = () => setPage(page.value - 1)
  const next = () => setPage(page.value + 1)
  const reset = () => { page.value = 1 }
  return { page, total, pageItems, setPage, prev, next, reset }
}