<template>
  <div class="battle">
    <div class="page-header">
      <div class="title">历战 · 回合制 <span class="realm">{{ levelNames(player.level) }}</span></div>
      <div class="resources">
        <el-tag type="warning">灵石 {{ formatNumberToChineseUnit(player.props.money || 0) }}</el-tag>
        <el-tag type="primary">培养丹 {{ player.props.cultivateDan || 0 }}</el-tag>
        <el-tag type="success">道果 {{ player.props.daoFruit || 0 }}（突破大境界用）</el-tag>
      </div>
    </div>

    <!-- 出战准备 -->
    <div v-if="!state" class="setup">
      <div class="section-title">选择历练强度</div>
      <div class="diff-grid">
        <div v-for="d in difficulties" :key="d.key" class="diff-card" :class="{ sel: diff === d.key }" @click="diff = d.key">
          <div class="diff-name">{{ d.name }}</div>
          <div class="diff-desc">{{ d.desc }}</div>
        </div>
      </div>
      <div class="set-row">
        <span>敌方数量</span>
        <el-radio-group v-model="count">
          <el-radio-button :value="1">单挑</el-radio-button>
          <el-radio-button :value="2">一敌二</el-radio-button>
          <el-radio-button :value="3">一敌三</el-radio-button>
        </el-radio-group>
      </div>
      <el-button type="primary" size="large" @click="startFight" class="fight-btn">开始战斗</el-button>
      <div class="tip">提示：速度决定行动顺序；使用主动功法神通需消耗灵力；防御可减伤并蓄灵；打不过可逃跑。历战胜利有概率掉落「道果」，突破大境界必备。</div>
    </div>

    <!-- 战斗主体 -->
    <div v-else class="arena" :style="arenaStyle">
      <div class="round-bar">第 <b>{{ state.round }}</b> 回合 · {{ phaseLabel }}</div>
      <div class="controls">
        <el-switch v-model="auto" active-text="自动战斗" inline-prompt />
        <span v-if="auto" class="auto-tip">行动将自动进行…</span>
      </div>
      <div class="sup-banner" v-if="selTarget">
        境界压制：你攻{{ selTarget.name }}
        <b :class="supClass(playerSup)">{{ playerSupLabel }}</b>
        · {{ selTarget.name }}攻你
        <b :class="supClass(enemySup)">{{ enemySupLabel }}</b>
      </div>

      <div class="battlefield">
        <div class="unit player-unit" :class="{ active: isPlayerTurnV, dead: state.player.hp <= 0 }">
          <div class="unit-name">{{ state.player.name }} <span class="lv">{{ levelNames(state.player.level) }}</span></div>
          <div class="bar hp"><span :style="{ width: hpPct(state.player) + '%' }" /></div>
          <div class="bar mp"><span :style="{ width: mpPct(state.player) + '%' }" /></div>
          <div class="unit-sub">气血 {{ Math.max(0, Math.floor(state.player.hp)) }}/{{ state.player.maxHp }}</div>
          <div class="unit-sub">灵力 {{ Math.floor(state.player.mp) }}/{{ state.player.maxMp }}</div>
          <div class="def-tag" v-if="state.player._defending">🛡 防御中</div>
        </div>

        <div class="enemy-row">
          <div
            v-for="(e, i) in state.enemies"
            :key="e.id"
            class="unit enemy-unit"
            :class="{ active: e.id === state.activeId && !e.isPlayer, dead: e.hp <= 0, sel: target === e.id }"
            @click="target = e.id"
          >
            <div class="unit-name">{{ e.name }} <span class="lv">{{ levelNames(e.level) }}</span></div>
            <div class="bar hp"><span :style="{ width: hpPct(e) + '%' }" /></div>
            <div class="bar mp"><span :style="{ width: mpPct(e) + '%' }" /></div>
            <div class="unit-sub">气血 {{ Math.max(0, Math.floor(e.hp)) }}/{{ e.maxHp }}</div>
            <div class="unit-sub">灵力 {{ Math.floor(e.mp) }}/{{ e.maxMp }}</div>
            <div class="def-tag" v-if="e._defending">🛡 防御中</div>
          </div>
        </div>
      </div>

      <!-- 玩家操作 -->
      <div v-if="isPlayerTurnV" class="actions">
        <el-button type="primary" :disabled="!selTarget" @click="doAttack">⚔ 普攻</el-button>
        <el-tooltip
          v-for="ab in abilities"
          :key="ab.id"
          placement="top"
          :hide-after="0"
          :content="abilityTip(ab)"
          popper-class="divine-tip"
        >
          <el-button
            :type="ab.kind === 'heal' ? 'success' : ab.kind === 'control' ? 'warning' : 'danger'"
            :disabled="state.player.mp < ab.mpCost || ab.kind !== 'heal' && !selTarget"
            @click="doSkill(ab)"
          >
            {{ ab.name }}({{ ab.mpCost }}灵)
          </el-button>
        </el-tooltip>
        <el-button type="info" @click="doDefend">🛡 防御</el-button>
        <el-button type="danger" plain @click="doFlee">🏃 逃跑</el-button>
      </div>

      <!-- 战斗日志 -->
      <div class="log" ref="logRef">
        <div v-for="(l, idx) in state.log" :key="idx" class="log-line" :class="l.cls">
          <span class="log-round">[{{ l.round }}]</span> <span v-html="l.text" />
        </div>
      </div>

      <!-- 结算 -->
      <div v-if="battleOverV" class="result">
        <template v-if="state.phase === 'victory'">
          <div class="res-title ok">✨ 战斗胜利</div>
          <div class="res-lines">
            <div>修为 +{{ formatNumberToChineseUnit(state.reward?.exp || 0) }}</div>
            <div>灵石 +{{ formatNumberToChineseUnit(state.reward?.money || 0) }}</div>
            <div>培养丹 +{{ state.reward?.dan || 0 }}</div>
            <div v-if="state.reward?.dao" class="res-fruit">道果 +{{ state.reward.dao }}（历战专属·突破大境界用）</div>
            <div>灵草 +{{ state.reward?.herb || 0 }} · 炼器石 +{{ state.reward?.stone || 0 }}</div>
          </div>
        </template>
        <template v-else-if="state.phase === 'defeat'">
          <div class="res-title err">💀 战败</div>
          <div class="res-sub">你气血耗尽，先回洞府修养吧。</div>
        </template>
        <template v-else>
          <div class="res-title">🏃 成功脱离</div>
        </template>
        <div class="res-btns">
          <el-button type="primary" @click="reset">再战一场</el-button>
          <el-button @click="backHome">返回</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, reactive, computed, watch, nextTick, onBeforeUnmount } from 'vue'
  import { useRouter } from 'vue-router'
  import { useMainStore } from '@/plugins/store'
  import { formatNumberToChineseUnit, levelNames, realmSuppressionMult, realmSuppressionPct, realmSuppressionLabel } from '@/plugins/game'
  import { divineTipText } from '@/plugins/divine'
  import battleArenaBg from '@/assets/images/battle-arena-bg.png'
  import {
    startBattle,
    buildEnemies,
    chooseAction,
    enemyTurn,
    isPlayerTurn,
    isEnemyTurn,
    battleOver,
    getPlayerAbilities,
    aiPlayerAction
  } from '@/plugins/battleEngine'

  const store = useMainStore()
  const router = useRouter()
  const player = computed(() => store.player)
  const arenaStyle = { '--arena-img': `url(${battleArenaBg})` }

  const difficulties = [
    { key: 'easy', name: '风平浪静', desc: '约你五成五境界基准，轻松取胜', levelOffset: -9, mult: 0.55 },
    { key: 'normal', name: '势均力敌', desc: '略逊于境界基准，稳扎稳打可胜', levelOffset: 0, mult: 0.9 },
    { key: 'hard', name: '凶险莫测', desc: '高出境界基准二成五，需小心应对', levelOffset: 9, mult: 1.25 },
    { key: 'boss', name: '秘境首领', desc: '境界基准与境界双重压制，掉落丰厚', levelOffset: 18, mult: 1.5, boss: true }
  ]
  const diff = ref('normal')
  const count = ref(1)

  const state = ref(null)
  const target = ref(null)
  let enemyTimer = null
  const auto = ref(false)
  let autoTimer = null
  const logRef = ref(null)

  const abilities = computed(() => (state.value ? getPlayerAbilities(player.value) : []))
  // 神通悬浮介绍：说明 + 对当前目标的预估伤害/回复
  const abilityEstimate = ab => {
    const st = state.value
    if (!st) return ''
    const p = st.player
    if (ab.kind === 'heal') return `预计回复 ≈ ${formatNumberToChineseUnit(Math.floor(p.maxHp * 0.12 * ab.power))} 气血`
    const e = selTarget.value
    if (!e) return ''
    const raw = Math.max(1, p.atk - Math.max(0, (e.def || 0) - (p.armorPen || 0)))
    const dmg = Math.floor(raw * ab.power * realmSuppressionMult(p.level, e.level))
    return `预计伤害 ≈ ${formatNumberToChineseUnit(dmg)}（未计闪避/暴击/格挡）`
  }
  const abilityTip = ab => divineTipText(ab, abilityEstimate(ab))
  const selTarget = computed(() => {
    if (!state.value) return null
    return state.value.enemies.find(e => e.id === target.value && e.hp > 0) || state.value.enemies.find(e => e.hp > 0) || null
  })
  const playerSup = computed(() => (state.value && selTarget.value ? realmSuppressionPct(state.value.player.level, selTarget.value.level) : 0))
  const enemySup = computed(() => (state.value && selTarget.value ? realmSuppressionPct(selTarget.value.level, state.value.player.level) : 0))
  const playerSupLabel = computed(() => realmSuppressionLabel(playerSup.value))
  const enemySupLabel = computed(() => realmSuppressionLabel(enemySup.value))
  const supClass = pct => (pct > 0 ? 'up' : pct < 0 ? 'down' : 'even')
  const isPlayerTurnV = computed(() => state.value && isPlayerTurn(state.value))
  const isEnemyTurnV = computed(() => state.value && isEnemyTurn(state.value))
  const battleOverV = computed(() => state.value && battleOver(state.value))
  const phaseLabel = computed(() => {
    if (!state.value) return ''
    if (battleOverV.value) return { victory: '战斗结束', defeat: '战斗结束', fled: '已脱离' }[state.value.phase] || ''
    if (isPlayerTurnV.value) return '你的回合'
    if (isEnemyTurnV.value) return '敌方行动中…'
    return ''
  })

  const activeIdRef = computed(() => state.value?.activeId)
  watch(activeIdRef, () => {
    if (state.value && isEnemyTurn(state.value)) {
      clearTimeout(enemyTimer)
      enemyTimer = setTimeout(() => {
        enemyTurn(state.value)
        scrollLog()
      }, 650)
    }
  })

  const scheduleAuto = () => {
    if (!auto.value || !state.value || battleOver(state.value) || !isPlayerTurn(state.value)) return
    clearTimeout(autoTimer)
    autoTimer = setTimeout(() => {
      if (state.value && !battleOver(state.value) && isPlayerTurn(state.value)) {
        const act = aiPlayerAction(state.value)
        if (act) chooseAction(state.value, act)
      }
    }, 550)
  }
  watch(isPlayerTurnV, v => { if (v) scheduleAuto() })
  watch(auto, v => { if (v) scheduleAuto() })

  const startFight = () => {
    auto.value = false
    const d = difficulties.find(x => x.key === diff.value) || difficulties[1]
    const enemies = buildEnemies(player.value, {
      count: count.value,
      boss: !!d.boss,
      levelOffset: d.levelOffset || 0,
      reincarnation: player.value.reincarnation || 0,
      mult: d.mult || 1
    })
    state.value = reactive(startBattle(player.value, enemies, { award: true, ladder: true }))
    target.value = state.value.enemies[0]?.id || null
    nextTick(scrollLog)
  }

  const doAttack = () => { auto.value = false; chooseAction(state.value, { type: 'attack', target: selTarget.value?.id }) }
  const doSkill = ab => { auto.value = false; chooseAction(state.value, { type: 'attack', target: selTarget.value?.id, ability: ab }) }
  const doDefend = () => { auto.value = false; chooseAction(state.value, { type: 'defend' }) }
  const doFlee = () => { auto.value = false; chooseAction(state.value, { type: 'flee' }) }

  watch(isEnemyTurnV, v => { if (v) scrollLog() })

  const scrollLog = () => {
    nextTick(() => {
      if (logRef.value) logRef.value.scrollTop = logRef.value.scrollHeight
    })
  }

  const hpPct = e => e && e.maxHp ? Math.max(0, Math.min(100, (e.hp / e.maxHp) * 100)) : 0
  const mpPct = e => e && e.maxMp ? Math.max(0, Math.min(100, (e.mp / e.maxMp) * 100)) : 0

  const reset = () => {
    auto.value = false
    state.value = null
    target.value = null
  }
  const backHome = () => router.push('/')

  onBeforeUnmount(() => { if (enemyTimer) clearTimeout(enemyTimer); if (autoTimer) clearTimeout(autoTimer) })
