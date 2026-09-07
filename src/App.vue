<template>
  <div class="game-container-wrapper" draggable="true">
    <div :class="['game-container', { dark: player.dark, 'full-width': route.meta.fullWidth }]">
      <ActionTimerBar :player="player" />
      <router-view v-slot="{ Component }">
        <transition name="page-fade" mode="out-in">
          <keep-alive v-if="route.meta.keepAlive">
            <component :is="Component" :key="key" />
          </keep-alive>
          <component v-else :is="Component" :key="key" />
        </transition>
      </router-view>
    <div class="top-right">
      <div class="nav-btn" @click="router.push('/quest')">📋任务<span v-if="questBadge" class="badge">{{ questBadge }}</span></div>
      <div class="nav-btn" @click="router.push('/backpack')">🎒背包</div>
      <div class="nav-btn" @click="openTrav">🗺️游商<span v-if="travNew" class="trav-dot">●</span></div>
      <div class="nav-btn" @click="router.push('/game')">🎮休闲</div>
      <div class="nav-btn" @click="router.push('/worldmap')">🗺️地图</div>
      <div class="nav-btn" @click="router.push('/battle')">⚔️历战</div>
      <el-switch size="small" v-model="player.dark">
          <template #active-action>
            <i class="el-icon">
              <svg viewBox="0 0 24 24" class="dark-icon">
                <path
                  d="M11.01 3.05C6.51 3.54 3 7.36 3 12a9 9 0 0 0 9 9c4.63 0 8.45-3.5 8.95-8c.09-.79-.78-1.42-1.54-.95A5.403 5.403 0 0 1 11.1 7.5c0-1.06.31-2.06.84-2.89c.45-.67-.04-1.63-.93-1.56z"
                  fill="currentColor"
                />
              </svg>
            </i>
          </template>
          <template #inactive-action>
            <i class="el-icon">
              <svg viewBox="0 0 24 24" class="light-icon">
                <path
                  d="M6.05 4.14l-.39-.39a.993.993 0 0 0-1.4 0l-.01.01a.984.984 0 0 0 0 1.4l.39.39c.39.39 1.01.39 1.4 0l.01-.01a.984.984 0 0 0 0-1.4zM3.01 10.5H1.99c-.55 0-.99.44-.99.99v.01c0 .55.44.99.99.99H3c.56.01 1-.43 1-.98v-.01c0-.56-.44-1-.99-1zm9-9.95H12c-.56 0-1 .44-1 .99v.96c0 .55.44.99.99.99H12c.56.01 1-.43 1-.98v-.97c0-.55-.44-.99-.99-.99zm7.74 3.21c-.39-.39-1.02-.39-1.41-.01l-.39.39a.984.984 0 0 0 0 1.4l.01.01c.39.39 1.02.39 1.4 0l.39-.39a.984.984 0 0 0 0-1.4zm-1.81 15.1l.39.39a.996.996 0 1 0 1.41-1.41l-.39-.39a.993.993 0 0 0-1.4 0c-.4.4-.4 1.02-.01 1.41zM20 11.49v.01c0 .55.44.99.99.99H22c.55 0 .99-.44.99-.99v-.01c0-.55-.44-.99-.99-.99h-1.01c-.55 0-.99.44-.99.99zM12 5.5c-3.31 0-6 2.69-6 6s2.69 6 6 6s6-2.69 6-6s-2.69-6-6-6zm-.01 16.95H12c.55 0 .99-.44.99-.99v-.96c0-.55-.44-.99-.99-.99h-.01c-.55 0-.99.44-.99.99v.96c0 .55.44.99.99.99zm-7.74-3.21c.39.39 1.02.39 1.41 0l.39-.39a.993.993 0 0 0 0-1.4l-.01-.01a.996.996 0 0 0-1.41 0l-.39.39c-.38.4-.38 1.02.01 1.41z"
                  fill="currentColor"
                />
              </svg>
            </i>
          </template>
        </el-switch>
        <button v-if="!isHome" class="back-btn" @click="router.push('/home')">← 返回</button>
      </div>
    </div>
    <div class="wm_bg_1" v-if="!player.dark" />
    <div class="wm_bg_2" v-if="!player.dark" />
    <div class="credit">创作者：青棠</div>
    <transition name="celebrate">
      <div v-if="celebrateState.show" class="celebrate-overlay" :style="celebrateStyle">
        <span v-for="(c, i) in confetti" :key="i" class="confetti" :style="c.style" />
        <div class="celebrate-text">{{ celebrateState.text }}</div>
      </div>
    </transition>
    <el-dialog v-model="travShow" title="🗺️ 游商" width="480px" :lock-scroll="false">
      <div class="trav-hint">游商每月辗转各地，每 2 游戏月更换一批货；本批货品随机 5~9 折。</div>
      <div class="trav-group" v-for="g in travGroups" :key="g.key">
        <div class="trav-group-title">{{ g.name }}</div>
        <div class="trav-list">
          <div class="trav-item" v-for="it in g.items" :key="it.key">
            <el-tooltip :content="travTip(it)" placement="top">
              <div class="trav-info" @click="travView(it)">
              <b>{{ it.name }}</b>
              <span class="trav-tag">{{ it.tierName || '' }} ×{{ it.qty }}<span v-if="it.discount" class="trav-disc">【{{ discountLabel(it.discount) }}】</span></span>
              </div>
            </el-tooltip>
            <div class="trav-ops">
              <span class="trav-price">{{ it.price }} 灵石</span>
              <el-button size="small" type="primary" :disabled="it.qty <= 0 || player.props.money < it.price" @click="it.kind === 'blindbox' ? openBox(it) : buyTrav(it)">购买</el-button>
              <el-button size="small" type="warning" plain :disabled="it.qty <= 0" @click="it.kind === 'blindbox' ? openBoxBatch(it) : buyTravBatch(it)">批量</el-button>
            </div>
          </div>
        </div>
      </div>
      <el-empty v-if="!travStock.length" description="游商尚未进货" :image-size="60" />
      <div class="trav-money"><MoneyBar :show-currency="false" compact /></div>
    </el-dialog>
  </div>
