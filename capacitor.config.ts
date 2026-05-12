import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.xanemedia.pms',
  appName: 'Xane PMS',
  webDir: 'dist',
  server: {
    url: 'https://pms-xanemedia.vercel.app', // REPLACE THIS with your actual Vercel URL
    cleartext: true
  }
};

export default config;