</script>

<style scoped>
  .battle { text-align: left; padding: 0 4px; }
  .page-header { margin-bottom: 12px; }
  .title { font-size: 22px; font-weight: bold; margin-bottom: 10px; }
  .realm, .lv { color: var(--el-color-primary); font-size: 13px; }
  .resources { display: flex; flex-wrap: wrap; gap: 6px; }
  .section-title { font-size: 15px; font-weight: bold; margin: 16px 0 8px; }
  .setup { max-width: 520px; }
  .diff-grid { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
  .diff-card { border: 1px solid var(--el-border-color-lighter); border-radius: 8px; padding: 10px 14px; cursor: pointer; background: var(--el-fill-color-light); }
  .diff-card.sel { border-color: var(--el-color-primary); background: var(--el-color-primary-light-9); }
  .diff-name { font-weight: bold; }
  .diff-desc { font-size: 12px; color: var(--el-text-color-secondary); margin-top: 2px; }
  .set-row { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
  .fight-btn { width: 100%; }
  .tip { font-size: 12px; color: var(--el-text-color-secondary); margin-top: 10px; line-height: 1.7; }

  .arena { display: flex; flex-direction: column; border-radius: 14px; padding: 10px; background: linear-gradient(rgba(250, 247, 240, 0.86), rgba(238, 234, 224, 0.9)), var(--arena-img, none) center / cover no-repeat; box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.4); }
  .round-bar { font-size: 13px; margin-bottom: 6px; }
  .controls { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
  .auto-tip { font-size: 12px; color: var(--el-color-success); }
  .sup-banner { margin-bottom: 8px; padding: 6px 10px; border-radius: 8px; background: rgba(64, 158, 255, 0.1); border: 1px solid rgba(64, 158, 255, 0.25); text-align: center; font-size: 12px; color: var(--el-text-color-secondary); }
  .sup-banner b { font-weight: bold; }
  .sup-banner b.up { color: #67c23a; }
  .sup-banner b.down { color: #f56c6c; }
  .sup-banner b.even { color: #909399; }
  .battlefield { display: grid; grid-template-columns: minmax(180px, 0.8fr) minmax(0, 2fr); gap: 10px; align-items: start; margin-bottom: 10px; }
  .enemy-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 8px; }
  .unit { border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 12px; padding: 10px 12px; min-width: 0; background: radial-gradient(circle at 30% 16%, rgba(255, 255, 255, 0.08), transparent 60%), linear-gradient(160deg, #3a3550, #232036); position: relative; box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.03), 0 8px 24px rgba(0, 0, 0, 0.3); }
  .unit.active { border-color: var(--el-color-warning); box-shadow: 0 0 0 2px #ffe082, 0 0 22px rgba(255, 224, 130, 0.25); }
  .unit.dead { opacity: 0.45; filter: grayscale(0.8); }
  .unit.sel { border-color: var(--el-color-danger); cursor: pointer; }
  .player-unit { border-color: var(--el-color-primary); }
  .unit-name { font-weight: 800; margin-bottom: 4px; font-size: 15px; color: #fff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .unit-sub { font-size: 12px; line-height: 1.35; color: #dfe0f0; }
  .bar { height: 11px; border-radius: 7px; background: rgba(0, 0, 0, 0.35); margin: 4px 0; overflow: hidden; border: 1px solid rgba(255, 255, 255, 0.08); }
  .bar span { display: block; height: 100%; transition: width .3s; border-radius: 7px; }
  .bar.hp span { background: linear-gradient(90deg, #ff5252, #ff8a80); }
  .bar.mp span { background: linear-gradient(90deg, #448aff, #82b1ff); }
  .def-tag { font-size: 12px; color: #ffd54f; margin-top: 4px; }

  .actions { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
  .actions .el-button { min-height: 36px; font-size: 13px; padding: 8px 10px; }
  .log { max-height: 180px; overflow-y: auto; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 10px; padding: 8px 12px; background: #14141f; color: #cbd0e0; font-size: 13px; line-height: 1.8; box-shadow: inset 0 0 22px rgba(0, 0, 0, 0.55); }
  .log-line { margin-bottom: 2px; }
  .log-round { color: #6b7280; margin-right: 4px; }
  .log-line.dmg { color: #f2a4a4; }
  .log-line.skill { color: #c8a4ff; }
  .log-line.warn, .log-line.debuff { color: #ffd38a; }
  .log-line.err { color: #ff7b7b; }
  .log-line.ok, .log-line.heal, .log-line.def { color: #a4e2a4; }
  .log-line.dodge { color: #9fb4d8; }

  .result { margin-top: 12px; border: 1px solid var(--el-border-color-lighter); border-radius: 10px; padding: 16px; text-align: center; background: var(--el-fill-color-light); }
  .res-title { font-size: 20px; font-weight: bold; margin-bottom: 8px; }
  .res-title.ok { color: var(--el-color-success); }
  .res-title.err { color: var(--el-color-danger); }
  .res-lines { color: var(--el-text-color-primary); line-height: 2; }
  .res-fruit { color: var(--el-color-success); font-weight: 700; }
  .res-sub { color: var(--el-text-color-secondary); margin-bottom: 8px; }
  .res-btns { margin-top: 10px; display: flex; justify-content: center; gap: 10px; }

  @media only screen and (max-width: 768px) {
    .page-header { margin-bottom: 6px; }
    .title { font-size: 16px; margin-bottom: 4px; }
    .resources { gap: 4px; }
    .resources .el-tag { height: 22px; padding: 0 6px; font-size: 11px; }
    .arena { padding: 7px; border-radius: 10px; }
    .round-bar { font-size: 12px; margin-bottom: 4px; }
    .controls { margin-bottom: 5px; }
    .battlefield { grid-template-columns: 1fr; gap: 7px; margin-bottom: 7px; }
    .enemy-row { grid-template-columns: repeat(auto-fit, minmax(84px, 1fr)); gap: 6px; }
    .unit { padding: 7px 8px; border-radius: 10px; }
    .unit-name { margin-bottom: 3px; font-size: 12px; }
    .unit-sub { font-size: 10px; line-height: 1.3; word-break: break-all; }
    .bar { height: 9px; margin: 3px 0; }
    .def-tag { margin-top: 2px; font-size: 10px; }
    .actions { gap: 5px; margin-bottom: 7px; }
    .actions .el-button { min-height: 32px; margin-left: 0 !important; padding: 6px 8px; font-size: 11px; }
    .log { max-height: 132px; padding: 6px 8px; border-radius: 8px; font-size: 11px; line-height: 1.6; }
    .result { margin-top: 8px; padding: 10px; }
    .res-title { margin-bottom: 4px; font-size: 16px; }
    .res-lines { line-height: 1.7; font-size: 12px; }
  }
</style>