</template>

<script setup>
  import { useRoute, useRouter } from 'vue-router'
  import { ref, watch, computed, onMounted, onBeforeUnmount } from 'vue'
  import { useMainStore } from './plugins/store'
  import { touchOnline } from './plugins/offline'
  import { idleTick } from './plugins/alchemy'
  import { tickTechniques, techTaskResultMessage } from './plugins/technique'
  import { tickActions } from './plugins/actionTimer'
  import { checkSetRewards } from './plugins/setReward'
  import ActionTimerBar from './components/ActionTimerBar.vue'
  import { ensureWorldNpcs } from './plugins/npcSystem'
  import { ensureSect } from './plugins/sect'
  import { ensureAptitude } from './plugins/aptitude'
  import { ensureTime, syncTime, isLifespanExhausted } from './plugins/time'
  import { performRebirth, rebirthSummaryHtml } from './plugins/rebirthFlow'
  import { ensureBirthFamily } from './plugins/birthFamily'
  import { ensureFate } from './plugins/fate'
  import { ensureSeason } from './plugins/season'
  import { ensureNatalArtifact } from './plugins/natalArtifact'
  import { checkAchievements } from './plugins/achievementChecker'
  import { gameNotifys } from './plugins/game'
  import { fixedQuests, selectableQuests } from './plugins/quest'
  import { autoIdleTick } from './plugins/autoIdle'
  import { ElMessageBox } from 'element-plus'
  import { celebrateState } from './plugins/celebrate'
  import bannerImg from '@/assets/images/breakthrough-banner.png'
  import { ensureTravelingMerchant, buyTravItem, openBlindBox } from './plugins/travelingMerchant'
  import { MATERIALS } from './plugins/materialDb'
  import { RECIPES } from './plugins/alchemy'
  import { TREASURES } from './plugins/treasure'
  import { propItemNames } from './plugins/game'
  import { formatNumberToChineseUnit } from './plugins/game'
  import MoneyBar from './components/MoneyBar.vue'

  const player = ref({})
  const confetti = ref([])
  const celebrateStyle = { '--celebrate-img': `url(${bannerImg})` }
  const route = useRoute()
  const router = useRouter()
  const key = computed(() => route.path)
  const isHome = computed(() => ['/', '/home'].includes(route.path))
  const questBadge = computed(() => {
    const f = fixedQuests(player.value).filter(x => x.done && !x.claimed).length
    const s = selectableQuests(player.value).filter(x => x.selected && x.progress >= x.target).length
    return f + s
  })

  watch(
    () => player.value.dark,
    val => {
      document.querySelector('html').classList = val ? 'dark' : ''
    }
  )

  watch(
    () => celebrateState.key,
    () => {
      confetti.value = Array.from({ length: 46 }, (_, i) => {
        const size = 6 + Math.random() * 9
        return {
          style: {
            left: (Math.random() * 100) + 'vw',
            width: size + 'px',
            height: (size * 1.7) + 'px',
            background: ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#d45dff', '#ff9f45', '#2ec4b6'][i % 7],
            animationDelay: (Math.random() * 0.7) + 's',
            animationDuration: (1.5 + Math.random() * 1.3) + 's'
          }
        }
      })
      setTimeout(() => {
        celebrateState.show = false
      }, 1800)
    }
  )

  // 游商（右上角）：每 2 游戏月到货 + 红点 + 弹窗购买
  const travShow = ref(false)
  const travStock = computed(() => player.value.travelingMerchant?.stock || [])
  const travNew = computed(() => !!player.value.travelingMerchant?.show)
  const travGroups = computed(() =>
    ['prop', 'pill', 'material', 'treasure', 'blindbox', 'scroll']
      .map(key => ({ key, name: { prop: '杂货', pill: '丹药', material: '材料', treasure: '天材地宝', blindbox: '盲盒', scroll: '功法' }[key], items: travStock.value.filter(it => it.kind === key) }))
      .filter(g => g.items.length)
  )
  const discountLabel = d => `${Math.round(d * 10)}折`
  const openTrav = () => {
    ensureTravelingMerchant(player.value)
    if (player.value.travelingMerchant) player.value.travelingMerchant.show = false
    travShow.value = true
  }
  const buyTrav = it => {
    const r = buyTravItem(player.value, it)
    if (r.ok) gameNotifys({ title: '游商', message: `购得【${r.name}】`, type: 'success' })
    else gameNotifys({ title: '游商', message: r.reason, type: 'warning' })
  }
  const openBox = it => {
    const r = openBlindBox(player.value, it)
    if (r.ok) {
      gameNotifys({ title: r.jackpot ? '🎉 盲盒·大惊喜！' : '神秘盲盒', message: `开出：${r.texts.join('，')}`, type: r.jackpot ? 'success' : 'info' })
    } else {
      gameNotifys({ title: '神秘盲盒', message: r.reason, type: 'warning' })
    }
  }
  const buyTravBatch = it => {
    if (it.qty <= 0) return
    const maxN = Math.min(it.qty, Math.floor((player.value.props.money || 0) / it.price))
    if (maxN <= 0) return gameNotifys({ title: '批量购买', message: '灵石不足', type: 'warning' })
    ElMessageBox.prompt(`【${it.name}】现有 ×${it.qty}（可购 ${maxN}），输入购买数量`, '批量购买', {
      inputValue: String(maxN),
      inputPattern: /^\d+$/,
      inputErrorMessage: '请输入数字',
      confirmButtonText: '购买',
      cancelButtonText: '取消'
    })
      .then(({ value }) => {
        const n = Math.max(1, Math.min(maxN, parseInt(value) || 1))
        let ok = 0
        for (let i = 0; i < n; i++) {
          if (buyTravItem(player.value, it).ok) ok++
        }
        gameNotifys({ title: '批量购买', message: `购得【${it.name}】×${ok}`, type: ok ? 'success' : 'warning' })
      })
      .catch(() => {})
  }
  const openBoxBatch = it => {
    if (it.qty <= 0) return
    const maxN = Math.min(it.qty, Math.floor((player.value.props.money || 0) / it.price))
    if (maxN <= 0) return gameNotifys({ title: '批量开盲盒', message: '灵石不足', type: 'warning' })
    ElMessageBox.prompt(`盲盒现有 ×${it.qty}（可开 ${maxN}），输入开盒数量`, '批量开盲盒', {
      inputValue: String(maxN),
      inputPattern: /^\d+$/,
      inputErrorMessage: '请输入数字',
      confirmButtonText: '开盒',
      cancelButtonText: '取消'
    })
      .then(({ value }) => {
        const n = Math.max(1, Math.min(maxN, parseInt(value) || 1))
        let jackpots = 0
        for (let i = 0; i < n; i++) {
          const r = openBlindBox(player.value, it)
          if (r.ok && r.jackpot) jackpots++
        }
        gameNotifys({ title: '批量开盲盒', message: `开出 ${n} 个，其中 1000倍 ×${jackpots}${jackpots ? ' 🎉' : ''}（详见图鉴→盲盒记录）`, type: jackpots ? 'success' : 'info', duration: 6000 })
      })
      .catch(() => {})
  }
  const travView = it => {
    const { key, name, kind, tierName } = it
    let nm = name
    let info = []
    if (kind === 'material') {
      const m = MATERIALS.find(x => x.key === key)
      if (m) { nm = m.name; info.push(m.tierName || '', m.desc || '', `价值 ${m.price} 灵石`) }
    } else if (kind === 'pill') {
      const r = RECIPES.find(x => x.id === key)
      if (r) { nm = r.name; info.push(r.tierName || '', r.effectText || '') }
    } else if (kind === 'treasure') {
      const t = TREASURES.find(x => x.key === key)
      if (t) { nm = t.name; info.push(t.tierName || '', t.desc || '', `价值 ${t.price} 灵石`) }
    } else if (kind === 'scroll') {
      info.push(tierName ? `${tierName}功法卷轴` : '功法卷轴', '参悟以根骨资质 × 悟性判定成败')
    } else {
      const p = propItemNames[key]
      if (p) { nm = p.name; info.push(p.desc || '') }
    }
    ElMessageBox.alert(
      `<div style="text-align:left"><b>${nm}</b>${tierName ? '（' + tierName + '）' : ''}<br>${info.filter(Boolean).join('<br>')}</div>`,
      '游商之物',
      { dangerouslyUseHTMLString: true, confirmButtonText: '知道了' }
    )
  }

  const travTip = it => {
    let desc = ''
    if (it.kind === 'material') desc = MATERIALS.find(x => x.key === it.key)?.desc || ''
    else if (it.kind === 'pill') desc = RECIPES.find(x => x.id === it.key)?.effectText || ''
    else if (it.kind === 'treasure') desc = TREASURES.find(x => x.key === it.key)?.desc || ''
    else if (it.kind === 'scroll') desc = '功法卷轴，参悟以根骨资质 × 悟性判定成败'
    else if (it.kind === 'blindbox') desc = '开箱：5% 千倍暴击 / 45% 等值 / 50% 垃圾'
    return `${it.name}${it.tierName ? '（' + it.tierName + '）' : ''}\n${desc}\n${it.price} 灵石`
  }
  const travTimer = setInterval(() => {
    const r = ensureTravelingMerchant(player.value)
    if (r.newCycle) gameNotifys({ title: '游商', message: '游商带着新货赶来了！点右上角「游商」看看', type: 'info', duration: 6000 })
  }, 30000)
  onBeforeUnmount(() => clearInterval(travTimer))

  onMounted(() => {
    // 初始化玩家数据
    player.value = useMainStore().player
    // 生成/刷新下界 NPC（转生后不固定）
    ensureWorldNpcs(player.value)
    ensureAptitude(player.value)
    ensureFate(player.value)
    ensureSeason(player.value)
    ensureNatalArtifact(player.value)
    ensureBirthFamily(player.value)
    checkAchievements(player.value, 'birth', player.value)
    ensureSect(player.value)
    ensureTime(player.value)
    setInterval(() => {
      // 结算游戏时间流逝与岁数
      syncTime(player.value)
      // 机缘成就检查（奇遇/秘境/轮回/界域）
      const na = checkAchievements(player.value, 'life', player.value)
      na.forEach(a => gameNotifys({ title: '成就达成', message: `【${a.name}】${a.desc}`, type: 'success' }))
      // 自动挂机（探索/秘境/任务）
      autoIdleTick(player.value)
      // 跨赛季检测与结算
      ensureSeason(player.value)
      // 寿元耗尽触发轮回
      if (isLifespanExhausted(player.value)) doRebirth(player.value)
      // 每分钟更新一次玩家最后在线时间
      player.value.time = new Date().getTime()
      // 持续刷新离线结算时间戳
      touchOnline(player.value)
    }, 60000)
    // 在线被动挂机（每 30 秒结算一次，降低持久化写入频率）
    setInterval(() => {
      idleTick(player.value, 30)
      const tr = tickTechniques(player.value)
      if (tr) gameNotifys({ title: '功法', message: techTaskResultMessage(tr), type: tr.ok ? 'success' : 'warning' })
      const ar = tickActions(player.value)
      if (ar) gameNotifys({ title: '工坊', message: ar.message, type: ar.type })
      // 集齐全套（同阶四件 / 同名套装四件）→ 一次性收藏奖励，自动发放并提示
      checkSetRewards(player.value).forEach(g =>
        gameNotifys({ title: `集齐【${g.label}】`, message: `收藏奖励：${g.text}`, type: 'success' })
      )
    }, 30000)
    // 如果有脚本的话, 执行脚本内容
    if (player.value.script) new Function(player.value.script)()
  })

  onBeforeUnmount(() => {
    if (player.value) touchOnline(player.value)
    window.removeEventListener('beforeunload', handleBeforeUnload)
  })

  const handleBeforeUnload = () => {
    if (player.value) touchOnline(player.value)
  }
  window.addEventListener('beforeunload', handleBeforeUnload)

  // 寿元耗尽：进入轮回转世
  const doRebirth = p => {
    const res = performRebirth(p)
    ElMessageBox.alert(rebirthSummaryHtml(res), '寿元耗尽 · 轮回转世', {
      dangerouslyUseHTMLString: true,
      confirmButtonText: '进入新世'
    })
  }
