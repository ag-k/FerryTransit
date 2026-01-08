<template>
  <div class="toggle-switch-container">
    <label class="flex items-start justify-between cursor-pointer">
      <div class="flex-1 mr-3">
        <div class="text-sm font-medium text-app-fg">{{ label }}</div>
        <div v-if="description" class="text-xs text-app-muted mt-1">{{ description }}</div>
      </div>
      <div class="relative inline-block w-10 mr-2 align-middle select-none">
        <input
          type="checkbox"
          :checked="checked"
          @change="$emit('update:checked', $event.target.checked)"
          class="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer transition-transform duration-200"
          :class="checked ? 'translate-x-4 border-app-primary' : 'translate-x-0 border-app-muted'"
        />
        <label
          class="toggle-label block overflow-hidden h-6 rounded-full cursor-pointer transition-colors duration-200"
          :class="checked ? 'bg-app-primary' : 'bg-app-border'"
        ></label>
      </div>
    </label>
  </div>
</template>

<script setup lang="ts">
interface Props {
  checked: boolean
  label: string
  description?: string
}

defineProps<Props>()
defineEmits<{
  'update:checked': [value: boolean]
}>()
</script>

<style scoped>
.toggle-checkbox {
  top: 0;
  left: 0;
}

.toggle-checkbox:checked {
  right: 0;
  left: auto;
}
</style>
