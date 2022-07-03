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
    uid: string;
}

export interface GeometryWorkerReceiveMessage {
    uid: string;
    positions: Float32Array;
    triangles: Uint32Array;
    serializedBVH: SerializedBVH;
    uv: Float32Array;
    normal: Float32Array;
}


export interface TextureWorkerPostMessage {
    id: number;
    uid: string;
    url?: string;
    canvas?: OffscreenCanvas;
    texts?: string[];
}

export interface GeometryWorkerPostMessage {
    id: number;
    uid: string;
    level: number;
    maxError: number;
    row: number;
    col: number;
    zone: number;
    offset: Coordinate;
    url?: string;
}
