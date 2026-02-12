import { computed } from 'vue'
import { parseAllDocuments } from 'yaml'
import schemaData from '../schema.json'
import { config, getShareableUrl } from './config'

// --- Types ---

export interface SchemaOption {
  value: string
  label: string
  description?: string
}

export interface Condition {
  field?: string
  eq?: any
  neq?: any
  notEmpty?: boolean
  startsWith?: string
  or?: Condition[]
  and?: Condition[]
}

export type ConditionOrString = string | Condition

export interface EnvRule {
  key: string
  format?: 'boolToFlag' | 'raw'
  omitDefault?: boolean
  always?: boolean
  static?: string
  when?: ConditionOrString
}

export interface YamlRule {
  file: string
  path: string
  when?: ConditionOrString
  value?: any
}

export interface InfraMatchEntry {
  when?: Condition
  value?: string
  default?: string
}

export interface InfraRule {
  id: string
  label: string | { match: InfraMatchEntry[] }
  icon: string
  color: string
  category: string
  connectionLabel: string
  dashed?: boolean
  when?: ConditionOrString
}

export interface FieldGenerator {
  type: 'randomHex'
  label?: string
  length?: number
}

export interface Field {
  key: string
  type: 'text' | 'number' | 'select' | 'toggle' | 'textarea' | 'checklist' | 'tags' | 'domain-rewrites' | 'hidden'
  label: string
  default: any
  description?: string
  hint?: string
  placeholder?: string
  showWhen?: string
  options?: SchemaOption[]
  min?: number
  env?: EnvRule
  yaml?: YamlRule | YamlRule[]
  infra?: InfraRule
  generators?: FieldGenerator[]
}

export interface Group {
  title: string
  showWhen?: string
  fields: Field[]
}

export interface Section {
  id: string
  title: string
  description: string
  icon: string
  category: string
  groups: Group[]
}

export interface Schema {
  sections: Section[]
}

// --- Schema access ---

export const schema: Schema = schemaData as Schema

// --- Defaults ---

export function extractDefaults(): Record<string, any> {
  const defaults: Record<string, any> = {}
  for (const section of schema.sections) {
    for (const group of section.groups) {
      for (const field of group.fields) {
        if (!field.key.startsWith('_')) {
          defaults[field.key] = field.default
        }
      }
    }
  }
  return defaults
}

// --- Condition evaluator ---

function normalizeCondition(c: ConditionOrString): Condition {
  if (typeof c === 'string') {
    return { field: c, eq: true }
  }
  return c
}

export function evaluateCondition(condition: ConditionOrString | undefined, state: Record<string, any>): boolean {
  if (condition === undefined) return true

  const c = normalizeCondition(condition)

  if (c.or) {
    return c.or.some(sub => evaluateCondition(sub, state))
  }
  if (c.and) {
    return c.and.every(sub => evaluateCondition(sub, state))
  }

  if (!c.field) return true
  const val = state[c.field]

  if (c.notEmpty !== undefined) {
    if (typeof val === 'string') return val.length > 0
    if (Array.isArray(val)) return val.length > 0
    return !!val
  }
  if (c.startsWith !== undefined) {
    return typeof val === 'string' && val.startsWith(c.startsWith)
  }
  if (c.neq !== undefined) {
    return val !== c.neq
  }
  if (c.eq !== undefined) {
    return val === c.eq
  }

  // Default: truthy check
  return !!val
}

// --- All fields iterator ---

function allFields(): Field[] {
  const fields: Field[] = []
  for (const section of schema.sections) {
    for (const group of section.groups) {
      for (const field of group.fields) {
        fields.push(field)
      }
    }
  }
  return fields
}

function basename(input: string): string {
  const parts = input.split(/[\\/]/)
  return (parts[parts.length - 1] || input).toLowerCase()
}

function getNestedValue(obj: Record<string, any>, path: string): any {
  const parts = path.split('.')
  let current: any = obj

  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined
    }
    current = current[part]
  }

  return current
}

