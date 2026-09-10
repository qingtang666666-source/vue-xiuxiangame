<template>
  <div class="sect">
    <div class="page-header">
      <div class="title">宗门 · <span class="realm" v-text="levelNames(player.level)" /></div>
      <div class="resources">
        <el-tag type="primary">贡献度 {{ sect.contribution || 0 }}</el-tag>
        <el-tag v-for="res in resourceList" :key="res.key" :type="res.type" effect="plain" class="res-tag">
          {{ res.name }}: {{ formatNumberToChineseUnit(res.value) }}
        </el-tag>
      </div>
    </div>

    <template v-if="sect.position === 0">
      <div class="section-title">宗门候选 · 选择其一加入 <span class="hint">（可换一批）</span></div>
      <div class="choice-list">
        <div v-for="(c, i) in choices" :key="i" class="choice-card">
          <div class="choice-name">{{ c.name }} · <span class="feature">{{ c.featureName }}</span></div>
          <div class="choice-desc">{{ c.desc }}</div>
          <div class="choice-grade">品级 <el-tag size="small" type="danger">{{ c.gradeName }}</el-tag></div>
          <el-button size="small" type="primary" @click="joinOne(c)">加入此宗</el-button>
        </div>
        <el-button size="small" @click="rollChoices">换一批</el-button>
      </div>
    </template>

    <el-card class="sect-card" v-if="sect.position > 0">
      <div class="sect-head">
        <span class="sect-icon">{{ sect.icon }}</span>
        <div class="sect-info">
          <div class="sect-name">{{ sect.name }} · <span class="feature">{{ sect.featureName }}</span></div>
          <div class="sect-desc">{{ sect.desc }}</div>
          <div class="sect-position">当前职位：<b>{{ positionName(player) }}</b></div>
          <div class="sect-grade">宗门品级：<el-tag size="small" type="danger" effect="dark">{{ sect.gradeName }}</el-tag></div>
          <el-button v-if="gradeInfo" size="small" type="warning" class="grade-btn" @click="doGrade" :disabled="!canGrade.ok">
            品级考核（晋升 {{ gradeInfo.name }}）
          </el-button>
          <el-button v-if="sect.position > 0" size="small" type="danger" plain class="grade-btn" @click="doLeave">
            退出宗门（{{ leaveCost }}灵石）
          </el-button>
        </div>
      </div>
    </el-card>

    <div class="section-title" v-if="sect.position > 0">职位权限 <span class="hint">当前：{{ positionName(player) }}</span></div>
    <div class="privilege-grid" v-if="sect.position > 0">
      <div class="privilege-item" v-for="p in privileges" :key="p.name" :class="{ locked: !p.on }">
        <span class="pv-name">{{ p.name }}</span>
        <span class="pv-state">{{ p.text }}</span>
      </div>
    </div>

    <div class="section-title">职位阶梯 <span class="hint" v-if="next">晋升需 {{ levelNames(next.level) }} · 贡献 {{ next.cost }}</span></div>
    <div class="position-list">
      <div
        class="position-row"
        :class="{
          current: pIndex === current,
          next: pIndex === current + 1,
          locked: pIndex > current + 1
        }"
        v-for="(p, pIndex) in POSITIONS"
        :key="pIndex"
      >
        <div class="pos-name">{{ p.name }}</div>
        <div class="pos-req">{{ levelNames(p.level) }}</div>
        <div class="pos-stat">奖励贡献 +{{ p.contrib }}</div>
        <el-button
          v-if="pIndex === current + 1"
          size="small"
          type="primary"
          @click="doPromote"
          :disabled="!canPromote.ok"
        >
          接受考核
        </el-button>
        <el-tag v-else-if="pIndex === current" size="small" type="success" effect="dark">当前</el-tag>
      </div>
    </div>

    <div class="section-title" v-if="sect.position > 0">宗门任务 <span class="hint">完成后获得贡献度</span></div>
    <div class="mission-list" v-if="sect.position > 0">
      <div class="mission-row" v-for="m in sect.missions" :key="m.id">
        <div class="mission-name">{{ m.name }}</div>
        <div class="mission-desc">{{ m.desc }}</div>
        <div class="mission-req">需 {{ levelNames(m.reqLevel) }} · +{{ missionGain(m) }}贡献</div>
        <el-button size="small" type="success" @click="doMission(m)">执行</el-button>
      </div>
    </div>

    <div class="section-title">贡献度兑换</div>
    <div class="ex-filter">
      <el-select v-model="exCat" size="small" style="width: 140px">
        <el-option label="全部" value="all" />
        <el-option v-for="c in exCats.filter(x => x !== 'all')" :key="c" :label="c" :value="c" />
      </el-select>
    </div>
    <div class="exchange-grid">
      <div class="exchange-item" v-for="x in visibleExchange" :key="x.key">
        <el-tooltip :content="exTip(x)" placement="top" :hide-after="0">
          <div class="ex-name">{{ x.name }} ×{{ x.amount }}</div>
        </el-tooltip>
        <div class="ex-ops">
          <el-input-number :model-value="exQtyOf(x.key)" :min="1" :max="exchangeMax(x)" :step="1" size="small" class="ex-qty" @update:model-value="v => setExQty(x.key, v)" />
          <el-button size="small" type="warning" @click="doExchange(x, exQtyOf(x.key))">
            {{ x.contrib }}贡献×{{ exQtyOf(x.key) }}
          </el-button>
        </div>
      </div>
    </div>

    <div class="section-title" v-if="sect.position > 0">宗门捐献 <span class="hint">捐出物资换贡献（150 灵石≈1 贡献）</span></div>
    <div class="donate-grid" v-if="sect.position > 0">
      <div class="donate-row">
        <span>灵石</span>
        <el-input-number v-model="donMoney" :min="100" :step="500" size="small" />
        <el-button size="small" type="warning" @click="doDonateMoney">捐献</el-button>
      </div>
      <div class="donate-row">
        <span>丹药</span>
        <el-select v-model="donPill" size="small" filterable class="dsel">
          <el-option v-for="p in pillOpts" :key="p.id" :label="`${p.name}×${p.count}`" :value="p.id" />
        </el-select>
        <el-input-number v-model="donPillQty" :min="1" :max="99" size="small" />
        <el-button size="small" type="warning" @click="doDonatePill">捐</el-button>
      </div>
      <div class="donate-row">
        <span>符箓</span>
        <el-select v-model="donTal" size="small" filterable class="dsel">
          <el-option v-for="t in talOpts" :key="t.id" :label="`${t.name}×${t.count}`" :value="t.id" />
        </el-select>
        <el-input-number v-model="donTalQty" :min="1" :max="99" size="small" />
        <el-button size="small" type="warning" @click="doDonateTal">捐</el-button>
      </div>
      <div class="donate-row">
        <span>装备</span>
        <el-select v-model="donEquip" size="small" filterable class="dsel">
          <el-option v-for="e in equipOpts" :key="e.id" :label="`${e.name}(捐献${Math.max(1, Math.floor(equipSellPrice(e)/150))}贡献)`" :value="e.id" />
        </el-select>
        <el-button size="small" type="warning" @click="doDonateEquip">捐</el-button>
      </div>
    </div>

    <div class="outer-actions">
    </div>
  </div>
