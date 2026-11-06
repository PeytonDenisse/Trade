import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({cacheDir:'.sites-runtime/ocr-vite-cache',plugins:[react()],build:{outDir:'.sites-runtime/ocr-browser-build',emptyOutDir:true,rollupOptions:{input:'tests/browser/harness.html'}}});
