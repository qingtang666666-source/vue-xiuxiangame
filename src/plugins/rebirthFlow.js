// 轮回流程 —— 供寿元耗尽 / 手动"下一世轮回"复用
// 重置这一世(境界/修为/年龄/宗门/NPC/资质)，保留永久传承(装备/功法/界域/转世/延寿)

import { rollInitAge, playerLifespan } from './time.js'
import { legacyStartMoney } from './rebirth.js'
import { ensureAptitude } from './aptitude.js'
import { ensureSect } from './sect.js'
import { ensureWorldNpcs } from './npcSystem.js'
import { applyBirthFamily, rollBirthFamily, birthFamilyInfo } from './birthFamily.js'
import { checkAchievements } from './achievementChecker.js'
import { rebirthDaoGain } from './rebirthShop.js'
import { rollInsight } from './insight.js'
import { resetMetaBuffs, applyMetaBuffs, rollFate, rollWorldRule, fateInfo } from './fate.js'
import { addSeasonPoints } from './season.js'

export const performRebirth = player => {
  const prevLevel = player.level
  player.rebirthMode = 'fresh' // 轮回模式统一为重开新世（保留永久传承，「完全重开」在设置里单独触发）
  player.level = 0
  player.taskNum = 0
  player.cultivation = 0
  player.points = 0
  player.pointAlloc = { attack: 0, defense: 0, health: 0 }
  player.maxCultivation = Math.floor(100 * (1 + (player.reincarnation || 0) * 0.4))
  player.reincarnation = (player.reincarnation || 0) + 1
  // 每轮回重roll悟性
  player.insight = rollInsight()
  // 结算这道轮回的道行，进入转世商店
  player.daoPoints = (player.daoPoints || 0) + rebirthDaoGain({ ...player, level: prevLevel })
  player.backpackCapacity += 50
  // 新生：年轻 + 重roll资质/宗门/NPC
  player.ageBase = rollInitAge()
  player.timeDays = 0
  player.timeAnchor = Date.now()
  player.age = player.ageBase
  player.props.money = (player.props.money || 0) + legacyStartMoney(player)
  player.health = player.maxHealth
  // 重开新世：清空本世数值/装备，只留转世数/界域/道行等宏传承
  if (player.rebirthMode === 'fresh') {
    player.inventory = []
    player.equipment = { sutra: {}, armor: {}, weapon: {}, accessory: {} }
    player.methods = {}
    player.techTask = null
    player.actionTimer = null
    player.pills = []
    player.talismans = []
    player.buffs = []
    player.talents = []
    player.skills = { alchemy: 0, forge: 0, talisman: 0, formation: 0 }
    player.techniques = 0
    player.attack = 10
    player.defense = 10
    player.health = 100
    player.maxHealth = 100
    player.critical = 0
    player.dodge = 0
    player.cultivationSpeed = 1
    player.score = 0
    player.points = 0
    player.alchemy = { moneyMult: 1, offlineMult: 1 }
    // 重开新世：本世灵石/混沌石/筹码清零
    player.props.money = 0
    player.props.currency = 0
    player.props.chips = 0
  }
  // 轮回多周目：道痕+1，随机本世命运/天道，给宿慧永久成长
  player.daoMark = (player.daoMark || 0) + 1
  resetMetaBuffs(player)
  const fate = rollFate(player)
  const world = rollWorldRule(player)
  applyMetaBuffs(player, fate, world)
  addSeasonPoints(player, 50)
  // 新一世可重新领取新手大礼包
  player.isNewbie = false
  ensureAptitude(player)
  ensureWorldNpcs(player)
  ensureSect(player)
  applyBirthFamily(player, rollBirthFamily())
  const newAch = checkAchievements(player, 'birth', player)
  return {
    reincarnation: player.reincarnation,
    age: player.ageBase,
    rootBone: player.aptitude?.rootBoneName,
    constitution: player.aptitude?.constitution,
    sect: player.sect?.name,
    sectGrade: player.sect?.gradeName,
    npcCount: player.worldNpcs?.length || 0,
    carriedInventory: player.inventory?.length || 0,
    carriedMethods: Object.keys(player.methods || {}).length,
    realmStage: player.realm?.stage || 0,
    lifespan: playerLifespan(player),
    startMoney: legacyStartMoney(player),
    family: player.birthFamily,
    familyName: birthFamilyInfo(player.birthFamily)?.name,
    grantedAchievements: newAch.map(a => a.name),
    mode: player.rebirthMode,
    fate: fate && { name: fate.name, desc: fate.desc },
    world: world && { name: world.name, desc: world.desc },
    daoMark: player.daoMark
  }
}

