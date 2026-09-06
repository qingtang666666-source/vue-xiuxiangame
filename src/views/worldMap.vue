<template>
  <div class="world-map">
    <div class="wm-head">
      <div class="wm-title">🗺️ 大世界</div>
      <div class="wm-hint">各区域随境界开放；不同区域分布不同交易场所</div>
    </div>

    <!-- 当前所在区域 -->
    <div class="cur-card">
      <div class="cur-label">当前所在</div>
      <div class="cur-name">{{ cur.name }}</div>
      <div class="cur-theme">{{ cur.theme }}</div>
      <div class="cur-venues">
        <span class="cur-sub">主营坊市 · {{ cur.venueName }}</span>
        <el-tag
          v-for="v in cur.venues"
          :key="v"
          type="warning"
          effect="plain"
          size="small"
          class="venue-tag"
          @click.stop="gotoVenue(v)"
        >
          {{ VENUE_NAMES[v] }}
        </el-tag>
      </div>
      <el-button size="small" type="primary" class="cur-go" @click="router.push('/market')">
        前往「{{ cur.venueName }}」
      </el-button>
      <div class="cur-hint">点击场所标签可直达对应摊位；市场地点与价格随境界提升。</div>
    </div>

    <div class="zones">
      <div
        v-for="r in zones"
        :key="r.idx"
        class="zone"
        :class="{ cur: r.isCur, locked: r.locked }"
        @click="visitZone(r)"
      >
        <div class="zone-row">
          <div class="zone-name">{{ r.name }}</div>
          <div class="zone-lv">境界 {{ levelNames(r.minLevel) }}~{{ levelNames(r.maxLevel) }}</div>
        </div>
        <div class="zone-theme">{{ r.theme }}<span v-if="r.isCur" class="cur-tag">· 你在此</span></div>
        <div class="zone-venue">坊市 · {{ r.venueName }}</div>
        <div class="zone-venues">
          <el-tag v-if="r.locked" type="info" size="small" class="lock-tag">🔒 需 {{ levelNames(r.minLevel) }}</el-tag>
          <el-tag
            v-for="v in r.venues"
            :key="v"
            type="warning"
            effect="plain"
            size="small"
            class="venue-tag"
            :class="{ dim: r.locked }"
            @click.stop="gotoVenue(r, v)"
          >
            {{ VENUE_NAMES[v] }}
          </el-tag>
        </div>
      </div>
    </div>

    <el-divider>快捷前往</el-divider>
    <div class="locs">
      <el-button size="small" @click="router.push('/sect')">🏛️ 宗门</el-button>
      <el-button size="small" @click="router.push('/realm')">🌸 秘境</el-button>
      <el-button size="small" @click="router.push('/endlesstower')">🏯 无尽塔</el-button>
      <el-button size="small" type="danger" @click="router.push('/boss')">🌍 世界Boss</el-button>
      <el-button size="small" @click="router.push('/manor')">🏡 洞府</el-button>
      <el-button size="small" type="primary" @click="router.push('/market')">🏪 贸易市场</el-button>
    </div>
  </div>
</template>

<script setup>
  import { ref, computed } from 'vue'
  import { useRouter } from 'vue-router'
  import { useMainStore } from '@/plugins/store'
  import { REGIONS, VENUE_NAMES, currentRegion } from '@/plugins/regionDb'
  import { gameNotifys, levelNames } from '@/plugins/game'

  const store = useMainStore()
  const router = useRouter()
  const player = ref(store.player)

  const cur = computed(() => currentRegion(player.value))

  const zones = computed(() =>
    REGIONS.map(r => ({
      ...r,
      isCur: cur.value.idx === r.idx,
      locked: (player.value.level || 0) < r.minLevel
    }))
  )

  const visitZone = r => {
    if (r.locked) {
      gameNotifys({ title: '提示', message: `此区域需达到${levelNames(r.minLevel)}方可前往`, type: 'warning' })
      return
    }
    router.push('/market')
  }

  const gotoVenue = (r, v) => {
    if (r && r.locked) {
      gameNotifys({ title: '提示', message: `此区域需达到${levelNames(r.minLevel)}方可前往${VENUE_NAMES[v] || ''}`, type: 'warning' })
      return
    }
    router.push({ path: '/market', query: { venue: v } })
  }
</script>

<style scoped>
  .world-map {
    padding: 16px;
    max-width: 640px;
    margin: 0 auto;
  }

  .wm-head {
    text-align: center;
    margin-bottom: 14px;
  }

  .wm-title {
    font-size: 22px;
    font-weight: bold;
    color: var(--el-color-primary);
  }

  .wm-hint {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  .cur-card {
    padding: 14px 16px;
    border-radius: 12px;
    margin-bottom: 16px;
    background: var(--el-color-primary-light-9);
    border: 1px solid var(--el-color-primary-light-7);
  }

  .cur-label {
    font-size: 12px;
    color: var(--el-color-primary);
    font-weight: bold;
    margin-bottom: 4px;
  }

  .cur-name {
    font-size: 18px;
    font-weight: bold;
    color: var(--el-text-color-primary);
  }

  .cur-theme {
    font-size: 13px;
    color: var(--el-text-color-primary);
    margin: 4px 0;
  }

  .cur-venues {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    margin: 6px 0;
  }

  .cur-sub {
    font-size: 13px;
    color: var(--el-text-color-secondary);
    font-weight: bold;
  }

  .cur-go {
    margin-top: 4px;
  }

  .cur-hint {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    margin-top: 8px;
  }

  .zones {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .zone {
    padding: 12px 14px;
    border-radius: 10px;
    background: var(--el-fill-color-light);
    cursor: pointer;
    transition: box-shadow 0.2s;
  }

  .zone:hover {
    box-shadow: var(--el-box-shadow-light);
  }

  .zone.cur {
    box-shadow: 0 0 0 2px var(--el-color-primary);
    background: var(--el-color-primary-light-9);
  }

  .zone.locked {
    opacity: 0.6;
  }

  .zone-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .zone-name {
    font-size: 16px;
    font-weight: bold;
    color: var(--el-text-color-primary);
  }

  .zone-lv {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  .zone-theme {
    font-size: 13px;
    color: var(--el-text-color-primary);
    margin: 4px 0;
  }

  .cur-tag {
    color: var(--el-color-primary);
    font-weight: bold;
  }

  .zone-venue {
    font-size: 12px;
    color: var(--el-text-color-placeholder);
    margin-bottom: 6px;
  }

  .zone-venues {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    align-items: center;
  }

  .venue-tag {
    cursor: pointer;
  }

  .venue-tag.dim {
    cursor: not-allowed;
    opacity: 0.8;
  }

  .lock-tag {
    cursor: default;
  }

  .locs {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: center;
  }
</style>
