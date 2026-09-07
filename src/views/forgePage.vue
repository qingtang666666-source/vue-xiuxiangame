<template>
  <div class="forge">
    <div class="forge-header">
      <div class="title">
        炼器 · <span class="realm" v-text="levelNames(player.level)" />
      </div>
      <div class="resources">
        <el-tag v-for="res in resourceList" :key="res.key" :type="res.type" effect="plain" class="res-tag">
          {{ res.name }}: {{ formatNumberToChineseUnit(res.value) }}
        </el-tag>
      </div>
    </div>

    <div class="form">
      <div class="field">
        <div class="label">装备类型</div>
        <el-radio-group v-model="opts.type" size="small">
          <el-radio-button v-for="t in FORGE_TYPES" :key="t.key" :value="t.key">{{ t.name }}</el-radio-button>
        </el-radio-group>
      </div>

      <div class="field">
        <div class="label">品阶</div>
        <el-select v-model="opts.quality" size="small" class="quality-select">
          <el-option
            v-for="q in FORGE_QUALITIES"
            :key="q.key"
            :label="q.name + '（需 ' + levelNames(q.minLevel) + '）'"
            :value="q.key"
            :disabled="player.level < q.minLevel"
          />
        </el-select>
      </div>

      <div class="field">
        <div class="label">细分级</div>
        <el-radio-group v-model="opts.grade" size="small">
          <el-radio-button v-for="(g, i) in gradeNames" :key="i" :value="i + 1">{{ g }}</el-radio-button>
        </el-radio-group>
      </div>

      <div class="field">
        <div class="label">炼制等级</div>
        <el-input-number v-model="opts.level" :min="1" :max="maxLevel" size="small" />
      </div>

      <div class="field">
        <div class="label">指定词条（可选）</div>
        <el-select v-model="opts.affixChoice" size="small" clearable placeholder="不指定则随机" class="affix-select">
          <el-option v-for="a in AFFIX_OPTIONS" :key="a.key" :label="a.name" :value="a.key" />
        </el-select>
      </div>

      <div class="field">
        <div class="label">精炼（多一重词条）</div>
        <el-switch v-model="opts.refine" size="small" />
      </div>
    </div>

    <div class="preview">
      <div class="section-title">预估产出</div>
      <div class="preview-grid">
        <div class="preview-item">攻击 ≈ {{ preview.attack }}</div>
        <div class="preview-item">防御 ≈ {{ preview.defense }}</div>
        <div class="preview-item">气血 ≈ {{ preview.health }}</div>
        <div class="preview-item">暴击 ≈ {{ (preview.critical * 100).toFixed(1) }}%</div>
        <div class="preview-item">闪避 ≈ {{ (preview.dodge * 100).toFixed(1) }}%</div>
      </div>
    </div>

    <div class="cost">
      <div class="section-title">所需材料</div>
      <div class="cost-tags">
        <el-tag type="danger">炼器石 {{ cost.stone }}</el-tag>
        <el-tag type="warning">灵石 {{ formatNumberToChineseUnit(cost.money) }}</el-tag>
        <el-tag type="success" v-if="cost.herb">灵草 {{ cost.herb }}</el-tag>
        <el-tag type="primary" v-if="cost.dan">培养丹 {{ cost.dan }}</el-tag>
        <el-tag type="danger" v-if="cost.material && cost.material.key">核心矿材 {{ matNameOf(cost.material.key) }}×{{ cost.material.qty }}</el-tag>
      </div>
    </div>

    <div class="actions">
      <el-button type="primary" @click="craft" :disabled="!canCraft">开始炼器</el-button>
    </div>

    <div v-if="crafting" class="crafting-bar">
      正在打造装备...
      <el-button size="small" type="primary" @click="skipCraft">跳 过</el-button>
      <el-button size="small" @click="cancelCraft">取消</el-button>
    </div>

    <div class="last-craft" v-if="lastEquipment">
      <div class="section-title">刚炼制出的装备</div>
      <tag :type="lastEquipment.quality" class="last-tag">
        {{ lastEquipment.name }} · {{ lastEquipment.gradeName }} · +{{ lastEquipment.strengthen }}
      </tag>
      <div class="last-cells">
        <span>攻击 {{ formatNumberToChineseUnit(lastEquipment.attack) }}</span>
        <span>防御 {{ formatNumberToChineseUnit(lastEquipment.defense) }}</span>
        <span>气血 {{ formatNumberToChineseUnit(lastEquipment.health) }}</span>
      </div>
    </div>

    <div class="actions">
    </div>
  </div>
</template>

