import { MartiniTileUtil } from './MartiniTileUtil';
import { HeightCorrection } from '../../HeightCorrection/HeightCorrection';
import { BufferAttribute, BufferGeometry } from 'three';

type MessageType = MessageEvent<{
    id: string;
    tileNo: number[];
    maxZ: number; // RGB 图片最大层级
    url: string;
    coordType?: string;
    utmZone?: number;
    abort?: boolean;
    dispose?: boolean;
    heightCorrections?: HeightCorrection[];
}>;

const heightCorrections: HeightCorrection[] = [];

self.onmessage = async (e: MessageType) => {
    const { id, tileNo, maxZ, url, coordType, utmZone, abort, dispose, heightCorrections: hcs } = e.data;

    // if (hcs) {
    //     console.log(hcs);
    //     heightCorrections.length = 0;
    //     hcs.forEach(item => {
    //         console.log(item.geometry?.index?.array);
    //         if (!item.geometry?.index) {
    //             return;
    //         }
    //         const geometry = new BufferGeometry();
    //         const heightCorrection = new HeightCorrection(geometry);
    //         geometry.setAttribute('position', new BufferAttribute(item.geometry.attributes.position.array, 3));
    //         geometry.setIndex(new BufferAttribute(item.geometry.index!.array, 1));
    //         geometry.computeBoundsTree();
    //         heightCorrections.push(heightCorrection);
    //     });
    //     return;
    // }

    if (abort) {
        MartiniTileUtil.fetchingMap.get(id)?.abort();
        MartiniTileUtil.fetchingMap.delete(id);
        self.postMessage({ id, error: true });
        return;
    }
    if (dispose) {
        MartiniTileUtil.terrainMap.delete(id);
        return;
    }

    if (!id) {
        return;
    }

    try {
        const { positions, uv, triangles } = await MartiniTileUtil.getTileGeometryAttributes(tileNo, url, maxZ, coordType, utmZone, heightCorrections);
        const transferableObjects = [
            positions.buffer,
            uv.buffer,
            triangles.buffer,
        ];
        // @ts-ignore
        self.postMessage({ id, positions, uv, triangles }, transferableObjects);
    } finally {
        MartiniTileUtil.fetchingMap.delete(id);
    }
};