import { MathUtils, Vector3 } from 'three';
import { Sky as SkyEffect } from 'three/examples/jsm/objects/Sky';
import { EARTH_PERIMETER } from '../utils/utils';

export class Sky extends SkyEffect {
    sun = new Vector3();
    private isNight = false;
    constructor() {
        super();
        this.scale.setScalar(EARTH_PERIMETER);
        this.update();
    }

    set night(night: boolean) {
        this.isNight = !!night;
        this.update();
    }
    get night() {
        return this.isNight;
    }

    update() {
        const { sun, isNight } = this;
        const uniforms = this.material.uniforms;
        uniforms['turbidity'].value = isNight ? 0 : 2.5;
        uniforms['rayleigh'].value = 0.1;
        uniforms['mieCoefficient'].value = isNight ? 0.002 : 0;
        uniforms['mieDirectionalG'].value = 0.7;
        const phi = MathUtils.degToRad(90 - (isNight ? 1 : 45));
        const theta = MathUtils.degToRad(180);

        sun.setFromSphericalCoords(1, phi, theta);
        uniforms['sunPosition'].value.copy(sun);
    }
}