import { Object3D, PerspectiveCamera, Scene } from 'three';
import { MapControls } from 'three/examples/jsm/controls/OrbitControls';
import { Sky } from './Sky'

export class MapScene extends Scene {
    public controls: MapControls;
    public sky: Sky;

    constructor() {
        super();

        this.rotateX(-Math.PI / 2);

        const sky = new Sky();
        this.sky = sky;
    }
}