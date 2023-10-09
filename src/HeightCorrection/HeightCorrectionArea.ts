import { Shape, ShapeGeometry } from 'three';
import { HeightCorrection } from './HeightCorrection';
/**
 * 通过一条连续二维坐标点的路径组成的封闭区域，将该区域范围内的顶点Z修正为给定高程。
 */
class HeightCorrectionArea extends HeightCorrection {
    /**
     * @param path GPS坐标点路径
     * @param height 目标高程
     * @param dim 数据维度
     */
    constructor(public path: number[][], public height: number) {
        super();
        if (!path.length) {
            return;
        }
        const shape = new Shape();
        shape.moveTo(path[0][0], path[0][1]);
        for (let i = 1; i < path.length; i++) {
            shape.lineTo(path[i][0], path[i][1]);
        }
        this.geometry = new ShapeGeometry(shape);
    }
}

export { HeightCorrectionArea };