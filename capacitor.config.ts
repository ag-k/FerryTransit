import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.naturebotlab.ferrytransit',
  appName: 'FerryTransit',
  webDir: '.output/public',
  server: {
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
  }
};

export default config;
