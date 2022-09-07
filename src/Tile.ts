import { Box3, BufferAttribute, Camera, CanvasTexture, Float32BufferAttribute, Material, Mesh, MeshBasicMaterial, PlaneGeometry, Vector3 } from 'three';
import { GeometryWorkerPostMessage, GeometryWorkerReceiveMessage, TextureWorkerPostMessage, TextureWorkerReceiveMessage } from './utils/interfaces';
import { SatelliteMap } from './SatelliteMap';
import { acceleratedRaycast, disposeBoundsTree, MeshBVH } from 'three-mesh-bvh';
import { WorkerPool } from './workers/WorkerPool';
import TextureWorker from 'web-worker:./workers/TextureWorker.ts';
import GeometryWorker from 'web-worker:./workers/GeometryWorker.ts';

export class Tile extends Mesh {
    public static VECTOR3 = new Vector3();
    // 对象池
    public static pool: Tile[] = [];
    
    public static textureWorkerPool = new WorkerPool(TextureWorker, 1);

    public static geometryWorkerPool = new WorkerPool(GeometryWorker, 3);
    // just worker
    public textureWorker: Worker;
    // 生成网格的 worker
    public geometryWorker: Worker;
    // 本次被使用是产生的id
    public uid: string;
    // 材质
    public material: Material;
    // 纹理
    public texture: CanvasTexture;
    // 用作纹理的画布
    public canvas: OffscreenCanvas;
    // Satellite 实例
    public map: SatelliteMap;
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
    // 当前瓦片世界坐标下的包围盒
    public boundingBoxWorld: Box3 | undefined;

    private textureWorkerListener: (e: MessageEvent<GeometryWorkerReceiveMessage>) => void;
    private geometryWorkerListener: (e: MessageEvent<GeometryWorkerReceiveMessage>) => void;

    constructor(map: SatelliteMap) {
        super();
        this.map = map;
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 256;
        this.canvas = canvas.transferControlToOffscreen();

        this.texture = new CanvasTexture(canvas);
        this.texture.anisotropy = 2;
        this.material = new MeshBasicMaterial({ map: this.texture });
        // this.material = new MeshNormalMaterial({ flatShading: true });
        this.geometry = new PlaneGeometry();
        this.geometry.disposeBoundsTree = disposeBoundsTree;
        this.raycast = acceleratedRaycast;

        this.textureWorker = Tile.textureWorkerPool.getWorker();
        const { terrainFixGeometrys } = map;
        const initMessage = terrainFixGeometrys ? { init: true, terrainFixGeometrys } : null;
        this.geometryWorker = Tile.geometryWorkerPool.getWorker(initMessage);

        this.textureWorkerListener = this.onTextureWorkerMessage.bind(this);
        this.geometryWorkerListener = this.onGeometryWorkerMessage.bind(this);
    }

    public get isReady(): boolean {
        return this.isGeometryReady && this.isTextureReady;
    }

    /**
     * 初始化，Tile 被创建后，或复用时执行。
     * @param level 层级
     * @param col 瓦片列
     * @param row 瓦片行
     * @param parentTile 父亲 
     */
    public init(level: number, col: number, row: number, parentTile: Tile | null) {
        this.visible = false;
        this.isGeometryReady = false;
        this.isTextureReady = false;
        this.level = level;
        this.col = col;
        this.row = row;
        this.uid = `${this.id}-${level}-${row}-${col}`;
        this.parentTile = parentTile;
        this.renderOrder = this.level;
    }

    /**
     * 从 worker 中加载瓦片图。
     */
    public loadTexture() {
        const { version, id, uid, level, row, col, map, canvas } = this;

        const url = map.satelliteResource(level, col, row);

        const msg: TextureWorkerPostMessage = { id, uid, url };
        if (map.debug) {
            msg.texts = [level + '', col + '', row + ''];
        }

        this.textureWorker.addEventListener('message', this.textureWorkerListener);
        if (version === 0) {
            msg.canvas = canvas;
            this.textureWorker.postMessage(msg, [canvas]);
        } else {
            this.textureWorker.postMessage(msg);
        }
    }
    
    /**
     * 从 worker 中加载并生成地形网格。
     */
    public loadGeometry() {
        const { id, uid, level, row, col, map } = this;
        const { zone, terrainMaxError: maxError } = map;

        const msg: GeometryWorkerPostMessage = { id, uid, level, row, col, zone, maxError, init: false };

        msg.url = map.terrainResource(level, col, row);

        this.geometryWorker.addEventListener('message', this.geometryWorkerListener);
        this.geometryWorker.postMessage(msg);
    }

    /**
     * 卫星图在 worker 中加载完成后的回调。
     * @param e 仅包含 uid，卫星图已在 worker 线程中被绘制到 canvas 上。
     * @returns 
     */
    private onTextureWorkerMessage(e: MessageEvent<TextureWorkerReceiveMessage>) {
        if (e.data.uid != this.uid) return;

        this.textureWorker.removeEventListener('message', this.textureWorkerListener);

        this.texture.needsUpdate = true;
        this.isTextureReady = true;

        if (this.isReady) this.onload();
    }

