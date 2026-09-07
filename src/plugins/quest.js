// 任务系统 —— 固定任务(里程碑) + 自选任务(池子里挑，完成后可换)

export const MAX_SELECTED = 3

const COUNTERS = {
  adventure: p => p.adventureTimes || 0,
  realm: p => p.realmTimes || 0,
  tower: p => p.highestTowerFloor || 0,
  explore: p => p.exploreWins || 0,
  boss: p => p.bossKills || 0,
  craft: p => p.craftCount || 0,
  worldboss: p => ((p.worldBosses || []).reduce((s, b) => s + ((b.rewards && b.rewards.kill) || 0), 0)),
  season: p => (p.season?.points || 0),
  alchemy: p => p.skills?.alchemy || 0,
  forge: p => p.skills?.forge || 0,
  talisman: p => p.skills?.talisman || 0,
  formation: p => p.skills?.formation || 0,
  sectPos: p => (p.sect?.position ?? 0),
  ladder: p => p.ladderWins || 0,
  techniques: p => Object.keys(p.methods || {}).length,
  strengthen: p => p.strengthenCount || 0
}
export const counterProgress = (player, key) => (COUNTERS[key] ? COUNTERS[key](player) : 0)

export const FIXED_QUESTS = [
  { id: 'f1', name: '领取新手大礼包', desc: '踏出仙途第一步', reward: { money: 500 }, done: p => !!p.isNewbie },
  { id: 'f2', name: '拜入宗门', desc: '通过宗门入门考核', reward: { cultivateDan: 3 }, done: p => (p.sect?.position ?? 0) >= 1 },
  { id: 'f3', name: '筑基有成', desc: '境界达到筑基', reward: { money: 1000 }, done: p => p.level >= 10 },
  { id: 'f4', name: '元婴出窍', desc: '境界达到元婴', reward: { cultivateDan: 8 }, done: p => p.level >= 28 },
  { id: 'f5', name: '渡过天劫', desc: '渡过一次天劫', reward: { money: 5000 }, done: p => ((p.passedTribulation || []).length) >= 1 },
  { id: 'f6', name: '飞升灵界', desc: '完成一次界域飞升', reward: { currency: 2 }, done: p => (p.realm?.stage || 0) >= 1 },
  { id: 'f7', name: '轮回一世', desc: '经历一次轮回转世', reward: { money: 10000 }, done: p => (p.reincarnation || 0) >= 1 },
  { id: 'f8', name: '金丹大成', desc: '境界达到金丹', reward: { money: 2500 }, done: p => p.level >= 19 },
  { id: 'f9', name: '化神之变', desc: '境界达到化神', reward: { cultivateDan: 12 }, done: p => p.level >= 37 },
  { id: 'f10', name: '炼虚道途', desc: '境界达到炼虚', reward: { money: 6000 }, done: p => p.level >= 46 },
  { id: 'f11', name: '合体归一', desc: '境界达到合体', reward: { currency: 3 }, done: p => p.level >= 55 },
  { id: 'f12', name: '大乘圆满', desc: '境界达到大乘', reward: { money: 12000 }, done: p => p.level >= 64 },
  { id: 'f13', name: '真仙大道', desc: '境界达到真仙', reward: { currency: 6 }, done: p => p.level >= 82 },
  { id: 'f14', name: '玄仙逍遥', desc: '境界达到玄仙', reward: { strengtheningStone: 200 }, done: p => p.level >= 91 },
  { id: 'f15', name: '金仙之境', desc: '境界达到金仙', reward: { money: 40000 }, done: p => p.level >= 100 },
  { id: 'f16', name: '大罗金仙', desc: '境界达到大罗金仙', reward: { currency: 12 }, done: p => p.level >= 109 },
  { id: 'f17', name: '太乙之尊', desc: '境界达到太乙', reward: { money: 100000 }, done: p => p.level >= 118 },
  { id: 'f18', name: '混元之体', desc: '境界达到混元', reward: { currency: 25 }, done: p => p.level >= 127 },
  { id: 'f19', name: '道祖之巅', desc: '境界达到道祖', reward: { money: 500000 }, done: p => p.level >= 136 },
  { id: 'f20', name: '丹道初成', desc: '炼制一次丹药', reward: { money: 800 }, done: p => (p.skills?.alchemy || 0) >= 1 },
  { id: 'f21', name: '器道初成', desc: '炼制一次装备', reward: { strengtheningStone: 20 }, done: p => (p.skills?.forge || 0) >= 1 },
  { id: 'f22', name: '符道初成', desc: '制作一张符箓', reward: { money: 800 }, done: p => (p.skills?.talisman || 0) >= 1 },
  { id: 'f23', name: '阵道初成', desc: '布下一座阵法', reward: { money: 800 }, done: p => (p.skills?.formation || 0) >= 1 },
  { id: 'f24', name: '初探秘境', desc: '探索一次秘境', reward: { money: 1500 }, done: p => (p.realmTimes || 0) >= 1 },
  { id: 'f25', name: '偶遇奇缘', desc: '触发一次奇遇', reward: { cultivateDan: 3 }, done: p => (p.adventureTimes || 0) >= 1 },
  { id: 'f26', name: '洞府初立', desc: '拥有任意洞府建筑', reward: { money: 2000 }, done: p => (p.manor && Object.keys(p.manor).length > 0) },
  { id: 'f27', name: '挑战世界Boss', desc: '击败一次世界Boss', reward: { money: 30000 }, done: p => ((p.worldBosses || []).some(b => (b.rewards && b.rewards.kill) > 0)) },
  { id: 'f28', name: '投身赛季', desc: '获得任意赛季积分', reward: { money: 5000 }, done: p => ((p.season?.points || 0) > 0) },
  // —— 早期引导 ——
  { id: 'f29', name: '初试练气', desc: '境界达到炼气二层，开始正式修行', reward: { money: 200 }, done: p => p.level >= 2 },
  { id: 'f30', name: '斩妖初试', desc: '击败 1 只野怪', reward: { money: 300 }, done: p => (p.exploreWins || 0) >= 1 },
  { id: 'f31', name: '秘境初探', desc: '探索 1 次秘境', reward: { money: 300 }, done: p => (p.realmTimes || 0) >= 1 },
  { id: 'f32', name: '登塔试炼', desc: '登上无尽塔 1 层', reward: { money: 300 }, done: p => (p.highestTowerFloor || 0) >= 1 },
  { id: 'f33', name: '签到入门', desc: '完成 1 次签到', reward: { money: 2000 }, done: p => (p.checkinDays || 0) >= 1 },
  { id: 'f34', name: '初炼丹药', desc: '炼制 1 次丹药', reward: { money: 400 }, done: p => (p.skills?.alchemy || 0) >= 1 },
  { id: 'f35', name: '初锻灵器', desc: '炼制 1 次装备', reward: { money: 400 }, done: p => (p.skills?.forge || 0) >= 1 },
  { id: 'f36', name: '小试身手', desc: '完成 1 次休闲小游戏', reward: { money: 3000 }, done: p => ((p.gameWins || 0) + (p.gameLosses || 0)) >= 1 },
  { id: 'f37', name: '初入历战', desc: '取得 1 场历战胜利', reward: { money: 300 }, done: p => (p.ladderWins || 0) >= 1 },
  { id: 'f38', name: '参悟首门功法', desc: '参悟任意 1 门功法', reward: { money: 400 }, done: p => Object.keys(p.methods || {}).length >= 1 },
  { id: 'f39', name: '装备初强', desc: '强化装备 1 次', reward: { money: 300 }, done: p => (p.strengthenCount || 0) >= 1 }
]

