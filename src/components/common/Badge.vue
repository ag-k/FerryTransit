<template>
  <span :class="[badgeClasses, attrs.class]" v-bind="passThroughAttrs">
    <slot />
  </span>
</template>

<script setup lang="ts">
import { computed, useAttrs } from 'vue'

type Variant = 'neutral' | 'primary' | 'info' | 'success' | 'warning' | 'danger'
type Size = 'xs' | 'sm'

interface Props {
  variant?: Variant
  size?: Size
  pill?: boolean
}

defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<Props>(), {
  variant: 'neutral',
  size: 'xs',
  pill: false
})

const attrs = useAttrs()

const passThroughAttrs = computed(() => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { class: _class, ...rest } = attrs
  return rest
})

const badgeClasses = computed(() => {
  const base = 'inline-flex items-center font-bold'
  const rounding = props.pill ? 'rounded-full' : 'rounded-md'
  const padding = props.size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-2 py-1 text-xs'
  const ring = 'ring-1 ring-black/10 dark:ring-white/10'

  const variantClasses: Record<Variant, string> = {
    neutral: 'bg-app-surface-2 text-app-fg',
    primary: 'bg-app-primary text-white',
    info: 'bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-200',
    success: 'bg-green-100 text-green-900 dark:bg-green-900/25 dark:text-green-200',
    warning: 'bg-yellow-200 text-yellow-900 dark:bg-yellow-400 dark:text-gray-900',
    danger: 'bg-red-100 text-red-900 dark:bg-red-900/35 dark:text-red-200'
  }

  return [base, rounding, padding, ring, variantClasses[props.variant]].join(' ')
})
</script>
