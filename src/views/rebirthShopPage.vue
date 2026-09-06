<template>
  <div class="rebirth-shop">
    <div class="page-header">
      <div class="title">转世商店 <span class="hint">以道行兑换永久传承加成</span></div>
      <div class="resources">
        <el-tag type="warning" size="large">✨ 道行 {{ formatNumberToChineseUnit(daoPoints) }}</el-tag>
      </div>
    </div>

    <div class="shop-summary">
      <el-tag v-for="s in summary" :key="s.label" size="small" effect="plain" class="sum-tag">
        {{ s.label }} {{ s.value }}
      </el-tag>
    </div>

    <div v-for="g in groups" :key="g.name" class="shop-group">
      <div class="section-title">{{ g.name }}</div>
      <div class="shop-grid">
        <el-card v-for="item in g.items" :key="item.key" class="shop-item" shadow="hover">
          <div class="item-head">
            <span class="item-icon">{{ item.icon }}</span>
            <span class="item-name">{{ item.name }}</span>
            <el-tag size="small" :type="item.level >= item.max ? 'success' : 'primary'" effect="plain">
              Lv {{ item.level }}/{{ item.max }}
            </el-tag>
          </div>
          <div class="item-desc">
            {{ item.desc }}：<b>{{ bonusText(item) }}</b>
          </div>
          <el-progress
            :percentage="(item.level / item.max) * 100"
            :show-text="false"
            :stroke-width="8"
            class="item-progress"
          />
          <div class="item-foot">
            <span class="item-cost" :class="{ poor: daoPoints < item.cost }">
              需道行 {{ formatNumberToChineseUnit(item.cost) }}
            </span>
            <el-button
              size="small"
              type="primary"
              :disabled="daoPoints < item.cost || item.level >= item.max"
              @click="buy(item.key)"
            >
              购买
            </el-button>
          </div>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { computed } from 'vue'
  import { useMainStore } from '@/plugins/store'
  import { DAO_SHOP_ITEMS, daoShopLevel, itemCost, buyDaoItem, daoBonus } from '@/plugins/rebirthShop'
  import { formatNumberToChineseUnit, gameNotifys } from '@/plugins/game'

  const store = useMainStore()
  const player = computed(() => store.player)
  const daoPoints = computed(() => player.value.daoPoints || 0)

  const GROUPS = [
    { name: '属性增幅', keys: ['cultivationSpeed', 'maxHealth', 'attack', 'defense', 'critical', 'dodge'] },
    { name: '经济挂机', keys: ['moneyMult', 'offlineMult'] },
    { name: '传承遗泽', keys: ['lifespan', 'startMoney', 'rootBone', 'daoGain'] }
  ]

  const groups = computed(() =>
    GROUPS.map(g => ({
      name: g.name,
      items: DAO_SHOP_ITEMS.filter(i => g.keys.includes(i.key)).map(i => ({
        ...i,
        level: daoShopLevel(player.value, i.key),
        cost: daoShopLevel(player.value, i.key) >= i.max ? 0 : itemCost(i, daoShopLevel(player.value, i.key))
      }))
    }))
  )

  const bonusText = item => {
    const lv = item.level
    const val = item.per * lv
    if (item.key === 'lifespan') return `+${val} 年`
    if (item.key === 'startMoney') return `+${formatNumberToChineseUnit(val)} 灵石`
    if (item.key === 'rootBone') return `根骨保底 +${val} 阶`
    if (item.key === 'daoGain') return `轮回道行 +${val}%`
    return `+${val}${item.unit}`
  }

  const summary = computed(() => {
    const d = daoBonus(player.value)
    const s = []
    if (d.attack) s.push({ label: '攻击', value: `${(d.attack * 100).toFixed(1)}%` })
    if (d.defense) s.push({ label: '防御', value: `${(d.defense * 100).toFixed(1)}%` })
    if (d.critical) s.push({ label: '暴击', value: `${(d.critical * 100).toFixed(1)}%` })
    if (d.dodge) s.push({ label: '闪避', value: `${(d.dodge * 100).toFixed(1)}%` })
    if (d.health) s.push({ label: '气血', value: `${(d.health * 100).toFixed(1)}%` })
    if (d.cultivationSpeed) s.push({ label: '修炼', value: `${(d.cultivationSpeed * 100).toFixed(1)}%` })
    if (d.moneyMult) s.push({ label: '灵石', value: `${(d.moneyMult * 100).toFixed(1)}%` })
    if (d.offlineMult) s.push({ label: '离线', value: `${(d.offlineMult * 100).toFixed(1)}%` })
    if (d.lifespanBonus) s.push({ label: '寿元', value: `+${d.lifespanBonus}年` })
    if (d.startMoney) s.push({ label: '开局灵石', value: `+${formatNumberToChineseUnit(d.startMoney)}` })
    if (d.rootBoneFloor) s.push({ label: '根骨保底', value: `+${d.rootBoneFloor}阶` })
    if (d.daoGainMult) s.push({ label: '道行获取', value: `+${(d.daoGainMult * 100).toFixed(1)}%` })
    return s
  })

  const buy = key => {
    const res = buyDaoItem(player.value, key)
    if (res.ok) {
      gameNotifys({ title: '转世商店', message: `已兑换【${res.name}】至 Lv ${res.level}`, type: 'success' })
    } else {
      gameNotifys({ title: '转世商店', message: res.reason, type: 'warning' })
    }
  }
</script>

<style scoped>
  .rebirth-shop {
    padding: 4px 6px;
    text-align: left;
  }
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }
  .title {
    font-size: 18px;
    font-weight: 700;
  }
  .hint {
    font-size: 12px;
    color: #909399;
    font-weight: 400;
    margin-left: 6px;
  }
  .shop-summary {
    margin-bottom: 12px;
  }
  .sum-tag {
    margin: 0 4px 4px 0;
  }
  .shop-group {
    margin-bottom: 14px;
  }
  .section-title {
    font-weight: 700;
    margin-bottom: 8px;
    color: #606266;
  }
  .shop-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 10px;
  }
  .shop-item {
    border-radius: 8px;
  }
  .item-head {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 8px;
  }
  .item-icon {
    font-size: 20px;
  }
  .item-name {
    font-weight: 700;
    flex: 1;
  }
  .item-desc {
    font-size: 13px;
    color: #606266;
    margin-bottom: 8px;
  }
  .item-progress {
    margin-bottom: 8px;
  }
  .item-foot {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .item-cost {
    font-size: 13px;
    color: #67c23a;
  }
  .item-cost.poor {
    color: #f56c6c;
  }
</style>
