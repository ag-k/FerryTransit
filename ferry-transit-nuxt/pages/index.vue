<template>
  <div class="container py-4">
    <!-- Hero section -->
    <div class="text-center mb-5">
      <h1 class="display-4 mb-3">{{ $t('TITLE') }}</h1>
      <p class="lead text-muted">{{ $t('SUBTITLE') }}</p>
    </div>
    
    <!-- Quick action cards -->
    <div class="row mb-5">
      <div class="col-md-4 mb-3">
        <div class="card h-100 shadow-sm">
          <div class="card-body text-center">
            <div class="mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" class="bi bi-calendar3 text-primary" viewBox="0 0 16 16">
                <path d="M14 0H2a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2zM1 3.857C1 3.384 1.448 3 2 3h12c.552 0 1 .384 1 .857v10.286c0 .473-.448.857-1 .857H2c-.552 0-1-.384-1-.857V3.857z"/>
                <path d="M6.5 7a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm3 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm3 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-9 3a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm3 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm3 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm3 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-9 3a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm3 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm3 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/>
              </svg>
            </div>
            <h5 class="card-title">{{ $t('TIMETABLE') }}</h5>
            <p class="card-text text-muted">{{ $t('TIMETABLE_DESC') }}</p>
            <NuxtLink to="/timetable" class="btn btn-primary">
              {{ $t('VIEW_TIMETABLE') }}
            </NuxtLink>
          </div>
        </div>
      </div>
      
      <div class="col-md-4 mb-3">
        <div class="card h-100 shadow-sm">
          <div class="card-body text-center">
            <div class="mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" class="bi bi-arrow-left-right text-primary" viewBox="0 0 16 16">
                <path fill-rule="evenodd" d="M1 11.5a.5.5 0 0 0 .5.5h11.793l-3.147 3.146a.5.5 0 0 0 .708.708l4-4a.5.5 0 0 0 0-.708l-4-4a.5.5 0 0 0-.708.708L13.293 11H1.5a.5.5 0 0 0-.5.5zm14-7a.5.5 0 0 1-.5.5H2.707l3.147 3.146a.5.5 0 1 1-.708.708l-4-4a.5.5 0 0 1 0-.708l4-4a.5.5 0 1 1 .708.708L2.707 4H14.5a.5.5 0 0 1 .5.5z"/>
              </svg>
            </div>
            <h5 class="card-title">{{ $t('TRANSIT') }}</h5>
            <p class="card-text text-muted">{{ $t('TRANSIT_DESC') }}</p>
            <NuxtLink to="/transit" class="btn btn-primary">
              {{ $t('SEARCH_ROUTES') }}
            </NuxtLink>
          </div>
        </div>
      </div>
      
      <div class="col-md-4 mb-3">
        <div class="card h-100 shadow-sm">
          <div class="card-body text-center">
            <div class="mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" class="bi bi-info-circle text-primary" viewBox="0 0 16 16">
                <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/>
              </svg>
            </div>
            <h5 class="card-title">{{ $t('STATUS') }}</h5>
            <p class="card-text text-muted">{{ $t('STATUS_DESC') }}</p>
            <NuxtLink to="/status" class="btn btn-primary">
              {{ $t('CHECK_STATUS') }}
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Current status alerts -->
    <div v-if="hasAlerts" class="row mb-4">
      <div class="col-12">
        <div class="alert alert-warning">
          <h5 class="alert-heading">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-exclamation-triangle-fill me-2" viewBox="0 0 16 16">
              <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
            </svg>
            {{ $t('OPERATION_ALERTS') }}
          </h5>
          <div v-if="shipStatus.isokaze?.hasAlert" class="mb-2">
            <strong>{{ $t('ISOKAZE') }}:</strong> {{ shipStatus.isokaze.summary || $t('CHECK_DETAILS') }}
          </div>
          <div v-if="shipStatus.dozen?.hasAlert" class="mb-2">
            <strong>{{ $t('FERRY_DOZEN') }}:</strong> {{ shipStatus.dozen.summary || $t('CHECK_DETAILS') }}
          </div>
          <div v-if="shipStatus.ferry?.hasAlert" class="mb-2">
            <strong>{{ $t('FERRY') }}:</strong> 
            <span v-if="shipStatus.ferry.ferryState !== '通常運航'">
              {{ $t('FERRY') }}: {{ shipStatus.ferry.ferryState }}
            </span>
            <span v-if="shipStatus.ferry.ferryState !== '通常運航' && shipStatus.ferry.fastFerryState !== '通常運航'"> / </span>
            <span v-if="shipStatus.ferry.fastFerryState !== '通常運航'">
              {{ $t('RAINBOWJET') }}: {{ shipStatus.ferry.fastFerryState }}
            </span>
          </div>
          <hr>
          <NuxtLink to="/status" class="btn btn-sm btn-warning">
            {{ $t('VIEW_DETAILS') }}
          </NuxtLink>
        </div>
      </div>
    </div>
    
    <!-- Information section -->
    <div class="row">
      <div class="col-md-6 mb-4">
        <h3>{{ $t('ABOUT_SERVICE') }}</h3>
        <p>{{ $t('ABOUT_SERVICE_DESC') }}</p>
        <ul>
          <li>{{ $t('FEATURE_1') }}</li>
          <li>{{ $t('FEATURE_2') }}</li>
          <li>{{ $t('FEATURE_3') }}</li>
          <li>{{ $t('FEATURE_4') }}</li>
        </ul>
      </div>
      
      <div class="col-md-6 mb-4">
        <h3>{{ $t('CONTACT_INFO') }}</h3>
        <div class="list-group">
          <a href="https://www.oki-kisen.co.jp/" target="_blank" class="list-group-item list-group-item-action">
            <div class="d-flex w-100 justify-content-between">
              <h6 class="mb-1">{{ $t('OKI_KISEN') }}</h6>
              <small>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-box-arrow-up-right" viewBox="0 0 16 16">
                  <path fill-rule="evenodd" d="M8.636 3.5a.5.5 0 0 0-.5-.5H1.5A1.5 1.5 0 0 0 0 4.5v10A1.5 1.5 0 0 0 1.5 16h10a1.5 1.5 0 0 0 1.5-1.5V7.864a.5.5 0 0 0-1 0V14.5a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5h6.636a.5.5 0 0 0 .5-.5z"/>
                  <path fill-rule="evenodd" d="M16 .5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0 0 1h3.793L6.146 9.146a.5.5 0 1 0 .708.708L15 1.707V5.5a.5.5 0 0 0 1 0v-5z"/>
                </svg>
              </small>
            </div>
            <p class="mb-1 text-muted">{{ $t('OKI_KISEN_DESC') }}</p>
          </a>
          <a href="https://oki-douzen.com/" target="_blank" class="list-group-item list-group-item-action">
            <div class="d-flex w-100 justify-content-between">
              <h6 class="mb-1">{{ $t('OKI_DOUZEN') }}</h6>
              <small>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-box-arrow-up-right" viewBox="0 0 16 16">
                  <path fill-rule="evenodd" d="M8.636 3.5a.5.5 0 0 0-.5-.5H1.5A1.5 1.5 0 0 0 0 4.5v10A1.5 1.5 0 0 0 1.5 16h10a1.5 1.5 0 0 0 1.5-1.5V7.864a.5.5 0 0 0-1 0V14.5a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5h6.636a.5.5 0 0 0 .5-.5z"/>
                  <path fill-rule="evenodd" d="M16 .5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0 0 1h3.793L6.146 9.146a.5.5 0 1 0 .708.708L15 1.707V5.5a.5.5 0 0 0 1 0v-5z"/>
                </svg>
              </small>
            </div>
            <p class="mb-1 text-muted">{{ $t('OKI_DOUZEN_DESC') }}</p>
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useFerryStore } from '@/stores/ferry'
import { useFerryData } from '@/composables/useFerryData'

const ferryStore = useFerryStore()
const { initializeData } = useFerryData()

// Store data
const shipStatus = computed(() => ferryStore.shipStatus)

// Computed
const hasAlerts = computed(() => {
  return shipStatus.value.isokaze?.hasAlert || 
         shipStatus.value.dozen?.hasAlert || 
         shipStatus.value.ferry?.hasAlert
})

// Initialize data on mount
onMounted(async () => {
  if (ferryStore.timetableData.length === 0) {
    await initializeData()
  }
})

// Page metadata
useHead({
  title: useNuxtApp().$i18n.t('TITLE')
})
</script>

<style scoped>
.display-4 {
  font-weight: 300;
}

.card {
  transition: transform 0.2s, box-shadow 0.2s;
}

.card:hover {
  transform: translateY(-5px);
  box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15) !important;
}

.list-group-item {
  transition: background-color 0.2s;
}
</style>