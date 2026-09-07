// 纯脚本验证用的最小浏览器环境 + @/ 别名注册
import { register } from 'node:module'

const define = (key, value) => Object.defineProperty(globalThis, key, { value, writable: true, configurable: true })

define('location', { host: 'localhost', href: 'http://localhost/', protocol: 'http:' })
define('window', globalThis)
define('document', { title: '', querySelector: () => null, addEventListener: () => {}, createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }), body: { appendChild() {}, removeChild() {} }, documentElement: { style: {} }, head: { appendChild() {} } })
define('navigator', { userAgent: 'node', serviceWorker: undefined })
define('localStorage', { _d: new Map(), getItem(k) { return this._d.has(k) ? this._d.get(k) : null }, setItem(k, v) { this._d.set(k, String(v)) }, removeItem(k) { this._d.delete(k) }, clear() { this._d.clear() } })

register('./alias-loader.mjs', import.meta.url)
