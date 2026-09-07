<template>
  <div class="cultivate">
    <div class="cultivation-info">
      <div class="realm-display">
        当前境界：
        <span class="realm-text" v-text="`${levelNames(player.level)}(${player.reincarnation || 0}转)`" />
      </div>
      <el-progress
        :percentage="cultivationPercentage"
        :format="percentage => `${percentage.toFixed(2)}%`"
        text-inside
        :stroke-width="20"
        status="success"
        class="custom-progress"
      />
      <div class="cultivate-flavor" v-if="flavorText">{{ flavorText }}</div>
      <div class="cultivate-stats">
        <span class="stat">修炼速度 ×<b>{{ cultSpeed.toFixed(2) }}</b></span>
        <span class="stat" v-if="breakthroughInfo">下一境界：<b>{{ breakthroughInfo.next }}</b> · 还需 {{ formatNumberToChineseUnit(breakthroughInfo.remain) }} · {{ breakthroughInfo.reqText }}</span>
        <span class="stat" v-if="nextTrib">渡劫将至：<b class="trib">{{ nextTrib.name }}</b></span>
      </div>
    </div>
    <div class="storyText">
      <div class="storyText-box">
        <el-scrollbar ref="scrollbar" always>
          <p v-for="(item, index) in texts" :key="index" v-html="item" />
        </el-scrollbar>
      </div>
    </div>
    <div class="actions">
      <div class="action" v-for="(item, index) in buttonsFor" :key="index">
        <el-button class="item" @click="item.click" :disabled="item.disabled">{{ item.text }}</el-button>
      </div>
    </div>
  </div>
  <BreakthroughTrial
    :visible="breakthroughTrialShow"
    @update:visible="breakthroughTrialShow = $event"
    @success="onTrialSuccess"
    @fail="onTrialFail"
  />
</template>

