import { Camera, Frustum, Matrix4, Object3D, PerspectiveCamera, Raycaster, Vector3 } from 'three';
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

export class SatelliteMap extends Object3D {

    public debug = false;

    public cameraFrustum = new Frustum();
    private cameraMatrix4 = new Matrix4();

    public maxLevel: number = 20;
    public minLevel: number = 0;
    public start: LonLat;
    public end: LonLat;
    public zone: number;

    public satelliteResource: TileRerource;
    public terrainResource: TileRerource;
    public terrainMaxError: number;
    public terrainFixGeometrys?: TerrainFixGeometry[];

    public tiles: Tile[] = [];
    public loadQueue: Tile[] = [];

    private frame = 0;
    private raycaster = new Raycaster();
    private raycastOrigin = new Vector3();
    private raycastDirection = new Vector3(0, -1, 0);

    constructor(params: SatelliteParams) {
        super();

        this.maxLevel = params.maxLevel;
        this.minLevel = params.minLevel;
        this.zone = params.zone;
        this.start = params.start;
        this.end = params.end;
        this.satelliteResource = params.satelliteResource;
        this.terrainResource = params.terrainResource;
        this.terrainMaxError = params.terrainMaxError || 5;
        this.terrainFixGeometrys = params.terrainFixGeometrys;

        setTimeout(() => this.initTiles(), 50);
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
        if (this.frame == 10) {
            this.cameraMatrix4.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
            this.cameraFrustum.setFromProjectionMatrix(this.cameraMatrix4);
            this.tiles.forEach(tile => tile.update(camera));
            this.startLoadQueue(camera);
            this.frame = 0;
        }
        // 修正相机高度
        const visibleTiles = this.children.filter(child => child.visible);
        const { raycaster, raycastOrigin, raycastDirection } = this;
        raycastOrigin.set(camera.position.x, 100000, camera.position.z);
        raycaster.firstHitOnly = true;
        raycaster.set(raycastOrigin, raycastDirection);
        const res = raycaster.intersectObjects(visibleTiles, true)[0];
        if (res && camera.position.y < res.point.y + 5) {
            camera.position.y = res.point.y + 5;
        }
    }

    public startLoadQueue(camera: Camera) {
        if (this.loadQueue.length) {
            const ordered = this.loadQueue.sort((a, b) => {
                const distanceA = a.boundingBoxWorld?.distanceToPoint(camera.position) ?? Infinity;
                const distanceB = b.boundingBoxWorld?.distanceToPoint(camera.position) ?? Infinity;
                return distanceA - distanceB;
            });

            ordered.forEach(item => {
                item.loadGeometry();
                item.loadTexture();
            });
            this.loadQueue = [];
        }
    }

    public addToLoadQueue(tiles: Tile[]) {
        this.loadQueue.push(...tiles);
    }

    public removeFromLoadQueue(tile: Tile) {
        const { loadQueue } = this;
        const len = loadQueue.length;
        for (let i = 0; i < len; i++) {
            if (loadQueue[i] === tile) {
                loadQueue.splice(i, 1);
                break;
            }
        }
    }


    public dispose() {
        this.parent?.remove(this);
        Tile.pool.forEach(tile => tile.dispose());
        Tile.pool.length = 0;
        Tile.textureWorkerPool.dispose();
        Tile.geometryWorkerPool.dispose();
    }
}