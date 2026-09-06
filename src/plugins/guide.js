// 玩法引导 —— 根据当前状态给出"下一步"目标，避免新手面对一堆系统不知所措

import { playerLifespan, gameAge } from './time.js'
import { fixedQuests, selectableQuests } from './quest.js'

const TRIB_LEVELS = [19, 37, 55, 73, 82, 100, 118, 136]
const MAX_LV = 144

const hasQuestToClaim = player => {
  const fixed = fixedQuests(player).some(f => f.done && !f.claimed)
  const sel = selectableQuests(player).some(s => s.selected && s.progress >= s.target)
  return fixed || sel
}

export const nextObjective = player => {
  const rem = playerLifespan(player) - gameAge(player)
  // 寿元将尽：最高优先
  if (rem < 30) return { icon: '💀', title: '寿元将尽', desc: '服延寿丹或进入下一世轮回', urgent: true, route: '/realm' }
  if (!player.isNewbie) return { icon: '🎁', title: '领取新手大礼包', desc: '点击领取', urgent: true, action: 'newbie' }
  if ((player.sect?.position ?? 0) === 0) return { icon: '⛩️', title: '拜入宗门', desc: '点击前往宗门', urgent: true, route: '/sect' }
  const nb = (player.level || 0) + 1
  if (TRIB_LEVELS.includes(nb) && !(player.passedTribulation || []).includes(nb)) {
    return { icon: '⚡', title: '渡劫突破', desc: '点击去渡劫突破', urgent: true, route: '/cultivate' }
  }
  if (hasQuestToClaim(player)) {
    return { icon: '📋', title: '领取任务奖励', desc: '点击前往任务', urgent: false, route: '/quest' }
  }
  if ((player.level || 0) < MAX_LV) {
    const full = (player.cultivation || 0) >= (player.maxCultivation || 1)
    return full
      ? { icon: '🔥', title: '突破当前境界', desc: '点击去突破', urgent: true, route: '/cultivate' }
      : { icon: '🌀', title: '修炼提升', desc: '点击去修炼', urgent: false, route: '/cultivate' }
  }
  return { icon: '🌌', title: '界域飞升 / 转世', desc: '点击前往', urgent: false, route: '/ascension' }
}