function coerceImportedValue(value: unknown, field: Field): any {
  if (field.type === 'toggle') {
    if (typeof value === 'boolean') return value
    if (typeof value === 'number') return value !== 0
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase()
      if (normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on') return true
      if (normalized === '0' || normalized === 'false' || normalized === 'no' || normalized === 'off') return false
    }
    return undefined
  }

  if (field.type === 'number') {
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value)
      if (Number.isFinite(parsed)) return parsed
    }
    return undefined
  }

  if (field.type === 'tags') {
    if (!Array.isArray(value)) return undefined
    const numbers = value
      .map(v => (typeof v === 'number' ? v : Number(v)))
      .filter(v => Number.isFinite(v))
    return numbers
  }

  if (field.type === 'checklist') {
    if (!Array.isArray(value)) return undefined
    return value.map(v => String(v))
  }

  if (field.type === 'domain-rewrites') {
    if (!Array.isArray(value)) return undefined
    return value
      .map(item => {
        if (!item || typeof item !== 'object') return null
        const source = item as Record<string, unknown>
        return {
          type: String(source.type ?? 'equal'),
          match: String(source.match ?? ''),
          replace: String(source.replace ?? ''),
        }
      })
      .filter(Boolean)
  }

  if (value === null || value === undefined) return ''
  return String(value)
}

function parseYamlObject(content: string): Record<string, any> {
  const docs = parseAllDocuments(content)
  const errors = docs.flatMap(doc => doc.errors)

  if (errors.length > 0) {
    throw new Error(errors[0]?.message || 'Invalid YAML')
  }

  for (const doc of docs) {
    const json = doc.toJSON()
    if (json && typeof json === 'object' && !Array.isArray(json)) {
      return json as Record<string, any>
    }
  }

  return {}
}

function getYamlSearchRoots(imported: Record<string, any>): Record<string, any>[] {
  const roots: Record<string, any>[] = [imported]

  for (const [key, value] of Object.entries(imported)) {
    if (!key.startsWith('when@')) continue
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue
    roots.push(value as Record<string, any>)
  }

  return roots
}

function getImportedValueForPath(roots: Record<string, any>[], path: string): any {
  for (const root of roots) {
    const value = getNestedValue(root, path)
    if (value !== undefined) return value
  }

  return undefined
}

export interface ImportYamlResult {
  updatedKeys: string[]
}

function parseBooleanLike(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on') return true
    if (normalized === '0' || normalized === 'false' || normalized === 'no' || normalized === 'off') return false
  }
  return undefined
}

function parseEnvValue(raw: string): string {
  const trimmed = raw.trim()
  if (trimmed.length === 0) return ''

  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    const quote = trimmed[0]
    const inner = trimmed.slice(1, -1)
    if (quote === "'") {
      return inner
    }
    return inner
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\')
  }

  return trimmed.replace(/\s+#.*$/, '').trim()
}

function parseEnvObject(content: string): Record<string, string> {
  const result: Record<string, string> = {}
  const lines = content.split(/\r?\n/)

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const withoutExport = trimmed.startsWith('export ') ? trimmed.slice(7).trim() : trimmed
    const index = withoutExport.indexOf('=')
    if (index <= 0) continue

    const key = withoutExport.slice(0, index).trim()
    if (!key) continue
    const value = withoutExport.slice(index + 1)
    result[key] = parseEnvValue(value)
  }

  return result
}

export function importYamlToConfig(content: string, filename?: string): ImportYamlResult {
  const imported = parseYamlObject(content)
  const yamlRoots = getYamlSearchRoots(imported)
  const normalizedFilename = filename ? basename(filename) : ''
  const fields = allFields()
  const hasMatchingRules = normalizedFilename
    ? fields.some(field => {
      if (!field.yaml) return false
      const rules = Array.isArray(field.yaml) ? field.yaml : [field.yaml]
      return rules.some(rule => basename(rule.file) === normalizedFilename)
    })
    : false
  const updates: Record<string, any> = {}
  const updatedKeys = new Set<string>()

  for (const field of fields) {
    if (!field.yaml || field.key.startsWith('_')) continue

    const rules = Array.isArray(field.yaml) ? field.yaml : [field.yaml]

    for (const rule of rules) {
      if (hasMatchingRules && basename(rule.file) !== normalizedFilename) {
        continue
      }

      const importedValue = getImportedValueForPath(yamlRoots, rule.path)
      if (importedValue === undefined) continue

      if (rule.value !== undefined) {
        if (JSON.stringify(importedValue) === JSON.stringify(rule.value) && field.type === 'toggle') {
          updates[field.key] = true
          updatedKeys.add(field.key)
        }
        continue
      }

      const coerced = coerceImportedValue(importedValue, field)
      if (coerced === undefined) continue

      updates[field.key] = coerced
      updatedKeys.add(field.key)
      break
    }
  }

  if (updatedKeys.size > 0) {
    Object.assign(config, updates)
  }

  return { updatedKeys: Array.from(updatedKeys) }
}

