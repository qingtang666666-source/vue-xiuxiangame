<template>
  <el-drawer
    title="豪杰榜"
    :model-value="visible"
    @update:model-value="v => emit('update:visible', v)"
    direction="rtl"
    class="heroBoard"
    size="420px"
  >
    <div class="hb">
      <div class="hb-top">
        <div class="hb-name">你的名次：<b class="hb-myrank">{{ myRankText }}</b></div>
        <el-button
          v-if="canClaim"
          size="small"
          type="success"
          @click="claimReward"
        >领取前100奖励(每日)</el-button>
        <el-tag v-else size="small" type="info">排名100外无奖励</el-tag>
      </div>
      <div class="hb-hint">击败排名高于你的豪杰即可晋升；你会取代其名次，对方与后续豪杰顺延一位，不会从榜上消失。豪杰同样穿戴强化灵器，前排名次战力可超过境界标准。前100名每日可领奖励。</div>
      <div class="hb-list">
        <div v-for="h in board" :key="h.id" class="hb-row" :class="{ me: h.isPlayer }">
          <span class="hb-rank">{{ h.rank }}</span>
          <span class="hb-name2">{{ h.name }}</span>
          <span class="hb-lv">{{ h.realm }}</span>
          <el-tooltip
            v-if="!h.isPlayer"
            :content="`装备：${h.gear} +${h.strengthen}（${h.gradeName}）`"
            placement="top"
          >
            <span class="hb-power">{{ h.power.toLocaleString('zh-CN') }}</span>
          </el-tooltip>
          <span v-else class="hb-power">{{ h.power.toLocaleString('zh-CN') }}</span>
          <el-button
            v-if="!h.isPlayer && canChallenge(h.rank)"
            size="small"
            type="primary"
            @click="challenge(h)"
          >挑战</el-button>
          <span v-else-if="h.isPlayer" class="hb-me">我是</span>
        </div>
      </div>
    </div>

    <TurnCombat
      :visible="challengeShow"
      :enemy="targetEnemy"
      :award="false"
      hide-reward
      title="豪杰战 · 挑战更高名次"
      @update:visible="challengeShow = $event"
      @win="onWin"
      @lose="onLose"
      @flee="challengeShow = false"
    />
  </el-drawer>
</template>

<script setup>
  import { ref, computed } from 'vue'
  import { useMainStore } from '@/plugins/store'
  import {
    boardList,
    heroEnemy,
    canChallenge as canChallengeFn,
    applyWin,
    heroReward,
    initHero,
    playerSlot
  } from '@/plugins/heroBoard'
  import { gameNotifys } from '@/plugins/game'
  import TurnCombat from './TurnCombat.vue'

  const props = defineProps({ visible: Boolean })
  const emit = defineEmits(['update:visible'])
  const store = useMainStore()
  const player = store.player

  const challengeShow = ref(false)
  const targetEnemy = ref(null)
  const targetName = ref('')
  const targetRank = ref(0)

  initHero(player)
  const board = computed(() => boardList(player))
  const myRank = computed(() => playerSlot(player))
  const myRankText = computed(() => (myRank.value > 300 ? '未上榜' : `第 ${myRank.value} 名`))
  const reward = computed(() => heroReward(myRank.value))
  const canClaim = computed(() => {
    if (myRank.value > 100) return false
    return player.heroClaimDate !== new Date().toLocaleDateString('zh-CN')
  })

  const canChallenge = rank => canChallengeFn(player, rank)

  const challenge = h => {
    targetRank.value = h.rank
    targetName.value = h.name
    targetEnemy.value = heroEnemy(h.rank, h.name)
    challengeShow.value = true
  }

  const onWin = () => {
    challengeShow.value = false
    const res = applyWin(player, targetRank.value)
    if (!res.ok) {
      gameNotifys({ title: '豪杰战胜利', message: '名次未发生变化，请刷新后重试', type: 'warning' })
      return
    }
    gameNotifys({ title: '豪杰战胜利', message: `你击败了【${targetName.value}】，晋升至第 ${res.to} 名！`, type: 'success' })
  }
  const onLose = () => {
    challengeShow.value = false
    gameNotifys({ title: '豪杰战败北', message: `未能战胜【${targetName.value}】，名次未变`, type: 'error' })
  }

  const claimReward = () => {
    if (myRank.value > 100) return
    const r = heroReward(myRank.value)
    player.props.money += r.money
    player.props.cultivateDan += r.dan
    if (r.currency) player.props.currency += r.currency
    player.heroClaimDate = new Date().toLocaleDateString('zh-CN')
    gameNotifys({ title: '豪杰榜奖励', message: `领取成功：灵石 +${r.money}、培养丹 +${r.dan}${r.currency ? '、混沌石 +' + r.currency : ''}`, type: 'success' })
  }
</script>

<style scoped>
  .hb { display: flex; flex-direction: column; height: 100%; }
  .hb-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; gap: 8px; flex-wrap: wrap; }
  .hb-myrank { color: #e6a23c; font-size: 16px; }
  .hb-hint { font-size: 12px; color: var(--el-text-color-secondary); margin-bottom: 10px; line-height: 1.6; }
  .hb-list { flex: 1; overflow: auto; display: flex; flex-direction: column; gap: 4px; }
  .hb-row { display: flex; align-items: center; gap: 6px; padding: 5px 8px; border-bottom: 1px dashed var(--el-border-color-light); font-size: 13px; }
  .hb-row.me { background: var(--el-color-primary-light-9); border-radius: 6px; }
  .hb-rank { width: 32px; color: var(--el-text-color-secondary); font-weight: bold; }
  .hb-name2 { flex: 1; }
  .hb-lv { color: var(--el-text-color-secondary); font-size: 12px; }
  .hb-power { color: #b8860b; font-size: 12px; width: 70px; text-align: right; }
  .hb-me { color: #409eff; font-size: 12px; }
</style>
