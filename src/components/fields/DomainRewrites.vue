<script setup lang="ts">
import { MtTextField, MtSelect, MtButton } from '@shopware-ag/meteor-component-library'

const model = defineModel<Array<{ type: string; match: string; replace: string }>>({ required: true })

const matchTypeOptions = [
  { label: 'Equal (exact match)', value: 'equal' },
  { label: 'Prefix (starts with)', value: 'prefix' },
  { label: 'Regex (regular expression)', value: 'regex' },
]

function addRewrite() {
  model.value = [...(model.value || []), { type: 'equal', match: '', replace: '' }]
}

function removeRewrite(index: number) {
  const arr = [...model.value]
  arr.splice(index, 1)
  model.value = arr
}

function updateRewrite(index: number, field: string, value: string) {
  const arr = [...model.value]
  arr[index] = { ...arr[index]!, [field]: value }
  model.value = arr
}
</script>

<template>
  <div>
    <div v-for="(rewrite, index) in model" :key="index" class="rewrite-rule">
      <div class="rewrite-header">
        <span class="rewrite-title">Rewrite Rule {{ index + 1 }}</span>
        <mt-button variant="critical" size="x-small" @click="removeRewrite(index)">
          Remove
        </mt-button>
      </div>

      <mt-select
        :model-value="rewrite.type"
        :options="matchTypeOptions"
        label="Match Type"
        @update:model-value="updateRewrite(index, 'type', $event as string)"
      />

      <mt-text-field
        :model-value="rewrite.match"
        label="Match Pattern"
        :help-text="rewrite.type === 'regex' ? 'Regular expression pattern' : 'URL to match'"
        :placeholder="rewrite.type === 'regex' ? '/https?:\\/\\/(\\w+)\\.(\\w+)$/m' : 'https://my-live-store.com'"
        @update:model-value="updateRewrite(index, 'match', $event)"
      />

      <mt-text-field
        :model-value="rewrite.replace"
        label="Replace With"
        :help-text="rewrite.type === 'regex' ? 'Replacement with capture groups' : 'Replacement URL'"
        :placeholder="rewrite.type === 'regex' ? 'http://$1-$2.local' : 'https://my-staging-store.com'"
        @update:model-value="updateRewrite(index, 'replace', $event)"
      />
    </div>

    <mt-button variant="secondary" size="small" @click="addRewrite">
      + Add Domain Rewrite
    </mt-button>
  </div>
</template>

<style scoped>
.rewrite-rule {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.rewrite-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.rewrite-title {
  font-size: 0.875rem;
  font-weight: 500;
}
</style>
