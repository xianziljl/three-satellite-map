import { Camera, CanvasTexture, Mesh, MeshBasicMaterial, PlaneBufferGeometry, Vector3 } from 'three';
import { AbortableFetch, GeometryWorkerPostMessage, GeometryWorkerReceiveMessage, LonLat, TextureWorkerPostMessage, TextureWorkerReceiveMessage } from '../utils/interfaces'
import { Satellite } from './Satellite';


export class Tile extends Mesh {
    public static VECTOR3 = new Vector3();
    // 对象池
    public static pool: Tile[] = [];
    // just worker
    public static textureWorker: Worker;
    // 生成网格的 worker
    public static geometryWorker: Worker;
    // 本次被使用是产生的id
    public uid: string;
    // 材质
    public material: MeshBasicMaterial;
    // 纹理
    public texture: CanvasTexture;
    // 用作纹理的画布
    public canvas: HTMLCanvasElement;
    // Satellite 实例
    public map: Satellite;
    // 是否正在使用，用于回收此对象，避免频繁GC
    public isUsing: boolean = false;
    // 父瓦块
    public parentTile: Tile | null;
    // 子瓦块
    public childrenTiles: Tile[] = [];
    // 此瓦块贴图是否就绪
    public isTextureReady = false;
    // 网格是否就绪
    public isGeometryReady = false;
    // 此瓦块被使用的次数
    public version = 0;
    // 当前瓦块层级
    public level: number;
    // 当前瓦块行
    public row: number;
    // 当前瓦块列
    public col: number;
    // 瓦块左上角经纬度坐标
    public topLeftLonLat: LonLat = { lon: 0, lat: 0 };
    // 瓦块右下角经纬度坐标
    public bottomRightLonLat: LonLat = { lon: 0, lat: 0 };
    // 当在主线程加载图片时的请求，以便可随时取消请求
    public request: AbortableFetch | null;
    // 当在 worker 中加载图像时的回调
    public onTextureWorkerMessage: (e: MessageEvent<TextureWorkerReceiveMessage>) => void | null;
    public onGeometryWorkerMessage: (e: MessageEvent<GeometryWorkerReceiveMessage>) => void | null;

    constructor(map: Satellite) {
        super();
        this.map = map;
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.canvas.height = 256;
        this.texture = new CanvasTexture(this.canvas);
        this.texture.anisotropy = 2;
        this.material = new MeshBasicMaterial({ map: this.texture });
        this.geometry = new PlaneBufferGeometry();
    }

    public get isReady(): boolean {
        return this.isGeometryReady && this.isTextureReady;
    }

