// 玩家 vs 野怪/BOSS 的完整回合结算 —— 供 explorePage / bossPage 复用，行为保持一致。
//
// 口径说明（与探索/BOSS 页原有逻辑逐字对应，避免改动数值手感）：
//   玩家攻 foe：命中看 foe.dodge；暴击 ×1.5；神通/攻速在命中前叠乘；境界压制按玩家攻 foe。
//   foe 攻玩家：命中看玩家 eff.dodge；foe 暴击 ×2；境界压制按 foe 攻玩家。
//   持续伤害只结算在 foe 身上；玩家攻击命中后聚合装备特效并判定控制/中毒/灼烧/吸血。

import { effectivePlayerStats } from './setBonus.js'
import { methodStats } from './technique.js'
import { realmSuppressionMult } from './game.js'
import { applyDotDamage, isStunned, clearStun, aggregatePlayerEffects, resolveHitEffects, applyLifesteal } from './effectCombat.js'

export const resolvePlayerFoeRound = (player, foe) => {
  const eff = player.equipment ? effectivePlayerStats(player) : player
  const px = eff.extras || {}

  // 回合开始：结算 foe 身上的持续伤害(中毒/灼烧)
  const dotDamage = applyDotDamage(foe)
  // 气血回复（玩家带装备）：每回合回血
  if (player.equipment) {
    const regen = Math.floor(px.hpRegen || 0)
    if (regen > 0) player.health = Math.min(player.maxHealth || player.health || 0, (player.health || 0) + regen)
  }

  // 伤害基础（含强制破防）
  // 减速：玩家迟缓，削弱 foe 攻击
  const foeAtk = Math.floor((foe.attack || 0) * (1 - (px.slow || 0)))
  let monsterHarm = Math.max(0, Math.floor(foeAtk - (eff.defense || 0)))
  monsterHarm = monsterHarm <= 1 ? 1 : monsterHarm
  // 破甲：无视 foe 部分防御
  let playerHarm = Math.max(0, Math.floor((eff.attack || 0) - Math.max(0, (foe.defense || 0) - (px.armorPen || 0))))
  playerHarm = playerHarm <= 1 ? 1 : playerHarm

  // 闪避判定：玩家攻 foe（看 foe 闪避）；foe 攻玩家（看玩家闪避）
  const isPlayerHit = Math.random() > Math.max(0, (foe.dodge || 0) - (px.accuracy || 0))
  const isFoeHit = Math.random() > (eff.dodge || 0)

  // 暴击：玩家 ×1.5；foe ×2
  let isCritical = false
  let isMCritical = false
  if (Math.random() < (foe.critical || 0) * (1 - (px.tenacity || 0))) {
    monsterHarm *= 2
    isMCritical = true
  }
  if (Math.random() < (eff.critical || 0)) {
    playerHarm *= 1.5 + (px.critDamage || 0)
    isCritical = true
  }
  // 格挡/伤害减免（玩家受击）：怪攻玩家前先算
  if (Math.random() < (px.block || 0)) monsterHarm = Math.floor(monsterHarm * 0.5)
  monsterHarm = Math.floor(monsterHarm * (1 - (px.damageReduction || 0)))

  // 主动神通爆发（玩家，可多门独立触发）
  const logs = []
  const tech = methodStats(player)
  const pool = tech.divinePool || []
  for (const d of pool) {
    if (d.chance > 0 && Math.random() < d.chance) {
      playerHarm = Math.floor(playerHarm * d.mult)
      logs.push(`你催动【${d.name}】，攻势暴涨！`)
    }
  }
  // 攻速词条：额外一击
  if ((eff.speed || 0) > 0 && Math.random() < eff.speed) {
    playerHarm = Math.floor(playerHarm * 1.6)
    logs.push('你攻速奇快，连出第二击！')
  }

  // 境界压制
  playerHarm = Math.max(1, Math.floor(playerHarm * realmSuppressionMult(player.level, foe.level)))
  monsterHarm = Math.max(1, Math.floor(monsterHarm * realmSuppressionMult(foe.level, player.level)))

  // 结算：foe 被控制则不攻击；foe 攻玩家扣血；玩家攻 foe 扣血 + 特效 + 吸血
  const foeStunned = isStunned(foe)
  let thorns = 0
  if (isFoeHit && !foeStunned) {
    // 护盾：先抵消一部分伤害
    const shield = Math.floor(px.shield || 0)
    const taken = Math.max(0, monsterHarm - shield)
    taken > 0 ? (player.health = Math.max(0, (player.health || 0) - taken)) : null
    // 反伤：将玩家所受伤害按比例回敬 foe
    thorns = Math.floor(taken * (px.thorns || 0))
    if (thorns > 0) foe.health = Math.max(0, (foe.health || 0) - thorns)
  }
  clearStun(foe)

  let effectLogs = []
  let lifesteal = 0
  if (isPlayerHit) {
    foe.health = Math.max(0, (foe.health || 0) - playerHarm)
    const effects = aggregatePlayerEffects(player)
    effectLogs = resolveHitEffects(player, effects, foe)
    lifesteal = applyLifesteal(player, playerHarm, effects.lifesteal || 0)
  }

  return {
    eff,
    dotDamage,
    playerHarm,
    monsterHarm,
    isCritical,
    isMCritical,
    isPlayerHit,
    isFoeHit,
    logs,
    effectLogs,
    lifesteal,
    foeStunned,
    thorns
  }
}
