<template>
  <div class="back">
    <div class="page-header">
      <div class="title">🎒 背包</div>
      <div class="resources">
        <MoneyBar :show-currency="false" compact />
        <el-tag type="danger">炼器石 {{ player.props.strengtheningStone || 0 }}</el-tag>
        <el-button size="small" type="primary" plain @click="sortInventory">一键整理</el-button>
      </div>
    </div>

    <el-tabs v-model="tab" stretch>
      <el-tab-pane label="装备" name="equip">
        <div class="eq-section" v-if="equippedSlots.length">
          <div class="section-title">已装备</div>
          <div class="grid">
            <div class="cell equipped-cell" v-for="s in equippedSlots" :key="s.key">
              <tag :type="s.item.quality" @click="showItem(s.item)">{{ s.item.name }}</tag>
              <div class="sub">{{ genre[s.key] }} · +{{ s.item.strengthen || 0 }}{{ s.item.refine ? ' · 精+' + s.item.refine : '' }}</div>
              <div class="v">价值 {{ formatNumberToChineseUnit(valueOf(s.item)) }} 灵石</div>
              <div class="ops">
                <el-button size="small" type="warning" plain @click="unequipItem(s.key)">卸下</el-button>
                <el-button size="small" type="primary" plain @click="goForge">强化</el-button>
                <el-button size="small" type="success" plain @click="goForge">精炼</el-button>
                <el-button size="small" type="info" plain @click="rerollItem(s.item)">洗练</el-button>
                <el-button size="small" type="success" plain @click="enchantItem(s.item)">附魔</el-button>
              </div>
            </div>
          </div>
        </div>
        <div class="batch-bar">
          <el-button size="small" type="primary" plain :disabled="!player.inventory.length" @click="sortInventory">一键整理</el-button>
          <el-button size="small" type="danger" plain :disabled="!player.inventory.length" @click="batchDecompose">批量分解</el-button>
          <el-button size="small" type="warning" plain :disabled="!player.inventory.length" @click="batchSellEquip">批量出售全部</el-button>
        </div>
        <div class="grid">
          <div class="cell" v-for="it in invItems" :key="it.id">
            <el-tooltip :content="eqTip(it)" placement="top" :hide-after="0">
              <tag :type="it.quality" @click="showItem(it)">{{ it.name }}</tag>
            </el-tooltip>
            <div class="sub">{{ genre[it.type] }} · {{ it.gradeName }} {{ it.noReq ? '无穿戴限制' : levelNames(it.level) }}</div>
            <div class="v">价值 {{ formatNumberToChineseUnit(valueOf(it)) }} 灵石</div>
            <div class="ops">
              <el-button size="small" type="primary" @click="equipItem(it)">穿戴</el-button>
              <el-button size="small" type="danger" plain @click="decompose(it)">分解</el-button>
              <el-button size="small" type="warning" plain @click="sellEquipOne(it)">出售</el-button>
              <el-button size="small" type="info" plain @click="rerollItem(it)">洗练</el-button>
              <el-button size="small" type="success" plain @click="enchantItem(it)">附魔</el-button>
            </div>
          </div>
          <el-empty v-if="!player.inventory.length" description="背包空空如也" :image-size="60" />
        </div>
        <PageNav :page="invPage" :total="invTotal" @change="setInvPage" />
      </el-tab-pane>
      <el-tab-pane label="道具" name="prop">
        <div class="grid">
          <div class="cell" v-for="p in propItems" :key="p.key">
            <el-tooltip :content="propTip(p)" placement="top" :hide-after="0">
              <div class="pname clickable" @click="showProp(p)">{{ propItemNames[p.key]?.name || p.key }}</div>
            </el-tooltip>
            <div class="sub">×{{ p.num }} · 价值 {{ formatNumberToChineseUnit(propValue(p)) }} 灵石</div>
            <div class="ops">
              <el-button size="small" type="warning" plain @click="sellBatch('prop', p.key, propItemNames[p.key]?.name || p.key)">批量出售</el-button>
              <el-button size="small" type="danger" plain @click="sellAllOf('prop', p.key, propItemNames[p.key]?.name || p.key)">全卖</el-button>
            </div>
          </div>
          <el-empty v-if="!props.length" description="暂无道具" :image-size="60" />
        </div>
        <PageNav :page="propPage" :total="propTotal" @change="setPropPage" />
      </el-tab-pane>
      <el-tab-pane label="丹药" name="pill">
        <div class="grid">
          <div class="cell" v-for="p in pillItems" :key="p.id">
            <el-tooltip :content="pillTip(p)" placement="top" :hide-after="0">
              <tag :type="p.recipe.quality" @click="showPillInfo(p)">{{ p.recipe.name }}</tag>
            </el-tooltip>
            <div class="sub">×{{ p.count }} · 价值 {{ formatNumberToChineseUnit(pillPrice(p.recipe)) }} 灵石</div>
            <div class="buff-left" v-if="buffLeftText(p.recipe.name)">{{ buffLeftText(p.recipe.name) }}</div>
            <div class="ops">
              <el-button size="small" type="primary" @click="takePill(p)">服用</el-button>
              <el-button size="small" type="success" plain @click="useBatch(p)">批量服用</el-button>
              <el-button size="small" type="warning" plain @click="sellBatch('pill', p.id, p.recipe.name)">批量出售</el-button>
              <el-button size="small" type="danger" plain @click="sellAllOf('pill', p.id, p.recipe.name)">全卖</el-button>
            </div>
          </div>
          <el-empty v-if="!pillList.length" description="暂无丹药" :image-size="60" />
        </div>
        <PageNav :page="pillPage" :total="pillTotal" @change="setPillPage" />
      </el-tab-pane>
      <el-tab-pane label="符箓" name="tal">
        <div class="grid">
          <div class="cell" v-for="t in talItems" :key="t.id">
            <el-tooltip :content="talTip(t)" placement="top" :hide-after="0">
              <tag :type="t.recipe.quality" @click="showTalInfo(t)">{{ t.recipe.name }}</tag>
            </el-tooltip>
            <div class="sub">×{{ t.count }} · 价值 {{ formatNumberToChineseUnit(talismanPrice(t.recipe)) }} 灵石</div>
            <div class="buff-left" v-if="buffLeftText(t.recipe.name)">{{ buffLeftText(t.recipe.name) }}</div>
            <div class="ops">
              <el-button size="small" type="primary" @click="useTal(t)">使用</el-button>
              <el-button size="small" type="success" plain @click="useTalBatch(t)">批量使用</el-button>
              <el-button size="small" type="warning" plain @click="sellBatch('tal', t.id, t.recipe.name)">批量出售</el-button>
              <el-button size="small" type="danger" plain @click="sellAllOf('tal', t.id, t.recipe.name)">全卖</el-button>
            </div>
          </div>
          <el-empty v-if="!talList.length" description="暂无符箓" :image-size="60" />
        </div>
        <PageNav :page="talPage" :total="talTotal" @change="setTalPage" />
      </el-tab-pane>
      <el-tab-pane label="灵宠" name="pet">
        <div class="grid">
          <div class="cell" v-for="(p, i) in petItems" :key="i">
            <div class="pname">{{ p.name }}</div>
            <div class="sub">{{ levelNames(p.level) }}</div>
          </div>
          <el-empty v-if="!player.pets.length" description="暂无灵宠" :image-size="60" />
        </div>
        <PageNav :page="petPage" :total="petTotal" @change="setPetPage" />
      </el-tab-pane>
      <el-tab-pane label="道侣" name="wife">
        <div class="grid">
          <div class="cell" v-for="(w, i) in wifeItems" :key="i">
            <div class="pname">{{ w.name }}</div>
            <div class="sub">{{ levelNames(w.level) }}</div>
          </div>
          <el-empty v-if="!player.wifes.length" description="暂无道侣" :image-size="60" />
        </div>
        <PageNav :page="wifePage" :total="wifeTotal" @change="setWifePage" />
      </el-tab-pane>
    </el-tabs>

    <div class="hint">穿戴 / 强化 / 技能 等操作请回主页。主页左上角「🎒 背包」即可返回这里。</div>
    <item-info :visible="infoShow" :data="infoData" @update:visible="infoShow = $event" />
  </div>
