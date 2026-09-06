// 玩家基础属性结算（装备佩戴/卸下、称号、加点等统一切口）
//
// 说明：属性增量直接累加到 player 基础属性上，并同步调整 health/maxHealth 与 score。
//   传入负数即“移除”对应加成（与旧 homePage.playerAttribute 行为完全一致）。

import equip from './equip.js'

export const applyPlayerAttribute = (player, dodge = 0, attack = 0, health = 0, critical = 0, defense = 0) => {
  // 初始化传进来的属性值
  dodge = isNaN(dodge) || !dodge ? 0 : parseFloat(dodge)
  attack = isNaN(attack) || !attack ? 0 : Math.floor(attack)
  health = isNaN(health) || !health ? 0 : Math.floor(health)
  defense = isNaN(defense) || !defense ? 0 : Math.floor(defense)
  critical = isNaN(critical) || !critical ? 0 : parseFloat(critical)
  // 累加到基础属性
  player.dodge = (player.dodge || 0) + dodge
  player.attack = (player.attack || 0) + attack
  player.health = (player.health || 0) + health
  player.maxHealth = (player.maxHealth || 0) + health
  player.critical = (player.critical || 0) + critical
  player.defense = (player.defense || 0) + defense
  // 评分
  player.score = equip.calculateEquipmentScore(
    player.dodge,
    player.attack,
    player.maxHealth,
    player.critical,
    player.defense
  )
}
