import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'

export function mountWithI18n(component: any, options: any = {}) {
  const i18n = createI18n({
    legacy: false,
    locale: 'ja',
    globalInjection: true,
    messages: {
      ja: {
        LABEL_DATE: '日付',
        BUTTON_TODAY: '今日',
        ...options.messages?.ja
      },
      en: {
        LABEL_DATE: 'Date',
        BUTTON_TODAY: 'Today',
        ...options.messages?.en
      }
    }
  })

  return mount(component, {
    ...options,
    global: {
      ...options.global,
      plugins: [i18n, ...(options.global?.plugins || [])],
      mocks: {
        $t: (key: string) => key,
        ...options.global?.mocks
      }
    }
  })
}