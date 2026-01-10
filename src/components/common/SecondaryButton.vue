<template>
  <component
    :is="componentTag"
    v-bind="componentAttrs"
    :class="[buttonClasses, attrs.class]"
    :disabled="isNativeButton ? disabled : undefined"
    :aria-disabled="!isNativeButton && disabled ? 'true' : undefined"
    @click="handleClick"
  >
    <slot />
  </component>
</template>

<script setup lang="ts">
import { computed, resolveComponent, useAttrs } from 'vue'
import type { RouteLocationRaw } from 'vue-router'

type Size = 'sm' | 'md' | 'lg'

interface Props {
  to?: RouteLocationRaw
  href?: string
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
  size?: Size
  block?: boolean
}

defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<Props>(), {
  type: 'button',
  disabled: false,
  size: 'md',
  block: false
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const attrs = useAttrs()
const nuxtLink = resolveComponent('NuxtLink')

const isNativeButton = computed(() => !props.to && !props.href)
const componentTag = computed(() => (props.href ? 'a' : props.to ? nuxtLink : 'button'))

const componentAttrs = computed(() => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { class: _class, onClick: _onClick, ...rest } = attrs

  if (props.href) {
    return { ...rest, href: props.href }
  }
  if (props.to) {
    return { ...rest, to: props.to }
  }

  return { ...rest, type: props.type }
})

const buttonClasses = computed(() => {
  const base =
    'inline-flex items-center justify-center gap-2 font-medium rounded-lg border border-app-border/70 bg-app-surface text-app-fg shadow-sm ring-1 ring-black/5 dark:ring-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-app-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100'

  const tone = 'hover:bg-app-surface-2'

  const sizing =
    props.size === 'sm'
      ? 'px-3 py-1.5 text-sm'
      : props.size === 'lg'
        ? 'px-5 py-3 text-base'
        : 'px-4 py-2 text-sm'

  const block = props.block ? 'w-full' : ''

  return [base, tone, sizing, block].filter(Boolean).join(' ')
})

const handleClick = (e: MouseEvent) => {
  if (props.disabled) {
    e.preventDefault()
    e.stopPropagation()
    return
  }
  emit('click', e)
}
</script>