<script setup>
  import { ref, computed, onUnmounted, onMounted } from 'vue'
  import { useMainStore } from '@/plugins/store'
  import equip from '@/plugins/equip'
  import { maxLv, smoothScrollToBottom, levelNames, gameNotifys, computeMaxCultivation, realmStageOf, formatNumberToChineseUnit } from '@/plugins/game'
  import { playerLifespan, gameAge } from '@/plugins/time'
  import { drawTalentForPlayer, TALENT_QUALITY, getTalentById } from '@/plugins/talent'
  import { manorTalentBoost } from '@/plugins/manor'
  import { idleRates } from '@/plugins/alchemy'
  import { ensureWorldNpcs } from '@/plugins/npcSystem'
  import { ensureSect } from '@/plugins/sect'
  import { isTribulationLevel, tribulationOf, conductTribulation } from '@/plugins/tribulation'
  import { playerPowerScore, breakthroughPowerNeed, MAX_STAGE_FAILS, BREAKTHROUGH_CD_FAIL, initGateState } from '@/plugins/breakthroughGate'
  import { bumpDaily } from '@/plugins/dailyGoals'
  import BreakthroughTrial from '@/components/BreakthroughTrial.vue'
  import { checkAchievements } from '@/plugins/achievementChecker'
  import { celebrate } from '@/plugins/celebrate'
  import { ElMessageBox } from 'element-plus'
  import { rollTechniqueDrop } from '@/plugins/technique'

  const store = useMainStore()
  const texts = ref([])
  const player = ref(store.player)
  const isStop = ref(false)
  const isStart = ref(false)
  const timerIds = ref([])
  const observer = ref(null)
  const scrollbar = ref(null)
  const breakthroughTrialShow = ref(false)
  let trialPassed = false
  let pendingMajor = false
  const buttonsFor = computed(() => {
    return [
      { text: '开始修炼', click: () => startCultivate(), disabled: !isStart.value },
      { text: '停止修炼', click: () => stopCultivate(), disabled: !isStop.value },
      { text: '渡劫', click: () => doTribulation(), disabled: !canTribulation.value },
      { text: '转生突破', click: () => reincarnationBreakthrough() }
    ]
  })

  const cultivationPercentage = computed(() => {
    const { cultivation, maxCultivation } = player.value
    return Math.min(100, (cultivation / maxCultivation) * 100)
  })

  const nextTrib = computed(() => {
    const lv = player.value.level + 1
    if (isTribulationLevel(lv) && !(player.value.passedTribulation || []).includes(lv)) return tribulationOf(lv)
    return null
  })
  const canTribulation = computed(() => !!nextTrib.value)

  // 修炼意境语（轮换，让界面有仙家韵味）
  const FLAVOR_QUOTES = [
    '灵气自天灵穴涌入，周天运转，丹田渐暖。',
    '心如止水，一念不起，道韵自生。',
    '冥冥之中似有感悟，却又抓之不住……',
    '灵台清明，神游太虚，仿佛触到一丝大道痕迹。',
    '青灯古卷，打坐参玄，尘世喧嚣尽抛脑后。',
    '气息绵长，百会清凉，一股暖流顺任督而行。',
    '紫气东来，灵气盈室，修行更进一程。',
    '闭目内观，识海波澜不惊，道果渐熟。',
    '晨钟暮鼓，吐纳之间，境界悄然松动。',
    '道可道，非常道；名可名，非常名——恍然又悟一分。'
  ]
  const flavorText = ref(FLAVOR_QUOTES[0])
  let flavorTimer = null
  const nextLevel = computed(() => levelNames(Math.min(maxLv, player.value.level + 1)))
  const cultSpeed = computed(() => idleRates(player.value).cultivationSpeed)
  const breakthroughInfo = computed(() => {
    const p = player.value
    if (p.level >= maxLv) return null
    const nextLv = p.level + 1
    const remain = Math.max(0, p.maxCultivation - p.cultivation)
    const req = []
    if (isTribulationLevel(nextLv) && !(p.passedTribulation || []).includes(nextLv)) req.push(`渡【${tribulationOf(nextLv).name}】`)
    const prevStage = realmStageOf(p.level)
    const targetStage = realmStageOf(nextLv)
    const willCross = targetStage > prevStage
    if (willCross && p.level >= 19) {
      const danNeed = Math.max(1, Math.ceil(p.level / 15))
      req.push(`培养丹×${danNeed}`)
      const treq = 30 + targetStage * 15
      const rem = playerLifespan(p) - gameAge(p)
      req.push(`余寿≥${treq}`)
    }
    return { next: levelNames(nextLv), remain, reqText: req.length ? '需 ' + req.join('、') : '可直接突破' }
  })

  const doTribulation = () => {
    const res = conductTribulation(player.value)
    if (res.ok) {
      celebrate(`渡过【${res.name}】`)
      texts.value.push(`<span style="color: #E6A23C">【${res.name}】渡过！获得永久劫后加成</span>`)
      gameNotifys({ title: '渡劫成功', message: `渡过【${res.name}】，获得劫后加成`, type: 'success' })
      // 渡劫成功后完成剩余突破
      if (player.value.cultivation >= player.value.maxCultivation) breakThrough(0)
    } else {
      texts.value.push(`<span style="color: #F56C6C">${res.reason}</span>`)
      gameNotifys({ title: '渡劫失败', message: res.reason, type: 'error' })
    }
  }

  const startCultivate = () => {
    isStart.value = false
    const zs = player.value.reincarnation * 10
    const time = zs >= 200 ? 100 : 300 - zs
    const timerId = setInterval(() => {
      if (player.value.cultivation <= player.value.maxCultivation) {
        isStop.value = true
        isStart.value = false
        const baseExp =
          player.value.level <= 10
            ? Math.floor(player.value.maxCultivation / equip.getRandomInt(15, 45))
            : Math.floor(player.value.maxCultivation / (160 + realmStageOf(player.value.level) * 40))
        const exp = Math.floor(baseExp * idleRates(player.value).cultivationSpeed)
        texts.value.push(
          player.value.level < maxLv
            ? '你开始冥想，吸收周围的灵气。修为提升了！'
            : '你当前的境界已修炼圆满, 需要转生后才能继续修炼'
        )
        breakThrough(exp)
        // 10%的概率触发随机事件
        if (Math.random() < 0.1) triggerRandomEvent()
      } else {
        breakThrough(100)
      }
    }, time)
    timerIds.value.push(timerId)
  }

  const triggerRandomEvent = () => {
    const randomEvents = [
      { type: 'resource', name: '灵石', amount: 100, description: '你发现了一堆灵石！' },
      { type: 'cultivation', name: '顿悟', amount: 500, description: '你突然顿悟，修为大涨！' },
      { type: 'item', name: '丹药', effect: '增加100点修为', description: '你服下一颗丹药，药力化开，修为小涨！' },
      { type: 'skill', name: '剑法', effect: '增加10%攻击力', description: '你领悟了一门高深剑法！' },
      { type: 'lucky', name: '雷劫', effect: '修为降低10%', description: '你遭遇了雷劫！' },
      { type: 'comprehension', name: '悟道', effect: '修为大涨', description: '你观日月运转，忽有所得，修为大涨！' },
      { type: 'vision', name: '问心', effect: '道心愈坚', description: '心魔作祟，你反躬自省，道心愈坚！' },
      { type: 'herb', name: '灵泉浇灌', amount: 12, description: '你寻得一汪灵泉，灵草疯长，收获颇丰！' },
      { type: 'treasure', name: '洞府福地', amount: 8, description: '你闯入一处洞府福地，寻得不少炼器石！' },
      { type: 'heal', name: '灵气洗髓', description: '灵气入体，旧伤尽去，气血充盈！' },
      { type: 'tech', name: '残缺功法', description: '你于石壁间偶得一门残缺功法！' },
      { type: 'danger', name: '邪祟袭扰', effect: '修为略有损耗', description: '有邪祟袭扰，你驱散之却耗了些精力。' },
      { type: 'mind', name: '心魔反噬', effect: '气血受损', description: '心魔骤起，你以道心镇压，气血微损。' },
      { type: 'longevity', name: '寿元机缘', amount: 1, description: '你偶得一株延寿灵药，寿元略增！' }
    ]
    const event = randomEvents[Math.floor(Math.random() * randomEvents.length)]
    texts.value.push(`<span style="color: #E6A23C">${event.description}</span>`)
    switch (event.type) {
      case 'resource':
        player.value.props.money += event.amount
        break
      case 'cultivation':
        player.value.cultivation += event.amount
        break
      case 'item':
        player.value.cultivation += player.value.cultivation * 0.05
        break
      case 'lucky':
        player.value.cultivation -= player.value.cultivation * 0.1
        break
      case 'skill':
        player.value.attack *= 1.1
        break
      case 'comprehension':
        player.value.cultivation += player.value.maxCultivation * 0.06
        break
      case 'vision':
        player.value.cultivation += Math.max(1, player.value.cultivation * 0.02)
        break
      case 'herb':
        player.value.props.spiritHerb += event.amount
        break
      case 'treasure':
        player.value.props.strengtheningStone += event.amount
        break
      case 'heal':
        player.value.health = player.value.maxHealth
        texts.value.push(`<span style="color: #67C23A">你的气血已恢复至满！</span>`)
        break
      case 'tech': {
        const r = rollTechniqueDrop(player.value)
        if (r.ok) texts.value.push(`<span style="color: #409EFF">获得功法卷轴【${r.name}】！可去「功法」参悟</span>`)
        else texts.value.push(`<span style="color: #909399">可惜残篇难辨，难窥真意。</span>`)
        break
      }
      case 'danger':
        player.value.cultivation -= player.value.cultivation * 0.05
        break
      case 'mind':
        player.value.health = Math.max(1, (player.value.health || 0) - Math.floor((player.value.maxHealth || 100) * 0.05))
        break
      case 'longevity':
        player.value.lifespanBonus += event.amount
        gameNotifys({ title: '寿元机缘', message: `寿元 +${event.amount} 年`, type: 'success' })
        break
    }
  }

  const stopCultivate = () => {
    timerIds.value.forEach(id => {
      clearInterval(id)
    })
    timerIds.value = []
    isStart.value = true
    isStop.value = false
  }

  const breakThrough = exp => {
    initGateState(player.value)
    const reincarnation = player.value.reincarnation ? player.value.reincarnation + 1 : 1
    if (player.value.level < maxLv) {
      if (player.value.cultivation >= player.value.maxCultivation) {
        const nextLv = player.value.level + 1
        const prevStage = realmStageOf(player.value.level)
        const targetStage = realmStageOf(nextLv)
        const willCross = targetStage > prevStage
        // 高阶：关键境界节点需渡劫
        if (isTribulationLevel(nextLv) && !(player.value.passedTribulation || []).includes(nextLv)) {
          stopCultivate()
          isStop.value = false
          isStart.value = false
          texts.value.push(`<span style="color: #F56C6C">天劫将至！请先渡【${tribulationOf(nextLv).name}】方可突破</span>`)
          return
        }
        // 中阶以上冲击大境界：需吞服丹药（培养丹）；低阶(1~18)及小境界内突破自由
        if (willCross && player.value.level >= 19 && !trialPassed) {
          const danNeed = Math.max(1, Math.ceil(player.value.level / 15))
          if ((player.value.props.cultivateDan || 0) < danNeed) {
            stopCultivate()
            isStop.value = false
            isStart.value = false
            texts.value.push(`<span style="color: #E6A23C">突破需 ${danNeed} 枚培养丹（当前 ${player.value.props.cultivateDan || 0}），可先炼丹或获取</span>`)
            return
          }
          player.value.props.cultivateDan -= danNeed
        }
        // 寿元不足无法冲击更高境界
        if (willCross) {
          const req = 30 + targetStage * 15 // 越高境界，突破所需余寿越多
          const rem = playerLifespan(player.value) - gameAge(player.value)
          if (rem < req) {
            stopCultivate()
            isStop.value = false
            isStart.value = false
            texts.value.push(`<span style="color: #F56C6C">寿元不足（需余寿 ${req} 年），无法冲击更高境界！请服延寿丹或转世轮回</span>`)
            return
          }
        }
        // 大境界突破门槛：需正式战力击败同阶对手，失败计次并进入冷却，超过上限此生无法再突破
        if (player.value.level >= 9 && (player.value.level + 1) % 3 === 1) {
          const stage = targetStage
          const fails = player.value.stageFails[stage] || 0
          if (willCross && fails >= MAX_STAGE_FAILS) {
            stopCultivate()
            isStop.value = false
            isStart.value = false
            texts.value.push(`<span style="color: #F56C6C">此【${levelNames(nextLv)}】突破已失败 ${fails} 次，此生无法再突破！</span>`)
            return
          }
          if ((player.value.btCdUntil || 0) > Date.now()) {
            const sec = Math.max(1, Math.ceil((player.value.btCdUntil - Date.now()) / 1000))
            stopCultivate()
            isStop.value = false
            isStart.value = false
            texts.value.push(`<span style="color: #E6A23C">突破试炼冷却中，还需 ${sec} 秒</span>`)
            return
          }
          const need = breakthroughPowerNeed(player.value.level)
          const power = playerPowerScore(player.value)
          if (power < need) {
            stopCultivate()
            isStop.value = false
            isStart.value = false
            texts.value.push(`<span style="color: #F56C6C">战力未达标（需 ${need.toLocaleString('zh-CN')}，当前 ${power.toLocaleString('zh-CN')}），无法突破！请先强化装备/功法</span>`)
            return
          }
        }
        if (player.value.level >= 9 && (player.value.level + 1) % 3 === 1 && !trialPassed) {
          pendingMajor = willCross
          stopCultivate()
          isStop.value = false
          isStart.value = false
          texts.value.push(`<span style="color: #E6A23C">条件已满足！是否开始突破试炼（击败 2 名同阶对手）？</span>`)
          ElMessageBox.confirm('突破条件已满足，是否进入突破试炼？需击败 2 名同阶对手。', '突破确认', {
            center: true,
            confirmButtonText: '开始突破',
            cancelButtonText: '暂不突破'
          })
            .then(() => { breakthroughTrialShow.value = true })
            .catch(() => {})
          return
        }
        player.value.taskNum = 0
        player.value.level++
        bumpDaily(player.value, 'cultivate')
        // 寿元大增提示(跨越新大境界)
        if (realmStageOf(player.value.level) > prevStage) {
          celebrate(`突破【${levelNames(player.value.level)}】`)
          ElMessageBox.alert(
            `<div style="text-align:center;line-height:1.9">
              <div style="font-size:22px;font-weight:bold;color:#E6A23C">✨ 突破成功 ✨</div>
              <div style="font-size:16px;margin-top:6px">你踏入了 <b style="color:#409EFF">${levelNames(player.value.level)}</b></div>
              <div style="color:#67C23A;font-size:14px">寿元大增！提升至 ${playerLifespan(player.value)} 年 · 境界点 +3</div>
            </div>`,
            '境界突破',
            { dangerouslyUseHTMLString: true, confirmButtonText: '继续修行' }
          ).catch(() => {})
          texts.value.push(`<span style="color: #E6A23C">寿元大增！你的寿元提升至 ${playerLifespan(player.value)} 年</span>`)
          gameNotifys({
            title: '寿元大增',
            message: `突破【${levelNames(player.value.level)}】，寿元提升至 ${playerLifespan(player.value)} 年`,
            type: 'success'
          })
        }
        player.value.points += 3
        // 突破升级触发天赋抽取，等级越高抽到好天赋概率越大
        const { talent, isNew } = drawTalentForPlayer(player.value, { goodBonus: manorTalentBoost(player.value) })
        // 同时检查修炼成就与天赋成就，达成即发放永久加成
        const newAch = [...checkAchievements(player.value, 'cultivation', player.value), ...checkAchievements(player.value, 'talent', player.value)]
        newAch.forEach(ach => {
          texts.value.push(`<span style="color: #E6A23C">成就达成【${ach.name}】：${ach.desc}</span>`)
          gameNotifys({ title: '成就达成', message: `【${ach.name}】已完成，获得永久加成`, type: 'success' })
        })
        const qualityName = TALENT_QUALITY[talent.quality].name
        const talentInfo = getTalentById(talent.id)
        const count = (player.value.talents.find(t => t.id === talent.id) || {}).count || 1
        texts.value.push(
          isNew
            ? `$${qualityName}机缘！你领悟了【${talent.name}】：${talentInfo.desc}`
            : `$${qualityName}机缘！${talent.name} 再度参悟，已至 ${count} 层。`
        )
        gameNotifys({
          title: '机缘感悟',
          message: isNew
            ? `你领悟了【${talent.name}】(${qualityName})\n${talentInfo.desc}`
            : `【${talent.name}】(${qualityName}) 已提升至 ${count} 层`,
          dangerouslyUseHTMLString: true
        })
        player.value.health = player.value.maxHealth
        const oldMax = player.value.maxCultivation
        player.value.maxCultivation = computeMaxCultivation(player.value.level, reincarnation)
        // 突破后清零修为：只结转超出旧上限的溢出，避免进度直接跳到 90%+
        player.value.cultivation = Math.max(0, (player.value.cultivation || 0) - oldMax)
        texts.value.push(`恭喜你突破了！当前境界：${levelNames(player.value.level)}`)
      } else {
        player.value.cultivation += exp
      }
    } else {
      isStop.value = false
      isStart.value = false
      player.value.level = maxLv
      player.value.maxCultivation = computeMaxCultivation(maxLv, reincarnation)
      stopCultivate()
    }
  }

  const reincarnationBreakthrough = () => {
    if (player.value.level == maxLv) {
      if (player.value.points) {
        gameNotifys({ title: '未满足转生条件', message: `当前还有${player.value.points}境界点未使用, 无法转生` })
        return
      }
      const cost = { money: Math.floor((player.value.reincarnation + 1) * 300000), currency: player.value.reincarnation + 1 }
      if ((player.value.props.money || 0) < cost.money) {
        gameNotifys({ title: '未满足转生条件', message: `需 ${cost.money} 灵石（当前 ${player.value.props.money || 0}）` })
        return
      }
      if ((player.value.props.currency || 0) < cost.currency) {
        gameNotifys({ title: '未满足转生条件', message: `需 ${cost.currency} 混沌石（当前 ${player.value.props.currency || 0}）` })
        return
      }
      {
        const txt =
          player.value.reincarnation == 0
            ? '转生之后的敌人属性是转生前的百倍<br>转生前请务必确认自己的实力是否足够战胜转生后的对手, 避免卡档后删档重练'
            : '转生操作不可逆, 是否确定要转生?'
        ElMessageBox.confirm(txt, '转生提醒', {
          center: true,
          cancelButtonText: '取消转生',
          confirmButtonText: '立即转生',
          dangerouslyUseHTMLString: true
        })
          .then(() => {
            // 重开一世：灵石/混沌石/筹码清零
            player.value.props.money = 0
            player.value.props.currency = 0
            player.value.props.chips = 0
            player.value.level = 0
            player.value.taskNum = 0
            player.value.stageFails = {}
            player.value.btCdUntil = 0
            player.value.tribulationCdUntil = 0
            player.value.cultivation = 0
            player.value.maxCultivation = computeMaxCultivation(0, player.value.reincarnation)
            player.value.reincarnation++
            ensureWorldNpcs(player.value)
            ensureSect(player.value)
            player.value.backpackCapacity += 50
            gameNotifys({ title: '转生提示', message: `转生成功, 当前为${player.value.reincarnation}转, 背包总容量增加50; 本世灵石/混沌石/筹码已清零`, dangerouslyUseHTMLString: true })
          })
          .catch(() => {})
      }
    } else {
      gameNotifys({
        title: '未满足转生条件',
        message: `境界需要达到<span class="textColor">${levelNames(maxLv)}</span>才能满足转生条件`,
        dangerouslyUseHTMLString: true
      })
    }
  }


  const onTrialSuccess = () => {
    trialPassed = true
    breakThrough(0)
    trialPassed = false
  }

  const onTrialFail = () => {
    player.value.btCdUntil = Date.now() + BREAKTHROUGH_CD_FAIL
    if (!pendingMajor) {
      texts.value.push(`突破试炼失败！请提升战力后再挑战`)
      return
    }
    const stage = realmStageOf(player.value.level + 1)
    if (!player.value.stageFails) player.value.stageFails = {}
    const f = (player.value.stageFails[stage] || 0) + 1
    player.value.stageFails[stage] = f
    texts.value.push(`<span style="color: #F56C6C">突破试炼失败！第 ${f}/${MAX_STAGE_FAILS} 次。请强化装备/功法、提升战力后再挑战</span>`)
  }

  const setupObserver = () => {
    const element = scrollbar.value?.wrapRef
    if (element) {
      observer.value = new MutationObserver(() => smoothScrollToBottom(element))
      observer.value.observe(element, { subtree: true, childList: true })
    }
  }

  const stopObserving = () => {
    if (observer.value) {
      observer.value.disconnect()
      observer.value = null
    }
  }

  onMounted(() => {
    startCultivate()
    setupObserver()
    let idx = 0
    flavorTimer = setInterval(() => {
      idx = (idx + 1) % FLAVOR_QUOTES.length
      flavorText.value = FLAVOR_QUOTES[idx]
    }, 8000)
  })

  onUnmounted(() => {
    stopCultivate()
    stopObserving()
    if (flavorTimer) clearInterval(flavorTimer)
  })
