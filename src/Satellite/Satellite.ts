import { Frustum, Matrix4, Object3D, PerspectiveCamera } from 'three';
import { LonLat, Coordinate } from '../utils/interfaces'
import { latToTile, lonToTile } from '../utils/utils';
import { Tile } from './Tile';

type TileRerource = (level: number, x: number, y: number) => string;

export interface SatelliteParams {
    start: LonLat,
    end: LonLat,
    zone: number,
    maxLevel: number,
    minLevel: number
    satelliteResource: TileRerource,
    terrainResource: TileRerource,
    offset?: Coordinate;
    useWorker?: boolean;
}

export class Satellite extends Object3D {

    public debug = false;
    public useWorker = false;

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

    public tiles: Tile[] = [];

    public frame = 0;

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
        this.useWorker = !!params.useWorker;

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
                tile.loadTextureInWorker();
                tile.loadGeometryInWorker();

                this.tiles.push(tile);
                this.add(tile);
            }
        }
    }

    public update(camera: PerspectiveCamera) {
        if (!this.visible) return;
        this.frame++;
        if (this.frame % 30 == 0) {
            this.cameraMatrix4.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
            this.cameraFrustum.setFromProjectionMatrix(this.cameraMatrix4);
            this.tiles.forEach(tile => tile.update(camera));
        }
    }
}