</template>

<script setup>
  import { ref, computed } from 'vue'
  import { useRouter } from 'vue-router'
  import { ElMessageBox } from 'element-plus'
  import { useMainStore } from '@/plugins/store'
  import { formatNumberToChineseUnit, levelNames, levels, genre, gameNotifys } from '@/plugins/game'
  import { propItemNames } from '@/plugins/game'
  import equip from '@/plugins/equip'
  import { equipSellPrice, itemDb } from '@/plugins/market'
  import { recipeById, usePill as usePillFn, usePillBatch } from '@/plugins/alchemy'
  import { talismanById, useTalisman as useTalismanFn, useTalismanBatch } from '@/plugins/talisman'
  import { activeBuffs, buffEffectText, formatBuffRemaining, useBuffClock } from '@/plugins/buffs'
  import { sourceOfEquip, sourceOfPill, sourceOfProp, sourceOfTalisman } from '@/plugins/itemSource'
  import { pillPrice, talismanPrice, quickSell, quickSellUnit, quickSellEquip, equipQuickSellPrice } from '@/plugins/market'
  import tag from '@/components/tag.vue'
  import itemInfo from '@/components/itemInfo.vue'
  import MoneyBar from '@/components/MoneyBar.vue'
  import { setById } from '@/plugins/equipSetDb'
  import { rerollCost, enchantCost, canAfford, payCost, rerollItemAffixes, enchantItemAffix, affixCap } from '@/plugins/affixForge'
  import { usePager, useViewportPageSize } from '@/plugins/pager'
  import PageNav from '@/components/PageNav.vue'

  const store = useMainStore()
  const router = useRouter()
  const player = ref(store.player)
  const tab = ref('equip')
  const infoShow = ref(false)
  const infoData = ref(null)
  const buffNow = useBuffClock(1000)
  const activeBuffMap = computed(() => {
    buffNow.value
    const map = {}
    activeBuffs(player.value).forEach(b => {
      map[b.name] = b
    })
    return map
  })
  const buffLeftText = name => {
    const b = activeBuffMap.value[name]
    return b ? `生效中 · 剩余 ${formatBuffRemaining(b.expireAt, buffNow.value)}${buffEffectText(b.effect) ? ` · ${buffEffectText(b.effect)}` : ''}` : ''
  }

  const props = computed(() => {
    const obj = player.value.props || {}
    return Object.keys(obj)
      .filter(k => k !== 'money')
      .map(k => ({ key: k, num: obj[k], tier: itemDb(k)?.minScale || 0 }))
      .filter(p => p.num > 0)
      .sort((a, b) => (b.tier || 0) - (a.tier || 0))
  })

  const decompose = it => {
    const num = (it.level || 1) + Math.floor((it.level || 1) * (player.value.reincarnation || 0) / 10)
    player.value.props.strengtheningStone = (player.value.props.strengtheningStone || 0) + num
    player.value.inventory = player.value.inventory.filter(x => x.id !== it.id)
    gameNotifys({ title: '分解', message: `分解【${it.name}】，获得 ${num} 炼器石`, type: 'success' })
  }

  const sellEquipOne = it => {
    const r = quickSellEquip(player.value, it.id)
    if (r.ok) gameNotifys({ title: '出售', message: `卖出【${r.name}】+${formatNumberToChineseUnit(r.gain)} 灵石`, type: 'success' })
    else gameNotifys({ title: '出售', message: r.reason, type: 'warning' })
  }
  const batchDecompose = () => {
    const list = [...player.value.inventory]
    if (!list.length) return
    ElMessageBox.confirm(`将分解全部 ${list.length} 件装备，各得炼器石（按等级），确定？`, '批量分解', {
      confirmButtonText: '分解全部',
      cancelButtonText: '取消'
    })
      .then(() => {
        let total = 0
        list.forEach(it => {
          const num = (it.level || 1) + Math.floor((it.level || 1) * (player.value.reincarnation || 0) / 10)
          total += num
          player.value.props.strengtheningStone = (player.value.props.strengtheningStone || 0) + num
        })
        player.value.inventory = []
        gameNotifys({ title: '批量分解', message: `分解 ${list.length} 件，共得 ${total} 炼器石`, type: 'success' })
      })
      .catch(() => {})
  }
  const batchSellEquip = () => {
    const list = [...player.value.inventory]
    if (!list.length) return
    const total = list.reduce((a, it) => a + equipQuickSellPrice(it), 0)
    ElMessageBox.confirm(`将全部 ${list.length} 件装备按 8 折出售，共得约 ${formatNumberToChineseUnit(total)} 灵石，确定？`, '批量出售', {
      confirmButtonText: '全部出售',
      cancelButtonText: '取消'
    })
      .then(() => {
        let gain = 0
        list.forEach(it => { gain += quickSellEquip(player.value, it.id).gain || 0 })
        player.value.inventory = []
        gameNotifys({ title: '批量出售', message: `全部出售，共得 ${formatNumberToChineseUnit(gain)} 灵石`, type: 'success' })
      })
      .catch(() => {})
  }
  const QUALITY_RANK = { info: 1, success: 2, primary: 3, purple: 4, pink: 5, warning: 6, danger: 7, cyan: 8, orange: 9, gold: 10, legendary: 11 }
  const sortInventory = () => {
    player.value.inventory.sort(
      (a, b) =>
        (QUALITY_RANK[b.quality] || 0) - (QUALITY_RANK[a.quality] || 0) ||
        ((a.setId || '').localeCompare(b.setId || '')) ||
        (b.grade || 0) - (a.grade || 0) ||
        (b.score || 0) - (a.score || 0) ||
        (b.level || 0) - (a.level || 0)
    )
    ;(player.value.pills || []).sort((a, b) => (recipeById(b.id)?.tier || 0) - (recipeById(a.id)?.tier || 0))
    ;(player.value.talismans || []).sort((a, b) => (talismanById(b.id)?.tier || 0) - (talismanById(a.id)?.tier || 0))
    gameNotifys({ title: '一键整理', message: '已按品级/阶位/评分整理', type: 'success' })
  }

  const applyStats = (item, sign) => {
    player.value.dodge = (player.value.dodge || 0) + sign * (item.dodge || 0)
    player.value.attack = (player.value.attack || 0) + sign * (item.attack || 0)
    player.value.maxHealth = (player.value.maxHealth || 0) + sign * (item.health || 0)
    player.value.health = (player.value.health || 0) + sign * (item.health || 0)
    player.value.defense = (player.value.defense || 0) + sign * (item.defense || 0)
    player.value.critical = (player.value.critical || 0) + sign * (item.critical || 0)
    player.value.score = equip.calculateEquipmentScore(
      player.value.dodge,
      player.value.attack,
      player.value.maxHealth,
      player.value.critical,
      player.value.defense
    )
  }

  const equipItem = it => {
    if (!player.value.reincarnation && !it.noReq && it.level > player.value.level) {
      gameNotifys({ title: '穿戴', message: `境界不足，需 ${levelNames(it.level)}`, type: 'error' })
      return
    }
    const type = it.type
    const cur = player.value.equipment[type]
    if (cur && cur.id) {
      applyStats(cur, -1)
      player.value.inventory.push(cur)
      player.value.equipment[type] = {}
    }
    player.value.inventory = player.value.inventory.filter(x => x.id !== it.id)
    player.value.equipment[type] = it
    applyStats(it, 1)
    gameNotifys({ title: '穿戴', message: `已穿上【${it.name}】`, type: 'success' })
  }

  const unequipItem = type => {
    const cur = player.value.equipment[type]
    if (!cur || !cur.id) return
    applyStats(cur, -1)
    player.value.equipment[type] = {}
    player.value.inventory.push(cur)
    gameNotifys({ title: '卸下', message: `已卸下【${cur.name}】`, type: 'info' })
  }

  const equippedSlots = computed(() => {
    const eq = player.value.equipment || {}
    return ['weapon', 'armor', 'accessory', 'sutra'].map(k => ({ key: k, item: eq[k] })).filter(s => s.item && s.item.name)
  })

  const showItem = it => {
    infoData.value = {
      title: it.name,
      rows: [
        { k: '类型', v: genre[it.type] },
        { k: '境界', v: it.noReq ? '无限制' : levelNames(it.level) },
        { k: '品质', v: levels[it.quality] },
        { k: '细分级', v: it.gradeName },
        { k: '强化', v: it.strengthen ? '+' + it.strengthen : '无' },
        { k: '精炼', v: it.refine ? '+' + it.refine : '无' },
        { k: '气血', v: formatNumberToChineseUnit(it.health) },
        { k: '攻击', v: formatNumberToChineseUnit(it.attack) },
        { k: '防御', v: formatNumberToChineseUnit(it.defense) },
        { k: '暴击', v: (it.critical * 100).toFixed(1) + '%' },
        { k: '闪避', v: (it.dodge * 100).toFixed(1) + '%' },
        { k: '评分', v: Math.round(it.score || 0).toLocaleString('zh-CN') },
        ...(it.setId
          ? [(() => {
              const set = setById(it.setId)
              const count = Object.values(player.value.equipment || {}).filter(s => s && s.setId === it.setId).length
              return { k: '专属套装', v: `${set?.name || it.setName || ''} · 已穿 ${count}/4 件` }
            })()]
          : [])
      ],
      affixes: (it.affixes || []).map(a =>
        a.type === 'stat'
          ? { name: a.name, text: a.value, desc: '' }
          : { name: a.name, text: (a.triggerChance * 100).toFixed(1) + '% 触发' + (a.cooldown ? ' · 冷却' + a.cooldown + '回合' : ''), desc: a.desc }
      ),
      effects: [sourceOfEquip(it)]
    }
    infoShow.value = true
  }

  const showProp = p => {
    const info = propItemNames[p.key]
    infoData.value = { title: info?.name || p.key, rows: [{ k: '数量', v: p.num }], effects: [info?.desc, sourceOfProp(p.key)].filter(Boolean) }
    infoShow.value = true
  }
  const eqTip = it => `【${it.name}】${it.gradeName || ''}${it.level || ''}级\n攻击 ${Math.round(it.attack || 0)} · 防御 ${Math.round(it.defense || 0)} · 气血 ${Math.round(it.health || 0)} · 暴击 ${((it.critical || 0) * 100).toFixed(1)}%\n价值 ${equipSellPrice(it)} 灵石`
  const propTip = p => `${propItemNames[p.key]?.name || p.key}\n${propItemNames[p.key]?.desc || ''}\n价值 ${propValue(p)} 灵石`
  const pillTip = p => `【${p.recipe.name}】${p.recipe.effectText || ''}\n${p.recipe.detail || ''}${buffLeftText(p.recipe.name) ? `\n${buffLeftText(p.recipe.name)}` : ''}\n${sourceOfPill()}\n价值 ${pillPrice(p.recipe)} 灵石`
  const talTip = t => `【${t.recipe.name}】${t.recipe.effectText || ''}${buffLeftText(t.recipe.name) ? `\n${buffLeftText(t.recipe.name)}` : ''}\n${sourceOfTalisman()}\n价值 ${talismanPrice(t.recipe)} 灵石`

  const valueOf = it => {
    if (it.type && it.quality && it.score != null) return equipSellPrice(it)
    return 0
  }
  const propValue = p => (itemDb(p.key)?.price || 0) * p.num
  const goForge = () => {
    gameNotifys({ title: '装备强化/精炼', message: '请回主页装备栏进行强化或精炼', type: 'info' })
    router.push('/home')
  }

  const equippedTypeOf = id => {
    const eq = player.value.equipment || {}
    return ['weapon', 'armor', 'accessory', 'sutra'].find(t => eq[t] && eq[t].id === id)
  }

  const applyDelta = d => {
    player.value.dodge = (player.value.dodge || 0) + d.dodge
    player.value.attack = (player.value.attack || 0) + d.attack
    player.value.maxHealth = (player.value.maxHealth || 0) + d.health
    player.value.health = (player.value.health || 0) + d.health
    player.value.defense = (player.value.defense || 0) + d.defense
    player.value.critical = (player.value.critical || 0) + d.critical
    player.value.score = equip.calculateEquipmentScore(player.value.dodge, player.value.attack, player.value.maxHealth, player.value.critical, player.value.defense)
  }

  const rerollItem = item => {
    if (!item || !Array.isArray(item.affixes) || !item.affixes.length) {
      gameNotifys({ title: '洗练', message: '该装备无词条可洗', type: 'warning' })
      return
    }
    const cost = rerollCost(item)
    const costText = `将重掷【${item.name}】的词条（保留基础的强化等级）。<br>需要灵石 ${formatNumberToChineseUnit(cost.money)}、炼器石 ${cost.stone}`
    ElMessageBox.confirm(costText, '词条洗练', {
      center: true,
      confirmButtonText: '洗练',
      cancelButtonText: '取消',
      dangerouslyUseHTMLString: true
    })
      .then(() => {
        if (!canAfford(player.value, cost)) return gameNotifys({ title: '洗练', message: '资源不足', type: 'warning' })
        payCost(player.value, cost)
        const type = equippedTypeOf(item.id)
        const r = rerollItemAffixes(item)
        if (!r.ok) return gameNotifys({ title: '洗练', message: r.reason, type: 'warning' })
        if (type) applyDelta(r.delta)
        gameNotifys({ title: '洗练', message: `【${item.name}】词条已重掷`, type: 'success' })
      })
      .catch(() => {})
  }

  const enchantItem = item => {
    if (!item || !Array.isArray(item.affixes)) {
      gameNotifys({ title: '附魔', message: '该装备无词条对象', type: 'warning' })
      return
    }
    if (item.affixes.length >= affixCap(item)) {
      gameNotifys({ title: '附魔', message: '词条数量已达上限', type: 'warning' })
      return
    }
    const cost = enchantCost(item)
    const costText = `将为【${item.name}】追加一条新词条（当前 ${item.affixes.length}/${affixCap(item)}）。<br>需要灵石 ${formatNumberToChineseUnit(cost.money)}、炼器石 ${cost.stone}${cost.dan ? '、培养丹 ' + cost.dan : ''}`
    ElMessageBox.confirm(costText, '装备附魔', {
      center: true,
      confirmButtonText: '附魔',
      cancelButtonText: '取消',
      dangerouslyUseHTMLString: true
    })
      .then(() => {
        if (!canAfford(player.value, cost)) return gameNotifys({ title: '附魔', message: '资源不足', type: 'warning' })
        payCost(player.value, cost)
        const type = equippedTypeOf(item.id)
        const r = enchantItemAffix(item)
        if (!r.ok) return gameNotifys({ title: '附魔', message: r.reason, type: 'warning' })
        if (type) applyDelta(r.delta)
        const na = r.newAffix
        gameNotifys({ title: '附魔', message: `【${item.name}】附魔成功，获得词条【${na.name}】${na.value != null ? ' +' + na.value : ''}`, type: 'success' })
      })
      .catch(() => {})
  }

  const pillList = computed(() => (player.value.pills || []).map(p => ({ ...p, recipe: recipeById(p.id) })).filter(x => x.recipe).sort((a, b) => (b.recipe?.tier || 0) - (a.recipe?.tier || 0)))
  const talList = computed(() => (player.value.talismans || []).map(x => ({ ...x, recipe: talismanById(x.id) })).filter(x => x.recipe).sort((a, b) => (b.recipe?.tier || 0) - (a.recipe?.tier || 0)))
  const invList = computed(() => player.value.inventory || [])
  const petList = computed(() => player.value.pets || [])
  const wifeList = computed(() => player.value.wifes || [])
  const bpSize = useViewportPageSize(100, 4)
  const { page: invPage, total: invTotal, pageItems: invItems, setPage: setInvPage } = usePager(invList, bpSize)
  const { page: propPage, total: propTotal, pageItems: propItems, setPage: setPropPage } = usePager(props, bpSize)
  const { page: pillPage, total: pillTotal, pageItems: pillItems, setPage: setPillPage } = usePager(pillList, bpSize)
  const { page: talPage, total: talTotal, pageItems: talItems, setPage: setTalPage } = usePager(talList, bpSize)
  const { page: petPage, total: petTotal, pageItems: petItems, setPage: setPetPage } = usePager(petList, bpSize)
  const { page: wifePage, total: wifeTotal, pageItems: wifeItems, setPage: setWifePage } = usePager(wifeList, bpSize)
  const takePill = p => {
    const r = usePillFn(player.value, p.id)
    if (r.ok) gameNotifys({ title: '服用', message: `服下【${p.recipe.name}】${r.buff ? `，${buffLeftText(p.recipe.name)}` : r.reason || ''}`, type: 'success' })
    else gameNotifys({ title: '服用', message: r.reason, type: 'error' })
  }
  const useTal = t => {
    const r = useTalismanFn(player.value, t.id)
    if (r.ok) gameNotifys({ title: '使用', message: `使用【${t.recipe.name}】，${t.recipe.effectText || ''}${r.buff ? ` · ${buffLeftText(t.recipe.name)}` : ''}`, type: 'success' })
    else gameNotifys({ title: '使用', message: r.reason, type: 'error' })
  }

  const useTalBatch = t => {
    const cnt = t.count || 0
    if (cnt <= 0) return
    ElMessageBox.prompt(`【${t.recipe.name}】现有 ×${cnt}，输入使用数量`, '批量使用', {
      inputValue: String(cnt),
      inputPattern: /^\d+$/,
      inputErrorMessage: '请输入数字',
      confirmButtonText: '使用',
      cancelButtonText: '取消'
    })
      .then(({ value }) => {
        const n = Math.max(1, Math.min(cnt, parseInt(value) || 1))
        const r = useTalismanBatch(player.value, t.id, n)
        if (r.ok) gameNotifys({ title: '批量使用', message: `使用了【${t.recipe.name}】×${r.used}${r.buff ? `，${buffLeftText(t.recipe.name)}` : ''}`, type: 'success' })
        else gameNotifys({ title: '批量使用', message: r.reason, type: 'warning' })
      })
      .catch(() => {})
  }

  // 快捷出售：8 折回收手上物品/丹药/符箓
  const sellAllOf = (kind, key, name) => {
    const cnt = kind === 'pill' ? (player.value.pills?.find(x => x.id === key)?.count || 0) : kind === 'tal' ? (player.value.talismans?.find(x => x.id === key)?.count || 0) : (player.value.props?.[key] || 0)
    if (cnt <= 0) return
    const total = quickSellUnit(kind, key) * cnt
    ElMessageBox.confirm(`将【${name}】×${cnt} 按 8 折全部出售，得约 ${formatNumberToChineseUnit(total)} 灵石？`, '快捷出售', {
      confirmButtonText: '全部出售',
      cancelButtonText: '取消'
    })
      .then(() => {
        const r = quickSell(player.value, kind, key, cnt)
        if (r.ok) gameNotifys({ title: '全部出售', message: `卖出【${name}】×${cnt}，得 ${formatNumberToChineseUnit(r.gain)} 灵石`, type: 'success' })
      })
      .catch(() => {})
  }
  const sellBatch = (kind, key, name) => {
    const cnt = kind === 'pill' ? (player.value.pills?.find(x => x.id === key)?.count || 0) : kind === 'tal' ? (player.value.talismans?.find(x => x.id === key)?.count || 0) : (player.value.props?.[key] || 0)
    if (cnt <= 0) return
    ElMessageBox.prompt(`【${name}】现有 ×${cnt}，输入出售数量（8折/个 ${quickSellUnit(kind, key)} 灵石）`, '批量出售', {
      inputValue: String(cnt),
      inputPattern: /^\d+$/,
      inputErrorMessage: '请输入数字',
      confirmButtonText: '出售',
      cancelButtonText: '取消'
    })
      .then(({ value }) => {
        const n = Math.max(1, Math.min(cnt, parseInt(value) || 1))
        const r = quickSell(player.value, kind, key, n)
        if (r.ok) gameNotifys({ title: '批量出售', message: `卖出【${name}】×${n}，得 ${formatNumberToChineseUnit(r.gain)} 灵石`, type: 'success' })
      })
      .catch(() => {})
  }
  const useBatch = p => {
    const cnt = p.count || 0
    if (cnt <= 0) return
    ElMessageBox.prompt(`【${p.recipe.name}】现有 ×${cnt}，输入服用数量`, '批量服用', {
      inputValue: String(cnt),
      inputPattern: /^\d+$/,
      inputErrorMessage: '请输入数字',
      confirmButtonText: '服用',
      cancelButtonText: '取消'
    })
      .then(({ value }) => {
        const n = Math.max(1, Math.min(cnt, parseInt(value) || 1))
        const r = usePillBatch(player.value, p.id, n)
        if (r.ok) gameNotifys({ title: '批量服用', message: `服下【${p.recipe.name}】×${n}${r.buff ? `，${buffLeftText(p.recipe.name)}` : ''}`, type: 'success' })
        else gameNotifys({ title: '批量服用', message: r.reason, type: 'warning' })
      })
      .catch(() => {})
  }

  const showPillInfo = p => {
    const rows = [{ k: '品阶', v: p.recipe.tierName }, { k: '类型', v: p.recipe.category === 'buff' ? '限时' : '永久' }, { k: '库存', v: p.count }]
    if (buffLeftText(p.recipe.name)) rows.push({ k: '当前加成', v: buffLeftText(p.recipe.name) })
    infoData.value = { title: p.recipe.name, rows, effects: [p.recipe.effectText, p.recipe.detail, sourceOfPill()] }
    infoShow.value = true
  }
  const showTalInfo = t => {
    const rows = [{ k: '品阶', v: t.recipe.tierName }, { k: '库存', v: t.count }]
    if (buffLeftText(t.recipe.name)) rows.push({ k: '当前加成', v: buffLeftText(t.recipe.name) })
    infoData.value = { title: t.recipe.name, rows, effects: [t.recipe.effectText, sourceOfTalisman()] }
    infoShow.value = true
  }