</script>

<style scoped>
  .cultivate {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    max-width: 600px;
    margin: 0 auto;
  }

  .cultivate-flavor {
    margin-top: 10px;
    font-size: 13px;
    color: var(--el-color-primary);
    font-style: italic;
    opacity: 0.85;
  }

  .cultivate-stats {
    margin-top: 8px;
    display: flex;
    flex-wrap: wrap;
    gap: 6px 16px;
    justify-content: center;
    font-size: 13px;
    color: var(--el-text-color-secondary);
  }

  .stat b { color: var(--el-color-success); }
  .stat .trib { color: var(--el-color-danger); }

  .cultivation-info {
    width: 100%;
    margin-bottom: 20px;
  }

  .custom-progress {
    width: 100%;
  }

  .realm-display {
    margin-bottom: 10px;
    font-size: 16px;
    text-align: center;
  }

  .realm-text {
    color: var(--el-color-primary);
    font-weight: bold;
  }

  .storyText {
    width: 100%;
  }

  .storyText-box {
    max-height: 300px;
    overflow-y: auto;
    padding: 10px;
    border: 1px solid #dcdfe6;
    border-radius: 4px;
    margin-bottom: 20px;
    width: 100%;
    box-sizing: border-box;
  }

  .actions {
    width: 100%;
  }

  .action {
    width: calc(25% - 10px);
  }

  .item {
    width: 100%;
  }

  .event-text {
    color: #e6a23c;
    font-weight: bold;
  }

  @media (max-width: 768px) {
    .action {
      width: calc(50% - 10px);
    }
  }
</style>
