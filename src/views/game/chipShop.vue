<template>
  <div class="chip-shop">
    <div class="shop-head">
      <span>玩家筹码：<b class="chips-num">{{ chips }}</b></span>
      <span class="cycle">当前游戏月份：{{ cycle }}（每 1 游戏月自动刷新）</span>
      <el-button size="small" type="primary" :disabled="chips < 500" @click="doRefresh">立即刷新（500筹码）</el-button>
    </div>
    <div class="shop-grid">
      <div v-for="(it, i) in stock" :key="i" class="shop-item">
        <el-tooltip :content="chipTip(it)" placement="top" :hide-after="0">
          <div class="item-name" @click="viewItem(it)">{{ it.name }}<span v-if="it.tierName" class="tier">{{ it.tierName }}</span></div>
        </el-tooltip>
        <div class="item-kind">{{ kindLabel(it.kind) }}</div>
        <div class="item-price">{{ it.price }} 筹码</div>
        <div class="item-qty">{{ it.unlimited ? '不限量' : '库存 ×' + it.qty }}</div>
        <el-input-number
          v-if="it.kind === 'pill' || it.kind === 'material' || isChestKind(it.kind)"
          :model-value="qtyOf(it.key || it.id)" :min="1" :max="Math.max(1, it.qty || chestMax(it))" :step="1" size="small"
          class="qty-input" @update:model-value="v => setQty(it.key || it.id, v)"
        />
        <el-button
          size="small"
          :type="it.kind === 'blindbox' || it.kind === 'equipchest' || it.kind === 'highchest' ? 'warning' : 'primary'"
          :disabled="(!it.unlimited && it.qty <= 0) || chips < it.price"
          @click="shopAction(it)"
        >
          {{ (it.kind === 'blindbox' || it.kind === 'equipchest' || it.kind === 'highchest' || isConsumeChest(it.kind)) ? (qtyOf(it.key || it.id) > 1 ? '开箱×' + qtyOf(it.key || it.id) : '开箱') : '购买' }}
        </el-button>
      </div>
    </div>
    <div class="shop-note">盲盒宝箱（1000 筹码/个）：5% 开出超出其自身价值 1000 倍的宝物 / 70% 开出垃圾（≤50 筹码）/ 25% 开出 300~600 筹码物品；累计开 888 次未出则必定触发千倍暴击！</div>
    <el-dialog v-model="showInfo" title="商品详情" width="360px">
      <div v-if="info">
        <div class="info-name">{{ info.name }} <span v-if="info.tier" class="tier">{{ info.tier }}</span></div>
        <div class="info-kind">{{ info.kindLabel }} · 售价 {{ info.price }} 筹码</div>
        <div class="info-desc">{{ info.desc || '暂无介绍' }}</div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
  import { ref, computed, onMounted, onBeforeUnmount, reactive } from 'vue'
  import { useMainStore } from '@/plugins/store'
  import { gameNotifys } from '@/plugins/game'
  import { ensureChipShop, refreshChipShop, buyChipItem, openChipBlindBox, openChipEquipChest, openChipHighEquipChest, openChipPillChest, openChipHighPillChest, openChipTalChest, openChipHighTalChest, openChipTechChest, openChipHighTechChest, chipShopCycle, itemInfo } from '@/plugins/chipShop'

  const store = useMainStore()
  const player = ref(store.player)
  const stock = ref([])
  const info = ref(null)
  const showInfo = ref(false)
  const chips = computed(() => player.value.props.chips)
  const cycle = computed(() => chipShopCycle(player.value))

  const kindLabel = k => ({ pill: '丹药', material: '材料', treasure: '天材地宝', blindbox: '宝箱', equipchest: '装备宝箱', highchest: '高阶装备宝箱', scroll: '功法', prop: '杂货', techchest: '功法宝箱', hightechchest: '高阶功法宝箱' }[k] || k)
  const chipTip = it => {
    const i = itemInfo(it)
    return `${i.name}${i.tier ? '（' + i.tier + '）' : ''}\n${i.desc || ''}\n${i.price} 筹码`
  }

  const refreshStock = () => {
    const s = ensureChipShop(player.value)
    stock.value = s.stock
  }

  const qty = reactive({})
  const qtyOf = k => qty[k] || 1
  const setQty = (k, v) => { qty[k] = Math.max(1, Math.floor(v || 1)) }
  const isChestKind = k => ['blindbox', 'equipchest', 'highchest', 'pillchest', 'highpillchest', 'talchest', 'hightalchest', 'techchest', 'hightechchest'].includes(k)
  const chestMax = it => {
    const price = it.price || 1
    const afford = Math.max(0, Math.floor((chips.value || 0) / price))
    return Math.max(1, Math.min(afford || 1, 50))
  }
  const chestOpenFn = it => ({
    blindbox: openChipBlindBox,
    equipchest: openChipEquipChest,
    highchest: openChipHighEquipChest,
    pillchest: openChipPillChest,
    highpillchest: openChipHighPillChest,
    talchest: openChipTalChest,
    hightalchest: openChipHighTalChest,
    techchest: openChipTechChest,
    hightechchest: openChipHighTechChest
  }[it.kind])
  const batchOpen = (it, n) => {
    const openFn = chestOpenFn(it)
    if (!openFn) return
    const texts = []
    let opened = 0
    let jackpot = false
    let fail = ''
    for (let k = 0; k < n; k++) {
      const r = openFn(player.value, it)
      if (r && r.ok) { opened++; texts.push(...(r.texts || [])); if (r.jackpot) jackpot = true }
      else { fail = r?.reason || '筹码不足'; break }
    }
    if (opened) gameNotifys({ title: (jackpot ? '🎉 暴击！' : '批量开箱') + ` ×${opened}`, message: `获得：${texts.slice(0, 8).join('，')}${texts.length > 8 ? ' …' : ''}`, type: jackpot ? 'success' : 'info', duration: 6500 })
    else gameNotifys({ title: '开箱失败', message: fail, type: 'warning' })
    refreshStock()
  }
  const singleOpen = it => {
    if (it.kind === 'blindbox') openBox(it)
    else if (it.kind === 'equipchest') openChest(it)
    else if (it.kind === 'highchest') openHighChest(it)
    else openConsume(it)
  }
  const shopAction = it => {
    if (isChestKind(it.kind)) {
      const n = qtyOf(it.key || it.id)
      if (n > 1) batchOpen(it, n)
      else singleOpen(it)
      return
    }
    if (it.kind === 'pill' || it.kind === 'material') buy(it, qtyOf(it.key || it.id))
    else buy(it, 1)
  }
  const buy = (it, n = 1) => {
    let ok = 0
    for (let i = 0; i < n; i++) {
      const r = buyChipItem(player.value, it)
      if (r.ok) ok++
      else break
    }
    if (ok) gameNotifys({ title: '购得', message: `获得【${it.name}】×${ok}`, type: 'success' })
    else gameNotifys({ title: '购买失败', message: '筹码不足或已售罄', type: 'warning' })
    refreshStock()
  }

  const viewItem = it => {
    info.value = itemInfo(it)
    showInfo.value = true
  }

  const openBox = it => {
    const r = openChipBlindBox(player.value, it)
    if (r.ok) {
      gameNotifys({
        title: r.jackpot ? '🎉 盲盒·千倍暴击！' : '盲盒宝箱',
        message: `开出：${r.texts.join('，')}`,
        type: r.jackpot ? 'success' : 'info',
        duration: r.jackpot ? 7000 : 3000
      })
    } else {
      gameNotifys({ title: '开箱失败', message: r.reason, type: 'warning' })
    }
    refreshStock()
  }
  const openChest = it => {
    const r = openChipEquipChest(player.value, it)
    if (r.ok) gameNotifys({ title: r.jackpot ? '🎉 无上套装！' : '装备宝箱', message: `开出：${r.texts.join('，')}`, type: r.jackpot ? 'success' : 'info', duration: r.jackpot ? 7000 : 4000 })
    else gameNotifys({ title: '开箱失败', message: r.reason, type: 'warning' })
    refreshStock()
  }
  const openHighChest = it => {
    const r = openChipHighEquipChest(player.value, it)
    if (r.ok) gameNotifys({ title: r.jackpot ? '🎉 无上神装！' : '高阶装备宝箱', message: `开出：${r.texts.join('，')}`, type: r.jackpot ? 'success' : 'info', duration: r.jackpot ? 7000 : 4000 })
    else gameNotifys({ title: '开箱失败', message: r.reason, type: 'warning' })
    refreshStock()
  }
  const isConsumeChest = k => ['pillchest', 'highpillchest', 'talchest', 'hightalchest', 'techchest', 'hightechchest'].includes(k)
  const openConsume = it => {
    const r = (it.kind === 'pillchest' && openChipPillChest(player.value, it)) ||
      (it.kind === 'highpillchest' && openChipHighPillChest(player.value, it)) ||
      (it.kind === 'talchest' && openChipTalChest(player.value, it)) ||
      (it.kind === 'hightalchest' && openChipHighTalChest(player.value, it)) ||
      (it.kind === 'techchest' && openChipTechChest(player.value, it)) ||
      (it.kind === 'hightechchest' && openChipHighTechChest(player.value, it))
    if (r && r.ok) gameNotifys({ title: r.jackpot ? '🎉 大礼包！' : it.name, message: `开出：${r.texts.join('，')}`, type: r.jackpot ? 'success' : 'info', duration: r.jackpot ? 6000 : 4000 })
    else gameNotifys({ title: '开箱失败', message: r?.reason || '未知宝箱', type: 'warning' })
    refreshStock()
  }

  const doRefresh = () => {
    const r = refreshChipShop(player.value)
    if (r.ok) {
      stock.value = r.stock
      gameNotifys({ title: '刷新成功', message: '来了一批新货', type: 'success' })
    } else {
      gameNotifys({ title: '刷新失败', message: r.reason, type: 'warning' })
    }
  }

  let timer
  onMounted(() => {
    refreshStock()
    timer = setInterval(refreshStock, 10000)
  })
  onBeforeUnmount(() => clearInterval(timer))
