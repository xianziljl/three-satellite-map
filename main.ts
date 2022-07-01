import { AxesHelper, Fog, Vector3 } from 'three';
import { AmbientLight, PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { MapControls } from './src/Controls/MapContorls';
import { Satellite } from './src/map';
import { Sky } from './src/Scene/Sky';


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
        // return `https://api.mapbox.com/v4/mapbox.satellite/${level}/${x}/${y}.jpg70?access_token=${tk}`;
        return `https://mts1.google.com/vt/lyrs=s&hl=zh-CN&x=${x}&y=${y}&z=${level}`;
    },
    terrainResource: (level: number, x: number, y: number) => {
        return `https://api.mapbox.com/v4/mapbox.terrain-rgb/${level}/${x}/${y}.pngraw?access_token=${tk}`;
    }
});
// satellite.debug = true;
scene.add(satellite);

const loader = new GLTFLoader();
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('/node_modules/three/examples/js/libs/draco/');
loader.setDRACOLoader(dracoLoader);
loader.load('/assets/models/010533.glb', gltf => {
    console.log(gltf);
    gltf.scene.position.set(553653.64 - offset.x, 4397931.07 - offset.y, 10);
    scene.add(gltf.scene);
});


window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
});

console.log(scene);


function animate() {
    requestAnimationFrame(animate);

    controls.update();

    satellite.update(camera);
    camera.far = camera.position.z * 100 + 10000;
    camera.updateProjectionMatrix();

    fog.far = camera.far;

    renderer.render(scene, camera);
}
animate();



