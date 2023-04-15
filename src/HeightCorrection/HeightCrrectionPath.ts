import { HeightCorrection } from './HeightCorrection';
// import { Earcut } from 'three';

// Earcut.triangulate();

/**
 * 通过一条连续GPS坐标点(可带高程)的路径，将高程修正为该路径的高程，可设置路径扩展宽度。
 */
class HeightCrrectionPath extends HeightCorrection {
    /**
     * @param path GPS坐标点路径[[x,y,z],[x,y,z]]
     * @param width 路径扩展宽度
     */
    constructor(public path: number[][], public width: number) {
        super();
        for (let i = 0; i < path.length; i++) {
            const [lon, lat] = path[i];
            console.log(lon, lat);
        }
    }
}

export { HeightCrrectionPath };