</script>

<style scoped>
  .chip-shop {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    padding: 16px;
  }

  .shop-head {
    display: flex;
    flex-wrap: wrap;
    gap: 14px;
    align-items: center;
    justify-content: center;
  }

  .chips-num { color: #c8861f; }

  .cycle {
    color: #909399;
    font-size: 13px;
  }

  .shop-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    justify-content: center;
    max-width: 640px;
  }

  .shop-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 12px;
    border-radius: 10px;
    background: var(--el-fill-color-light);
    min-width: 120px;
  }

  .item-name {
    font-weight: bold;
    color: var(--el-text-color-primary);
    cursor: pointer;
  }

  .tier {
    margin-left: 4px;
    color: #e6a23c;
    font-size: 12px;
  }

  .item-kind,
  .item-qty {
    color: #909399;
    font-size: 12px;
  }

  .item-price {
    color: #e6a23c;
    font-weight: bold;
  }

  .qty-input { width: 90px; }

  .shop-note {
    color: #909399;
    font-size: 12px;
    max-width: 560px;
    text-align: center;
  }

  .info-name {
    font-size: 16px;
    font-weight: bold;
    color: var(--el-text-color-primary);
  }

  .info-kind {
    margin: 6px 0;
    color: #e6a23c;
    font-weight: bold;
  }

  .info-desc {
    color: var(--el-text-color-secondary);
    line-height: 1.6;
  }
</style>
