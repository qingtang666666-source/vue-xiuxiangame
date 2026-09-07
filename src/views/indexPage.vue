<template>
  <div class="index">
    <div class="hero">
      <div class="hero-glow" />
      <h1 class="hero-title">我的文字修仙全靠刷</h1>
      <p class="hero-sub">一念成道 · 万法归心　|　离线单机文字修仙</p>
      <div class="hero-seal">修</div>
    </div>
    <div class="index2">
      <el-button class="button" @click="goHome">开始游戏</el-button>
      <el-button class="button" @click="dialogVisible = true">隐私政策</el-button>
    </div>
    <el-dialog v-model="dialogVisible" :lock-scroll="false" title="隐私政策" width="420px">
      <div class="custom-html md-stream-desktop">
        <p>
          我们非常重视您的隐私，并致力于保护您的个人信息。鉴于我的文字修仙全靠刷是一款完全离线的单机游戏，我们特此明确声明：
        </p>
        <el-collapse v-model="activeName" accordion>
          <el-collapse-item name="1">
            <template #title>
              <div class="custom-title">无数据收集</div>
            </template>
            <p>
              游戏设计为无需网络连接即可运行的单机游戏。因此，我们不会通过任何方式收集、存储、传输或使用您的个人信息，包括但不限于您的姓名、联系方式、地理位置、设备信息或游戏内行为数据。
            </p>
          </el-collapse-item>
          <el-collapse-item name="2">
            <template #title>
              <div class="custom-title">无第三方数据共享</div>
            </template>
            <p>
              由于游戏不收集任何个人信息，我们自然也不会将任何数据分享给第三方机构或个人。我们承诺尊重并保护您的隐私权益，确保您的游戏体验不受任何不必要的干扰。
            </p>
          </el-collapse-item>
          <el-collapse-item name="3">
            <template #title>
              <div class="custom-title">本地存储</div>
            </template>
            <p>
              虽然游戏可能需要在您的设备上存储一些必要的游戏文件（如存档、设置等），但这些数据仅用于游戏的正常运行，且完全存储在您的本地设备上。我们不会将这些数据上传至服务器或用于除游戏运行以外的任何目的。
            </p>
          </el-collapse-item>
          <el-collapse-item name="4">
            <template #title>
              <div class="custom-title">隐私权保护</div>
            </template>
            <p>
              我们理解隐私权对于每位玩家都至关重要。因此，我们承诺将持续关注并遵守所有适用的隐私保护法律法规，不断改进和优化我们的隐私保护措施。
            </p>
          </el-collapse-item>
          <el-collapse-item name="5">
            <template #title>
              <div class="custom-title">政策更新</div>
            </template>
            <p>
              虽然游戏的离线特性意味着我们的隐私政策不太可能发生重大变化，但我们仍保留根据法律法规变化或游戏技术更新对隐私政策进行修订的权利。任何政策更新都将在此页面上公布，并注明生效日期。
            </p>
          </el-collapse-item>
          <el-divider>结语</el-divider>
          <p>感谢您游玩本游戏！我们承诺将继续努力，为您带来安全、愉快的游戏体验。</p>
        </el-collapse>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="zhengce(false)">拒 绝</el-button>
          <el-button type="primary" @click="zhengce(true)">同 意</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
  import { ref, onMounted } from 'vue'
  import { useRouter } from 'vue-router'
  import { useMainStore } from '@/plugins/store'
  import { ElNotification, ElMessageBox } from 'element-plus'
  import { settleOffline } from '@/plugins/offline'

  const router = useRouter()
  const local = useMainStore()
  const player = ref({})
  const activeName = ref('')
  const dialogVisible = ref(true)

  const fmt = n => (n || 0).toLocaleString('zh-CN')

  // 离线收益：分项卡片
  const buildOfflineHtml = o => {
    const row = (label, value, color) =>
      '<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px dashed #e4e7ed;">' +
      `<span style="color:#909399;font-size:13px;">${label}</span>` +
      `<span style="color:${color};font-weight:600;font-size:14px;">${value}</span></div>`
    let html = '<div style="font-size:13px;line-height:1.6;">'
    html += '<div style="text-align:center;padding:0 0 8px;color:#5b7db1;font-size:13px;">道友，别来无恙！离线期间，天地灵气自会滋养你。</div>'
    html += '<div style="text-align:center;padding:4px 0 10px;color:#303133;font-weight:700;font-size:15px;">离线收益</div>'
    html += row('离线时长', `约 ${o.hours.toFixed(1)} 小时`, '#409EFF')
    html += row('修为', `+${fmt(o.gainedCultivation)}`, '#E6A23C')
    html += row('灵石', `+${fmt(o.gainedMoney)}`, '#67C23A')
    if (o.gainedHerb) html += row('灵草', `+${fmt(o.gainedHerb)}`, '#67C23A')
    const mats = Object.entries(o.gainedMaterials || {})
      .map(([k, v]) => `${(o.materialNames && o.materialNames[k]) || k} ×${fmt(v)}`)
      .join('、')
    if (mats) html += row('材料', mats, '#8E44AD')
    html += '</div>'
    return html
  }

  const zhengce = bool => {
    if (bool) router.push('/home')
    else ElNotification({ title: '提示', message: '未同意隐私政策无法进入游戏' })
    player.value.zc = bool
    dialogVisible.value = false
  }

  const goHome = () => {
    if (!player.value.zc) {
      ElNotification({ title: '提示', message: '未同意隐私政策无法进入游戏' })
      return
    }
    router.push('/home')
  }

  onMounted(() => {
    if (local) {
      player.value = local.player
      player.value.zc = player.value.zc ? player.value.zc : false
      // 登录时结算离线挂机收益
      const offline = settleOffline(local.player)
      if (offline && offline.hours >= 1 / 120) {
        ElMessageBox.alert(buildOfflineHtml(offline), '欢迎回来', {
          dangerouslyUseHTMLString: true,
          confirmButtonText: '收下',
          customClass: 'offline-card'
        }).catch(() => {})
      }
      dialogVisible.value = !player.value.zc
    }
    if (location.host != 'appassets.androidplatform.net' || player.value.zc) router.push('/home')
  })
