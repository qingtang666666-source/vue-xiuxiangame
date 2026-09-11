import { setupPersistence, writeVault, readVault, seal, open, backupSave, listBackups, restoreBackup, wipeSave, stopPersistence, flushPersistence, exportSaveText, importSaveText, SAVE_KEY } from '@/plugins/persistence.js'
import crypto from '@/plugins/crypto.js'
import { BACKUP_PREFIX } from '@/plugins/saveVault.js'

const mkPlayer = over => ({
  level: 60, name: '林青', attack: 36000, defense: 12000, maxHealth: 3600000, health: 3600000,
  cultivation: 1000, maxCultivation: 20000, critical: 0.2, dodge: 0.1, reincarnation: 2,
  props: { money: 500000, spiritHerb: 900, cultivateDan: 40, strengtheningStone: 200, currency: 6 },
  inventory: [], equipment: {}, methods: {}, pills: [], buffs: [], formations: {}, skills: {}, pointAlloc: {}, ...over
})
const mkStore = (player, boss) => {
  const s = {
    player: player || mkPlayer(), boss: boss || { name: '凶兽', health: 1000 },
    subs: [],
    $state: null,
    $patch: o => { Object.entries(o).forEach(([k, v]) => { s[k] = v }); s.patches = (s.patches || 0) + 1 },
    $subscribe: fn => { s.subs.push(fn) }
  }
  s.$state = { player: s.player, boss: s.boss }
  return s
}
const fire = s => s.subs.forEach(f => f())

console.log('== 1. 旧格式(localStorage v1) 兼容读取 ==')
localStorage.setItem(SAVE_KEY, JSON.stringify({ boss: crypto.encryption({ name: '旧BOSS' }), player: crypto.encryption(mkPlayer({ name: '老玩家' })) }))
let st = readVault()
console.log('   读出:', st.player.name, 'legacy =', st.v === 1)

console.log('\n== 2. 新格式写入/读取 + 篡改检测 ==')
const s2 = mkStore(mkPlayer({ name: '新档玩家' }))
writeVault(s2.boss, s2.player)
console.log('   回读:', readVault().player.name)
const raw = localStorage.getItem(SAVE_KEY)
localStorage.setItem(SAVE_KEY, raw.slice(0, raw.length - 8) + 'AAAAAAAA')
try { readVault(); console.log('   ✗ 篡改未被发现') } catch (e) { console.log('   ✓ 篡改被拒:', e.message.split(':')[0]) }
console.log('   corrupt 副本已留:', Object.keys(localStorage).filter(k => k.includes('corrupt')).length)

console.log('\n== 3. setupPersistence 遇坏档不崩、按新档启动 ==')
const s3 = mkStore(mkPlayer({ name: '默认' }))
setupPersistence(s3)
console.log('   patches:', s3.patches || 0, '(坏档不合并 = 0)')

console.log('\n== 4. 正常启动流程：写档 → 重新加载 → 合并 ==')
localStorage.clear()
const s4 = mkStore(mkPlayer({ name: '存档主体', level: 88 }))
const api = setupPersistence(s4)
fire(s4)
setTimeout(() => {
  console.log('   已落盘:', !!localStorage.getItem(SAVE_KEY))
  const s5 = mkStore(mkPlayer({ name: '默认名' }))
  setupPersistence(s5)
  console.log('   重载后玩家名:', s5.player.name, '| 等级:', s5.player.level)

  console.log('\n== 5. 导出 → 篡改数值 → 重签不可能 → 导入被拒 ==')
  const dump = exportSaveText(s5.boss, s5.player)
  console.log('   正常导入:', JSON.stringify(importSaveText(dump)).slice(0, 30))
  const cheating = exportSaveText(s5.boss, { ...s5.player, attack: 9.9e11, level: 60 })
  const bad = importSaveText(cheating)
  console.log('   改攻击力后导入:', bad.ok, '|', bad.reason)
  const garbage = importSaveText('{"player":{"level":9999,"attack":1e15}}')
  console.log('   手搓 JSON 导入:', garbage.ok, '|', garbage.reason)

  console.log('\n== 6. 备份 / 回滚 ==')
  localStorage.clear()
  const s6 = mkStore(mkPlayer({ name: '甲' }))
  setupPersistence(s6); fire(s6)
  setTimeout(() => {
    writeVault(s6.boss, mkPlayer({ name: '乙', level: 20 }))
    const bk = backupSave('manual')
    console.log('   备份:', !!bk, '| 列表:', listBackups().length)
    const r = restoreBackup(bk)
    console.log('   回滚:', r.ok, '| 当前档玩家:', readVault().player.name)

    console.log('\n== 7. 删档后自动保存不得复活 ==')
    const s7 = mkStore(mkPlayer({ name: '丙' }))
    setupPersistence(s7)
    fire(s7)
    setTimeout(() => {
      console.log('   删档前有档:', !!localStorage.getItem(SAVE_KEY))
      wipeSave(s7)
      fire(s7)                      // 模拟删档后仍有状态变更
      flushPersistence(s7)          // 模拟卸载钩子
      setTimeout(() => {
        console.log('   删档后有档:', !!localStorage.getItem(SAVE_KEY), '(应为 false)', '| 备份留存:', listBackups().length)

        console.log('\n== 8. 旧档 / 回档 同样要过财富体检（灵石+筹码 ≤ 50 亿）==')
        // 模拟“改过的 / 很旧的”超限存档：直接 seal 写 localStorage，绕过写入侧体检
        localStorage.clear()
        const overCapSave = seal({ v: 2, at: Date.now(), boss: { name: '凶兽' }, player: mkPlayer({ name: '改档佬', props: { money: 8e9, chips: 3e8 } }) })
        localStorage.setItem(SAVE_KEY, overCapSave)
        const s8 = mkStore(mkPlayer({ name: '默认' }))
        setupPersistence(s8)
        console.log('   读档后:', JSON.stringify({ money: s8.player.props.money, chips: s8.player.props.chips }), '(应为 5000000000 / 0)')

        // 回档同理：备份里的超限数据不该被带回来
        localStorage.setItem(BACKUP_PREFIX + 'manual-overcap', overCapSave)
        const rb1 = restoreBackup(BACKUP_PREFIX + 'manual-overcap')
        const back1 = readVault()
        console.log('   回档:', rb1.ok, '| 回档后:', JSON.stringify({ money: back1.player.props.money, chips: back1.player.props.chips }), '(应为 5000000000 / 0)')

        // GM 刷过的档（wealthExempt）回档后依旧豁免
        localStorage.setItem(BACKUP_PREFIX + 'manual-gm', seal({ v: 2, at: Date.now(), boss: { name: '凶兽' }, player: mkPlayer({ name: 'GM', wealthExempt: true, props: { money: 8e9, chips: 3e8 } }) }))
        const rb2 = restoreBackup(BACKUP_PREFIX + 'manual-gm')
        const back2 = readVault()
        console.log('   GM 豁免回档:', rb2.ok, '| 回档后:', JSON.stringify({ money: back2.player.props.money, chips: back2.player.props.chips }), '(应保持 8000000000 / 300000000)')
      }, 1200)
    }, 1000)
  }, 1000)
}, 1000)
