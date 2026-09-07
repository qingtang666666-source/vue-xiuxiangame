// 让 node 能解析 vite 的 @/ 别名与省略的 .js 扩展名，便于用纯脚本验证游戏数值逻辑
import { pathToFileURL, fileURLToPath } from 'node:url'
import path from 'node:path'

const SRC = path.resolve(process.cwd(), 'src')

export async function resolve(specifier, context, next) {
  let target = specifier
  if (specifier.startsWith('@/')) {
    const base = path.join(SRC, specifier.slice(2))
    target = pathToFileURL(/\.(js|vue|json)$/.test(base) ? base : `${base}.js`).href
  } else if ((specifier.startsWith('./') || specifier.startsWith('../')) && !/\.[a-z]+$/i.test(specifier)) {
    const parent = context.parentURL ? path.dirname(fileURLToPath(context.parentURL)) : process.cwd()
    target = pathToFileURL(path.join(parent, `${specifier}.js`)).href
  }
  return next(target, context)
}
