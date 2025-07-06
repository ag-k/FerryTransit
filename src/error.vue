<template>
  <NuxtLayout>
    <div class="min-h-[calc(100vh-200px)] flex items-center justify-center px-4 py-12">
      <div class="text-center">
        <div class="mb-8">
          <svg
            v-if="error?.statusCode === 404"
            class="mx-auto h-24 w-24 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <svg
            v-else
            class="mx-auto h-24 w-24 text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <h1 class="text-4xl font-bold text-gray-900 mb-4">
          {{ error?.statusCode === 404 ? $t('error.pageNotFound') : $t('error.somethingWentWrong') }}
        </h1>

        <p class="text-lg text-gray-600 mb-8">
          {{ error?.statusCode === 404 ? $t('error.pageNotFoundDesc') : $t('error.somethingWentWrongDesc') }}
        </p>

        <div class="space-y-3">
          <NuxtLink
            :to="localePath('/')"
            class="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            <svg
              class="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            {{ $t('error.backToHome') }}
          </NuxtLink>

          <div v-if="error?.statusCode !== 404">
            <button
              @click="handleRefresh"
              class="text-blue-600 hover:text-blue-700 transition-colors duration-200"
            >
              {{ $t('error.tryAgain') }}
            </button>
          </div>
        </div>

        <div v-if="error?.statusMessage" class="mt-8 text-sm text-gray-500">
          <details class="cursor-pointer">
            <summary>{{ $t('error.technicalDetails') }}</summary>
            <pre class="mt-2 text-left bg-gray-100 p-4 rounded overflow-x-auto">{{ error }}</pre>
          </details>
        </div>
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
defineProps<{
  error: {
    statusCode: number
    statusMessage: string
  }
}>()

const localePath = useLocalePath()

const handleRefresh = () => {
  clearError({ redirect: localePath('/') })
}
</script>