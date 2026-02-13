<script setup lang="ts">
import { computed, ref } from 'vue'
import { infraNodes } from '../schema'
import { MtCard } from '@shopware-ag/meteor-component-library'

const expanded = ref(false)

interface PositionedNode {
  id: string
  label: string
  icon: string
  x: number
  y: number
  color: string
  category: string
}

interface Connection {
  from: string
  to: string
  label?: string
  dashed?: boolean
}

const categoryColorMap: Record<string, string> = {
  cache: '#ef4444',
  search: '#10b981',
  queue: '#f97316',
  monitoring: '#8b5cf6',
}

const categoryLabelMap: Record<string, string> = {
  cache: 'Cache',
  search: 'Search',
  queue: 'Queue',
  monitoring: 'Monitoring',
}

const nodes = computed<PositionedNode[]>(() => {
  const result: PositionedNode[] = [
    {
      id: 'browser',
      label: 'Browser',
      icon: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9',
      x: 100,
      y: 200,
      color: '#60a5fa',
      category: 'client',
    },
    {
      id: 'shopware',
      label: 'Shopware',
      icon: 'M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01',
      x: 300,
      y: 200,
      color: '#189eff',
      category: 'app',
    },
    {
      id: 'mysql',
      label: 'MySQL',
      icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4',
      x: 500,
      y: 200,
      color: '#f59e0b',
      category: 'database',
    },
  ]

  const rightColumnX = 500
  const spacing = 100
  const infraCount = infraNodes.value.length

  // Place infra nodes starting from top of right column
  let rightColumnY = 80
  for (const node of infraNodes.value) {
    result.push({
      id: node.id,
      label: node.label,
      icon: node.icon,
      x: rightColumnX,
      y: rightColumnY,
      color: node.color,
      category: node.category,
    })
    rightColumnY += spacing
  }

  // Position MySQL below all infra nodes so they never overlap
  const mysqlNode = result.find(n => n.id === 'mysql')!
  if (infraCount > 0) {
    mysqlNode.y = rightColumnY
  }

  // Center Browser and Shopware vertically relative to right column
  if (infraCount > 0) {
    const rightYs = result.filter(n => n.x === rightColumnX).map(n => n.y)
    const centerY = (Math.min(...rightYs) + Math.max(...rightYs)) / 2
    const browserNode = result.find(n => n.id === 'browser')!
    const shopwareNode = result.find(n => n.id === 'shopware')!
    browserNode.y = centerY
    shopwareNode.y = centerY
  }

  return result
})

const connections = computed<Connection[]>(() => {
  const result: Connection[] = [
    { from: 'browser', to: 'shopware', label: 'HTTPS' },
    { from: 'shopware', to: 'mysql', label: 'SQL' },
  ]

  for (const node of infraNodes.value) {
    result.push({
      from: 'shopware',
      to: node.id,
      label: node.connectionLabel,
      dashed: node.dashed,
    })
  }

  return result
})

// Unique categories from active infra nodes (for legend)
const activeCategories = computed(() => {
  const cats = new Set<string>()
  for (const node of infraNodes.value) {
    cats.add(node.category)
  }
  return Array.from(cats)
})

const svgWidth = 620
const svgHeight = computed(() => {
  const maxY = Math.max(...nodes.value.map(n => n.y))
  return Math.max(300, maxY + 100)
})

function getNodePosition(nodeId: string) {
  const node = nodes.value.find(n => n.id === nodeId)
  return node ? { x: node.x, y: node.y } : { x: 0, y: 0 }
}

function getConnectionPath(conn: Connection) {
  const from = getNodePosition(conn.from)
  const to = getNodePosition(conn.to)

  const startX = from.x + 40
  const startY = from.y
  const endX = to.x - 40
  const endY = to.y

  const midX = (startX + endX) / 2

  return `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`
}

function getConnectionLabelPosition(conn: Connection) {
  const from = getNodePosition(conn.from)
  const to = getNodePosition(conn.to)

  return {
    x: (from.x + to.x) / 2 + 20,
    y: (from.y + to.y) / 2 - 8,
  }
}
</script>