export const SELECTABLE_POOL = [
  { id: 's1', name: '偶遇奇缘', desc: '触发奇遇 5 次', key: 'adventure', target: 5, reward: { money: 1500 } },
  { id: 's2', name: '秘境寻宝', desc: '探索秘境 3 次', key: 'realm', target: 3, reward: { money: 2000 } },
  { id: 's3', name: '登塔试炼', desc: '无尽塔达到 50 层', key: 'tower', target: 50, reward: { strengtheningStone: 50 } },
  { id: 's4', name: '斩妖除魔', desc: '击败野怪 20 只', key: 'explore', target: 20, reward: { money: 1000 } },
  { id: 's5', name: '降服妖王', desc: '击败世界BOSS 1 次', key: 'boss', target: 1, reward: { money: 3000 } },
  { id: 's6', name: '巧手炼制', desc: '炼丹/炼器/制符/布阵 10 次', key: 'craft', target: 10, reward: { cultivateDan: 5 } },
  { id: 's7', name: '屠灭妖皇', desc: '击败世界BOSS 3 次', key: 'worldboss', target: 3, reward: { money: 80000 } },
  { id: 's8', name: '丹道筑基', desc: '炼丹技艺达 3 阶', key: 'alchemy', target: 3, reward: { cultivateDan: 8 } },
  { id: 's9', name: '器道锋芒', desc: '炼器技艺达 3 阶', key: 'forge', target: 3, reward: { strengtheningStone: 60 } },
  { id: 's10', name: '符法通天', desc: '符箓技艺达 3 阶', key: 'talisman', target: 3, reward: { money: 3000 } },
  { id: 's11', name: '阵道玄妙', desc: '阵法技艺达 3 阶', key: 'formation', target: 3, reward: { money: 3000 } },
  { id: 's12', name: '宗门栋梁', desc: '宗门职位达到外门执事', key: 'sectPos', target: 3, reward: { money: 4000 } },
  { id: 's13', name: '赛季冲锋', desc: '本季积分达 200', key: 'season', target: 200, reward: { money: 50000 } },
  { id: 's14', name: '炼器大师路', desc: '强化装备 20 次', key: 'strengthen', target: 20, reward: { money: 6000 } }
]

