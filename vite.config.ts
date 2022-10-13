import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
    build: {
        lib: {
            entry: 'src/index.ts',
            name: 'satellite-map'
        },
        sourcemap: true,
        rollupOptions: {
            external: ['three', 'three-mesh-bvh', 'proj4']
        }
    },
    plugins: [dts()]
});