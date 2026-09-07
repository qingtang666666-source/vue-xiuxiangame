<template>
  <div class="market">
    <div class="page-header">
      <div class="title">
        贸易市场 · <span class="realm" v-text="scaleName" /> ·
        <MoneyBar :show-currency="false" compact />
      </div>
      <div class="region-badge">
        <el-tag type="primary" effect="plain">{{ region.name }}</el-tag>
        <span class="region-theme">{{ region.theme }}</span>
      </div>
      <div class="place">
        <el-select v-model="placeId" size="small" class="place-select">
          <el-option v-for="p in MARKET_PLACES" :key="p.id" :label="p.name" :value="p.id" />
        </el-select>
        <span class="place-flavor">{{ place.flavor }}</span>
      </div>
      <div class="scale-hint">市场规模随境界提升（凡级 → 神级，解锁更多货品、价格更优）</div>
      <div class="tide-banner" :class="{ bull: tide > 1.05, bear: tide < 0.95 }">
        市场行情：<b>{{ tideName }}</b>（{{ (tide * 100).toFixed(0) }}%）·
        {{ tide > 1.05 ? '卖出更值钱' : tide < 0.95 ? '买入更便宜' : '价格平稳' }} —— 可低买高卖/囤货
      </div>
    </div>

    <div class="cat-filter" v-if="['market', 'fair', 'black'].includes(tab)">
      <el-select v-model="cat" size="small" style="width: 170px">
        <el-option label="全部类型" value="all" />
        <el-option v-for="c in catOptions.filter(x => x !== 'all')" :key="c" :label="c" :value="c" />
      </el-select>
    </div>

    <div class="cat-filter" v-if="tab === 'market' || tab === 'black'">
      <el-select v-model="craftCat" size="small" style="width: 170px">
        <el-option label="全部奇珍" value="all" />
        <el-option v-for="k in ['丹药', '符箓', '灵器']" :key="k" :label="k" :value="k" />
      </el-select>
    </div>

    <el-tabs v-model="tab">
      <el-tab-pane label="交易坊市" name="market" v-if="hasVenue('market')">
        <div class="section-title">购买（标准价）</div>
        <div class="rows">
          <div v-for="grp in visibleAvailable" :key="grp.cat" class="cat-group">
            <div class="cat-head">{{ grp.cat }}</div>
            <div class="row" v-for="i in grp.list" :key="i.key">
              <div class="info">
                <b>{{ i.name }}</b><span class="sub">{{ i.desc }}</span>
                <span class="price">{{ buyPrice(i.key) }}灵石/个</span>
              </div>
              <div class="ops qty-ops">
                <el-input-number :model-value="qtyOf(i.key)" :min="1" :max="9999" :step="10" size="small" class="qty-input" @update:model-value="v => setQty(i.key, v)" />
                <el-slider :model-value="qtyOf(i.key)" :min="1" :max="200" :step="10" size="small" style="width: 110px" @update:model-value="v => setQty(i.key, v)" />
                <span class="qty-tip" v-if="qtyOf(i.key) >= 10">大宗×{{ qtyOf(i.key) }}</span>
                <el-button size="small" type="primary" @click="buyCust(i.key)">购买</el-button>
              </div>
            </div>
          </div>
        </div>
        <div class="section-title">出售（折价）</div>
        <div class="rows">
          <div class="row" v-for="i in ownedItems" :key="i.key">
            <div class="info">
              <b>{{ i.name }}</b><span class="sub">持有 {{ player.props[i.key] || 0 }} · 卖价 {{ sellPrice(i.key) }}灵石/个</span>
            </div>
              <div class="ops qty-ops">
                <el-input-number :model-value="sQtyOf(i.key)" :min="1" :max="Math.max(1, player.props[i.key] || 0)" :step="1" size="small" class="qty-input" @update:model-value="v => setSellQty(i.key, v)" />
                <el-slider :model-value="sQtyOf(i.key)" :min="1" :max="Math.max(1, player.props[i.key] || 0)" :step="1" size="small" style="width: 100px" @update:model-value="v => setSellQty(i.key, v)" />
                <el-button size="small" type="warning" plain @click="sell(i.key, sQtyOf(i.key))">出售{{ sQtyOf(i.key) > 1 ? '×' + sQtyOf(i.key) : '' }}</el-button>
              </div>
          </div>
        </div>
        <div class="section-title">寄售丹药 / 符箓 / 灵器</div>
        <div class="rows">
          <div class="row" v-for="(p, i) in ownedPills" :key="'p'+i">
            <div class="info">
              <tag :type="p.quality">{{ p.name }}</tag><span class="sub">持有 {{ p.count }} · 寄售价 {{ p.sellPrice }}灵石/个（市场 {{ p.mval }}）</span>
            </div>
            <div class="ops qty-ops">
              <el-input-number :model-value="sQtyOf('p_' + p.id)" :min="1" :max="Math.max(1, p.count || 1)" :step="1" size="small" class="qty-input" @update:model-value="v => setSellQty('p_' + p.id, v)" />
              <el-slider :model-value="sQtyOf('p_' + p.id)" :min="1" :max="Math.max(1, p.count || 1)" :step="1" size="small" style="width: 100px" @update:model-value="v => setSellQty('p_' + p.id, v)" />
              <el-button size="small" type="warning" plain @click="sellP(p, sQtyOf('p_' + p.id))">寄售{{ sQtyOf('p_' + p.id) > 1 ? '×' + sQtyOf('p_' + p.id) : '' }}</el-button>
            </div>
          </div>
          <div class="row" v-for="(t, i) in ownedTalismans" :key="'t'+i">
            <div class="info">
              <tag :type="t.quality">{{ t.name }}</tag><span class="sub">持有 {{ t.count }} · 寄售价 {{ t.sellPrice }}灵石/个（市场 {{ t.mval }}）</span>
            </div>
            <div class="ops qty-ops">
              <el-input-number :model-value="sQtyOf('t_' + t.id)" :min="1" :max="Math.max(1, t.count || 1)" :step="1" size="small" class="qty-input" @update:model-value="v => setSellQty('t_' + t.id, v)" />
              <el-slider :model-value="sQtyOf('t_' + t.id)" :min="1" :max="Math.max(1, t.count || 1)" :step="1" size="small" style="width: 100px" @update:model-value="v => setSellQty('t_' + t.id, v)" />
              <el-button size="small" type="warning" plain @click="sellT(t, sQtyOf('t_' + t.id))">寄售{{ sQtyOf('t_' + t.id) > 1 ? '×' + sQtyOf('t_' + t.id) : '' }}</el-button>
            </div>
          </div>
          <div class="row" v-for="(e, i) in ownedEquips" :key="'e'+i">
            <div class="info">
              <tag :type="e.quality">{{ e.name }}</tag><span class="sub">{{ e.gradeName }}{{ levelNames(e.level) }} · 寄售价 {{ e.sellPrice }}灵石（市场 {{ e.mval }}）</span>
            </div>
            <div class="ops"><el-button size="small" type="warning" plain @click="sellE(e)">寄售</el-button></div>
          </div>
        </div>
        <div class="section-title">奇珍阁（丹药 / 符箓 / 灵器）</div>
        <div class="rows">
          <div v-for="grp in visibleCraft" :key="grp.cat" class="cat-group">
            <div class="cat-head">{{ grp.cat }}</div>
            <div class="row" v-for="c in grp.list" :key="c.name + c.price">
              <el-tooltip :content="itemTip(c)" placement="top" :hide-after="0">
                <div class="info">
                  <tag :type="c.quality">{{ c.name }}</tag>
                  <span class="sub">{{ kindName(c.kind) }} · {{ c.price }}灵石</span>
                </div>
              </el-tooltip>
              <div class="ops qty-ops" v-if="c.kind !== 'equip'">
                <el-input-number :model-value="qtyOf('c_' + c.refId)" :min="1" :max="999" :step="1" size="small" class="qty-input" @update:model-value="v => setQty('c_' + c.refId, v)" />
                <el-button size="small" type="primary" @click="buyCraft(c, qtyOf('c_' + c.refId))">购买×{{ qtyOf('c_' + c.refId) }}</el-button>
              </div>
              <div class="ops" v-else><el-button size="small" type="primary" @click="buyCraft(c, 1)">买1</el-button></div>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="交易会" name="fair" v-if="hasVenue('fair')">
        <div class="section-title">折扣购入</div>
        <div class="bulk-hint">批量：买 10+ 打 9 折 · 50+ 打 85 折 · 100+ 打 8 折</div>
        <div class="rows">
          <div v-for="grp in visibleAvailable" :key="grp.cat" class="cat-group">
            <div class="cat-head">{{ grp.cat }}</div>
            <div class="row" v-for="i in grp.list" :key="i.key">
              <div class="info">
                <b>{{ i.name }}</b><span class="sub">{{ i.desc }}</span>
                <span class="price">{{ fairPrice(i.key) }}灵石/个（买10 {{ fairPrice(i.key, 10) }}）</span>
              </div>
              <div class="ops qty-ops">
                <el-input-number :model-value="qtyOf(i.key)" :min="1" :max="9999" :step="10" size="small" class="qty-input" @update:model-value="v => setQty(i.key, v)" />
                <el-slider :model-value="qtyOf(i.key)" :min="1" :max="200" :step="10" size="small" style="width: 110px" @update:model-value="v => setQty(i.key, v)" />
                <span class="qty-tip" v-if="qtyOf(i.key) >= 10">大宗×{{ qtyOf(i.key) }}</span>
                <el-button size="small" type="success" @click="fair(i.key, qtyOf(i.key))">购买</el-button>
              </div>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="黑市" name="black" v-if="hasVenue('black')">
        <div class="section-title">高价收稀有（限量）</div>
        <div class="rows">
          <div v-for="grp in visibleBlack" :key="grp.cat" class="cat-group">
            <div class="cat-head">{{ grp.cat }}</div>
            <div class="row" v-for="i in grp.list" :key="i.key">
              <div class="info">
                <b>{{ i.name }}</b><span class="sub">库存 {{ i.stock }}</span>
                <span class="price danger">{{ i.price }}灵石/个 <span class="base">(市价 {{ i.base }})</span></span>
              </div>
              <div class="ops qty-ops">
                <el-input-number :model-value="qtyOf('b_' + i.key)" :min="1" :max="i.stock" :step="1" size="small" class="qty-input" @update:model-value="v => setQty('b_' + i.key, v)" />
                <el-slider :model-value="qtyOf('b_' + i.key)" :min="1" :max="i.stock" :step="1" size="small" style="width: 100px" @update:model-value="v => setQty('b_' + i.key, v)" />
                <el-button size="small" type="danger" @click="black(i, qtyOf('b_' + i.key))">购买</el-button>
              </div>
            </div>
          </div>
        </div>
        <div class="section-title">奇珍（丹药 / 符箓 / 灵器，限量）</div>
        <div class="rows">
          <div v-for="grp in visibleBlackCraft" :key="grp.cat" class="cat-group">
            <div class="cat-head">{{ grp.cat }}</div>
            <div class="row" v-for="c in grp.list" :key="c.name + c.price">
              <el-tooltip :content="itemTip(c)" placement="top" :hide-after="0">
                <div class="info">
                  <tag :type="c.quality">{{ c.name }}</tag>
                  <span class="sub">库存 {{ c.stock }} · {{ c.price }}灵石（市价 {{ c.value || c.price }}）</span>
                </div>
              </el-tooltip>
              <div class="ops qty-ops" v-if="c.kind !== 'equip'">
                <el-input-number :model-value="qtyOf('bc_' + c.refId)" :min="1" :max="Math.max(1, c.stock || 1)" :step="1" size="small" class="qty-input" @update:model-value="v => setQty('bc_' + c.refId, v)" />
                <el-button size="small" type="danger" @click="doBlackCraft(c, qtyOf('bc_' + c.refId))">购买×{{ qtyOf('bc_' + c.refId) }}</el-button>
              </div>
              <div class="ops" v-else><el-button size="small" type="danger" @click="doBlackCraft(c, 1)">买1</el-button></div>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="拍卖会" name="auction" v-if="hasVenue('auction')">
        <div class="auction">
          <div class="auc-head">每 1 个自然日开一场，只上高价值拍品（丹/符/器）</div>
          <div class="auc-note">下次拍卖：{{ auctionNext }}</div>
          <div class="auc-list" v-for="lot in auction.lots" :key="lot.name + lot.bid">
            <div class="auc-item">
              <el-tooltip :content="itemTip(lot)" placement="top" :hide-after="0">
                <div class="auc-name">
                  <tag :type="lot.quality || 'info'">{{ lot.name }}</tag>
                  <span class="auc-kind">{{ kindName(lot.kind) }}</span>
                </div>
              </el-tooltip>
              <div class="auc-desc">{{ lot.desc }}</div>
              <div class="auc-bid">当前出价：<b>{{ lot.bid }}</b> 灵石</div>
              <div class="auc-val">
                市价约 {{ formatNumberToChineseUnit(lot.value || 0) }} 灵石 ·
                <span :style="{ color: lot.bid > (lot.value || 0) ? 'var(--el-color-danger)' : 'var(--el-color-success)' }">
                  {{ lot.bid > (lot.value || 0) ? '偏贵' : '划算' }}
                </span>
              </div>
              <el-button type="primary" :disabled="lot.sold || (player.props.money || 0) < lot.bid" @click="auctionBuy(lot)">
                {{ lot.sold ? '已成交' : '出价拍得' }}
              </el-button>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="赌石" name="gamble" v-if="hasVenue('gamble')">
        <div class="gamble">
          <div class="gamble-desc">
            远古石价格 {{ STONE_PRICE }} 灵石。开石：50% 废石渣 / 45% 等值宝物 / 5% 价值百倍以上！
          </div>
          <el-button type="warning" size="large" @click="gamble" :disabled="(player.props.money || 0) < STONE_PRICE">
            买一块远古石并开石
          </el-button>
          <div class="gamble-result" v-if="gambleResult">
            <el-tag :type="gambleResult.tier === 'jackpot' ? 'danger' : gambleResult.tier === 'normal' ? 'success' : 'info'" effect="dark">
              {{ gambleResult.tier === 'jackpot' ? '大赚！' : gambleResult.tier === 'normal' ? '回本' : '垃圾' }}
            </el-tag>
            <div class="result-text">
              开出【{{ gambleResult.result.name }}】×{{ gambleResult.result.qty }}（价值约 {{ formatNumberToChineseUnit(gambleResult.result.value) }} 灵石）
            </div>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>

    <div class="outer-actions">
    </div>
  </div>