const todayKey = () => new Date().toDateString()
const yestKey = () => new Date(Date.now() - 86400000).toDateString()

export const questLevel = player => {
  const s = player.questState
  return s ? Math.max(1, 1 + Math.floor(s.xp / 100)) : 1
}
export const questStreak = player => player.questState?.streak || 0

const onComplete = (player, isFixed) => {
  if (!player.questState) player.questState = { xp: 0, streak: 0, lastDay: '' }
  const st = player.questState
  st.xp += isFixed ? 60 : 40
  const t = todayKey()
  if (st.lastDay !== t) {
    if (st.lastDay && yestKey() === st.lastDay) st.streak++
    else st.streak = 1
    st.lastDay = t
  }
  return { level: questLevel(player), streak: st.streak }
}

const ensureQuests = player => {
  if (!player.quests) player.quests = { claimedFixed: [], selected: [] }
  if (!player.quests.claimedFixed) player.quests.claimedFixed = []
  if (!player.quests.selected) player.quests.selected = []
  if (!player.quests.claimedSelected) player.quests.claimedSelected = []
  return player.quests
}

const applyReward = (player, reward) => {
  const props = player.props || {}
  Object.entries(reward).forEach(([k, v]) => {
    props[k] = (props[k] || 0) + v
  })
  return reward
}

export const ensureQuestsState = ensureQuests

export const fixedQuests = player => {
  const q = ensureQuests(player)
  return FIXED_QUESTS.map(f => ({
    ...f,
    done: f.done(player),
    claimed: q.claimedFixed.includes(f.id)
  }))
}

export const claimFixed = (player, id) => {
  const q = ensureQuests(player)
  const f = FIXED_QUESTS.find(x => x.id === id)
  if (!f || !f.done(player) || q.claimedFixed.includes(id)) return { ok: false, reason: '尚未完成或已领取' }
  const { level, streak } = onComplete(player, true)
  const reward = { ...f.reward }
  reward.money = (reward.money || 0) + level * 20 + Math.min(streak, 10) * 10
  applyReward(player, reward)
  q.claimedFixed.push(id)
  return { ok: true, name: f.name, reward, level, streak }
}

export const selectableQuests = player => {
  const q = ensureQuests(player)
  return SELECTABLE_POOL.map(s => ({
    ...s,
    progress: counterProgress(player, s.key),
    selected: q.selected.includes(s.id),
    claimed: q.claimedSelected.includes(s.id)
  }))
}

export const canSelectQuest = player => ensureQuests(player).selected.length < MAX_SELECTED
export const selectQuest = (player, id) => {
  const q = ensureQuests(player)
  if (!SELECTABLE_POOL.some(s => s.id === id)) return { ok: false, reason: '未知任务' }
  if (q.selected.includes(id)) return { ok: false, reason: '已选择' }
  if (q.claimedSelected.includes(id)) return { ok: false, reason: '此任务已完成领取' }
  if (q.selected.length >= MAX_SELECTED) return { ok: false, reason: `最多同时 ${MAX_SELECTED} 个自选任务` }
  q.selected.push(id)
  return { ok: true }
}

export const unselectQuest = (player, id) => {
  const q = ensureQuests(player)
  q.selected = q.selected.filter(x => x !== id)
  return { ok: true }
}

export const claimSelected = (player, id) => {
  const q = ensureQuests(player)
  const s = SELECTABLE_POOL.find(x => x.id === id)
  if (!s || !q.selected.includes(id)) return { ok: false, reason: '未选择该任务' }
  if (counterProgress(player, s.key) < s.target) return { ok: false, reason: '尚未完成' }
  const { level, streak } = onComplete(player, false)
  const reward = { ...s.reward }
  reward.money = (reward.money || 0) + level * 20 + Math.min(streak, 10) * 10
  applyReward(player, reward)
  q.selected = q.selected.filter(x => x !== id)
  q.claimedSelected = q.claimedSelected || []
  q.claimedSelected.push(id)
  return { ok: true, name: s.name, reward, level, streak }
}
