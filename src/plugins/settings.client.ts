import { useSettingsStore } from '~/stores/settings'

export default defineNuxtPlugin(() => {
  useSettingsStore().loadFromLocalStorage()
})
