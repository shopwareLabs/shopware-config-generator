<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { generatedEnv, generatedYamlFiles } from '../schema'

const activeFile = ref('.env')
const copied = ref(false)
const expandedFolders = ref<Set<string>>(new Set(['config', 'config/packages', 'config/packages/prod']))

const files = computed(() => {
  const result: { id: string; path: string; content: string }[] = [
    { id: '.env', path: '.env', content: generatedEnv.value },
  ]

  for (const yamlFile of generatedYamlFiles.value) {
    const isMonolog = yamlFile.file.includes('monolog')
    const path = isMonolog
      ? `config/packages/prod/${yamlFile.file}`
      : `config/packages/${yamlFile.file}`
    result.push({ id: yamlFile.file, path, content: yamlFile.content })
  }

  return result
})

// Auto-select first file if active one disappears
watch(files, (newFiles) => {
  if (!newFiles.find(f => f.id === activeFile.value) && newFiles.length > 0) {
    activeFile.value = newFiles[0]!.id
  }
})

interface TreeNode {
  name: string
  path: string
  type: 'file' | 'folder'
  fileId?: string
  children?: TreeNode[]
  depth: number
}

const fileTree = computed<TreeNode[]>(() => {
  const root: TreeNode[] = []
  const folderMap = new Map<string, TreeNode>()

  function ensureFolder(parts: string[], depth: number): TreeNode[] {
    if (parts.length === 0) return root
    const folderPath = parts.join('/')
    if (folderMap.has(folderPath)) {
      return folderMap.get(folderPath)!.children!
    }

    const parentChildren = ensureFolder(parts.slice(0, -1), depth - 1)
    const folder: TreeNode = {
      name: parts[parts.length - 1]!,
      path: folderPath,
      type: 'folder',
      children: [],
      depth: depth - 1,
    }
    folderMap.set(folderPath, folder)
    parentChildren.push(folder)
    return folder.children!
  }

  for (const file of files.value) {
    const segments = file.path.split('/')
    if (segments.length === 1) {
      root.push({
        name: segments[0]!,
        path: file.path,
        type: 'file',
        fileId: file.id,
        depth: 0,
      })
    } else {
      const folderParts = segments.slice(0, -1)
      const children = ensureFolder(folderParts, folderParts.length)
      children.push({
        name: segments[segments.length - 1]!,
        path: file.path,
        type: 'file',
        fileId: file.id,
        depth: segments.length - 1,
      })
    }
  }

  return root
})

function flattenTree(nodes: TreeNode[]): TreeNode[] {
  const result: TreeNode[] = []
  for (const node of nodes) {
    result.push(node)
    if (node.type === 'folder' && node.children && expandedFolders.value.has(node.path)) {
      result.push(...flattenTree(node.children))
    }
  }
  return result
}

const flatTree = computed(() => flattenTree(fileTree.value))

function toggleFolder(path: string) {
  if (expandedFolders.value.has(path)) {
    expandedFolders.value.delete(path)
  } else {
    expandedFolders.value.add(path)
  }
}

function selectFile(node: TreeNode) {
  if (node.type === 'folder') {
    toggleFolder(node.path)
  } else if (node.fileId) {
    activeFile.value = node.fileId
  }
}

const currentFile = computed(() => {
  return files.value.find(f => f.id === activeFile.value) || files.value[0]
})

const currentContent = computed(() => currentFile.value?.content || '')

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
  if (activeFile.value === '.env') {
    return highlightEnv(currentContent.value)
  }
  return highlightYaml(currentContent.value)
})

const lineNumbers = computed(() => {
  const count = currentContent.value.split('\n').length
  return Array.from({ length: count }, (_, i) => i + 1)
})

async function copyToClipboard() {
  await navigator.clipboard.writeText(currentContent.value)
  copied.value = true
  setTimeout(() => {
    copied.value = false
  }, 2000)
}

function getFileIcon(name: string): string {
  if (name.endsWith('.yaml') || name.endsWith('.yml')) return 'yaml'
  if (name === '.env') return 'env'
  return 'file'
}
</script>

