import { Map, PlaneProvider, MapProvider, TerrainMeshProvider, UTM, MartiniTerrainProvider, HeightCrrectionPath, lonLatToUtm, coordUniqByXY } from '../src/index';
import { initScene } from './scene';
import points from './points.json';
import { BufferAttribute, DoubleSide, LineBasicMaterial, Mesh, MeshBasicMaterial, MeshNormalMaterial, MeshStandardMaterial, Side, Vector3 } from 'three';
import { BufferGeometry } from 'three';
import { Line } from 'three';
import { expandLine } from '../src/Utils/LineUtil';
import { MeshBVHVisualizer } from 'three-mesh-bvh';


const { scene, camera, loop, controls } = initScene();
camera.position.set(122748.55963198132,2601316.0009934525,3417.6739523374094);
controls.target.set(122916.14931300933, 2603745.730297569, 83.00993562901206);


const planProvider = new PlaneProvider();
planProvider.coordType = UTM;

const martiniProvider = new MartiniTerrainProvider();
martiniProvider.source = 'http://127.0.0.1:8080/tiles/[z]/[x]/[y]/terrain.png';
martiniProvider.coordType = UTM;
martiniProvider.computeVertexNormal = false;

const heightCorrection = new HeightCrrectionPath(coordUniqByXY(points), 0.1);
martiniProvider.heightCorrections = [heightCorrection];

const mapProvider = new MapProvider();
mapProvider.source = 'https://mts2.google.com/vt/lyrs=s&hl=zh-CN&x=[x]&y=[y]&z=[z]';
// mapProvider.showTileNo = true;
mapProvider.useWorker = true;

const meshProvider = new TerrainMeshProvider(martiniProvider, mapProvider);
// meshProvider.showBoundingBox = true;
// meshProvider.wireframe = true;
// meshProvider.flatShading = true;

const map = new Map();
map.provider = meshProvider;
map.bbox = [104.955976, 20.149765, 120.998419, 30.528687];
map.maxZoom = 18;
map.camera = camera;

scene.add(map);

console.log(map);


// ===== 

const pts = coordUniqByXY(points);
const pts1 = pts.map(pt => lonLatToUtm(pt[0], pt[1], 50));
const pts2 = pts.map(pt => [pt[0] * 100, pt[1] * 100, pt[2]]);
const mtl = new LineBasicMaterial({ color: 0xff00ff });

const geo = new BufferGeometry();
const position = new Float32Array(pts.length * 3);
pts2.forEach((pt, i) => {
    position[i * 3 + 0] = pt[0];
    position[i * 3 + 1] = pt[1];
    position[i * 3 + 2] = pt[2];
});
geo.setAttribute('position', new BufferAttribute(position, 3));
const offset = new Line(geo, mtl);
scene.add(offset);


loop.add(() => {
    map.update();
    const visibleTileCount = map.children.filter(x => x.visible).length;
    document.querySelector('#count')!.innerHTML = `${visibleTileCount}`;
});

loop.start();


