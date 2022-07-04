import { AxesHelper, Fog, Shape, Vector3 } from 'three';
import { AmbientLight, PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { MapControls } from './src/Controls/MapContorls';
import { Satellite } from './src/map';
import { Sky } from './src/Scene/Sky';
import Stats from 'three/examples/jsm/libs/stats.module';
import { Tile } from './src/map/Satellite/Tile';
import { wgs84ToUTM } from './src/utils/utils';


const scene = new Scene();
const fog = new Fog(0x6caeff, 0, Infinity);
scene.fog = fog;
// scene.background = new Color(0x54b7ff);
// scene.rota
const renderer = new WebGLRenderer({
    logarithmicDepthBuffer: true, // 场景尺寸比例较大且有面重合的情况下需要打开
    antialias: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const camera = new PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1e7);
camera.up = new Vector3(0, 0, 1);
camera.position.set(0, 0, 100000);
camera.lookAt(0, 0, 0);

const sky = new Sky();
scene.add(sky);

const helper = new AxesHelper(100000);
scene.add(helper);

const ambientLight = new AmbientLight(0xffffff, 1);
scene.add(ambientLight);

const controls = new MapControls(camera, renderer.domElement);
controls.target.z = 30;

const tk = 'pk.eyJ1IjoiZG91YmliaWJpYmkiLCJhIjoiY2tiajQzYWQwMGxidDJycWluemE5bXB3dyJ9.sOQJSMtlL0xP27Dp6fvRyw';
// const tk = 'pk.eyJ1IjoiZG91YmliaWJpYmkiLCJhIjoiY2w1MTJndGgyMDFsMjNqcWkyeDFwNHBqdSJ9.8yY8jQ5yT4HFCWcC6Mf7WQ';

const offset = { x: 671037.0, y: 4524163 };
const satellite = new Satellite({
    maxLevel: 18,
    minLevel: 6,
    zone: 50,
    start: { lat: 42.423176, lon: 113.889034 },
    end: { lat: 36.386768, lon: 124.314903 },
    offset,
    satelliteResource: (level: number, x: number, y: number) => {
        return `https://api.mapbox.com/v4/mapbox.satellite/${level}/${x}/${y}.jpg70?access_token=${tk}`;
        // return `https://mts1.google.com/vt/lyrs=s&hl=zh-CN&x=${x}&y=${y}&z=${level}`;
    },
    terrainResource: (level: number, x: number, y: number) => {
        return `https://api.mapbox.com/v4/mapbox.terrain-rgb/${level}/${x}/${y}.pngraw?access_token=${tk}`;
    }
});
// satellite.debug = true;
scene.add(satellite);

// const loader = new GLTFLoader();
// const dracoLoader = new DRACOLoader();
// dracoLoader.setDecoderPath('/node_modules/three/examples/js/libs/draco/');
// loader.setDRACOLoader(dracoLoader);
// loader.load('/assets/models/010533.glb', gltf => {
//     console.log(gltf);
//     gltf.scene.position.set(553653.64 - offset.x, 4397931.07 - offset.y, 40);
//     scene.add(gltf.scene);
// });

const stats = new (Stats as any)();
document.body.appendChild(stats.dom);


window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
});

console.log(scene);

const coords = [
    [40.580606, 118.708785],
    [40.551213, 118.921512],
    [40.438225, 118.711173],
    [40.425961, 118.941934]
].map(item => wgs84ToUTM({ x: item[1], y: item[0] }, 50, offset));
const shape = new Shape();
shape.moveTo(coords[0].x, coords[0].y);
for (let i = 1; i < coords.length; i++) {
    shape.lineTo(coords[i].x, coords[i].y);
}
shape.lineTo(coords[0].x, coords[0].y);



const verticesEl = document.getElementById('vertices');
const geometriesEl = document.getElementById('geometries');
const texturesEl = document.getElementById('textures');
const drawcallsEl = document.getElementById('drawcalls');

function animate() {
    requestAnimationFrame(animate);

    controls.update();

    satellite.update(camera);
    camera.far = camera.position.z * 50
    camera.updateProjectionMatrix();

    fog.far = camera.far * 0.9;

    renderer.render(scene, camera);

    const vertices = satellite.children.reduce((sum, cur) => {
        const tile = cur as Tile;
        if (tile.visible) {
            sum += tile.geometry.attributes.position.count;
        }
        return sum;
    }, 0)
    if (verticesEl) verticesEl.innerText = vertices.toLocaleString();
    if (geometriesEl) geometriesEl.innerText = renderer.info.memory.geometries.toLocaleString();
    if (texturesEl) texturesEl.innerText = renderer.info.memory.textures.toLocaleString();
    if (drawcallsEl) drawcallsEl.innerText = renderer.info.render.calls.toLocaleString();

    stats.update();
}
animate();