// 轮回结算文案（纯字符串，供弹窗复用）
export const rebirthSummaryHtml = info => {
  const c = info.constitution
  const constitutionText = !c || c.type === 'none' ? '凡体' : `${c.name}${c.awakened ? '(已觉醒)' : '(未觉醒)'}`
  return `
    <div style="text-align:left">
      <p style="text-align:center;font-weight:bold">已进入第 ${info.reincarnation} 世轮回</p>
      <div style="margin:8px 0"><b>继承(保留)</b>：装备 ${info.carriedInventory} 件 · 功法 ${info.carriedMethods} 门 · 界域印记 ${info.realmStage} 级</div>
      <div><b>新一世</b>：岁数 ${info.age} · 根骨《${info.rootBone}》 · 体质 ${constitutionText}</div>
      <div>宗门：${info.sect || '无'}(${info.sectGrade || '未入'}) · 开局灵石 +${info.startMoney}</div>
      <div>寿元 ${info.lifespan} 年 · 下界 NPC ${info.npcCount} 位</div>
      <div>出生家境：<b>${info.familyName}（${info.family}/10）</b></div>
      ${info.fate ? `<div>本世命运：<b style="color:#E6A23C">${info.fate.name}</b> ${info.fate.desc}</div>` : ''}
      ${info.world ? `<div>本世天道：<b style="color:#67C23A">${info.world.name}</b> ${info.world.desc}</div>` : ''}
      ${info.daoMark ? `<div style="color:#409EFF">道痕 +1，累计 <b>${info.daoMark}</b>（宿慧永久：每道痕 +4%修为、+2%灵石）</div>` : ''}
      ${info.grantedAchievements && info.grantedAchievements.length ? `<div style="color:#67C23A">新達成成就：${info.grantedAchievements.join('、')}</div>` : ''}
      <div style="color:#E6A23C">可在背包重新领取新手大礼包</div>
    </div>`
}

// 完全重开：不继承任何东西，回归“新号”
export const fullReset = player => {
  player.reincarnation = 0
  player.daoMark = 0
  player.realm = { stage: 0 }
  player.level = 1
  player.points = 0
  player.score = 0
  player.taskNum = 0
  player.cultivation = 0
  player.maxCultivation = 100
  player.cultivationSpeed = 1
  player.inventory = []
  player.equipment = { sutra: {}, armor: {}, weapon: {}, accessory: {} }
  player.methods = {}
  player.techniqueScrolls = []
  player.techniqueSet = { active: [], passive: [] }
  player.mainMethod = null
  player.techTask = null
  player.actionTimer = null
  player.learnFails = {}
  player.pills = []
  player.talismans = []
  player.buffs = []
  player.talents = []
  player.skills = { alchemy: 0, forge: 0, talisman: 0, formation: 0 }
  player.attack = 10
  player.defense = 10
  player.health = 100
  player.maxHealth = 100
  player.critical = 0
  player.dodge = 0
  player.backpackCapacity = 20
  player.props = { money: 0, currency: 0, chips: 0, spiritHerb: 0, strengtheningStone: 0, cultivateDan: 0, zhuSha: 0, xuanTie: 0, zhenQi: 0, yaoDan: 0, flying: 0, qingyuan: 0, rootBone: 0 }
  player.quests = { claimedFixed: [], selected: [], claimedSelected: [] }
  player.isNewbie = false
  player.timeDays = 0
  player.ageBase = 16
  player.age = 16
  player.worldNpcs = []
  player.pets = []
  player.birthFamily = null
  player.season = { points: 0 }
  player.chipShop = undefined
  player.highestTowerFloor = 0
  player.exploreWins = 0
  player.craftCount = 0
  player.bossKills = 0
  player.realmTimes = 0
  player.adventureTimes = 0
  player.gameWins = 0
  player.gameLosses = 0
  player.strengthenCount = 0
  return { ok: true }
}
