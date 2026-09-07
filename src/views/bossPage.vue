<template>
  <div class="cultivate">
    <div class="boss">
      <div class="boss-box">
        <span class="el-tag el-tag--warning" @click="openBossInfo">{{ store.boss.name }}</span>
        <el-tag v-if="bossSup" :type="bossSup > 0 ? 'danger' : bossSup < 0 ? 'warning' : 'info'" size="small" effect="plain" class="sup-tag">
          境界压制：你攻{{ store.boss.name }} {{ realmSuppressionLabel(bossSup) }} · {{ store.boss.name }}攻你 {{ realmSuppressionLabel(bossEnemySup) }}
        </el-tag>
        <el-alert class="desc" :title="store.boss.desc" :closable="false" type="error" />
      </div>
    </div>
    <div class="storyText">
      <div class="storyText-box">
        <el-scrollbar ref="scrollbar" always>
          <p class="fighting" v-if="isFighting" v-text="`${guashaRounds}回合 / 50回合`" />
          <p v-for="(item, index) in texts" :key="index" v-html="item" @click="openEquipmentInfo(equipmentInfo)" />
        </el-scrollbar>
      </div>
    </div>
    <div class="actions">
      <el-button @click="startFightBoss" :disabled="isEnd">发起战斗</el-button>
      <el-button @click="router.push('/home')">回家疗伤</el-button>
    </div>
  </div>
  <TurnCombat
    :visible="bossShow"
    :enemy="store.boss"
    :award="false"
    title="世界BOSS战"
    @update:visible="bossShow = $event"
    @win="onBossWin"
    @lose="onBossLose"
    @flee="bossShow = false"
  />
</template>

