import { computed } from 'vue'
import { config } from './config'

export type Severity = 'error' | 'warning' | 'info'

export interface Recommendation {
  id: string
  field: string
  label: string
  description: string
  severity: Severity
  current: string
  recommended: string
  recommendedValue: any
  url?: string
}

interface RecommendationRule {
  id: string
  field: string
  label: string
  description: string
  severity: Severity
  /** Check function: returns true if misconfigured */
  check: (value: any, state: Record<string, any>) => boolean
  current: (value: any, state: Record<string, any>) => string
  recommended: string
  recommendedValue: any
  url?: string
}

const rules: RecommendationRule[] = [
  // --- Production environment ---
  {
    id: 'app-env-prod',
    field: 'appEnv',
    label: 'Environment should be production',
    description: 'Running in non-production mode leaks debug information and hurts performance.',
    severity: 'error',
    check: (v) => v !== 'prod',
    current: (v) => v,
    recommended: 'prod',
    recommendedValue: 'prod',
  },

  // --- Disable App URL external check ---
  {
    id: 'app-url-check',
    field: 'appUrlCheckDisabled',
    label: 'Disable App URL external check',
    description: 'The external APP_URL check adds latency on every request. Disable it in production.',
    severity: 'warning',
    check: (v) => v === false,
    current: () => 'enabled',
    recommended: 'disabled',
    recommendedValue: true,
    url: 'https://developer.shopware.com/docs/guides/hosting/performance/performance-tweaks.html#disable-app-url-external-check',
  },

  // --- Admin Worker ---
  {
    id: 'admin-worker',
    field: 'adminWorkerEnabled',
    label: 'Disable Admin Worker',
    description: 'The admin worker processes messages via browser requests. Use a proper message queue worker instead.',
    severity: 'warning',
    check: (v) => v === true,
    current: () => 'enabled',
    recommended: 'disabled',
    recommendedValue: false,
    url: 'https://developer.shopware.com/docs/guides/plugins/plugins/framework/message-queue/add-message-handler#the-admin-worker',
  },

  // --- Mail Variables on Send ---
  {
    id: 'mail-variables',
    field: 'mailVariablesOnSend',
    label: 'Disable mail variable updates on send',
    description: 'Updating mail template variables on each send is a performance hit. Disable in production.',
    severity: 'warning',
    check: (v) => v === true,
    current: () => 'enabled',
    recommended: 'disabled',
    recommendedValue: false,
    url: 'https://developer.shopware.com/docs/guides/hosting/performance/performance-tweaks#prevent-mail-data-updates',
  },

  // --- Product Stream Indexing ---
  {
    id: 'product-stream-indexing',
    field: 'productStreamIndexing',
    label: 'Disable Product Stream indexing',
    description: 'Product stream indexing can be disabled on Shopware 6.6.10.5+ for better performance.',
    severity: 'info',
    check: (v) => v === true,
    current: () => 'enabled',
    recommended: 'disabled',
    recommendedValue: false,
    url: 'https://developer.shopware.com/docs/guides/hosting/performance/performance-tweaks.html#disable-product-stream-indexer',
  },

  // --- Increment Storage: User Activity ---
  {
    id: 'increment-user-activity',
    field: 'incrementUserActivityType',
    label: 'Use non-MySQL increment storage for user activity',
    description: 'MySQL increment storage causes unnecessary database writes. Use array or Redis instead.',
    severity: 'warning',
    check: (v) => v === 'mysql',
    current: () => 'mysql',
    recommended: 'array or redis',
    recommendedValue: 'array',
    url: 'https://developer.shopware.com/docs/guides/hosting/performance/performance-tweaks#increment-storage',
  },

  // --- Increment Storage: Message Queue ---
  {
    id: 'increment-message-queue',
    field: 'incrementMessageQueueType',
    label: 'Use non-MySQL increment storage for message queue',
    description: 'MySQL increment storage causes unnecessary database writes. Use array or Redis instead.',
    severity: 'warning',
    check: (v) => v === 'mysql',
    current: () => 'mysql',
    recommended: 'array or redis',
    recommendedValue: 'array',
    url: 'https://developer.shopware.com/docs/guides/hosting/performance/performance-tweaks#increment-storage',
  },

  // --- HTTP Cache ---
  {
    id: 'http-cache',
    field: 'httpCacheEnabled',
    label: 'Enable HTTP Cache',
    description: 'HTTP caching significantly improves storefront performance.',
    severity: 'warning',
    check: (v) => v === false,
    current: () => 'disabled',
    recommended: 'enabled',
    recommendedValue: true,
  },

  // --- Queue Connection: should not be empty/doctrine in production ---
  {
    id: 'queue-transport',
    field: 'messengerTransportDsn',
    label: 'Configure an async message queue',
    description: 'Without a dedicated queue transport, messages are processed synchronously or via admin worker. Use Redis or RabbitMQ.',
    severity: 'warning',
    check: (v) => !v || v === 'doctrine://default',
    current: (v) => v ? 'doctrine (database)' : 'not configured',
    recommended: 'redis or rabbitmq',
    recommendedValue: undefined, // Can't set a single value, just flag it
    url: 'https://developer.shopware.com/docs/guides/hosting/infrastructure/message-queue.html#message-queue-on-production-systems',
  },

  // --- Logging: Business Event Logger Level ---
  {
    id: 'business-event-log-level',
    field: 'businessEventLoggerLevel',
    label: 'Set business event logger to warning or higher',
    description: 'Logging below warning level for business events generates excessive log entries in production.',
    severity: 'warning',
    check: (v, state) => {
      if (!state.loggingEnabled) return false
      const levels = ['debug', 'info', 'notice']
      return levels.includes(v)
    },
    current: (v) => v,
    recommended: 'warning or higher',
    recommendedValue: 'warning',
    url: 'https://developer.shopware.com/docs/guides/hosting/performance/performance-tweaks#logging',
  },
]

export const recommendations = computed<Recommendation[]>(() => {
  const state = config as unknown as Record<string, any>
  const result: Recommendation[] = []

  for (const rule of rules) {
    const value = state[rule.field]
    if (rule.check(value, state)) {
      result.push({
        id: rule.id,
        field: rule.field,
        label: rule.label,
        description: rule.description,
        severity: rule.severity,
        current: rule.current(value, state),
        recommended: rule.recommended,
        recommendedValue: rule.recommendedValue,
        url: rule.url,
      })
    }
  }

  return result
})

export function applyRecommendation(rec: Recommendation) {
  if (rec.recommendedValue !== undefined) {
    config[rec.field] = rec.recommendedValue
  }
}

export function applyAllRecommendations() {
  for (const rec of recommendations.value) {
    if (rec.recommendedValue !== undefined) {
      config[rec.field] = rec.recommendedValue
    }
  }
}
