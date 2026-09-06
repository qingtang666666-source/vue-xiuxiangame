// 多区域地图 —— 不同界域分布不同类型的交易场所（坊市/交易会/黑市/拍卖会/赌石）
//
// 玩家随境界处于不同区域；区域内可用的交易场所不同，让「不同地图有不同坊市/拍卖/黑市/商会」。
// venueKey: market=交易坊市 fair=交易会 black=黑市 auction=拍卖会 gamble=赌石

export const REGIONS = [
  { idx: 0, name: '青阳界·凡尘', minLevel: 1, maxLevel: 19, theme: '人间烟火，武者初行', venueName: '青阳坊市', venues: ['market'] },
  { idx: 6, name: '苍梧原·荒原', minLevel: 5, maxLevel: 24, theme: '大漠孤烟，猎户与流寇', venueName: '苍梧集市', venues: ['market'] },
  { idx: 1, name: '千灵山脉·灵山', minLevel: 10, maxLevel: 39, theme: '灵峰叠翠，仙缘初露', venueName: '千灵商会', venues: ['market', 'fair'] },
  { idx: 7, name: '碧水沧洲·水乡', minLevel: 15, maxLevel: 43, theme: '烟波浩渺，画舫鱼市', venueName: '沧洲商埠', venues: ['market', 'fair'] },
  { idx: 2, name: '万妖岭·妖域', minLevel: 20, maxLevel: 59, theme: '妖兽横行，亦有暗市', venueName: '妖域黑市', venues: ['market', 'black'] },
  { idx: 8, name: '青冥古林·林海', minLevel: 25, maxLevel: 59, theme: '古木参天，兽皮灵药', venueName: '林海集镇', venues: ['market', 'black'] },
  { idx: 9, name: '炎狱熔渊·火域', minLevel: 35, maxLevel: 69, theme: '地火喷涌，铁匠与赌石', venueName: '熔渊坊', venues: ['market', 'gamble'] },
  { idx: 3, name: '九霄仙府·仙域', minLevel: 40, maxLevel: 89, theme: '仙宫林立，拍卖惊天', venueName: '九霄拍卖行', venues: ['market', 'fair', 'auction'] },
  { idx: 10, name: '玄冰极境·冰原', minLevel: 45, maxLevel: 89, theme: '千里冰封，竞拍凝霜奇珍', venueName: '玄冰阁', venues: ['market', 'auction'] },
  { idx: 11, name: '雷泽禁地·雷原', minLevel: 55, maxLevel: 99, theme: '雷霆万钧，禁地黑市', venueName: '雷泽黑市', venues: ['market', 'black', 'auction'] },
  { idx: 4, name: '天魔渊·魔域', minLevel: 60, maxLevel: 119, theme: '魔气森然，奇珍汇聚', venueName: '天魔黑市', venues: ['market', 'black', 'gamble'] },
  { idx: 12, name: '幽泉鬼蜮·鬼界', minLevel: 65, maxLevel: 109, theme: '阴风惨惨，鬼市赌运', venueName: '幽冥鬼市', venues: ['market', 'gamble'] },
  { idx: 13, name: '星陨原·星域', minLevel: 75, maxLevel: 119, theme: '陨星累累，星尘奇珍', venueName: '星陨商会', venues: ['market', 'fair', 'gamble'] },
  { idx: 14, name: '混沌虚空·虚空', minLevel: 85, maxLevel: 129, theme: '空间破碎，寻宝拍卖', venueName: '虚空宝阁', venues: ['market', 'auction', 'black'] },
  { idx: 15, name: '万古秘境·上古', minLevel: 95, maxLevel: 134, theme: '远古遗迹，大能遗留', venueName: '秘境长街', venues: ['market', 'fair', 'auction', 'gamble'] },
  { idx: 5, name: '鸿蒙天·神域', minLevel: 100, maxLevel: 144, theme: '大道之巅，万法归一', venueName: '鸿蒙万宝楼', venues: ['market', 'fair', 'auction', 'black', 'gamble'] }
  ,{ idx: 16, name: '太虚天宫·天界', minLevel: 105, maxLevel: 144, theme: '仙宫巍峨，万法归一', venueName: '太虚天市', venues: ['market', 'fair', 'auction', 'black', 'gamble'] }
  ,{ idx: 17, name: '九幽炼狱·冥界', minLevel: 115, maxLevel: 144, theme: '狱火灼灼，冥河摆渡', venueName: '九幽冥铺', venues: ['market', 'black', 'gamble'] }
  ,{ idx: 18, name: '无极道台·道庭', minLevel: 130, maxLevel: 144, theme: '大道尽头，问道于天', venueName: '无极道市', venues: ['market', 'fair', 'auction', 'gamble'] }
]

export const VENUE_NAMES = {
  market: '交易坊市',
  fair: '交易会',
  black: '黑市',
  auction: '拍卖会',
  gamble: '赌石'
}

export const currentRegion = player => {
  const lv = player.level || 0
  let r = REGIONS[0]
  REGIONS.forEach(x => {
    if (lv >= x.minLevel) r = x
  })
  return r
}

export const regionHasVenue = (player, venueKey) => {
  const r = currentRegion(player)
  return (r.venues || []).includes(venueKey)
}