</template>

<script setup>
  import { ref, computed, watch, reactive } from 'vue'
  import { useRouter, useRoute } from 'vue-router'
  import { useMainStore } from '@/plugins/store'
  import { formatNumberToChineseUnit, gameNotifys, levelNames } from '@/plugins/game'
  import { ElMessageBox } from 'element-plus'
  import {
    MARKET_SCALES,
    ITEM_DB,
    itemDb,
    availableItems,
    marketScale,
    marketBuy,
    marketSell,
    fairBuy,
    fairSell,
    fairPrice,
    blackStock,
    blackBuy,
    blackCraftList,
    blackCraftBuy,
    auctionLots,
    auctionBuyLot,
    sellPill,
    sellTalisman,
    sellEquip,
    pillSellPrice,
    pillPrice,
    talismanSellPrice,
    talismanPrice,
    equipSellPrice,
    randomCraftList,
    marketCraftBuy,
    MARKET_PLACES,
    marketPlace,
    gambleStone,
    STONE_PRICE,
    marketTide,
    tideLabel,
    itemTip
  } from '@/plugins/market'
  import { recipeById } from '@/plugins/alchemy'
  import { talismanById } from '@/plugins/talisman'
  import { currentRegion, regionHasVenue, VENUE_NAMES } from '@/plugins/regionDb'
  import MoneyBar from '@/components/MoneyBar.vue'

  const store = useMainStore()
  const router = useRouter()
  const route = useRoute()
  const player = ref(store.player)
  const tide = computed(() => marketTide(player.value))
  const tideName = computed(() => tideLabel(tide.value))
  const tab = ref('market')
  const auction = computed(() => auctionLots(player.value, place.value))
  const auctionNext = computed(() => {
    const ms = auction.value.nextIn || 0
    if (ms <= 0) return '即将开拍'
    const h = Math.floor(ms / 3600000)
    const m = Math.floor((ms % 3600000) / 60000)
    return `${h}时${m}分后开新一场`
  })
  const gambleResult = ref(null)
  const placeId = ref(MARKET_PLACES[0].id)
  const craftList = ref([])

  const place = computed(() => marketPlace(placeId.value))
  const region = computed(() => currentRegion(player.value))
  const hasVenue = key => regionHasVenue(player.value, key)

  // 支持从「大世界地图」按 trade venue 深链（如 /market?venue=fair）
  const VENUE_KEYS = ['market', 'fair', 'black', 'auction', 'gamble']
  const qv = route.query.venue
  if (typeof qv === 'string' && VENUE_KEYS.includes(qv) && regionHasVenue(player.value, qv)) {
    tab.value = qv
  }

  const scaleName = computed(() => marketScale(player.value).name + '坊市')
  const available = computed(() => availableItems(player.value, place.value))
  const PROP_CAT = { spiritHerb: '药材', strengtheningStone: '矿石', zhuSha: '符材', qingyuan: '杂货', flying: '法宝', cultivateDan: '丹药', zhenQi: '阵法', xuanTie: '矿材', rootBone: '丹药', yaoDan: '兽材', currency: '稀世' }
  const CAT_ORDER = ['药材', '灵果', '矿石', '矿材', '兽材', '奇珍', '精萃', '符材', '法宝', '丹药', '阵法', '杂货', '稀世']
  const categoryOf = it => (it.type && CAT_ORDER.includes(it.type)) ? it.type : (PROP_CAT[it.key] || '杂货')
  const availableGroups = computed(() => {
    const g = {}
    available.value.forEach(it => {
      const c = categoryOf(it)
      ;(g[c] = g[c] || []).push(it)
    })
    return Object.entries(g)
      .sort((a, b) => (CAT_ORDER.indexOf(a[0]) - CAT_ORDER.indexOf(b[0])) || a[1].length - b[1].length)
      .map(([cat, list]) => ({ cat, list }))
  })
  const cat = ref('all')
  const catOptions = computed(() => {
    const s = new Set()
    availableGroups.value.forEach(g => s.add(g.cat))
    blackGroups.value.forEach(g => s.add(g.cat))
    return ['all', ...s]
  })
  const visibleAvailable = computed(() => (cat.value === 'all' ? availableGroups.value : availableGroups.value.filter(g => g.cat === cat.value)))
  const visibleBlack = computed(() => (cat.value === 'all' ? blackGroups.value : blackGroups.value.filter(g => g.cat === cat.value)))
  const blackGroups = computed(() => {
    const g = {}
    blackList.value.forEach(it => {
      const c = categoryOf(it)
      ;(g[c] = g[c] || []).push(it)
    })
    return Object.entries(g).sort((a, b) => CAT_ORDER.indexOf(a[0]) - CAT_ORDER.indexOf(b[0])).map(([cat, list]) => ({ cat, list }))
  })
  const groupByKind = list => {
    const g = {}
    ;(list || []).forEach(it => {
      const c = kindName(it.kind)
      ;(g[c] = g[c] || []).push(it)
    })
    return Object.entries(g).map(([cat, list]) => ({ cat, list }))
  }
  const craftGroups = computed(() => groupByKind(craftList.value))
  const blackCraftGroups = computed(() => groupByKind(blackCraft.value))
  const craftCat = ref('all')
  const visibleCraft = computed(() => (craftCat.value === 'all' ? craftGroups.value : craftGroups.value.filter(g => g.cat === craftCat.value)))
  const visibleBlackCraft = computed(() => (craftCat.value === 'all' ? blackCraftGroups.value : blackCraftGroups.value.filter(g => g.cat === craftCat.value)))
  const ownedItems = computed(() => availableItems(player.value).filter(i => (player.value.props[i.key] || 0) > 0))
  const blackList = ref([])
  const blackCraft = ref([])

  const buyPrice = key => {
    const it = itemDb(key)
    const s = marketScale(player.value)
    return Math.max(1, Math.floor(it.price * s.buy * tide.value))
  }
  const sellPrice = key => {
    const it = itemDb(key)
    const s = marketScale(player.value)
    return Math.max(1, Math.floor(it.price * s.sell * tide.value))
  }

  const refreshBlack = () => {
    blackList.value = blackStock(player.value, place.value)
  }
  const refreshBlackCraft = () => {
    blackCraft.value = blackCraftList(player.value)
  }
  const refreshCraft = () => {
    craftList.value = randomCraftList(player.value, 3, place.value)
  }
  refreshBlack()
  refreshBlackCraft()
  refreshCraft()
  watch(placeId, () => {
    refreshBlack()
    refreshBlackCraft()
    refreshCraft()
  })

  const kindName = k => ({ resource: '材料', pill: '丹药', talisman: '符箓', equip: '灵器' }[k] || '奇珍')

  const ownedPills = computed(() =>
    (player.value.pills || []).map(p => ({ ...p, recipe: recipeById(p.id), sellPrice: recipeById(p.id) ? pillSellPrice(recipeById(p.id)) : 0, mval: recipeById(p.id) ? pillPrice(recipeById(p.id)) : 0 })).filter(x => x.recipe)
  )
  const ownedTalismans = computed(() =>
    (player.value.talismans || []).map(t => ({ ...t, recipe: talismanById(t.id), sellPrice: talismanById(t.id) ? talismanSellPrice(talismanById(t.id)) : 0, mval: talismanById(t.id) ? talismanPrice(talismanById(t.id)) : 0 })).filter(x => x.recipe)
  )
  const ownedEquips = computed(() => (player.value.inventory || []).map(e => ({ ...e, sellPrice: equipSellPrice(e), mval: equipSellPrice(e) })))

  const buy = (key, qty) => {
    const r = marketBuy(player.value, key, qty)
    if (r.ok) gameNotifys({ title: '坊市', message: `买入【${r.name}】×${r.qty}，花费 ${r.cost} 灵石${r.bulk ? '（大宗折）' : ''}`, type: 'success' })
    else gameNotifys({ title: '坊市', message: r.reason, type: 'error' })
  }
  const qty = reactive({})
  const qtyOf = key => qty[key] || 1
  const setQty = (key, v) => { qty[key] = Math.max(1, Math.floor(v || 1)) }
  const buyCust = key => buy(key, qtyOf(key))
  const sellQty = reactive({})
  const sQtyOf = key => sellQty[key] || 1
  const setSellQty = (key, v) => { sellQty[key] = Math.max(1, Math.floor(v || 1)) }
  const sell = (key, qty) => {
    const r = marketSell(player.value, key, qty)
    if (r.ok) gameNotifys({ title: '坊市', message: `卖出【${r.name}】×${r.qty}，得 ${r.gain} 灵石`, type: 'success' })
    else gameNotifys({ title: '坊市', message: r.reason, type: 'error' })
  }
  const fair = (key, qty) => {
    const r = fairBuy(player.value, key, qty)
    if (r.ok) gameNotifys({ title: '交易会', message: `${r.bulk ? '大宗' : ''}买入【${r.name}】×${r.qty}，花费 ${r.cost} 灵石`, type: 'success' })
    else gameNotifys({ title: '交易会', message: r.reason, type: 'error' })
  }
  const fairBulk = key => {
    const unit1 = fairPrice(player.value, key, 1)
    const unit10 = fairPrice(player.value, key, 10)
    const maxQ = Math.max(1, Math.floor((player.value.props.money || 0) / Math.max(1, unit10)))
    ElMessageBox.prompt(`【${itemDb(key)?.name || key}】单价 ${unit1}，买10及以上单价 ${unit10}（再往上 50/100 更便宜），输入购买数量`, '批量购买', {
      inputValue: String(Math.min(10, maxQ)),
      inputPattern: /^\d+$/,
      inputErrorMessage: '请输入数字',
      confirmButtonText: '购买',
      cancelButtonText: '取消'
    })
      .then(({ value }) => {
        const n = Math.max(1, Math.min(maxQ, parseInt(value) || 1))
        const r = fairBuy(player.value, key, n)
        if (r.ok) gameNotifys({ title: '交易会·批量', message: `买入【${r.name}】×${r.qty}，花费 ${r.cost} 灵石${r.bulk ? '（批量折）' : ''}`, type: 'success' })
        else gameNotifys({ title: '交易会·批量', message: r.reason, type: 'error' })
      })
      .catch(() => {})
  }
  const black = (item, qty = 1) => {
    const r = blackBuy(player.value, item, qty)
    if (r.ok) gameNotifys({ title: '黑市', message: `购入【${r.name}】×${r.qty}，花费 ${r.cost} 灵石`, type: 'success' })
    else gameNotifys({ title: '黑市', message: r.reason, type: 'error' })
  }
    const doBlackCraft = (item, qty = 1) => {
      const r = blackCraftBuy(player.value, item, qty)
    if (r.ok) gameNotifys({ title: '黑市·奇珍', message: `购入【${r.name}】×${r.qty}，花费 ${r.cost} 灵石`, type: 'success' })
    else gameNotifys({ title: '黑市·奇珍', message: r.reason, type: 'error' })
  }
  const sellP = (p, n = 1) => {
    const r = sellPill(player.value, p.id, n)
    if (r.ok) gameNotifys({ title: '寄售', message: `售出【${r.name}】×${n}，得 ${r.gain} 灵石`, type: 'success' })
    else gameNotifys({ title: '寄售', message: r.reason, type: 'error' })
  }
  const sellT = (t, n = 1) => {
    const r = sellTalisman(player.value, t.id, n)
    if (r.ok) gameNotifys({ title: '寄售', message: `售出【${r.name}】×${n}，得 ${r.gain} 灵石`, type: 'success' })
    else gameNotifys({ title: '寄售', message: r.reason, type: 'error' })
  }
  const sellE = e => {
    const r = sellEquip(player.value, e.id, 1)
    if (r.ok) gameNotifys({ title: '寄售', message: `售出【${r.name}】，得 ${r.gain} 灵石`, type: 'success' })
    else gameNotifys({ title: '寄售', message: r.reason, type: 'error' })
  }
  const buyCraft = (c, qty = 1) => {
    const r = marketCraftBuy(player.value, c, qty)
    if (r.ok) gameNotifys({ title: '奇珍阁', message: `购入【${r.name}】×${r.qty}，花费 ${r.cost} 灵石`, type: 'success' })
    else gameNotifys({ title: '奇珍阁', message: r.reason, type: 'error' })
  }
  const auctionBuy = lot => {
    if (!lot) return
    const r = auctionBuyLot(player.value, lot)
    if (r.ok) {
      gameNotifys({ title: '拍卖会', message: `拍得【${r.name}】，花费 ${r.bid} 灵石`, type: 'success' })
    } else {
      gameNotifys({ title: '拍卖会', message: r.reason, type: 'error' })
    }
  }
  const gamble = () => {
    const r = gambleStone(player.value)
    if (r.ok) gambleResult.value = r
    else gameNotifys({ title: '赌石', message: r.reason, type: 'error' })
  }
