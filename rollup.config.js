import typescript from '@rollup/plugin-typescript';
import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import webWorkerLoader from "rollup-plugin-web-worker-loader";

export default {
    input: 'src/index.ts',
    output: {
        dir: 'dist',
        format: 'esm',
    },
    plugins: [
        typescript({ target: 'ES2017' }),
        nodeResolve(),
        commonjs(),
        webWorkerLoader({
            inline: true,
            targetPlatform: "browser",
            extensions: ["ts", "js"],
            external: [],
        })
    ],
    external: id => (/^three/.test(id) || id === 'proj4'),
};