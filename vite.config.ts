import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  build: { chunkSizeWarningLimit: 1000 },
  ssr: {
    noExternal: ['gsap', '@gsap/react']
  },
  test: { exclude: ['tests/**','node_modules/**','dist/**'] }
});