<script setup>
  import boss from '@/plugins/boss'
  import { worldBossEnemy } from '@/plugins/enemyScale'
  import TurnCombat from '@/components/TurnCombat.vue'
  import { aggregatePlayerEffects, resolveHitEffects, applyDotDamage, applyLifesteal, isStunned, clearStun } from '@/plugins/effectCombat'
  import { effectivePlayerStats, effectiveBackpackCap } from '@/plugins/setBonus'
  import { methodStats } from '@/plugins/technique'
  import { resolvePlayerFoeRound } from '@/plugins/battle'
  import { realmSuppressionMult, realmSuppressionPct, realmSuppressionLabel } from '@/plugins/game'
  import { useRouter } from 'vue-router'
  import { ref, computed, onUnmounted, onMounted } from 'vue'
  import { useMainStore } from '@/plugins/store'
  import { ElMessageBox } from 'element-plus'
  import { maxLv, levelNames, formatNumberToChineseUnit, genre, levels, smoothScrollToBottom } from '@/plugins/game'

  const router = useRouter()
  const store = useMainStore()
  const isEnd = ref(false)
  const texts = ref([])
  const player = ref(store.player)
  const bossSup = computed(() => realmSuppressionPct(player.value.level, store.boss.level))
  const bossEnemySup = computed(() => realmSuppressionPct(store.boss.level, player.value.level))
  const timerIds = ref([])
  const currency = ref(boss.getRandomInt(1, 10))
  const isFighting = ref(false)
  const startFight = ref(false)
  const isequipment = ref(false)
  const bossShow = ref(false)
  const guashaRounds = ref(50)
  const equipmentInfo = ref({})
  const scrollbar = ref(null)

  // 开始攻击
  const startFightBoss = () => {
    if (isEnd.value) return
    if (player.value.level < maxLv) {
      isEnd.value = true
      texts.value.push(`你的境界尚未达到${levelNames(maxLv)}, ${store.boss.name}对于你的挑战不屑一顾`)
      return
    }
    if (store.boss.health <= 0 || !store.boss.health) {
      texts.value.push('BOSS刷新时间还未到')
      return
    }
    bossShow.value = true
  }

  // 回合制 BOSS 战结算
  const onBossWin = () => {
    bossShow.value = false
    isEnd.value = true
    stopFightBoss()
    isFighting.value = true
    isEnd.value = true
    store.boss.health = 0
    player.value.bossKills = (player.value.bossKills || 0) + 1
    const equipItem = boss.boss_Equip(maxLv)
    isequipment.value = true
    equipmentInfo.value = equipItem
    texts.value.push(
      `你击败${store.boss.name}后，获得了<span class="el-tag el-tag--${equipItem.quality}">${
        levels[equipItem.quality]
      }${equipItem.name}(${genre[equipItem.type]})</span>`
    )
    if (player.value.inventory.length >= effectiveBackpackCap(player.value))
      texts.value.push(`当前装备背包容量已满, 该装备自动丢弃, 转生可增加背包容量`)
    else player.value.inventory.push(equipItem)
    player.value.props.rootBone += 1
    texts.value.push('你获得了1颗悟性丹')
    player.value.props.currency += currency.value
    texts.value.push(`你获得了${currency.value}块混沌石`)
  }
  const onBossLose = () => {
    bossShow.value = false
    isEnd.value = true
    isFighting.value = true
    texts.value.push('你被BOSS击败了。')
  }

  // 停止攻击
  const stopFightBoss = () => {
    timerIds.value.forEach(id => clearInterval(id))
    timerIds.value = []
  }

  // boss信息
  const openBossInfo = () => {
    const info = store.boss
    ElMessageBox.confirm('', info.name, {
      center: true,
      message: `<div class="monsterinfo">
      <div class="monsterinfo-box">
      <p>境界: ${levelNames(info.level)}</p>
      <p>气血: ${formatNumberToChineseUnit(info.health)}</p>
      <p>攻击: ${formatNumberToChineseUnit(info.attack)}</p>
      <p>防御: ${formatNumberToChineseUnit(info.defense)}</p>
      <p>闪避率: ${info.dodge > 0 ? (info.dodge * 100 > 100 ? 100 : (info.dodge * 100).toFixed(2)) : 0}%</p>
      <p>暴击率: ${info.critical > 0 ? (info.critical * 100 > 100 ? 100 : (info.critical * 100).toFixed(2)) : 0}%</p>
      <p>混沌石掉落: ${currency.value}块</p>
      <p>神装掉落率: 100%</p>
      </div>
    </div>`,
      showCancelButton: false,
      confirmButtonText: '知道了',
      dangerouslyUseHTMLString: true
    }).catch(() => {})
  }

  // 攻击世界boss
  const fightBoss = () => {
    if (player.value.level < maxLv) {
      isEnd.value = true
      stopFightBoss()
      texts.value.push(`你的境界尚未达到${levelNames(maxLv)}, ${store.boss.name}对于你的挑战不屑一顾`)
      return
    }
    if (store.boss.health <= 0 || !store.boss.health) {
      texts.value.push('BOSS刷新时间还未到')
      return
    }
    isFighting.value = true
    const r = resolvePlayerFoeRound(player.value, store.boss)
    const isPlayerHit = r.isPlayerHit
    const isBHit = r.isFoeHit
    const isCritical = r.isCritical
    const isMCritical = r.isMCritical
    const playerHarm = r.playerHarm
    const monsterHarm = r.monsterHarm
    if (r.dotDamage > 0) texts.value.push(`持续伤害使${store.boss.name}流失${r.dotDamage}气血`)
    r.logs.forEach(t => texts.value.push(t))
    r.effectLogs.forEach(log => texts.value.push(`${store.boss.name}${log}`))
    if (r.lifesteal > 0) texts.value.push(`你从${store.boss.name}处吸取了${r.lifesteal}气血`)
    player.value.health = Math.max(0, player.value.health)
    store.boss.health = Math.max(0, store.boss.health)
    if (guashaRounds.value > 1) {
      // 扣除回合数
      guashaRounds.value--
      // boss气血小于等于0
      if (store.boss.health <= 0) {
        player.value.bossKills = (player.value.bossKills || 0) + 1
        const equipItem = boss.boss_Equip(maxLv)
        isequipment.value = true
        equipmentInfo.value = equipItem
        texts.value.push(
          `你击败${store.boss.name}后，获得了<span class="el-tag el-tag--${equipItem.quality}">${
            levels[equipItem.quality]
          }${equipItem.name}(${genre[equipItem.type]})</span>`
        )
        // 如果装备背包当前容量大于等于背包总容量
        if (player.value.inventory.length >= effectiveBackpackCap(player.value))
          texts.value.push(`当前装备背包容量已满, 该装备自动丢弃, 转生可增加背包容量`)
        // 玩家获得道具
        else player.value.inventory.push(equipItem)
        // 增加悟性丹
        player.value.props.rootBone += 1
        // 获得悟性丹通知
        texts.value.push('你获得了1颗悟性丹')
        // 增加混沌石
        player.value.props.currency += currency.value
        // 获得混沌石通知
        texts.value.push(`你获得了${currency.value}块混沌石`)
        // 修改按钮状态
        isEnd.value = true
        // 修改boss状态
        store.boss.time = Math.floor(Date.now() / 1000)
        store.boss.health = 0
        store.boss.conquer = true
        stopFightBoss()
      } else if (player.value.health <= 0) {
        isEnd.value = true
        // 恢复boss血量
        store.boss.health = store.boss.maxhealth
        texts.value.push('你因为太弱被击败了。')
        texts.value.push(`${store.boss.text}`)
        stopFightBoss()
        guashaRounds.value = 50
      } else {
        texts.value.push(
          isPlayerHit
            ? `你攻击了${store.boss.name}，${isCritical ? '触发暴击' : ''}造成了${playerHarm}点伤害，剩余${
                store.boss.health
              }气血。`
            : `你攻击了${store.boss.name}，对方闪避了你的攻击，你未造成伤害，剩余${store.boss.health}气血。 `
        )
        texts.value.push(
          isBHit
            ? `${store.boss.name}攻击了你，${isMCritical ? '触发暴击' : ''}造成了${monsterHarm}点伤害`
            : `${store.boss.name}攻击了你，你闪避了对方的攻击，对方未造成伤害，你剩余${player.value.health}气血。 `
        )
      }
    } else {
      // 恢复默认回合数
      guashaRounds.value = 50
      stopFightBoss()
      // 恢复boss血量
      store.boss.health = store.boss.maxhealth
      texts.value.push(`回合结束, 你未战胜${store.boss.name}你输了。`)
      texts.value.push(`${store.boss.text}`)
    }
  }

  const openEquipmentInfo = item => {
    if (!isequipment.value) return
    ElMessageBox.confirm('', item.name, {
      center: true,
      message: `<div class="monsterinfo">
      <div class="monsterinfo-box">
        <p>类型: ${genre[item.type] ?? '未知'}</p>
        <p>境界: ${levelNames(item.level)}</p>
        <p>品质: ${levels[item.quality] ?? '未知'}</p>
        <p>气血: ${formatNumberToChineseUnit(item.health)}</p>
        <p>攻击: ${formatNumberToChineseUnit(item.attack)}</p>
        <p>防御: ${formatNumberToChineseUnit(item.defense)}</p>
        <p>闪避率: ${(item.dodge * 100).toFixed(2) ?? 0}%</p>
        <p>暴击率: ${(item.critical * 100).toFixed(2) ?? 0}%</p>
        </div>
    </div>`,
      showClose: false,
      closeOnClickModal: false,
      closeOnPressEscape: false,
      dangerouslyUseHTMLString: true,
      showCancelButton: false,
      confirmButtonText: '知道了'
    })
      .then(() => {
        router.push('/home')
      })
      .catch(() => {
        router.push('/home')
      })
  }

  // 世界BOSS
  const assaultBoss = () => {
    // boss生成的时间
    const time = getMinuteDifference(store.boss.time)
    // boss难度根据玩家最高等级 + 转生次数
    const bossLv = maxLv * player.value.reincarnation + maxLv
    // 检查boss的血量和时间
    if (store.boss.health > 0) {
      // 如果boss还有血量，允许玩家挑战
      if (time >= 5) {
        // boss没有血量但时间大于等于5分钟，重新生成boss
        store.boss = worldBossEnemy(player.value, { reincarnation: player.value.reincarnation || 0 })
      }
      // 如果boss没有血量
    } else {
      if (time >= 5 || store.boss.time == 0) {
        // boss没有血量但时间大于等于5分钟，重新生成boss
        store.boss = worldBossEnemy(player.value, { reincarnation: player.value.reincarnation || 0 })
      } else {
        isEnd.value = true
        texts.value.push('BOSS还未刷新，请等待5分钟后再次挑战')
        return
      }
    }
    //更新回合数
    guashaRounds.value = 50
  }

  // 计算当前时间和指定时间相差多少分钟
  const getMinuteDifference = specifiedTimestamp => {
    // 获取当前时间戳（秒数）
    const currentTimestamp = Math.floor(Date.now() / 1000)
    specifiedTimestamp = specifiedTimestamp == 0 ? currentTimestamp : specifiedTimestamp
    // 计算时间差（分钟数）
    const timeDifferenceInSeconds = Math.abs(currentTimestamp - specifiedTimestamp)
    const timeDifferenceInMinutes = Math.floor(timeDifferenceInSeconds / 60)
    return timeDifferenceInMinutes
  }

  onMounted(() => {
    assaultBoss()
  })

  onUnmounted(() => {
    stopFightBoss()
  })
</script>

<style scoped>
  .boss-box .desc {
    margin: 10px 0;
  }

  .sup-tag {
    margin-left: 8px;
  }
</style>
