import { BufferGeometry, Vector3 } from 'three';
import { SerializedBVH } from 'three-mesh-bvh';

export interface Coordinate {
    x: number;
    y: number;
    z?: number;
}

export interface LonLat {
    lon: number,
    lat: number;
}

export interface AbortableFetch {
    abort: Function,
    ready: () => Promise<Response>;
}

export interface TextureWorkerReceiveMessage {
    type: string;
    uid: string;
    bitmap?: ImageBitmap;
}

export interface GeometryWorkerReceiveMessage {
    type: string;
    uid: string;
    positions: Float32Array;
    serializedBVH: SerializedBVH;
    uv: Float32Array;
    normal: Float32Array;
    center: Vector3;
}


export interface TextureWorkerPostMessage {
    id: number;
    uid: string;
    url?: string;
    canvas?: OffscreenCanvas;
    texts?: string[];
}

export interface GeometryWorkerPostMessage {
    init?: boolean;
    id: number;
    uid: string;
    level: number;
    row: number;
    col: number;
    zone: number;
    url?: string;
    maxError?: number,
    terrainFixGeometrys?: TerrainFixGeometry[];
}

export interface GLBWorkerPostMessage {
    init?: boolean;
    id: number;
    uid: string;
    url?: string;
    canvas?: OffscreenCanvas;
    texts?: string[];
    terrainFixGeometrys?: TerrainFixGeometry[];
    dracoPath?: string;
}

export interface GLBWorkerReceiveMessage extends GeometryWorkerReceiveMessage {
    bitmap?: ImageBitmap;
}


export interface TerrainFixGeometry {
    mode: number,
    geometry: BufferGeometry;
};

export type TileRerource = (level: number, x: number, y: number) => string;