    /**
     * 地形网格 worker 中加载完成后的回调。
     * @param e 包含顶点，uv，法线，分层包围盒信息，用以重建 geometry。
     * @returns
     */
    private onGeometryWorkerMessage(e: MessageEvent<GeometryWorkerReceiveMessage>) {
        if (e.data.uid != this.uid) return;

        const { positions, uv, normal, serializedBVH, center } = e.data;

        // 消除平面地形时的 z-fighting.
        const y = center.y + 0.001 * (this.level - this.map.minLevel);
        this.position.set(center.x, y, center.z);

        this.geometryWorker.removeEventListener('message', this.onGeometryWorkerMessage);

        const bvh = MeshBVH.deserialize(serializedBVH, this.geometry, { setIndex: false });

        // @ts-ignore
        this.geometry.setIndex(new BufferAttribute(serializedBVH.index, 1, false));
        this.geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
        this.geometry.setAttribute('uv', new Float32BufferAttribute(uv, 2));
        this.geometry.setAttribute('normal', new Float32BufferAttribute(normal, 3));

        this.geometry.attributes.position.needsUpdate = true;
        this.geometry.attributes.uv.needsUpdate = true;
        this.geometry.attributes.normal.needsUpdate = true;

        this.geometry.computeBoundingBox();
        this.geometry.computeBoundingSphere();
        this.geometry.boundsTree = bvh;
        this.matrixWorldNeedsUpdate = true;

        if (this.geometry.boundingBox) {
            this.boundingBoxWorld = this.geometry.boundingBox.clone();
            this.boundingBoxWorld.applyMatrix4(this.matrixWorld);
        }
        
        this.isGeometryReady = true;

        if (this.isReady) this.onload();
    }
    
    /**
     * 瓦片细分
     * @param camera 相机，用以排序细分顺序。
     * @returns 
     */
    public subdivide() {
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

        map.addToLoadQueue(this.childrenTiles);
    }
    
    /**
     * 简化，在已经细分的情况下
     * @returns 
     */
    public simplify() {
        const { childrenTiles } = this;
        if (!childrenTiles.length) return;

        childrenTiles.forEach(child => child.recycle());

        this.childrenTiles = [];
        this.visible = true;
    }
    
    /**
     * 瓦片加载完成时执行：
     * 1. 生成 geometry。
     * 2. 在兄弟节点全部就绪时隐藏父节点，显示兄弟节点。
     * @returns 
     */
    private onload() {
        this.map.add(this);
        this.visible = true;

        const parentTile = this.parentTile;

        if (!parentTile) return;

        const { childrenTiles } = parentTile;

        let readyBrotherCount = 0;

        childrenTiles.forEach(child => {
            if (child.isReady) readyBrotherCount++;
        });

        if (readyBrotherCount === 4) {
            parentTile.visible = false;
        }
    }

    /**
     * 回收对象
     * 1. 从场景中移除自身和中心。
     * 2. 取消正在进行的请求（主线程或者通知 woker 线程取消）
     */
    public recycle(): void {
        const { uid, childrenTiles } = this;

        this.textureWorker.removeEventListener('message', this.textureWorkerListener);
        this.geometryWorker.removeEventListener('message', this.geometryWorkerListener);
        this.textureWorker.postMessage({ uid });
        this.geometryWorker.postMessage({ uid });

        childrenTiles.forEach(child => child.recycle());

        this.childrenTiles = [];
        this.parentTile = null;

        this.map.remove(this);
        this.map.removeFromLoadQueue(this);

        this.isUsing = false;
    }
    
    /**
     * 根据相机距离判断细分或者简化。
     * @param camera 相机。
     * @returns 
     */
    public update(camera: Camera) {
        const { level, childrenTiles, geometry, isReady, map, boundingBoxWorld } = this;

        if (!isReady || !geometry.boundingBox || !boundingBoxWorld) return;

        boundingBoxWorld.set(geometry.boundingBox.min, geometry.boundingBox.max);
        boundingBoxWorld.applyMatrix4(this.matrixWorld);

        let distance = boundingBoxWorld.distanceToPoint(camera.position);
        distance /= Math.pow(2, 20 - level);

        const isInFrustum = map.cameraFrustum.intersectsBox(boundingBoxWorld);

        if (distance < 60 && isInFrustum) {
            if (!childrenTiles.length) {
                this.subdivide();
            }
        }
        if (distance > 80 || !isInFrustum) {
            this.simplify();
        }
        childrenTiles.forEach(child => child.update(camera));
    }

    /**
     * 销毁瓦块，仅作为父 map 调用。
     * @returns 
     */
    public dispose() {
        this.map.remove(this);
        this.geometry.disposeBoundsTree();
        this.geometry.dispose();
        this.material.dispose();
        this.texture.dispose();
    }

    /**
     * 从对象池中获取实例
     * @param map 当前的地图对象
     * @returns Tile
     */
    public static getInstance(map: SatelliteMap): Tile {
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