</template>

<script setup>
  import { ref, computed, reactive, watch } from 'vue'
  import { useRouter } from 'vue-router'
  import { useMainStore } from '@/plugins/store'
  import { formatNumberToChineseUnit, levelNames, gameNotifys } from '@/plugins/game'
  import { ElMessageBox } from 'element-plus'
  import {
    ensureSect,
    POSITIONS,
    positionName,
    nextPosition,
    canPromote as canPromoteCheck,
    promote,
    completeMission,
    exchange,
    sectGradeInfo,
    canUpgradeSectGrade,
    upgradeSectGrade,
    leaveSect,
    leaveSectCost,
    sectPrivileges,
    EXCHANGE,
    generateSectChoices,
    joinSect,
    donate
  } from '@/plugins/sect'
  import { pillPrice, talismanPrice, equipSellPrice } from '@/plugins/market'
  import { recipeById } from '@/plugins/alchemy'
  import { talismanById } from '@/plugins/talisman'

  const store = useMainStore()
  const router = useRouter()
  const player = ref(store.player)
  const sect = computed(() => ensureSect(player.value))
  const current = computed(() => sect.value.position || 0)
  const next = computed(() => nextPosition(player.value))
  const canPromote = computed(() => canPromoteCheck(player.value))
  const gradeInfo = computed(() => sectGradeInfo(player.value))
  const canGrade = computed(() => canUpgradeSectGrade(player.value))
  const leaveCost = computed(() => leaveSectCost(player.value))
  const privileges = computed(() => {
    const p = sectPrivileges(player.value)
    return [
      { name: '贡献加成', on: p.contributionBonus > 0, text: `+${p.contributionBonus}%` },
      { name: '兑换额度', on: true, text: `单次 ${p.exchangeLimit} 份` },
      { name: '任务额度', on: p.missionLimit > 1, text: `${p.missionLimit} 项` },
      { name: '捐献额度', on: true, text: `${p.donationLimit} 份` },
      { name: '品级考核', on: p.canGrade, text: p.canGrade ? '已解锁' : '内门长老' },
      { name: '宗门招募', on: p.canRecruit, text: p.canRecruit ? '已解锁' : '内门长老' },
      { name: '宗门管理', on: p.canManage, text: p.canManage ? '已解锁' : '峰主' },
      { name: '全宗公告', on: p.canAnnounce, text: p.canAnnounce ? '已解锁' : '宗主' }
    ]
  })
  const missionGain = m => Math.floor((m.contrib || 0) * (1 + privileges.value.contributionBonus / 100))
  const choices = ref([])
  const donMoney = ref(5000)
  const donPill = ref(null)
  const donPillQty = ref(1)
  const donTal = ref(null)
  const donTalQty = ref(1)
  const donEquip = ref(null)
  const pillOpts = computed(() => (player.value.pills || []).map(p => ({ ...p, name: recipeById(p.id)?.name || p.id, value: recipeById(p.id) ? pillPrice(recipeById(p.id)) : 0 })))
  const talOpts = computed(() => (player.value.talismans || []).map(t => ({ ...t, name: talismanById(t.id)?.name || t.id, value: talismanById(t.id) ? talismanPrice(talismanById(t.id)) : 0 })))
  const equipOpts = computed(() => (player.value.inventory || []).map(e => ({ ...e })).filter(e => e.id))
  const rollChoices = () => { choices.value = generateSectChoices(player.value, 3) }
  const joinOne = c => {
    const r = joinSect(player.value, c)
    if (r.ok) gameNotifys({ title: '宗门', message: `已加入【${r.name}】`, type: 'success' })
    else gameNotifys({ title: '宗门', message: r.reason, type: 'error' })
  }
  const doDonateMoney = () => {
    const r = donate(player.value, 'money', donMoney.value)
    if (r.ok) gameNotifys({ title: '捐献', message: `捐出 ${r.amount} 灵石，贡献 +${r.contrib}`, type: 'success' })
    else gameNotifys({ title: '捐献', message: r.reason, type: 'error' })
  }
  const doDonatePill = () => {
    const p = pillOpts.value.find(x => x.id === donPill.value)
    if (!p) return gameNotifys({ title: '捐献', message: '请选择丹药', type: 'warning' })
    const r = donate(player.value, 'pill', { id: p.id, qty: donPillQty.value, name: p.name }, p.value)
    if (r.ok) gameNotifys({ title: '捐献', message: `捐出【${p.name}】×${r.qty}，贡献 +${r.contrib}`, type: 'success' })
    else gameNotifys({ title: '捐献', message: r.reason, type: 'error' })
  }
  const doDonateTal = () => {
    const t = talOpts.value.find(x => x.id === donTal.value)
    if (!t) return gameNotifys({ title: '捐献', message: '请选择符箓', type: 'warning' })
    const r = donate(player.value, 'talisman', { id: t.id, qty: donTalQty.value, name: t.name }, t.value)
    if (r.ok) gameNotifys({ title: '捐献', message: `捐出【${t.name}】×${r.qty}，贡献 +${r.contrib}`, type: 'success' })
    else gameNotifys({ title: '捐献', message: r.reason, type: 'error' })
  }
  const doDonateEquip = () => {
    const e = equipOpts.value.find(x => x.id === donEquip.value)
    if (!e) return gameNotifys({ title: '捐献', message: '请选择装备', type: 'warning' })
    const r = donate(player.value, 'equip', { id: e.id }, equipSellPrice(e))
    if (r.ok) gameNotifys({ title: '捐献', message: `捐出【${r.name}】，贡献 +${r.contrib}`, type: 'success' })
    else gameNotifys({ title: '捐献', message: r.reason, type: 'error' })
  }
  rollChoices()
  // 未入门（含退出宗门后）自动重新生成一批候选宗门
  watch(() => sect.value.position, v => {
    if (v === 0) rollChoices()
  })

  const resourceList = computed(() => {
    const p = player.value.props || {}
    return [
      { key: 'money', name: '灵石', value: p.money || 0, type: 'warning' },
      { key: 'spiritHerb', name: '灵草', value: p.spiritHerb || 0, type: 'success' },
      { key: 'cultivateDan', name: '培养丹', value: p.cultivateDan || 0, type: 'primary' },
      { key: 'strengtheningStone', name: '炼器石', value: p.strengtheningStone || 0, type: 'danger' }
    ]
  })

  const doPromote = () => {
    const res = promote(player.value)
    if (res.ok) {
      gameNotifys({ title: '晋升成功', message: `拜入【${res.name}】，获得贡献 ${res.contribReward}`, type: 'success' })
    } else {
      gameNotifys({ title: '晋升失败', message: res.reason, type: 'error' })
    }
  }

  const doMission = m => {
    const res = completeMission(player.value, m.id)
    if (res.ok) {
      gameNotifys({ title: '任务完成', message: `完成【${m.name}】，贡献 +${res.contrib}`, type: 'success' })
    } else {
      gameNotifys({ title: '任务失败', message: res.reason, type: 'error' })
    }
  }

  const doExchange = (x, n = 1) => doExchangeN(x, n)
  const exQty = reactive({})
  const exchangeMax = x => Math.min(privileges.value.exchangeLimit, Math.max(1, Math.floor((sect.value.contribution || 0) / Math.max(1, x.contrib))))
  const exQtyOf = k => exQty[k] || 1
  const setExQty = (k, v) => {
    const item = EXCHANGE.find(x => x.key === k)
    exQty[k] = Math.max(1, Math.min(exchangeMax(item || { contrib: 1 }), Math.floor(v || 1)))
  }
  const doExchangeN = (x, n = 1) => {
    n = Math.max(1, Math.min(exchangeMax(x), Math.floor(n) || 1))
    let ok = 0
    let reason = ''
    for (let i = 0; i < n; i++) {
      const r = exchange(player.value, x.key)
      if (r.ok) ok++
      else { reason = r.reason; break }
    }
    if (ok) gameNotifys({ title: '兑换成功', message: `获得【${x.name}】×${ok * (x.amount || 1)}`, type: 'success' })
    else gameNotifys({ title: '兑换失败', message: reason || '贡献度不足', type: 'error' })
  }
  const exTip = x => {
    const d = { money: '灵石，通用货币', spiritHerb: '灵草，炼丹/制符原料', strengtheningStone: '炼器材料', cultivateDan: '培养灵宠/丹药原料', rootBone: '增强悟性', currency: '稀世货币，用于界域飞升', scroll: '功法卷轴，参悟以根骨资质 × 悟性判定成败' }
    return `【${x.name}】×${x.amount}\n${d[x.key] || ''}\n需 ${x.contrib} 贡献`
  }
  const exCat = ref('all')
  const exCats = computed(() => ['all', ...new Set(EXCHANGE.map(x => x.cat || '其他'))])
  const visibleExchange = computed(() => (exCat.value === 'all' ? EXCHANGE : EXCHANGE.filter(x => (x.cat || '其他') === exCat.value)))

  const doGrade = () => {
    const res = upgradeSectGrade(player.value)
    if (res.ok) {
      gameNotifys({ title: '宗门晋升', message: `宗门品级晋升：${res.name}`, type: 'success' })
    } else {
      gameNotifys({ title: '品级考核', message: res.reason, type: 'error' })
    }
  }

  const doLeave = () => {
    ElMessageBox.confirm(
      `退出宗门将支付 ${leaveCost.value} 灵石并清空全部贡献度，且退回"未入门"，是否确定？`,
      '退出宗门',
      { confirmButtonText: '退出', cancelButtonText: '再想想', type: 'warning' }
    )
      .then(() => {
        const res = leaveSect(player.value)
        if (res.ok) {
          gameNotifys({ title: '退出宗门', message: `已退出，支付 ${res.cost} 灵石，贡献度已清空`, type: 'success' })
        } else {
          gameNotifys({ title: '退出宗门', message: res.reason, type: 'error' })
        }
      })
      .catch(() => {})
  }
