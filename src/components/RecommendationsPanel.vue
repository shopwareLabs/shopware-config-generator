<script setup lang="ts">
import { ref } from 'vue'
import { recommendations, applyRecommendation, applyAllRecommendations, type Recommendation } from '../recommendations'

const expanded = ref(false)

function severityIcon(severity: string) {
  if (severity === 'error') return 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
  if (severity === 'warning') return 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
  return 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
}

function applySingle(rec: Recommendation) {
  applyRecommendation(rec)
}

function applyAll() {
  applyAllRecommendations()
}

function severityOrder(s: string): number {
  if (s === 'error') return 0
  if (s === 'warning') return 1
  return 2
}
</script>

<template>
  <div v-if="recommendations.length > 0" class="rec-panel">
    <button class="rec-header" @click="expanded = !expanded">
      <div class="rec-header-left">
        <svg class="rec-chevron" :class="{ 'rec-chevron--open': expanded }" width="16" height="16" viewBox="0 0 16 16">
          <path d="M6 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <svg class="rec-shield-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
        </svg>
        <span class="rec-header-text">
          <strong>{{ recommendations.length }}</strong> recommendation{{ recommendations.length === 1 ? '' : 's' }}
        </span>
        <span
          v-for="severity in ['error', 'warning', 'info']"
          :key="severity"
          class="rec-badge"
          :class="`rec-badge--${severity}`"
          v-show="recommendations.filter(r => r.severity === severity).length > 0"
        >
          {{ recommendations.filter(r => r.severity === severity).length }} {{ severity }}
        </span>
      </div>
      <button class="rec-apply-all" @click.stop="applyAll">
        Apply all
      </button>
    </button>

    <div v-if="expanded" class="rec-list">
      <div
        v-for="rec in [...recommendations].sort((a, b) => severityOrder(a.severity) - severityOrder(b.severity))"
        :key="rec.id"
        class="rec-item"
        :class="`rec-item--${rec.severity}`"
      >
        <div class="rec-item-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path :d="severityIcon(rec.severity)" />
          </svg>
        </div>
        <div class="rec-item-content">
          <div class="rec-item-title">{{ rec.label }}</div>
          <div class="rec-item-desc">
            {{ rec.description }}
            <a v-if="rec.url" :href="rec.url" target="_blank" rel="noopener noreferrer" class="rec-link" @click.stop>docs</a>
          </div>
          <div class="rec-item-values">
            <span class="rec-current">Current: <code>{{ rec.current }}</code></span>
            <span class="rec-arrow">&rarr;</span>
            <span class="rec-recommended">Recommended: <code>{{ rec.recommended }}</code></span>
          </div>
        </div>
        <button
          v-if="rec.recommendedValue !== undefined"
          class="rec-fix-btn"
          @click="applySingle(rec)"
        >
          Fix
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.rec-panel {
  margin: 0 auto 24px;
  max-width: 60rem;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #fff;
  overflow: hidden;
}

.rec-header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: inherit;
  font-family: inherit;
  text-align: left;
  color: #1a1a1a;
}

.rec-header:hover {
  background: #f9fafb;
}

.rec-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.rec-chevron {
  transition: transform 0.15s ease;
  color: #6b7280;
  flex-shrink: 0;
}

.rec-chevron--open {
  transform: rotate(90deg);
}

.rec-shield-icon {
  color: #f59e0b;
  flex-shrink: 0;
}

.rec-header-text {
  font-size: 0.875rem;
  color: #374151;
}

.rec-badge {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 10px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.rec-badge--error {
  background: #fef2f2;
  color: #dc2626;
}

.rec-badge--warning {
  background: #fffbeb;
  color: #d97706;
}

.rec-badge--info {
  background: #eff6ff;
  color: #2563eb;
}

.rec-apply-all {
  padding: 6px 14px;
  background: #189eff;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s;
  flex-shrink: 0;
}

.rec-apply-all:hover {
  background: #0284c7;
}

.rec-list {
  border-top: 1px solid #e5e7eb;
}

.rec-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid #f3f4f6;
}

.rec-item:last-child {
  border-bottom: none;
}

.rec-item-icon {
  flex-shrink: 0;
  margin-top: 1px;
}

.rec-item--error .rec-item-icon {
  color: #dc2626;
}

.rec-item--warning .rec-item-icon {
  color: #d97706;
}

.rec-item--info .rec-item-icon {
  color: #2563eb;
}

.rec-item-content {
  flex: 1;
  min-width: 0;
}

.rec-item-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 2px;
}

.rec-item-desc {
  font-size: 0.8125rem;
  color: #6b7280;
  line-height: 1.4;
  margin-bottom: 6px;
}

.rec-link {
  color: #189eff;
  text-decoration: none;
  font-weight: 500;
}

.rec-link:hover {
  text-decoration: underline;
}

.rec-item-values {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.75rem;
  flex-wrap: wrap;
}

.rec-current {
  color: #9ca3af;
}

.rec-arrow {
  color: #9ca3af;
}

.rec-recommended {
  color: #059669;
}

.rec-item-values code {
  background: #f3f4f6;
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 0.75rem;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
}

.rec-fix-btn {
  flex-shrink: 0;
  align-self: center;
  padding: 4px 12px;
  background: #f0fdf4;
  color: #15803d;
  border: 1px solid #bbf7d0;
  border-radius: 6px;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.rec-fix-btn:hover {
  background: #dcfce7;
  border-color: #86efac;
}

@media (max-width: 767px) {
  .rec-panel {
    margin: 0 16px 16px;
  }
}
</style>
