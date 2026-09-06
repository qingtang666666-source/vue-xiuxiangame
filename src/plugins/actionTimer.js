// 通用“生产/修炼”计时器 —— 炼丹 / 炼器 / 制符 / 强化 / 熟练度 / 闭关突破
// 统一使用 player.actionTimer 单槽位：开始即占用，到期由 tickActions 结算
// 采用“开始时校验并锁定、到期时再执行结算”的模式，避免重复扣资源

import { craftPill } from './alchemy.js'
import { craftEquipment } from './forge.js'
import { craftTalisman } from './talisman.js'
import { enhanceCost, resolveEnhancement } from './equipForge.js'
import { upgradeProficiency, PROF_MAX } from './technique.js'
import { insightDiscount } from './insight.js'

const now = () => Date.now()

export const ACTION_NO_FREE = '正在工坊/闭关中，请待当前动作完成'

export const actionTask = player => {
  if (!player) return null
  const t = player.actionTimer
  if (!t || typeof t.start !== 'number') return null
  return t
}

export const actionRemainMs = player => {
  const t = actionTask(player)
  return t ? Math.max(0, t.start + t.duration - now()) : 0
}

export const actionPercent = player => {
  const t = actionTask(player)
  if (!t) return 0
  const total = t.duration || 1
  const remain = actionRemainMs(player)
  return Math.min(100, Math.max(0, Math.round((1 - remain / total) * 100)))
}

// 立即完成（跳过）：把开始时间提前到期，随后由 tickActions 结算
export const finishNow = player => {
  const t = actionTask(player)
  if (!t) return null
  t.start = now() - t.duration - 1
  return tickActions(player)
}

// 取消：清空槽位（模型 B 未扣资源，可直接取消）
export const cancelAction = player => {
  if (!actionTask(player)) return false
  player.actionTimer = null
  return true
}

const capReduce = player => 1 - insightDiscount(player) // 悟性越高耗时越短（最高 -40%）

// 各动作时长（毫秒）
const durationOf = (player, kind, data) => {
  let sec
  if (kind === 'craft-pill') sec = 8 + (data?.tier || 0) * 3
  else if (kind === 'craft-equip') sec = 10 + (data?.qi || 0) * 3
  else if (kind === 'craft-talisman') sec = 6 + (data?.tier || 0) * 2
  else if (kind === 'enhance') sec = 5 + (data?.strengthen || 0)
  else if (kind === 'proficiency') sec = (4 + ((data?.prof || 1) - 1) * 4) * capReduce(player)
  else sec = 20
  return Math.max(4000, Math.floor(sec) * 1000)
}

const labelOf = (kind, data) => {
  if (kind === 'craft-pill') return `炼丹【${data?.name || ''}】`
  if (kind === 'craft-equip') return `炼器【${data?.name || ''}】`
  if (kind === 'craft-talisman') return `制符【${data?.name || ''}】`
  if (kind === 'enhance') return `强化【${data?.name || ''}】`
  if (kind === 'proficiency') return `熟练【${data?.name || ''}】`
  return '工坊'
}

// 开始一项动作：校验 + 锁定槽位（不扣资源，到期才结算）
export const beginAction = (player, spec) => {
  const { kind, id, data, can } = spec
  const cur = actionTask(player)
  if (cur) return { ok: false, reason: ACTION_NO_FREE, task: cur }
  const check = can ? can() : { ok: true }
  if (!check.ok) return { ok: false, reason: check.reason }
  const duration = durationOf(player, kind, data)
  player.actionTimer = {
    kind, id: id || null, data: data || null,
    name: spec.name || '',
    start: now(), duration,
    label: labelOf(kind, { ...(data || {}), name: spec.name || '' })
  }
  return { ok: true, pending: true, duration, task: player.actionTimer }
}

