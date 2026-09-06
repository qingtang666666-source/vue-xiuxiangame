// 离线收益 —— 登录时按离线时长结算挂机资源，接入洞府加成

import { manorOfflineBonus } from './manor.js'
import { idleRates } from './alchemy.js'

const BASE_RATE = 0.02 // 基准速率：每境界每秒可获得 maxCultivation 的 2%

// 离线可产出的材料（与奇遇保持一致）及其名称
const MATERIAL_KEYS = ['strengtheningStone', 'cultivateDan', 'zhuSha', 'xuanTie', 'zhenQi', 'yaoDan']
const MATERIAL_NAMES = {
  strengtheningStone: '炼器石',
  cultivateDan: '培养丹',
  zhuSha: '朱砂',
  xuanTie: '玄铁',
  zhenQi: '阵旗',
  yaoDan: '妖丹'
}

/**
 * 结算离线收益。
 * @param {object} player store 里的 player（会被原地修改）
 * @returns {{gainedCultivation:number, gainedMoney:number, gainedHerb:number, hours:number}|null}
 *          返回 null 表示没有离线收益（首次进入）。
 */
export const settleOffline = player => {
  const now = Date.now()
  const last = player.lastOnlineTime
  if (!last) {
    player.lastOnlineTime = now
    return null
  }

  let elapsedSec = Math.floor((now - last) / 1000)
  if (elapsedSec <= 0) {
    player.lastOnlineTime = now
    return null
  }

  // 洞府扩展离线上限：聚灵大殿每级 +1 小时
  const bonus = manorOfflineBonus(player)
  const capSec = bonus.capHours * 3600
  elapsedSec = Math.min(elapsedSec, capSec)

  // 按当前境界规模估算速率：境界越高，每秒收益越大；洞府放大
  // 夹紧基准规模，避免旧存档巨大数值导致精度丢失/溢出
  const scale = Math.max(1, Math.min(1e14, player.maxCultivation || 100))
  const rates = idleRates(player)
  const gainedCultivation = Math.min(1e15, Math.floor(scale * BASE_RATE * elapsedSec * rates.cultivationSpeed * bonus.cultivationMult * rates.offlineMult))
  // 灵石同步产出（洞府矿脉放大）
  const gainedMoney = Math.floor(elapsedSec * (player.level || 1) * 0.01 * bonus.moneyMult * rates.moneyMult)
  // 灵田产出灵草（炼丹原料）
  const gainedHerb = Math.floor((elapsedSec / 3600) * bonus.herbsPerHour)

  player.cultivation = (player.cultivation || 0) + gainedCultivation
  player.props.money = (player.props.money || 0) + gainedMoney
  player.props.spiritHerb = (player.props.spiritHerb || 0) + gainedHerb

  // 离线满 1 小时后，按小时掉落少量随机材料（有上限，避免挂机过夜堆成山）
  const gainedMaterials = {}
  if (elapsedSec >= 3600) {
    const lv = player.level || 1
    const rolls = Math.min(12, Math.floor(elapsedSec / 3600))
    for (let i = 0; i < rolls; i++) {
      const key = MATERIAL_KEYS[Math.floor(Math.random() * MATERIAL_KEYS.length)]
      const v = Math.max(1, Math.floor(1 + lv * 0.15))
      gainedMaterials[key] = (gainedMaterials[key] || 0) + v
      player.props[key] = (player.props[key] || 0) + v
    }
  }
  player.lastOnlineTime = now

  // 修为超过上限不退还，只是显示为可突破
  return {
    gainedCultivation,
    gainedMoney,
    gainedHerb,
    gainedMaterials,
    materialNames: MATERIAL_NAMES,
    hours: elapsedSec / 3600
  }
}

// 更新在线时间戳（离开页面/定期保存时调用）
export const touchOnline = player => {
  player.lastOnlineTime = Date.now()
}
