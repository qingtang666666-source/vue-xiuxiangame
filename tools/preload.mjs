// 纯脚本验证用的最小浏览器环境 + @/ 别名注册（node --import ./tools/preload.mjs 使用）
import { register } from 'node:module'

const define = (key, value) => Object.defineProperty(globalThis, key, { value, writable: true, configurable: true })

// 可枚举的 localStorage 替身（浏览器的 localStorage 键是可枚举 own property）
const createLocalStorage = () => {
  const t = {}
  return new Proxy(t, {
    get(target, k) {
      if (k === 'getItem') return key => (key in target ? target[key] : null)
      if (k === 'setItem') return (key, v) => { target[String(key)] = String(v) }
      if (k === 'removeItem') return key => { delete target[String(key)] }
      if (k === 'clear') return () => Object.keys(target).forEach(x => delete target[x])
      if (k === 'key') return i => Object.keys(target)[i] ?? null
      if (k === 'length') return Object.keys(target).length
      return target[k]
    },
    set(target, k, v) {
      target[String(k)] = String(v)
      return true
    },
    deleteProperty(target, k) {
      delete target[String(k)]
      return true
    },
    ownKeys: target => Reflect.ownKeys(target),
    getOwnPropertyDescriptor: (target, k) => (k in target ? { value: target[k], enumerable: true, writable: true, configurable: true } : undefined)
  })
}

define('location', { host: 'localhost', href: 'http://localhost/', protocol: 'http:' })
define('window', globalThis)
define('document', { title: '', hidden: false, querySelector: () => null, addEventListener: () => {}, removeEventListener: () => {}, createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }), body: { appendChild() {}, removeChild() {} }, documentElement: { style: {} }, head: { appendChild() {} } })
define('navigator', { userAgent: 'node', serviceWorker: undefined })
define('localStorage', createLocalStorage())

register('./alias-loader.mjs', import.meta.url)