<template>
  <mt-card>
    <template #default>
      <button class="infra-toggle" @click="expanded = !expanded">
        <div class="infra-toggle-left">
          <svg class="infra-toggle-chevron" :class="{ 'infra-toggle-chevron--collapsed': !expanded }" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 9l6 6 6-6"/>
          </svg>
          <span class="infra-toggle-title">Infrastructure Overview</span>
          <span class="live-badge">Live</span>
        </div>
        <span class="infra-toggle-hint">{{ expanded ? 'Collapse' : 'Expand' }}</span>
      </button>

      <div v-show="expanded" class="infra-body">
        <p class="infra-description">
          Visual representation of your Shopware infrastructure based on current configuration.
        </p>

        <div class="svg-container">
          <svg :width="svgWidth" :height="svgHeight" class="infra-svg">
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill="#6b7280" />
              </marker>
            </defs>

            <!-- Connections -->
            <g v-for="conn in connections" :key="`${conn.from}-${conn.to}`">
              <path
                :d="getConnectionPath(conn)"
                fill="none"
                stroke="#4b5563"
                stroke-width="2"
                :stroke-dasharray="conn.dashed ? '5,5' : 'none'"
                marker-end="url(#arrowhead)"
              />
              <text
                :x="getConnectionLabelPosition(conn).x"
                :y="getConnectionLabelPosition(conn).y"
                class="conn-label"
                text-anchor="middle"
              >
                {{ conn.label }}
              </text>
            </g>

            <!-- Nodes -->
            <g v-for="node in nodes" :key="node.id">
              <rect
                :x="node.x - 40"
                :y="node.y - 30"
                width="80"
                height="60"
                rx="8"
                :fill="node.color"
                fill-opacity="0.15"
                :stroke="node.color"
                stroke-width="2"
              />

              <svg
                :x="node.x - 12"
                :y="node.y - 22"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                :stroke="node.color"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path :d="node.icon" />
              </svg>

              <text
                :x="node.x"
                :y="node.y + 18"
                text-anchor="middle"
                class="node-label"
              >
                {{ node.label }}
              </text>
            </g>
          </svg>
        </div>

        <!-- Legend -->
        <div class="legend">
          <div class="legend-item">
            <div class="legend-dot" style="background: #60a5fa"></div>
            <span>Client</span>
          </div>
          <div class="legend-item">
            <div class="legend-dot" style="background: #189eff"></div>
            <span>Application</span>
          </div>
          <div class="legend-item">
            <div class="legend-dot" style="background: #f59e0b"></div>
            <span>Database</span>
          </div>
          <div v-for="cat in activeCategories" :key="cat" class="legend-item">
            <div class="legend-dot" :style="{ background: categoryColorMap[cat] || '#888' }"></div>
            <span>{{ categoryLabelMap[cat] || cat }}</span>
          </div>
        </div>
      </div>
    </template>
  </mt-card>
</template>

<style scoped>
:deep(.mt-card) {
  width: 100%;
}

.infra-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  text-align: left;
}

.infra-toggle-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.infra-toggle-chevron {
  flex-shrink: 0;
  color: #6b7280;
  transition: transform 0.2s ease;
}

.infra-toggle-chevron--collapsed {
  transform: rotate(-90deg);
}

.infra-toggle-title {
  font-size: 1rem;
  font-weight: 600;
  color: #1a1a1a;
}

.infra-toggle-hint {
  font-size: 0.75rem;
  color: #9ca3af;
}

.infra-toggle:hover .infra-toggle-hint {
  color: #6b7280;
}

.live-badge {
  display: inline-block;
  font-size: 0.75rem;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 4px;
  background: #189eff;
  color: #fff;
}

.infra-body {
  margin-top: 16px;
}

.infra-description {
  font-size: 0.875rem;
  color: #6b7280;
  margin-bottom: 16px;
}

.svg-container {
  background: #f9fafb;
  border-radius: 8px;
  padding: 16px;
  overflow-x: auto;
}

.infra-svg {
  display: block;
  margin: 0 auto;
}

.conn-label {
  font-size: 0.75rem;
  fill: #9ca3af;
}

.node-label {
  font-size: 0.75rem;
  font-weight: 500;
  fill: #374151;
}

.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 16px;
  font-size: 0.75rem;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 4px;
}
</style>
