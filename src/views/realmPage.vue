<template>
  <div class="realm">
    <div class="page-header">
      <div class="title">秘境探险 · <span class="realm" v-text="levelNames(player.level)" /></div>
      <div class="resources">
        <el-tag type="warning">灵石 {{ formatNumberToChineseUnit(player.props.money || 0) }}</el-tag>
      </div>
    </div>

    <div class="section-title">秘境列表 <span class="hint">进入需入场费，概率获天材地宝</span></div>
    <div class="realm-grid">
      <el-card v-for="r in REALMS" :key="r.id" class="card" shadow="hover" :style="cardStyle">
        <template #header>
          <div class="head">
            <span class="name">{{ r.name }}</span>
            <el-tag size="small" :type="player.level >= r.minLevel ? 'success' : 'info'" effect="plain">
              {{ player.level >= r.minLevel ? '可入' : '需 ' + levelNames(r.minLevel) }}
            </el-tag>
          </div>
        </template>
        <p class="theme">{{ r.theme }}</p>
        <div class="fee">入场费：{{ formatNumberToChineseUnit(r.fee) }} 灵石</div>
        <el-button class="enter-btn" type="primary" @click="enter(r)" :disabled="player.level < r.minLevel || (player.props.money || 0) < r.fee">
          进入秘境
        </el-button>
        <el-button class="boss-btn" type="warning" plain @click="boss(r)" :disabled="player.level < r.minLevel">
          首领挑战（{{ r.bossFee }} 混沌石）
        </el-button>
      </el-card>
    </div>

    <div class="result" v-if="result">
      <div class="section-title">本次所得</div>
      <div v-if="result.ok">
        <el-tag v-for="(t, i) in result.rewards" :key="i" :type="t.treasure ? 'danger' : t.scroll ? 'warning' : 'success'" effect="plain" class="r-tag">
          {{ t.name }} ×{{ t.qty }}{{ t.treasure ? '（天材地宝！）' : t.scroll ? '（功法卷轴！）' : '' }}
        </el-tag>
      </div>
      <div v-else class="fail">{{ result.reason }}</div>
    </div>

    <div class="section-title">天材地宝（可用于提升根骨 / 觉醒体质）</div>
    <div class="treasure-list">
      <div class="treasure" v-for="t in ownedTreasures" :key="t.key">
        <div class="tinfo">
          <b class="clickable" @click="showTreasure(t)">{{ t.name }}</b>
          <span class="tdesc">{{ t.desc }}</span>
        </div>
        <el-tag size="small" type="warning">×{{ t.count }}</el-tag>
        <span class="val">价值 {{ formatNumberToChineseUnit(treasureVal(t)) }} 灵石</span>
        <el-button size="small" type="primary" @click="use(t.key)">使用</el-button>
      </div>
      <el-empty v-if="!ownedTreasures.length" description="暂无天材地宝，去秘境或拍场碰碰运气" />
    </div>

    <div class="outer-actions">
    </div>
    <item-info :visible="infoShow" :data="infoData" @update:visible="infoShow = $event" />
  </div>
  <TurnCombat
    :visible="turnShow"
    :enemy="realmEnemyInfo"
    :award="false"
    :title="turnKind === 'boss' ? '秘境·首领战' : '秘境·守灵战'"
    @update:visible="turnShow = $event"
    @win="onRealmWin"
    @lose="onRealmLose"
    @flee="onRealmFlee"
  />
</template>

