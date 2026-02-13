<script setup lang="ts">
import { ref } from 'vue'
import Sidebar from './components/Sidebar.vue'
import ConfigPanel from './components/ConfigPanel.vue'
import OutputPanel from './components/OutputPanel.vue'
import InfrastructureVisualization from './components/InfrastructureVisualization.vue'

const activeSection = ref('core')
const showOutput = ref(window.innerWidth >= 1280)
const sidebarOpen = ref(false)
</script>

<template>
  <div class="app-layout">
    <!-- Mobile header -->
    <header class="mobile-header">
      <button class="mobile-header-btn" @click="sidebarOpen = true" aria-label="Open menu">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 12h18M3 6h18M3 18h18"/>
        </svg>
      </button>
      <span class="mobile-header-title">Shopware Config</span>
      <button class="mobile-header-btn" @click="showOutput = !showOutput" aria-label="Toggle output">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M16 18l2-2-2-2"/><path d="M8 18l-2-2 2-2"/>
          <path d="M12 2v20"/>
        </svg>
      </button>
    </header>

    <!-- Sidebar backdrop (mobile) -->
    <Transition name="fade">
      <div v-if="sidebarOpen" class="sidebar-backdrop" @click="sidebarOpen = false" />
    </Transition>

    <Sidebar
      v-model:active-section="activeSection"
      :mobile-open="sidebarOpen"
      @close="sidebarOpen = false"
      @navigate="sidebarOpen = false"
    />

    <main class="main-content">
      <div class="config-area">
        <div class="infra-wrapper">
          <InfrastructureVisualization />
        </div>
        <ConfigPanel :key="activeSection" :section-id="activeSection" />
      </div>
      <div v-if="showOutput" class="output-area">
        <OutputPanel />
      </div>
      <button class="toggle-output" @click="showOutput = !showOutput" :title="showOutput ? 'Hide output panel' : 'Show output panel'">
        <svg v-if="showOutput" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 18l6-6-6-6"/>
        </svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
      </button>
    </main>

    <!-- Mobile output overlay -->
    <Transition name="slide-up">
      <div v-if="showOutput" class="mobile-output-overlay">
        <div class="mobile-output-header">
          <span class="mobile-output-title">Generated Output</span>
          <button class="mobile-output-close" @click="showOutput = false" aria-label="Close output">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div class="mobile-output-body">
          <OutputPanel />
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  min-height: 100vh;
  background: #f0f2f5;
}

/* ---- Mobile header ---- */
.mobile-header {
  display: none;
}

/* ---- Sidebar backdrop (mobile only) ---- */
.sidebar-backdrop {
  display: none;
}

.main-content {
  flex: 1;
  display: flex;
  min-width: 0;
  position: relative;
}

.config-area {
  flex: 1;
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
  position: sticky;
  top: 0;
  height: 100vh;
  align-self: flex-start;
}

.toggle-output {
  position: fixed;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-right: none;
  border-radius: 8px 0 0 8px;
  padding: 12px 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  z-index: 100;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.08);
  color: #374151;
}

.toggle-output:hover {
  background: #f9fafb;
  padding-left: 12px;
}

.toggle-output svg {
  display: block;
}

/* ---- Mobile output overlay (hidden on desktop) ---- */
.mobile-output-overlay {
  display: none;
}

/* ---- Transitions ---- */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.3s ease;
}
.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
}

/* ============================================================
   Mobile styles (< 768px)
   ============================================================ */
@media (max-width: 767px) {
  .app-layout {
    flex-direction: column;
  }

  /* Show mobile header */
  .mobile-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: sticky;
    top: 0;
    z-index: 200;
    background: #fff;
    border-bottom: 1px solid #e5e7eb;
    padding: 12px 16px;
    flex-shrink: 0;
  }

  .mobile-header-btn {
    background: none;
    border: none;
    cursor: pointer;
    color: #374151;
    padding: 4px;
    border-radius: 6px;
  }

  .mobile-header-btn:hover {
    background: #f3f4f6;
  }

  .mobile-header-title {
    font-weight: 700;
    font-size: 1rem;
    color: #189eff;
  }

  /* Sidebar as slide-over overlay */
  .sidebar-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    z-index: 300;
  }

  /* Main content becomes single column */
  .main-content {
    flex-direction: column;
  }

  .config-area {
    border-right: none;
  }

  .infra-wrapper {
    padding: 16px 16px 0;
  }

  /* Hide desktop output panel + toggle on mobile */
  .output-area {
    display: none;
  }

  .toggle-output {
    display: none;
  }

  /* Show mobile output overlay */
  .mobile-output-overlay {
    display: flex;
    flex-direction: column;
    position: fixed;
    inset: 0;
    z-index: 250;
    background: #fff;
  }

  .mobile-output-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid #e5e7eb;
    flex-shrink: 0;
  }

  .mobile-output-title {
    font-weight: 600;
    font-size: 1rem;
    color: #1a1a1a;
  }

  .mobile-output-close {
    background: none;
    border: none;
    cursor: pointer;
    color: #374151;
    padding: 4px;
    border-radius: 6px;
  }

  .mobile-output-close:hover {
    background: #f3f4f6;
  }

  .mobile-output-body {
    flex: 1;
    min-height: 0;
  }
}
</style>