</script>
<style scoped>
  .index {
    position: relative;
    min-height: 574px;
  }

  .hero {
    position: relative;
    padding: 54px 16px 26px;
    text-align: center;
    overflow: hidden;
  }

  .hero-glow {
    position: absolute;
    inset: -40% -20% auto;
    height: 320px;
    background: radial-gradient(closest-side, color-mix(in srgb, var(--el-color-primary) 26%, transparent), transparent 72%);
    filter: blur(6px);
    animation: heroDrift 9s ease-in-out infinite alternate;
    pointer-events: none;
  }

  @keyframes heroDrift {
    from { transform: translate3d(-6%, 0, 0) scale(1); }
    to { transform: translate3d(6%, 4%, 0) scale(1.06); }
  }

  .hero-title {
    position: relative;
    margin: 0 0 8px;
    font-size: clamp(26px, 6vw, 42px);
    font-weight: 900;
    letter-spacing: 4px;
    background: linear-gradient(180deg, var(--el-text-color-primary), color-mix(in srgb, var(--el-color-primary) 72%, var(--el-text-color-primary)));
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    animation: heroRise 0.7s ease both;
  }

  .hero-sub {
    position: relative;
    margin: 0;
    font-size: 13px;
    letter-spacing: 2px;
    color: var(--el-text-color-secondary);
    animation: heroRise 0.7s 0.12s ease both;
  }

  .hero-seal {
    position: absolute;
    right: 18px;
    top: 26px;
    width: 40px;
    height: 40px;
    line-height: 40px;
    border-radius: 8px;
    font-size: 20px;
    font-weight: 900;
    color: #fff;
    background: linear-gradient(160deg, #c25548, #a03a30);
    box-shadow: 0 4px 14px rgba(194, 85, 72, 0.4);
    transform: rotate(-8deg);
    opacity: 0.92;
  }

  @keyframes heroRise {
    from { opacity: 0; transform: translateY(14px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @media only screen and (max-width: 768px) {
    .index2 {
      display: grid;
      width: 100%;
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
    }

    .index2 .button {
      margin-top: 50px;
      width: 100%;
      margin-left: 0;
    }
  }
</style>
