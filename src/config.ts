import { reactive, watch } from 'vue'
import LZString from 'lz-string'
import { extractDefaults } from './schema'

export const defaultConfig: Record<string, any> = extractDefaults()

export const config = reactive<Record<string, any>>(JSON.parse(JSON.stringify(defaultConfig)))

export function resetConfig() {
  Object.assign(config, JSON.parse(JSON.stringify(defaultConfig)))
}

// URL Hash State Management
function getConfigDiff(): Record<string, any> {
  const diff: Record<string, any> = {}
  for (const key of Object.keys(defaultConfig)) {
    const currentVal = config[key]
    const defaultVal = defaultConfig[key]

    if (JSON.stringify(currentVal) !== JSON.stringify(defaultVal)) {
      diff[key] = currentVal
    }
  }
  return diff
}

function encodeConfig(): string {
  const diff = getConfigDiff()
  if (Object.keys(diff).length === 0) return ''

  const json = JSON.stringify(diff)
  return LZString.compressToEncodedURIComponent(json)
}

function decodeConfig(hash: string): Record<string, any> | null {
  if (!hash) return null

  try {
    // Try lz-string first
    const decompressed = LZString.decompressFromEncodedURIComponent(hash)
    if (decompressed) {
      return JSON.parse(decompressed)
    }

    // Fallback to old base64 format for backwards compatibility
    const json = decodeURIComponent(atob(hash))
    return JSON.parse(json)
  } catch {
    return null
  }
}

export function loadFromHash(): boolean {
  const hash = window.location.hash.slice(1)
  if (!hash) return false

  const decoded = decodeConfig(hash)
  if (!decoded) return false

  Object.assign(config, JSON.parse(JSON.stringify(defaultConfig)), decoded)
  return true
}

export function updateHash(): void {
  const encoded = encodeConfig()
  const newUrl = encoded
    ? `${window.location.pathname}#${encoded}`
    : window.location.pathname
  window.history.replaceState(null, '', newUrl)
}

export function getShareableUrl(): string {
  const encoded = encodeConfig()
  const base = window.location.origin + window.location.pathname
  return encoded ? `${base}#${encoded}` : base
}

// Watch for config changes and update URL
let initialized = false
export function initUrlSync(): void {
  if (initialized) return
  initialized = true

  loadFromHash()

  watch(
    () => JSON.stringify(config),
    () => {
      updateHash()
    },
    { deep: true }
  )

  window.addEventListener('hashchange', () => {
    loadFromHash()
  })
}
