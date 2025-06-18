<template>
  <div>
    <!-- スマホ：出発地/目的地を縦並びで右にボタン -->
    <div class="d-md-none mb-3">
      <div class="d-flex align-items-start gap-2">
        <div class="flex-grow-1">
          <div class="d-flex align-items-center mb-2">
            <label class="form-label fw-bold small mb-0 me-2" style="min-width: 60px;">{{ $t('_FROM') }}</label>
            <select 
              class="form-select form-select-sm"
              :value="departure"
              @change="$emit('update:departure', $event.target.value)"
            >
              <option value="" disabled>{{ $t('DEPARTURE') }}</option>
              <optgroup :label="$t('MAINLAND')">
                <option v-for="port in hondoPorts" :key="port" :value="port">
                  {{ $t(port) }}
                </option>
              </optgroup>
              <optgroup :label="$t('DOZEN')">
                <option v-for="port in dozenPorts" :key="port" :value="port">
                  {{ $t(port) }}
                </option>
              </optgroup>
              <optgroup :label="$t('DOGO')">
                <option v-for="port in dogoPorts" :key="port" :value="port">
                  {{ $t(port) }}
                </option>
              </optgroup>
            </select>
          </div>
          
          <div class="d-flex align-items-center">
            <label class="form-label fw-bold small mb-0 me-2" style="min-width: 60px;">{{ $t('_TO') }}</label>
            <select 
              class="form-select form-select-sm"
              :value="arrival"
              @change="$emit('update:arrival', $event.target.value)"
            >
              <option value="" disabled>{{ $t('ARRIVAL') }}</option>
              <optgroup :label="$t('MAINLAND')">
                <option v-for="port in hondoPorts" :key="port" :value="port">
                  {{ $t(port) }}
                </option>
              </optgroup>
              <optgroup :label="$t('DOZEN')">
                <option v-for="port in dozenPorts" :key="port" :value="port">
                  {{ $t(port) }}
                </option>
              </optgroup>
              <optgroup :label="$t('DOGO')">
                <option v-for="port in dogoPorts" :key="port" :value="port">
                  {{ $t(port) }}
                </option>
              </optgroup>
            </select>
          </div>
        </div>
        
        <div class="d-flex align-items-center justify-content-center" style="padding-top: 20px;">
          <button 
            type="button" 
            class="btn btn-sm btn-outline-primary"
            @click="$emit('reverse')"
            title="出発地と到着地を入れ替え"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-arrow-down-up" viewBox="0 0 16 16">
              <path fill-rule="evenodd" d="M11.5 15a.5.5 0 0 0 .5-.5V2.707l3.146 3.147a.5.5 0 0 0 .708-.708l-4-4a.5.5 0 0 0-.708 0l-4 4a.5.5 0 1 0 .708.708L11 2.707V14.5a.5.5 0 0 0 .5.5zm-7-14a.5.5 0 0 1 .5.5v11.793l3.146-3.147a.5.5 0 0 1 .708.708l-4 4a.5.5 0 0 1-.708 0l-4-4a.5.5 0 0 1 .708-.708L4 13.293V1.5a.5.5 0 0 1 .5-.5z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
    
    <!-- PC：横並び -->
    <div class="d-none d-md-block mb-3">
      <div class="row align-items-end">
        <div class="col-md-5">
          <label class="form-label fw-bold small mb-1">{{ $t('_FROM') }}</label>
          <select 
            class="form-select form-select-sm"
            :value="departure"
            @change="$emit('update:departure', $event.target.value)"
          >
            <option value="" disabled>{{ $t('DEPARTURE') }}</option>
            <optgroup :label="$t('MAINLAND')">
              <option v-for="port in hondoPorts" :key="port" :value="port">
                {{ $t(port) }}
              </option>
            </optgroup>
            <optgroup :label="$t('DOZEN')">
              <option v-for="port in dozenPorts" :key="port" :value="port">
                {{ $t(port) }}
              </option>
            </optgroup>
            <optgroup :label="$t('DOGO')">
              <option v-for="port in dogoPorts" :key="port" :value="port">
                {{ $t(port) }}
              </option>
            </optgroup>
          </select>
        </div>
        
        <div class="col-md-2 text-center">
          <button 
            type="button" 
            class="btn btn-sm btn-outline-primary"
            @click="$emit('reverse')"
            title="出発地と到着地を入れ替え"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-arrow-left-right" viewBox="0 0 16 16">
              <path fill-rule="evenodd" d="M1 11.5a.5.5 0 0 0 .5.5h11.793l-3.147 3.146a.5.5 0 0 0 .708.708l4-4a.5.5 0 0 0 0-.708l-4-4a.5.5 0 0 0-.708.708L13.293 11H1.5a.5.5 0 0 0-.5.5zm14-7a.5.5 0 0 1-.5.5H2.707l3.147 3.146a.5.5 0 1 1-.708.708l-4-4a.5.5 0 0 1 0-.708l4-4a.5.5 0 1 1 .708.708L2.707 4H14.5a.5.5 0 0 1 .5.5z"/>
            </svg>
          </button>
        </div>
        
        <div class="col-md-5">
          <label class="form-label fw-bold small mb-1">{{ $t('_TO') }}</label>
          <select 
            class="form-select form-select-sm"
            :value="arrival"
            @change="$emit('update:arrival', $event.target.value)"
          >
            <option value="" disabled>{{ $t('ARRIVAL') }}</option>
            <optgroup :label="$t('MAINLAND')">
              <option v-for="port in hondoPorts" :key="port" :value="port">
                {{ $t(port) }}
              </option>
            </optgroup>
            <optgroup :label="$t('DOZEN')">
              <option v-for="port in dozenPorts" :key="port" :value="port">
                {{ $t(port) }}
              </option>
            </optgroup>
            <optgroup :label="$t('DOGO')">
              <option v-for="port in dogoPorts" :key="port" :value="port">
                {{ $t(port) }}
              </option>
            </optgroup>
          </select>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  departure: string
  arrival: string
  hondoPorts: string[]
  dozenPorts: string[]
  dogoPorts: string[]
}>()

defineEmits<{
  'update:departure': [value: string]
  'update:arrival': [value: string]
  'reverse': []
}>()
</script>