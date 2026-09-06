import App from './App.vue'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import 'element-plus/dist/index.css'
import router from '@/plugins/router'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import ElementPlus from 'element-plus'
import { useMainStore } from '@/plugins/store'
import { setupPersistence } from '@/plugins/persistence'

const app = createApp(App)

const pinia = createPinia()
app.use(pinia)

// 读取并接管存档持久化（脏标记 + 延迟落盘），须在挂载前完成。
// 即使初始化异常也绝不阻断启动，兜底保证游戏可打开。
try {
  setupPersistence(useMainStore(pinia))
} catch (e) {
  console.warn('[persistence] 初始化失败，已跳过（游戏仍可启动）', e)
}

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(router)
app.use(ElementPlus)
app.mount('#app')
