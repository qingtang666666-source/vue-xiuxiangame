<template>
  <el-dialog
    :model-value="visible"
    :title="title || '战斗'"
    width="min(940px, 94vw)"
    class="turn-combat"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    @update:model-value="v => emit('update:visible', v)"
  >
    <div v-if="state" class="tc" :style="arenaStyle">
      <div class="tc-topbar">
        <div class="tc-round">第 <b>{{ state.round }}</b> 回合</div>
        <div class="tc-phase" :class="{ enemy: !isPlayerTurnV && !battleOverV, over: battleOverV }">{{ phaseLabel }}</div>
        <div class="tc-controls">
          <el-switch v-model="auto" active-text="自动战斗" inline-prompt />
          <span v-if="auto" class="tc-tip">自动进行中…</span>
        </div>
      </div>

      <div class="tc-arena">
        <div class="tc-side">
          <div class="tc-unit me" :class="{ dead: state.player.hp <= 0, active: isPlayerTurnV }">
            <div v-for="f in floatsMe" :key="f.id" class="tc-float" :class="{ crit: f.crit }" :style="{ left: f.x + '%', animationDelay: f.delay + 's' }">{{ f.text }}</div>
            <div class="tc-name">{{ state.player.name }}<span class="lv">{{ levelNames(state.player.level) }}</span></div>
            <div class="tc-bars">
              <div class="tc-bar hp"><span :style="{ width: pct(state.player.maxHp, state.player.hp) + '%' }" /></div>
              <div class="tc-bar mp"><span :style="{ width: pct(state.player.maxMp, state.player.mp) + '%' }" /></div>
              <div class="tc-num">血 <b>{{ Math.max(0, Math.floor(state.player.hp)) }}</b>/{{ state.player.maxHp }} · 灵 {{ Math.floor(state.player.mp) }}/{{ state.player.maxMp }}</div>
            </div>
            <div class="tc-pct">{{ pct(state.player.maxHp, state.player.hp).toFixed(1) }}%</div>
          </div>
        </div>

        <div class="tc-vs"><i>VS</i><span>对决</span></div>

        <div class="tc-side">
          <div class="tc-unit foe" :class="{ dead: foe.hp <= 0, sel: target === foe.id, active: !isPlayerTurnV && !battleOverV }" @click="target = foe.id">
            <div v-for="f in floatsFoe" :key="f.id" class="tc-float" :class="{ crit: f.crit }" :style="{ left: f.x + '%', animationDelay: f.delay + 's' }">{{ f.text }}</div>
            <div class="tc-name">{{ foe.name }}<span class="lv">{{ levelNames(foe.level) }}</span></div>
            <div class="tc-bars">
              <div class="tc-bar hp"><span :style="{ width: pct(foe.maxHp, foe.hp) + '%' }" /></div>
              <div class="tc-bar mp"><span :style="{ width: pct(foe.maxMp, foe.mp) + '%' }" /></div>
              <div class="tc-num">血 <b>{{ Math.max(0, Math.floor(foe.hp)) }}</b>/{{ foe.maxHp }} · 灵 {{ Math.floor(foe.mp) }}/{{ foe.maxMp }}</div>
            </div>
            <div class="tc-pct">{{ pct(foe.maxHp, foe.hp).toFixed(1) }}%</div>
            <div v-if="foe._defending" class="tc-flag">🛡 防御中</div>
          </div>
        </div>
      </div>

      <div v-if="isPlayerTurnV" class="tc-actions">
        <button class="tc-act atk" @click="doAttack"><span class="ic">⚔</span><span class="la">普攻</span></button>
        <el-tooltip
          v-for="ab in abilities"
          :key="ab.id"
          placement="top"
          :hide-after="0"
          :content="abilityTip(ab)"
          popper-class="divine-tip"
        >
          <button
            class="tc-act skill"
            :class="ab.kind"
            :disabled="state.player.mp < ab.mpCost || (ab.kind !== 'heal' && !foe)"
            @click="doSkill(ab)"
          ><span class="ic">{{ kindIcon(ab.kind) }}</span><span class="la">{{ ab.name }}</span><span class="mp">{{ ab.mpCost }}灵</span></button>
        </el-tooltip>
        <button class="tc-act def" @click="doDefend"><span class="ic">🛡</span><span class="la">防御</span></button>
        <button class="tc-act retr" @click="doFlee"><span class="ic">🏃</span><span class="la">撤退</span></button>
      </div>

      <div class="tc-log" ref="tcLog">
        <div v-for="(l, i) in state.log" :key="i" class="tc-logline" :class="l.cls"><span class="r">[{{ l.round }}]</span> <span v-html="l.text" /></div>
      </div>

      <div v-if="battleOverV" class="tc-result" :class="state.phase">
        <div class="tc-res-title" :class="state.phase === 'victory' ? 'ok' : state.phase === 'defeat' ? 'err' : ''">
          {{ state.phase === 'victory' ? '✨ 战斗胜利' : state.phase === 'defeat' ? '💀 战败' : '🏃 撤退成功' }}
        </div>
        <template v-if="state.phase === 'victory' && !hideReward">
          <div class="tc-res-lines">
            <div>修为 +{{ formatNumberToChineseUnit(state.reward?.exp || 0) }}</div>
            <div>灵石 +{{ formatNumberToChineseUnit(state.reward?.money || 0) }}</div>
            <div>培养丹 +{{ state.reward?.dan || 0 }} · 灵草 +{{ state.reward?.herb || 0 }} · 炼器石 +{{ state.reward?.stone || 0 }}</div>
          </div>
        </template>
        <div v-else-if="state.phase === 'victory'" class="tc-res-sub">你已击败强敌！</div>
        <div class="tc-res-btns">
          <el-button type="primary" size="large" @click="close(state.phase === 'victory' ? 'win' : state.phase === 'defeat' ? 'lose' : 'flee')">确定</el-button>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
  import { ref, reactive, computed, watch, nextTick, onBeforeUnmount } from 'vue'
  import { useMainStore } from '@/plugins/store'
  import { bumpDaily } from '@/plugins/dailyGoals'
  import { formatNumberToChineseUnit, levelNames, realmSuppressionMult } from '@/plugins/game'
  import { divineTipText } from '@/plugins/divine'
  import battleArenaBg from '@/assets/images/battle-arena-bg.png'
  import {
    startBattle,
    monsterToEntity,
    chooseAction,
    enemyTurn,
    isPlayerTurn,
    battleOver,
    getPlayerAbilities,
    aiPlayerAction
  } from '@/plugins/battleEngine'

  const props = defineProps({
    visible: Boolean,
    enemy: { type: Object, default: null },
    title: { type: String, default: '' },
    award: { type: Boolean, default: true },
    hideReward: { type: Boolean, default: false }
  })
  const emit = defineEmits(['update:visible', 'win', 'lose', 'flee'])
  const store = useMainStore()
  const arenaStyle = { '--arena-img': `url(${battleArenaBg})` }

  const state = ref(null)
  const auto = ref(false)
  const target = ref(null)
  let enemyTimer = null
  let autoTimer = null
  const tcLog = ref(null)
  const floatsMe = ref([])
  const floatsFoe = ref([])
  let floatId = 0
  const addFloat = (arr, dmg, crit) => {
    const id = ++floatId
    arr.value.push({ id, text: dmg, crit, x: 28 + Math.random() * 44, delay: Math.random() * 0.06 })
    setTimeout(() => { arr.value = arr.value.filter(f => f.id !== id) }, 1050)
  }
  watch(
    () => state.value?.log?.length || 0,
    () => {
      const log = state.value?.log
      if (!log || !log.length) return
      const e = log[log.length - 1]
      if (!/点伤害/.test(e.text || '')) return
      const dm = (e.text || '').match(/<b>(\d+)<\/b>\s*点伤害/)
      if (!dm) return
      const dmg = Number(dm[1])
      const crit = /暴击/.test(e.text)
      if (/你对|你挥出攻击|你施展/.test(e.text)) addFloat(floatsFoe, dmg, crit)
      else if (/对你造成|向你扑来|对你/.test(e.text)) addFloat(floatsMe, dmg, crit)
    }
  )

  const foe = computed(() => (state.value ? state.value.enemies[0] : null))
  const abilities = computed(() => (state.value ? getPlayerAbilities(store.player) : []))
  const isPlayerTurnV = computed(() => state.value && isPlayerTurn(state.value))
  const battleOverV = computed(() => state.value && battleOver(state.value))
  const phaseLabel = computed(() => {
    if (!state.value) return ''
    if (battleOverV.value) return { victory: '战斗结束', defeat: '战斗结束', fled: '已脱离' }[state.value.phase] || ''
    if (isPlayerTurnV.value) return '你的回合'
    return '敌方行动中…'
  })

  const start = () => {
    if (!props.enemy) return
    state.value = reactive(startBattle(store.player, [monsterToEntity(props.enemy)], { award: props.award }))
    target.value = state.value.enemies[0]?.id || null
    auto.value = false
    nextTick(scrollLog)
  }

  watch(() => props.visible, v => { if (v && props.enemy) start() })
  watch(() => props.enemy, () => { if (props.visible && props.enemy) start() })

  const scheduleEnemy = () => {
    if (state.value && isEnemyPhase(state.value)) {
      clearTimeout(enemyTimer)
      enemyTimer = setTimeout(() => {
        if (state.value && !battleOver(state.value) && isEnemyPhase(state.value)) enemyTurn(state.value)
        scrollLog()
      }, 620)
    }
  }
  const scheduleAuto = () => {
    if (!auto.value || !state.value || battleOver(state.value) || !isPlayerTurn(state.value)) return
    clearTimeout(autoTimer)
    autoTimer = setTimeout(() => {
      if (state.value && !battleOver(state.value) && isPlayerTurn(state.value)) {
        const act = aiPlayerAction(state.value)
        if (act) chooseAction(state.value, act)
      }
    }, 520)
  }
  const watchActive = computed(() => state.value?.activeId)
  watch(watchActive, () => { scheduleEnemy(); scheduleAuto() })
  watch(auto, v => { if (v) scheduleAuto() })
  watch(isPlayerTurnV, v => { if (v) scheduleAuto() })

  const isEnemyPhase = st => st.phase === 'enemy'

  const doAttack = () => { auto.value = false; chooseAction(state.value, { type: 'attack', target: target.value }) }
  const doSkill = ab => { auto.value = false; chooseAction(state.value, { type: 'attack', target: target.value, ability: ab }) }

  // 神通悬浮介绍：通用说明 + 针对当前敌人的预估数值
  const abilityEstimate = ab => {
    const st = state.value
    if (!st) return ''
    const p = st.player
    if (ab.kind === 'heal') return `预计回复 ≈ ${formatNumberToChineseUnit(Math.floor(p.maxHp * 0.12 * ab.power))} 气血`
    const e = foe.value
    if (!e) return ''
    const raw = Math.max(1, p.atk - Math.max(0, (e.def || 0) - (p.armorPen || 0)))
    const dmg = Math.floor(raw * ab.power * realmSuppressionMult(p.level, e.level))
    return `预计伤害 ≈ ${formatNumberToChineseUnit(dmg)}（未计闪避/暴击/格挡）`
  }
  const abilityTip = ab => divineTipText(ab, abilityEstimate(ab))
  const doDefend = () => { auto.value = false; chooseAction(state.value, { type: 'defend' }) }
  const doFlee = () => { auto.value = false; chooseAction(state.value, { type: 'flee' }) }

  const close = kind => {
    clearTimeout(enemyTimer); clearTimeout(autoTimer)
    if (kind === 'win') { bumpDaily(store.player, 'battle'); emit('win', state.value?.reward || {}) }
    else if (kind === 'lose') emit('lose')
    else if (kind === 'flee') emit('flee')
    state.value = null
    emit('update:visible', false)
  }

  watch(battleOverV, v => {
    if (v) scrollLog()
  })

  const scrollLog = () => nextTick(() => { if (tcLog.value) tcLog.value.scrollTop = tcLog.value.scrollHeight })
  const pct = (max, cur) => (max > 0 ? Math.max(0, Math.min(100, (cur / max) * 100)) : 0)
  const kindIcon = k => ({ burst: '⚔', control: '🌀', heal: '💚', lifesteal: '🩸' }[k] || '✦')

  onBeforeUnmount(() => { if (enemyTimer) clearTimeout(enemyTimer); if (autoTimer) clearTimeout(autoTimer) })
