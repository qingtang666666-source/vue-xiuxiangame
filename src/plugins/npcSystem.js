// 下界 NPC／坊市系统 —— 交易、学艺、传授功法
//
// 每个轮回(转生)随机生成一批下界 NPC，不固定。
//   商贾：交易(买资源)     炼丹师/炼器师/符师/阵法师：授相应技艺
//   得道散修：传授功法(永久修炼/灵石加成)
// 技艺等级提供对应领域的永久增益(战斗/挂机)，功法提供持续成长。

import { realmStageOf } from './game.js'
import { TECHNIQUES } from './technique.js'
import { MATERIALS } from './materialDb.js'
import { addTreasure, treasureByTier } from './treasure.js'
import { forgeBuild } from './forge.js'
import { insightSkillBonus } from './insight.js'

const NAME_POOL = [
  '云渺仙子', '琉光幽姬', '烟霞仙子', '清韵灵姬', '碧落灵仙', '绮霞灵女', '瑶光雪姬', '琉璃雪姬', '幽篁雪姬', '雪舞灵姬',
  '铁羽道人', '玄真子', '墨渊真人', '青阳子', '玉衡散人', '火光上人', '碧波老祖', '紫阳真人', '白头翁', '无崖子',
  '苏掌柜', '金不换', '万宝斋', '陆万金', '钱多多', '陶朱公', '沈万三', '白圭', '巨贾', '汇通天下',
  '药王谷主', '丹青子', '华清仙子', '灵药童子', '回春手', '妙手仁心', '紫炉真人', '百草居士', '悬壶客', '医仙',
  '铸剑师·欧冶', '火工头陀', '百炼老人', '天工子', '龙泉君', '锻铁翁', '炉火道人', '淬火仙', '千锤百炼', '匕火老祖',
  '朱符道人', '画符居士', '灵笔仙', '符宗长老', '黄纸翁', '镇魔道人', '驱邪子', '净坛使者', '丹青符圣', '符疯子',
  '布阵宗师', '阵道子', '八卦真人', '奇门遁甲', '天机子', '北斗老人', '星罗棋布', '周天居士', '鱼龙曼衍', '阵盘宗师',
  '讲经老道', '传功长老', '坐忘真人', '守一大师', '抱朴子', '逍遥子', '南华真人', '赤松子', '广成子', '太上忘情'
]

const ROLE_DEFS = [
  { key: 'merchant', name: '商贾', icon: '💰', desc: '走南闯北，万事可易。', min: 3, kind: 'trade' },
  { key: 'alchemist', name: '炼丹师', icon: '⚗️', desc: '丹道宗师，可授炼丹之术。', min: 1, kind: 'skill', skill: 'alchemy' },
  { key: 'forger', name: '炼器师', icon: '🔥', desc: '百炼成钢，可授炼器之术。', min: 1, kind: 'skill', skill: 'forge' },
  { key: 'talisman', name: '符师', icon: '📜', desc: '符箓大家，可授制符之术。', min: 1, kind: 'skill', skill: 'talisman' },
  { key: 'formation', name: '阵法师', icon: '⛩️', desc: '阵法高人，可授布阵之术。', min: 1, kind: 'skill', skill: 'formation' },
  { key: 'elder', name: '得道散修', icon: '🧙', desc: '修为莫测，可传无上功法。', min: 1, kind: 'technique' },
  { key: 'bandit', name: '劫匪', icon: '🗡️', desc: '拦路剪径，专干无本买卖。', min: 2, kind: 'fight' }
]

export const SKILL_KEYS = ['alchemy', 'forge', 'talisman', 'formation']
export const SKILL_MAX_LEVELS = 12
export const SCOUT_CD = 60000 // 窥探同一人的冷却（毫秒）
export const SCOUT_FAV_TRUST = 80 // 好感度达到此阈值，无需窥探直接获取情报
export const SCOUT_FAV_INTIMATE = 95 // 好感度达到此阈值，解锁专属剧情与稀礼

