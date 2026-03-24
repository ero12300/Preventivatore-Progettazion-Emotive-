import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const port = Number(env.PORT || env.VITE_PORT) || 3000;
    const stripeServerPort = Number(env.STRIPE_SERVER_PORT) || 4242;
    return {
      server: {
        port,
        strictPort: true,
        host: '0.0.0.0',
        proxy: {
          '/api': {
            target: `http://localhost:${stripeServerPort}`,
            changeOrigin: true,
          }
        }
      },
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
