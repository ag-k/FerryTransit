// https://nuxt.com/docs/api/configuration/nuxt-config

const parseBooleanEnv = (value?: string) => {
  if (!value) {
    return false;
  }

  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
};

const normalizeFirebaseBucket = (bucket?: string) => {
  if (!bucket) {
    return "";
  }

  if (bucket.endsWith(".appspot.com")) {
    return bucket.replace(/\.appspot\.com$/, ".firebasestorage.app");
  }

  return bucket;
};

const isProductionBuild = process.env.NODE_ENV === "production";

export default defineNuxtConfig({
  srcDir: "src/",
  compatibilityDate: "2025-05-15",
  devtools: { enabled: true },

  experimental: {
    componentIslands: false,
    treeshakeClientOnly: false,
  },

  // Capacitor（アプリ版）の場合は管理画面を除外
  nitro: {
    prerender: {
      routes: ["/404.html"],
      crawlLinks: false,
      // アプリ版では管理画面を除外
      ignore:
        process.env.CAPACITOR_BUILD === "true" ? ["/admin", "/admin/**"] : [],
    },
  },

  vite: {
    optimizeDeps: {
      exclude: ["oxc-parser"],
    },
    resolve: {
      preserveSymlinks: false,
    },
    server: {
      fs: {
        strict: false,
      },
    },
  },

  modules: [
    "@nuxtjs/i18n",
    "@nuxtjs/google-fonts",
    "@pinia/nuxt",
    "@nuxtjs/tailwindcss",
    "@nuxt/icon",
  ],

  // Remove inline config, use tailwind.config.js instead
  tailwindcss: {},

  css: ["@/assets/css/tailwind.css", "@/assets/css/main.scss"],

  i18n: {
    locales: [
      { code: "ja", name: "日本語", file: "ja.json" },
      { code: "en", name: "English", file: "en.json" },
    ],
    defaultLocale: "ja",
    langDir: "../i18n/locales",
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: "ferry-transit-locale",
      cookieDomain: null,
      cookieSecure: true,
      cookieCrossOrigin: false,
      fallbackLocale: "ja",
      redirectOn: "root",
      alwaysRedirect: false,
    },
    strategy: "prefix_except_default",
    vueI18n: "../i18n.config.ts",
    bundle: {
      optimizeTranslationDirective: false,
    },
  },

  googleFonts: {
    families: {
      Inter: [300, 400, 500, 700],
      "BIZ+UDPGothic": [400, 700],
    },
    display: "swap",
    preload: true,
  },

  runtimeConfig: {
    public: {
      appVersion:
        process.env.NUXT_PUBLIC_APP_VERSION ||
        process.env.npm_package_version ||
        "0.0.0",
      apiBase:
        process.env.NUXT_PUBLIC_API_BASE ||
        "https://naturebot-lab.com/ferry_transit",
      shipStatusApi:
        process.env.NUXT_PUBLIC_SHIP_STATUS_API ||
        "https://ship.nkk-oki.com/api",
      googleMapsApiKey: process.env.NUXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
      features: {
        calendar: parseBooleanEnv(process.env.NUXT_PUBLIC_FEATURE_CALENDAR),
      },
      firebase: {
        apiKey: process.env.NUXT_PUBLIC_FIREBASE_API_KEY || "",
        authDomain: process.env.NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
        projectId: process.env.NUXT_PUBLIC_FIREBASE_PROJECT_ID || "",
        storageBucket: normalizeFirebaseBucket(
          process.env.NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET
        ),
        messagingSenderId:
          process.env.NUXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
        appId: process.env.NUXT_PUBLIC_FIREBASE_APP_ID || "",
        measurementId: process.env.NUXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "",
        useEmulators: isProductionBuild
          ? false
          : parseBooleanEnv(process.env.NUXT_PUBLIC_FIREBASE_USE_EMULATORS),
        emulatorHost:
          process.env.NUXT_PUBLIC_FIREBASE_EMULATOR_HOST || "localhost",
        ports: {
          firestore: parseInt(
            process.env.NUXT_PUBLIC_FIRESTORE_EMULATOR_PORT || "8751"
          ),
          auth: parseInt(
            process.env.NUXT_PUBLIC_FIREBASE_AUTH_EMULATOR_PORT || "9099"
          ),
          storage: parseInt(
            process.env.NUXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_PORT || "9199"
          ),
          functions: parseInt(
            process.env.NUXT_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR_PORT || "55002"
          ),
        },
      },
    },
  },

  typescript: {
    strict: true,
    shim: false,
  },

  app: {
    head: {
      title: "隠岐航路案内 - Oki Route Guide",
      meta: [
        { charset: "utf-8" },
        {
          name: "viewport",
          content:
            "width=device-width, initial-scale=1, viewport-fit=cover",
        },
        {
          name: "description",
          content: "島根県隠岐諸島のフェリー・内航船の時刻表と乗換案内",
        },
        { name: "theme-color", content: "#0047AB" },
        { name: "apple-mobile-web-app-capable", content: "yes" },
        { name: "mobile-web-app-capable", content: "yes" },
        { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      ],
      link: [
        { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
        { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      ],
    },
  },

  ssr: false,

  devServer: {
    port: 3030,
  },
});
