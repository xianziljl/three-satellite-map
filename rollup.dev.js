import typescript from '@rollup/plugin-typescript';
import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import webWorkerLoader from "rollup-plugin-web-worker-loader";
import serve from 'rollup-plugin-serve';
import livereload from 'rollup-plugin-livereload';
import cleaner from 'rollup-plugin-cleaner';

export default {
    input: 'main.ts',
    format: 'esm',
    output: {
        dir: 'temp',
        format: 'esm'
    },
    plugins: [
        cleaner({ targets: ['./public/'] }),
        typescript({ target: 'ES2017' }),
        nodeResolve(),
        commonjs(),
        webWorkerLoader({
            inline: false,
            targetPlatform: "browser",
            extensions: ["ts", "js"],
            external: [],
            preserveFileNames: true,
            loadPath: 'temp'
        }),
        serve(),
        livereload(),
    ],
    external: id => (/^three/.test(id) || id === 'proj4'),
};