// 人物性格 / 生平（供「谈心」剧情与展示）
export const PERSONALITIES = [
  { name: '豪爽', desc: '性情豪迈，喜交四方好友' },
  { name: '内敛', desc: '沉默寡言，心思深沉' },
  { name: '狡黠', desc: '鬼点子多，说话留三分' },
  { name: '忠厚', desc: '老实巴交，重情重义' },
  { name: '孤傲', desc: '眼高于顶，难近人心' },
  { name: '慈祥', desc: '心怀善念，乐善好施' },
  { name: '冷面', desc: '面冷心热，外冷内热' },
  { name: '风趣', desc: '妙语连珠，谈笑风生' },
  { name: '痴情', desc: '为情所困，一见倾心' },
  { name: '市侩', desc: '精打细算，锱铢必较' }
]

const BIO_POOL = [
  '早年丧亲，独自闯荡修真界', '出身名门，却隐居避世', '曾是一方枭雄，如今金盆洗手',
  '游历四方，只为寻一味失传灵药', '拜师无数，却无一技之成', '心向大道，情牵一人',
  '受人所托，守护一间破庙', '嗜好赌石，常与奇珍擦肩', '隐姓埋名，实为某宗长老',
  '看尽人间冷暖，心性愈发坚韧'
]

const STORY_POOL = [
  '谈及往事，他/她眼中有光，似有未了之愿。',
  '你提及修行趣事，他/她不禁莞尔，气氛融洽。',
  '他/她取出一壶灵酿，邀你共饮，畅谈大道。',
  '闲聊间他/她不经意指点你一句，令你豁然开朗。',
  '他/她说起一桩江湖旧案，你听得入神。',
  '临别时他/她送你一物，谓有缘再会。'
]
// 学艺/传功法所需好感度（不宜过高）
export const SKILL_FAV_REQ = 20
export const TECH_FAV_REQ = 30
// 结交一次提升好感度
export const BEFRIEND_GAIN = 25
export const BEFRIEND_COST = 60

export const TRADE_ITEMS = [
  { key: 'spiritHerb', name: '灵草', base: 60 },
  { key: 'strengtheningStone', name: '炼器石', base: 120 },
  { key: 'cultivateDan', name: '培养丹', base: 320 },
  { key: 'rootBone', name: '悟性丹', base: 600 },
  { key: 'currency', name: '混沌石', base: 1600 }
]

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
const pick = arr => arr[Math.floor(Math.random() * arr.length)]

// 生成一批下界 NPC（每个轮回刷新）
export const generateWorldNpcs = (count = 12) => {
  const roles = []
  ROLE_DEFS.forEach(r => {
    for (let i = 0; i < r.min; i++) roles.push(r)
  })
  while (roles.length < count) {
    roles.push(pick(ROLE_DEFS))
  }
  // 打乱
  roles.sort(() => Math.random() - 0.5)

  return roles.map((r, i) => {
    const npc = {
      id: `npc-${Date.now()}-${i}`,
      name: pick(NAME_POOL),
      role: r.key,
      roleName: r.name,
      icon: r.icon,
      kind: r.kind,
      skill: r.skill || null,
      desc: r.desc,
      level: randInt(60, 144),
      favorability: randInt(10, 40),
      personality: pick(PERSONALITIES).name,
      bio: pick(BIO_POOL)
    }
    if (r.kind === 'trade') {
      npc.shop = TRADE_ITEMS.map(item => ({
        key: item.key,
        name: item.name,
        price: Math.round(item.base * (1 + Math.random() * 0.6)),
        stock: randInt(3, 12)
      }))
    }
    if (r.kind === 'fight') npc.hostile = true
    return npc
  })
}

// 按轮回刷新：转生后 NPC 重生成
export const ensureWorldNpcs = player => {
  if (player.worldNpcsReincarnation !== player.reincarnation) {
    player.worldNpcs = generateWorldNpcs(12)
    player.worldNpcsReincarnation = player.reincarnation
  }
  if (!player.skills) player.skills = { alchemy: 0, forge: 0, talisman: 0, formation: 0 }
  return player.worldNpcs
}

// 技艺学习花费
export const skillUpgradeCost = (player, key) => {
  const lv = (player.skills || {})[key] || 0
  const money = Math.floor(60 * Math.pow(lv + 1, 1.4))
  const dan = lv >= 5 ? Math.floor((lv - 4) * 1) : 0
  return { money, dan }
}