</script>

<style scoped>
  .back { text-align: left; padding: 0 4px; }
  .page-header { margin-bottom: 10px; }
  .title { font-size: 20px; font-weight: bold; margin-bottom: 8px; }
  .resources { display: flex; gap: 8px; margin-bottom: 8px; }
  .section-title { font-size: 15px; font-weight: bold; margin: 12px 0 8px; }
  .eq-section { margin-bottom: 6px; }
  .equipped-cell { border: 1px solid var(--el-color-primary-light-7); }
  .grid { display: flex; flex-wrap: wrap; gap: 8px; }
  .cell { display: flex; flex-direction: column; gap: 4px; padding: 8px 10px; border-radius: 4px; background: var(--el-fill-color-light); }
  .sub { font-size: 12px; color: var(--el-text-color-secondary); }
  .buff-left { font-size: 11px; color: var(--el-color-success); line-height: 1.5; }
  .v { font-size: 12px; color: var(--el-color-warning); }
  .ops { display: flex; gap: 4px; }
  .pname { font-weight: bold; }
  .clickable { cursor: pointer; color: var(--el-color-primary); }
  .hint { margin-top: 14px; font-size: 12px; color: var(--el-text-color-secondary); }

  @media only screen and (max-width: 768px) {
    .back { height: 100%; display: flex; flex-direction: column; overflow: hidden; padding: 0 2px; }
    .page-header { flex: 0 0 auto; margin-bottom: 6px; }
    .title { font-size: 17px; margin-bottom: 4px; }
    .resources { gap: 4px; margin-bottom: 4px; }
    .hint { display: none; }
    .back :deep(.el-tabs) { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; }
    .back :deep(.el-tabs__header) { margin: 0; }
    .back :deep(.el-tabs__content) { flex: 1 1 auto; min-height: 0; overflow: hidden; }
    .back :deep(.el-tab-pane) { height: 100%; overflow-y: auto; }
    .grid { gap: 6px; }
    .cell { padding: 6px 8px; gap: 3px; }
    .cell .ops { flex-wrap: wrap; }
    .batch-bar { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 6px; }
  }
</style>
