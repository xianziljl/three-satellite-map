import { Camera, MOUSE, TOUCH } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

export class MapControls extends OrbitControls{
    constructor(object: Camera, domElement: HTMLElement) {
        super(object, domElement);
        this.screenSpacePanning = false; // pan orthogonal to world-space direction camera.up

        this.mouseButtons.LEFT = MOUSE.PAN;
        this.mouseButtons.RIGHT = MOUSE.ROTATE;
    
        this.touches.ONE = TOUCH.PAN;
        this.touches.TWO = TOUCH.DOLLY_ROTATE;

        this.maxPolarAngle = Math.PI / 2.5;
        this.enableDamping = true;
        this.dampingFactor = 0.08;
        this.screenSpacePanning = false;
        this.minDistance = 5;
        this.maxDistance = 1e8 / 4;
        this.autoRotateSpeed = -0.3;
        this.autoRotate = false;
        this.panSpeed = 2.5;
        this.zoomSpeed = 4;
    }

    public fixUpdate(): boolean {
        const changed = this.update();
        
        if (changed) {
            this.target.z = 1000;
        }

        return changed;
    }
}