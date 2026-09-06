// 极简静态服务器：本地运行打包后的 dist（无需 Vite dev），并自动打开浏览器
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { exec } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'dist')
const host = process.env.HOST || '0.0.0.0'
const port = Number(process.env.PORT || 5173)
const lanIP = (() => {
  const nets = os.networkInterfaces()
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) return net.address
    }
  }
  return '127.0.0.1'
})()
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.mp4': 'video/mp4'
}

const server = http.createServer((req, res) => {
  let url = decodeURIComponent(req.url.split('?')[0])
  if (url === '/' || url === '') url = '/index.html'
  // 防止路径穿越
  const safe = path.normalize(path.join(root, url))
  if (!safe.startsWith(root)) {
    res.writeHead(403)
    res.end('403')
    return
  }
  fs.readFile(safe, (err, data) => {
    if (err) {
      // hash 路由兜底：非文件路径返回 index.html
      fs.readFile(path.join(root, 'index.html'), (e2, d2) => {
        if (e2) {
          res.writeHead(404)
          res.end('404')
          return
        }
        res.writeHead(200, { 'Content-Type': TYPES['.html'] })
        res.end(d2)
      })
      return
    }
    const ext = path.extname(safe).toLowerCase()
    res.writeHead(200, { 'Content-Type': TYPES[ext] || 'application/octet-stream', 'Cache-Control': 'no-cache' })
    res.end(data)
  })
})

server.listen(port, host, () => {
  const local = `http://127.0.0.1:${port}`
  const lan = `http://${lanIP}:${port}`
  console.log(`本命修仙 · 本机访问：${local}`)
  if (host === '0.0.0.0') console.log(`局域网（分享给朋友）：${lan}`)
  console.log('（关闭本窗口即可停止）\n提示：若朋友访问不了，请在系统防火墙允许 node 或放行该端口。')
  if (process.env.NO_OPEN !== '1') exec(`start "" ${local}`)
})
