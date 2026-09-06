// 轮回传承 —— 转世继承部分上世机缘，设上限保平衡
//
// 传承项：
//   根骨保底：轮回≥2世至少灵骨，≥4世至少仙骨……封顶道骨(由rollAptitude执行)
//   开局资源：转世数×200 灵石，封顶 5000
//   道行加成：每世攻/防/修炼+1%，封顶+50%；暴/闪+0.4%/世，封顶+20%；灵石+0.6%/世，封顶+30%

import { daoBonus } from './rebirthShop.js'

export const legacyRootBoneGuarantee = player =>
  Math.min(5, Math.floor((player.reincarnation || 0) / 2) + (daoBonus(player).rootBoneFloor || 0))

export const legacyStartMoney = player =>
  Math.min(5000, (player.reincarnation || 0) * 200) + (daoBonus(player).startMoney || 0)

export const rebirthStats = player => {
  const n = player.reincarnation || 0
  const dao = daoBonus(player)
  return {
    attack: Math.min(0.5, n * 0.01) + dao.attack,
    defense: Math.min(0.5, n * 0.01) + dao.defense,
    critical: Math.min(0.2, n * 0.004) + dao.critical,
    dodge: Math.min(0.2, n * 0.004) + dao.dodge,
    cultivationSpeed: Math.min(0.5, n * 0.01) + dao.cultivationSpeed,
    moneyMult: Math.min(0.3, n * 0.006) + dao.moneyMult,
    offlineMult: dao.offlineMult,
    health: dao.health
  }
}
