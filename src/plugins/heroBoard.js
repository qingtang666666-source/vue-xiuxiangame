// 豪杰榜 —— 300 名 NPC，可挑战排名更高者晋升；前100有周期性奖励
// 豪杰强度按“境界基准值”生成，不随玩家属性缩放
import { playerPowerScore } from './breakthroughGate'

export const HERO_COUNT = 300

// 确定性姓名（不随刷新变化）
const SURNAMES = ['王','李','张','刘','陈','杨','赵','黄','周','吴','徐','孙','朱','马','胡','郭','何','高','林','罗','郑','梁','谢','宋','唐','许','韩','冯','邓','曹','彭','曾','萧','尹','黄','任']
const GIVEN = ['青山','长歌','无涯','玄机','凌云','子夜','明轩','青莲','扶摇','听风','天策','北冥','破军','星痕','问天','承影','夜阑','御风','山河','归鸿','慕白','流云','惊鸿','破晓','君临','飞雪','孤舟','剑心','绯烟','鸿影','守拙','听涛','玄清','宇轩','鹤鸣','未央','离尘','君陌','拂晓','望舒']
const nameOf = i => SURNAMES[(i * 3) % SURNAMES.length] + GIVEN[(i * 7) % GIVEN.length]

// 境界基准怪值（取区间中值，确定性）
const heroStats = (lv, eliteMult = 1.15) => {
  lv = Math.max(1, Math.min(144, Math.floor(lv)))
  const s = Math.min(15, Math.max(0, Math.floor((lv - 1) / 9)))
  const mult = 1 + s * 0.35
  const atk = Math.floor(50 * lv * mult * eliteMult)
  const hp = Math.floor(150 * lv * mult * eliteMult)
  const def = Math.floor(4.5 * lv * eliteMult)
  const critical = 0.005 + s * 0.001
  return { level: lv, health: hp, maxHp: hp, hp, attack: atk, defense: def, critical, dodge: 0.03 }
}

const scoreOfStats = (atk, hp, def, crit, dodge) =>
  Math.floor(dodge * 1.6 * 100 + atk * 2 + (hp / 100) * 0.2 + def * 1.2 + crit * 1.8 * 100)

// rank: 1=最强(最高境界)，300=最弱
export const heroLevelOfRank = rank => {
  rank = Math.max(1, Math.min(HERO_COUNT, Math.floor(rank)))
  const min = 25 // 最弱者境界(等级下限)，避免前期秒进前300
  const max = 144
  return Math.round(max - ((rank - 1) / (HERO_COUNT - 1)) * (max - min))
}

export const heroPowerOfRank = rank => {
  const lv = heroLevelOfRank(rank)
  const st = heroStats(lv, 1.0)
  return scoreOfStats(st.attack, st.health, st.defense, st.critical, st.dodge)
}

// 生成挑战用的敌人实体（供 TurnCombat monsterToEntity 使用）
export const heroEnemy = (rank, name) => {
  const lv = heroLevelOfRank(rank)
  const st = heroStats(lv, 1.15)
  st.name = name || '无名单客'
  st.dodge = 0.03
  return st
}

let _heroes = null
// 生成 300 名豪杰（模块级缓存；转生后可再调 regenerateHeroes）
export const generateHeroes = () => {
  if (_heroes) return _heroes
  const out = []
  for (let i = 1; i <= HERO_COUNT; i++) {
    out.push({
      id: `hero-${i}`,
      rank: i,
      name: nameOf(i),
      level: heroLevelOfRank(i),
      power: heroPowerOfRank(i)
    })
  }
  _heroes = out
  return out
}

export const regenerateHeroes = () => {
  _heroes = null
  return generateHeroes()
}

export const getHeroById = id => generateHeroes().find(h => h.id === id)
export const getHeroAtRank = rank => generateHeroes().find(h => h.rank === rank)

// 玩家栏位：默认在 301（未上榜，需挑战 #300 进入）。胜利则与对手交换名次。
export const playerSlot = player => (player.heroRank || 301)

export const initHero = player => {
  if (typeof player.heroRank !== 'number') player.heroRank = HERO_COUNT + 1
  if (typeof player.heroClaimDate !== 'string') player.heroClaimDate = ''
  return player
}

// 前100奖励（排名越高越好，但不要过强）
export const heroReward = rank => {
  rank = Math.max(1, Math.min(HERO_COUNT, Math.floor(rank || HERO_COUNT + 1)))
  const diff = heroLevelOfRank(rank) // 用境界当奖励强度参考
  const money = Math.floor(500 + diff * 60)
  const dan = Math.max(1, Math.floor(diff / 12))
  const currency = rank <= 20 ? Math.max(1, Math.floor((101 - rank) / 20)) : 0
  return { money, dan, currency }
}

// 能否挑战：目标排名必须严格高于玩家当前排名（数字更小）
export const canChallenge = (player, targetRank) => {
  const p = playerSlot(player)
  return targetRank >= 1 && targetRank < p
}

// 结算挑战胜利：交换名次
export const applyWin = (player, targetRank) => {
  const cur = playerSlot(player)
  const victim = getHeroAtRank(targetRank)
  if (victim) victim.rank = cur > HERO_COUNT ? HERO_COUNT + 1 : cur
  player.heroRank = targetRank
  return { from: cur, to: targetRank }
}

export const applyLose = () => ({ ok: false })

// 玩家战力是否已足够上榜(参考) —— 仅用于提示，不强制
export const canEnterHint = player => playerPowerScore(player) >= heroPowerOfRank(HERO_COUNT)

// 榜单展示：rank 1..300，玩家所在名次替换为“你”
export const boardList = player => {
  initHero(player)
  const ptr = player.heroRank || (HERO_COUNT + 1)
  const heroes = generateHeroes()
  const out = []
  for (let r = 1; r <= HERO_COUNT; r++) {
    if (ptr === r) {
      out.push({ rank: r, name: '你', level: player.level || 1, power: playerPowerScore(player), isPlayer: true, id: '__player__' })
    } else {
      const h = heroes.find(x => x.rank === r)
      if (h) out.push(h)
    }
  }
  return out
}
