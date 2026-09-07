<template>
  <div class="npc">
    <div class="page-header">
      <div class="title">下界坊市 · <span class="realm" v-text="levelNames(player.level)" /></div>
      <div class="resources">
        <el-tag v-for="res in resourceList" :key="res.key" :type="res.type" effect="plain" class="res-tag">
          {{ res.name }}: {{ formatNumberToChineseUnit(res.value) }}
        </el-tag>
      </div>
    </div>

    <div class="skill-panel">
      <div class="section-title">所习技艺</div>
      <div class="skill-tags">
        <el-tag v-for="s in skillTags" :key="s.key" :type="s.type" effect="plain">{{ s.text }}</el-tag>
      </div>
      <div class="skill-tags">
        <el-tag type="warning" effect="plain">功法 {{ player.techniques || 0 }} 重</el-tag>
      </div>
    </div>

    <div class="section-title">坊间诸位（本轮转世随机，转生后重刷）</div>
    <div class="filter-bar">
      <el-radio-group v-model="roleFilter" size="small">
        <el-radio-button value="all">全部</el-radio-button>
        <el-radio-button v-for="r in roleOptions" :key="r.key" :value="r.key">{{ r.name }}</el-radio-button>
      </el-radio-group>
    </div>

    <div class="grid">
      <el-card v-for="n in displayNpcs" :key="n.id" class="card" shadow="hover">
        <template #header>
          <div class="card-head">
            <span class="icon">{{ n.icon }}</span>
            <span class="name">{{ n.name }}</span>
            <el-tag :type="n.hostile ? 'danger' : 'info'" effect="dark" size="small">{{ n.roleName }}</el-tag>
          </div>
        </template>
        <div class="lvl">境界：{{ levelNames(n.level) }}</div>
        <div class="fav">好感：{{ n.favorability }}</div>
        <p class="desc">{{ n.desc }}</p>
        <div class="actions">
          <el-button v-if="n.kind === 'trade'" size="small" type="primary" @click="openTrade(n)">交易</el-button>
          <el-button v-if="!n.hostile" size="small" type="info" plain @click="befriend(n)">结交</el-button>
          <el-button v-if="!n.hostile" size="small" type="warning" plain @click="chat(n)">谈心</el-button>
          <el-button
            v-if="!n.hostile"
            size="small"
            :type="trusted(n) ? 'success' : 'danger'"
            plain
            @click="scout(n)"
            :disabled="!trusted(n) && cdOf(n) > 0"
          >
            {{ trusted(n) ? '情报' : '窥探' }}<span v-if="!trusted(n) && cdOf(n) > 0" class="scout-cd">({{ cdOf(n) }}s)</span>
          </el-button>
          <el-button v-if="!n.hostile && n.favorability >= SCOUT_FAV_INTIMATE && !n.intimateGiven" size="small" type="warning" @click="intimate(n)">交心</el-button>
          <el-button v-if="n.kind === 'skill'" size="small" type="success" @click="learn(n)">学艺</el-button>
          <el-button v-if="n.kind === 'technique'" size="small" type="warning" @click="learnTech(n)">传授功法</el-button>
          <el-button v-if="n.role === 'merchant'" size="small" type="danger" @click="rob(n)">抢劫</el-button>
          <el-button size="small" type="danger" plain @click="ambush(n)">截杀</el-button>
        </div>
      </el-card>
    </div>

    <el-dialog v-model="tradeShow" :title="`交易 · ${tradeNpc?.name || ''}`" width="420px" align-center>
      <div v-if="tradeNpc" class="shop-grid">
        <div class="shop-item" v-for="s in tradeNpc.shop" :key="s.key">
          <div class="shop-name">{{ s.name }} <span class="stock">x{{ s.stock }}</span></div>
          <div class="shop-btn">
            <el-button size="small" type="primary" :disabled="player.props.money < s.price || s.stock <= 0" @click="buy(tradeNpc, s)">
              {{ formatNumberToChineseUnit(s.price) }}灵石
            </el-button>
          </div>
        </div>
      </div>
    </el-dialog>

    <div class="outer-actions">
    </div>
  </div>
  <TurnCombat
    :visible="turnShow"
    :enemy="npcEnemy"
    :award="false"
    :title="turnKind === 'rob' ? '打劫·护院' : '截杀'"
    @update:visible="turnShow = $event"
    @win="onTurnWin"
    @lose="onTurnLose"
    @flee="onTurnFlee"
  />
