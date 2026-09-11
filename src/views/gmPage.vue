<template>
  <div class="gm">
    <div class="gm-head">
      <div class="title">🎛️ GM 控制台</div>
      <div class="hint">直接编辑存档，改动即时保存。任何物品都能刷（装备/丹药/符箓/宝物/材料）。</div>
    </div>

    <el-collapse v-model="open">
      <el-collapse-item title="资源" name="res">
        <div class="row"><span>灵石</span><el-input-number v-model="amt.money" size="small" /><el-button size="small" type="primary" @click="add('money')">加</el-button><el-button size="small" plain @click="setRes('money')">设为</el-button></div>
        <div class="row"><span>灵草</span><el-input-number v-model="amt.spiritHerb" size="small" /><el-button size="small" type="primary" @click="add('spiritHerb')">加</el-button><el-button size="small" plain @click="setRes('spiritHerb')">设为</el-button></div>
        <div class="row"><span>炼器石</span><el-input-number v-model="amt.strengtheningStone" size="small" /><el-button size="small" type="primary" @click="add('strengtheningStone')">加</el-button><el-button size="small" plain @click="setRes('strengtheningStone')">设为</el-button></div>
        <div class="row"><span>培养丹</span><el-input-number v-model="amt.cultivateDan" size="small" /><el-button size="small" type="primary" @click="add('cultivateDan')">加</el-button><el-button size="small" plain @click="setRes('cultivateDan')">设为</el-button></div>
        <div class="row"><span>悟性丹</span><el-input-number v-model="amt.rootBone" size="small" /><el-button size="small" type="primary" @click="add('rootBone')">加</el-button><el-button size="small" plain @click="setRes('rootBone')">设为</el-button></div>
        <div class="row"><span>混沌石</span><el-input-number v-model="amt.currency" size="small" /><el-button size="small" type="primary" @click="add('currency')">加</el-button><el-button size="small" plain @click="setRes('currency')">设为</el-button></div>
        <div class="row"><span>筹码</span><el-input-number v-model="amt.chips" size="small" /><el-button size="small" type="primary" @click="add('chips')">加</el-button><el-button size="small" plain @click="setRes('chips')">设为</el-button></div>
        <div class="row"><span>财富免检</span><el-switch v-model="player.wealthExempt" size="small" /><span class="hint">GM 刷灵石/筹码会自动打开；开启后不受「灵石+筹码 50 亿上限」清空</span></div>
        <div class="row"><span>道痕</span><el-input-number v-model="amt.daoMark" size="small" :min="0" /><el-button size="small" type="primary" @click="setDaoMark">加</el-button><el-button size="small" plain @click="setDaoMarkValue">设为</el-button></div>
        <div class="row"><span>赛季分</span><el-input-number v-model="amt.seasonPts" size="small" :min="0" /><el-button size="small" type="primary" @click="setSeason">加</el-button><el-button size="small" plain @click="setSeasonValue">设为</el-button></div>
      </el-collapse-item>

      <el-collapse-item title="装备生成器" name="eq">
        <div class="row"><span>类型</span>
          <el-select v-model="eq.type" size="small" class="sel"><el-option v-for="t in FORGE_TYPES" :key="t.key" :label="t.name" :value="t.key" /></el-select>
        </div>
        <div class="row"><span>品阶</span>
          <el-select v-model="eq.quality" size="small" class="sel"><el-option v-for="q in FORGE_QUALITIES" :key="q.key" :label="q.name" :value="q.key" /></el-select>
        </div>
        <div class="row"><span>细分级</span>
          <el-select v-model="eq.grade" size="small" class="sel"><el-option v-for="(g, i) in gradeNames" :key="i" :label="g" :value="i + 1" /></el-select>
        </div>
        <div class="row"><span>等级</span><el-input-number v-model="eq.level" size="small" :min="1" :max="144" /></div>
        <div class="row"><span>强化</span><el-input-number v-model="eq.strengthen" size="small" :min="0" :max="30" /></div>
        <div class="row"><span>件数</span><el-input-number v-model="eq.count" size="small" :min="1" :max="50" /></div>
        <div class="row"><el-button size="small" type="primary" @click="genEquip">生成装备</el-button></div>
      </el-collapse-item>

      <el-collapse-item title="丹药 / 符箓 / 宝物 / 材料" name="item">
        <div class="row">
          <span>丹药</span>
          <el-select v-model="pillId" size="small" filterable class="sel"><el-option v-for="r in RECIPES" :key="r.id" :label="`${r.name}(${r.tierName})`" :value="r.id" /></el-select>
          <el-input-number v-model="pillN" size="small" :min="1" :max="999" />
          <el-button size="small" type="primary" @click="genPill">生成</el-button>
        </div>
        <div class="row">
          <span>符箓</span>
          <el-select v-model="talId" size="small" filterable class="sel"><el-option v-for="t in TALISMANS" :key="t.id" :label="`${t.name}(${t.tierName})`" :value="t.id" /></el-select>
          <el-input-number v-model="talN" size="small" :min="1" :max="999" />
          <el-button size="small" type="primary" @click="genTal">生成</el-button>
        </div>
        <div class="row">
          <span>宝物</span>
          <el-select v-model="treId" size="small" filterable class="sel"><el-option v-for="t in TREASURES" :key="t.key" :label="`${t.name}(${t.tierName})`" :value="t.key" /></el-select>
          <el-input-number v-model="treN" size="small" :min="1" :max="999" />
          <el-button size="small" type="primary" @click="genTre">生成</el-button>
        </div>
        <div class="row">
          <span>材料</span>
          <el-select v-model="matKey" size="small" class="sel"><el-option v-for="i in ITEM_DB" :key="i.key" :label="i.name" :value="i.key" /></el-select>
          <el-input-number v-model="matN" size="small" :min="1" :max="99999" />
          <el-button size="small" type="primary" @click="genMat">生成</el-button>
        </div>
        <div class="row">
          <span>阵法</span>
          <el-select v-model="formId" size="small" filterable class="sel"><el-option v-for="f in FORMATIONS" :key="f.id" :label="f.name" :value="f.id" /></el-select>
          <el-input-number v-model="formN" size="small" :min="1" :max="99" />
          <el-button size="small" type="primary" @click="genForm">生成</el-button>
        </div>
      </el-collapse-item>

      <el-collapse-item title="境界 / 属性" name="attr">
        <div class="row"><span>境界等级</span><el-input-number v-model="level" size="small" :min="0" :max="144" /><el-button size="small" type="primary" @click="setLevel">设置</el-button></div>
        <div class="row"><span>转世数</span><el-input-number v-model="reinc" size="small" :min="0" /><el-button size="small" type="primary" @click="setReinc">设置</el-button></div>
        <div class="row"><span>攻击</span><el-input-number v-model="atk" size="small" /><el-button size="small" @click="setStat('attack', atk)">设</el-button></div>
        <div class="row"><span>防御</span><el-input-number v-model="def" size="small" /><el-button size="small" @click="setStat('defense', def)">设</el-button></div>
        <div class="row"><span>气血上限</span><el-input-number v-model="hp" size="small" /><el-button size="small" @click="setHp">设</el-button></div>
        <div class="row"><span>修炼速度</span><el-input-number v-model="spd" size="small" :step="0.1" /><el-button size="small" @click="setStat('cultivationSpeed', spd)">设</el-button></div>
        <div class="row"><span>悟性</span><el-input-number v-model="insight" size="small" :min="1" :max="20" /><el-button size="small" @click="setInsight">设</el-button></div>
        <div class="row"><span>四艺阶位</span><el-input-number v-model="cAlch" size="small" :min="0" :max="11" /><el-input-number v-model="cForge" size="small" :min="0" :max="11" /><el-input-number v-model="cTal" size="small" :min="0" :max="11" /><el-input-number v-model="cForm" size="small" :min="0" :max="11" /><el-button size="small" @click="setCrafts">设</el-button></div>
        <div class="row"><el-button @click="fillMax">境界点填满(99)</el-button><el-button type="danger" @click="resetAttr">重置属性</el-button></div>
      </el-collapse-item>

      <el-collapse-item title="修仙相关" name="xiuxian">
        <div class="row"><span>抽天赋 ×</span><el-input-number v-model="drawN" size="small" :min="1" :max="50" /><el-button size="small" type="primary" @click="drawTalents">抽</el-button></div>
        <div class="row"><el-button @click="reRollAptitude">重随根骨/体质</el-button><el-button @click="perfRebirth">立即轮回</el-button></div>
        <div class="row"><el-button @click="resetSectNpc">重置宗门/NPC</el-button></div>
        <div class="row"><el-button @click="rerollFate">重随命运/天道</el-button><el-button @click="boostNatal">本命法宝+10级</el-button></div>
        <div class="row"><el-button type="danger" @click="killWorldBoss">挑战世界Boss(屠)</el-button></div>
      </el-collapse-item>

      <el-collapse-item title="存档 / 备份" name="misc">
        <div class="row"><el-button @click="clearBag">清空背包</el-button><el-button type="danger" @click="clearAll">清空全部(重开)</el-button></div>
        <div class="row">
          <el-button @click="exportSave">导出存档(加密)</el-button>
          <el-upload
            action="#"
            :http-request="importSave"
            :show-file-list="false"
            accept=".json,application/json,text/plain"
          >
            <el-button type="warning">导入存档</el-button>
          </el-upload>
          <el-button type="primary" plain @click="backupNow">立即备份</el-button>
        </div>
        <div class="backup-box">
          <div class="backup-head">
            <span>备份（{{ backups.length }}）</span>
            <el-button size="small" text @click="refreshBackups">刷新</el-button>
          </div>
          <div class="backup-row" v-for="b in backups" :key="b.key">
            <span class="backup-name">{{ b.label }}</span>
            <el-button size="small" text type="primary" @click="restoreSave(b)">回滚</el-button>
          </div>
          <div class="backup-empty" v-if="!backups.length">暂无备份</div>
          <el-button size="small" plain v-if="backups.length" @click="dropSaves">清空备份</el-button>
        </div>
      </el-collapse-item>

      <el-collapse-item title="更多功能" name="more">
        <div class="codex-panel">
          <div class="codex-head">
            <span>图鉴进度</span>
            <b>{{ codexStat.owned }}/{{ codexStat.total }}（{{ Math.floor(codexStat.percent * 100) }}%）</b>
          </div>
          <el-progress
            :percentage="Math.floor(codexStat.percent * 100)"
            :stroke-width="10"
            :color="codexStat.percent >= 1 ? '#67c23a' : '#409eff'"
          />
          <div class="codex-milestones">
            <span v-for="m in codexMilestones" :key="m.id" :class="{ ready: m.claimable, claimed: m.claimed }">
              {{ m.name }} {{ Math.round(m.percent * 100) }}%
            </span>
          </div>
        </div>
        <div class="row">
          <el-button type="success" @click="doStory">随机剧情</el-button>
          <el-button type="success" @click="doAdventure">奇遇</el-button>
          <el-button type="warning" @click="gasMax">已学功法化劲</el-button>
        </div>
        <div class="row">
          <el-button type="primary" @click="fillCodex">一键点亮全部图鉴</el-button>
          <el-button type="success" :disabled="!hasClaimableCodex" @click="claimCodexAll">领取图鉴里程碑</el-button>
          <el-button plain @click="resetCodexRewards">重置里程碑领取</el-button>
          <el-button type="danger" @click="unlockAllAchievements">解锁全部成就</el-button>
          <el-button type="success" @click="refreshTrav">刷新游商</el-button>
        </div>
        <div class="row">
          <el-button type="warning" @click="fillMaterials">囤满材料(每种999)</el-button>
          <el-button type="danger" @click="giveFullSets">获得宝箱套装(装备+高阶)</el-button>
        </div>
      </el-collapse-item>
    </el-collapse>

    <div class="current">当前：{{ levelNames(player.level) }} · 灵石{{ formatNumberToChineseUnit(player.props.money) }} · 攻{{ formatNumberToChineseUnit(player.attack) }} · 血{{ formatNumberToChineseUnit(player.maxHealth) }} · 转世{{ player.reincarnation }} · 图鉴{{ Math.floor(codexStat.percent * 100) }}%</div>
  </div>
