// 庆祝特效 —— 突破/渡劫/飞升时的全屏闪过横幅

import { reactive } from 'vue'

export const celebrateState = reactive({ text: '', show: false, key: 0 })

export const celebrate = text => {
  celebrateState.text = text
  celebrateState.key += 1
  celebrateState.show = true
}