export const learnSkill = (player, npc) => {
  const key = npc.skill
  const lv = (player.skills || {})[key] || 0
  if (lv >= SKILL_MAX_LEVELS) return { ok: false, reason: '此术已臻化境' }
  if (npc.favorability < SKILL_FAV_REQ) return { ok: false, reason: `好感度不足(${npc.favorability}/${SKILL_FAV_REQ})，先结交` }
  const cost = skillUpgradeCost(player, key)
  const props = player.props || {}
  if ((props.money || 0) < cost.money) return { ok: false, reason: '灵石不足' }
  if ((props.cultivateDan || 0) < cost.dan) return { ok: false, reason: '培养丹不足' }
  props.money -= cost.money
  props.cultivateDan -= cost.dan
  if (!player.skills) player.skills = { alchemy: 0, forge: 0, talisman: 0, formation: 0 }
  player.skills[key] = lv + 1 + insightSkillBonus(player)
  npc.favorability = Math.min(100, npc.favorability + 10)
  return { ok: true, level: player.skills[key] }
}

// 功法(散修传授)：可重复参悟，提升修炼与灵石收益
export const techniqueCount = player => player.techniques || 0
export const techniqueCost = player => {
  const n = techniqueCount(player)
  return { money: Math.floor(120 * Math.pow(n + 1, 1.3)) }
}
export const learnTechnique = (player, npc) => {
  const cost = techniqueCost(player)
  const props = player.props || {}
  if (npc.favorability < TECH_FAV_REQ) return { ok: false, reason: `好感度不足(${npc.favorability}/${TECH_FAV_REQ})，先结交` }
  if ((props.money || 0) < cost.money) return { ok: false, reason: '灵石不足' }
  props.money -= cost.money
  player.techniques = (player.techniques || 0) + 1
  npc.favorability = Math.min(100, npc.favorability + 10)
  return { ok: true, count: player.techniques }
}

// 结交：花少量灵石提升好感度
export const befriend = (player, npc) => {
  const props = player.props || {}
  if ((props.money || 0) < BEFRIEND_COST) return { ok: false, reason: '灵石不足' }
  props.money -= BEFRIEND_COST
  npc.favorability = Math.min(100, npc.favorability + BEFRIEND_GAIN)
  return { ok: true, favorability: npc.favorability }
}

// 人物剧情：与 NPC 谈心，触发一小段个人故事，得少量好感（偶有小赠）
export const npcStory = (player, npc) => {
  const favPlus = Math.max(2, Math.min(10, Math.round((100 - npc.favorability) / 12) + 3))
  npc.favorability = Math.min(100, npc.favorability + favPlus)
  const text = pick(STORY_POOL)
  let gift = null
  if (Math.random() < 0.12) {
    const money = Math.floor((player.level || 1) * 20)
    player.props.money = (player.props.money || 0) + money
    gift = `灵石 +${money}`
  }
  return { ok: true, title: `与【${npc.name}】谈心`, text, favorability: npc.favorability, gift }
}

// 由境界推算 NPC 战斗属性（窥探展示用，与野怪/玩家量级相近）
export const npcCombatStats = npc => {
  const lv = Math.max(1, npc.level || 100)
  return {
    attack: Math.floor(lv * 60),
    defense: Math.floor(lv * 40),
    health: Math.floor(lv * 400),
    critical: 0.02 + lv * 0.0001,
    dodge: 0.02 + lv * 0.0001
  }
}

// 人物窥探：按大境界差定成功率；同境 100%，低窥高每阶 -20%，高窥低必成
export const scoutNpc = (player, npc) => {
  const trusted = (npc.favorability || 0) >= SCOUT_FAV_TRUST
  if (!trusted) {
    const cd = scoutCdLeft(npc)
    if (cd > 0) return { ok: false, cooldown: true, reason: `窥探神识未复，需等待 ${cd} 秒` }
  }
  const ps = realmStageOf(player.level || 0)
  const ns = realmStageOf(npc.level || 0)
  const stats = npcCombatStats(npc)
  const score = Math.floor(stats.attack * 1.5 + stats.defense * 1.2 + stats.health / 100 + stats.critical * 180 + stats.dodge * 160)
  const method = pick(TECHNIQUES).name
  const pouch = [...new Set(Array.from({ length: 3 }, () => pick(MATERIALS).name))]
  // 亲密度足够：无需窥探，直接可知（也不计冷却）
  if (trusted) {
    return { ok: true, trust: true, desc: '对方已视你为知己，愿坦诚相告', name: npc.name, role: npc.roleName, level: npc.level, realm: ns, stats, score, method, pouch }
  }
  const cd = scoutCdLeft(npc)
  if (cd > 0) return { ok: false, cooldown: true, reason: `窥探神识未复，需等待 ${cd} 秒` }
  let rate = 1
  let desc = ''
  if (ps >= ns) {
    rate = 1
    desc = ps === ns ? '境界相当，窥探必成' : `你高对方 ${ps - ns} 阶，必窥得通透`
  } else {
    rate = Math.max(0.05, 1 - (ns - ps) * 0.2)
    desc = `对方高你 ${ns - ps} 阶，窥探成功率 ${Math.round(rate * 100)}%`
  }
  if (Math.random() >= rate) {
    npc.scoutAt = Date.now()
    return { ok: false, desc, reason: '对方神识强横，你窥探被反噬而退' }
  }
  npc.scoutAt = Date.now()
  return { ok: true, desc, name: npc.name, role: npc.roleName, level: npc.level, realm: ns, stats, score, method, pouch }
}

