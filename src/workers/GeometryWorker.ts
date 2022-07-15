import proj4 from 'proj4';
import { AbortableFetch, GeometryWorkerPostMessage, GeometryWorkerReceiveMessage, TerrainFixMesh, TerrainFixMode } from '../utils/interfaces';
import { abortableFetch, tileToLat, tileToLon, WGS84 } from '../utils/utils';
import { Martini } from '../Martini';
import { BufferAttribute, BufferGeometry, DoubleSide, Mesh, MeshBasicMaterial, Raycaster, Uint32BufferAttribute, Vector3 } from 'three';
import { acceleratedRaycast, MeshBVH } from 'three-mesh-bvh';

const size = 256;

const requests = new Map<string, AbortableFetch>([]); // {uid, Fetch}
const postQueue: GeometryWorkerReceiveMessage[] = [];
const canvas = new OffscreenCanvas(size, size);
const ctx = canvas.getContext('2d');
const terrain = new Float32Array((size + 1) * (size + 1));
const martini = new Martini();

let fixMeshs: TerrainFixMesh[];
const fixMtl = new MeshBasicMaterial({ side: DoubleSide });
const ray = new Raycaster();
ray.firstHitOnly = true;
const rayOrigin = new Vector3();
const rayUp = new Vector3(0, 0, 1);
const rayDown = new Vector3(0, 0, -1);


self.onmessage = async (e: MessageEvent<GeometryWorkerPostMessage>) => {
    const { init, uid, url, level, maxError, row, col, zone, offset, terrainFixGeometrys } = e.data;

    if (init && terrainFixGeometrys) {
        fixMeshs = terrainFixGeometrys.map(item => {
            const geometry = new BufferGeometry();
            const { position, uv, normal } = item.geometry.attributes;
            geometry.setIndex(new BufferAttribute(item.geometry.index?.array ?? [], 1, false))
            geometry.setAttribute('position', new BufferAttribute(position.array, 3));
            geometry.setAttribute('normal', new BufferAttribute(normal.array, 3));
            geometry.setAttribute('uv', new BufferAttribute(uv.array, 2));
            geometry.computeVertexNormals();
            const mesh = new Mesh(geometry, fixMtl);
            mesh.raycast = acceleratedRaycast;
            mesh.geometry.boundsTree = new MeshBVH(mesh.geometry);
            return {
                mesh,
                mode: item.mode
            }
        });
        return;
    }

    try {
        if (!url) {
            const req = requests.get(uid);
            if (req) req.abort();
            requests.delete(uid);
            postQueue.forEach((item, i) => {
                if (item.uid === uid) postQueue.splice(i, 1);
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

        // 生成原始顶点和面信息
        const { vertices, triangles, numVerticesWithoutSkirts } = martiniTile.getMeshWithSkirts(maxError);

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

            let vx = coord.x - offset.x;
            let vy = coord.y - offset.y;
            let vz = terrain[pixelIdx];

            positions[3 * i + 0] = vx;
            positions[3 * i + 1] = vy;

            rayOrigin.x = vx;
            rayOrigin.y = vy;
            rayOrigin.z = vz;
            
            if (fixMeshs && fixMeshs.length) {
                fixMeshs.forEach(item => {
                    if (item.mode === TerrainFixMode.DOWN) {
                        ray.set(rayOrigin, rayDown);
                        const res = ray.intersectObject(fixMeshs[0].mesh, false)[0];
                        if (res) vz = res.point.z;
                        return;
                    }
                    if (item.mode === TerrainFixMode.UP) {
                        ray.set(rayOrigin, rayUp);
                        const res = ray.intersectObject(fixMeshs[0].mesh, false)[0];
                        if (res) vz = res.point.z;
                        return;
                    }
                    if (item.mode == TerrainFixMode.MATCH) {
                        rayOrigin.z = -1e8;
                        ray.set(rayOrigin, rayUp);
                        const res = ray.intersectObject(fixMeshs[0].mesh, false)[0];
                        if (res) vz = res.point.z;
                    }
                    
                })
            }


            if (i >= numVerticesWithoutSkirts) {
                positions[3 * i + 2] = vz - 200;
            } else {
                positions[3 * i + 2] = vz;
            }

            uv[2 * i + 0] = x / size;
            uv[2 * i + 1] = (size - y) / size;
        }

        // console.log(positions);

        // 计算分层包围盒
        const geometry = new BufferGeometry();
        geometry.setAttribute('position', new BufferAttribute(positions, 3));
        geometry.setIndex(new Uint32BufferAttribute(triangles, 1, false));
        geometry.computeVertexNormals();
        const normal = geometry.getAttribute('normal').array as Float32Array;

        const bvh = new MeshBVH(geometry);
        const serializedBVH = MeshBVH.serialize(bvh, { cloneBuffers: false });

        // 加入更新队列
        postQueue.push({ uid, positions, triangles, uv, normal, serializedBVH });
        requests.delete(uid);
    } catch (e) {
        requests.delete(uid);
    }
};

const post = () => {
    if (postQueue.length) {
        const data = postQueue[0];

        const transferable = [
            data.positions.buffer,
            data.triangles.buffer,
            data.uv.buffer,
            data.normal.buffer,
            data.serializedBVH.index.buffer,
            ...data.serializedBVH.roots
        ]
        // @ts-ignore
        self.postMessage(data, transferable);
        postQueue.shift();
    }
    requestAnimationFrame(post);
};

post();