    public init(level: number, col: number, row: number, parentTile: Tile | null) {
        this.visible = false;
        this.isGeometryReady = false;
        this.isTextureReady = false;
        this.level = level;
        this.col = col;
        this.row = row;
        this.uid = `${this.id}-${level}-${row}-${col}`;
        this.parentTile = parentTile;
    }
    // 从 worker 中加载瓦片图
    public loadTextureInWorker() {
        const { version, id, uid, level, row, col, map, canvas } = this;

        if (!Tile.textureWorker) {
            Tile.textureWorker = new Worker(
                new URL('./workers/Texture.worker.ts', import.meta.url),
                { type: "module" }
            );
        }

        if (!this.onTextureWorkerMessage) {
            this.onTextureWorkerMessage = (e: MessageEvent<TextureWorkerReceiveMessage>) => {
                const { uid } = e.data;

                if (uid != this.uid) return;

                Tile.textureWorker.removeEventListener('message', this.onTextureWorkerMessage);
                this.texture.needsUpdate = true;
                this.isTextureReady = true;
                if (this.isReady) this.onload();
            }
        }

        Tile.textureWorker.addEventListener('message', this.onTextureWorkerMessage);
        const url = map.satelliteResource(level, col, row);

        const msg: TextureWorkerPostMessage = { id, uid, url };
        if (map.debug) {
            msg.texts = [level + '', col + '', row + ''];
        }

        if (version == 0) {
            const offscreen = canvas.transferControlToOffscreen();
            msg.canvas = offscreen;
            Tile.textureWorker.postMessage(msg, [offscreen]);
        } else {
            Tile.textureWorker.postMessage(msg);
        }
    }
    // 加载网格
    public loadGeometryInWorker() {
        if (!Tile.geometryWorker) {
            Tile.geometryWorker = new Worker(
                new URL('./workers/Geometry.worker.ts', import.meta.url),
                { type: "module" }
            );
        }
        if (!this.onGeometryWorkerMessage) {
            this.onGeometryWorkerMessage = (e: MessageEvent<GeometryWorkerReceiveMessage>) => {
                const { uid, position: pos } = e.data
                if (uid != this.uid) return;

                Tile.geometryWorker.removeEventListener('message', this.onGeometryWorkerMessage);

                const position = this.geometry.attributes.position;
                position.setXY(0, pos[0], pos[1]);
                position.setXY(1, pos[2], pos[3]);
                position.setXY(2, pos[4], pos[5]);
                position.setXY(3, pos[6], pos[7]);

                this.geometry.attributes.position.needsUpdate = true;
                this.geometry.applyMatrix4(this.matrixWorld);
                this.geometry.computeBoundingBox();

                this.isGeometryReady = true;
                if (this.isReady) this.onload();
            }
        }
        
        Tile.geometryWorker.addEventListener('message', this.onGeometryWorkerMessage);
        const { id, uid, level, row, col, map } = this;
        const { zone, offset } = this.map;
        const msg: GeometryWorkerPostMessage = { id, uid, level, row, col, zone, offset };
        msg.url = map.terrainResource(level, col, row);
        Tile.geometryWorker.postMessage(msg)
    }
    // 细分，在自身就绪的情况下。
    public subdivide(camera: Camera) {
        const { childrenTiles, map, level, isReady, visible } = this;

        if (childrenTiles.length > 0 || level >= map.maxLevel || !isReady || !visible) return;

        const { row, col } = this;

        for (let r = 0; r < 2; r++) {
            for (let c = 0; c < 2; c++) {
                const tile = Tile.getInstance(map);
                childrenTiles.push(tile);
                tile.init(level + 1, col * 2 + c, row * 2 + r, this);
            }
        }

        const orderChildren = childrenTiles.sort((a, b) => {
            const distanceA = a.geometry.boundingBox?.distanceToPoint(camera.position) ?? 0;
            const distanceB = b.geometry.boundingBox?.distanceToPoint(camera.position) ?? 0;
            return distanceA - distanceB;
        });

        orderChildren.forEach(item => {
            item.loadGeometryInWorker();
            item.loadTextureInWorker();
        });
    }
    // 简化，在已经细分的情况下
    public simplify() {
        const { childrenTiles } = this;
        if (!childrenTiles.length) return;

        childrenTiles.forEach(child => child.recycle());

        this.childrenTiles = [];
        this.visible = true;
        // this.center.visible = true;
    }
    // 瓦片加载完成时执行：
    // 1. 生成 geometry。
    // 2. 在兄弟节点全部就绪时隐藏父节点，显示兄弟节点。
    private onload() {
        this.map.add(this);

        let parentTile = this.parentTile;

        if (!parentTile) {
            this.visible = true;
            return;
        }

        const { childrenTiles } = parentTile;

        let readyBrotherCount = 0;

        childrenTiles.forEach(child => {
            if (child.isReady) readyBrotherCount++;
        })

        if (readyBrotherCount == 4) {
            parentTile.visible = false;
            childrenTiles.forEach(child => child.visible = true);
        }
    }
    // 回收对象
    // 1. 从场景中移除自身和中心。
    // 2. 销毁 geometry。
    // 3. 取消正在进行的请求（主线程或者通知 woker 线程取消）
    public recycle(): void {
        const { uid, request, childrenTiles } = this;

        Tile.textureWorker.removeEventListener('message', this.onTextureWorkerMessage);
        Tile.geometryWorker.removeEventListener('message', this.onGeometryWorkerMessage);

        childrenTiles.forEach(child => child.recycle());
        

        this.childrenTiles = [];
        this.parentTile = null;

        this.map.remove(this);

        if (request) {
            request.abort();
            this.request = null;
        }

        if (Tile.textureWorker) Tile.textureWorker.postMessage({ uid });
        if (Tile.geometryWorker) Tile.geometryWorker.postMessage({ uid });

        this.isUsing = false;
    }

    // 根据相机距离判断细分或者简化
    public update(camera: Camera) {
        const { level, childrenTiles, geometry, isReady, map } = this;
        
        if (!isReady || !geometry.boundingBox) return;
        let distance = geometry.boundingBox.distanceToPoint(camera.position);
        distance /= Math.pow(2, 20 - level);

        const isInFrustum = map.cameraFrustum.intersectsBox(geometry.boundingBox);

        if (distance < 50 && isInFrustum) {
            if (!childrenTiles.length) {
                this.subdivide(camera);
            }
        }
        if (distance > 55 || !isInFrustum) {
            this.simplify();
        }
        childrenTiles.forEach(child => child.update(camera));
    }

    // 从对象池中获取实例
    public static getInstance(map: Satellite): Tile {
        let tile = Tile.pool.find(item => !item.isUsing);
        if (tile) {
            tile.version++;
        } else {
            tile = new Tile(map);
            Tile.pool.push(tile);
        }
        tile.isUsing = true;

        return tile;
    }
}