export function importEnvToConfig(content: string): ImportYamlResult {
  const envValues = parseEnvObject(content)
  const fields = allFields()
  const updates: Record<string, any> = {}
  const updatedKeys = new Set<string>()

  for (const field of fields) {
    if (!field.env || field.key.startsWith('_')) continue

    const envRule = field.env
    const rawValue = envValues[envRule.key]
    if (rawValue === undefined) continue

    if (envRule.static !== undefined) {
      if (field.type === 'toggle') {
        const boolValue = parseBooleanLike(rawValue)
        if (boolValue === true || rawValue === envRule.static) {
          updates[field.key] = true
          updatedKeys.add(field.key)
        }
      }
      continue
    }

    if (envRule.format === 'boolToFlag') {
      const boolValue = parseBooleanLike(rawValue)
      if (boolValue !== undefined) {
        updates[field.key] = boolValue
        updatedKeys.add(field.key)
      }
      continue
    }

    const coerced = coerceImportedValue(rawValue, field)
    if (coerced === undefined) continue

    updates[field.key] = coerced
    updatedKeys.add(field.key)
  }

  if (updatedKeys.size > 0) {
    Object.assign(config, updates)
  }

  return { updatedKeys: Array.from(updatedKeys) }
}

// --- Field to section mapping (for env comments) ---

function fieldSectionMap(): Map<string, string> {
  const map = new Map<string, string>()
  for (const section of schema.sections) {
    for (const group of section.groups) {
      for (const field of group.fields) {
        map.set(field.key, section.title)
      }
    }
  }
  return map
}

// --- Env generator ---

function formatEnvValue(value: any, format?: string): string {
  if (format === 'boolToFlag') {
    return value ? '1' : '0'
  }
  return String(value)
}

export const generatedEnv = computed(() => {
  const state = config as unknown as Record<string, any>
  const lines: string[] = []
  const sectionMap = fieldSectionMap()
  let lastSection = ''

  lines.push('# Shopware Environment Configuration')
  lines.push('# Generated by Shopware Config Generator')
  lines.push(`# ${getShareableUrl()}`)
  lines.push('')

  for (const field of allFields()) {
    if (!field.env) continue

    const env = field.env
    const value = state[field.key]
    const defaultVal = field.default

    // Evaluate conditions: env.when takes priority, then showWhen
    if (env.when) {
      if (!evaluateCondition(env.when, state)) continue
    } else if (field.showWhen) {
      if (!evaluateCondition(field.showWhen, state)) continue
    }

    // omitDefault check
    if (env.omitDefault && JSON.stringify(value) === JSON.stringify(defaultVal)) continue

    // Determine the actual output value
    let outputValue: string
    if (env.static !== undefined) {
      outputValue = env.static
    } else {
      outputValue = formatEnvValue(value, env.format)
    }

    // For static env values, only output when the field value is truthy
    if (env.static !== undefined && !value) continue

    // Skip empty values unless always
    if (!env.always) {
      if (env.format === 'boolToFlag' && value === false) continue
      if (outputValue === '') continue
    }

    // Section comment
    const section = sectionMap.get(field.key) || ''
    if (section !== lastSection) {
      if (lastSection !== '') lines.push('')
      lines.push(`# ${section}`)
      lastSection = section
    }

    lines.push(`${env.key}=${outputValue}`)
  }

  return lines.join('\n')
})

// --- YAML generator ---

function setNestedValue(obj: Record<string, any>, path: string, value: any): void {
  const parts = path.split('.')
  let current = obj
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]!
    if (!(part in current)) {
      current[part] = {}
    }
    current = current[part]
  }
  current[parts[parts.length - 1]!] = value
}

