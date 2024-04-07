import { AmbientLight, AxesHelper, DirectionalLight, DirectionalLightHelper, PerspectiveCamera, Scene, Vector3, WebGLRenderer } from 'three';
import { MapControls } from 'three/examples/jsm/controls/OrbitControls';
import Stats from 'three/examples/jsm/libs/stats.module';
import { Map, PlaneProvider, MapProvider, TerrainMeshProvider, UTM, MartiniTerrainProvider } from '../src/index';


const scene = new Scene();
const renderer = new WebGLRenderer({ logarithmicDepthBuffer: true, antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setClearColor(0x888888);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.debug = { checkShaderErrors: false };
document.body.appendChild(renderer.domElement);

const camera = new PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1e7 * 10);
camera.up = new Vector3(0, 0, 1);
// camera.position.set(92635, -1255615, 1255615);
// camera.lookAt(0, 0, 0);

camera.position.set(199968.43461198933, 2479805.6248926367, 1825.955617993283);
camera.lookAt(204951.28184243775,  2480346.714316563,-5.419012486480361e-14)

window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
});

const ambientLight = new AmbientLight(0xffffff, 0.1);
scene.add(ambientLight);

const directionalLight = new DirectionalLight(0xffffff, 1);
directionalLight.rotateX(30);
scene.add(directionalLight);
directionalLight.position.set(-1e4, -1e4, 1e5);
directionalLight.lookAt(0, 0, 0);

const lightHelper = new DirectionalLightHelper(directionalLight, 32767);
scene.add(lightHelper);

const axesHelper = new AxesHelper(1e6);
scene.add(axesHelper);

const controls = new MapControls(camera, renderer.domElement);
controls.position0.set(199968.43461198933, 2479805.6248926367, 1825.955617993283);
controls.target.set(204951.28184243775,  2480346.714316563,-5.419012486480361e-14)

const stats = new (Stats as any)();
document.body.appendChild(stats.dom);

// ====== shader test ======

// const box = createBox();
// scene.add(box);

// ====================================

const planProvider = new PlaneProvider();
planProvider.coordType = UTM;

const martiniProvider = new MartiniTerrainProvider();
// martiniProvider.source = 'https://api.maptiler.com/tiles/terrain-rgb-v2/[z]/[x]/[y].webp?key=L55MtSxL94Yb4hQeWewp';
martiniProvider.source = 'http://tile.writter.com.cn/tiles/[z]/[x]/[y]/terrain.webp';
martiniProvider.coordType = UTM;

const mapProvider = new MapProvider();
mapProvider.source = 'https://mts2.google.com/vt/lyrs=s&hl=zh-CN&x=[x]&y=[y]&z=[z]';
// mapProvider.source = 'https://gac-geo.googlecnapps.cn/maps/vt?lyrs=s&x=[x]&y=[y]&z=[z]';
mapProvider.showTileNo = false;
mapProvider.useWorker = true;

const meshProvider = new TerrainMeshProvider(martiniProvider, mapProvider);
meshProvider.showBoundingBox = false;
meshProvider.wireframe = false;
meshProvider.flatShading = false;

const map = new Map();
map.provider = meshProvider;

map.bbox = [104.955976, 20.149765, 120.998419, 30.528687];
map.maxZoom = 20;
map.camera = camera;
scene.add(map);

console.log(map);

function animate() {
    requestAnimationFrame(animate);

    controls.update();
    map.update();

    const far = Math.abs(camera.position.z) * 50;
    camera.far = far + 5000;
    camera.updateProjectionMatrix();

    const visibleTileCount = map.children.filter(x => x.visible).length;
    document.querySelector('#count')!.innerHTML = `${visibleTileCount}`;

    renderer.render(scene, camera);

    stats.update();
}

animate();