import typescript from '@rollup/plugin-typescript';
import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import webWorkerLoader from "rollup-plugin-web-worker-loader";
import serve from 'rollup-plugin-serve'
import livereload from 'rollup-plugin-livereload'
import cleaner from 'rollup-plugin-cleaner';


const THREE = '../node_modules/three'

export default {
    input: 'main.ts',
    output: {
        dir: 'public',
        format: 'esm',
        paths: id => {
            if (id === 'three') {
                return `./${THREE}/build/three.module.js`
            }
            if (/^three\//.test(id)) {
                return './' + id.replace(/^three/, THREE) + '.js'
            }
            if (id === 'proj4') {
                return 'https://cdn.jsdelivr.net/npm/proj4@2.8.0/+esm'
            }
        }
    },
    plugins: [
        cleaner({ targets: ['./public/'] }),
        // OMT(),
        typescript({ target: 'ES2017' }),
        nodeResolve(),
        commonjs(),
        webWorkerLoader({
            inline: false,
            targetPlatform: "browser",
            extensions: ["ts", "js"],
            external: [],
            preserveFileNames: true,
            loadPath: 'public',
            // plugins: []
        }),
        serve(),
        livereload(),
    ],
    external: id => (/^three/.test(id) || id == 'proj4'),
}