<script setup>
  import { ref, computed } from 'vue'
  import { useRouter } from 'vue-router'
  import { useMainStore } from '@/plugins/store'
  import { formatNumberToChineseUnit, levelNames, gameNotifys } from '@/plugins/game'
  import { REALMS, realmEnemy, realmWin, realmLose } from '@/plugins/secretRealm'
  import TurnCombat from '@/components/TurnCombat.vue'
  import { TREASURES, treasureCount, useTreasure, treasureById } from '@/plugins/treasure'
  import itemInfo from '@/components/itemInfo.vue'
  import realmBg from '@/assets/images/realm-card-bg.png'

  const store = useMainStore()
  const router = useRouter()
  const player = ref(store.player)
  const result = ref(null)
  const turnShow = ref(false)
  const turnRealm = ref(null)
  const turnKind = ref('')
  const infoShow = ref(false)
  const infoData = ref(null)
  const cardStyle = { '--card-bg': `url(${realmBg})` }

  const ownedTreasures = computed(() =>
    TREASURES.map(t => ({ ...t, count: treasureCount(player.value, t.key) })).filter(t => t.count > 0)
  )

  const enter = r => {
    if (player.value.level < r.minLevel || (player.value.props.money || 0) < r.fee) return
    player.value.props.money -= r.fee
    player.value.realmTimes = (player.value.realmTimes || 0) + 1
    turnRealm.value = r
    turnKind.value = 'explore'
    turnShow.value = true
  }

  const boss = r => {
    if (player.value.level < r.minLevel || (player.value.props.currency || 0) < r.bossFee) return
    player.value.props.currency -= r.bossFee
    turnRealm.value = r
    turnKind.value = 'boss'
    turnShow.value = true
  }

  const realmEnemyInfo = computed(() => (turnRealm.value ? realmEnemy(turnRealm.value, turnKind.value === 'boss') : null))
  const onRealmWin = () => {
    const r = turnRealm.value
    turnShow.value = false
    if (r) {
      const res = realmWin(player.value, r, turnKind.value === 'boss')
      result.value = res
      gameNotifys({ title: turnKind.value === 'boss' ? '首领斩获' : '秘境归来', message: `获得 ${res.rewards.map(x => x.name + '×' + x.qty).join('，')}`, type: 'success' })
    }
  }
  const onRealmLose = () => {
    const r = turnRealm.value
    turnShow.value = false
    if (r) {
      const res = realmLose(player.value, r, turnKind.value === 'boss')
      result.value = res
      gameNotifys({ title: turnKind.value === 'boss' ? '首领挑战' : '秘境探索', message: res.reason, type: 'warning' })
    }
  }
  const onRealmFlee = () => { turnShow.value = false; turnRealm.value = null }

  const use = key => {
    const res = useTreasure(player.value, key)
    if (res.ok) {
      if (res.upgraded) gameNotifys({ title: '机缘天成', message: `根骨提升至【${res.name}】！`, type: 'success' })
      else if (res.awakened) gameNotifys({ title: '体质觉醒', message: `【${res.name}】体质觉醒！`, type: 'success' })
      else gameNotifys({ title: '天材地宝', message: res.reason, type: 'info' })
    } else {
      gameNotifys({ title: '天材地宝', message: res.reason, type: 'error' })
    }
  }

  const showTreasure = t => {
    infoData.value = {
      title: t.name,
      rows: [{ k: '品阶', v: t.tierName }, { k: '库存', v: t.count }],
      effects: [t.desc]
    }
    infoShow.value = true
  }

  const treasureVal = t => treasureById(t.key)?.price || 0
</script>

<style scoped>
  .realm { text-align: left; padding: 0 4px; }
  .page-header { margin-bottom: 10px; }
  .title { font-size: 20px; font-weight: bold; margin-bottom: 8px; }
  .realm { color: var(--el-color-primary); }
  .resources { display: flex; gap: 8px; }
  .section-title { font-size: 15px; font-weight: bold; margin: 12px 0 8px; }
  .hint { font-size: 12px; font-weight: normal; color: var(--el-text-color-secondary); margin-left: 8px; }
  .realm-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
  .card { margin: 0; background: linear-gradient(rgba(255, 255, 255, 0.9), rgba(248, 250, 252, 0.94)), var(--card-bg) center / cover no-repeat; }
  html.dark .card { background: linear-gradient(rgba(18, 22, 28, 0.88), rgba(12, 16, 22, 0.92)), var(--card-bg) center / cover no-repeat; }
  .head { display: flex; justify-content: space-between; align-items: center; }
  .name { font-size: 15px; font-weight: bold; }
  .theme { font-size: 12px; color: var(--el-text-color-secondary); margin: 2px 0 6px; min-height: 18px; }
  .fee { font-size: 13px; color: var(--el-color-warning); margin-bottom: 8px; }
  .enter-btn { width: 100%; }
  .boss-btn { width: 100%; margin-left: 0; margin-top: 6px; }
  .result { background: var(--el-fill-color-light); border-radius: 6px; padding: 8px 12px; margin-top: 8px; }
  .r-tag { margin-right: 6px; }
  .fail { font-size: 13px; color: var(--el-color-danger); }
  .treasure-list { display: flex; flex-direction: column; gap: 6px; }
  .treasure { display: flex; align-items: center; gap: 12px; padding: 6px 10px; border-radius: 4px; background: var(--el-fill-color-light); }
  .clickable { cursor: pointer; color: var(--el-color-primary); }
  .val { font-size: 12px; color: var(--el-color-warning); }
  .tinfo { display: flex; flex-direction: column; flex: 1; }
  .tdesc { font-size: 12px; color: var(--el-text-color-secondary); }
  .outer-actions { margin-top: 16px; display: flex; justify-content: center; }
  @media only screen and (max-width: 768px) { .realm-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; } }
</style>
