import Stats from 'three/examples/jsm/libs/stats.module';
import { Scene, Fog, WebGLRenderer, PerspectiveCamera, Vector3, AmbientLight, DirectionalLightHelper, AxesHelper } from 'three';
import { DirectionalLight } from 'three';
import { MapControls } from 'three/examples/jsm/controls/OrbitControls';
import { initFog } from './fog';

export function initScene() {
    initFog();
    const scene = new Scene();
    // const fog = new FogExp2(0xffffff, 0.0005);
    const fog = new Fog(0xffffff, 0, 1e5);
    scene.fog = fog;
    const renderer = new WebGLRenderer({ logarithmicDepthBuffer: true, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0xffffff);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.debug = { checkShaderErrors: false };
    document.body.appendChild(renderer.domElement);

    const camera = new PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1e7 * 10);
    camera.up = new Vector3(0, 0, 1);
    camera.position.set(92635, -1255615, 1255615);
    camera.lookAt(0, 0, 0);

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

    const stats = new (Stats as any)();
    document.body.appendChild(stats.dom);

    const loop = new Loop();
    loop.add(() => {
        controls.update();

        const z = Math.abs(camera.position.z);
        const far = z * 20;
        fog.far = far + 2000;
        camera.far = far + 5000;
        camera.updateProjectionMatrix();

        renderer.render(scene, camera);

        stats.update();
    });

    return { scene, camera, controls, stats, renderer, fog, loop };
}

export class Loop {
    private _funcs = new Set<Function>();
    private _handle?: number;

    add(func: Function) {
        this._funcs.add(func);
    }

    remove(func: Function) {
        this._funcs.delete(func);
    }

    start() {
        if (!this._handle) {
            this._frame();
        }
    }

    stop() {
        if (this._handle) {
            cancelAnimationFrame(this._handle);
        }
        this._handle = undefined;
    }

    private _frame() {
        this._handle = requestAnimationFrame(this._frame.bind(this));
        this._funcs.forEach(fun => fun());
    }
}