<template>
  <div class="editor-panel">
    <!-- Sidebar file explorer -->
    <div class="explorer">
      <div class="explorer-header">
        <span>EXPLORER</span>
      </div>
      <div class="explorer-tree">
        <div
          v-for="node in flatTree"
          :key="node.path"
          class="tree-item"
          :class="{
            'tree-item--active': node.type === 'file' && node.fileId === activeFile,
            'tree-item--folder': node.type === 'folder',
          }"
          :style="{ paddingLeft: (node.depth * 12 + 8) + 'px' }"
          @click="selectFile(node)"
        >
          <!-- Folder icon -->
          <template v-if="node.type === 'folder'">
            <svg class="tree-icon tree-chevron" :class="{ 'tree-chevron--open': expandedFolders.has(node.path) }" width="16" height="16" viewBox="0 0 16 16">
              <path d="M6 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <svg class="tree-icon" width="16" height="16" viewBox="0 0 16 16">
              <path v-if="expandedFolders.has(node.path)" d="M1.5 3h5l1 1.5H14.5v9h-13z" fill="#dcb67a" stroke="none"/>
              <path v-else d="M1.5 3h5l1 1.5H14.5v9h-13z" fill="#c09553" stroke="none"/>
            </svg>
          </template>
          <!-- File icon -->
          <template v-else>
            <span class="tree-icon-spacer" />
            <svg class="tree-icon" width="16" height="16" viewBox="0 0 16 16">
              <rect v-if="getFileIcon(node.name) === 'yaml'" x="2" y="1" width="12" height="14" rx="1" fill="none" stroke="#e06c75" stroke-width="1"/>
              <rect v-else-if="getFileIcon(node.name) === 'env'" x="2" y="1" width="12" height="14" rx="1" fill="none" stroke="#98c379" stroke-width="1"/>
              <rect v-else x="2" y="1" width="12" height="14" rx="1" fill="none" stroke="#abb2bf" stroke-width="1"/>
              <text x="8" y="11" text-anchor="middle" fill="currentColor" font-size="6" font-weight="600">
                {{ getFileIcon(node.name) === 'yaml' ? 'Y' : getFileIcon(node.name) === 'env' ? 'E' : 'F' }}
              </text>
            </svg>
          </template>
          <span class="tree-label">{{ node.name }}</span>
        </div>
      </div>
    </div>

    <!-- Editor area -->
    <div class="editor-main">
      <!-- Tab bar -->
      <div class="tab-bar">
        <div
          v-for="file in files"
          :key="file.id"
          class="tab"
          :class="{ 'tab--active': file.id === activeFile }"
          @click="activeFile = file.id"
        >
          <svg class="tab-icon" width="14" height="14" viewBox="0 0 16 16">
            <rect v-if="getFileIcon(file.path.split('/').pop() || '') === 'yaml'" x="2" y="1" width="12" height="14" rx="1" fill="none" stroke="#e06c75" stroke-width="1"/>
            <rect v-else-if="getFileIcon(file.path.split('/').pop() || '') === 'env'" x="2" y="1" width="12" height="14" rx="1" fill="none" stroke="#98c379" stroke-width="1"/>
            <rect v-else x="2" y="1" width="12" height="14" rx="1" fill="none" stroke="#abb2bf" stroke-width="1"/>
          </svg>
          <span class="tab-label">{{ file.path.split('/').pop() }}</span>
        </div>
        <div class="tab-bar-fill" />
      </div>

      <!-- Breadcrumb -->
      <div class="breadcrumb">
        <template v-for="(segment, i) in (currentFile?.path || '').split('/')" :key="i">
          <span v-if="i > 0" class="breadcrumb-sep">&gt;</span>
          <span class="breadcrumb-part">{{ segment }}</span>
        </template>
      </div>

      <!-- Code area -->
      <div class="code-area">
        <div class="code-scroll">
          <div class="line-numbers" aria-hidden="true">
            <span v-for="n in lineNumbers" :key="n">{{ n }}</span>
          </div>
          <pre class="code-block" v-html="highlightedContent"></pre>
        </div>
        <button
          class="copy-btn"
          :class="{ 'copy-btn--copied': copied }"
          @click="copyToClipboard"
        >
          <svg v-if="!copied" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
          </svg>
          <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
          {{ copied ? 'Copied!' : 'Copy' }}
        </button>
      </div>

      <!-- Status bar -->
      <div class="status-bar">
        <span class="status-item">{{ currentFile?.path }}</span>
        <span class="status-item">UTF-8</span>
        <span class="status-item">{{ activeFile === '.env' ? 'ENV' : 'YAML' }}</span>
        <span class="status-right">
          Ln {{ lineNumbers.length }}, Col 1
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.editor-panel {
  display: flex;
  height: 100%;
  background: #1e1e1e;
  color: #cccccc;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 13px;
}

