import typescript from 'rollup-plugin-typescript'
import OMT from '@surma/rollup-plugin-off-main-thread';

export default {
  input: 'src/map/Satellite.ts',
  output: {
    dir: 'dist',
    format: 'esm'
  },
  plugins: [
    OMT(),
    typescript({ target: 'ES2017' })
  ]
}