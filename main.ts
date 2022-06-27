import { AxesHelper, Color, Fog, FogExp2, MeshBasicMaterial, PlaneBufferGeometry, PlaneGeometry, Vector3 } from 'three'
import { AmbientLight, Mesh, MeshLambertMaterial, PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import { MapControls } from 'three/examples/jsm/controls/OrbitControls';
import { EARTH_PERIMETER } from './src/utils/utils'
import { Sky } from './src/Scene/Sky';
import { Satellite } from './src/Satellite/Satellite'
import { Tile } from './src/Satellite/Tile';
import { Feature } from 'geojson'


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

const mapView = new Satellite({
    maxLevel: 18,
    minLevel: 6,
    zone: 50,
    start: { lat: 42.423176, lon: 113.889034 },
    end: { lat: 36.386768, lon: 124.314903 },
    offset: { x: 900000, y: 4300000 },
    satelliteResource: (level: number, x: number, y: number) => {
        const tk = 'pk.eyJ1IjoiZG91YmliaWJpYmkiLCJhIjoiY2tiajQzYWQwMGxidDJycWluemE5bXB3dyJ9.sOQJSMtlL0xP27Dp6fvRyw';
        return `https://api.mapbox.com/v4/mapbox.satellite/${level}/${x}/${y}.jpg70?access_token=${tk}`;
    },
    terrainResource: (level: number, x: number, y: number) => {
        const tk = 'pk.eyJ1IjoiZG91YmliaWJpYmkiLCJhIjoiY2tiajQzYWQwMGxidDJycWluemE5bXB3dyJ9.sOQJSMtlL0xP27Dp6fvRyw';
        return `https://api.mapbox.com/v4/mapbox.satellite/${level}/${x}/${y}.jpg70?access_token=${tk}`;
    },
    useWorker: true
});
// mapView.debug = true;
scene.add(mapView);

window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
});

console.log(scene);


function animate() {
    requestAnimationFrame(animate);
    controls.update();
    fog.near = -camera.position.z * 10;
    // console.log(fog.near)
    fog.far = camera.position.z * 50 + 10000;

    mapView.update(camera);
    renderer.render(scene, camera);
}
animate();