</script>

<style scoped>
  .cat-group { margin-bottom: 6px; }
  .cat-head { font-weight: bold; font-size: 13px; color: var(--el-color-primary); margin: 8px 0 2px; }
  .auc-head { font-size: 13px; color: var(--el-color-warning); margin-bottom: 4px; }
  .auc-list { margin-bottom: 10px; }
  .auc-item { border: 1px solid var(--el-border-color-lighter); border-radius: 8px; padding: 10px; margin-bottom: 8px; }
  .bulk-hint { font-size: 12px; color: var(--el-color-success); margin-bottom: 6px; }
  .cat-filter { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; justify-content: center; }
  .qty-ops { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
  .qty-input { width: 90px; }
  .qty-tip { font-size: 12px; color: var(--el-color-success); }
  .market { text-align: left; padding: 0 4px; }
  .page-header { margin-bottom: 6px; }
  .region-badge { display: flex; align-items: center; gap: 8px; margin: 4px 0; }
  .region-theme { font-size: 12px; color: var(--el-text-color-secondary); }
  .title { font-size: 20px; font-weight: bold; margin-bottom: 6px; }
  .realm { color: var(--el-color-primary); }
  .place { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
  .place-select { width: 200px; }
  .place-flavor { font-size: 12px; color: var(--el-text-color-secondary); }
  .scale-hint { font-size: 12px; color: var(--el-text-color-secondary); margin-bottom: 8px; }
  .tide-banner {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 8px;
    background: var(--el-fill-color-light);
    color: var(--el-text-color-primary);
    font-size: 13px;
    margin-bottom: 6px;
  }
  .tide-banner.bull { color: #67c23a; background: rgba(103, 194, 58, 0.12); }
  .tide-banner.bear { color: #f56c6c; background: rgba(245, 108, 108, 0.12); }
  .section-title { font-size: 14px; font-weight: bold; margin: 10px 0 8px; }
  .rows { display: flex; flex-direction: column; gap: 6px; }
  .row { display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; border-radius: 4px; background: var(--el-fill-color-light); }
  .info { display: flex; flex-direction: column; }
  .sub { font-size: 12px; color: var(--el-text-color-secondary); }
  .price { font-size: 12px; color: var(--el-color-warning); }
  .price.danger { color: var(--el-color-danger); }
  .base { color: var(--el-text-color-placeholder); font-size: 11px; }
  .ops { display: flex; gap: 6px; }
  .auction { display: flex; flex-direction: column; gap: 12px; }
  .auc-item { display: flex; flex-direction: column; gap: 8px; background: var(--el-fill-color-light); padding: 12px; border-radius: 6px; }
  .auc-name { font-size: 16px; font-weight: bold; }
  .auc-kind { font-size: 12px; color: var(--el-text-color-secondary); margin-left: 8px; }
  .auc-desc { font-size: 12px; color: var(--el-text-color-secondary); }
  .auc-bid { font-size: 14px; }
  .auc-val { font-size: 12px; color: var(--el-text-color-secondary); }
  .auc-note { font-size: 12px; color: var(--el-text-color-secondary); }
  .gamble { display: flex; flex-direction: column; gap: 12px; }
  .gamble-desc { font-size: 13px; color: var(--el-text-color-secondary); }
  .gamble-result { background: var(--el-fill-color-light); padding: 10px; border-radius: 6px; }
  .result-text { margin-top: 6px; font-size: 13px; }
  .outer-actions { margin-top: 16px; display: flex; justify-content: center; }
  @media only screen and (max-width: 768px) {
    .market { padding: 0 2px; }
    .row { flex-direction: column; align-items: stretch; gap: 8px; }
    .info { width: 100%; }
    .ops, .qty-ops { width: 100%; justify-content: space-between; flex-wrap: wrap; }
    .place { flex-direction: column; align-items: stretch; gap: 4px; }
    .place-select { width: 100%; max-width: none; }
    .cat-filter { width: 100%; }
    .cat-filter .el-select { width: 100% !important; }
  }
</style>
