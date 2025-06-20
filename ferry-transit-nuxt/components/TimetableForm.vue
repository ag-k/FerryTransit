<template>
  <div>
    <!-- Mobile: Vertical layout with button on the right -->
    <div class="md:hidden mb-4">
      <div class="flex items-start gap-3">
        <div class="flex-grow space-y-3">
          <div class="flex items-center">
            <label class="text-sm font-medium text-gray-700 mr-3 w-16">{{ $t('_FROM') }}</label>
            <select 
              class="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              :value="departure"
              @change="$emit('update:departure', $event.target.value)"
            >
              <option value="" disabled>{{ $t('DEPARTURE') }}</option>
              <optgroup :label="$t('MAINLAND')" class="font-medium">
                <option v-for="port in hondoPorts" :key="port" :value="port" class="pl-2">
                  {{ $t(port) }}
                </option>
              </optgroup>
              <optgroup :label="$t('DOZEN')" class="font-medium">
                <option v-for="port in dozenPorts" :key="port" :value="port" class="pl-2">
                  {{ $t(port) }}
                </option>
              </optgroup>
              <optgroup :label="$t('DOGO')" class="font-medium">
                <option v-for="port in dogoPorts" :key="port" :value="port" class="pl-2">
                  {{ $t(port) }}
                </option>
              </optgroup>
            </select>
          </div>
          
          <div class="flex items-center">
            <label class="text-sm font-medium text-gray-700 mr-3 w-16">{{ $t('_TO') }}</label>
            <select 
              class="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              :value="arrival"
              @change="$emit('update:arrival', $event.target.value)"
            >
              <option value="" disabled>{{ $t('ARRIVAL') }}</option>
              <optgroup :label="$t('MAINLAND')" class="font-medium">
                <option v-for="port in hondoPorts" :key="port" :value="port" class="pl-2">
                  {{ $t(port) }}
                </option>
              </optgroup>
              <optgroup :label="$t('DOZEN')" class="font-medium">
                <option v-for="port in dozenPorts" :key="port" :value="port" class="pl-2">
                  {{ $t(port) }}
                </option>
              </optgroup>
              <optgroup :label="$t('DOGO')" class="font-medium">
                <option v-for="port in dogoPorts" :key="port" :value="port" class="pl-2">
                  {{ $t(port) }}
                </option>
              </optgroup>
            </select>
          </div>
        </div>
        
        <div class="flex items-center pt-8">
          <button 
            type="button" 
            class="p-2.5 text-sm border border-blue-600 text-blue-600 rounded-md hover:bg-blue-50 transition-colors"
            @click="$emit('reverse')"
            title="出発地と到着地を入れ替え"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
              <path fill-rule="evenodd" d="M11.5 15a.5.5 0 0 0 .5-.5V2.707l3.146 3.147a.5.5 0 0 0 .708-.708l-4-4a.5.5 0 0 0-.708 0l-4 4a.5.5 0 1 0 .708.708L11 2.707V14.5a.5.5 0 0 0 .5.5zm-7-14a.5.5 0 0 1 .5.5v11.793l3.146-3.147a.5.5 0 0 1 .708.708l-4 4a.5.5 0 0 1-.708 0l-4-4a.5.5 0 0 1 .708-.708L4 13.293V1.5a.5.5 0 0 1 .5-.5z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
    
    <!-- Desktop: Horizontal layout -->
    <div class="hidden md:block mb-4">
      <div class="flex items-end gap-4">
        <div class="flex-1">
          <label class="block text-sm font-medium text-gray-700 mb-1">{{ $t('_FROM') }}</label>
          <select 
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            :value="departure"
            @change="$emit('update:departure', $event.target.value)"
          >
            <option value="" disabled>{{ $t('DEPARTURE') }}</option>
            <optgroup :label="$t('MAINLAND')" class="font-medium">
              <option v-for="port in hondoPorts" :key="port" :value="port" class="pl-2">
                {{ $t(port) }}
              </option>
            </optgroup>
            <optgroup :label="$t('DOZEN')" class="font-medium">
              <option v-for="port in dozenPorts" :key="port" :value="port" class="pl-2">
                {{ $t(port) }}
              </option>
            </optgroup>
            <optgroup :label="$t('DOGO')" class="font-medium">
              <option v-for="port in dogoPorts" :key="port" :value="port" class="pl-2">
                {{ $t(port) }}
              </option>
            </optgroup>
          </select>
        </div>
        
        <div class="px-2">
          <button 
            type="button" 
            class="px-4 py-2 border border-blue-600 text-blue-600 rounded-md hover:bg-blue-50 transition-colors"
            @click="$emit('reverse')"
            title="出発地と到着地を入れ替え"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
              <path fill-rule="evenodd" d="M1 11.5a.5.5 0 0 0 .5.5h11.793l-3.147 3.146a.5.5 0 0 0 .708.708l4-4a.5.5 0 0 0 0-.708l-4-4a.5.5 0 0 0-.708.708L13.293 11H1.5a.5.5 0 0 0-.5.5zm14-7a.5.5 0 0 1-.5.5H2.707l3.147 3.146a.5.5 0 1 1-.708.708l-4-4a.5.5 0 0 1 0-.708l4-4a.5.5 0 1 1 .708.708L2.707 4H14.5a.5.5 0 0 1 .5.5z"/>
            </svg>
          </button>
        </div>
        
        <div class="flex-1">
          <label class="block text-sm font-medium text-gray-700 mb-1">{{ $t('_TO') }}</label>
          <select 
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            :value="arrival"
            @change="$emit('update:arrival', $event.target.value)"
          >
            <option value="" disabled>{{ $t('ARRIVAL') }}</option>
            <optgroup :label="$t('MAINLAND')" class="font-medium">
              <option v-for="port in hondoPorts" :key="port" :value="port" class="pl-2">
                {{ $t(port) }}
              </option>
            </optgroup>
            <optgroup :label="$t('DOZEN')" class="font-medium">
              <option v-for="port in dozenPorts" :key="port" :value="port" class="pl-2">
                {{ $t(port) }}
              </option>
            </optgroup>
            <optgroup :label="$t('DOGO')" class="font-medium">
              <option v-for="port in dogoPorts" :key="port" :value="port" class="pl-2">
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