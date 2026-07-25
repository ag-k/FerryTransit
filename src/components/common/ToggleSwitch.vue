<template>
  <div class="toggle-switch-container">
    <label class="flex items-start justify-between gap-3 cursor-pointer">
      <div class="min-w-0 flex-1">
        <div class="text-sm font-medium text-app-fg">{{ label }}</div>
        <div v-if="description" class="text-xs text-app-muted mt-1">{{ description }}</div>
      </div>
      <span class="relative inline-flex shrink-0 select-none">
        <input
          type="checkbox"
          :checked="checked"
          class="peer sr-only"
          @change="handleChange"
        />
        <span
          class="toggle-label flex h-6 w-11 items-center rounded-full p-0.5 transition-colors duration-200 peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-app-primary peer-focus-visible:ring-offset-2"
          :class="checked ? 'bg-app-primary' : 'bg-app-border'"
          aria-hidden="true"
        >
          <span
            class="block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200"
            :class="checked ? 'translate-x-5' : 'translate-x-0'"
          ></span>
        </span>
      </span>
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
const emit = defineEmits<{
  'update:checked': [value: boolean]
}>()

const handleChange = (event: Event) => {
  emit('update:checked', (event.target as HTMLInputElement).checked)
}
</script>
