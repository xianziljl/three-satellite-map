import { BufferGeometry, DoubleSide, Mesh, MeshBasicMaterial, Raycaster, Vector3 } from 'three';
import { acceleratedRaycast, computeBoundsTree, disposeBoundsTree } from 'three-mesh-bvh';

BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;

export class ElevationFix {
    public static UP = 1;
    public static DOWN = 2;
    public static MATCH = 3;

    public mode: number;
    public geometry: BufferGeometry;

    private raycaster: Raycaster = new Raycaster();
    private rayOrigin = new Vector3();
    private mesh: Mesh;


    // private static RAY_UP = new Vector3(0, 0, 1);
    private static RAY_DOWN = new Vector3(0, -1, 0);
    private static MTL = new MeshBasicMaterial({ side: DoubleSide });

    constructor(geometry: BufferGeometry, mode: number) {
        this.mode = mode;
        this.geometry = geometry;
        this.geometry.computeBoundsTree();
        this.mesh = new Mesh(geometry, ElevationFix.MTL);
        this.mesh.raycast = acceleratedRaycast;
        this.raycaster.firstHitOnly = true;
    }

    public fix(x: number, y: number, z: number): number {
        const { raycaster, rayOrigin, mesh, mode } = this;
        rayOrigin.x = x;
        rayOrigin.y = 1e8;
        rayOrigin.z = z;

        raycaster.set(rayOrigin, ElevationFix.RAY_DOWN);
        const res = raycaster.intersectObject(mesh, false)[0];
        if (res) {
            if (mode === ElevationFix.DOWN) {
                return y > res.point.y ? res.point.y : y;
            }
            if (mode === ElevationFix.UP) {
                return y < res.point.y ? res.point.y : y;
            }
            if (mode === ElevationFix.MATCH) {
                return res.point.y;
            }
        }
        return y;
    }
}