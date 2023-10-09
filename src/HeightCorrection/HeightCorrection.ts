import { BufferGeometry } from 'three';


export enum HeightCorrectionMode {
    UP = 1,
    DOWN = 2,
    MATCH = 3,
}
/**
 * 用户修正地形的海拔高度。
 */
class HeightCorrection {
    mode = HeightCorrectionMode.DOWN;

    /**
     * @param geometry [BufferGeometry](https://threejs.org/docs/index.html?q=buffer#api/zh/core/BufferGeometry)，
     * 在解码地形时会将地形顶点的高程匹配到几何体上。
     */
    constructor(public geometry?: BufferGeometry) {}
}

export { HeightCorrection };