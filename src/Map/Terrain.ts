import { Box3, BufferGeometry, Mesh, Raycaster } from 'three';
import { HeightCorrection, HeightCorrectionMode } from '../HeightCorrection/HeightCorrection';
import { acceleratedRaycast, computeBoundsTree, disposeBoundsTree } from 'three-mesh-bvh';

BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;

const noFix = (y: number, _y1: number) => y;
const downFix = (y: number, y1: number) => y1 > y ? y1 : y;
const upFix = (y: number, y1: number) => y1 < y ? y1 : y;

const mesh = new Mesh();
mesh.raycast = acceleratedRaycast;

const raycaster = new Raycaster();
raycaster.firstHitOnly = true;

export class Terrain {
    private static _offscreencanvas: OffscreenCanvas;

    constructor(
        public array: Float32Array,
        public size: number,
        public bbox: number[]
    ) { }

    boundingBox: Box3;
    tileNo?: number[];

    static fromBitmap(bitmap: ImageBitmap, bbox: number[]) {
        if (!this._offscreencanvas) {
            this._offscreencanvas = new OffscreenCanvas(512, 512);
        }
        const ctx = this._offscreencanvas.getContext('2d');
        if (!ctx) {
            throw new Error('Get context 2d error.');
        }
        const size = bitmap.width;
        ctx.drawImage(bitmap, 0, 0, size, size);
        const data = ctx.getImageData(0, 0, size, size).data;


        const gridSize = size + 1;
        const array = new Float32Array(gridSize * gridSize);
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const k = (y * size + x) * 4;
                const r = data[k + 0];
                const g = data[k + 1];
                const b = data[k + 2];
                array[y * gridSize + x] = (r * 256 * 256 + g * 256 + b) * 0.1 - 10000;
            }
        }
        for (let x = 0; x < gridSize - 1; x++) {
            array[gridSize * (gridSize - 1) + x] = array[gridSize * (gridSize - 2) + x];
        }
        for (let y = 0; y < gridSize; y++) {
            array[gridSize * y + gridSize - 1] = array[gridSize * y + gridSize - 2];
        }
        return new Terrain(array, size, bbox);
    }

    clip(bbox: number[], size: number) {
        const { bbox: bigBbox } = this;

        const bigWidth = bigBbox[2] - bigBbox[0];
        const bigHeight = bigBbox[3] - bigBbox[1];
        const left = (bbox[0] - bigBbox[0]) / bigWidth;
        const top = (bigBbox[3] - bbox[3]) / bigHeight;
        const x = Math.round(left * this.size);
        const y = Math.round(top * this.size);

        const gridSize = size + 1;
        const sourceGridSize = this.size + 1;
        const array = new Float32Array(gridSize * gridSize);
        for (let row = 0; row < gridSize; row++) {
            for (let col = 0; col < gridSize; col++) {
                array[row * gridSize + col] = this.array[(row + y) * sourceGridSize + (col + x)];
            }
        }
        return new Terrain(array, size, bbox);
    }

    computeBoundingBox() {
        const { bbox } = this;
        const { max, min } = this.getMaxMin();
        this.boundingBox = new Box3();
        this.boundingBox.min.set(bbox[0], bbox[1], min);
        this.boundingBox.max.set(bbox[2], bbox[3], max);
    }

    fixHeight(heightCorrection: HeightCorrection) {
        const { geometry, mode } = heightCorrection;
        if (!geometry) {
            return;
        }
        if (!geometry.boundingBox) {
            geometry.computeBoundingBox();
        }
        if (!this.boundingBox) {
            this.computeBoundingBox();
        }

        console.log(geometry.boundingBox, this.boundingBox);

        if (!geometry.boundingBox!.intersectsBox(this.boundingBox)) {
            return;
        }
        
        if (!geometry.boundsTree) {
            geometry.computeBoundsTree();
        }

        mesh.geometry = geometry;
        let fixFunction = noFix;
        switch (mode) {
            case HeightCorrectionMode.DOWN:
                raycaster.ray.direction.set(0, 0, -1);
                raycaster.ray.origin.setZ(1e8);
                fixFunction = downFix;
                break;
            case HeightCorrectionMode.UP:
                raycaster.ray.direction.set(0, 0, 1);
                raycaster.ray.origin.setZ(-1e8);
                fixFunction = upFix;
                break;
            case HeightCorrectionMode.MATCH:
                raycaster.ray.direction.set(0, 0, -1);
                raycaster.ray.origin.setZ(1e8);
                fixFunction = downFix;
                break;
        }
        const { array, size, bbox } = this;
        const gridSize = size + 1;
        const w = bbox[2] - bbox[0];
        const h = bbox[3] - bbox[1];
        for (let y = 0; y < gridSize; y++) {
            const lat = h * (gridSize - y) / gridSize + bbox[1];
            for (let x = 0; x < gridSize; x++) {
                const lon = w * x / gridSize + bbox[0];
                raycaster.ray.origin.setX(lon);
                raycaster.ray.origin.setY(lat);
                const res = raycaster.intersectObject(mesh, false)[0];
                if (res) {
                    const i = x * y;
                    array[i] = fixFunction(array[i], res.point.z);
                }
            }
        }
    }

    getMaxMin() {
        let max = -Infinity;
        let min = Infinity;

        this.array.forEach(z => {
            if (z > max) max = z;
            if (z < min) min = z;
        });

        return { max, min }
    }
}