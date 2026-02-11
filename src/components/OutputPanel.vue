<script setup lang="ts">
import { ref, computed } from 'vue'
import { generatedEnv, generatedYamlFiles } from '../schema'
import { MtTabs, MtButton } from '@shopware-ag/meteor-component-library'

const activeTab = ref('env')
const copied = ref(false)

const tabs = computed(() => {
  const result: { id: string; label: string; content: string }[] = [
    { id: 'env', label: '.env', content: generatedEnv.value },
  ]

  for (const yamlFile of generatedYamlFiles.value) {
    result.push({ id: yamlFile.file, label: yamlFile.label, content: yamlFile.content })
  }

  return result
})

const tabItems = computed(() =>
  tabs.value.map(t => ({ label: t.label, name: t.id }))
)

const currentContent = computed(() => {
  return tabs.value.find(t => t.id === activeTab.value)?.content || generatedEnv.value
})

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function highlightEnv(content: string): string {
  return content
    .split('\n')
    .map(line => {
      if (line.startsWith('#')) {
        return `<span class="yaml-comment">${escapeHtml(line)}</span>`
      }
      const match = line.match(/^([A-Z_]+)=(.*)$/)
      if (match) {
        const [, varName, varValue] = match
        return `<span class="env-var">${escapeHtml(varName!)}</span>=<span class="env-value">${escapeHtml(varValue!)}</span>`
      }
      return escapeHtml(line)
    })
    .join('\n')
}

function highlightYaml(content: string): string {
  return content
    .split('\n')
    .map(line => {
      if (line.trim().startsWith('#')) {
        return `<span class="yaml-comment">${escapeHtml(line)}</span>`
      }
      const keyMatch = line.match(/^(\s*)([a-z_]+)(:)(.*)$/)
      if (keyMatch) {
        const indent = keyMatch[1] ?? ''
        const key = keyMatch[2] ?? ''
        const colon = keyMatch[3] ?? ''
        const value = keyMatch[4] ?? ''
        let highlightedValue = escapeHtml(value)
        if (value.trim() === 'true' || value.trim() === 'false') {
          highlightedValue = `<span class="yaml-bool">${escapeHtml(value)}</span>`
        } else if (/^\s*\d+\s*$/.test(value)) {
          highlightedValue = `<span class="yaml-number">${escapeHtml(value)}</span>`
        } else if (value.trim().startsWith('"') || value.trim().startsWith("'")) {
          highlightedValue = `<span class="yaml-string">${escapeHtml(value)}</span>`
        } else if (value.trim().startsWith('%')) {
          highlightedValue = `<span class="yaml-string">${escapeHtml(value)}</span>`
        }
        return `${indent}<span class="yaml-key">${escapeHtml(key)}</span>${colon}${highlightedValue}`
      }
      const listMatch = line.match(/^(\s*)(- )(.*)$/)
      if (listMatch) {
        const indent = listMatch[1] ?? ''
        const dash = listMatch[2] ?? ''
        const value = listMatch[3] ?? ''
        return `${indent}${dash}<span class="yaml-string">${escapeHtml(value)}</span>`
      }
      return escapeHtml(line)
    })
    .join('\n')
}

const highlightedContent = computed(() => {
  if (activeTab.value === 'env') {
    return highlightEnv(currentContent.value)
  }
  return highlightYaml(currentContent.value)
})

async function copyToClipboard() {
  await navigator.clipboard.writeText(currentContent.value)
  copied.value = true
  setTimeout(() => {
    copied.value = false
  }, 2000)
}
</script>

<template>
  <div class="output-panel">
    <div class="tabs-bar">
      <mt-tabs
        :items="tabItems"
        default-item="env"
        @new-item-active="activeTab = $event"
      />
    </div>
    <div class="code-area">
      <div class="code-scroll">
        <pre class="code-block" v-html="highlightedContent"></pre>
      </div>
      <mt-button
        class="copy-btn"
        :variant="copied ? 'primary' : 'secondary'"
        size="x-small"
        @click="copyToClipboard"
      >
        {{ copied ? 'Copied!' : 'Copy' }}
      </mt-button>
    </div>
  </div>
</template>

<style scoped>
.output-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.tabs-bar {
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  padding: 0 16px;
}

.code-area {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.code-scroll {
  position: absolute;
  inset: 0;
  overflow: auto;
  background: #1e1e2e;
  padding: 20px;
}

.code-block {
  font-size: 0.875rem;
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
  line-height: 1.6;
  color: #e5e7eb;
  margin: 0;
}

.copy-btn {
  position: absolute;
  top: 12px;
  right: 12px;
}
</style>
