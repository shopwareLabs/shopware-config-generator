<script setup lang="ts">
import { ref, computed } from 'vue'
import { getShareableUrl, resetConfig } from '../config'
import { importEnvToConfig, importYamlToConfig, schema } from '../schema'
import { MtButton } from '@shopware-ag/meteor-component-library'

defineProps<{
  mobileOpen?: boolean
}>()

const emit = defineEmits<{
  close: []
  navigate: []
}>()

const activeSection = defineModel<string>('activeSection', { required: true })
const copied = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const directoryInput = ref<HTMLInputElement | null>(null)
const importError = ref('')
const importSuccess = ref('')

interface NavGroup {
  title: string
  items: { id: string; label: string; icon: string }[]
}

const navGroups = computed<NavGroup[]>(() => {
  const groups: Record<string, NavGroup> = {}

  for (const section of schema.sections) {
    const cat = section.category
    if (!groups[cat]) {
      groups[cat] = { title: cat, items: [] }
    }
    groups[cat].items.push({
      id: section.id,
      label: section.title,
      icon: section.icon,
    })
  }

  return Object.values(groups)
})

async function copyShareUrl() {
  const url = getShareableUrl()
  await navigator.clipboard.writeText(url)
  copied.value = true
  setTimeout(() => {
    copied.value = false
  }, 2000)
}

function handleReset() {
  if (confirm('Reset all configuration to defaults?')) {
    resetConfig()
  }
}

function clearImportMessages() {
  importError.value = ''
  importSuccess.value = ''
}

function getImportType(file: File): 'yaml' | 'env' | null {
  const name = file.name.toLowerCase()
  if (name.endsWith('.yml') || name.endsWith('.yaml')) {
    return 'yaml'
  }
  if (name === '.env' || name.startsWith('.env.') || name.endsWith('.env')) {
    return 'env'
  }
  return null
}

function openImportDialog() {
  fileInput.value?.click()
}

function openImportDirectoryDialog() {
  directoryInput.value?.click()
}

async function importYamlFiles(files: File[]) {
  clearImportMessages()

  const importableFiles = files
    .map(file => ({ file, type: getImportType(file) }))
    .filter((entry): entry is { file: File; type: 'yaml' | 'env' } => entry.type !== null)

  if (importableFiles.length === 0) {
    importError.value = 'No supported config files were found (.yaml, .yml, .env).'
    return
  }

  const updatedKeys = new Set<string>()
  const failedFiles: string[] = []

  for (const { file, type } of importableFiles) {
    try {
      const content = await file.text()
      const result = type === 'yaml'
        ? importYamlToConfig(content, file.name)
        : importEnvToConfig(content)
      for (const key of result.updatedKeys) {
        updatedKeys.add(key)
      }
    } catch {
      failedFiles.push(file.name)
    }
  }

  if (updatedKeys.size === 0) {
    importError.value = `No matching fields were found in ${importableFiles.length} config file${importableFiles.length === 1 ? '' : 's'}.`
    return
  }

  importSuccess.value = `Imported ${updatedKeys.size} field${updatedKeys.size === 1 ? '' : 's'} from ${importableFiles.length} config file${importableFiles.length === 1 ? '' : 's'}.`
  if (failedFiles.length > 0) {
    importError.value = `${failedFiles.length} file${failedFiles.length === 1 ? '' : 's'} could not be parsed.`
  }
}

async function onFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  await importYamlFiles([file])
  target.value = ''
}

async function onDirectoryChange(event: Event) {
  const target = event.target as HTMLInputElement
  const files = target.files ? Array.from(target.files) : []
  if (files.length === 0) return

  await importYamlFiles(files)
  target.value = ''
}
</script>