</template>

<script setup>
  import { ref, computed, onActivated, onDeactivated, onBeforeUnmount } from 'vue'
  import { useRouter } from 'vue-router'
  import { useMainStore } from '@/plugins/store'
  import { formatNumberToChineseUnit, levelNames, gameNotifys } from '@/plugins/game'
  import { ElMessageBox } from 'element-plus'
  import {
    ensureWorldNpcs,
    learnSkill,
    skillUpgradeCost,
    learnTechnique,
    techniqueCost,
    buyFromNpc,
    npcCombatStats,
    ambushWin,
    robWin,
    ambushLose,
    robLose,
    befriend as befriendNpc,
    npcStory,
    scoutNpc,
    SCOUT_CD,
    SCOUT_FAV_TRUST,
    SKILL_KEYS
  } from '@/plugins/npcSystem'
  import TurnCombat from '@/components/TurnCombat.vue'

  const store = useMainStore()
  const router = useRouter()
  const player = ref(store.player)
  const turnShow = ref(false)
  const turnNpc = ref(null)
  const turnKind = ref('')
  const npcs = computed(() => ensureWorldNpcs(player.value))
  // 窥探冷却倒计时（每秒刷新，使按钮禁用/秒数实时更新）
  const now = ref(Date.now())
  let scoutTimer = null
  const startScoutTimer = () => {
    if (scoutTimer) return
    scoutTimer = setInterval(() => {
      now.value = Date.now()
    }, 1000)
  }
  startScoutTimer()
  onDeactivated(() => { if (scoutTimer) { clearInterval(scoutTimer); scoutTimer = null } })
  onActivated(() => { now.value = Date.now(); startScoutTimer() })
  onBeforeUnmount(() => { if (scoutTimer) clearInterval(scoutTimer) })
  const cdOf = n => Math.max(0, Math.ceil((SCOUT_CD - (now.value - (n.scoutAt || 0))) / 1000))
  const trusted = n => n.favorability >= SCOUT_FAV_TRUST
  const roleFilter = ref('all')
  const tradeShow = ref(false)
  const tradeNpc = ref(null)

  const roleOptions = [
    { key: 'merchant', name: '商贾' },
    { key: 'alchemist', name: '炼丹师' },
    { key: 'forger', name: '炼器师' },
    { key: 'talisman', name: '符师' },
    { key: 'formation', name: '阵法师' },
    { key: 'elder', name: '得道散修' },
    { key: 'bandit', name: '劫匪' }
  ]

  const resourceList = computed(() => {
    const p = player.value.props || {}
    return [
      { key: 'money', name: '灵石', value: p.money || 0, type: 'warning' },
      { key: 'spiritHerb', name: '灵草', value: p.spiritHerb || 0, type: 'success' },
      { key: 'cultivateDan', name: '培养丹', value: p.cultivateDan || 0, type: 'primary' },
      { key: 'strengtheningStone', name: '炼器石', value: p.strengtheningStone || 0, type: 'danger' },
      { key: 'rootBone', name: '悟性丹', value: p.rootBone || 0, type: 'info' },
      { key: 'currency', name: '混沌石', value: p.currency || 0, type: 'danger' }
    ]
  })

  const skillNames = {
    alchemy: '炼丹术',
    forge: '炼器术',
    talisman: '符箓术',
    formation: '阵法术'
  }
  const skillTags = computed(() => {
    return SKILL_KEYS.map(key => ({
      key,
      text: `${skillNames[key]} Lv.${(player.value.skills || {})[key] || 0}`,
      type: key === 'alchemy' ? 'success' : key === 'forge' ? 'danger' : key === 'talisman' ? 'warning' : 'primary'
    }))
  })

  const displayNpcs = computed(() => {
    if (roleFilter.value === 'all') return npcs.value
    return npcs.value.filter(n => n.role === roleFilter.value)
  })

  const openTrade = n => {
    tradeNpc.value = n
    tradeShow.value = true
  }

  const buy = (npc, s) => {
    const res = buyFromNpc(player.value, npc, s.key)
    if (res.ok) {
      gameNotifys({ title: '交易成功', message: `获得【${s.name}】×1`, type: 'success' })
    } else {
      gameNotifys({ title: '交易失败', message: res.reason, type: 'error' })
    }
  }

  const learn = n => {
    const key = n.skill
    const cost = skillUpgradeCost(player.value, key)
    const name = skillNames[key]
    ElMessageBox.confirm(
      `${name}当前 Lv.${(player.value.skills || {})[key] || 0}，升级需${cost.money}灵石${cost.dan ? ` + ${cost.dan}培养丹` : ''}`,
      '请教技艺',
      { confirmButtonText: '请教', cancelButtonText: '再想想' }
    )
      .then(() => {
        const res = learnSkill(player.value, n)
        if (res.ok) gameNotifys({ title: '学艺有成', message: `${name}提升至 Lv.${res.level}`, type: 'success' })
        else gameNotifys({ title: '学艺失败', message: res.reason, type: 'error' })
      })
      .catch(() => {})
  }

  const learnTech = n => {
    const cost = techniqueCost(player.value)
    ElMessageBox.confirm(`参悟功法需 ${cost.money}灵石（当前 ${player.value.techniques || 0} 重）`, '参悟功法', {
      confirmButtonText: '参悟',
      cancelButtonText: '再想想'
    })
      .then(() => {
        const res = learnTechnique(player.value, n)
        if (res.ok) gameNotifys({ title: '功法精进', message: `功参造化，已达 ${res.count} 重`, type: 'success' })
        else gameNotifys({ title: '参悟失败', message: res.reason, type: 'error' })
      })
      .catch(() => {})
  }

  const befriend = n => {
    const res = befriendNpc(player.value, n)
    if (res.ok) gameNotifys({ title: '结交', message: `与【${n.name}】好感度 +${25}，现为 ${res.favorability}`, type: 'success' })
    else gameNotifys({ title: '结交失败', message: res.reason, type: 'error' })
  }

  const chat = n => {
    const res = npcStory(player.value, n)
    if (res.ok) gameNotifys({ title: res.title, message: `${res.text}${res.gift ? '（' + res.gift + '）' : ''}`, type: 'info' })
  }

  const scout = n => {
    const res = scoutNpc(player.value, n)
    if (!res.ok) {
      gameNotifys({ title: '窥探失败', message: res.reason, type: 'warning' })
      return
    }
    const f = v => Math.round(v || 0).toLocaleString('zh-CN')
    ElMessageBox.alert(
      `<div style="text-align:left;font-size:13px;line-height:1.7">
        <b>【${res.name}】</b> ${res.role} · 境界 ${levelNames(res.level)}<br>
        战力：<b style="color:#E6A23C">${f(res.score)}</b><br>
        攻击 ${f(res.stats.attack)} · 防御 ${f(res.stats.defense)} · 气血 ${f(res.stats.health)}<br>
        暴击 ${(res.stats.critical * 100).toFixed(1)}% · 闪避 ${(res.stats.dodge * 100).toFixed(1)}%<br>
        功法：${res.method}<br>
        行囊：${res.pouch.join('、')}
      </div>`,
      res.trust ? '人物情报' : '人物窥探',
      { dangerouslyUseHTMLString: true, confirmButtonText: '收下情报' }
    )
  }

  const intimate = n => {
    const res = npcIntimate(player.value, n)
    if (!res.ok) {
      gameNotifys({ title: '交心', message: res.reason, type: 'warning' })
      return
    }
    ElMessageBox.alert(`${res.story}<br>获得：<b style="color:#E6A23C">${res.giftName}</b>`, '亲密之交', {
      dangerouslyUseHTMLString: true,
      confirmButtonText: '不胜感激'
    })
  }

  const ambush = n => {
    ElMessageBox.confirm(`截杀【${n.name}】？成功夺其机缘，失败将损失灵石。`, '截杀', {
      confirmButtonText: '截杀',
      cancelButtonText: '罢手',
      type: 'warning'
    })
      .then(() => {
        turnNpc.value = n
        turnKind.value = 'ambush'
        turnShow.value = true
      })
      .catch(() => {})
  }

  const rob = n => {
    ElMessageBox.confirm(`打劫【${n.name}】的一半货资？可能惊动护院。`, '抢劫', {
      confirmButtonText: '动手',
      cancelButtonText: '罢手',
      type: 'warning'
    })
      .then(() => {
        turnNpc.value = n
        turnKind.value = 'rob'
        turnShow.value = true
      })
      .catch(() => {})
  }

  const npcEnemy = computed(() => turnNpc.value ? ({ name: turnNpc.value.name, level: turnNpc.value.level, ...npcCombatStats(turnNpc.value) }) : null)
  const onTurnWin = () => {
    const n = turnNpc.value
    turnShow.value = false
    if (n) {
      if (turnKind.value === 'ambush') {
        const res = ambushWin(player.value, n)
        if (res.ok) {
          const lootText = Object.entries(res.loot).map(([k, v]) => `${propName(k)} +${v}`).join('，')
          gameNotifys({ title: '截杀得手', message: `夺得 ${lootText}`, type: 'success' })
        }
      } else if (turnKind.value === 'rob') {
        const res = robWin(player.value, n)
        if (res.ok) {
          const lootText = Object.entries(res.gains).map(([k, v]) => `${propName(k)} +${v}`).join('，')
          gameNotifys({ title: '抢劫得手', message: `夺走 ${lootText}`, type: 'success' })
        }
      }
    }
    turnNpc.value = null
  }
  const onTurnLose = () => {
    const n = turnNpc.value
    turnShow.value = false
    if (turnKind.value === 'ambush') {
      const r = ambushLose(player.value)
      gameNotifys({ title: '截杀失败', message: `被${n?.name}反击，损失 ${r.lost} 灵石`, type: 'error' })
    } else {
      const r = robLose(player.value)
      gameNotifys({ title: '抢劫失败', message: `护院出手，损失 ${r.lost} 灵石`, type: 'error' })
    }
    turnNpc.value = null
  }
  const onTurnFlee = () => { turnShow.value = false; turnNpc.value = null }

  const propName = key => {
    const map = {
      money: '灵石',
      spiritHerb: '灵草',
      cultivateDan: '培养丹',
      strengtheningStone: '炼器石',
      rootBone: '悟性丹',
      currency: '混沌石'
    }
    return map[key] || key
  }
