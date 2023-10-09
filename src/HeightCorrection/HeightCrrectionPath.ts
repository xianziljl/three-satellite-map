import { HeightCorrection } from './HeightCorrection';
import { BufferAttribute, BufferGeometry } from 'three';
import { expandLine } from '../../src/Utils/LineUtil';

/**
 * 通过一条连续GPS坐标点(可带高程)的路径，将高程修正为该路径的高程，可设置路径扩展宽度。
 */
class HeightCrrectionPath extends HeightCorrection {
    /**
     * @param path GPS坐标点路径[[lon,lat,height]]
     * @param width 路径扩展宽度
     */
    constructor(public path: number[][], public width: number) {
        super();
        const { positions, indexes } = expandLine(path, width);
        const geometry = new BufferGeometry();
        geometry.setAttribute('position', new BufferAttribute(positions, 3));
        geometry.setIndex(new BufferAttribute(indexes, 1));
        this.geometry = geometry;
    }
}

export { HeightCrrectionPath };

