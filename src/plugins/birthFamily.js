// 出生家庭 —— 出生时随机 1~10，越大家境越好，仅影响这一世(开局资源+根骨保底)

const FAMILY = [
  { name: '寒门', desc: '家徒四壁，身世微寒' },
  { name: '农家', desc: '日出而作，踏实本分' },
  { name: '樵夫', desc: '以山为家，体魄矫健' },
  { name: '商贩', desc: '走街串巷，见多识广' },
  { name: '掌柜', desc: '小有家业，衣食无忧' },
  { name: '书香门第', desc: '诗书传家，根基不浅' },
  { name: '武学世家', desc: '祖辈习武，家学渊源' },
  { name: '修仙世家', desc: '仙缘深厚，资源不缺' },
  { name: '宗门嫡传', desc: '宗门核心，重点栽培' },
  { name: '仙家血裔', desc: '仙脉传承，天生道种' }
]

export const rollBirthFamily = () => 1 + Math.floor(Math.random() * 10)

export const birthFamilyInfo = roll => FAMILY[(roll - 1) || 0]

// 家境加成：数值克制（只影响开局，不做永久膨胀）
export const birthFamilyBonus = roll => {
  const money = [0, 100, 200, 400, 700, 1200, 2000, 3200, 5000, 8000][roll - 1] || 0
  const minRootBone = [0, 0, 0, 0, 0, 0, 1, 2, 2, 3][roll - 1] || 0
  const herb = roll >= 7 ? 10 : 0
  const dan = roll >= 9 ? 2 : 0
  return { money, minRootBone, herb, dan }
}

// 应用出生家境（需在 ensureAptitude 之后调用，以便根骨保底生效）
export const applyBirthFamily = (player, roll) => {
  player.birthFamily = roll
  if (!player.birthFamilySeen) player.birthFamilySeen = []
  if (!player.birthFamilySeen.includes(roll)) player.birthFamilySeen.push(roll)
  const b = birthFamilyBonus(roll)
  player.props.money = (player.props.money || 0) + b.money
  if (b.herb) player.props.spiritHerb = (player.props.spiritHerb || 0) + b.herb
  if (b.dan) player.props.cultivateDan = (player.props.cultivateDan || 0) + b.dan
}

export const ensureBirthFamily = player => {
  if (!player.birthFamily) applyBirthFamily(player, rollBirthFamily())
  return player.birthFamily
}
