<script setup lang="ts">
import { config } from '../config'
import { schema, evaluateCondition, type Field, type FieldGenerator } from '../schema'
import { MtTextField, MtNumberField, MtTextarea, MtSelect, MtSwitch, MtCheckbox, MtCard, MtButton } from '@shopware-ag/meteor-component-library'
import DomainRewrites from './fields/DomainRewrites.vue'
import TagsInput from './fields/TagsInput.vue'

defineProps<{
  sectionId: string
}>()

function getSection(id: string) {
  return schema.sections.find(s => s.id === id)
}

function isGroupVisible(showWhen: string | undefined): boolean {
  if (!showWhen) return true
  return evaluateCondition(showWhen, config)
}

function isFieldVisible(field: Field): boolean {
  if (field.type === 'hidden') return false
  if (!field.showWhen) return true
  return evaluateCondition(field.showWhen, config)
}

function toggleChecklist(key: string, value: string) {
  const arr: string[] = config[key] || []
  const index = arr.indexOf(value)
  if (index > -1) {
    config[key] = arr.filter((_: string, i: number) => i !== index)
  } else {
    config[key] = [...arr, value]
  }
}

function isHiddenGroupTitle(title: string): boolean {
  return title.startsWith('_')
}

function getFieldGenerators(field: Field): FieldGenerator[] {
  return field.generators || []
}

function generateRandomHex(length: number): string {
  const safeLength = Math.max(1, Math.floor(length))
  const bytes = new Uint8Array(Math.ceil(safeLength / 2))

  if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256)
    }
  }

  return Array.from(bytes)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, safeLength)
}

function runGenerator(field: Field, generator: FieldGenerator) {
  if (generator.type === 'randomHex') {
    config[field.key] = generateRandomHex(generator.length ?? 64)
  }
}
</script>

<template>
  <div class="config-panel">
    <template v-if="getSection(sectionId)">
      <h2 class="section-title">{{ getSection(sectionId)!.title }}</h2>
      <p class="section-description">{{ getSection(sectionId)!.description }}</p>

      <div class="groups">
        <template v-for="group in getSection(sectionId)!.groups" :key="group.title">
          <template v-if="isGroupVisible(group.showWhen) && !isHiddenGroupTitle(group.title)">
            <mt-card :title="group.title">
              <template v-for="field in group.fields" :key="field.key">
                <template v-if="isFieldVisible(field)">
                  <!-- Toggle -->
                  <mt-switch
                    v-if="field.type === 'toggle'"
                    :model-value="config[field.key]"
                    :label="field.label"
                    :help-text="field.description"
                    bordered
                    @update:model-value="config[field.key] = $event"
                  />

                  <!-- Select -->
                  <mt-select
                    v-else-if="field.type === 'select'"
                    :model-value="config[field.key]"
                    :options="field.options || []"
                    :label="field.label"
                    @update:model-value="config[field.key] = $event"
                  >
                    <template v-if="field.hint" #hint>
                      {{ field.hint }}
                    </template>
                  </mt-select>

                  <!-- Number -->
                  <mt-number-field
                    v-else-if="field.type === 'number'"
                    :model-value="config[field.key]"
                    :label="field.label"
                    :help-text="field.hint"
                    :min="field.min"
                    :placeholder="field.placeholder"
                    number-type="int"
                    @update:model-value="config[field.key] = $event"
                  />

                  <!-- Textarea -->
                  <div v-else-if="field.type === 'textarea'" class="field-wrapper">
                    <mt-textarea
                      :model-value="config[field.key]"
                      :label="field.label"
                      :help-text="field.hint"
                      :placeholder="field.placeholder"
                      @update:model-value="config[field.key] = $event"
                    />
                    <div v-if="getFieldGenerators(field).length > 0" class="generator-actions">
                      <mt-button
                        v-for="(generator, index) in getFieldGenerators(field)"
                        :key="`${field.key}-generator-${index}`"
                        size="x-small"
                        variant="secondary"
                        @click="runGenerator(field, generator)"
                      >
                        {{ generator.label || 'Generate' }}
                      </mt-button>
                    </div>
                  </div>

                  <!-- Checklist -->
                  <template v-else-if="field.type === 'checklist'">
                    <div class="checklist">
                      <mt-checkbox
                        v-for="opt in field.options"
                        :key="opt.value"
                        :checked="(config[field.key] || []).includes(opt.value)"
                        :label="opt.label"
                        :help-text="opt.description"
                        bordered
                        @update:checked="toggleChecklist(field.key, opt.value)"
                      />
                    </div>
                  </template>

                  <!-- Tags -->
                  <div v-else-if="field.type === 'tags'" class="field-wrapper">
                    <label class="field-label">{{ field.label }}</label>
                    <p v-if="field.hint" class="field-hint">{{ field.hint }}</p>
                    <TagsInput v-model="config[field.key]" :placeholder="field.placeholder" />
                  </div>

                  <!-- Domain Rewrites -->
                  <template v-else-if="field.type === 'domain-rewrites'">
                    <DomainRewrites v-model="config[field.key]" />
                  </template>

                  <!-- Text (default) -->
                  <div v-else class="field-wrapper">
                    <mt-text-field
                      :model-value="config[field.key]"
                      :label="field.label"
                      :placeholder="field.placeholder"
                      @update:model-value="config[field.key] = $event"
                    >
                      <template v-if="field.hint" #hint>
                        {{ field.hint }}
                      </template>
                    </mt-text-field>
                    <div v-if="getFieldGenerators(field).length > 0" class="generator-actions">
                      <mt-button
                        v-for="(generator, index) in getFieldGenerators(field)"
                        :key="`${field.key}-generator-${index}`"
                        size="x-small"
                        variant="secondary"
                        @click="runGenerator(field, generator)"
                      >
                        {{ generator.label || 'Generate' }}
                      </mt-button>
                    </div>
                  </div>
                </template>
              </template>
            </mt-card>
          </template>
        </template>
      </div>
    </template>
  </div>
</template>

<style scoped>
.config-panel {
  padding: 32px;
}

.section-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 8px;
}

.section-description {
  color: #6b7280;
  margin-bottom: 32px;
}

.groups {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.groups :deep(.mt-card) {
  width: 100%;
}

.checklist {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field-wrapper {
  margin-bottom: 16px;
}

.generator-actions {
  margin-top: 8px;
  display: flex;
  gap: 8px;
}

.field-label {
  display: block;
  font-weight: 500;
  font-size: 0.875rem;
  margin-bottom: 4px;
}

.field-hint {
  font-size: 0.75rem;
  color: #6b7280;
  margin-bottom: 8px;
}

@media (max-width: 767px) {
  .config-panel {
    padding: 20px 16px;
  }

  .section-title {
    font-size: 1.25rem;
  }

  .section-description {
    margin-bottom: 20px;
  }
}
</style>
