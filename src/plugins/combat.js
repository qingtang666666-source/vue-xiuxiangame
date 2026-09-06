export default {
  calculateDamage(attacker, defender) {
    // 玩家(带装备)吃到套装加成；怪物正常读取
    const atk = attacker.equipment ? effectivePlayerStats(attacker) : attacker
    const def = defender.equipment ? effectivePlayerStats(defender) : defender
    const ax = atk.extras || {}
    const dx = def.extras || {}
    // 基础伤害计算
    // 减速：防御方慢速，削弱攻击方攻击
    const atkPower = Math.floor((atk.attack || 0) * (1 - (dx.slow || 0)))
    // 破甲：无视对方部分防御
    const effDef = Math.max(0, (def.defense || 0) - (ax.armorPen || 0))
    let damage = Math.max(0, Math.floor(atkPower - effDef))
    damage = damage <= 1 ? 1 : damage // 伤害最小为1
    // 闪避判定
    const isHit = Math.random() > Math.max(0, (def.dodge || 0) - (ax.accuracy || 0))
    if (!isHit) return { damage: 0, isCritical: false, isHit: false }
    // 暴击判定
    let isCritical = false
    if (Math.random() < (atk.critical || 0) * (1 - (dx.tenacity || 0))) {
      damage *= 1.5 + (ax.critDamage || 0)
      isCritical = true
    }
    // 格挡（防御方）：概率减半
    if (Math.random() < (dx.block || 0)) damage = Math.floor(damage * 0.5)
    // 伤害减免（防御方）
    damage = Math.floor(damage * (1 - (dx.damageReduction || 0)))
    // 境界压制：大境界差增伤/减伤
    damage = Math.max(1, Math.floor(damage * realmSuppressionMult(attacker.level, defender.level)))
    // 返回计算结果，包括伤害值，暴击状态和命中状态
    return { damage, isCritical, isHit: true }
  },
  executeCombatRound(attacker, defender) {
    // 攻击方被控制则跳过本轮行动
    if (isStunned(attacker)) {
      clearStun(attacker)
      return { damage: 0, isCritical: false, isHit: false, stunned: true, remainingHealth: defender.health }
    }
    // 结算防御方持续伤害(中毒/灼烧)
    const dotDamage = applyDotDamage(defender)
    const attackResult = this.calculateDamage(attacker, defender)
    let damage = attackResult.damage
    let divineNames = []
    if (attackResult.isHit && attacker.equipment) {
      const tech = methodStats(attacker)
      const pool = tech.divinePool || []
      for (const d of pool) {
        if (d.chance > 0 && Math.random() < d.chance) {
          damage = Math.floor(damage * d.mult)
          divineNames.push(d.name)
        }
      }
      // 攻速词条：额外一击
      const spd = effectivePlayerStats(attacker).speed
      if (spd > 0 && Math.random() < spd) damage = Math.floor(damage * 1.6)
    }
    if (attackResult.isHit) defender.health = Math.max(0, defender.health - damage)
    // 攻击命中后，若攻击方是玩家(带装备)，聚合特效并判定触发
    let effectLogs = []
    let lifesteal = 0
    if (attackResult.isHit && attacker.equipment) {
      const effects = aggregatePlayerEffects(attacker)
      effectLogs = resolveHitEffects(attacker, effects, defender)
      lifesteal = applyLifesteal(attacker, attackResult.damage, effects.lifesteal || 0)
    }
    return {
      damage,
      divineName: divineNames.join('、'),
      isCritical: attackResult.isCritical,
      isHit: attackResult.isHit,
      remainingHealth: defender.health,
      dotDamage,
      effectLogs,
      lifesteal
    }
  }
}

import {
  aggregatePlayerEffects,
  resolveHitEffects,
  applyDotDamage,
  applyLifesteal,
  isStunned,
  clearStun
} from '@/plugins/effectCombat'
import { effectivePlayerStats } from '@/plugins/setBonus'
import { methodStats } from '@/plugins/technique'
import { realmSuppressionMult } from '@/plugins/game'
