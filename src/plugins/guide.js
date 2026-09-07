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
// —— 玩法模块引导：把每个功能模块都讲清「是什么、去哪点、怎么算体验过」——
export const MODULE_GUIDES = [
  { key: 'cultivate', icon: '🌀', name: '修炼突破', route: '/cultivate', desc: '打坐积累修为，满了就突破；跨大境界需要历战掉落的「道果」并满足战力/寿元。', done: p => (p.level || 0) >= 2 },
  { key: 'battle', icon: '⚔️', name: '历战', route: '/battle', desc: '挑战不同强度敌人，刷修为、灵石、培养丹，并有概率掉「道果」（突破大境界必用，灵石买不到）。', done: p => (p.ladderWins || 0) >= 1 },
  { key: 'tech', icon: '📖', name: '功法阁', route: '/home', desc: '首页打开功法阁：参悟功法卷轴、修炼提升重数、立主修；主动功法要「上阵」才能在战斗里用。', done: p => Object.keys(p.methods || {}).length >= 1 },
  { key: 'explore', icon: '🗺️', name: '大世界探索', route: '/worldmap', desc: '闯荡地图、击败野怪，攒修为与会遇到的材料。', done: p => (p.exploreWins || 0) >= 1 },
  { key: 'realm', icon: '🌌', name: '秘境', route: '/realm', desc: '探索秘境寻宝，有几率触发奇遇。', done: p => (p.realmTimes || 0) >= 1 },
  { key: 'tower', icon: '🗼', name: '无尽塔', route: '/endlesstower', desc: '一层层向上打，检验战力上限，奖励随层数变多。', done: p => (p.highestTowerFloor || 0) >= 1 },
  { key: 'boss', icon: '☠️', name: '世界BOSS', route: '/boss', desc: '组队水准的单人挑战，打赢掉稀有材料与培养丹。', done: p => ((p.worldBosses || []).some(b => (b.rewards && b.rewards.kill) > 0)) },
  { key: 'manor', icon: '🏠', name: '洞府', route: '/manor', desc: '种灵草、修建筑，挂机与修炼都受益。', done: p => Object.keys(p.manor || {}).length > 0 },
  { key: 'alchemy', icon: '💊', name: '炼丹', route: '/alchemy', desc: '炼培养丹与增益丹药；培养丹是中后期突破的必需品。', done: p => (p.skills?.alchemy || 0) >= 1 },
  { key: 'forge', icon: '🔨', name: '炼器', route: '/forge', desc: '打造更强装备；旧装备可分解成炼器石。', done: p => (p.skills?.forge || 0) >= 1 },
  { key: 'talisman', icon: '📜', name: '制符', route: '/talisman', desc: '制符提供战斗与功能增益，材料坊市有售。', done: p => (p.skills?.talisman || 0) >= 1 },
  { key: 'formation', icon: '⛩️', name: '阵法', route: '/formation', desc: '按类型×品阶布阵，多座同时生效的常驻被动。', done: p => (p.skills?.formation || 0) >= 1 },
  { key: 'sect', icon: '🏯', name: '宗门', route: '/sect', desc: '过入门考核后拜入宗门，升职领俸禄、换奖励。', done: p => (p.sect?.position || 0) >= 1 },
  { key: 'npc', icon: '👤', name: 'NPC 奇缘', route: '/npc', desc: '结识修士、赠礼刷情缘，触发专属机缘。', done: null },
  { key: 'market', icon: '🧧', name: '坊市', route: '/market', desc: '用灵石买消耗材料；注意：道果在坊市买不到。', done: null },
  { key: 'backpack', icon: '🎒', name: '背包', route: '/backpack', desc: '查看装备与道具，强化、穿戴、锻造成长。', done: null },
  { key: 'game', icon: '🎲', name: '休闲小游戏', route: '/game', desc: '放松一下，稳赢小奖励。', done: p => ((p.gameWins || 0) + (p.gameLosses || 0)) >= 1 },
  { key: 'ascension', icon: '✨', name: '飞升转生', route: '/ascension', desc: '走到当前界域尽头后的更高追求。', done: p => (p.realm?.stage || 0) >= 1 || (p.reincarnation || 0) >= 1 }
]

export const moduleGuides = player => MODULE_GUIDES.map(m => ({ ...m, done: typeof m.done === 'function' ? !!m.done(player) : null }))
