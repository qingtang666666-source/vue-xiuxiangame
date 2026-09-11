// 财富体检 —— 灵石 + 筹码 合计超限的部分按异常数据直接清空
//
// 规则：灵石(money) 与 筹码(chips) 的合计值不允许超过 WEALTH_TOTAL_CAP（50 亿）。
// 一旦超出（改档、长期挂机刷币、玩法漏洞溢出的脏数据），超出的部分直接抹掉，静默处理不弹提示。
// 扣减顺序：先扣筹码（娱乐用币），筹码扣到 0 还不够再扣灵石，尽量不影响正常养成资源。
//
// 触发时机（三处，都是自动的）：
//   1) 读档后立刻体检一次  —— persistence.loadState / saveVault.importSaveText
//   2) 每次落盘前再体检一次 —— persistence.persistNow（自动保存前兜底，脏数据写不进存档）

export const WEALTH_TOTAL_CAP = 5_000_000_000 // 50 亿

// 只取有效计数：非数字/负数/NaN 一律按 0 参与计算（不主动改写，只用于比较）
const toCount = v => {
  const n = Number(v)
  if (!Number.isFinite(n) || n <= 0) return 0
  return Math.floor(n)
}

/** 灵石 + 筹码 的合计值（只算有效计数） */
export const wealthTotal = props => toCount(props && props.money) + toCount(props && props.chips)

/**
 * 把 props.money + props.chips 合计裁剪到上限以内。
 * @param {object} props 玩家 props（player.props）
 * @returns {number} 被清空的数值；0 表示无需处理
 */
export const trimWealth = props => {
  if (!props || typeof props !== 'object') return 0
  const money = toCount(props.money)
  const chips = toCount(props.chips)
  const total = money + chips
  if (total <= WEALTH_TOTAL_CAP) return 0
  const excess = total - WEALTH_TOTAL_CAP
  const chipsCut = Math.min(chips, excess)
  const moneyCut = excess - chipsCut
  props.chips = chips - chipsCut
  props.money = money - moneyCut
  return excess
}

/** 玩家对象级别的体检入口（读档/导入时直接用） */
export const trimPlayerWealth = player => trimWealth(player && player.props)
