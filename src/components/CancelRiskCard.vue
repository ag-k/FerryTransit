<template>
  <div
    class="rounded-lg border border-slate-200/70 bg-white/70 p-2 shadow-sm dark:border-slate-700 dark:bg-slate-900/40 sm:p-2.5">
    <div class="flex items-start justify-between gap-3">
      <div>
        <p class="flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-300 font-sans"
          :class="{ 'tracking-[0.16em]': $i18n.locale.value === 'ja' }">
          <span>{{ $t('cancelRisk.title') }}</span>
          <Icon name="heroicons:information-circle" class="!h-3 !w-3" />
        </p>
      </div>
      <span
        class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset"
        :class="badgeClass">
        {{ levelLabel }}
      </span>
    </div>
    <p class="mt-1.5 text-xs leading-relaxed text-slate-700 dark:text-slate-200">
      {{ messageText }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { classifyCancelRisk, type RiskMode } from '@/utils/cancelRisk'

const { $i18n } = useNuxtApp()

type Props = {
  mode: RiskMode
  probability: number | null
  suspended?: boolean
}

const props = defineProps<Props>()

const isSuspended = computed(() => props.suspended === true)
const isAvailable = computed(() => typeof props.probability === 'number' && Number.isFinite(props.probability))

const classification = computed(() => {
  if (isSuspended.value) return null
  if (!isAvailable.value) return null
  return classifyCancelRisk(props.probability as number, props.mode)
})

const levelLabel = computed(() => {
  if (isSuspended.value) return $i18n.t('cancelRisk.suspendedLabel')
  if (!classification.value) return $i18n.t('cancelRisk.unavailable')
  return $i18n.t(`cancelRisk.level.${classification.value.level}`)
})

const messageText = computed(() => {
  if (isSuspended.value) return $i18n.t('cancelRisk.suspendedMessage')
  if (!classification.value) return $i18n.t('cancelRisk.unavailable')
  return $i18n.t(classification.value.messageKey)
})

const badgeClass = computed(() => {
  if (isSuspended.value) {
    return 'text-slate-600 ring-slate-200 bg-slate-50 dark:text-slate-200 dark:ring-slate-600/60 dark:bg-slate-800/60'
  }
  const level = classification.value?.level
  if (!level) return 'text-slate-600 ring-slate-200 bg-slate-50 dark:text-slate-200 dark:ring-slate-600/60 dark:bg-slate-800/60'
  const map: Record<string, string> = {
    low: 'text-emerald-700 ring-emerald-200 bg-emerald-50 dark:text-emerald-200 dark:ring-emerald-600/60 dark:bg-emerald-900/40',
    lowish: 'text-teal-700 ring-teal-200 bg-teal-50 dark:text-teal-200 dark:ring-teal-600/60 dark:bg-teal-900/40',
    caution: 'text-yellow-700 ring-yellow-200 bg-yellow-50 dark:text-yellow-200 dark:ring-yellow-600/60 dark:bg-yellow-900/40',
    high: 'text-orange-700 ring-orange-200 bg-orange-50 dark:text-orange-200 dark:ring-orange-600/60 dark:bg-orange-900/40',
    very_high: 'text-rose-700 ring-rose-200 bg-rose-50 dark:text-rose-200 dark:ring-rose-600/60 dark:bg-rose-900/40'
  }
  return map[level]
})
</script>
