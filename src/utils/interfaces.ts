
export interface Coordinate {
    x: number,
    y: number,
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
    uid: string,
    positions: Float32Array;
    triangles: Uint32Array,
    uv: Float32Array;
};


export interface TextureWorkerPostMessage {
    id: number,
    uid: string,
    url?: string,
    canvas?: OffscreenCanvas,
    texts?: string[];
};
export interface GeometryWorkerPostMessage {
    id: number,
    uid: string,
    level: number,
    minLevel: number,
    maxLevel: number,
    row: number,
    col: number,
    zone: number,
    offset: Coordinate,
    url?: string,
}
