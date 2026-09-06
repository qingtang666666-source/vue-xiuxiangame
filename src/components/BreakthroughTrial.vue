<template>
  <TurnCombat
    :visible="visible && !!enemy"
    :enemy="enemy"
    :award="false"
    hide-reward
    :title="`突破试炼 ${round}/2 · 击败同阶对手`"
    @update:visible="v => emit('update:visible', v)"
    @win="onWin"
    @lose="onLose"
    @flee="emit('update:visible', false)"
  />
</template>

<script setup>
  import { ref, computed, watch } from 'vue'
  import TurnCombat from './TurnCombat.vue'
  import { buildEnemies } from '@/plugins/battleEngine'
  import { isTribulationLevel } from '@/plugins/tribulation'
  import { realmStageOf } from '@/plugins/game'
  import { useMainStore } from '@/plugins/store'

  const props = defineProps({ visible: Boolean })
  const emit = defineEmits(['update:visible', 'success', 'fail'])
  const store = useMainStore()
  const player = store.player

  const round = ref(1)
  const enemies = ref([])
  const enemy = computed(() => enemies.value[round.value - 1] || null)

  // 生成 2 名同阶对手：按境界基准值(monster表)生成，略强(+2级)，不随玩家属性缩放
  const spawn = () => {
    const list = buildEnemies(player, { count: 2, levelOffset: 2, reincarnation: player.reincarnation || 0 })
    enemies.value = list.map(e => ({
      name: e.name,
      level: e.level,
      health: e.maxHp,
      maxHp: e.maxHp,
      hp: e.maxHp,
      attack: e.atk,
      defense: e.def,
      critical: e.crit,
      dodge: e.dodge
    }))
    round.value = 1
  }

  watch(
    () => props.visible,
    v => {
      if (v) spawn()
    }
  )

  const onWin = () => {
    if (round.value >= 2) {
      // 第三重门槛：渡劫/雷罚 —— 按突破境界造成气血百分比伤害，抗住才成功
      const nextLv = player.level + 1
      if (!isTribulationLevel(nextLv)) {
        const stage = realmStageOf(nextLv)
        const hp = Math.max(1000, player.maxHealth || 1000)
        const pct = Math.min(1.2, 0.3 + stage * 0.055)
        const defMit = Math.min(0.6, (player.defense || 0) / (hp * 0.08 + 1))
        const dmg = Math.max(1, Math.floor(hp * pct * (1 - defMit)))
        player.health -= dmg
        if (player.health > 0) {
          emit('update:visible', false)
          emit('success')
        } else {
          player.health = Math.max(1, player.health)
          emit('update:visible', false)
          emit('fail')
        }
      } else {
        // 天劫节点：已有“渡劫”按钮单独处理（并给劫后加成），此处直接通过
        emit('update:visible', false)
        emit('success')
      }
    } else {
      round.value++
    }
  }
  const onLose = () => {
    emit('update:visible', false)
    emit('fail')
  }
</script>