</template>

<script setup>
  import { ref, reactive, computed } from 'vue'
  import { useMainStore } from '@/plugins/store'
  import {
    flushPersistence,
    wipeSave,
    exportSaveText,
    importSaveText,
    backupSave,
    listBackups,
    restoreBackup,
    dropBackups,
    stopPersistence,
    writeVault
  } from '@/plugins/persistence'
  import { formatNumberToChineseUnit, gameNotifys, computeMaxCultivation, gradeNames, levelNames } from '@/plugins/game'
  import { drawTalentForPlayer } from '@/plugins/talent'
  import { RECIPES } from '@/plugins/alchemy'
  import { TALISMANS } from '@/plugins/talisman'
  import { TREASURES, addTreasure } from '@/plugins/treasure'
  import achievement from '@/plugins/achievement'
  import { ITEM_DB } from '@/plugins/market'
  import { FORGE_TYPES, FORGE_QUALITIES, forgeBuild } from '@/plugins/forge'
  import { FORMATIONS } from '@/plugins/formation'
  import { ensureAptitude } from '@/plugins/aptitude'
  import { performRebirth } from '@/plugins/rebirthFlow'
  import { ensureSect } from '@/plugins/sect'
  import { ensureWorldNpcs } from '@/plugins/npcSystem'
  import { useRouter } from 'vue-router'
  import { rollStory, resolveStory } from '@/plugins/story'
  import { triggerAdventure } from '@/plugins/adventure'
  import { MATERIALS } from '@/plugins/materialDb'
  import { TECHNIQUES } from '@/plugins/technique'
  import { CHEST_SET, CHEST_SET2 } from '@/plugins/equipSetDb'
  import { refreshTravelingMerchant } from '@/plugins/travelingMerchant'
  import { rollFate, rollWorldRule, applyMetaBuffs } from '@/plugins/fate'
  import { codexStats, codexMilestoneState, claimAllCodexMilestones } from '@/plugins/codex'
  import { ElMessageBox } from 'element-plus'

  const store = useMainStore()
  const router = useRouter()
  const player = ref(store.player)
  const open = ref(['res'])

  const amt = reactive({ money: 100000, spiritHerb: 100, strengtheningStone: 100, cultivateDan: 10, rootBone: 5, currency: 3, chips: 10000, daoMark: 1, seasonPts: 1000 })
  const eq = reactive({ type: 'weapon', quality: 'info', grade: 1, level: 10, strengthen: 0, count: 1 })
  const pillId = ref(RECIPES[0].id)
  const pillN = ref(1)
  const talId = ref(TALISMANS[0].id)
  const talN = ref(1)
  const treId = ref(TREASURES[0].key)
  const treN = ref(1)
  const matKey = ref(ITEM_DB[0].key)
  const matN = ref(10)
  const formId = ref(FORMATIONS[0].id)
  const formN = ref(1)
  const level = ref(1)
  const reinc = ref(0)
  const atk = ref(player.value.attack || 10)
  const def = ref(player.value.defense || 10)
  const hp = ref(player.value.maxHealth || 100)
  const spd = ref(player.value.cultivationSpeed || 1)
  const insight = ref(player.value.insight || 1)
  const cAlch = ref(player.value.skills?.alchemy || 0)
  const cForge = ref(player.value.skills?.forge || 0)
  const cTal = ref(player.value.skills?.talisman || 0)
  const cForm = ref(player.value.skills?.formation || 0)
  const drawN = ref(5)
  const backups = ref([])
  const codexStat = computed(() => codexStats(player.value))
  const codexMilestones = computed(() => codexMilestoneState(player.value))
  const hasClaimableCodex = computed(() => codexMilestones.value.some(m => m.claimable))

  const note = m => gameNotifys({ title: 'GM', message: m, type: 'success' })
  // GM 刷出来的灵石/筹码不算异常数据：刷取即打上“财富免检”，跳过 50 亿上限体检
  const markWealthExempt = key => {
    if (key === 'money' || key === 'chips') player.value.wealthExempt = true
  }
  const add = key => { player.value.props[key] = (player.value.props[key] || 0) + (amt[key] || 0); markWealthExempt(key); note('资源已加') }
  const setRes = key => { player.value.props[key] = amt[key] || 0; markWealthExempt(key); note('资源已设置') }
  const setDaoMark = () => { player.value.daoMark = (player.value.daoMark || 0) + (amt.daoMark || 0); note('道痕已加') }
  const setDaoMarkValue = () => { player.value.daoMark = amt.daoMark || 0; note('道痕已设置') }
  const setSeason = () => { if (!player.value.season) player.value.season = { points: 0 }; player.value.season.points = (player.value.season.points || 0) + (amt.seasonPts || 0); note('赛季分已加') }
  const setSeasonValue = () => { if (!player.value.season) player.value.season = { points: 0 }; player.value.season.points = amt.seasonPts || 0; note('赛季分已设置') }
  const rerollFate = () => { player.value.buffs = (player.value.buffs || []).filter(b => !b.meta); applyMetaBuffs(player.value, rollFate(player.value), rollWorldRule(player.value)); note('命运/天道已重随') }
  const boostNatal = () => { if (!player.value.natalArtifact) player.value.natalArtifact = { level: 1, stage: -1, affixes: [] }; player.value.natalArtifact.level = (player.value.natalArtifact.level || 1) + 10; note('本命法宝 +10 级') }
  const killWorldBoss = () => { if (!Array.isArray(player.value.worldBosses)) player.value.worldBosses = []; if (!player.value.worldBosses.length) player.value.worldBosses = [{ id: 'wb-0', rewards: {}, hp: 0, maxHp: 1, dead: false }]; const b = player.value.worldBosses.find(x => !x.dead) || player.value.worldBosses[0]; b.rewards = b.rewards || {}; b.rewards.kill = (b.rewards.kill || 0) + 100000; b.hp = 0; b.maxHp = b.maxHp || 1; b.dead = true; note('世界Boss已讨伐(+10万灵石奖励)') }
  const setLevel = () => { player.value.level = level.value; player.value.maxCultivation = computeMaxCultivation(level.value, player.value.reincarnation); player.value.health = player.value.maxHealth; note('境界已设置') }
  const setReinc = () => { player.value.reincarnation = reinc.value; note('转世已设置') }
  const setStat = (k, v) => { player.value[k] = v; note('属性已设置') }
  const setHp = () => { player.value.maxHealth = hp.value; player.value.health = hp.value; note('气血已设置') }
  const setInsight = () => { player.value.insight = insight.value; note('悟性已设置') }
  const setCrafts = () => { if (!player.value.skills) player.value.skills = { alchemy: 0, forge: 0, talisman: 0, formation: 0 }; player.value.skills.alchemy = cAlch.value; player.value.skills.forge = cForge.value; player.value.skills.talisman = cTal.value; player.value.skills.formation = cForm.value; note('四艺阶位已设置') }
  const fillMax = () => { player.value.points = 99; note('境界点已填满') }
  const resetAttr = () => { Object.assign(player.value, { attack: 10, defense: 10, health: 100, maxHealth: 100, critical: 0, dodge: 0, cultivationSpeed: 1 }); note('属性已重置') }
  const drawTalents = () => { for (let i = 0; i < drawN.value; i++) drawTalentForPlayer(player.value); note('已抽天赋') }
  const genEquip = () => { for (let i = 0; i < eq.count; i++) player.value.inventory.push(forgeBuild({ ...eq })); note(`已生成 ${eq.count} 件装备`) }
  const genPill = () => { if (!player.value.pills) player.value.pills = []; const ex = player.value.pills.find(p => p.id === pillId.value); if (ex) ex.count += pillN.value; else player.value.pills.push({ id: pillId.value, count: pillN.value }); note('已生成丹药') }
  const genTal = () => { if (!player.value.talismans) player.value.talismans = []; const ex = player.value.talismans.find(x => x.id === talId.value); if (ex) ex.count += talN.value; else player.value.talismans.push({ id: talId.value, count: talN.value }); note('已生成符箓') }
  const genTre = () => { addTreasure(player.value, treId.value, treN.value); note('已生成宝物') }
  const genMat = () => { player.value.props[matKey.value] = (player.value.props[matKey.value] || 0) + matN.value; note('已生成材料') }
  const genForm = () => { if (!player.value.formations) player.value.formations = {}; player.value.formations[formId.value] = (player.value.formations[formId.value] || 0) + formN.value; note('已生成阵法') }
  const reRollAptitude = () => { player.value.aptitudeReincarnation = -1; ensureAptitude(player.value); note('根骨/体质已重随') }
  const perfRebirth = () => { performRebirth(player.value); note('已轮回') }
  const resetSectNpc = () => { player.value.sect = { reincarnation: -1 }; player.value.worldNpcsReincarnation = -1; ensureSect(player.value); ensureWorldNpcs(player.value); note('宗门/NPC已刷新') }
  const doStory = () => {
    const ev = rollStory(player.value)
    if (!ev) return note('当前无可触发剧情')
    const r = resolveStory(player.value, ev)
    note(`【${ev.title}】${r.ok ? r.texts.join('，') : r.reason}`)
  }
  const doAdventure = () => {
    const r = triggerAdventure(player.value)
    note(`【${r.type}】${r.desc}`)
  }
  const gasMax = () => {
    Object.values(player.value.methods || {}).forEach(m => {
      m.chapter = 20
      m.proficiency = 5
    })
    note('已学功法全部升至化劲')
  }
  const fillCodex = () => {
    MATERIALS.forEach(m => { player.value.props[m.key] = (player.value.props[m.key] || 0) + 1 })
    RECIPES.forEach(r => { if (!player.value.pills) player.value.pills = []; const ex = player.value.pills.find(p => p.id === r.id); if (ex) ex.count++; else player.value.pills.push({ id: r.id, count: 1 }) })
    TALISMANS.forEach(x => { if (!player.value.talismans) player.value.talismans = []; const ex = player.value.talismans.find(t => t.id === x.id); if (ex) ex.count++; else player.value.talismans.push({ id: x.id, count: 1 }) })
    FORMATIONS.forEach(f => { if (!player.value.formations) player.value.formations = {}; player.value.formations[f.id] = Math.max(player.value.formations[f.id] || 0, 1) })
    TECHNIQUES.forEach(t => { if (!player.value.methods) player.value.methods = {}; if (!player.value.methods[t.id]) player.value.methods[t.id] = { chapter: 1, proficiency: 1 } })
    TREASURES.forEach(t => addTreasure(player.value, t.key, 1))
    note('图鉴已点亮（每种各1件）')
  }
  const claimCodexAll = () => {
    const claimed = claimAllCodexMilestones(player.value)
    if (!claimed.length) return note('暂无可领取的图鉴里程碑')
    note(`已领取 ${claimed.length} 个图鉴里程碑：${claimed.map(x => `${x.milestone.name}（${x.rewardText}）`).join('；')}`)
  }
  const resetCodexRewards = () => {
    if (!player.value.codexRewards) player.value.codexRewards = { claimed: [] }
    player.value.codexRewards.claimed = []
    note('图鉴里程碑领取状态已重置（已发放的永久属性不会回收）')
  }
  const fillMaterials = () => {
    MATERIALS.forEach(m => { player.value.props[m.key] = 999 })
    ;['spiritHerb', 'strengtheningStone', 'zhuSha', 'cultivateDan', 'rootBone', 'xuanTie', 'zhenQi', 'yaoDan', 'flying', 'currency'].forEach(k => { player.value.props[k] = (player.value.props[k] || 0) + 999 })
    note('已囤满 材料 ×999')
  }
  const giveFullSets = () => {
    const sets = [CHEST_SET, CHEST_SET2]
    const slots = ['weapon', 'armor', 'accessory', 'sutra']
    if (!player.value.inventory) player.value.inventory = []
    sets.forEach(set => {
      slots.forEach(type => {
        const eq = forgeBuild({ type, quality: set.quality, grade: 3, level: set.quality === 'legendary' ? 144 : 120, strengthen: 0 })
        eq.noReq = true
        eq.setId = set.id
        eq.setName = set.name
        player.value.inventory.push(eq)
      })
    })
    note(`已获得 ${CHEST_SET.name} 与 ${CHEST_SET2.name} 全套（各4件）`)
  }
  const applyPerkToPlayer = perk => {
    if (!perk) return
    Object.entries(perk).forEach(([k, v]) => {
      const p = player.value
      if (k === 'attack') p.attack += v
      else if (k === 'defense') p.defense += v
      else if (k === 'health') { p.maxHealth += v; p.health += v }
      else if (k === 'critical') p.critical += v
      else if (k === 'dodge') p.dodge += v
      else if (k === 'cultivationSpeed') p.cultivationSpeed = (p.cultivationSpeed || 1) + v
      else if (k === 'moneyMult') { if (!p.alchemy) p.alchemy = { moneyMult: 1, offlineMult: 1 }; p.alchemy.moneyMult *= 1 + v }
    })
  }
  const unlockAllAchievements = () => {
    achievement.all().forEach(g => {
      const cat = g.type
      if (!player.value.achievement[cat]) player.value.achievement[cat] = []
      g.data.forEach(item => {
        if (!player.value.achievement[cat].find(i => i.id === item.id)) {
          player.value.achievement[cat].push({ id: item.id })
          player.value.props.cultivateDan = (player.value.props.cultivateDan || 0) + item.award
          applyPerkToPlayer(item.perk)
        }
      })
    })
    note('所有成就已解锁（奖励已发）')
  }
  const refreshTrav = () => {
    refreshTravelingMerchant(player.value)
    note('游商已进一批新货（回首页冒险→游商查看）')
  }
  const clearBag = () => { player.value.inventory = []; player.value.equipment = { sutra: {}, armor: {}, weapon: {}, accessory: {} }; note('背包已清空') }
  const clearAll = () => {
    ElMessageBox.confirm('将清空全部存档并重新开始。删除前会自动留一份可回滚备份，确定继续？', 'GM 清档', {
      type: 'warning',
      confirmButtonText: '确定清档',
      cancelButtonText: '取消'
    })
      .then(() => {
        wipeSave(store)
        note('存档已清空，即将重开')
        setTimeout(() => location.reload(), 400)
      })
      .catch(() => {})
  }
  const refreshBackups = () => {
    backups.value = listBackups()
      .map(b => {
        const rest = b.key.replace(/^vuex\.bak-/, '')
        const tag = rest.replace(/-\d{13}$/, '')
        const time = b.at ? new Date(b.at).toLocaleString('zh-CN', { hour12: false }) : ''
        return { key: b.key, label: `${tag} · ${time}` }
      })
      .reverse()
  }
  const backupNow = () => {
    try {
      flushPersistence(store)
    } catch (e) {
      /* 落盘失败也照样备份当前可读物 */
    }
    const key = backupSave('gm-manual')
    refreshBackups()
    note(key ? '当前进度已备份' : '备份失败：浏览器存储空间不足')
  }
  const importSave = payload => {
    const file = payload?.file
    if (!file) return
    const reader = new FileReader()
    reader.onload = e => {
      const result = importSaveText(e.target.result)
      if (!result.ok) {
        gameNotifys({ title: 'GM 导入失败', message: `${result.reason || '存档无效'}（当前进度未改动）`, type: 'error', duration: 9000 })
        return
      }
      stopPersistence()
      backupSave('gm-before-import')
      writeVault(result.boss || store.boss, result.player)
      note('存档已导入，即将刷新')
      setTimeout(() => location.reload(), 700)
    }
    reader.onerror = () => gameNotifys({ title: 'GM 导入失败', message: '文件读取失败', type: 'error' })
    reader.readAsText(file)
  }
  const restoreSave = backup => {
    ElMessageBox.confirm(`回滚到「${backup.label}」？当前进度会先自动备份一份。`, 'GM 回滚存档', {
      type: 'warning',
      confirmButtonText: '回滚',
      cancelButtonText: '取消'
    })
      .then(() => {
        const result = restoreBackup(backup.key)
        if (!result.ok) {
          gameNotifys({ title: 'GM 回滚失败', message: result.reason, type: 'error' })
          return
        }
        stopPersistence()
        note('已回滚，即将刷新')
        setTimeout(() => location.reload(), 700)
      })
      .catch(() => {})
  }
  const dropSaves = () => {
    ElMessageBox.confirm('将删除全部备份副本（不影响当前存档），确定？', 'GM 清空备份', {
      type: 'warning',
      confirmButtonText: '清空',
      cancelButtonText: '取消'
    })
      .then(() => {
        dropBackups()
        refreshBackups()
        note('备份已清空')
      })
      .catch(() => {})
  }
  refreshBackups()
  const exportSave = () => {
    try {
      flushPersistence(store)
    } catch (e) {
      /* ignore */
    }
    const blob = new Blob([exportSaveText(store.boss, player.value)], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `xiuxian-save-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
    note('存档已导出')
  }
</script>

<style scoped>
  .gm { text-align: left; padding: 0 6px; width: 100%; box-sizing: border-box; overflow-x: auto; }
  .gm :deep(.el-collapse-item__content) { display: block; width: 100%; }
  .gm-head { margin-bottom: 10px; }
  .title { font-size: 22px; font-weight: bold; margin-bottom: 4px; }
  .hint { font-size: 12px; color: var(--el-text-color-secondary); }
  .row { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; flex-wrap: wrap; width: 100%; box-sizing: border-box; }
  .row > span { flex: 0 0 auto; min-width: 60px; font-size: 13px; }
  .row > .el-select,
  .row > .el-input-number {
    flex: 1 1 auto;
    min-width: 110px;
    max-width: 240px;
  }
  .row > .el-button { flex-shrink: 0; }
  .current { margin-top: 14px; padding: 8px 12px; background: var(--el-fill-color-light); border-radius: 6px; font-size: 13px; }
  .backup-box {
    margin-top: 8px;
    padding: 8px 10px;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 6px;
  }
  .backup-head,
  .backup-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .backup-head { font-size: 13px; font-weight: bold; margin-bottom: 4px; }
  .backup-row { font-size: 12px; color: var(--el-text-color-secondary); margin: 4px 0; }
  .backup-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .backup-empty { font-size: 12px; color: var(--el-text-color-secondary); margin: 4px 0 8px; }
  .codex-panel {
    margin-bottom: 10px;
    padding: 8px 10px;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 6px;
  }
  .codex-head {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 6px;
    font-size: 13px;
  }
  .codex-milestones {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 8px;
    font-size: 11px;
  }
  .codex-milestones span {
    padding: 2px 6px;
    border-radius: 4px;
    background: var(--el-fill-color-light);
    color: var(--el-text-color-secondary);
  }
  .codex-milestones span.ready {
    background: var(--el-color-primary-light-9);
    color: var(--el-color-primary);
  }
  .codex-milestones span.claimed {
    background: var(--el-color-success-light-9);
    color: var(--el-color-success);
  }
  @media only screen and (max-width: 768px) {
    .gm { padding: 0 2px; }
    .row { flex-direction: column; align-items: stretch; gap: 4px; }
    .row > span { min-width: 0; width: 100%; font-size: 12px; }
    .row > .el-select,
    .row > .el-input-number { min-width: 0; max-width: none; width: 100%; }
    .row > .el-button { width: 100%; margin-top: 2px; }
  }
</style>
