/// <reference types="vite/client" />

type QuantizedMeshHeader = {
    boundingSphereCenterX: number;
    boundingSphereCenterY: number;
    boundingSphereCenterZ: number;
    centerX: number;
    centerY: number;
    centerZ: number;
    horizonOcclusionPointX: number;
    horizonOcclusionPointY: number;
    horizonOcclusionPointZ: number;
    maxHeight: number;
    minHeight: number;
};

type QuantizedMeshExtensions = {
    metadata: {
        geometricerror: number;
        surfacearea: number;
    };
    vertexNormals: Uint8Array;
    waterMask: ArrayBuffer;
};

type QuantizedMeshData = {
    header: QuantizedMeshHeader,
    vertexData: Uint16Array;
    triangleIndices: Uint16Array;
    northIndices: Uint16Array;
    eastIndices: Uint16Array;
    southIndices: Uint16Array;
    westIndices: Uint16Array;
    extensions?: QuantizedMeshExtensions;
};


module '@here/quantized-mesh-decoder' {
    export const DECODING_STEPS: {
        header: number;
        vertices: number;
        triangleIndices: number;
        edgeIndices: number;
        extensions: number;
    };

    export default function decode(buffer: ArrayBuffer, { maxDecodingStep: number }): QuantizedMeshData;
}

module 'extrude-polyline' {
    interface strokeOption {
        // thickness the line thickness
        thickness?: number,
        // join the join type, can be 'miter' or 'bevel' - default 'miter'
        cap?: string,
        // cap the cap type, can be 'butt' or 'square' - defalut 'butt'
        join?: string,
        // miterLimit the limit before miters turn into bevels; default 10
        miterLimit?: number,
    }

    type Stroke = {
        build: (points: number[][]) => BuildResult;
    }

    type BuildResult = {
        positions: number[][];
        cells: number[][],
    };

    export default function stroke(option: strokeOption): Stroke;
}

// https://github.com/mapbox/tilebelt/blob/master/index.js
// declare module '@mapbox/tilebelt' {
//     export function tileToBBOX(tile: number[]): number[];
//     export function tileToGeoJSON(tile: number[]): any;
//     export function getChildren(tile: number[]): number[][];
//     export function getParent(tile: number[]): number[];
//     export function getSiblings(tile: number[]): number[][];
//     export function hasTile(tiles: number[][], tile: number[]): boolean;
//     export function hasSiblings(tile: number[], tiles: number[][]): boolean;
//     export function tilesEqual(tile1: number[], tile2: number[]): boolean;
//     export function tileToQuadkey(tile: number[]): string;
//     export function quadkeyToTile(quadkey: string): number[];
//     export function pointToTile(lon: number, lat: number, z: number): number[];
//     export function bboxToTile(bboxCoords: number[]): number[];
//     export function pointToTileFraction(lon: number, lat: number, z: number): number[];
// }