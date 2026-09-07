<template>
  <div class="games">
    <div class="exchange-bar">
      <div class="exchange-info">
        <span>灵石：<b>{{ player.props.money }}</b></span>
        <span>筹码：<b>{{ player.props.chips }}</b></span>
      </div>
      <div class="exchange-ops">
        <span class="ex-label">买筹码（输入筹码数）</span>
        <el-input-number v-model="wantChips" :min="1" :max="Math.max(1, Math.floor(player.props.money / 10))" :step="10" />
        <span class="ex-result">需 {{ wantChips * 10 }} 灵石</span>
        <el-button @click="buyChips">兑换筹码</el-button>
        <span class="ex-label">卖筹码（输入筹码数）</span>
        <el-input-number v-model="sellChips" :min="1" :max="Math.max(1, player.props.chips)" :step="100" />
        <span class="ex-result">得 {{ Math.floor(sellChips * 9.5) }} 灵石</span>
        <el-button @click="sellChipsBack">筹码换回</el-button>
      </div>
      <div class="exchange-note">兑换比率：1 筹码 = 10 灵石；买筹码按提示支付灵石，卖回（收 5% 手续费）1 筹码 ≈ 9.5 灵石</div>
    </div>
    <el-tabs v-model="tabs">
      <el-tab-pane name="checkin" label="签到">
        <CheckIn @game-result="processGameResult" />
      </el-tab-pane>
      <el-tab-pane name="zhajinhua" label="炸金花">
        <ZhaJinHua @game-result="processGameResult" />
      </el-tab-pane>
      <el-tab-pane name="texas" label="德州扑克">
        <TexasPoker @game-result="processGameResult" />
      </el-tab-pane>
      <el-tab-pane name="doudizhu" label="斗地主">
        <DouDiZhu @game-result="processGameResult" />
      </el-tab-pane>
      <el-tab-pane name="chipshop" label="筹码商店">
        <ChipShop />
      </el-tab-pane>
      <el-tab-pane name="luck" label="每日气运">
        <LuckDraw />
      </el-tab-pane>
    </el-tabs>
    <div class="stats">
      <div class="attribute-box">
        <el-row>
          <el-col :span="12" class="attribute-col" v-for="(item, index) in attributeList" :key="index">
            <div class="el-statistic">
              <div class="el-statistic__head">{{ item.name }}</div>
              <div class="el-statistic__content">
                <span class="el-statistic__number">{{ formatNumberToChineseUnit(item.value) }}{{ item.unit }}</span>
              </div>
            </div>
          </el-col>
        </el-row>
      </div>
    </div>
  </div>
</template>

<script setup>
  import tag from '@/components/tag.vue'
  import CheckIn from './checkin.vue'
  import ZhaJinHua from './zhaJinHua.vue'
  import TexasPoker from './texasPoker.vue'
  import DouDiZhu from './douDizhu.vue'
  import ChipShop from './chipShop.vue'
  import LuckDraw from './luckDraw.vue'
  import { ref, computed, onMounted } from 'vue'
  import { useMainStore } from '@/plugins/store'
  import { formatNumberToChineseUnit, gameNotifys } from '@/plugins/game'

  const store = useMainStore()
  const tabs = ref('checkin')
  const player = ref(store.player)
  const wantChips = ref(10)
  const sellChips = ref(100)

  const attributeList = computed(() => {
    return [
      { name: '签到天数', unit: '天', value: player.value.checkinDays },
      { name: '拥有灵石', unit: '枚', value: player.value.props.money },
      { name: '持有筹码', unit: '枚', value: player.value.props.chips },
      { name: '胜利次数', unit: '次', value: player.value.gameWins },
      { name: '失败次数', unit: '次', value: player.value.gameLosses }
    ]
  })

  const processGameResult = result => {
    if (result.success) updatePlayerWins(result)
    else updatePlayerLosses(result)
  }

  const updatePlayerWins = result => {
    player.value.gameWins++
    const reward = result.reward
    if (reward) {
      if (typeof reward === 'object') {
        Object.entries(reward).forEach(([key, value]) => {
          player.value.props[key] += value
        })
      } else if (result.currency === 'chips') {
        player.value.props.chips += reward
      } else {
        player.value.props.money += reward
      }
    }
  }
  const updatePlayerLosses = result => {
    if (result.currency === 'chips') player.value.props.chips -= result.reward
    else player.value.props.money -= result.reward
    player.value.gameLosses++
  }
  const buyChips = () => {
    const want = wantChips.value
    const spend = want * 10
    if (want <= 0 || player.value.props.money < spend) {
      gameNotifys({ title: '兑换失败', message: '灵石不足' })
      return
    }
    player.value.props.money -= spend
    player.value.props.chips += want
    gameNotifys({ title: '兑换成功', message: `获得 ${want} 筹码` })
    wantChips.value = 10
  }
  const sellChipsBack = () => {
    if (sellChips.value <= 0 || player.value.props.chips < sellChips.value) {
      gameNotifys({ title: '兑换失败', message: '筹码不足' })
      return
    }
    const stones = Math.floor(sellChips.value * 9.5)
    player.value.props.chips -= sellChips.value
    player.value.props.money += stones
    gameNotifys({ title: '兑换成功', message: `获得 ${stones} 灵石` })
    sellChips.value = 100
  }
  const checkDailyReset = () => {
    const now = new Date()
    const lastCheckinDate = new Date(player.value.lastCheckinDate)
    if (now.toDateString() !== lastCheckinDate.toDateString()) player.value.checkedInToday = false
  }

  onMounted(() => {
    checkDailyReset()
  })
</script>

<style scoped>
  .game-container {
    border-radius: 12px;
    margin-bottom: 20px;
  }

  .attribute-box {
    margin-bottom: 10px;
  }

  .attribute-col {
    margin-top: 10px;
  }

  .attribute-label {
    margin: 15px 0;
    width: 40%;
  }

  .exchange-bar {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    margin-bottom: 16px;
    padding: 12px;
    border-radius: 12px;
    background: var(--el-bg-color);
    box-shadow: var(--el-box-shadow-light);
  }

  .exchange-info {
    display: flex;
    gap: 20px;
    font-size: 14px;
    color: #606266;
  }

  .exchange-ops {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: center;
    align-items: center;
  }

  .ex-label {
    font-size: 13px;
    color: #606266;
  }

  .ex-result {
    font-size: 13px;
    color: #e6a23c;
    font-weight: bold;
  }

  .exchange-note {
    font-size: 12px;
    color: #909399;
  }
</style>
