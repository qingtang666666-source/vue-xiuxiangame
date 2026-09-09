// 统一增益系统（限时 buff）—— 炼丹、符箓、阵法共用的聚合点
//
// buff.effect 支持的键：
//   挂机类：cultivation(修炼速度+%) / moneyMult(灵石+%) / offlineMult(离线+%)
//   战斗类：attack(攻击+%) / defense(防御+%) / critical(暴击+百分点) / dodge(闪避+百分点)
//   其他：effectBoost(特效触发+百分点)

import { onMounted, onUnmounted, ref } from 'vue'

const pad2 = n => String(n).padStart(2, '0')

// 剩余时间统一格式：永久 / 已结束 / 1小时05分 / 29分08秒
export const formatBuffRemaining = (expireAt, now = Date.now()) => {
  if (!expireAt) return '永久'
  const left = expireAt - now
  if (left <= 0) return '已结束'
  const total = Math.ceil(left / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return h > 0 ? `${h}小时${pad2(m)}分` : `${m}分${pad2(s)}秒`
}

// 每秒刷新一次的时钟，供各页面显示实时剩余时间
export const useBuffClock = (interval = 1000) => {
  const now = ref(Date.now())
  let timer = null
  onMounted(() => {
    timer = setInterval(() => {
      now.value = Date.now()
    }, interval)
  })
  onUnmounted(() => {
    if (timer) clearInterval(timer)
  })
  return now
}

// 把 effect 对象转成可读加成，用于剩余时间旁展示
export const buffEffectText = effect => {
  const e = effect || {}
  const parts = []
  if (e.cultivation) parts.push(`修炼 +${Math.round(e.cultivation * 100)}%`)
  if (e.moneyMult) parts.push(`灵石 +${Math.round(e.moneyMult * 100)}%`)
  if (e.offlineMult) parts.push(`离线 +${Math.round(e.offlineMult * 100)}%`)
  if (e.attack) parts.push(`攻击 +${Math.round(e.attack * 100)}%`)
  if (e.defense) parts.push(`防御 +${Math.round(e.defense * 100)}%`)
  if (e.critical) parts.push(`暴击 +${(e.critical * 100).toFixed(1)}%`)
  if (e.dodge) parts.push(`闪避 +${(e.dodge * 100).toFixed(1)}%`)
  if (e.effectBoost) parts.push(`特效 +${(e.effectBoost * 100).toFixed(1)}%`)
  return parts.join(' · ')
}

export const buffStats = player => {
  const now = Date.now()
  const acc = { cultivation: 0, moneyMult: 0, offlineMult: 0, attack: 0, defense: 0, critical: 0, dodge: 0, effectBoost: 0 }
  ;(player?.buffs || []).forEach(b => {
    if (b.expireAt && b.expireAt <= now) return
    const e = b.effect || {}
    acc.cultivation += e.cultivation || 0
    acc.moneyMult += e.moneyMult || 0
    acc.offlineMult += e.offlineMult || 0
    acc.attack += e.attack || 0
    acc.defense += e.defense || 0
    acc.critical += e.critical || 0
    acc.dodge += e.dodge || 0
    acc.effectBoost += e.effectBoost || 0
  })
  // 增益(丹药/符箓)加成上限，避免叠加失控
  const CAPS = { cultivation: 3, moneyMult: 3, offlineMult: 3, attack: 2.5, defense: 2.5, critical: 0.5, dodge: 0.5, effectBoost: 0.5 }
  Object.keys(acc).forEach(k => {
    if (CAPS[k] != null) acc[k] = Math.min(CAPS[k], acc[k])
  })
  return acc
}

// 清理已过期的限时增益
export const reapBuffs = player => {
  const now = Date.now()
  player.buffs = (player.buffs || []).filter(b => !b.expireAt || b.expireAt > now)
}

// 当前有效增益（用于展示）
export const activeBuffs = player => {
  const now = Date.now()
  return (player?.buffs || []).filter(b => !b.expireAt || b.expireAt > now).sort((a, b) => a.expireAt - b.expireAt)
}

// 追加一条增益
export const addBuff = (player, buff) => {
  if (!player.buffs) player.buffs = []
  const now = Date.now()
  const existing = player.buffs.find(b => b.name === buff.name && (!b.expireAt || b.expireAt > now))
  if (existing) {
    // 同名增益叠加：从当前到期时间继续延长，避免 BUFF 页重复条目
    const dur = buff.expireAt ? (buff.expireAt - now) : (buff.minutes ? buff.minutes * 60000 : 60000)
    existing.expireAt = Math.max(existing.expireAt || now, now) + Math.max(0, dur)
    if (buff.effect) existing.effect = { ...existing.effect, ...buff.effect }
    if (buff.quality) existing.quality = buff.quality
    return
  }
  player.buffs.push(buff)
}
