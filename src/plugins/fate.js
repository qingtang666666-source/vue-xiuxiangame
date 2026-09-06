// 轮回多周目：每世随机"命运/特质" + 每世随机"天道规则" + 永久"道痕/宿慧"成长
// 加成统一走 buffStats 的键：cultivation/moneyMult/offlineMult/attack/defense/critical/dodge/effectBoost（%或百分点）
// 命运可带 lifespanMult（寿元%修正），在 time.js playerLifespan 里读取

export const FATES = [
  { key: 'sword', name: '天生剑骨', desc: '攻击 +25%，防御 -10%', effect: { attack: 0.25, defense: -0.1 } },
  { key: 'daoheart', name: '道心通明', desc: '修为 +30%，灵石 +20%', effect: { cultivation: 0.3, moneyMult: 0.2 } },
  { key: 'devil', name: '魔脉觉醒', desc: '修为 +45%，寿元 -12%', effect: { cultivation: 0.45, lifespanMult: -0.12 } },
  { key: 'fortune', name: '福缘深厚', desc: '灵石 +30%，闪避 +5%', effect: { moneyMult: 0.3, dodge: 0.05 } },
  { key: 'iron', name: '铜筋铁骨', desc: '防御 +30%', effect: { defense: 0.3 } },
  { key: 'fierce', name: '暴虐武夫', desc: '暴击 +10%，攻击 +15%', effect: { critical: 0.1, attack: 0.15 } },
  { key: 'light', name: '身轻如燕', desc: '闪避 +12%，离线收益 +10%', effect: { dodge: 0.12, offlineMult: 0.1 } },
  { key: 'spirit', name: '灵根不灭', desc: '修为 +20%，艺成加成 +15%', effect: { cultivation: 0.2, effectBoost: 0.15 } },
  { key: 'lucky', name: '气运加身', desc: '灵石 +40%，暴击 +5%', effect: { moneyMult: 0.4, critical: 0.05 } }
]

export const WORLD_RULES = [
  { key: 'harvest', name: '天道·灵气丰收', desc: '本世灵石 +30%', effect: { moneyMult: 0.3 } },
  { key: 'rage', name: '天道·万族狂暴', desc: '本世攻击 +15%，灵石 +15%', effect: { attack: 0.15, moneyMult: 0.15 } },
  { key: 'abundant', name: '天道·仙缘浓厚', desc: '本世修为 +25%', effect: { cultivation: 0.25 } },
  { key: 'scarce', name: '天道·灵气稀薄', desc: '本世修为 -10%，但机缘+灵石 +15%', effect: { cultivation: -0.1, moneyMult: 0.15 } },
  { key: 'blade', name: '天道·战意沸腾', desc: '本世攻击 +20%', effect: { attack: 0.2 } },
  { key: 'arcane', name: '天道·道法昌盛', desc: '本世暴击 +8%', effect: { critical: 0.08 } }
]

const sample = (player, lastKey, list) => {
  const pool = list.length > 1 ? list.filter(x => x.key !== lastKey) : list
  return pool[Math.floor(Math.random() * pool.length)]
}

export const rollFate = player => sample(player, player.lastFateKey, FATES)
export const rollWorldRule = player => sample(player, player.lastWorldKey, WORLD_RULES)

// 首世及载入兜底：若还没有命运/天道 buff，则抽一次
export const ensureFate = player => {
  const hasMeta = (player.buffs || []).some(b => b.meta)
  if (!hasMeta) {
    const fate = rollFate(player)
    const world = rollWorldRule(player)
    applyMetaBuffs(player, fate, world)
  }
  return fateInfo(player)
}

export const resetMetaBuffs = player => {
  player.buffs = (player.buffs || []).filter(b => !b.meta)
}

// 应用命运 + 天道 + 宿慧（永久道痕成长）。需在 buffs 已重置后调用。
export const applyMetaBuffs = (player, fate, world) => {
  if (!player.buffs) player.buffs = []
  if (fate) {
    player.buffs.push({ name: fate.name, desc: fate.desc, effect: fate.effect, meta: 'fate', source: '命运' })
    player.fateKey = fate.key
    player.lastFateKey = fate.key
    player.fateLifespanMult = (fate.effect && fate.effect.lifespanMult) || 0
  } else {
    player.fateLifespanMult = 0
  }
  if (world) {
    player.buffs.push({ name: world.name, desc: world.desc, effect: world.effect, meta: 'world', source: '天道' })
    player.worldKey = world.key
    player.lastWorldKey = world.key
  }
  const dm = player.daoMark || 0
  if (dm > 0) {
    const cult = Math.min(1, dm * 0.04)
    const money = Math.min(1, dm * 0.02)
    player.buffs.push({
      name: `宿慧 · ${dm} 道痕`,
      desc: `永久：修为 +${Math.round(cult * 100)}%，灵石 +${Math.round(money * 100)}%`,
      effect: { cultivation: cult, moneyMult: money },
      meta: 'suhui',
      source: '宿慧'
    })
  }
}

// 当前命运信息（用于展示）
export const fateInfo = player => {
  const fate = player?.buffs?.find(b => b.meta === 'fate')
  const world = player?.buffs?.find(b => b.meta === 'world')
  const suhui = player?.buffs?.find(b => b.meta === 'suhui')
  return {
    fate: fate ? { name: fate.name, desc: fate.desc } : null,
    world: world ? { name: world.name, desc: world.desc } : null,
    suhui: suhui ? { name: suhui.name, desc: suhui.desc } : null,
    daoMark: player.daoMark || 0
  }
}
