<template>
  <div class="check-in">
    <div class="check-in-calendar">
      <div
        v-for="day in 7"
        :key="day"
        class="day-box"
        :class="{ checked: isCheckedIn(day), current: isCurrentDay(day) }"
      >
        <span class="day-number">{{ day }}</span>
        <span class="reward">{{ getReward(day) }}</span>
      </div>
    </div>
    <el-button @click="checkIn" :disabled="!canCheckIn" class="check-in-button">
      {{ canCheckIn ? '签到' : '今日已签到' }}
    </el-button>
    <p class="streak-info">当前连续签到: {{ player.checkinStreak }}天</p>
  </div>
</template>

<script setup>
  import { ref, computed } from 'vue'
  import { useMainStore } from '@/plugins/store'
  import { gameNotifys } from '@/plugins/game'

  const store = useMainStore()

  const player = ref(store.player)

  const emit = defineEmits(['game-result'])

  const canCheckIn = computed(() => {
    const now = new Date()
    const lastCheckin = new Date(player.value.lastCheckinDate)
    return !player.value.lastCheckinDate || now.toDateString() !== lastCheckin.toDateString()
  })

  const isCheckedIn = day => {
    return day <= player.value.checkinStreak % 7
  }

  const isCurrentDay = day => {
    return day === (player.value.checkinStreak % 7) + 1
  }

  const getReward = day => {
    return day * 100 // 每日筹码奖励
  }

  const checkIn = () => {
    if (!canCheckIn.value) return
    const dayInStreak = (player.value.checkinStreak % 7) + 1
    player.value.checkinStreak++
    player.value.checkinDays++
    player.value.lastCheckinDate = new Date().toISOString()
    const chipReward = dayInStreak * 100 // 1 筹码 = 10 灵石，等价换算
    emit('game-result', { success: true, reward: chipReward, currency: 'chips' })
    gameNotifys({ title: '签到成功', message: `获得 ${chipReward} 筹码！` })
  }
</script>

<style scoped>
  .check-in {
    padding: 20px;
    background-color: var(--el-bg-color);
    border-radius: 12px;
    color: var(--el-text-color-primary);
  }

  h3 {
    color: var(--el-text-color-primary);
  }

  .check-in-calendar {
    display: flex;
    overflow: auto;
    justify-content: center;
  }

  .day-box {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    background-color: var(--el-fill-color-light);
    font-size: 14px;
    transition: all 0.3s ease;
    color: var(--el-text-color-primary);
    margin-left: 10px;
  }

  .day-box.checked {
    background-color: var(--el-color-success);
    color: var(--el-color-white);
  }

  .day-box.current {
    border: 2px solid var(--el-color-primary);
  }

  .day-number {
    font-weight: bold;
  }

  .reward {
    font-size: 12px;
  }

  .check-in-button {
    width: 100%;
    margin-top: 20px;
    background-color: var(--el-color-primary);
    color: var(--el-color-white);
    border: none;
    padding: 12px;
    border-radius: 8px;
    font-size: 16px;
    transition: all 0.3s ease;
  }

  .check-in-button:disabled {
    background-color: var(--el-button-disabled-bg-color);
    color: var(--el-button-disabled-text-color);
  }

  .streak-info,
  .next-bonus {
    margin-top: 10px;
    font-size: 14px;
    color: var(--el-text-color-secondary);
  }

  @media only screen and (max-width: 768px) {
    .check-in-calendar {
      display: -webkit-box;
    }
  }
</style>
