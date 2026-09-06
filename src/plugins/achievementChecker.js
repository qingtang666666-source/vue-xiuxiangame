import achievement from '@/plugins/achievement'
import { TALENTS } from '@/plugins/talent'
import { addSeasonPoints } from './season.js'

export const checkAchievements = (player, type, data) => {
  const newAchievements = []
  switch (type) {
    case 'pet':
      checkPetAchievements(player, data, newAchievements)
      break
    case 'monster':
      checkMonsterAchievements(player, data, newAchievements)
      break
    case 'equipment':
      checkEquipmentAchievements(player, data, newAchievements)
      break
    case 'cultivation':
      checkCultivationAchievements(player, newAchievements)
      break
    case 'talent':
      checkTalentAchievements(player, newAchievements)
      break
    case 'birth':
      checkBirthAchievements(player, newAchievements)
      break
    case 'life':
      checkLifeAchievements(player, newAchievements)
      break
    case 'craft':
      checkCraftAchievements(player, newAchievements)
      break
  }
  if (newAchievements.length) addSeasonPoints(player, newAchievements.length * 5)
  return newAchievements
}

const checkPetAchievements = (player, pet, newAchievements) => {
  const petAchievements = achievement.pet()
  petAchievements.forEach(item => {
    if (!player.achievement.pet.find(i => i.id === item.id) && checkCondition(item.condition, pet)) {
      newAchievements.push(item)
      player.achievement.pet.push({ id: item.id })
      player.props.cultivateDan += item.award
    }
  })
}

const checkMonsterAchievements = player => {
  const monsterAchievements = achievement.monster()
  monsterAchievements.forEach(item => {
    if (!player.achievement.monster.find(i => i.id === item.id) && checkCondition(item.condition, player)) {
      player.achievement.monster.push({ id: item.id })
      player.props.cultivateDan += item.award
    }
  })
}

const checkEquipmentAchievements = (player, equipmentData, newAchievements) => {
  const equipmentAchievements = achievement.equipment()
  equipmentAchievements.forEach(item => {
    if (!player.achievement.equipment.find(i => i.id === item.id) && checkCondition(item.condition, equipmentData)) {
      newAchievements.push(item)
      player.achievement.equipment.push({ id: item.id })
      player.props.cultivateDan += item.award
    }
  })
}

const checkCondition = (condition, data) => {
  for (const [key, value] of Object.entries(condition)) {
    if (data[key] === undefined || data[key] < value) {
      return false
    }
  }
  return true
}

// 应用永久加成 perk 到玩家属性（仅达成成就时调用一次）
const applyPerk = (player, perk) => {
  if (!perk) return
  Object.entries(perk).forEach(([key, value]) => {
    switch (key) {
      case 'attack':
        player.attack += value
        break
      case 'defense':
        player.defense += value
        break
      case 'health':
        player.maxHealth += value
        player.health += value
        break
      case 'critical':
        player.critical += value
        break
      case 'dodge':
        player.dodge += value
        break
      case 'cultivationSpeed':
        player.cultivationSpeed = (player.cultivationSpeed || 1) + value
        break
      case 'moneyMult':
        if (!player.alchemy) player.alchemy = { moneyMult: 1, offlineMult: 1 }
        player.alchemy.moneyMult *= 1 + value
        break
      case 'daoPoints':
        player.daoPoints = (player.daoPoints || 0) + value
        break
      case 'daoMark':
        player.daoMark = (player.daoMark || 0) + value
        break
      case 'currency':
        player.props.currency = (player.props.currency || 0) + value
        break
      case 'chips':
        player.props.chips = (player.props.chips || 0) + value
        break
      case 'lifespanBonus':
        player.lifespanBonus = (player.lifespanBonus || 0) + value
        break
    }
  })
}

// 修炼成就：按 player.level / player.reincarnation 判断
const checkCultivationAchievements = (player, newAchievements) => {
  const list = achievement.cultivation()
  list.forEach(item => {
    if (!player.achievement.cultivation.find(i => i.id === item.id) && checkCondition(item.condition, player)) {
      newAchievements.push(item)
      player.achievement.cultivation.push({ id: item.id })
      player.props.cultivateDan += item.award
      applyPerk(player, item.perk)
    }
  })
}

