<template>
  <div class="attributes">
    <div class="attribute-box">
      <div class="tag attribute">气血: {{ formatNumberToChineseUnit(strengthenInfo.health) }}</div>
      <div class="tag attribute">攻击: {{ formatNumberToChineseUnit(strengthenInfo.attack) }}</div>
      <div class="tag attribute">防御: {{ formatNumberToChineseUnit(strengthenInfo.defense) }}</div>
      <div class="tag attribute">
        暴击率:
        {{
          strengthenInfo?.critical > 0
            ? strengthenInfo?.critical * 100 > 100
              ? 100
              : (strengthenInfo?.critical * 100).toFixed(2)
            : 0
        }}%
      </div>
      <div class="tag attribute">
        闪避率:
        {{
          strengthenInfo.dodge > 0
            ? strengthenInfo.dodge * 100 > 100
              ? 100
              : (strengthenInfo.dodge * 100).toFixed(2)
            : 0
        }}%
      </div>
      <div class="tag attribute">强化等级: {{ strengthenInfo.strengthen ?? 0 }}</div>
      <div class="tag attribute">精炼等级: {{ strengthenInfo.refine ?? 0 }}</div>
      <div class="tag attribute">装备评分: {{ Math.round(strengthenInfo.score || 0).toLocaleString('zh-CN') }}</div>
      <div class="tag attribute" v-if="strengthenInfo.gradeName">品阶细分: {{ strengthenInfo.gradeName }}</div>
      <div class="tag attribute" v-if="setInfo" :style="{ width: '100%' }">
        专属套装: {{ setInfo.name }} · 已穿 {{ setInfo.count }}/4 件
      </div>
      <div class="tag attribute" v-if="setInfo && setInfo.count >= 2" :style="{ width: '100%' }">
        套装加成: {{ setBonusText }}
      </div>
      <div class="tag attribute affix line" v-for="(affix, idx) in (strengthenInfo.affixes || [])" :key="idx">
        <span v-if="affix.type === 'stat'">{{ affix.name }}+{{ formatNumberToChineseUnit(affix.value) }}</span>
        <span v-else>{{ affix.name }}({{ Math.round((affix.triggerChance || 0) * 100) }}%)</span>
      </div>
      <div
        class="tag attribute"
        @click="
          gameNotifys({
            title: '获得方式',
            message: '分解装备可获取',
            position: 'top-left'
          })
        "
        v-if="calculateCost"
      >
        拥有炼器石:
        {{ formatNumberToChineseUnit(player.props.strengtheningStone) }}
      </div>
      <div class="tag attribute" v-if="calculateCost">{{ actionLabel || '强化' }}消耗: {{ calculateCost }}</div>
      <div class="tag attribute" v-if="calculateEnhanceSuccessRate">
        {{ actionLabel || '强化' }}成功率: {{ (calculateEnhanceSuccessRate * 100).toFixed(2) }}%
      </div>
    </div>
  </div>
</template>

<script setup>
  import { formatNumberToChineseUnit, gameNotifys } from '@/plugins/game'
  import { computed, defineProps, defineOptions } from 'vue'
  import { setById, setBonusOf } from '@/plugins/equipSetDb'

  // 定义组件名称
  defineOptions({
    name: 'weapon-tooltip'
  })

  // 定义props
  const props = defineProps({
    calculateCost: {},
    calculateEnhanceSuccessRate: {},
    actionLabel: { type: String, default: '强化' },
    player: {},
    strengthenInfo: {}
  })

  const setInfo = computed(() => {
    const info = props.strengthenInfo || {}
    if (!info.setId) return null
    const set = setById(info.setId)
    const count = Object.values(props.player?.equipment || {}).filter(s => s && s.setId === info.setId).length
    return { name: info.setName || set?.name || '', count, bonus: setBonusOf(set, count) }
  })
  const setBonusText = computed(() => {
    const b = setInfo.value?.bonus || {}
    const p = []
    if (b.attack) p.push(`攻击+${Math.round(b.attack)}`)
    if (b.defense) p.push(`防御+${Math.round(b.defense)}`)
    if (b.health) p.push(`气血+${Math.round(b.health)}`)
    if (b.critical) p.push(`暴击+${(b.critical * 100).toFixed(1)}%`)
    if (b.dodge) p.push(`闪避+${(b.dodge * 100).toFixed(1)}%`)
    if (b.cultivationSpeed) p.push(`修速+${b.cultivationSpeed.toFixed(2)}`)
    if (b.effectBoost) p.push(`特效+${(b.effectBoost * 100).toFixed(1)}%`)
    return p.join('，')
  })
</script>
<style scoped>
  .attribute {
    width: calc(50% - 8px);
    margin: 4px;
    overflow: auto hidden;
    min-width: 0;
  }

  .attributes,
  .attribute-box {
    width: 100%;
  }

  .attribute-box .tag {
    white-space: normal;
    word-break: break-word;
    overflow-wrap: anywhere;
  }

  .attribute-box {
    display: flex;
    flex-wrap: wrap;
  }

  .affix {
    width: 100%;
    color: var(--el-color-warning);
    white-space: normal;
    word-break: break-word;
  }

  /* 炼器弹窗 */

  .click-box button {
    margin-top: 10px;
    width: 100%;
  }

  /* 装备信息 */

  .collapse p,
  .monsterinfo-box p {
    display: contents;
  }

  /* 基础属性对比 */

  /* 属性对比 */

  /* 新手弹窗 */

  .newbieinfo-box p {
    margin-bottom: 10px;
  }

  @media only screen and (max-width: 768px) {
  }
</style>
<style>
  @media only screen and (max-width: 768px) {
    /* 新手弹窗 */
  }

  /* 上传按钮 */
</style>