<template>
  <aside class="sidebar" :class="{ 'sidebar--mobile-open': mobileOpen }">
    <div class="sidebar-top">
      <div>
        <h1 class="sidebar-title">Shopware Config</h1>
        <p class="sidebar-subtitle">Configuration Generator</p>
      </div>
      <button class="sidebar-close" @click="emit('close')" aria-label="Close menu">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
    </div>

    <nav class="sidebar-nav">
      <div v-for="group in navGroups" :key="group.title" class="nav-group">
        <h3 class="nav-group-title">{{ group.title }}</h3>
        <button
          v-for="item in group.items"
          :key="item.id"
          class="nav-item"
          :class="{ active: activeSection === item.id }"
          @click="activeSection = item.id; emit('navigate')"
        >
          <svg class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="item.icon" />
          </svg>
          <span class="nav-label">{{ item.label }}</span>
        </button>
      </div>
    </nav>

    <div class="sidebar-actions">
      <input
        ref="fileInput"
        type="file"
        accept=".yaml,.yml,.env"
        class="hidden-input"
        @change="onFileChange"
      />
      <input
        ref="directoryInput"
        type="file"
        accept=".yaml,.yml,.env"
        multiple
        webkitdirectory
        class="hidden-input"
        @change="onDirectoryChange"
      />
      <mt-button
        variant="secondary"
        block
        size="small"
        @click="openImportDialog"
      >
        Import Config File
      </mt-button>
      <mt-button
        variant="secondary"
        block
        size="small"
        @click="openImportDirectoryDialog"
      >
        Import Config Folder
      </mt-button>
      <p v-if="importSuccess" class="import-message import-success">{{ importSuccess }}</p>
      <p v-if="importError" class="import-message import-error">{{ importError }}</p>
      <mt-button
        :variant="copied ? 'primary' : 'primary'"
        block
        size="small"
        @click="copyShareUrl"
      >
        <svg class="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path v-if="!copied" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        {{ copied ? 'URL Copied!' : 'Share Configuration' }}
      </mt-button>
      <mt-button
        variant="secondary"
        block
        size="small"
        @click="handleReset"
      >
        <svg class="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Reset to Defaults
      </mt-button>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 288px;
  background: #fff;
  border-right: 1px solid #e5e7eb;
  padding: 20px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  position: sticky;
  top: 0;
  height: 100vh;
  overflow: hidden;
}

.sidebar-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 24px;
}

.sidebar-close {
  display: none;
  background: none;
  border: none;
  cursor: pointer;
  color: #374151;
  padding: 4px;
  border-radius: 6px;
}

.sidebar-close:hover {
  background: #f3f4f6;
}

.sidebar-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #189eff;
  margin-bottom: 4px;
}

.sidebar-subtitle {
  font-size: 0.875rem;
  color: #6b7280;
}

.sidebar-nav {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.nav-group {
  margin-bottom: 24px;
}

.nav-group-title {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #9ca3af;
  margin-bottom: 12px;
  font-weight: 500;
}

.nav-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  border: none;
  background: none;
  cursor: pointer;
  text-align: left;
  transition: background-color 0.15s, color 0.15s;
  color: #374151;
  font-size: inherit;
}

.nav-item:hover {
  background: #f3f4f6;
}

.nav-item.active {
  background: #189eff;
  color: #fff;
}

.nav-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.nav-label {
  font-size: 0.875rem;
  font-weight: 500;
}

.sidebar-actions {
  flex-shrink: 0;
  border-top: 1px solid #e5e7eb;
  padding-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.hidden-input {
  display: none;
}

.import-message {
  margin: 0;
  font-size: 0.75rem;
}

.import-success {
  color: #047857;
}

.import-error {
  color: #b91c1c;
}

.action-icon {
  width: 16px;
  height: 16px;
  margin-right: 8px;
}

@media (max-width: 767px) {
  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    z-index: 400;
    width: 300px;
    max-width: 85vw;
    transform: translateX(-100%);
    transition: transform 0.3s ease;
    height: 100vh;
    overflow-y: auto;
    box-shadow: none;
  }

  .sidebar--mobile-open {
    transform: translateX(0);
    box-shadow: 4px 0 24px rgba(0, 0, 0, 0.15);
  }

  .sidebar-close {
    display: block;
  }
}
</style>