// 天赋成就：把 player.talents 归一化成条件字段后判断
const checkTalentAchievements = (player, newAchievements) => {
  const list = achievement.talent()
  const talentStat = computeTalentStat(player)
  list.forEach(item => {
    if (!player.achievement.talent.find(i => i.id === item.id) && checkCondition(item.condition, talentStat)) {
      newAchievements.push(item)
      player.achievement.talent.push({ id: item.id })
      player.props.cultivateDan += item.award
      applyPerk(player, item.perk)
    }
  })
}

// 归一化玩家已获得天赋的品质/数量统计
const computeTalentStat = player => {
  const talents = player.talents || []
  const qualityMap = {}
  talents.forEach(t => {
    const detail = TALENTS.find(x => x.id === t.id)
    if (detail) qualityMap[detail.quality] = (qualityMap[detail.quality] || 0) + 1
  })
  const rarePlus = (qualityMap.rare || 0) + (qualityMap.epic || 0) + (qualityMap.legendary || 0)
  return {
    talentCount: talents.length,
    rarePlus,
    legendary: qualityMap.legendary || 0
  }
}

// 出生家庭成就：归一化条件字段
const checkBirthAchievements = (player, newAchievements) => {
  const list = achievement.birth()
  if (!player.achievement.birth) player.achievement.birth = []
  const stat = computeBirthStat(player)
  list.forEach(item => {
    if (!player.achievement.birth.find(i => i.id === item.id) && checkCondition(item.condition, stat)) {
      newAchievements.push(item)
      player.achievement.birth.push({ id: item.id })
      player.props.cultivateDan += item.award
      applyPerk(player, item.perk)
    }
  })
}

const computeBirthStat = player => ({
  maxFamily: player.birthFamily || 0,
  lowFamily: (player.birthFamily || 10) <= 3 ? 1 : 0,
  level: player.level || 0,
  reincarnation: player.reincarnation || 0
})

const checkLifeAchievements = (player, newAchievements) => {
  const list = achievement.life()
  if (!player.achievement.life) player.achievement.life = []
  const stat = computeLifeStat(player)
  list.forEach(item => {
    if (!player.achievement.life.find(i => i.id === item.id) && checkCondition(item.condition, stat)) {
      newAchievements.push(item)
      player.achievement.life.push({ id: item.id })
      player.props.cultivateDan += item.award
      applyPerk(player, item.perk)
    }
  })
}

const computeLifeStat = player => ({
  adventure: player.adventureTimes || 0,
  realmTimes: player.realmTimes || 0,
  reincarnation: player.reincarnation || 0,
  realmStage: player.realm?.stage || 0
})

// 技艺成就：悟性 / 技艺阶位 / 功法熟练度 / 天材地宝收藏
const checkCraftAchievements = (player, newAchievements) => {
  const list = achievement.craft()
  if (!player.achievement.craft) player.achievement.craft = []
  const stat = computeCraftStat(player)
  list.forEach(item => {
    if (!player.achievement.craft.find(i => i.id === item.id) && checkCondition(item.condition, stat)) {
      newAchievements.push(item)
      player.achievement.craft.push({ id: item.id })
      player.props.cultivateDan += item.award
      applyPerk(player, item.perk)
    }
  })
}

const computeCraftStat = player => {
  const skills = player.skills || {}
  const anyCraft11 =
    (skills.alchemy || 0) >= 11 || (skills.forge || 0) >= 11 || (skills.talisman || 0) >= 11 || (skills.formation || 0) >= 11 ? 1 : 0
  let profMaster = 0
  Object.values(player.methods || {}).forEach(m => {
    if ((m.proficiency || 1) >= 5) profMaster = 1
  })
  return {
    insight: player.insight || 1,
    alchemy: skills.alchemy || 0,
    forge: skills.forge || 0,
    talisman: skills.talisman || 0,
    formation: skills.formation || 0,
    anyCraft11,
    profMaster,
    treasures: Object.keys(player.treasures || {}).length
  }
}
