// 灵宠批量放生 —— 供批量面板复用
export const releasePets = player => {
  const pets = player.pets || []
  if (!pets.length) return { ok: false, reason: 'noPet' }
  const selling = pets.filter(i => !i.lock)
  if (!selling.length) return { ok: false, reason: 'noLocked' }
  const dan = selling.reduce((total, i) => {
    const reincarnation = i.reincarnation ? i.reincarnation : 1
    let level = i.level * reincarnation
    level = Number(level) || 0
    return total + Math.floor(level)
  }, 0)
  player.props.cultivateDan = (player.props.cultivateDan || 0) + dan
  player.pets = pets.filter(i => i.lock)
  return { ok: true, count: selling.length, dan }
}
