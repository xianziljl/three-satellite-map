import { Fetch } from '../../Utils/Fetch';
import { Martini } from './Martini';
import { tileToBBOX } from '@mapbox/tilebelt';
import { lonLatToUtm, lonLatToWebMerctor, MERC } from '../../Utils/CoordUtil';
import { getParent } from '@mapbox/tilebelt';
import { Terrain } from '../../Map/Terrain';
import { HeightCorrection } from '../../HeightCorrection/HeightCorrection';


export class MartiniTileUtil {
    static terrainMap = new Map<string, Terrain>();
    static fetchingMap = new Map<string, Fetch>();
    static martiniMap = new Map<number, Martini>();
    static baseSize = 512;

    static getMartini(size: number) {
        let martini = this.martiniMap.get(size);
        if (!martini) {
            martini = new Martini(size + 1);
            this.martiniMap.set(size, martini);
        }
        return martini;
    }

    /**
     * 从缓存的地形里找到指定瓦片编号的祖先地形数据及其编号
     * @param tileNo 瓦片编号
     * @param maxZ 瓦片数据源所能提供的最大层级
     * @returns 地形数据，及地形所对应的瓦片编号
     */
    static findAncestorTerrainData(tileNo: number[], maxZ: number) {
        const z = tileNo[2];
        let terrain: Terrain | undefined = undefined;
        let parentTileNo = tileNo;
        const maxClip = z >= maxZ ? z - maxZ : 5;
        for (let i = 0; i < maxClip; i++) {
            parentTileNo = getParent(parentTileNo);
            const _terrain = this.terrainMap.get(parentTileNo.join('-'));
            if (_terrain) {
                terrain = _terrain;
                terrain.tileNo = parentTileNo;
                break;
            }
        }
        return terrain;
    }

    /**
     * 获取地形数据，根据情况从缓存读取祖先地形并切割，或直接从url获取地形图片并解码
     * @param tileNo 瓦片编号
     * @param url 瓦片下载地址
     * @param maxZ 瓦片数据源所能提供的最大层级，大于此层级将从缓存切割瓦片而非下载
     * @returns 地形数据，地形大小，及地形对应的bbox
     */
    static async getTerrainData(tileNo: number[], url: string, maxZ: number, heightCorrections?: HeightCorrection[]) {
        const id = tileNo.join('-');
        const bbox = tileToBBOX(tileNo);

        const terrain = this.findAncestorTerrainData(tileNo, maxZ);
        if (terrain) {
            let clipTimes = tileNo[2] - terrain.tileNo![2];
            let size = this.baseSize / 2 ** clipTimes;
            return terrain.clip(bbox, size);
        }

        const fetch = new Fetch(url, { cache: 'force-cache' });
        this.fetchingMap.set(id, fetch);
        try {
            const res = await fetch.ready();
            const blob = await res.blob();
            const bitmap = await createImageBitmap(blob);
            const _terrain = Terrain.fromBitmap(bitmap, bbox);
            if (heightCorrections) {
                heightCorrections.forEach(hc => _terrain.fixHeight(hc));
            }
            this.terrainMap.set(id, _terrain);
            return _terrain;
        } finally {
            this.fetchingMap.delete(id);
        }
    }

    /**
     * 根据瓦片编号获取模型数据
     * @param tileNo 瓦片编号
     * @param url 瓦片下载地址
     * @param maxZ 瓦片数据源所能提供的最大层级
     * @param coordType 坐标类型，默认 MERC
     * @param utmZone 当坐标类型为utm时的区号。
     * @returns 几何体顶点、UV、顶点索引
     */
    static async getTileGeometryAttributes(
        tileNo: number[],
        sourceUrl: string,
        maxZ: number,
        coordType = MERC,
        utmZone?: number,
        heightCorrections?: HeightCorrection[]
    ) {
        const terrain = await this.getTerrainData(tileNo, sourceUrl, maxZ, heightCorrections);
        const { size, bbox, array } = terrain;
        const martini = this.getMartini(size);
        const martiniTile = martini.createTile(array);
        const maxError = tileNo[2] > maxZ ? 5 : 10;
        const { vertices, triangles, numVerticesWithoutSkirts } = martiniTile.getMeshWithSkirts(maxError);

        const numOfVertices = vertices.length / 2;
        const positions = new Float32Array(numOfVertices * 3);
        const uv = new Float32Array(numOfVertices * 2);

        const z = tileNo[2];
        const gridSize = size + 1;

        const coordConvertMethod = coordType === MERC ? lonLatToWebMerctor : lonLatToUtm;
        const w = bbox[2] - bbox[0];
        const h = bbox[3] - bbox[1];
        for (let i = 0; i < numOfVertices; i++) {
            const x = vertices[2 * i];
            const y = vertices[2 * i + 1];
            const pixelIdx = y * gridSize + x;
            const lon = w * x / size + bbox[0];
            const lat = h * (size - y) / size + bbox[1];

            const [vx, vy] = coordConvertMethod(lon, lat, utmZone);
            const vz = array[pixelIdx];

            const skirtsHeight = (21 - z) * 10;

            positions[3 * i] = vx;
            positions[3 * i + 1] = vy;
            positions[3 * i + 2] = i >= numVerticesWithoutSkirts ? vz - skirtsHeight : vz;

            uv[2 * i + 0] = x / size;
            uv[2 * i + 1] = (size - y) / size;
        }

        return { positions, uv, triangles };
    }

}
