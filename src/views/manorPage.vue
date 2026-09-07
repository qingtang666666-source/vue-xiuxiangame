<template>
  <div class="manor">
    <div class="manor-header">
      <div class="title">
        洞府 · <span class="realm" v-text="levelNames(player.level)" />
      </div>
      <div class="resources">
        <el-tag v-for="res in resourceList" :key="res.key" :type="res.type" effect="plain" class="res-tag">
          {{ res.name }}: {{ formatNumberToChineseUnit(res.value) }}
        </el-tag>
      </div>
      <div class="summary">
        <div class="summary-item">离线修炼 ×{{ stats.offlineCultivationMult.toFixed(2) }}</div>
        <div class="summary-item">离线灵石 ×{{ stats.offlineMoneyMult.toFixed(2) }}</div>
        <div class="summary-item">离线上限 {{ stats.capHours }}h</div>
        <div class="summary-item">灵草 {{ stats.herbsPerHour }}/h</div>
        <div class="summary-item">修炼 +{{ Math.round((stats.cultivationSpeedMult - 1) * 100) }}%</div>
        <div class="summary-item">高品天赋 {{ (stats.talentBoost * 100).toFixed(0) }}%</div>
        <div class="summary-item">炼器耗 -{{ Math.round(stats.enhance.costDiscount * 100) }}%</div>
        <div class="summary-item">炼器成 +{{ Math.round(stats.enhance.successBonus * 100) }}%</div>
      </div>
    </div>

    <div class="building-grid">
      <el-card v-for="b in builds" :key="b.id" class="building-card" shadow="hover">
        <template #header>
          <div class="card-head">
            <span class="icon">{{ b.icon }}</span>
            <span class="name">{{ b.name }}</span>
            <el-tag size="small" :type="b.level >= b.max ? 'success' : 'primary'" effect="dark">
              {{ b.level }} / {{ b.max }}
            </el-tag>
          </div>
        </template>
        <p class="desc">{{ b.desc }}</p>
        <div class="effects">
          <div class="effect" v-for="(e, i) in b.effectTexts" :key="i">{{ e }}</div>
        </div>
        <div class="preview" v-if="!b.preview.maxed">
          <div class="pv-title">升到 {{ b.preview.level + 1 }} 级</div>
          <div class="pv-row" v-for="r in b.preview.rows" :key="r.label">
            <span class="pv-k">{{ r.label }}</span>
            <span class="pv-v">{{ r.cur }} → <b>{{ r.next }}</b></span>
          </div>
          <div class="pv-money" v-if="b.preview.moneyPerHour">
            离线灵石 ≈ {{ formatNumberToChineseUnit(b.preview.moneyPerHour.cur) }} → {{ formatNumberToChineseUnit(b.preview.moneyPerHour.next) }} /小时
          </div>
          <div class="pv-back" v-if="b.preview.paybackHours">按新增产出估算，约 {{ b.preview.paybackHours }} 小时回本</div>
        </div>
        <div class="preview maxed" v-else>已满级 · 收益不再增长</div>
        <div class="cost" v-if="b.level < b.max">
          <el-tag size="small" type="warning">灵石 {{ formatNumberToChineseUnit(b.cost.money) }}</el-tag>
          <el-tag size="small" v-if="b.cost.stone" type="danger">炼器石 {{ b.cost.stone }}</el-tag>
        </div>
        <el-button
          class="upgrade-btn"
          type="primary"
          :disabled="!b.canUpgrade"
          @click="upgrade(b)"
          v-if="b.level < b.max"
        >
          {{ b.level >= b.max ? '已满级' : '升级' }}
        </el-button>
        <el-tag class="upgrade-btn" type="success" effect="plain" v-else>已满级</el-tag>
      </el-card>
    </div>

    <div class="actions">
    </div>
  </div>
</template>