<script setup>
  import { ref, computed, reactive } from 'vue'
  import { useRouter } from 'vue-router'
  import { useMainStore } from '@/plugins/store'
  import { formatNumberToChineseUnit, levelNames, gradeNames, gameNotifys } from '@/plugins/game'
  import { FORGE_TYPES, FORGE_QUALITIES, forgeCost, canForge } from '@/plugins/forge'
  import { beginAction, actionTask, finishNow, cancelAction } from '@/plugins/actionTimer'
  import { STAT_AFFIXES, EFFECT_AFFIXES } from '@/plugins/affix'
  import { matNameOf } from '@/plugins/materialDb'

  const store = useMainStore()
  const router = useRouter()
  const player = ref(store.player)
  const lastEquipment = computed(() => player.value.lastforge || null)

  const maxLevel = computed(() => Math.max(1, player.value.level))
  const opts = reactive({
    type: 'weapon',
    quality: 'info',
    grade: 1,
    level: 1,
    affixChoice: '',
    refine: false
  })

  // 修正等级，避免超出上限
  if (opts.level > maxLevel.value) opts.level = maxLevel.value

  const AFFIX_OPTIONS = [...STAT_AFFIXES, ...EFFECT_AFFIXES].map(a => ({ key: a.key, name: a.name }))

  const resourceList = computed(() => {
    const p = player.value.props || {}
    return [
      { key: 'strengtheningStone', name: '炼器石', value: p.strengtheningStone || 0, type: 'danger' },
      { key: 'money', name: '灵石', value: p.money || 0, type: 'warning' },
      { key: 'spiritHerb', name: '灵草', value: p.spiritHerb || 0, type: 'success' },
      { key: 'cultivateDan', name: '培养丹', value: p.cultivateDan || 0, type: 'primary' }
    ]
  })

  const cost = computed(() => forgeCost(opts, player.value))
  const canCraft = computed(() => canForge(player.value, opts).ok)
  const crafting = computed(() => !!actionTask(player.value))

  // 预估基础值（取随机范围的均值）
  const preview = computed(() => {
    const mul = QUALITY_MULT[opts.quality] * (gradeMultiplier[opts.grade - 1] || 1)
    const isCombat = ['weapon', 'accessory', 'sutra'].includes(opts.type)
    const isDef = ['armor', 'accessory', 'sutra'].includes(opts.type)
    const crit = ['accessory', 'sutra'].includes(opts.type) ? 0.03 : isCombat ? 0.03 : 0
    return {
      attack: isCombat ? Math.floor(30 * opts.level * mul) : 0,
      defense: isDef ? Math.floor(30 * opts.level * mul) : 0,
      health: isDef ? Math.floor(300 * opts.level * mul) : 0,
      critical: crit,
      dodge: ['accessory', 'sutra'].includes(opts.type) ? 0.03 : 0
    }
  })

  const QUALITY_MULT = {
    info: 1.2,
    success: 2,
    primary: 3.2,
    purple: 5,
    pink: 6.5,
    warning: 8.5,
    danger: 11,
    cyan: 14,
    orange: 18,
    gold: 23,
    legendary: 30
  }
  const gradeMultiplier = [1, 1.15, 1.35, 1.6, 2]

  const craft = () => {
    if (actionTask(player.value)) {
      gameNotifys({ title: '炼器中', message: '请等待当前打造完成或点击跳过', type: 'info' })
      return
    }
    if (!canForge(player.value, opts).ok) {
      gameNotifys({ title: '炼器失败', message: canForge(player.value, opts).reason, type: 'error' })
      return
    }
    const qi = FORGE_QUALITIES.findIndex(q => q.key === opts.quality)
    const data = { ...opts, qi, name: `${FORGE_QUALITIES[qi]?.name || '凡品'}${opts.type}` }
    const res = beginAction(player.value, { kind: 'craft-equip', data, name: data.name, can: () => canForge(player.value, opts) })
    if (res.ok) gameNotifys({ title: '炼器', message: `开始打造【${data.name}】，约 ${Math.round(res.duration / 1000)}s`, type: 'info' })
    else gameNotifys({ title: '炼器', message: res.reason, type: 'error' })
  }

  const skipCraft = () => {
    const out = finishNow(player.value)
    if (out) gameNotifys({ title: '工坊', message: out.message, type: out.type })
  }

  const cancelCraft = () => {
    if (cancelAction(player.value)) gameNotifys({ title: '工坊', message: '已取消当前打造', type: 'info' })
  }
</script>

<style scoped>
  .forge {
    text-align: left;
    padding: 0 4px;
  }

  .forge-header {
    margin-bottom: 12px;
  }

  .title {
    font-size: 22px;
    font-weight: bold;
    margin-bottom: 10px;
  }

  .realm {
    color: var(--el-color-primary);
  }

  .resources {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .res-tag {
    font-size: 13px;
  }

  .form {
    background: var(--el-fill-color-light);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 6px;
    padding: 12px;
    margin-bottom: 12px;
  }

  .field {
    margin-bottom: 12px;
  }

  .field:last-child {
    margin-bottom: 0;
  }

  .label {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    margin-bottom: 6px;
  }

  .quality-select,
  .affix-select {
    width: 100%;
  }

  .section-title {
    font-size: 15px;
    font-weight: bold;
    margin: 12px 0 8px;
  }

  .preview-grid,
  .cost-tags,
  .last-cells {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .preview-item {
    background: var(--el-fill-color-light);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 4px;
    padding: 4px 10px;
    font-size: 13px;
  }

  .actions {
    margin-top: 16px;
    display: flex;
    justify-content: center;
  }

  .crafting-bar {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    background: var(--el-fill-color-light);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 6px;
    padding: 8px 12px;
    margin-top: 12px;
    font-size: 13px;
  }

  .last-craft {
    margin-top: 8px;
    background: var(--el-fill-color-light);
    border-radius: 6px;
    padding: 8px 12px;
  }

  .last-tag {
    margin-bottom: 8px;
  }

  .last-cells span {
    font-size: 13px;
    margin-right: 12px;
  }

  @media only screen and (min-width: 1100px) {
    .form {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0 18px;
    }
    .form .field {
      margin-bottom: 10px;
    }
    .preview-grid,
    .cost-tags {
      display: flex;
    }
  }

  @media only screen and (max-width: 768px) {
    .form {
      padding: 10px;
    }
    .field {
      margin-bottom: 8px;
    }
    .preview-grid,
    .cost-tags {
      gap: 6px;
    }
    .preview-item {
      padding: 3px 8px;
      font-size: 12px;
    }
    .last-cells span {
      display: inline-block;
      margin: 0 8px 4px 0;
    }
  }
</style>
