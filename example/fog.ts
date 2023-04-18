import { ShaderChunk, ShaderLib } from 'three';

export function initFog() {

    ShaderChunk.fog_pars_vertex += `
#ifdef USE_FOG
  varying vec3 vWorldPosition;
#endif
`;

    ShaderChunk.fog_vertex += `
#ifdef USE_FOG
    vec4 wp = modelMatrix * vec4( transformed, 1.0 );
    vWorldPosition = wp.xyz;
#endif
`;

    // fragment shader
    ShaderChunk.fog_pars_fragment += `
#ifdef USE_FOG
  varying vec3 vWorldPosition;

  float fogHeight = 1000.0;
#endif
`;

    const FOG_APPLIED_LINE = 'gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );';
    ShaderChunk.fog_fragment = ShaderChunk.fog_fragment.replace(FOG_APPLIED_LINE, `
float fogFactor2 = smoothstep( fogHeight, -100.0, vWorldPosition.z );
float fogFactor3 = smoothstep( fogHeight, -100.0, cameraPosition.z );

fogFactor = fogFactor * max(fogFactor2, fogFactor3);

  ${FOG_APPLIED_LINE}
`);

    ShaderLib.sprite.vertexShader = ShaderLib.sprite.vertexShader.replace('#include <fog_vertex>', `
vec4 worldPosition = mvPosition;
#include <fog_vertex>
`);
}