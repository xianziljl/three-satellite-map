import { AxesHelper, BufferGeometry, CatmullRomCurve3, FileLoader, Float32BufferAttribute, Fog, Line, LineBasicMaterial, MathUtils, CircleGeometry, Vector3 } from 'three';
import { AmbientLight, PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils';
import { EARTH_PERIMETER, getUpAxis, wgs84ToUTM } from './utils/utils';
import { MapControls } from 'three/examples/jsm/controls/OrbitControls';
import { Sky } from 'three/examples/jsm/objects/Sky';
import { SatelliteMap, Tile, ElevationFix } from './index';
import Stats from 'three/examples/jsm/libs/stats.module';



// const offset = { x: 671037.0, y: 4524163 };
// const offset = { x: 135305, y: 2604889 };
const zone = 50;
const scene = new Scene();
// scene.position.set(-offset.x, 0, offset.y);
const fog = new Fog(0x6caeff, 0, Infinity);
scene.fog = fog;

const renderer = new WebGLRenderer({
    logarithmicDepthBuffer: true, // 场景尺寸比例较大且有面重合的情况下需要打开
    antialias: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
// renderer.setPixelRatio(window.devicePixelRatio);
// @ts-ignore
renderer.debug = false;
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

let map: SatelliteMap;
new FileLoader().load("/points.json", (data) => {
    let points = JSON.parse(data as string);
    points = points.map((item: number[]) => {
        const coord = wgs84ToUTM({ x: item[0], y: item[1] }, zone);
        return new Vector3(coord.x, item[2], -coord.y);
    });
    const curve = new CatmullRomCurve3(points);
    const geo = new BufferGeometry();
    const pts = curve.getPoints(1000);
    const geos: BufferGeometry[] = [];
    pts.forEach(item => {
        const g = new CircleGeometry(150);
        g.rotateX(-Math.PI / 2);
        g.translate(item.x, item.y - 5, item.z);
        geos.push(g);
    });
    const geo1 = BufferGeometryUtils.mergeBufferGeometries(geos);
    console.log(geo1);
    const pts1: number[] = [];
    pts.forEach(item => {
        pts1.push(item.x, item.y, item.z);
    });
    geo.setAttribute("position", new Float32BufferAttribute(pts1, 3));
    const lineMaterial = new LineBasicMaterial({ color: 0xffff00, linewidth: 10 });
    const line = new Line(geo, lineMaterial);
    scene.add(line);
    // const mesh = new Mesh(geo1, new MeshBasicMaterial());
    // scene.add(mesh)
    const tk = 'pk.eyJ1IjoiZG91YmliaWJpYmkiLCJhIjoiY2w1MTJndGgyMDFsMjNqcWkyeDFwNHBqdSJ9.8yY8jQ5yT4HFCWcC6Mf7WQ';
    map = new SatelliteMap({
        maxLevel: 20,
        minLevel: 3,
        zone,
        start: { lat: 24.954264, lon: 112.203702 },
        end: { lat: 22.438170, lon: 115.010784 },
        // terrainFixGeometrys: [{
        //     geometry: geo1.clone(),
        //     mode: ElevationFix.DOWN
        // }],
        satelliteResource: (level, x, y) => {
            // return `http://localhost:3001/${level}/${x}/${y}/0`
            const cdn = 'mts' + x % 4;
            return `https://${cdn}.google.com/vt/lyrs=s&hl=zh-CN&x=${x}&y=${y}&z=${level}`;
        },
        terrainResource: (level, x, y) => {
            // return `http://localhost:3001/${level}/${x}/${y}/1`
            return `https://api.mapbox.com/v4/mapbox.terrain-rgb/${level}/${x}/${y}.pngraw?access_token=${tk}`;
        },
        // dracoPath: '/draco/',
        // glbResourse: (level: number, x: number, y: number) => {
        //     return `http://172.26.6.121:5501/tiles/${level}/${x}/${y}/tile.glb`;
        // }
    });
    // map.debug = true;
    map.visible = true;
    // map.position.set(-offset.x, 0, offset.y);
    scene.add(map);
});



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

const cameraUpAxis = getUpAxis(camera.up);

function animate() {
    requestAnimationFrame(animate);

    controls.update();

    if (!map) return;

    map.update(camera);
    const far = camera.position[cameraUpAxis] * 50;
    camera.far = far + 5000;
    camera.updateProjectionMatrix();

    // const { raycastOrigin, raycastDirection, raycaster } = SatelliteMap;
    // const upAxis = getUpAxis(camera.up);
    // raycastOrigin.copy(camera.position);
    // raycastOrigin[upAxis] = 100000;
    // camera.getWorldDirection(raycastDirection);
    // raycaster.set(raycastOrigin, raycastDirection); 
    // const res = raycaster.intersectObjects(map.children.filter(child => child.visible), true)[0];
    // if (res) {
    //     controls.target[upAxis] = res.point[upAxis];
    // }

    fog.far = far;

    renderer.render(scene, camera);

    const vertices = map.children.reduce((sum, cur) => {
        const tile = cur as Tile;
        if (tile.visible && tile.geometry.attributes.position) {
            sum += tile.geometry.attributes.position.count;
        }
        return sum;
    }, 0);
    if (verticesEl) verticesEl.innerText = vertices.toLocaleString();
    // renderer.info.memory.geometries.toLocaleString();
    if (geometriesEl) {
        const visibleCount = map.children.filter(item => item.visible).length;
        const totalCount = map.children.length;
        geometriesEl.innerText = visibleCount + " / " + totalCount;
    }
    if (texturesEl) texturesEl.innerText = renderer.info.memory.textures.toLocaleString();
    if (drawcallsEl) drawcallsEl.innerText = renderer.info.render.calls.toLocaleString();

    stats.update();
}
animate();



