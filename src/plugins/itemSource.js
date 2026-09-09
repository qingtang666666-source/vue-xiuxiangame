// 物品获取途径统一文案 —— 只写明确、稳定的来源，避免误导

export const sourceOfPill = () => '获取途径：炼丹炼制（游商/坊市偶有出售）'

export const sourceOfTalisman = () => '获取途径：制符绘制（游商/坊市偶有出售）'

export const sourceOfTreasure = () => '获取途径：秘境探索、世界Boss、奇遇、游商'

export const sourceOfEquip = item => (item?.noReq
  ? '获取途径：装备宝箱、游商、活动奖励'
  : '获取途径：大世界探索、秘境、世界Boss、炼器、坊市/游商')

export const sourceOfTechnique = () => '获取途径：历战、秘境、世界Boss、游商、宗门兑换等功法卷轴'

export const sourceOfMaterial = material => {
  const type = material?.type || ''
  if (type === '兽材') return '获取途径：击败妖兽、世界Boss、探索掉落、坊市购买'
  if (type === '精萃') return '获取途径：秘境掉落、高阶采集、坊市/游商购买'
  if (type === '灵材') return '获取途径：秘境、世界Boss、奇遇、坊市/游商'
  if (type === '矿石') return '获取途径：大世界探索、秘境采集、坊市/游商购买'
  if (type === '灵植' || type === '药材') return '获取途径：大世界探索、秘境采集、坊市/游商购买'
  return '获取途径：探索、秘境、坊市/游商'
}

const PROP_SOURCE = {
  spiritHerb: '获取途径：洞府灵田、大世界探索、秘境',
  money: '获取途径：战斗、任务、出售物品',
  daoFruit: '获取途径：历战胜利掉落',
  flying: '获取途径：NPC赠礼、游商',
  rootBone: '获取途径：世界Boss、游商',
  qingyuan: '获取途径：NPC赠礼',
  currency: '获取途径：世界Boss、秘境首领',
  cultivateDan: '获取途径：大世界探索、历战、秘境',
  strengtheningStone: '获取途径：分解装备、探索、秘境'
}

export const sourceOfProp = key => PROP_SOURCE[key] || ''
