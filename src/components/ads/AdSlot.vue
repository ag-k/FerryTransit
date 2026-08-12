<template>
  <section
    v-if="ad"
    data-test="ad-slot"
    :data-ad-format="ad.format"
    :aria-label="t('ADVERTISEMENT')"
    v-bind="$attrs"
  >
    <component
      :is="ad.clickUrl ? 'a' : 'div'"
      :href="ad.clickUrl || undefined"
      :target="ad.clickUrl ? '_blank' : undefined"
      :rel="ad.clickUrl ? 'sponsored noopener noreferrer' : undefined"
      class="group relative block overflow-hidden rounded-lg border border-app-border bg-app-surface text-app-fg shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-primary focus-visible:ring-offset-2"
    >
      <span
        class="absolute left-2 top-2 z-10 inline-flex min-h-6 items-center rounded bg-app-primary px-2 py-0.5 text-xs font-semibold leading-none text-white shadow-sm"
      >
        {{ t('ADVERTISEMENT') }}
      </span>

      <div v-if="ad.format === 'text'" class="px-4 pb-4 pt-11 sm:px-5">
        <p class="text-xs font-medium text-app-muted">
          {{ ad.content.advertiserName }}
        </p>
        <h3 class="mt-1 text-lg font-bold leading-snug text-app-fg">
          {{ ad.content.headline }}
        </h3>
        <p class="mt-1.5 text-sm leading-relaxed text-app-muted">
          {{ ad.content.body }}
        </p>
        <span
          v-if="ad.content.cta"
          class="mt-3 inline-flex min-h-9 items-center rounded-md border border-app-primary px-3 py-1.5 text-sm font-semibold text-app-primary group-hover:bg-app-surface-2"
        >
          {{ ad.content.cta }}
        </span>
      </div>

      <div
        v-else
        :class="ad.format === 'banner' ? 'aspect-[4/1]' : 'aspect-[3/2]'"
      >
        <img
          :src="ad.content.assetUrl"
          :alt="ad.content.altText"
          :width="ad.content.width"
          :height="ad.content.height"
          class="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
          @error="hideAd"
        >
      </div>
    </component>
  </section>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import type { DeliveredAd } from '@/types/ad'
import { createLogger } from '@/utils/logger'

defineOptions({ inheritAttrs: false })

interface Props {
  serviceId: string
  slotId: string
  islandId: string
  excludeAdId?: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  resolved: [adId: string | null]
}>()
const config = useRuntimeConfig()
const { t } = useI18n()
const logger = createLogger('AdSlot')
const ad = ref<DeliveredAd | null>(null)
const abortController = new AbortController()

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isHttpUrl = (value: unknown): value is string => {
  if (typeof value !== 'string') return false
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol)
  } catch {
    return false
  }
}

const parseDeliveredAd = (value: unknown): DeliveredAd | null => {
  if (!isRecord(value)
    || typeof value.id !== 'string'
    || typeof value.slotId !== 'string'
    || !['text', 'banner', 'image'].includes(String(value.format))
    || !isRecord(value.content)
    || !(value.clickUrl === null || isHttpUrl(value.clickUrl))) {
    return null
  }

  if (value.format === 'text') {
    const content = value.content
    if (typeof content.advertiserName !== 'string'
      || typeof content.headline !== 'string'
      || typeof content.body !== 'string'
      || typeof content.cta !== 'string') {
      return null
    }
    return {
      id: value.id,
      slotId: value.slotId,
      format: 'text',
      clickUrl: value.clickUrl,
      content: {
        advertiserName: content.advertiserName,
        headline: content.headline,
        body: content.body,
        cta: content.cta
      }
    }
  }

  const content = value.content
  if (!isHttpUrl(content.assetUrl)
    || typeof content.altText !== 'string'
    || typeof content.width !== 'number'
    || typeof content.height !== 'number') {
    return null
  }
  return {
    id: value.id,
    slotId: value.slotId,
    format: value.format as 'banner' | 'image',
    clickUrl: value.clickUrl,
    content: {
      assetUrl: content.assetUrl,
      altText: content.altText,
      width: content.width,
      height: content.height
    }
  }
}

const hideAd = () => {
  ad.value = null
}

onMounted(async () => {
  const baseUrl = String(config.public.adDeliveryBaseUrl || '').replace(/\/$/, '')
  if (!baseUrl) {
    emit('resolved', null)
    return
  }

  const query = new URLSearchParams({
    serviceId: props.serviceId,
    slotId: props.slotId,
    islandId: props.islandId,
    platform: __CAPACITOR_BUILD__ ? 'app' : 'web'
  })
  if (props.excludeAdId) query.set('excludeAdId', props.excludeAdId)

  let resolvedAdId: string | null = null
  try {
    const response = await fetch(`${baseUrl}/api/ads/deliver?${query}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: abortController.signal
    })
    if (response.status === 204) return
    if (!response.ok) throw new Error(`status=${response.status}`)

    const delivered = parseDeliveredAd(await response.json())
    if (delivered?.slotId === props.slotId) {
      ad.value = delivered
      resolvedAdId = delivered.id
    }
  } catch (error) {
    if (!abortController.signal.aborted) {
      logger.debug('広告を取得できなかったため、広告枠を非表示にしました', error)
    }
  } finally {
    emit('resolved', resolvedAdId)
  }
})

onBeforeUnmount(() => abortController.abort())
</script>
