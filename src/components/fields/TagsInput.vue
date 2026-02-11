<script setup lang="ts">
import { ref } from 'vue'
import { MtButton } from '@shopware-ag/meteor-component-library'

const model = defineModel<number[]>({ required: true })

defineProps<{
  placeholder?: string
}>()

const newValue = ref('')

function addTag() {
  const val = parseInt(newValue.value)
  if (val && !model.value.includes(val)) {
    model.value = [...model.value, val]
    newValue.value = ''
  }
}

function removeTag(tag: number) {
  model.value = model.value.filter(t => t !== tag)
}
</script>

<template>
  <div>
    <div class="tags-list">
      <span
        v-for="tag in model"
        :key="tag"
        class="tag"
      >
        {{ tag }}
        <button class="tag-remove" @click="removeTag(tag)">x</button>
      </span>
    </div>

    <div class="tag-input-row">
      <input
        v-model="newValue"
        type="number"
        class="tag-input"
        :placeholder="placeholder || ''"
        @keyup.enter="addTag"
      />
      <mt-button variant="secondary" size="small" @click="addTag">Add</mt-button>
    </div>
  </div>
</template>

<style scoped>
.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  background: #e5e7eb;
  border-radius: 16px;
  font-size: 0.875rem;
  font-weight: 500;
}

.tag-remove {
  background: none;
  border: none;
  cursor: pointer;
  color: #6b7280;
  font-size: 0.875rem;
  margin-left: 4px;
  padding: 0;
}

.tag-remove:hover {
  color: #ef4444;
}

.tag-input-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.tag-input {
  width: 128px;
  padding: 6px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  outline: none;
}

.tag-input:focus {
  border-color: #189eff;
  box-shadow: 0 0 0 2px rgba(24, 158, 255, 0.15);
}
</style>
