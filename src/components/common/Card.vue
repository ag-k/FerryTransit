<template>
  <component
    :is="as"
    v-bind="passThroughAttrs"
    :class="[cardClasses, attrs.class]"
  >
    <slot />
  </component>
</template>

<script setup lang="ts">
import { computed, useAttrs } from 'vue'

type Padding = 'none' | 'sm' | 'md'
type Variant = 'default' | 'flat'

interface Props {
  as?: string
  padding?: Padding
  variant?: Variant
}

defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<Props>(), {
  as: 'div',
  padding: 'md',
  variant: 'default'
})

const attrs = useAttrs()

const passThroughAttrs = computed(() => {
  // class は merge するので除外
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { class: _class, ...rest } = attrs
  return rest
})

const cardClasses = computed(() => {
  const base = 'bg-app-surface text-app-fg rounded-xl border border-app-border/70'
  const shadow = props.variant === 'flat' ? '' : 'shadow-sm'
  const padding =
    props.padding === 'none' ? '' : props.padding === 'sm' ? 'p-3' : 'p-4'

  return [base, shadow, padding].filter(Boolean).join(' ')
})
</script>
