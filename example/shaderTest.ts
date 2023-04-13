import { BoxGeometry, Mesh, MeshStandardMaterial, Shader } from 'three';

const mtl1 = new MeshStandardMaterial({ wireframe: false });
mtl1.onBeforeCompile = (shader: Shader) => {
    shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `
            #include <common>
            uniform float elevation;
        `)
        .replace('#include <begin_vertex>', `
            vec3 transformed = vec3(position);
            transformed.z *= elevation;
        `);
    shader.uniforms.elevation = window['ele'] = { value: 0.5 };
    mtl1.userData.shader = shader;
};
window['mtl'] = mtl1;

const geo = new BoxGeometry(1e5, 1e5, 1e5, 10, 10, 10);

geo.computeBoundingBox();
console.log(geo.boundingBox?.max.clone(), geo.boundingBox?.min.clone());
geo.translate(1000, 0, 0);
geo.computeBoundingBox();
console.log(geo.boundingBox?.max.clone(), geo.boundingBox?.min.clone());

export function createBox() {
    return new Mesh(geo, mtl1);
}