import type { CapacitorConfig } from '@capacitor/cli';

// Mobile + Tablet native apps (Android + iOS) are built from the static
// export in ./out. Tablet is the same binary — the app's responsive layout
// switches to the tablet sidebar/tablet grid automatically (768–1024px).
const config: CapacitorConfig = {
  appId: 'com.delulu.academic',
  appName: 'Delulu',
  webDir: 'out',
  backgroundColor: '#0B1120',
  server: {
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: true,
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#0B1120',
  },
};

export default config;
