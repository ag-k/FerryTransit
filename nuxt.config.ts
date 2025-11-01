// https://nuxt.com/docs/api/configuration/nuxt-config

const parseBooleanEnv = (value?: string) => {
  if (!value) {
    return false
  }

  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase())
}

export default defineNuxtConfig({
  srcDir: 'src/',
  compatibilityDate: '2025-05-15',
  devtools: { enabled: true },
  
  experimental: {
    componentIslands: false,
    treeshakeClientOnly: false
  },

  // Capacitor（アプリ版）の場合は管理画面を除外
  nitro: {
    prerender: {
      routes: ['/404.html'],
      crawlLinks: false,
      // アプリ版では管理画面を除外
      exclude: process.env.CAPACITOR_BUILD === 'true' ? [
        '/admin',
        '/admin/**'
      ] : []
    }
  },
  
  vite: {
    optimizeDeps: {
      exclude: ['oxc-parser']
    },
    resolve: {
      preserveSymlinks: false
    },
    server: {
      fs: {
        strict: false
      }
    }
  },
  
  modules: [
    '@nuxtjs/i18n',
    '@nuxtjs/google-fonts',
    '@pinia/nuxt',
    '@nuxtjs/tailwindcss',
    '@nuxt/icon'
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
    langDir: '../i18n/locales',
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
    vueI18n: '../i18n.config.ts'
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
      features: {
        calendar: parseBooleanEnv(process.env.NUXT_PUBLIC_FEATURE_CALENDAR)
      },
      firebase: {
        apiKey: process.env.NUXT_PUBLIC_FIREBASE_API_KEY || '',
        authDomain: process.env.NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
        projectId: process.env.NUXT_PUBLIC_FIREBASE_PROJECT_ID || '',
        storageBucket: process.env.NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
        messagingSenderId: process.env.NUXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
        appId: process.env.NUXT_PUBLIC_FIREBASE_APP_ID || '',
        measurementId: process.env.NUXT_PUBLIC_FIREBASE_MEASUREMENT_ID || '',
        useEmulators: parseBooleanEnv(process.env.NUXT_PUBLIC_FIREBASE_USE_EMULATORS),
        emulatorHost: process.env.NUXT_PUBLIC_FIREBASE_EMULATOR_HOST || 'localhost',
        ports: {
          firestore: parseInt(process.env.NUXT_PUBLIC_FIRESTORE_EMULATOR_PORT || '8082'),
          auth: parseInt(process.env.NUXT_PUBLIC_FIREBASE_AUTH_EMULATOR_PORT || '9099'),
          storage: parseInt(process.env.NUXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_PORT || '9199'),
          functions: parseInt(process.env.NUXT_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR_PORT || '5002')
        }
      }
    }
  },

  typescript: {
    strict: true,
    shim: false
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
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'default' }
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' }
      ]
    }
  },

  ssr: false,
  
  devServer: {
    port: 3030
  }
})
