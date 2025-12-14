import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.budgetsystem.app',
  appName: 'Budget System',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
