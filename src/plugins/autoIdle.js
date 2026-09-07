// 自动挂机 —— 开启后后台自动 探索野怪 / 秘境 / 任务

import { exploreRealm, REALMS } from './secretRealm.js'
import { claimSelected, selectQuest, selectableQuests } from './quest.js'
import { computeMaxCultivation, realmStageOf } from './game.js'
import { drawTalentForPlayer } from './talent.js'
import { isTribulationLevel } from './tribulation.js'
import { checkAchievements } from './achievementChecker.js'
import { playerLifespan, gameAge } from './time.js'
import { addSeasonPoints } from './season.js'

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min

// 模拟击杀一只野怪
const simulateExploreKill = player => {
  player.taskNum = (player.taskNum || 0) + 1
  player.exploreWins = (player.exploreWins || 0) + 1
  const d = (player.reincarnation || 0) + 1
  player.props.cultivateDan = (player.props.cultivateDan || 0) + d
  // 小概率掉点材料
  if (Math.random() < 0.15) {
    const keys = ['spiritHerb', 'strengtheningStone', 'zhuSha', 'xuanTie', 'zhenQi', 'yaoDan']
    const k = keys[randInt(0, keys.length - 1)]
    player.props[k] = (player.props[k] || 0) + randInt(1, Math.max(1, Math.floor((player.level || 1) / 20)))
  }
}

// 自动进当前可入、负担得起的最高秘境
const autoRealm = player => {
  const realm = REALMS.filter(r => player.level >= r.minLevel && (player.props.money || 0) >= r.fee && player.health > 0)
    .sort((a, b) => b.minLevel - a.minLevel)[0]
  if (!realm) return false
  exploreRealm(player, realm.id)
  return true
}

// 自动领已完成自选任务 + 补选
const autoQuest = player => {
  const list = selectableQuests(player)
  list.filter(s => s.selected && s.progress >= s.target).forEach(s => claimSelected(player, s.id))
  let slots = 3 - list.filter(s => s.selected).length
  if (slots > 0) {
    const sortObj = selectableQuests(player).filter(s => !s.selected && !s.claimed).sort((a, b) => (b.progress / b.target) - (a.progress / a.target))
    for (const s of sortObj) {
      if (slots <= 0) break
      selectQuest(player, s.id)
      slots--
    }
  }
}

// 自动突破：仅在有把握时安全突破（渡劫/缺丹药/寿元不足会自动中止）
const autoBreakthrough = player => {
  const nextLv = (player.level || 0) + 1
  if (nextLv > 143) return false
  if ((player.cultivation || 0) < (player.maxCultivation || 100)) return false
  // 每 3 小段 / 大境界的"试炼门槛"(含战力校验)必须手动完成，自动不绕过——
  // 避免 历战/无尽塔/探索 刷修为后自动挂机直接突破
  if ((player.level || 0) >= 9 && ((player.level || 0) + 1) % 3 === 1) return false
  if (isTribulationLevel(nextLv) && !(player.passedTribulation || []).includes(nextLv)) return false
  const prevStage = realmStageOf(player.level || 1)
  const targetStage = realmStageOf(nextLv)
  const willCross = targetStage > prevStage
  if (willCross && player.level >= 19) {
    const danNeed = Math.max(1, Math.ceil(player.level / 15))
    if ((player.props.cultivateDan || 0) < danNeed) return false
    player.props.cultivateDan -= danNeed
  }
  if (willCross) {
    const req = 30 + targetStage * 15
    const rem = playerLifespan(player) - gameAge(player)
    if (rem < req) return false
  }
  player.taskNum = 0
  const oldMax = player.maxCultivation
  player.level++
  player.points = (player.points || 0) + 3
  drawTalentForPlayer(player, {})
  checkAchievements(player, 'cultivation', player)
  checkAchievements(player, 'talent', player)
  addSeasonPoints(player, 2)
  player.health = player.maxHealth
  player.maxCultivation = computeMaxCultivation(player.level, player.reincarnation || 0)
  // 突破后只结转超出旧上限的修为，避免进度虚高
  player.cultivation = Math.max(0, (player.cultivation || 0) - oldMax)
  return true
}

export const autoIdleTick = player => {
  const a = player.autoIdle || {}
  let acted = false
  if (a.explore && player.health > 0 && (player.level || 0) >= 1) {
    simulateExploreKill(player)
    acted = true
  }
  if (a.realm && player.health > 0) {
    if (autoRealm(player)) acted = true
  }
  if (a.quest) {
    autoQuest(player)
    acted = true
  }
  if (a.breakthrough) {
    let guard = 0
    while (guard++ < 20 && autoBreakthrough(player)) acted = true
  }
  return acted
}
