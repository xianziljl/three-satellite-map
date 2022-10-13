import { BufferGeometry, BufferAttribute, Mesh, MeshBasicMaterial, Vector3 } from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { ElevationFix } from '../core/ElevationFix';
import { AbortableFetch, GLBWorkerPostMessage } from '../utils/interfaces';

function abortableFetch(url: string, init: RequestInit = {}): AbortableFetch {
    const controller = new AbortController();
    const { signal } = controller;

    return {
        abort: () => controller.abort(),
        ready: () => fetch(url, { ...init, signal, cache: 'force-cache' })
    };
}

const requests = new Map<string, AbortableFetch>([]); // {uid, Fetch}
const elevationFixes: ElevationFix[] = [];

const loader = new GLTFLoader();


self.onmessage = async (e: MessageEvent<GLBWorkerPostMessage>) => {
    const { uid, url, init, terrainFixGeometrys, dracoPath } = e.data;

    if (init) {
        if (dracoPath) {
            const dracoLoader = new DRACOLoader();
            dracoLoader.setDecoderPath(dracoPath);
            loader.setDRACOLoader(dracoLoader);
        }

        if (terrainFixGeometrys) {
            terrainFixGeometrys.forEach(item => {
                const geometry = new BufferGeometry();
                const { position, uv, normal } = item.geometry.attributes;
                geometry.setIndex(new BufferAttribute(item.geometry.index?.array ?? [], 1, false));
                geometry.setAttribute('position', new BufferAttribute(position.array, 3));
                geometry.setAttribute('normal', new BufferAttribute(normal.array, 3));
                geometry.setAttribute('uv', new BufferAttribute(uv.array, 2));
                geometry.computeVertexNormals();
                elevationFixes.push(new ElevationFix(geometry, item.mode));
            });
        }
        return;
    }


    try {
        // 取消操作
        if (!url) {
            const req = requests.get(uid);
            if (req) req.abort();
            requests.delete(uid);
            return;
        }

        const request = abortableFetch(url);
        requests.set(uid, request);
        const res = await request.ready();
        const buffer = await res.arrayBuffer();

        loader.parse(buffer, '', gltf => {

            const mesh = gltf.scene.children[0] as Mesh;
            if (!mesh) return;

            const material = mesh.material as MeshBasicMaterial;
            const bitmap = material.map?.source.data as ImageBitmap | null;
            if (!bitmap) return;

            const geometry = mesh.geometry;
            const center = mesh.userData.center || new Vector3();
            geometry.translate(center.x, center.y, center.z);

            // const numVerticesWithoutSkirts = mesh.userData.numVerticesWithoutSkirts || 0;
            const numOfVertices = mesh.userData.numOfVertices || 0;
            let positions = geometry.getAttribute('position').array as Float32Array;

            // console.log(numVerticesWithoutSkirts, positions.length);

            for (let i = 0; i < numOfVertices; i++) {
                const x = positions[3 * i + 0];
                const y = positions[3 * i + 1];
                const z = positions[3 * i + 2];
                let fixedY = y;
                elevationFixes.forEach(item => fixedY = item.fix(x, y, z));
                // if (i >= numVerticesWithoutSkirts && fixedY !== y) {
                //     fixedY = fixedY - 500;
                // }
                positions[3 * i + 1] = fixedY;
            }

            geometry.translate(-center.x, -center.y, -center.z);
            positions = geometry.getAttribute('position').array as Float32Array;

            geometry.computeVertexNormals();
            const normal = geometry.getAttribute('normal').array as Float32Array;
            const uv = geometry.getAttribute('uv').array as Float32Array;

            const bvh = new MeshBVH(geometry);
            const serializedBVH = MeshBVH.serialize(bvh, { cloneBuffers: false });

            const data = { type: 'glb', uid, positions, uv, normal, serializedBVH, center, bitmap };
            const transferable = [
                data.positions.buffer,
                data.uv.buffer,
                data.normal.buffer,
                data.serializedBVH.index.buffer,
                ...data.serializedBVH.roots,
                bitmap
            ];
            // @ts-ignore
            self.postMessage(data, transferable);
        }, err => {
            console.log(err);
        });
    } finally {
        requests.delete(uid);
    }
};