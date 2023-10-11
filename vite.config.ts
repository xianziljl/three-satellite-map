import { defineConfig } from 'vite';

export default defineConfig({
    server: {
        // open: '/example/index.html'
    },
    build: {
        lib: {
            entry: 'src/index.ts',
            name: 'SatelliteMap',
            fileName: 'satellite-map',
            formats: ['es'],
        },
        sourcemap: true,
        rollupOptions: {
            external: [
                'three',
                'three-mesh-bvh',
                '@here/quantized-mesh-decoder',
                '@mapbox/tilebelt',
                'tilebelt-wgs84'
            ]
        }
    },
    plugins: []
});