<script setup>
  import { ref, computed } from 'vue'
  import { useRouter } from 'vue-router'
  import { useMainStore } from '@/plugins/store'
  import { formatNumberToChineseUnit, levelNames, gameNotifys } from '@/plugins/game'
  import {
    MANOR_BUILDINGS,
    manorLevel,
    manorMaxLevel,
    manorUpgradeCost,
    canUpgrade,
    upgradeManor,
    manorStats,
    manorGainPreview
  } from '@/plugins/manor'

  const store = useMainStore()
  const router = useRouter()
  const player = ref(store.player)

  const stats = computed(() => manorStats(player.value))

  const resourceList = computed(() => {
    const p = player.value.props || {}
    return [
      { key: 'money', name: '灵石', value: p.money || 0, type: 'warning' },
      { key: 'spiritHerb', name: '灵草', value: p.spiritHerb || 0, type: 'success' },
      { key: 'strengtheningStone', name: '炼器石', value: p.strengtheningStone || 0, type: 'danger' },
      { key: 'cultivateDan', name: '培养丹', value: p.cultivateDan || 0, type: 'primary' }
    ]
  })

  const builds = computed(() => {
    return MANOR_BUILDINGS.map(b => {
      const level = manorLevel(player.value, b.id)
      const cost = manorUpgradeCost(player.value, b.id)
      const check = canUpgrade(player.value, b.id)
      return {
        ...b,
        id: b.id,
        level,
        max: manorMaxLevel(b.id),
        cost,
        canUpgrade: check.ok,
        reason: check.reason,
        // 动态展示各建筑当前生效值
        effectTexts: computeEffectText(b.id, level),
        // 下一级收益（含回本估算）
        preview: manorGainPreview(player.value, b.id)
      }
    })
  })

  // 每个建筑根据等级生成动态效果文本
  const computeEffectText = (id, level) => {
    switch (id) {
      case 'hall':
        return [`离线修炼 +${(level * 6).toFixed(0)}%`, `离线上限 +${level}h`]
      case 'mine':
        return [`离线灵石 +${(level * 8).toFixed(0)}%`]
      case 'farm':
        return [`灵草 ${level}/时`]
      case 'library':
        return [`修炼速度 +${(level * 2).toFixed(0)}%`]
      case 'dao':
        return [`高品天赋 +${Math.min(50, level * 1).toFixed(0)}%`, `修炼 +${level}%`]
      case 'forge':
        return [`炼器消耗 -${Math.min(50, level * 2).toFixed(0)}%`, `成功率 +${Math.min(15, level * 1).toFixed(0)}%`]
      default:
        return []
    }
  }

  const upgrade = b => {
    const res = upgradeManor(player.value, b.id)
    if (res.ok) {
      gameNotifys({
        title: '洞府升级',
        message: `【${b.name}】升至 ${res.level} 级`,
        type: 'success'
      })
    } else {
      gameNotifys({ title: '洞府升级', message: res.reason, type: 'error' })
    }
  }
</script>

<style scoped>
  .manor {
    text-align: left;
    padding: 0 4px;
  }

  .manor-header {
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
    margin-bottom: 10px;
  }

  .res-tag {
    font-size: 13px;
  }

  .summary {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  .summary-item {
    background: var(--el-fill-color-light);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 4px;
    padding: 3px 8px;
  }

  .building-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  .building-card {
    margin: 0;
  }

  .card-head {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .icon {
    font-size: 20px;
  }

  .name {
    font-weight: bold;
    flex: 1;
  }

  .desc {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    margin: 4px 0;
    min-height: 32px;
  }

  .effects {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin-bottom: 8px;
    font-size: 12px;
    color: var(--el-color-success);
  }

  .preview {
    margin-bottom: 8px;
    padding: 6px 8px;
    border-radius: 6px;
    background: var(--el-fill-color-light);
    border: 1px dashed var(--el-border-color-lighter);
    font-size: 12px;
  }
  .preview.maxed { color: var(--el-color-success); }
  .pv-title { font-weight: bold; color: var(--el-color-primary); margin-bottom: 2px; }
  .pv-row { display: flex; justify-content: space-between; gap: 8px; }
  .pv-row .pv-k { color: var(--el-text-color-secondary); }
  .pv-row b { color: var(--el-color-success); }
  .pv-money { margin-top: 2px; color: var(--el-color-warning); }
  .pv-back { color: var(--el-text-color-secondary); }
  .cost {
    display: flex;
    gap: 6px;
    margin-bottom: 8px;
  }

  .upgrade-btn {
    width: 100%;
  }

  .actions {
    margin-top: 16px;
    display: flex;
    justify-content: center;
  }

  @media only screen and (max-width: 768px) {
    .building-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