</script>

<style scoped>
  .npc { text-align: left; padding: 0 4px; }
  .page-header { margin-bottom: 12px; }
  .title { font-size: 22px; font-weight: bold; margin-bottom: 10px; }
  .realm { color: var(--el-color-primary); }
  .resources { display: flex; flex-wrap: wrap; gap: 6px; }
  .res-tag { font-size: 13px; }
  .section-title { font-size: 15px; font-weight: bold; margin: 12px 0 8px; }
  .skill-panel { background: var(--el-fill-color-light); border-radius: 6px; padding: 8px 12px; margin-bottom: 8px; }
  .skill-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 4px; }
  .filter-bar { display: flex; gap: 10px; margin-bottom: 10px; flex-wrap: wrap; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .card { margin: 0; }
  .card-head { display: flex; align-items: center; gap: 6px; }
  .icon { font-size: 18px; }
  .name { font-weight: bold; flex: 1; }
  .lvl { font-size: 12px; color: var(--el-color-primary); margin-bottom: 2px; }
  .fav { font-size: 12px; color: var(--el-text-color-secondary); margin-bottom: 2px; }
  .desc { font-size: 12px; color: var(--el-text-color-secondary); margin: 2px 0 8px; min-height: 32px; }
  .actions { display: flex; flex-wrap: wrap; gap: 6px; }
  .shop-grid { display: flex; flex-direction: column; gap: 8px; }
  .shop-item { display: flex; justify-content: space-between; align-items: center; }
  .shop-name { font-size: 14px; }
  .stock { font-size: 12px; color: var(--el-text-color-secondary); margin-left: 6px; }
  .outer-actions { margin-top: 16px; display: flex; justify-content: center; }
  @media only screen and (max-width: 768px) { .grid { grid-template-columns: 1fr; } }
  .scout-cd {
    font-size: 11px;
    color: var(--el-text-color-secondary);
    margin-left: 2px;
  }
</style>