// 窥探冷却剩余秒数
export const scoutCdLeft = npc => {
  if (!npc?.scoutAt) return 0
  return Math.max(0, Math.ceil((SCOUT_CD - (Date.now() - npc.scoutAt)) / 1000))
}

// 亲密专属剧情 + 稀礼（亲密度≥95、一次性）：高品天材地宝 / 高级神兵 / 高级功法
export const npcIntimate = (player, npc) => {
  if ((npc.favorability || 0) < SCOUT_FAV_INTIMATE) return { ok: false, reason: `亲密度需达 ${SCOUT_FAV_INTIMATE}` }
  if (npc.intimateGiven) return { ok: false, reason: '对方与你已无更多倾囊之谊' }
  npc.intimateGiven = true
  const story = `【${npc.name}】将你引为知己，向你道出一段不为人知的过往，并赠上珍藏多年之物。`
  const roll = Math.random()
  let giftName = ''
  if (roll < 0.34) {
    const t = treasureByTier(5 + Math.floor(Math.random() * 4)) // 阶5~8
    addTreasure(player, t.key, 1)
    giftName = `天材地宝【${t.name}】`
  } else if (roll < 0.67) {
    const eq = forgeBuild({ type: 'weapon', quality: Math.random() < 0.5 ? 'gold' : 'legendary', grade: 4, level: Math.max(1, player.level || 10), strengthen: 0 })
    if (!player.inventory) player.inventory = []
    player.inventory.push(eq)
    giftName = `神兵【${eq.name}】`
  } else {
    const g = Math.min(11, 6 + Math.floor(Math.random() * 3)) // 阶6~8
    const pool = TECHNIQUES.filter(x => x.grade === g)
    const tech = pool.length ? pick(pool) : TECHNIQUES[0]
    if (!player.methods) player.methods = {}
    player.methods[tech.id] = { chapter: 1 }
    if (!player.mainMethod) player.mainMethod = tech.id
    giftName = `传承功法【${tech.name}】`
  }
  return { ok: true, story, giftName }
}

// 商贾交易
export const buyFromNpc = (player, npc, itemKey) => {
  const props = player.props || {}
  const item = (npc.shop || []).find(s => s.key === itemKey)
  if (!item) return { ok: false, reason: '该商品已售罄' }
  if (item.stock <= 0) return { ok: false, reason: '库存不足' }
  if ((props.money || 0) < item.price) return { ok: false, reason: '灵石不足' }
  props.money -= item.price
  props[itemKey] = (props[itemKey] || 0) + 1
  item.stock -= 1
  return { ok: true, item, name: item.name }
}

// 玩家粗略战力（供截杀判定，不引入其他模块，避免循环依赖）
const playerPower = player =>
  (player.attack || 0) * 3 + (player.defense || 0) + (player.maxHealth || 0) * 0.1 + (player.level || 0) * 6
const npcPower = npc => (npc.level || 100) * 9

