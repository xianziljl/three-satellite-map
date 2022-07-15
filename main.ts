import { AxesHelper, DoubleSide, Fog, MathUtils, Mesh, MeshBasicMaterial, MOUSE, Shape, ShapeBufferGeometry, TOUCH, Vector3 } from 'three';
import { AmbientLight, PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { EARTH_PERIMETER, wgs84ToUTM } from './src/utils/utils';
import { TerrainFixMode } from './src/utils/interfaces';
import { MapControls } from 'three/examples/jsm/controls/OrbitControls';
import { Sky } from 'three/examples/jsm/objects/Sky';
import { SatelliteMap, Tile } from './src';
import Stats from 'three/examples/jsm/libs/stats.module';


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
// camera.up = new Vector3(0, 0, 1);
camera.position.set(0, 100000, 0);
camera.lookAt(0, 0, 0);

const sky = new Sky();
sky.scale.setScalar(EARTH_PERIMETER);
const uniforms = sky.material.uniforms;
uniforms['turbidity'].value = 2.5;
uniforms['rayleigh'].value = 0.1;
uniforms['mieCoefficient'].value = 0;
uniforms['mieDirectionalG'].value = 0.7;
const phi = MathUtils.degToRad(90 - 45);
const theta = MathUtils.degToRad(180);
const sun = new Vector3();
sun.setFromSphericalCoords(1, phi, theta);
uniforms['sunPosition'].value.copy(sun);
scene.add(sky);

const helper = new AxesHelper(100000);
scene.add(helper);

const ambientLight = new AmbientLight(0xffffff, 1);
scene.add(ambientLight);

const controls = new MapControls(camera, renderer.domElement);
controls.screenSpacePanning = false; // pan orthogonal to world-space direction camera.up
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
controls.target.y = 40;



const offset = { x: 671037.0, y: 4524163 };



const loader = new GLTFLoader();
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('/node_modules/three/examples/js/libs/draco/');
loader.setDRACOLoader(dracoLoader);
loader.load('/assets/models/010533.glb', gltf => {
    console.log(gltf);
    gltf.scene.position.set(553653.64 - offset.x, 4397931.07 - offset.y, 40);
    scene.add(gltf.scene);
});


const coordstr = '119.3385985569207,39.93522579805809,36.23722945228651 119.3260119085474,39.93866697252108,31.87691304037352 119.3121051224768,39.94011072737953,31.82216013722081 119.299038977351,39.9404458693225,31.76740723406811 119.283695899277,39.93598884778232,39.97847334318979 119.2754311419883,39.93739134732669,48.18953945231147 119.2453336152624,39.93578373408167,51.41228201337539 119.2132572693247,39.93091349746097,27.12136597548084 119.1810475752417,39.932474105076,36.21108183680976 119.1487930244357,39.93077764975453,42.93228621393104 119.1101733028117,39.92172386387582,55.30009296993876 119.0957366330708,39.92136540422656,91.7452267800564 119.0867832382917,39.92252118543954,112.4653069532385 119.0681687197856,39.92804184730585,95.09187612382755 119.0410074895235,39.92550227927299,104.1135450361441 119.0444095759407,39.91382866112369,95.27796220238379 119.0806651050364,39.91514876592091,106.3243806968481 119.1109663697694,39.91583269200402,58.9646098407469 119.1554443909982,39.92111682629659,43.78738725569823 119.1844720862653,39.92071258144577,32.87775536165204 119.1993603966269,39.920385373291,29.60683484721229 119.2128329011683,39.91543395829982,26.33591433277254 119.2341076242848,39.91717040930091,41.1267869125548 119.2609816748908,39.9258382651954,61.65303416196316 119.2836410809224,39.93191269936527,111.0877641273235 119.302723355011,39.93290310185468,29.30963794471722 119.3185821360079,39.92912190620866,38.91349418512119 119.3197057210766,39.92174136322921,43.71542230532317 119.3548489355517,39.90483828141467,44.91590433537367 119.3682340891064,39.8895929345187,45.2160248428863 119.3786094510541,39.89098226392121,45.36608509664261 119.3732103377954,39.90518127113507,45.51614535039892 119.3535761767253,39.91580994705765,45.81626585791155 119.3420975232876,39.92124824643993,46.11638636542417 119.3405292015563,39.92783898099376,48.51735042552516 119.3385985569207,39.93522579805809,36.23722945228651';
const coords = coordstr.split(' ').map(item => {
    const arr = item.split(',').map(n => parseFloat(n));
    return wgs84ToUTM({ x: arr[0], y: arr[1] }, 50, offset);
});
const shape = new Shape();
shape.moveTo(coords[0].x, coords[0].y);
for (let i = 1; i < coords.length; i++) {
    shape.lineTo(coords[i].x, coords[i].y);
}
shape.lineTo(coords[0].x, coords[0].y);
const shapeGeometry = new ShapeBufferGeometry(shape);
shapeGeometry.rotateX(-Math.PI / 2);
shapeGeometry.translate(0, 38, 0);

// const shapeMesh = new Mesh(shapeGeometry, new MeshBasicMaterial({ color: 0xff0000 }));

// scene.add(shapeMesh)


// const tk = 'pk.eyJ1IjoiZG91YmliaWJpYmkiLCJhIjoiY2tiajQzYWQwMGxidDJycWluemE5bXB3dyJ9.sOQJSMtlL0xP27Dp6fvRyw';
const tk = 'pk.eyJ1IjoiZG91YmliaWJpYmkiLCJhIjoiY2w1MTJndGgyMDFsMjNqcWkyeDFwNHBqdSJ9.8yY8jQ5yT4HFCWcC6Mf7WQ';
const satelliteMap = new SatelliteMap({
    maxLevel: 18,
    minLevel: 6,
    zone: 50,
    start: { lat: 42.423176, lon: 113.889034 },
    end: { lat: 36.386768, lon: 124.314903 },
    offset,
    terrainFixGeometrys: [{
        geometry: shapeGeometry.clone(),
        mode: TerrainFixMode.MATCH
    }],
    satelliteResource: (level: number, x: number, y: number) => {
        // return `https://api.mapbox.com/v4/mapbox.satellite/${level}/${x}/${y}.jpg70?access_token=${tk}`;
        return `https://mts1.google.com/vt/lyrs=s&hl=zh-CN&x=${x}&y=${y}&z=${level}`;
    },
    terrainResource: (level: number, x: number, y: number) => {
        return `https://api.mapbox.com/v4/mapbox.terrain-rgb/${level}/${x}/${y}.pngraw?access_token=${tk}`;
    },
});

scene.add(satelliteMap);



const stats = new (Stats as any)();
document.body.appendChild(stats.dom);


window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
});

console.log(scene);




const verticesEl = document.getElementById('vertices');
const geometriesEl = document.getElementById('geometries');
const texturesEl = document.getElementById('textures');
const drawcallsEl = document.getElementById('drawcalls');

function animate() {
    requestAnimationFrame(animate);

    controls.update();

    satelliteMap.update(camera);
    const far = camera.position.y * 50;
    camera.far = far + 5000;
    camera.updateProjectionMatrix();

    fog.far = far;

    renderer.render(scene, camera);

    const vertices = satelliteMap.children.reduce((sum, cur) => {
        const tile = cur as Tile;
        if (tile.visible) {
            sum += tile.geometry.attributes.position.count;
        }
        return sum;
    }, 0);
    if (verticesEl) verticesEl.innerText = vertices.toLocaleString();
    if (geometriesEl) geometriesEl.innerText = renderer.info.memory.geometries.toLocaleString();
    if (texturesEl) texturesEl.innerText = renderer.info.memory.textures.toLocaleString();
    if (drawcallsEl) drawcallsEl.innerText = renderer.info.render.calls.toLocaleString();

    stats.update();
}
animate();



