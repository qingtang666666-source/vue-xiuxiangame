// 特效词条战斗结算 —— 网游风：控制(麻痹/冰冻/眩晕)、持续伤害(中毒/灼烧)、吸血
// 平衡：控制类累计概率有上限；每种特效带冷却；持续伤害最多叠 N 层。

import { CONTROL_PROB_CAP, MAX_POISON_STACKS, EFFECT_AFFIXES } from '@/plugins/affix'
import { setStats, equippedExtras } from '@/plugins/setBonus'
import { buffStats } from '@/plugins/buffs'
import { formationStats } from '@/plugins/formation'
import { skillStats } from '@/plugins/npcSystem'
import { sectStats } from '@/plugins/sect'
import { aptitudeStats } from '@/plugins/aptitude'
import { realmBonus } from '@/plugins/ascension'

// 控制型特效（跳过目标下一次行动）
const CONTROL_KEYS = ['paralyze', 'freeze', 'stun']
// 持续伤害型特效
const DOT_KEYS = ['poison', 'burn']

const CD_MAP = Object.fromEntries(EFFECT_AFFIXES.map(a => [a.key, a.cooldown || 1]))

// 从玩家的 4 个装备槽位聚合特效触发概率，控制类受总上限约束
export const aggregatePlayerEffects = player => {
  const effects = { paralyze: 0, freeze: 0, stun: 0, poison: 0, burn: 0, lifesteal: 0 }
  const equipSlots = player?.equipment || {}
  if (!player) return effects
  Object.values(equipSlots).forEach(slot => {
    ;(slot?.affixes || []).forEach(a => {
      if (a.type === 'effect' && a.triggerChance != null) {
        effects[a.key] = (effects[a.key] || 0) + a.triggerChance
      }
    })
  })
  // 套装加成提升特效触发率（4件套）
  const set = setStats(player)
  const buff = buffStats(player)
  const form = formationStats(player)
  const sk = skillStats(player)
  const sect = sectStats(player)
  const apt = aptitudeStats(player)
  const realm = realmBonus(player)
  const boost = (set.effectBoost || 0) + (buff.effectBoost || 0) + (form.effectBoost || 0) + (sk.effectBoost || 0) + (sect.effectBoost || 0) + (apt.effectBoost || 0) + (realm.effectBoost || 0)
  if (boost > 0) {
    for (const key of Object.keys(effects)) effects[key] = (effects[key] || 0) + boost
  }
  // 控制类总概率上限
  const controlTotal = (effects.paralyze || 0) + (effects.freeze || 0) + (effects.stun || 0)
  if (controlTotal > CONTROL_PROB_CAP) {
    const ratio = CONTROL_PROB_CAP / controlTotal
    effects.paralyze *= ratio
    effects.freeze *= ratio
    effects.stun *= ratio
  }
  return effects
}

// 在攻击命中后判定是否触发特效，返回日志数组
export const resolveHitEffects = (attacker, attackerEffects, defender) => {
  const logs = []
  attacker._round = (attacker._round || 0) + 1
  if (!attacker._effCd) attacker._effCd = {}
  const cdr = equippedExtras(attacker).cooldownReduction || 0
  // 控制类：触发一次则标记目标跳过下一次行动
  for (const key of CONTROL_KEYS) {
    if (!attackerEffects[key]) continue
    const cd = Math.max(1, Math.floor((CD_MAP[key] || 1) * (1 - cdr)))
    if (attacker._round - (attacker._effCd[key] || -999) < cd) continue
    if (Math.random() < attackerEffects[key]) {
      defender._stunned = true
      defender._stunTurns = 1
      logs.push(`${defender.name}被${keyName(key)}，无法行动！`)
      attacker._effCd[key] = attacker._round
      break // 一次攻击最多触发一种控制
    }
  }
  // 持续伤害：叠加层数（每层每回合跳一次伤害）
  for (const key of DOT_KEYS) {
    if (attackerEffects[key] && Math.random() < attackerEffects[key]) {
      defender._dot = defender._dot || {}
      defender._dot[key] = Math.min((defender._dot[key] || 0) + 1, MAX_POISON_STACKS)
      logs.push(`${defender.name}中了${keyName(key)}！`)
    }
  }
  return logs
}

// 回合开始时结算持续伤害，并统计到返回结果
export const applyDotDamage = defender => {
  let dotDamage = 0
  const dot = defender._dot
  if (dot) {
    const maxHp = defender.maxHealth || defender.maxhealth || defender.health || 100
    for (const key of Object.keys(dot)) {
      if (dot[key] > 0) {
        dotDamage += dot[key] * Math.max(1, Math.floor(maxHp * 0.01))
        dot[key] -= 1
      }
    }
  }
  if (dotDamage > 0) defender.health = Math.max(0, defender.health - dotDamage)
  return dotDamage
}

// 吸血：根据造成伤害恢复攻击方生命
export const applyLifesteal = (attacker, damage, lifestealRate) => {
  if (lifestealRate > 0 && damage > 0) {
    const heal = Math.floor(damage * lifestealRate)
    attacker.health = Math.min(attacker.maxHealth, (attacker.health || 0) + heal)
    return heal
  }
  return 0
}

const keyName = key => {
  const names = { paralyze: '麻痹', freeze: '冰冻', stun: '眩晕', poison: '中毒', burn: '灼烧' }
  return names[key] || key
}

// 是否被控制（跳过行动）
export const isStunned = defender => defender && defender._stunned

// 行动前清除一次性控制标记
export const clearStun = defender => {
  if (defender && defender._stunned) {
    defender._stunned = false
    defender._stunTurns = 0
  }
}