// 是否可开启熟练度晋升（与 upgradeProficiency 逻辑一致）
export const canUpgradeProficiency = (player, id) => {
  const m = player.methods ? player.methods[id] : null
  if (!m) return { ok: false, reason: '未习得此功' }
  const cur = m.proficiency || 1
  if (cur >= PROF_MAX) return { ok: false, reason: '已至化劲' }
  const needChapter = cur * 4
  if ((m.chapter || 0) < needChapter) return { ok: false, reason: `需章节达 ${needChapter} 重方可晋升` }
  const cost = { money: Math.floor(350 * Math.pow(2, cur - 1)), dan: cur >= 3 ? cur - 2 : 0 }
  const save = Math.min(0.5, insightDiscount(player) + Math.min(0.15, ((player.level || 0) / 144) * 0.15))
  cost.money = Math.max(0, Math.floor(cost.money * (1 - save)))
  const props = player.props || {}
  if ((props.money || 0) < cost.money) return { ok: false, reason: '灵石不足' }
  if ((props.cultivateDan || 0) < cost.dan) return { ok: false, reason: '培养丹不足' }
  return { ok: true, cost }
}

const findItem = (player, id) => {
  if (!id) return null
  const inv = player.inventory || []
  const found = inv.find(e => e.id === id)
  if (found) return found
  const eq = player.equipment || {}
  for (const slot of Object.values(eq)) {
    if (slot && slot.id === id) return slot
  }
  return null
}

// 到期结算：按 kind 调用对应生产/强化/熟练逻辑，返回 { result, message, type }
export const tickActions = player => {
  const task = actionTask(player)
  if (!task) return null
  if (now() - task.start < task.duration) return null
  const props = player.props || {}
  let result = null
  let message = ''
  let type = 'success'

  if (task.kind === 'craft-pill') {
    const r = craftPill(player, task.id)
    if (r.ok) { result = r; player.craftCount = (player.craftCount || 0) + 1; message = `炼成【${r.recipe?.name || task.name}】`; type = 'success' }
    else { message = r.reason || '炼药失败'; type = 'warning' }
  } else if (task.kind === 'craft-equip') {
    const r = craftEquipment(player, task.data)
    if (r.ok) { result = r; player.craftCount = (player.craftCount || 0) + 1; player.lastforge = r.equipment; message = `炼成【${task.name || '装备'}】`; type = 'success' }
    else { message = r.reason || '炼器失败'; type = 'warning' }
  } else if (task.kind === 'craft-talisman') {
    const r = craftTalisman(player, task.id)
    if (r.ok) { result = r; player.craftCount = (player.craftCount || 0) + 1; message = `绘成【${r.recipe?.name || task.name}】`; type = 'success' }
    else { message = r.reason || '制符失败'; type = 'warning' }
  } else if (task.kind === 'enhance') {
    const item = findItem(player, task.id)
    if (!item) { message = '装备已不在背包，强化取消'; type = 'warning' }
    else {
      const cost = enhanceCost(player, item, task.data || {})
      if (cost > (props.strengtheningStone || 0)) { message = '炼器石不足，强化取消'; type = 'warning' }
      else {
        const r = resolveEnhancement(player, item, task.data || {})
        props.strengtheningStone = Math.max(0, (props.strengtheningStone || 0) - cost)
        result = r
        if (r.status === 'success') {
          message = r.gradeUp ? `强化成功，装备升至【${r.gradeName}】` : '强化成功'
          type = 'success'
        } else if (r.status === 'max') {
          message = '强化等级已满'
          type = 'info'
        } else if (r.status === 'fail') {
          message = r.drop ? '强化失败，装备跌回 +0' : '强化失败'
          type = 'warning'
        }
      }
    }
  } else if (task.kind === 'proficiency') {
    const r = upgradeProficiency(player, task.id)
    if (r.ok) { result = r; message = `熟练度升至【${r.profName}】(${r.proficiency}/5)`; type = 'success' }
    else { message = r.reason || '熟练度晋升失败'; type = 'warning' }
  } else {
    // 未识别类型（如闭关突破由对应页面自行结算），不清空
    return null
  }

  player.actionTimer = null
  return { ok: result ? result.ok !== false : true, result, message, type, kind: task.kind, name: task.name }
}
