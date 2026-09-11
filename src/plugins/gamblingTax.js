// 赌局赢钱税 —— 炸金花 / 德州扑克对局结束后，按“本局净赢”征收 10% 筹码税
//
// 口径：
//   · 只对净赢的部分收税，输钱/平局的局不收；
//   · 税率 GAMBLING_TAX_RATE = 0.1，税额向下取整（避免出现小数筹码）；
//   · 结算时直接扣：玩家实际入账 = 净赢 − 税，所以无需额外扣款流程。
// 用法：牌局组件在结算回调里算 `taxOnWin(net)`，把上报的 reward 换成税后金额。

export const GAMBLING_TAX_RATE = 0.1

/** 本局净赢 net 时应缴的税；net ≤ 0（没赢）时为 0 */
export const taxOnWin = net => {
  const win = Number(net)
  if (!Number.isFinite(win) || win <= 0) return 0
  return Math.floor(win * GAMBLING_TAX_RATE)
}

/** 税后净额：赢的局扣税，输的局原样返回（负数） */
export const netAfterTax = net => {
  const v = Number(net)
  if (!Number.isFinite(v)) return 0
  if (v <= 0) return v
  return v - taxOnWin(v)
}
