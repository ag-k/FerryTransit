<template>
  <TransitionRoot appear :show="isOpen" as="template">
    <Dialog as="div" @close="close" class="relative z-50">
      <TransitionChild
        as="template"
        enter="duration-300 ease-out"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="duration-200 ease-in"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-black bg-opacity-25" />
      </TransitionChild>

      <div class="fixed inset-0 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4 text-center">
          <TransitionChild
            as="template"
            enter="duration-300 ease-out"
            enter-from="opacity-0 scale-95"
            enter-to="opacity-100 scale-100"
            leave="duration-200 ease-in"
            leave-from="opacity-100 scale-100"
            leave-to="opacity-0 scale-95"
          >
            <DialogPanel class="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
              <DialogTitle
                as="h3"
                class="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100"
              >
                {{ currentLocale === 'ja' ? port.name : port.nameEn }}
              </DialogTitle>
              
              <div class="mt-4 space-y-4">
                <!-- Port Type -->
                <div>
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    {{ $t(`port.type.${port.type}`) }}
                  </span>
                </div>

                <!-- Facilities -->
                <div v-if="port.facilities">
                  <h4 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                    {{ $t('port.facilities.title') }}
                  </h4>
                  <div class="grid grid-cols-2 gap-2">
                    <div
                      v-for="facility in availableFacilities"
                      :key="facility.key"
                      class="flex items-center space-x-2"
                    >
                      <Icon
                        :name="facility.available ? 'heroicons:check-circle' : 'heroicons:x-circle'"
                        :class="[
                          'w-5 h-5',
                          facility.available ? 'text-green-500' : 'text-gray-400'
                        ]"
                      />
                      <span class="text-sm text-gray-700 dark:text-gray-300">
                        {{ $t(`port.facilities.${facility.key}`) }}
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Access Information -->
                <div v-if="port.access">
                  <h4 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                    {{ $t('port.access.title') }}
                  </h4>
                  <div class="space-y-2">
                    <div v-if="port.access.byBus" class="text-sm">
                      <span class="font-medium text-gray-700 dark:text-gray-300">
                        {{ $t('port.access.byBus') }}:
                      </span>
                      <span class="text-gray-600 dark:text-gray-400 ml-1">
                        {{ currentLocale === 'ja' ? port.access.byBus : port.access.byBusEn }}
                      </span>
                    </div>
                    <div v-if="port.access.byCar" class="text-sm">
                      <span class="font-medium text-gray-700 dark:text-gray-300">
                        {{ $t('port.access.byCar') }}:
                      </span>
                      <span class="text-gray-600 dark:text-gray-400 ml-1">
                        {{ currentLocale === 'ja' ? port.access.byCar : port.access.byCarEn }}
                      </span>
                    </div>
                    <div v-if="port.access.walking" class="text-sm">
                      <span class="font-medium text-gray-700 dark:text-gray-300">
                        {{ $t('port.access.walking') }}:
                      </span>
                      <span class="text-gray-600 dark:text-gray-400 ml-1">
                        {{ currentLocale === 'ja' ? port.access.walking : port.access.walkingEn }}
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Action Buttons -->
                <div class="mt-6 flex space-x-3">
                  <button
                    type="button"
                    class="flex-1 inline-flex justify-center rounded-md border border-transparent bg-blue-100 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:bg-blue-900 dark:text-blue-100 dark:hover:bg-blue-800"
                    @click="viewTimetable"
                  >
                    {{ $t('TIMETABLE') }}
                  </button>
                  <button
                    type="button"
                    class="flex-1 inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
                    @click="close"
                  >
                    {{ $t('CLOSE') }}
                  </button>
                </div>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  TransitionRoot,
  TransitionChild,
  Dialog,
  DialogPanel,
  DialogTitle,
} from '@headlessui/vue'
import type { Port } from '~/types'

// Props
interface Props {
  isOpen: boolean
  port: Port
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  close: []
}>()

// Composables
const { $i18n } = useNuxtApp()
const router = useRouter()

// Computed
const currentLocale = computed(() => $i18n.locale.value)

const availableFacilities = computed(() => {
  if (!props.port.facilities) return []
  
  return [
    { key: 'parking', available: props.port.facilities.parking },
    { key: 'restaurant', available: props.port.facilities.restaurant },
    { key: 'shop', available: props.port.facilities.shop },
    { key: 'waitingRoom', available: props.port.facilities.waitingRoom },
    { key: 'toilet', available: props.port.facilities.toilet },
    { key: 'busStop', available: props.port.facilities.busStop },
    { key: 'taxiStand', available: props.port.facilities.taxiStand }
  ]
})

// Methods
const close = () => {
  emit('close')
}

const viewTimetable = () => {
  // Navigate to timetable with this port selected
  router.push({
    path: '/timetable',
    query: {
      from: props.port.id
    }
  })
  close()
}
</script>