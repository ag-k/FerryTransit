import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.naturebotlab.ferrytransit',
  appName: 'FerryTransit',
  webDir: '.output/public',
  server: {
    // Capacitor loads this ES5-only page when the installed Android WebView is
    // older than its supported minimum, avoiding an otherwise blank screen.
    errorPath: 'unsupported-webview.html',
    // For development only
    // url: 'http://localhost:3000',
    // cleartext: true
  },
  ios: {
    contentInset: 'never',
    backgroundColor: '#0f172a' // slate-900 (dark mode app-surface)
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined
    }
  },
  plugins: {
    SplashScreen: {
      // Webアプリ初期化前の自動非表示とJS側hide()の競合を避ける。
      launchAutoHide: false
    }
  }
};

export default config;
