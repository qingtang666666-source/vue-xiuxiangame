import { seal, open, auditPlayer, exportSaveText, importSaveText } from '@/plugins/saveVault.js'

const p = { level: 60, name: '林青', attack: 36000, defense: 12000, maxHealth: 3600000, health: 3600000, cultivation: 1000, maxCultivation: 20000, critical: 0.2, dodge: 0.1, props: { money: 500000, spiritHerb: 900, cultivateDan: 40, strengtheningStone: 200, currency: 6 }, inventory: [], equipment: {}, methods: {}, pills: [], buffs: [], formations: {}, skills: {} }
const sealed = seal({ v: 2, boss: { name: '凶兽' }, player: p })
console.log('封装长度:', sealed.length, '前缀:', sealed.slice(0, 12))
const back = open(sealed)
console.log('解封:', back.player.name, 'level', back.player.level, '| 体检 issues:', auditPlayer(back.player).length)
console.log('导出文本:', exportSaveText({ name: 'b' }, p).slice(0, 60), '...')

// 1) 篡改一个字节
const tampered = sealed.slice(0, -6) + 'AAAAAA'
try { open(tampered) } catch (e) { console.log('篡改检测:', e.message) }
const tampered2 = sealed.replace('|' + sealed.split('|')[3].slice(0, 8), '|' + sealed.split('|')[3].slice(0, 8).split('').reverse().join(''))
try { open(tampered2) } catch (e) { console.log('中段篡改检测:', e.message) }

// 2) 改数值后重签（不知道密钥就无法通过）
const fake = seal({ v: 2, boss: {}, player: { ...p, level: 9999, attack: 1e12 } })
const r = importSaveText(fake)
console.log('导入改数值的档:', JSON.stringify(r))

// 3) 正常导出→导入
const okr = importSaveText(exportSaveText({ name: 'x' }, p))
console.log('正常导入:', okr.ok, '| 等级', okr.player?.level)
console.log('垃圾输入:', JSON.stringify(importSaveText('hello world')))
