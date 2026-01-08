<template>
  <Alert
    :visible="visible"
    :type="type"
    :title="title"
    :message="message"
    :dismissible="dismissible"
    :auto-close="autoClose"
    :auto-close-delay="autoCloseDelay"
    @update:visible="emit('update:visible', $event)"
    @close="emit('close')"
  />
</template>

<script setup lang="ts">
import Alert from '@/components/common/Alert.vue'

interface Props {
  visible: boolean
  type?: 'success' | 'danger' | 'warning' | 'info' | 'primary' | 'secondary' | 'light' | 'dark'
  title?: string
  message: string
  dismissible?: boolean
  autoClose?: boolean
  autoCloseDelay?: number
}

const props = withDefaults(defineProps<Props>(), {
  type: 'info',
  dismissible: true,
  autoClose: false,
  autoCloseDelay: 5000
})

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'close': []
}>()
</script>