</script>

<style scoped>
  .sect { text-align: left; padding: 0 4px; }
  .page-header { margin-bottom: 12px; }
  .title { font-size: 22px; font-weight: bold; margin-bottom: 10px; }
  .realm { color: var(--el-color-primary); }
  .resources { display: flex; flex-wrap: wrap; gap: 6px; }
  .res-tag { font-size: 13px; }
  .sect-card { margin-bottom: 8px; }
  .sect-head { display: flex; gap: 12px; align-items: center; }
  .sect-icon { font-size: 32px; }
  .sect-name { font-size: 18px; font-weight: bold; }
  .feature { color: var(--el-color-primary); }
  .sect-desc { font-size: 12px; color: var(--el-text-color-secondary); margin: 4px 0; }
  .sect-position { font-size: 14px; }
  .sect-grade { font-size: 13px; margin: 6px 0; }
  .grade-btn { margin-top: 2px; }
  .section-title { font-size: 15px; font-weight: bold; margin: 16px 0 8px; }
  .hint { font-size: 12px; font-weight: normal; color: var(--el-text-color-secondary); margin-left: 8px; }
  .privilege-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; }
  .privilege-item { display: flex; flex-direction: column; gap: 2px; padding: 6px 8px; border-radius: 6px; background: var(--el-color-success-light-9); border: 1px solid var(--el-color-success-light-7); font-size: 12px; }
  .privilege-item.locked { background: var(--el-fill-color-light); border-color: var(--el-border-color-lighter); opacity: 0.7; }
  .pv-name { color: var(--el-text-color-secondary); }
  .pv-state { font-weight: bold; color: var(--el-color-success); }
  .privilege-item.locked .pv-state { color: var(--el-text-color-placeholder); font-weight: normal; }
  .position-list { display: flex; flex-direction: column; gap: 4px; }
  .position-row { display: flex; align-items: center; gap: 12px; padding: 6px 10px; border-radius: 4px; background: var(--el-fill-color-light); }
  .position-row.current { background: var(--el-color-success-light-8); }
  .position-row.next { background: var(--el-color-warning-light-8); }
  .position-row.locked { opacity: 0.6; }
  .pos-name { min-width: 88px; font-weight: bold; }
  .pos-req { min-width: 60px; color: var(--el-text-color-secondary); }
  .pos-stat { flex: 1; font-size: 12px; color: var(--el-text-color-secondary); }
  .mission-list { display: flex; flex-direction: column; gap: 6px; }
  .mission-row { display: flex; align-items: center; gap: 12px; padding: 6px 10px; border-radius: 4px; background: var(--el-fill-color-light); }
  .mission-name { min-width: 90px; font-weight: bold; }
  .mission-desc { flex: 1; font-size: 12px; color: var(--el-text-color-secondary); }
  .mission-req { font-size: 12px; color: var(--el-color-warning); }
  .exchange-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
  .exchange-item { display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; border-radius: 4px; background: var(--el-fill-color-light); }
  .ex-filter { display: flex; margin-bottom: 8px; }
  .ex-ops { display: flex; gap: 6px; align-items: center; }
  .ex-qty { width: 80px; }
  .choice-list { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 12px; }
  .choice-card { border: 1px solid var(--el-border-color-lighter); border-radius: 8px; padding: 10px; width: 30%; min-width: 180px; display: flex; flex-direction: column; gap: 6px; background: var(--el-fill-color-light); }
  .choice-name { font-weight: bold; }
  .choice-desc, .choice-grade { font-size: 12px; color: var(--el-text-color-secondary); }
  .donate-grid { display: flex; flex-direction: column; gap: 8px; }
  .donate-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .dsel { width: 200px; }
  .ex-name { font-size: 13px; }
  .outer-actions { margin-top: 16px; display: flex; justify-content: center; }
  @media only screen and (max-width: 768px) {
    .privilege-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .exchange-grid { grid-template-columns: repeat(2, 1fr); }
  }
</style>
