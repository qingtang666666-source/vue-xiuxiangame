import { seal, open, auditPlayer, exportSaveText, importSaveText } from '@/plugins/saveVault.js'

import { wealthTotal, trimWealth, WEALTH_TOTAL_CAP } from '@/plugins/wealthGuard.js'

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

// 4) 灵石 + 筹码 合计超限（>50亿）的异常数据自动清空
console.log('财富上限:', WEALTH_TOTAL_CAP)
const rich = { ...p, props: { ...p.props, money: 8_000_000_000, chips: 300_000_000 } }
console.log('体检前:', JSON.stringify({ money: rich.props.money, chips: rich.props.chips }), '合计', wealthTotal(rich.props))
console.log('清空:', trimWealth(rich.props), '→', JSON.stringify({ money: rich.props.money, chips: rich.props.chips }), '合计', wealthTotal(rich.props))
const onlyMoney = { money: 6_000_000_000, chips: 0 }
console.log('仅灵石超限:', trimWealth(onlyMoney), '→', JSON.stringify(onlyMoney))
const border = { money: 5_000_000_000, chips: 0 }
console.log('刚好等于上限不处理:', trimWealth(border), '→', JSON.stringify(border))
const richForImport = { ...p, props: { ...p.props, money: 8_000_000_000, chips: 300_000_000 } }
const richImport = importSaveText(exportSaveText({ name: 'x' }, richForImport))
console.log('导入超限档:', richImport.ok, '| 清空数值', richImport.wealthTrimmed, '| 剩余合计', wealthTotal(richImport.player.props))
// GM 刷出来的灵石/筹码带 wealthExempt 标记，不做体检
const exempt = { ...p, wealthExempt: true, props: { ...p.props, money: 8_000_000_000, chips: 300_000_000 } }
const exemptImport = importSaveText(exportSaveText({ name: 'x' }, exempt))
console.log('GM 豁免档:', exemptImport.ok, '| 清空数值', exemptImport.wealthTrimmed, '| 合计', wealthTotal(exemptImport.player.props))