/* ---- Explorer sidebar ---- */
.explorer {
  width: 200px;
  flex-shrink: 0;
  background: #252526;
  border-right: 1px solid #1e1e1e;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.explorer-header {
  padding: 10px 12px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.8px;
  color: #bbbbbb;
  text-transform: uppercase;
  user-select: none;
}

.explorer-tree {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

.tree-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  cursor: pointer;
  white-space: nowrap;
  user-select: none;
  font-size: 13px;
  color: #cccccc;
}

.tree-item:hover {
  background: #2a2d2e;
}

.tree-item--active {
  background: #37373d;
}

.tree-item--active:hover {
  background: #37373d;
}

.tree-icon {
  flex-shrink: 0;
  color: #cccccc;
}

.tree-icon-spacer {
  width: 16px;
  flex-shrink: 0;
}

.tree-chevron {
  transition: transform 0.15s ease;
}

.tree-chevron--open {
  transform: rotate(90deg);
}

.tree-label {
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ---- Editor main ---- */
.editor-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

/* ---- Tab bar ---- */
.tab-bar {
  display: flex;
  background: #252526;
  height: 35px;
  flex-shrink: 0;
  overflow-x: auto;
  overflow-y: hidden;
}

.tab-bar::-webkit-scrollbar {
  height: 3px;
}

.tab-bar::-webkit-scrollbar-thumb {
  background: #424242;
}

.tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 12px;
  height: 35px;
  cursor: pointer;
  white-space: nowrap;
  border-right: 1px solid #1e1e1e;
  background: #2d2d2d;
  color: #969696;
  font-size: 13px;
  flex-shrink: 0;
  user-select: none;
}

.tab:hover {
  background: #2d2d2d;
  color: #cccccc;
}

.tab--active {
  background: #1e1e1e;
  color: #ffffff;
  border-bottom: 1px solid #1e1e1e;
}

.tab-icon {
  flex-shrink: 0;
}

.tab-label {
  font-size: 13px;
}

.tab-bar-fill {
  flex: 1;
  background: #252526;
  border-bottom: 1px solid #252526;
}

/* ---- Breadcrumb ---- */
.breadcrumb {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 12px;
  background: #1e1e1e;
  font-size: 12px;
  color: #969696;
  border-bottom: 1px solid #2d2d2d;
  flex-shrink: 0;
  overflow-x: auto;
  white-space: nowrap;
}

.breadcrumb-sep {
  color: #666666;
  font-size: 10px;
}

.breadcrumb-part {
  color: #cccccc;
}

/* ---- Code area ---- */
.code-area {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: #1e1e1e;
}

.code-scroll {
  position: absolute;
  inset: 0;
  overflow: auto;
  display: flex;
}

.line-numbers {
  position: sticky;
  left: 0;
  display: flex;
  flex-direction: column;
  padding: 12px 0;
  text-align: right;
  color: #858585;
  font-size: 0.8125rem;
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
  line-height: 1.6;
  user-select: none;
  min-width: 48px;
  padding-right: 16px;
  background: #1e1e1e;
  z-index: 1;
}

.line-numbers span {
  padding-right: 0;
  padding-left: 12px;
}

.code-block {
  flex: 1;
  font-size: 0.8125rem;
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
  line-height: 1.6;
  color: #d4d4d4;
  margin: 0;
  padding: 12px 16px;
  min-width: 0;
}

/* ---- Copy button ---- */
.copy-btn {
  position: absolute;
  top: 8px;
  right: 20px;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: #333333;
  color: #cccccc;
  border: 1px solid #555555;
  border-radius: 4px;
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s ease, background 0.15s ease;
  z-index: 2;
}

.code-area:hover .copy-btn {
  opacity: 1;
}

.copy-btn:hover {
  background: #444444;
}

.copy-btn--copied {
  opacity: 1;
  background: #2ea04366;
  border-color: #2ea043;
  color: #7ee787;
}

/* ---- Status bar ---- */
.status-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 12px;
  height: 22px;
  background: #007acc;
  color: #ffffff;
  font-size: 12px;
  flex-shrink: 0;
  white-space: nowrap;
  overflow: hidden;
}

.status-right {
  margin-left: auto;
}

/* ---- Responsive ---- */
@media (max-width: 767px) {
  .explorer {
    display: none;
  }

  .status-bar {
    display: none;
  }

  .breadcrumb {
    display: none;
  }
}
</style>
