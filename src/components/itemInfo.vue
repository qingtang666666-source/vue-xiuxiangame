<template>
  <el-dialog
    :model-value="visible"
    :title="data?.title || '物品说明'"
    width="430px"
    align-center
    :show-close="true"
    @update:model-value="$emit('update:visible', $event)"
  >
    <div class="item-info" v-if="data">
      <div class="rows" v-if="data.rows && data.rows.length">
        <div class="row" v-for="(r, i) in data.rows" :key="i">
          <span class="k">{{ r.k }}</span><span class="v">{{ r.v }}</span>
        </div>
      </div>
      <div class="section" v-if="data.affixes && data.affixes.length">
        <div class="section-title">词条</div>
        <div class="affix" v-for="(a, i) in data.affixes" :key="i">
          <span class="aname">{{ a.name }}</span>
          <span class="avalue">{{ a.text }}</span>
          <div class="adesc" v-if="a.desc">{{ a.desc }}</div>
        </div>
      </div>
      <div class="section" v-if="data.effects && data.effects.length">
        <div class="section-title">效果</div>
        <div class="effect" v-for="(e, i) in data.effects" :key="i">{{ e }}</div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
  defineProps({ visible: Boolean, data: Object })
  defineEmits(['update:visible'])
</script>

<style scoped>
  .item-info { text-align: left; }
  .rows { display: flex; flex-direction: column; gap: 4px; }
  .row { display: flex; justify-content: space-between; font-size: 13px; }
  .k { color: var(--el-text-color-secondary); }
  .section { margin-top: 12px; }
  .section-title { font-size: 13px; font-weight: bold; margin-bottom: 6px; }
  .affix { margin-bottom: 6px; font-size: 12px; }
  .aname { color: var(--el-color-primary); font-weight: bold; margin-right: 6px; }
  .avalue { color: var(--el-color-success); }
  .adesc { font-size: 11px; color: var(--el-text-color-secondary); }
  .effect { font-size: 12px; color: var(--el-color-success); margin-bottom: 2px; }
</style>
