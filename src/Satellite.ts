import { BufferGeometry, Frustum, Matrix4, Object3D, PerspectiveCamera, Raycaster, Vector3 } from 'three';
import { LonLat, Coordinate, TerrainFixGeometry, TileRerource } from './utils/interfaces';
import { latToTile, lonToTile } from './utils/utils';
import { Tile } from './Tile';



export interface SatelliteParams {
    start: LonLat,
    end: LonLat,
    zone: number,
    maxLevel: number,
    minLevel: number;
    satelliteResource: TileRerource,
    terrainResource: TileRerource,
    offset?: Coordinate;
    terrainMaxError?: number;
    terrainFixGeometrys?: TerrainFixGeometry[];
}

export class Satellite extends Object3D {

    public debug = false;

    public cameraFrustum = new Frustum();
    private cameraMatrix4 = new Matrix4();

    public maxLevel: number = 20;
    public minLevel: number = 0;
    public start: LonLat;
    public end: LonLat;
    public zone: number;
    public offset: Coordinate;

    public satelliteResource: TileRerource;
    public terrainResource: TileRerource;
    public terrainMaxError: number;
    terrainFixGeometrys?: TerrainFixGeometry[];

    // public 

    public tiles: Tile[] = [];

    public frame = 0;

    private raycaster = new Raycaster();
    private raycastOrigin = new Vector3();
    private raycastDirection = new Vector3(0, 0, -1);

    constructor(params: SatelliteParams) {
        super();

        this.maxLevel = params.maxLevel;
        this.minLevel = params.minLevel;
        this.zone = params.zone;
        this.start = params.start;
        this.end = params.end;
        this.offset = params.offset ?? { x: 0, y: 0 };
        this.satelliteResource = params.satelliteResource;
        this.terrainResource = params.terrainResource;
        this.terrainMaxError = params.terrainMaxError || 10;
        this.terrainFixGeometrys = params.terrainFixGeometrys;
        this.matrixAutoUpdate = false;

        setTimeout(() => this.initTiles(), 20);
    }

    private initTiles(): void {
        const { start, end, minLevel } = this;
        const startRow = latToTile(start.lat, minLevel);
        const startCol = lonToTile(start.lon, minLevel);
        const endRow = latToTile(end.lat, minLevel);
        const endCol = lonToTile(end.lon, minLevel);

        if (endRow < startRow || endCol < startCol) {
            console.error("End point must be greater than start point.");
            return;
        }

        for (let row = startRow; row <= endRow; row++) {
            for (let col = startCol; col <= endCol; col++) {
                const tile = Tile.getInstance(this);

                tile.init(minLevel, col, row, null);
                tile.loadTexture();
                tile.loadGeometry();

                this.tiles.push(tile);
                this.add(tile);
            }
        }
    }

    public update(camera: PerspectiveCamera) {
        if (!this.visible) return;
        this.frame++;
        if (this.frame % 10 === 0) {
            this.cameraMatrix4.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
            this.cameraFrustum.setFromProjectionMatrix(this.cameraMatrix4);
            this.tiles.forEach(tile => tile.update(camera));
        }
        // 修正相机高度
        const visibleTiles = this.children.filter(child => child.visible);
        const { raycaster, raycastOrigin, raycastDirection } = this;
        raycastOrigin.set(camera.position.x, camera.position.y, 100000);
        raycaster.firstHitOnly = true;
        raycaster.set(raycastOrigin, raycastDirection);
        const res = raycaster.intersectObjects(visibleTiles, true)[0];
        if (res && camera.position.z < res.point.z + 5) {
            camera.position.z = res.point.z + 5;
        }
    }
}