</script>

<style scoped>
  .story {
    padding: 0 30px;
  }

  .boss-box .desc {
    margin: 10px 0;
  }

  .game-container-wrapper {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 90vh;
    -webkit-user-drag: none;
  }

  .game-container {
    width: 100%;
    max-width: 1080px;
    min-width: 0;
    min-height: 740px;
    margin: 0 auto;
    padding: 20px;
    box-sizing: border-box;
    background-color: rgba(255, 255, 255, 0.5);
    text-align: center;
    position: relative;
  }

  .game-container.dark {
    background-color: #141414;
  }

  .game-container.full-width {
    max-width: none;
    width: 97%;
  }

  @media only screen and (min-width: 800px) {
    .game-box {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 80%;
    }
  }

  .wm_bg_1,
  .wm_bg_2 {
    position: fixed;
    top: 0;
    left: 0;
    z-index: -1;
    width: 100%;
    height: 100%;
    background-size: 100% auto;
    transition: all 0.3s ease-out;
  }

  .wm_bg_1 {
    background:
      radial-gradient(ellipse at 22% 30%, rgba(168, 205, 175, 0.32), transparent 55%),
      radial-gradient(ellipse at 80% 24%, rgba(200, 224, 190, 0.3), transparent 55%),
      radial-gradient(ellipse at 60% 92%, rgba(186, 214, 185, 0.24), transparent 60%),
      linear-gradient(165deg, #f0f6ec, #e4f0e1 45%, #f1f6ec);
  }

  .wm_bg_2 {
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.25), rgba(255, 255, 255, 0) 60%);
  }

  .back-btn {
    position: fixed;
    top: 10px;
    right: 12px;
    z-index: 30;
    border: 1px solid var(--el-border-color);
    background: rgba(255, 255, 255, 0.82);
    color: var(--el-text-color-primary);
    border-radius: 20px;
    padding: 6px 14px;
    font-size: 13px;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .top-right {
    position: fixed;
    top: 10px;
    right: 12px;
    z-index: 30;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .nav-btn {
    display: flex;
    align-items: center;
    gap: 5px;
    background: rgba(255, 255, 255, 0.82);
    border: 1px solid var(--el-border-color);
    color: var(--el-text-color-primary);
    border-radius: 20px;
    padding: 6px 12px;
    font-size: 13px;
    font-weight: bold;
    cursor: pointer;
    position: relative;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .nav-btn .badge {
    background: var(--el-color-danger);
    color: #fff;
    border-radius: 9px;
    min-width: 16px;
    height: 16px;
    line-height: 16px;
    text-align: center;
    font-size: 11px;
    padding: 0 4px;
  }
  .trav-dot {
    color: #f56c6c;
    margin-left: 4px;
    font-size: 12px;
    line-height: 1;
  }
  .trav-hint { font-size: 12px; color: var(--el-text-color-secondary); margin-bottom: 10px; }
  .trav-group { margin-bottom: 12px; }
  .trav-group-title { font-size: 13px; font-weight: bold; color: var(--el-color-primary); margin-bottom: 6px; }
  .trav-list { display: flex; flex-direction: column; gap: 8px; }
  .trav-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; border-radius: 6px; background: var(--el-fill-color-light); }
  .trav-info { display: flex; flex-direction: column; gap: 2px; cursor: pointer; }
  .trav-tag { font-size: 12px; color: var(--el-text-color-secondary); }
  .trav-disc { color: #f56c6c; font-weight: bold; }
  .trav-ops { display: flex; align-items: center; gap: 8px; }
  .trav-price { font-size: 13px; color: var(--el-color-warning); }
  .trav-money { margin-top: 12px; font-size: 13px; color: var(--el-text-color-secondary); text-align: right; }
  .trav-money-num { color: var(--el-color-warning); font-size: 15px; }

  .dark .nav-btn {
    background: rgba(30, 30, 30, 0.9);
    border-color: var(--el-border-color);
  }

  .top-right .back-btn {
    position: static;
  }

  @media only screen and (max-width: 768px) {
    .top-right {
      top: 6px;
      left: 6px;
      right: 6px;
      gap: 5px;
      flex-wrap: wrap;
      justify-content: flex-end;
    }
    .nav-btn {
      padding: 5px 8px;
      font-size: 12px;
      flex: none;
    }
  }

  .dark .back-btn {
    background: rgba(30, 30, 30, 0.9);
    color: var(--el-text-color-primary);
    border-color: var(--el-border-color);
  }

  .credit {
    position: fixed;
    bottom: 4px;
    left: 0;
    right: 0;
    z-index: 10;
    text-align: center;
    font-size: 11px;
    color: var(--el-text-color-placeholder);
    pointer-events: none;
  }

  .celebrate-overlay {
    position: fixed;
    inset: 0;
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(rgba(10, 14, 22, 0.58), rgba(10, 14, 22, 0.75)), var(--celebrate-img) center / cover no-repeat;
    pointer-events: none;
  }

  .celebrate-text {
    font-size: 46px;
    font-weight: bold;
    color: #fff;
    letter-spacing: 2px;
    text-shadow: 0 2px 16px rgba(0, 0, 0, 0.6), 0 0 30px rgba(255, 215, 120, 0.9), 0 0 60px rgba(255, 180, 80, 0.5);
    animation: celebrate-pop 1.8s ease-out forwards;
  }

  @keyframes celebrate-pop {
    0% { transform: scale(0.3); opacity: 0; }
    25% { transform: scale(1.2); opacity: 1; }
    55% { transform: scale(1); opacity: 1; }
    100% { transform: scale(1.6); opacity: 0; }
  }

  .confetti {
    position: absolute;
    top: -14px;
    border-radius: 2px;
    opacity: 0.95;
    animation-name: confettiFall;
    animation-timing-function: linear;
    animation-fill-mode: forwards;
    pointer-events: none;
  }
  @keyframes confettiFall {
    0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
    100% { transform: translateY(112vh) rotate(640deg); opacity: 0.55; }
  }

  .celebrate-enter-active,
  .celebrate-leave-active {
    transition: opacity 0.3s;
  }
  .celebrate-enter-from,
  .celebrate-leave-to {
    opacity: 0;
  }

  .el-icon svg {
    height: 1em;
    width: 1em;
  }

  .light-icon {
    color: #606266;
  }

  .dark-icon {
    border-radius: 50%;
    color: #cfd3dc;
    background-color: #141414;
  }

  @media only screen and (max-width: 768px) {
    .game-container {
      min-height: 574px;
      min-width: 356px;
      padding: 80px 8px 24px;
    }
  }
</style>

<style>
  :root {
    --attr-c-health: #4faf3f; --attr-c-attack: #d18a1f; --attr-c-defense: #2f86e0;
    --attr-c-dodge: #0a9a9a; --attr-c-critical: #a55fe6; --attr-c-score: #b8860b;
    --attr-c-name: #5a6b8c; --attr-c-codex: #0f8f8f; --attr-c-collect: #a55fe6;
    --attr-c-na: #d0649a; --attr-c-realm: #2f86e0; --attr-c-cult: #4faf3f;
    --attr-c-calendar: #b0781f; --attr-c-age: #0a9a7a; --attr-c-birth: #d0647a;
    --attr-c-clan: #5a6bc8; --attr-c-fate: #9a55d6; --attr-c-points: #c8871f; --attr-c-dao: #0c9aa8;
  }
  html.dark {
    --attr-c-health: #7bd24f; --attr-c-attack: #f0b653; --attr-c-defense: #6aa9ff;
    --attr-c-dodge: #46d5d5; --attr-c-critical: #c98cfc; --attr-c-score: #ecc14f;
    --attr-c-name: #a9b6d6; --attr-c-codex: #4fd0d0; --attr-c-collect: #c98cfc;
    --attr-c-na: #f08cb4; --attr-c-realm: #6aa9ff; --attr-c-cult: #7bd24f;
    --attr-c-calendar: #e0b258; --attr-c-age: #4fd0b0; --attr-c-birth: #f08ca4;
    --attr-c-clan: #93a3f0; --attr-c-fate: #c98cfc; --attr-c-points: #f0bc58; --attr-c-dao: #4fccdd;
  }
  * {
    user-select: none;
  }

  .el-tooltip__content,
  .el-popper.el-tooltip { white-space: pre-line; }
  .divine-tip { max-width: 360px; line-height: 1.75; }

  html {
    background: #fff;
    overflow: auto;
    --el-color-pink-light: #f48fb1;
    --el-color-pink-light-8: #f8bbd0;
    --el-color-pink-light-9: #fce4ec;
    --el-color-purple-light: #8560f5;
    --el-color-purple-light-8: #d4adf7;
    --el-color-purple-light-9: #f1e3f5;
  }

  html.dark {
    color-scheme: dark;
    background: #141414;
    --el-color-pink-light-8: #5a3c47;
    --el-color-pink-light-9: #3c2a2e;
    --el-color-purple-light-8: #473b5a;
    --el-color-purple-light-9: #2d2636;
    --el-color-primary: #409eff;
    --el-color-primary-light-3: #3375b9;
    --el-color-primary-light-5: #2a598a;
    --el-color-primary-light-7: #213d5b;
    --el-color-primary-light-8: #1d3043;
    --el-color-primary-light-9: #18222c;
    --el-color-primary-dark-2: #66b1ff;
    --el-color-success: #67c23a;
    --el-color-success-light-3: #4e8e2f;
    --el-color-success-light-5: #3e6b27;
    --el-color-success-light-7: #2d481f;
    --el-color-success-light-8: #25371c;
    --el-color-success-light-9: #1c2518;
    --el-color-success-dark-2: #85ce61;
    --el-color-warning: #e6a23c;
    --el-color-warning-light-3: #a77730;
    --el-color-warning-light-5: #7d5b28;
    --el-color-warning-light-7: #533f20;
    --el-color-warning-light-8: #3e301c;
    --el-color-warning-light-9: #292218;
    --el-color-warning-dark-2: #ebb563;
    --el-color-danger: #f56c6c;
    --el-color-danger-light-3: #b25252;
    --el-color-danger-light-5: #854040;
    --el-color-danger-light-7: #582e2e;
    --el-color-danger-light-8: #412626;
    --el-color-danger-light-9: #2b1d1d;
    --el-color-danger-dark-2: #f78989;
    --el-color-error: #f56c6c;
    --el-color-error-light-3: #b25252;
    --el-color-error-light-5: #854040;
    --el-color-error-light-7: #582e2e;
    --el-color-error-light-8: #412626;
    --el-color-error-light-9: #2b1d1d;
    --el-color-error-dark-2: #f78989;
    --el-color-info: #909399;
    --el-color-info-light-3: #6b6d71;
    --el-color-info-light-5: #525457;
    --el-color-info-light-7: #393a3c;
    --el-color-info-light-8: #2d2d2f;
    --el-color-info-light-9: #202121;
    --el-color-info-dark-2: #a6a9ad;
    --el-box-shadow: 0px 12px 32px 4px rgba(0, 0, 0, 0.36), 0px 8px 20px rgba(0, 0, 0, 0.72);
    --el-box-shadow-light: 0px 0px 12px rgba(0, 0, 0, 0.72);
    --el-box-shadow-lighter: 0px 0px 6px rgba(0, 0, 0, 0.72);
    --el-box-shadow-dark: 0px 16px 48px 16px rgba(0, 0, 0, 0.72), 0px 12px 32px #000000, 0px 8px 16px -8px #000000;
    --el-bg-color-page: #0a0a0a;
    --el-bg-color: #141414;
    --el-bg-color-overlay: #1d1e1f;
    --el-text-color-primary: #e5eaf3;
    --el-text-color-regular: #cfd3dc;
    --el-text-color-secondary: #a3a6ad;
    --el-text-color-placeholder: #8d9095;
    --el-text-color-disabled: #6c6e72;
    --el-border-color-darker: #636466;
    --el-border-color-dark: #58585b;
    --el-border-color: #4c4d4f;
    --el-border-color-light: #414243;
    --el-border-color-lighter: #363637;
    --el-border-color-extra-light: #2b2b2c;
    --el-fill-color-darker: #424243;
    --el-fill-color-dark: #39393a;
    --el-fill-color: #303030;
    --el-fill-color-light: #262727;
    --el-fill-color-lighter: #1d1d1d;
    --el-fill-color-extra-light: #191919;
    --el-fill-color-blank: transparent;
    --el-mask-color: rgba(0, 0, 0, 0.8);
    --el-mask-color-extra-light: rgba(0, 0, 0, 0.3);
  }

  .dark .el-switch.is-checked .el-switch__core {
    background-color: #2c2c2c;
    border-color: #4c4d4f;
  }

  a {
    text-decoration: none;
  }

  @media only screen and (min-width: 800px) {
    /* 自定义滚动条 */
    ::-webkit-scrollbar {
      width: 6px;
    }

    /* ::-webkit-scrollbar-track { */
    /* background: #f1f1f1; */
    /* border-radius: 4px; */
    /* } */

    ::-webkit-scrollbar-thumb {
      background-color: rgba(0, 0, 0, 0.2);
      border-radius: 5px;
      opacity: 0.3;
    }

    ::-webkit-scrollbar-thumb:hover {
      background-color: rgba(0, 0, 0, 0.3);
    }
  }

  .attributes {
    display: flex;
    justify-content: center;
  }

  .tag {
    height: 32px;
    padding: 0 10px;
    line-height: 30px;
    font-size: 12px;
    border-width: 1px;
    border-style: solid;
    border-radius: 4px;
    border: var(--el-border);
    box-sizing: border-box;
    white-space: nowrap;
    display: inline-block;
  }

  .el-icon {
    vertical-align: middle;
  }

  .monsterinfo {
    display: flex;
    justify-content: center;
  }

  .monsterinfo-box {
    display: flex;
    flex-direction: column;
  }

  .monsterinfo p {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin: 0;
  }

  .monsterinfo p:first-child {
    justify-content: flex-start;
  }

  .el-tabs__nav-wrap {
    display: flex;
    justify-content: center;
  }

  /* 增加紫色装备配色 */
  .el-tag--purple {
    --el-tag-bg-color: var(--el-color-purple-light-9) !important;
    --el-tag-border-color: var(--el-color-purple-light-8) !important;
    --el-tag-text-color: var(--el-color-purple-light) !important;
  }

  .el-tag.el-tag--purple .el-tag__close {
    --el-tag-text-color: var(--el-color-purple-light) !important;
  }

  .el-tag.el-tag--purple .el-tag__close:hover {
    color: #fff !important;
    background-color: var(--el-color-purple-light) !important;
  }

  /* 增加粉色装备配色 */
  .el-tag--pink {
    --el-tag-bg-color: var(--el-color-pink-light-9) !important;
    --el-tag-border-color: var(--el-color-pink-light-8) !important;
    --el-tag-text-color: var(--el-color-pink-light) !important;
  }

  .el-tag.el-tag--pink .el-tag__close {
    --el-tag-text-color: var(--el-color-pink-light) !important;
  }

  .el-tag.el-tag--pink .el-tag__close:hover {
    color: #fff !important;
    background-color: var(--el-color-pink-light) !important;
  }

  /* 增加青色装备(灵阶)配色 */
  .el-tag--cyan {
    --el-tag-bg-color: #e0f7fa !important;
    --el-tag-border-color: #80deea !important;
    --el-tag-text-color: #00838f !important;
  }
  .el-tag.el-tag--cyan .el-tag__close {
    --el-tag-text-color: #00838f !important;
  }
  .el-tag.el-tag--cyan .el-tag__close:hover {
    color: #fff !important;
    background-color: #00838f !important;
  }

  /* 增加橙色装备(圣阶)配色 */
  .el-tag--orange {
    --el-tag-bg-color: #fff3e0 !important;
    --el-tag-border-color: #ffcc80 !important;
    --el-tag-text-color: #ef6c00 !important;
  }
  .el-tag.el-tag--orange .el-tag__close {
    --el-tag-text-color: #ef6c00 !important;
  }
  .el-tag.el-tag--orange .el-tag__close:hover {
    color: #fff !important;
    background-color: #ef6c00 !important;
  }

  /* 增加亮金装备(皇阶)配色 */
  .el-tag--gold {
    --el-tag-bg-color: #fff8e1 !important;
    --el-tag-border-color: #ffee58 !important;
    --el-tag-text-color: #b8860b !important;
  }
  .el-tag.el-tag--gold .el-tag__close {
    --el-tag-text-color: #b8860b !important;
  }
  .el-tag.el-tag--gold .el-tag__close:hover {
    color: #fff !important;
    background-color: #b8860b !important;
  }

  /* 增加七彩装备(道阶)配色 */
  .el-tag--legendary {
    --el-tag-bg-color: #f3e5f5 !important;
    --el-tag-border-color: #ce93d8 !important;
    --el-tag-text-color: #7b1fa2 !important;
  }
  .el-tag.el-tag--legendary .el-tag__close {
    --el-tag-text-color: #7b1fa2 !important;
  }
  .el-tag.el-tag--legendary .el-tag__close:hover {
    color: #fff !important;
    background-color: #7b1fa2 !important;
  }

  /* .el-button--pink {
        color: #FFF !important;
        background-color: #FF82AB !important;
        border-color: #FF82AB !important;
    }

    .el-button--pink:focus,
    .el-button--pink:hover {
        background-color: #ff82abd4 !important;
        border-color: #ff82abd4 !important;
        color: #FFF !important;
    }

    .el-button--pink.is-disabled {
        background-color: #ff82ab8f !important;
        border-color: #ff82ab00 !important;
    } */

  .attribute .pet {
    border-color: transparent !important;
    background-color: transparent !important;
  }

  /* 折叠 */
  .custom-title {
    width: 100%;
  }

  /* 按钮 */
  .actions {
    margin: 1rem 0;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
  }

  .actions .action {
    width: calc(33.333% - 10px);
    margin: 5px;
  }

  .actions .action .item {
    width: 100%;
  }

  .textColor {
    color: var(--el-color-danger);
  }

  /* 日志 */
  .storyText {
    display: flex;
    justify-content: center;
  }

  .storyText-box {
    height: 650px;
    overflow: auto;
    padding: 0 20px 0 0;
  }

  .el-popover__title {
    text-align: center;
  }

  @media only screen and (max-width: 768px) {
    .el-message-box,
    .el-notification {
      width: 300px !important;
    }

    .el-upload {
      display: inline !important;
    }

    .levels.el-drawer.ltr {
      width: 70% !important;
    }

    .el-dialog,
    .el-drawer {
      width: 92% !important;
      --el-dialog-width: 92% !important;
      --el-drawer-width: 92% !important;
      max-width: 92vw;
    }

    .actions .action {
      width: calc(50% - 10px);
      margin: 5px;
    }

    /* .actions * {
            margin-top: 10px !important;
        }

        .actions *:nth-child(1) {
            margin-left: 10px;
        } */

    /* 日志 */
    .storyText-box {
      height: 600px;
    }

    .el-popup-parent--hidden {
      padding-right: 0 !important;
    }
  }
</style>
