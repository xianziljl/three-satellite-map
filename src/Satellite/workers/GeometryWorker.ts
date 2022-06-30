import proj4 from 'proj4';
import { AbortableFetch, GeometryWorkerPostMessage, GeometryWorkerReceiveMessage } from '../../utils/interfaces';
import { abortableFetch, tileToLat, tileToLon, WGS84 } from '../../utils/utils';
import { Martini } from '../Martini';
import { BufferAttribute, BufferGeometry, Uint32BufferAttribute } from 'three';
import { MeshBVH } from 'three-mesh-bvh';

const size = 256;
const maxError = 150;
const minError = 20;

const requests = new Map<string, AbortableFetch>([]); // {uid, Fetch}
const postQueue: GeometryWorkerReceiveMessage[] = [];
const canvas = new OffscreenCanvas(size, size);
const ctx = canvas.getContext('2d');
const terrain = new Float32Array((size + 1) * (size + 1));
const martini = new Martini();


self.onmessage = async (e: MessageEvent<GeometryWorkerPostMessage>) => {
    const { id, uid, url, level, maxLevel, minLevel, row, col, zone, offset } = e.data;

    try {
        if (!url) {
            const req = requests.get(uid);
            if (req) req.abort();
            requests.delete(uid);
            postQueue.forEach((item, i) => {
                if (item.uid == uid) postQueue.splice(i, 1);
            });
            return;
        }

        const request = abortableFetch(url);
        requests.set(uid, request);
        const res = await request.ready();
        const blob = await res.blob();
        const bitmap = await createImageBitmap(blob);

        if (!ctx) throw new Error('Can not get canvas context.');

        // 获取高程数据
        ctx.drawImage(bitmap, 0, 0, size, size);
        const imgData = ctx.getImageData(0, 0, size, size).data;
        const gridSize = size + 1;
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const k = (y * size + x) * 4;
                const r = imgData[k + 0];
                const g = imgData[k + 1];
                const b = imgData[k + 2];
                terrain[y * gridSize + x] = (r * 256 * 256 + g * 256 + b) / 10 - 10000;
            }
        }
        for (let x = 0; x < gridSize - 1; x++) {
            terrain[gridSize * (gridSize - 1) + x] = terrain[gridSize * (gridSize - 2) + x];
        }
        for (let y = 0; y < gridSize; y++) {
            terrain[gridSize * y + gridSize - 1] = terrain[gridSize * y + gridSize - 2];
        }

        const martiniTile = martini.createTile(terrain);
        // 计算误差，层级越高，误差越小
        const percent = (level - minLevel) / (maxLevel - minLevel);
        const error = maxError - ((maxError - minError) * percent) - minError;
        const err = error < minError ? minError : error;
        // 生成原始顶点和面信息
        const { vertices, triangles, numVerticesWithoutSkirts } = martiniTile.getMeshWithSkirts(err);

        // 四个角的经纬度
        const topLeftLon = tileToLon(col, level);
        const topLeftLat = tileToLat(row, level);
        const bottomRightLon = tileToLon(col + 1, level);
        const bottomRightLat = tileToLat(row + 1, level);

        const numOfVertices = vertices.length / 2;
        const positions = new Float32Array(numOfVertices * 3);
        const uv = new Float32Array(numOfVertices * 2);

        const UTM = `+proj=utm +zone= ${zone} +ellps=WGS84 +datum=WGS84 +units=m +no_defs `;
        const proj = proj4(WGS84, UTM);

        // 根据生成的顶点和面信息计算几何体的 position 和 uv 信息
        for (let i = 0; i < numOfVertices; i++) {
            const x = vertices[i * 2];
            const y = vertices[i * 2 + 1];
            const pixelIdx = y * gridSize + x;

            const lon = (bottomRightLon - topLeftLon) * x / size + topLeftLon;
            const lat = (bottomRightLat - topLeftLat) * y / size + topLeftLat;

            const coord = proj.forward({ x: lon, y: lat });

            positions[3 * i + 0] = coord.x - offset.x;
            positions[3 * i + 1] = coord.y - offset.y;

            if (i > numVerticesWithoutSkirts) {
                positions[3 * i + 2] = 0;
            } else {
                positions[3 * i + 2] = terrain[pixelIdx];
            }

            uv[2 * i + 0] = x / size;
            uv[2 * i + 1] = (size - y) / size;
        }

        // 计算分层包围盒
        const geometry = new BufferGeometry();
        geometry.setAttribute('position', new BufferAttribute(positions, 3));
        geometry.setIndex(new Uint32BufferAttribute(triangles, 1, false));
        const bvh = new MeshBVH(geometry);
        const serializedBVH = MeshBVH.serialize(bvh, { cloneBuffers: false });

        // 加入更新队列
        postQueue.push({ uid, positions, triangles, uv, serializedBVH });
    } catch (e) {
        console.log(e);
    }
};

const post = () => {
    if (postQueue.length) {
        const data = postQueue[0];

        const transferable = [
            data.positions.buffer,
            data.triangles.buffer,
            data.uv.buffer,
            // data.serialized.index.buffer,
            ...data.serializedBVH.roots
        ]
        // @ts-ignore
        self.postMessage(data, transferable);
        postQueue.shift();
    }
    setTimeout(post, 16.7);
};

post();


