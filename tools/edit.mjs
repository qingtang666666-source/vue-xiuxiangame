// 精确文本替换器：读取 spec 文件，对源码做「唯一匹配」的替换，任何歧义都会直接报错
//
// spec 语法：
//   ### FILE <相对路径>
//   <<< FROM
//   ...原文...
//   === TO
//   ...新文...
//   >>>
//
// 用法：node tools/edit.mjs tools/spec.txt
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const specPath = process.argv[2]
if (!specPath) {
  console.error('用法: node tools/edit.mjs <spec文件>')
  process.exit(1)
}

const root = process.cwd()
const spec = readFileSync(path.resolve(root, specPath), 'utf8').replace(/\r\n/g, '\n')
const lines = spec.split('\n')

const jobs = []
let cur = null
let mode = null
for (const line of lines) {
  if (line.startsWith('### FILE ')) {
    cur = { file: line.slice(9).trim(), blocks: [] }
    jobs.push(cur)
    mode = null
    continue
  }
  if (!cur) continue
  if (line === '<<< FROM') {
    mode = 'from'
    cur.blocks.push({ from: [], to: [] })
    continue
  }
  if (line === '=== TO') { mode = 'to'; continue }
  if (line === '>>>') { mode = null; continue }
  if (mode === 'from') cur.blocks.at(-1).from.push(line)
  else if (mode === 'to') cur.blocks.at(-1).to.push(line)
}

let changed = 0
for (const job of jobs) {
  const file = path.resolve(root, job.file)
  let text = readFileSync(file, 'utf8').replace(/\r\n/g, '\n')
  for (const b of job.blocks) {
    const from = b.from.join('\n')
    const to = b.to.join('\n')
    if (!from.trim()) { console.error(`[${job.file}] FROM 段为空，拒绝执行`); process.exit(1) }
    const hits = text.split(from).length - 1
    if (hits === 0) {
      console.error(`[${job.file}] 找不到 FROM 片段：\n${from.slice(0, 240)}`)
      process.exit(1)
    }
    if (hits > 1) {
      console.error(`[${job.file}] FROM 片段出现 ${hits} 次，不唯一：\n${from.slice(0, 240)}`)
      process.exit(1)
    }
    text = text.replace(from, to)
    changed++
  }
  writeFileSync(file, text, 'utf8')
  console.log(`ok ${job.file} (${job.blocks.length} 处)`)
}
console.log(`共应用 ${changed} 处替换`)