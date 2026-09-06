import map from '../views/mapExploration.vue'
import worldMap from '../views/worldMap.vue'
import boss from '../views/bossPage.vue'
import home from '../views/homePage.vue'
import index from '../views/indexPage.vue'
import explore from '../views/explorePage.vue'
import cultivate from '../views/cultivatePage.vue'
import battle from '../views/battlePage.vue'
import endlesstower from '../views/endlessPage.vue'
import game from '../views/game/game.vue'
import manor from '../views/manorPage.vue'
import alchemy from '../views/alchemyPage.vue'
import forge from '../views/forgePage.vue'
import talisman from '../views/talismanPage.vue'
import formation from '../views/formationPage.vue'
import npc from '../views/npcPage.vue'
import sect from '../views/sectPage.vue'
import market from '../views/marketPage.vue'
import guild from '../views/guildPage.vue'
import realm from '../views/realmPage.vue'
import ascension from '../views/ascensionPage.vue'
import quest from '../views/questPage.vue'
import backpack from '../views/backpackPage.vue'
import gm from '../views/gmPage.vue'
import rebirthShop from '../views/rebirthShopPage.vue'
import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'index',
    meta: {
      keepAlive: false
    },
    component: index
  },
  {
    path: '/home',
    name: 'home',
    meta: {
      keepAlive: false
    },
    component: home
  },
  {
    path: '/cultivate',
    name: 'cultivate',
    meta: {
      keepAlive: false
    },
    component: cultivate
  },
  {
    path: '/battle',
    name: 'battle',
    meta: {
      keepAlive: false
    },
    component: battle
  },
  {
    path: '/map',
    name: 'map',
    meta: {
      keepAlive: false
    },
    component: map
  },
  {
    path: '/worldmap',
    name: 'worldmap',
    meta: { keepAlive: false },
    component: worldMap
  },
  {
    path: '/explore',
    name: 'explore',
    meta: {
      keepAlive: false
    },
    component: explore
  },
  {
    path: '/boss',
    name: 'boss',
    meta: {
      keepAlive: false
    },
    component: boss
  },
  {
    path: '/endlesstower',
    name: 'endlesstower',
    meta: {
      keepAlive: false
    },
    component: endlesstower
  },
  {
    path: '/game',
    name: 'game',
    meta: {
      keepAlive: false
    },
    component: game
  },
  {
    path: '/manor',
    name: 'manor',
    meta: {
      keepAlive: true
    },
    component: manor
  },
  {
    path: '/alchemy',
    name: 'alchemy',
    meta: {
      keepAlive: true
    },
    component: alchemy
  },
  {
    path: '/forge',
    name: 'forge',
    meta: {
      keepAlive: true
    },
    component: forge
  },
  {
    path: '/talisman',
    name: 'talisman',
    meta: {
      keepAlive: true
    },
    component: talisman
  },
  {
    path: '/formation',
    name: 'formation',
    meta: {
      keepAlive: true
    },
    component: formation
  },
  {
    path: '/npc',
    name: 'npc',
    meta: {
      keepAlive: true
    },
    component: npc
  },
  {
    path: '/sect',
    name: 'sect',
    meta: {
      keepAlive: true
    },
    component: sect
  },
  {
    path: '/market',
    name: 'market',
    meta: {
      keepAlive: true
    },
    component: market
  },
  {
    path: '/guild',
    name: 'guild',
    meta: {
      keepAlive: true
    },
    component: guild
  },
  {
    path: '/realm',
    name: 'realm',
    meta: {
      keepAlive: true
    },
    component: realm
  },
  {
    path: '/technique',
    name: 'technique',
    redirect: '/home'
  },
  {
    path: '/ascension',
    name: 'ascension',
    meta: {
      keepAlive: true
    },
    component: ascension
  },
  {
    path: '/quest',
    name: 'quest',
    meta: {
      keepAlive: true
    },
    component: quest
  },
  {
    path: '/backpack',
    name: 'backpack',
    meta: {
      keepAlive: true
    },
    component: backpack
  },
  {
    path: '/gm',
    name: 'gm',
    meta: {
      keepAlive: false,
      fullWidth: true
    },
    component: gm
  },
  {
    path: '/rebirthShop',
    name: 'rebirthShop',
    meta: {
      keepAlive: true
    },
    component: rebirthShop
  }
]
const router = createRouter({
  history: createWebHashHistory(),
  routes,
  // 切换页面回到顶部，避免长页面(炼丹/符箓/阵法等)直接落在底部
  scrollBehavior: () => ({ top: 0 })
})

export default router