function serializeYaml(obj: Record<string, any>, indent: number = 0): string {
  const lines: string[] = []
  const prefix = '    '.repeat(indent)

  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      lines.push(`${prefix}${key}: null`)
    } else if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push(`${prefix}${key}: []`)
      } else {
        lines.push(`${prefix}${key}:`)
        for (const item of value) {
          if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
            // Object array items (like domain rewrites)
            const entries = Object.entries(item)
            if (entries.length > 0) {
              const [firstKey, firstVal] = entries[0]!
              lines.push(`${prefix}    - ${firstKey}: ${formatYamlValue(firstVal)}`)
              for (let i = 1; i < entries.length; i++) {
                const [k, v] = entries[i]!
                lines.push(`${prefix}      ${k}: ${formatYamlValue(v)}`)
              }
            }
          } else {
            lines.push(`${prefix}    - ${formatYamlValue(item)}`)
          }
        }
      }
    } else if (typeof value === 'object') {
      lines.push(`${prefix}${key}:`)
      lines.push(serializeYaml(value, indent + 1))
    } else {
      lines.push(`${prefix}${key}: ${formatYamlValue(value)}`)
    }
  }

  return lines.join('\n')
}

function formatYamlValue(value: any): string {
  if (typeof value === 'boolean') return value.toString()
  if (typeof value === 'number') return value.toString()
  if (typeof value === 'string') {
    if (value === '') return 'null'
    if (value === 'null') return 'null'
    // Quote strings that contain special characters or look like other types
    if (value.startsWith('%') || value.includes('"') || value.includes("'") || value.includes(':') || value.includes('#')) {
      return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
    }
    if (/^\d+$/.test(value)) {
      return `'${value}'`
    }
    return value
  }
  return String(value)
}

interface YamlFileOutput {
  file: string
  label: string
  content: string
}

export const generatedYamlFiles = computed<YamlFileOutput[]>(() => {
  const state = config as unknown as Record<string, any>
  const fileData: Record<string, Record<string, any>> = {}

  for (const field of allFields()) {
    if (!field.yaml) continue

    const rules = Array.isArray(field.yaml) ? field.yaml : [field.yaml]

    for (const rule of rules) {
      // Evaluate condition
      if (rule.when !== undefined) {
        if (!evaluateCondition(rule.when, state)) continue
      }

      // Get value
      const value = rule.value !== undefined ? rule.value : state[field.key]

      // Skip undefined/null
      if (value === undefined || value === null) continue

      // Initialize file object
      if (!fileData[rule.file]) {
        fileData[rule.file] = {}
      }

      setNestedValue(fileData[rule.file]!, rule.path, value)
    }
  }

  const result: YamlFileOutput[] = []

  for (const [file, data] of Object.entries(fileData)) {
    if (Object.keys(data).length === 0) continue

    const comment = `# config/packages/${file.includes('monolog') ? 'prod/' : ''}${file}`
    const urlComment = `# ${getShareableUrl()}`
    const yamlContent = serializeYaml(data)
    result.push({
      file,
      label: file,
      content: `${comment}\n${urlComment}\n${yamlContent}`,
    })
  }

  return result
})

// --- Infrastructure nodes ---

export interface InfraNode {
  id: string
  label: string
  icon: string
  color: string
  category: string
  connectionLabel: string
  dashed?: boolean
}

export const infraNodes = computed<InfraNode[]>(() => {
  const state = config as unknown as Record<string, any>
  const seen = new Set<string>()
  const nodes: InfraNode[] = []

  for (const field of allFields()) {
    if (!field.infra) continue

    const infra = field.infra
    if (seen.has(infra.id)) continue

    // Evaluate when condition
    if (infra.when) {
      if (!evaluateCondition(infra.when, state)) continue
    } else {
      // Default: field value is truthy
      if (!state[field.key]) continue
    }

    seen.add(infra.id)

    // Resolve dynamic label
    let label: string
    if (typeof infra.label === 'string') {
      label = infra.label
    } else {
      label = resolveMatchLabel(infra.label.match, state)
    }

    nodes.push({
      id: infra.id,
      label,
      icon: infra.icon,
      color: infra.color,
      category: infra.category,
      connectionLabel: infra.connectionLabel,
      dashed: infra.dashed,
    })
  }

  return nodes
})

function resolveMatchLabel(matches: InfraMatchEntry[], state: Record<string, any>): string {
  for (const entry of matches) {
    if (entry.default) return entry.default
    if (entry.when && evaluateCondition(entry.when, state) && entry.value) {
      return entry.value
    }
  }
  return ''
}