</script>

<style scoped>
  .tc { color: var(--el-text-color-primary); }
  .tc-topbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 16px; border-radius: 12px; background: linear-gradient(135deg, #2a2a4a, #3a2a5a); color: #fff; box-shadow: 0 6px 18px rgba(0, 0, 0, 0.25); }
  .tc-round { font-size: 16px; }
  .tc-round b { color: #ffe082; }
  .tc-phase { font-size: 15px; font-weight: 800; color: #ffe082; letter-spacing: 1px; }
  .tc-phase.enemy { color: #ff9c9c; }
  .tc-phase.over { color: #8be08b; }
  .tc-controls { display: flex; align-items: center; gap: 8px; }
  .tc-tip { font-size: 12px; color: var(--el-color-success); }
  .tc-arena { display: flex; align-items: center; gap: 12px; margin-top: 14px; border-radius: 16px; padding: 12px; background: linear-gradient(rgba(250, 247, 240, 0.8), rgba(242, 237, 227, 0.88)), var(--arena-img, none) center / cover no-repeat; }
  .tc-side { flex: 1; min-width: 0; }
  .tc-unit { position: relative; border-radius: 18px; padding: 18px 22px 16px; border: 1px solid rgba(255, 255, 255, 0.1); background: radial-gradient(circle at 30% 16%, rgba(255, 255, 255, 0.08), transparent 60%), linear-gradient(160deg, #3a3550, #232036); box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.03), 0 10px 28px rgba(0, 0, 0, 0.3); }
  .tc-unit.me { border-color: rgba(96, 165, 250, 0.5); }
  .tc-unit.foe { cursor: pointer; border-color: rgba(255, 120, 120, 0.4); }
  .tc-unit.active { box-shadow: 0 0 0 2px #ffe082, 0 0 26px rgba(255, 224, 130, 0.25), 0 10px 28px rgba(0, 0, 0, 0.3); }
  .tc-unit.foe.sel { border-color: #ff5252; }
  .tc-unit.dead { opacity: 0.4; filter: grayscale(0.8); }
  .tc-portrait { width: 66px; height: 66px; margin: 0 auto 12px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 30px; font-weight: 800; color: #fff; background: radial-gradient(circle at 35% 30%, #6a8cf0, #2b3a8f); box-shadow: 0 0 20px rgba(120, 150, 255, 0.6), inset 0 0 0 2px rgba(255, 255, 255, 0.2); }
  .tc-portrait.foe-p { background: radial-gradient(circle at 35% 30%, #d77, #7a1f1f); box-shadow: 0 0 20px rgba(255, 90, 90, 0.5), inset 0 0 0 2px rgba(255, 255, 255, 0.2); }
  .tc-name { font-size: 21px; font-weight: 800; color: #fff; margin-bottom: 10px; text-align: center; }
  .tc-name .lv { font-size: 13px; color: #ffe082; margin-left: 8px; font-weight: 600; }
  .tc-float {
    position: absolute;
    z-index: 6;
    top: -8px;
    transform: translateX(-50%);
    font-size: 18px;
    font-weight: 800;
    color: #fff;
    text-shadow: 0 1px 5px rgba(0, 0, 0, 0.8);
    animation: tcFloat 1s ease-out forwards;
    pointer-events: none;
    white-space: nowrap;
  }
  .tc-float.crit { color: #ffd24a; font-size: 24px; }
  @keyframes tcFloat {
    0% { opacity: 0; transform: translate(-50%, 8px) scale(0.6); }
    25% { opacity: 1; transform: translate(-50%, -2px) scale(1.12); }
    100% { opacity: 0; transform: translate(-50%, -34px) scale(1); }
  }
  .tc-bars { display: flex; flex-direction: column; gap: 8px; }
  .tc-bar { height: 16px; border-radius: 8px; background: rgba(0, 0, 0, 0.35); overflow: hidden; border: 1px solid rgba(255, 255, 255, 0.08); }
  .tc-bar span { display: block; height: 100%; transition: width 0.35s; border-radius: 8px; }
  .tc-bar.hp span { background: linear-gradient(90deg, #ff5252, #ff8a80); }
  .tc-bar.mp span { background: linear-gradient(90deg, #448aff, #82b1ff); }
  .tc-num { font-size: 13px; color: #dfe0f0; margin-top: 6px; }
  .tc-num b { font-size: 16px; color: #fff; }
  .tc-pct { position: absolute; top: 20px; right: 22px; font-size: 20px; font-weight: 800; color: rgba(255, 255, 255, 0.92); text-shadow: 0 1px 4px rgba(0, 0, 0, 0.5); }
  .tc-flag { font-size: 12px; color: #ffd54f; margin-top: 8px; }
  .tc-vs { display: flex; flex-direction: column; align-items: center; gap: 2px; }
  .tc-vs i { font-size: 30px; font-style: normal; font-weight: 900; color: #ff7043; text-shadow: 0 0 16px rgba(255, 112, 67, 0.7); }
  .tc-vs span { font-size: 12px; color: #cfd0e7; letter-spacing: 2px; }
  .tc-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 16px; }
  .tc-act { flex: 1 1 118px; min-height: 64px; border: none; border-radius: 14px; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; color: #fff; font-weight: 700; font-size: 14px; background: linear-gradient(160deg, #3a3a5a, #26263e); box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.08); transition: transform 0.1s; }
  .tc-act:hover { transform: translateY(-2px); }
  .tc-act:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
  .tc-act .ic { font-size: 27px; }
  .tc-act .la { font-size: 15px; }
  .tc-act .mp { font-size: 11px; color: #9fd0ff; }
  .tc-act.atk { background: linear-gradient(160deg, #7a3b2a, #a05a2b); }
  .tc-act.def { background: linear-gradient(160deg, #2b3e6b, #2b5570); }
  .tc-act.retr { background: linear-gradient(160deg, #5a3b3b, #804141); }
  .tc-act.skill.burst { background: linear-gradient(160deg, #7a2a3a, #a03850); }
  .tc-act.skill.control { background: linear-gradient(160deg, #3a2a6a, #5a3a90); }
  .tc-act.skill.heal { background: linear-gradient(160deg, #2a5a3a, #3a9050); }
  .tc-act.skill.lifesteal { background: linear-gradient(160deg, #5a2a5a, #8a3a70); }
  .tc-log { margin-top: 14px; max-height: 200px; overflow-y: auto; border-radius: 12px; padding: 10px 14px; background: #14141f; color: #cbd0e0; font-size: 14px; line-height: 2; box-shadow: inset 0 0 22px rgba(0, 0, 0, 0.55); }
  .tc-logline { margin-bottom: 2px; }
  .tc-logline .r { color: #6b7280; margin-right: 5px; }
  .tc-logline.dmg { color: #f2a4a4; }
  .tc-logline.skill { color: #c8a4ff; }
  .tc-logline.warn, .tc-logline.debuff { color: #ffd38a; }
  .tc-logline.err { color: #ff7b7b; }
  .tc-logline.ok, .tc-logline.heal, .tc-logline.def { color: #a4e2a4; }
  .tc-logline.dodge { color: #9fb4d8; }
  .tc-result { margin-top: 14px; text-align: center; padding: 20px; border-radius: 18px; background: radial-gradient(circle at 50% 28%, rgba(255, 255, 255, 0.06), transparent 70%), linear-gradient(160deg, #26213c, #171327); box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35); }
  .tc-res-title { font-size: 26px; font-weight: 900; margin-bottom: 8px; letter-spacing: 2px; }
  .tc-res-title.ok { color: #8be08b; text-shadow: 0 0 18px rgba(139, 224, 139, 0.5); }
  .tc-res-title.err { color: #ff7b7b; text-shadow: 0 0 18px rgba(255, 123, 123, 0.5); }
  .tc-res-sub { color: #ffe082; font-size: 14px; }
  .tc-res-lines { color: var(--el-text-color-primary); line-height: 2.1; font-size: 15px; }
  .tc-res-btns { margin-top: 12px; }

  /* 淡雅主题：浅色、去头像后的简洁界面 */
  .tc { color: var(--el-text-color-primary); }
  .tc-topbar { background: linear-gradient(135deg, #f5f0e8, #eae4f0); color: #5a5470; border: 1px solid #e4dcc9; border-radius: 14px; }
  .tc-round b { color: #8a6f4d; }
  .tc-phase { color: #8a6f4d; }
  .tc-phase.enemy { color: #c07a7a; }
  .tc-phase.over { color: #6a9a6a; }
  .tc-tip { color: #6a9a6a; }
  .tc-unit { border-radius: 18px; padding: 18px 22px 16px; border: 1px solid #e6e0d2; background: linear-gradient(165deg, #fffdf8, #f4efe6); box-shadow: 0 8px 24px rgba(120, 100, 70, 0.12); }
  .tc-unit.me { border-color: #bcd4f0; }
  .tc-unit.foe { cursor: pointer; border-color: #f0c0c0; }
  .tc-unit.active { box-shadow: 0 0 0 2px #e0c98a, 0 8px 24px rgba(120, 100, 70, 0.16); }
  .tc-unit.foe.sel { border-color: #e07a7a; }
  .tc-unit.dead { opacity: 0.5; filter: grayscale(0.8); }
  .tc-name { font-size: 21px; font-weight: 800; color: #4a4560; margin-bottom: 10px; text-align: center; }
  .tc-name .lv { font-size: 13px; color: #b08a4a; margin-left: 8px; font-weight: 600; }
  .tc-bar { height: 14px; border-radius: 8px; background: rgba(120, 100, 70, 0.12); overflow: hidden; }
  .tc-bar.hp span { background: linear-gradient(90deg, #e08a8a, #e5b1a0); }
  .tc-bar.mp span { background: linear-gradient(90deg, #8ab0e0, #a9c6e5); }
  .tc-num { font-size: 13px; color: #7a7590; margin-top: 6px; }
  .tc-num b { font-size: 16px; color: #4a4560; }
  .tc-pct { text-align: right; margin-top: 4px; font-size: 14px; font-weight: 700; color: #8a8560; }
  .tc-flag { font-size: 12px; color: #b08a4a; margin-top: 8px; }
  .tc-vs i { font-size: 30px; font-weight: 900; color: #c9a06a; }
  .tc-vs span { font-size: 12px; color: #a29a80; letter-spacing: 2px; }
  .tc-act { flex: 1 1 118px; min-height: 60px; border: none; border-radius: 14px; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; color: #fff; font-weight: 700; font-size: 14px; background: linear-gradient(160deg, #9b8b74, #b3a180); box-shadow: 0 6px 16px rgba(120, 100, 70, 0.2); transition: transform 0.1s; }
  .tc-act:hover { transform: translateY(-2px); }
  .tc-act:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }
  .tc-act .ic { font-size: 26px; }
  .tc-act .la { font-size: 15px; }
  .tc-act .mp { font-size: 11px; color: #e6e0d0; }
  .tc-act.atk { background: linear-gradient(160deg, #b0795f, #c99b6f); }
  .tc-act.def { background: linear-gradient(160deg, #6f82a0, #8fa6c0); }
  .tc-act.retr { background: linear-gradient(160deg, #a06f6f, #b58a8a); }
  .tc-act.skill.burst { background: linear-gradient(160deg, #a05f72, #c07a90); }
  .tc-act.skill.control { background: linear-gradient(160deg, #7a6fb0, #998fc8); }
  .tc-act.skill.heal { background: linear-gradient(160deg, #6fa07f, #8fb89a); }
  .tc-act.skill.lifesteal { background: linear-gradient(160deg, #a06fa0, #c08ac0); }
  .tc-log { margin-top: 14px; max-height: 200px; overflow-y: auto; border-radius: 12px; padding: 10px 14px; background: #faf7f0; color: #6b6570; font-size: 14px; line-height: 2; border: 1px solid #e8e0d0; }
  .tc-logline { margin-bottom: 2px; }
  .tc-logline .r { color: #b0a88a; margin-right: 5px; }
  .tc-logline.dmg { color: #c07a7a; }
  .tc-logline.skill { color: #8a7ac0; }
  .tc-logline.warn, .tc-logline.debuff { color: #c09a5a; }
  .tc-logline.err { color: #d07a7a; }
  .tc-logline.ok, .tc-logline.heal, .tc-logline.def { color: #6a9a6a; }
  .tc-logline.dodge { color: #7a90b0; }
  .tc-result { margin-top: 14px; text-align: center; padding: 20px; border-radius: 18px; background: linear-gradient(165deg, #fffdf8, #f4efe6); border: 1px solid #e6e0d2; box-shadow: 0 8px 24px rgba(120, 100, 70, 0.12); }
  .tc-res-title { font-size: 26px; font-weight: 900; margin-bottom: 8px; letter-spacing: 2px; }
  .tc-res-title.ok { color: #6a9a6a; }
  .tc-res-title.err { color: #d07a7a; }
  .tc-res-sub { color: #b08a4a; font-size: 14px; }
</style>
