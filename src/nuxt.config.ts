// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-05-15',
  devtools: { enabled: true },
  
  experimental: {
    componentIslands: false,
    treeshakeClientOnly: false
  },
  
  vite: {
    optimizeDeps: {
      exclude: ['oxc-parser']
    }
  },
  
  modules: [
    '@nuxtjs/i18n',
    '@nuxtjs/google-fonts',
    '@pinia/nuxt',
    '@nuxtjs/tailwindcss'
  ],
  
  // Remove inline config, use tailwind.config.js instead
  tailwindcss: {},

  css: [
    '@/assets/css/main.scss'
  ],

  i18n: {
    locales: [
      { code: 'ja', name: '日本語', file: 'ja.json' },
      { code: 'en', name: 'English', file: 'en.json' }
    ],
    defaultLocale: 'ja',
    langDir: 'locales',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'ferry-transit-locale',
      cookieDomain: null,
      cookieSecure: true,
      cookieCrossOrigin: false,
      cookieSameSite: 'lax',
      fallbackLocale: 'ja',
      redirectOn: 'root',
      alwaysRedirect: false
    },
    strategy: 'prefix_except_default',
    bundle: {
      optimizeTranslationDirective: false
    }
  },

  googleFonts: {
    families: {
      Roboto: [300, 400, 500, 700],
      'Noto+Sans+JP': [300, 400, 500, 700]
    },
    display: 'swap',
    preload: true
  },

  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'https://naturebot-lab.com/ferry_transit',
      shipStatusApi: process.env.NUXT_PUBLIC_SHIP_STATUS_API || 'https://ship.nkk-oki.com/api',
      googleMapsApiKey: process.env.NUXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
      firebase: {
        apiKey: process.env.NUXT_PUBLIC_FIREBASE_API_KEY || '',
        authDomain: process.env.NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
        projectId: process.env.NUXT_PUBLIC_FIREBASE_PROJECT_ID || '',
        storageBucket: process.env.NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
        messagingSenderId: process.env.NUXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
        appId: process.env.NUXT_PUBLIC_FIREBASE_APP_ID || '',
        measurementId: process.env.NUXT_PUBLIC_FIREBASE_MEASUREMENT_ID || ''
      }
    }
  },

  typescript: {
    strict: true,
    shim: false
  },

  nitro: {
    prerender: {
      routes: ['/', '/404.html'],
      crawlLinks: true
    }
  },

  app: {
    head: {
      title: '隠岐航路案内 - Oki Islands Sea Line Information',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no' },
        { 
          name: 'description', 
          content: '島根県隠岐諸島のフェリー・内航船の時刻表と乗換案内' 
        },
        { name: 'theme-color', content: '#3B82F6' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'default' }
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' }
      ]
    }
  },

  ssr: true,
  
  devServer: {
    port: 3030
  }
})