// 截杀单个 NPC：按战力结算，成功夺宝，失败损失灵石
export const ambushNpc = (player, npc) => {
  const pp = playerPower(player)
  const np = npcPower(npc)
  const chance = Math.min(0.95, Math.max(0.15, pp / (pp + np)))
  if (Math.random() < chance) {
    const loot = lootOf(npc, player)
    player.worldNpcs = player.worldNpcs.filter(n => n.id !== npc.id)
    return { ok: true, loot }
  }
  const lost = Math.min((player.props.money || 0), Math.floor((player.level || 1) * 20))
  player.props.money -= lost
  return { ok: false, reason: `截杀失败，被${npc.name}反击，损失 ${lost} 灵石` }
}

// 抢劫商人：打劫一半库存，可能惊动护院
export const robNpc = (player, npc) => {
  if (npc.role !== 'merchant') return { ok: false, reason: '此人并非商贾' }
  if (Math.random() < 0.4) {
    const lost = Math.min((player.props.money || 0), Math.floor((player.level || 1) * 30))
    player.props.money -= lost
    return { ok: false, reason: `护院出手，抢劫失败，损失 ${lost} 灵石` }
  }
  const gains = {}
  npc.shop.forEach(s => {
    if (s.stock > 0) {
      const take = Math.ceil(s.stock / 2)
      gains[s.key] = (gains[s.key] || 0) + take
      player.props[s.key] = (player.props[s.key] || 0) + take
      s.stock -= take
    }
  })
  player.worldNpcs = player.worldNpcs.filter(n => n.id !== npc.id)
  return { ok: true, gains }
}

// 回合制战斗后结算：截杀/抢劫胜利
export const ambushWin = (player, npc) => {
  const loot = lootOf(npc, player)
  player.worldNpcs = (player.worldNpcs || []).filter(n => n.id !== npc.id)
  return { ok: true, loot }
}
export const robWin = (player, npc) => {
  const gains = {}
  ;(npc.shop || []).forEach(s => {
    if (s.stock > 0) {
      const take = Math.ceil(s.stock / 2)
      gains[s.key] = (gains[s.key] || 0) + take
      player.props[s.key] = (player.props[s.key] || 0) + take
      s.stock -= take
    }
  })
  player.worldNpcs = (player.worldNpcs || []).filter(n => n.id !== npc.id)
  return { ok: true, gains }
}
export const ambushLose = player => {
  const lost = Math.min((player.props.money || 0), Math.floor((player.level || 1) * 20))
  player.props.money = (player.props.money || 0) - lost
  return { ok: true, lost }
}
export const robLose = player => {
  const lost = Math.min((player.props.money || 0), Math.floor((player.level || 1) * 30))
  player.props.money = (player.props.money || 0) - lost
  return { ok: true, lost }
}

// 截杀掠夺品：按身份掉落
const lootOf = (npc, player) => {
  const lv = npc.level || 100
  const props = player.props || {}
  const gains = {}
  const add = (key, v) => {
    if (!v) return
    gains[key] = (gains[key] || 0) + v
    props[key] = (props[key] || 0) + v
  }
  switch (npc.role) {
    case 'merchant':
      add('money', Math.floor(lv * (12 + Math.random() * 15)))
      break
    case 'alchemist':
      add('cultivateDan', randInt(2, 6))
      add('spiritHerb', randInt(20, 60))
      break
    case 'forger':
      add('strengtheningStone', randInt(20, 60))
      add('money', Math.floor(lv * 8))
      break
    case 'talisman':
      add('spiritHerb', randInt(20, 60))
      add('cultivateDan', randInt(1, 4))
      break
    case 'formation':
      add('cultivateDan', randInt(2, 5))
      add('strengtheningStone', randInt(10, 30))
      break
    case 'elder':
      add('rootBone', randInt(1, 3))
      add('money', Math.floor(lv * 20))
      break
    default:
      add('money', Math.floor(lv * (6 + Math.random() * 8)))
      add('strengtheningStone', randInt(5, 20))
  }
  return gains
}

// 技艺功法汇总成战斗/挂机加成
export const skillStats = player => {
  const s = player.skills || {}
  const al = s.alchemy || 0
  const fo = s.forge || 0
  const ta = s.talisman || 0
  const fm = s.formation || 0
  const tech = player.techniques || 0
  return {
    attack: fo * 25,
    defense: fo * 15,
    health: al * 40,
    critical: ta * 0.004,
    dodge: ta * 0.004,
    cultivationSpeed: al * 0.01 + tech * 0.008,
    moneyMult: tech * 0.004,
    effectBoost: fm * 0.002
  }
}
