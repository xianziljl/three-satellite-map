// import { FileLoader, Line3, Mesh, MeshStandardMaterial, Object3D, Plane, PlaneGeometry, PlaneHelper, Scene, Vector3 } from 'three';
// import { TerrainGeometry } from '../example/TerrainGeometry';
// import decode, { DECODING_STEPS } from '@here/quantized-mesh-decoder';
// import { bboxToTiles, tileToBBox } from 'tilebelt-wgs84';
// import { tileToBBOX } from '@mapbox/tilebelt';

// const mtl = new MeshStandardMaterial({ flatShading: false, wireframe: true });
// const plan = new Plane();
// const line = new Line3();
// const vec3 = new Vector3();
// const vertexMaxPos = 32767;

// function clip(data: QuantizedMeshData, fromTileNo: number[], toTileNo: number[]): QuantizedMeshData {
//     const from = tileToBBox(fromTileNo);
//     const to = tileToBBOX(toTileNo);
//     const fromWidth = from[2] - from[0];
//     // const fromHeight = from[3] - from[1];
//     const left = (to[0] - from[0]) / fromWidth * vertexMaxPos;
//     console.log('left:', left);
//     // const right = (to[2] - from[0]) / fromWidth * vertexMaxPos;
//     // const bottom = (to[1] - from[1]) / fromHeight * vertexMaxPos;
//     // const top = (to[3] - from[1]) / fromHeight * vertexMaxPos;

//     const { vertexData, triangleIndices } = data;

//     plan.setComponents(-1, 0, 0, left);

//     for (let i = 0; i < triangleIndices.length - 1; i++) {
//         const j = i + 1;
//         const sx = vertexData[i * 3];
//         const sy = vertexData[i * 3 + 1];
//         const sz = vertexData[i * 3 + 2];
//         const ex = vertexData[j * 3];
//         const ey = vertexData[j * 3 + 1];
//         const ez = vertexData[j * 3 + 2];
//         if (sx <= left || sy >= left) {
//             line.start.set(sx, sy, sz);
//             line.end.set(ex, ey, ez);
//             const point = plan.intersectLine(line, vec3);
//             if (point) {
//                 console.log(point);
//             }
//         }
        
//     }

//     return data;
// }

// export function clipTest() {
//     const url = `https://api.maptiler.com/tiles/terrain-quantized-mesh/0/0/0.terrain?key=L55MtSxL94Yb4hQeWewp`;

//     return new Promise<Object3D>((resolve, reject) => {
//         new FileLoader()
//         .setResponseType('arraybuffer') // tile-with-metadata-extension
//         .load(url, buffer => {
//             const obj = new Object3D();
//             const res = decode(buffer as ArrayBuffer, { maxDecodingStep: DECODING_STEPS.extensions }); // edgeIndices, extentions
            
//             clip(res, [0, 0, 0], [1, 0, 2]);
//             const planHelper = new PlaneHelper(plan, 100000);
//             obj.add(planHelper);

//             const geo = new TerrainGeometry(res);

//             const mesh = new Mesh(geo, mtl);
//             obj.add(mesh);

//             const geo1 = new PlaneGeometry();
//             console.log(geo1);
            
//             resolve(obj);
//         });
//     });
// }
