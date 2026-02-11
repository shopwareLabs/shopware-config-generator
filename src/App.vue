<script setup lang="ts">
import { ref } from 'vue'
import Sidebar from './components/Sidebar.vue'
import ConfigPanel from './components/ConfigPanel.vue'
import OutputPanel from './components/OutputPanel.vue'
import InfrastructureVisualization from './components/InfrastructureVisualization.vue'

const activeSection = ref('core')
</script>

<template>
  <div class="app-layout">
    <Sidebar v-model:active-section="activeSection" />
    <main class="main-content">
      <div class="config-area">
        <div class="infra-wrapper">
          <InfrastructureVisualization />
        </div>
        <ConfigPanel :key="activeSection" :section-id="activeSection" />
      </div>
      <div class="output-area">
        <OutputPanel />
      </div>
    </main>
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  min-height: 100vh;
  background: #f0f2f5;
}

.main-content {
  flex: 1;
  display: flex;
  min-width: 0;
}

.config-area {
  flex: 1;
  overflow-y: auto;
  border-right: 1px solid #e5e7eb;
}

.infra-wrapper {
  padding: 32px 32px 0;
}

.output-area {
  width: 50%;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
}
</style>
