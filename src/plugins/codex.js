// 图鉴收集度：统计六类图鉴（材料/丹药/符箓/功法/阵法/天材地宝）已收集占比，给全局加成
import { MATERIALS } from './materialDb.js'
import { RECIPES } from './alchemy.js'
import { TALISMANS } from './talisman.js'
import { TECHNIQUES } from './technique.js'
import { FORMATIONS } from './formation.js'
import { TREASURES } from './treasure.js'

export const codexStats = player => {
  const matOwn = MATERIALS.filter(m => (player.props?.[m.key] || 0) > 0).length
  const matTotal = MATERIALS.length
  const pillOwn = RECIPES.filter(r => player.pills?.some(p => p.id === r.id)).length
  const pillTotal = RECIPES.length
  const talOwn = TALISMANS.filter(t => player.talismans?.some(x => x.id === t.id)).length
  const talTotal = TALISMANS.length
  const techOwn = TECHNIQUES.filter(t => player.methods?.[t.id]).length
  const techTotal = TECHNIQUES.length
  const formOwn = FORMATIONS.filter(f => (player.formations?.[f.id] || 0) > 0).length
  const formTotal = FORMATIONS.length
  const treOwn = TREASURES.filter(t => (player.treasures?.[t.key] || 0) > 0).length
  const treTotal = TREASURES.length
  const total = matTotal + pillTotal + talTotal + techTotal + formTotal + treTotal
  const owned = matOwn + pillOwn + talOwn + techOwn + formOwn + treOwn
  return {
    owned,
    total,
    percent: total ? owned / total : 0,
    counts: {
      material: [matOwn, matTotal],
      pill: [pillOwn, pillTotal],
      talisman: [talOwn, talTotal],
      technique: [techOwn, techTotal],
      formation: [formOwn, formTotal],
      treasure: [treOwn, treTotal]
    }
  }
}

// 全局加成：每 1% 图鉴 +0.1% 修为、+0.05% 灵石
export const codexBonus = player => {
  const { percent } = codexStats(player)
  return {
    cultivation: percent * 0.1,
    money: percent * 0.05
  }
}
