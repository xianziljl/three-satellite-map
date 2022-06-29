import { AxesHelper, DirectionalLight, Fog, Vector3 } from 'three'
import { AmbientLight, PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import { MapControls } from 'three/examples/jsm/controls/OrbitControls';
import { Sky } from './src/Scene/Sky';
import { Satellite } from './src/Satellite/Satellite'


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
controls.maxPolarAngle = Math.PI / 2.5;
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.screenSpacePanning = false;
controls.minDistance = 5;
controls.maxDistance = 1e8 / 4;
controls.autoRotateSpeed = -0.3;
controls.autoRotate = false;
controls.panSpeed = 2.5;
controls.zoomSpeed = 4;

const tk = 'pk.eyJ1IjoiZG91YmliaWJpYmkiLCJhIjoiY2tiajQzYWQwMGxidDJycWluemE5bXB3dyJ9.sOQJSMtlL0xP27Dp6fvRyw';
const satellite = new Satellite({
    maxLevel: 18,
    minLevel: 6,
    zone: 50,
    start: { lat: 42.423176, lon: 113.889034 },
    end: { lat: 36.386768, lon: 124.314903 },
    offset: { x: 900000, y: 4300000 },
    satelliteResource: (level: number, x: number, y: number) => {
        return `https://api.mapbox.com/v4/mapbox.satellite/${level}/${x}/${y}.jpg70?access_token=${tk}`;
    },
    terrainResource: (level: number, x: number, y: number) => {
        return `https://api.mapbox.com/v4/mapbox.terrain-rgb/${level}/${x}/${y}.pngraw?access_token=${tk}`;
    },
    useWorker: true
});
satellite.debug = true;
scene.add(satellite);

window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
});

console.log(scene);


function animate() {
    requestAnimationFrame(animate);
    controls.update();
    fog.near = camera.position.z;
    fog.far = camera.position.z + 1000000;

    satellite.update(camera);
    renderer.render(scene, camera);
}
animate();



