import { Box3, Box3Helper, BufferAttribute, BufferGeometry, Camera, Float32BufferAttribute, Mesh, MeshStandardMaterial, Texture, Vector3 } from 'three';
import { GeometryWorkerPostMessage, GeometryWorkerReceiveMessage, GLBWorkerPostMessage, GLBWorkerReceiveMessage, TextureWorkerPostMessage, TextureWorkerReceiveMessage } from '../utils/interfaces';
import { SatelliteMap } from './SatelliteMap';
import { acceleratedRaycast, disposeBoundsTree, MeshBVH } from 'three-mesh-bvh';
import { WorkerPool } from '../workers/WorkerPool';
import TextureWorker from '../workers/TextureWorker?worker&inline';
import GeometryWorker from '../workers/GeometryWorker?worker&inline';
import GLBWorker from '../workers/GLBWorker?worker&inline';

export class Tile extends Mesh {
    // 公用的 Vector3 ，用于各种物体 getWorldPosition(target).
    public static VECTOR3 = new Vector3();
    // 对象池
    public static pool: Tile[] = [];

    public static textureWorkerPool = new WorkerPool(TextureWorker, 1);

    public static geometryWorkerPool = new WorkerPool(GeometryWorker, 3);
    // gltf 加载器
    public static glbWorkerPool = new WorkerPool(GLBWorker, 1);
    // 所有正在加载的材质
    public static textureLoadings: Map<string, Tile> = new Map();
    // 所有正在加载的地形
    public static geometryLoadings: Map<string, Tile> = new Map();
    // 所有正在加载的模型
    public static glbLoadings: Map<string, Tile> = new Map();
    // just worker
    public textureWorker: Worker | null;
    // 生成网格的 worker
    public geometryWorker: Worker | null;
    // 加载 GLB worker
    public glbWorker: Worker | null;
    // 本次被使用是产生的id
    public uid: string;
    // 材质
    public material: MeshStandardMaterial;
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
    // 当前瓦块层级
    public level: number;
    // 当前瓦块行
    public row: number;
    // 当前瓦块列
    public col: number;
    // 当前瓦片世界坐标下的包围盒
    public boundingBoxWorld: Box3 = new Box3();

    public boxHelper: Box3Helper;

    constructor(map: SatelliteMap) {
        super();
        this.map = map;
        const texture = new Texture();
        texture.anisotropy = 4;
        this.material = new MeshStandardMaterial({ map: texture, flatShading: true });
        this.geometry = new BufferGeometry();
        this.geometry.disposeBoundsTree = disposeBoundsTree;
        this.raycast = acceleratedRaycast;
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
        if (!this.textureWorker) {
            this.textureWorker = Tile.textureWorkerPool.getWorker();
            if (!this.textureWorker.onmessage) {
                this.textureWorker.onmessage = e => Tile.onWorkerMessage(e)
            }
        }

        const { id, uid, level, row, col, map, textureWorker } = this;

        if (!map.satelliteResource) return;

        const url = map.satelliteResource(level, col, row);

        const msg: TextureWorkerPostMessage = { id, uid, url };
        if (map.debug) {
            msg.texts = [level + '', col + '', row + ''];
        }

        Tile.textureLoadings.set(uid, this);
        textureWorker.postMessage(msg);
    }

    /**
     * 从 worker 中加载并生成地形网格。
     */
    public loadGeometry() {
        if (!this.geometryWorker) {
            const { terrainFixGeometrys } = this.map;
            const initMessage = terrainFixGeometrys ? { init: true, terrainFixGeometrys } : null;
            this.geometryWorker = Tile.geometryWorkerPool.getWorker(initMessage);
            if (!this.geometryWorker.onmessage) {
                this.geometryWorker.onmessage = e => Tile.onWorkerMessage(e)
            }
        }

        const { id, uid, level, row, col, map, geometryWorker } = this;

        if (!map.terrainResource) return;

        const { zone, maxError } = map;

        const msg: GeometryWorkerPostMessage = { id, uid, level, row, col, zone, init: false, maxError };

        msg.url = map.terrainResource(level, col, row);

        Tile.geometryLoadings.set(uid, this);
        geometryWorker.postMessage(msg);
    }

    public loadGLB() {
        if (!this.glbWorker) {
            const { terrainFixGeometrys, dracoPath } = this.map;
            const initMessage = { init: true, terrainFixGeometrys, dracoPath };
            this.glbWorker = Tile.glbWorkerPool.getWorker(initMessage);
            if (!this.glbWorker.onmessage) {
                this.glbWorker.onmessage = e => Tile.onWorkerMessage(e)
            }
        }

        const { id, uid, level, row, col, map, glbWorker } = this;

        if (!map.glbResourse) return;

        const url = map.glbResourse(level, col, row);

        const msg: GLBWorkerPostMessage = { id, uid, url };

        Tile.glbLoadings.set(uid, this);
        glbWorker.postMessage(msg);
    }

    /**
     * 卫星图在 worker 中加载完成后的回调。
     * @param e 仅包含 uid，卫星图已在 worker 线程中被绘制到 canvas 上。
     * @returns 
     */
    private onTextureWorkerMessage(data: TextureWorkerReceiveMessage) {
        if (data.uid != this.uid) return;

        Tile.textureLoadings.delete(this.uid);

        const { bitmap } = data;
        if (bitmap) {

            const texture = this.material.map as Texture;
            texture.image = bitmap;
            // const ctx = this.canvas.getContext('2d');
            // if (!ctx) return;

            // const { width, height } = this.canvas;

            // ctx.drawImage(bitmap, 0, 0, this.canvas.width, this.canvas.height);

            // if (this.map.debug) {
            //     ctx.strokeStyle = '#00ffff';
            //     ctx.strokeRect(0, 0, width, height);

            //     ctx.fillStyle = '#00ffff';
            //     ctx.font = 'bold 20px arial';
            //     [this.level, this.col, this.row].forEach((t, i) => {
            //         ctx.fillText(t + '', 10, (i + 1) * 20);
            //     });
            // }

            texture.needsUpdate = true;
            this.isTextureReady = true;
        }

        if (this.isReady) this.onload();
    }

    /**
     * 地形网格 worker 中加载完成后的回调。
     * @param e 包含顶点，uv，法线，分层包围盒信息，用以重建 geometry。
     * @returns
     */
    private onGeometryWorkerMessage(data: GeometryWorkerReceiveMessage) {
        if (data.uid != this.uid) return;

        Tile.geometryLoadings.delete(this.uid);

        const { positions, uv, normal, serializedBVH, center } = data;

        // 消除平面地形时的 z-fighting.
        const y = center.y + 0.001 * (this.level - this.map.minLevel);
        this.position.set(center.x, y, center.z);

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

        this.isGeometryReady = true;

        if (this.isReady) this.onload();
    }

    private onGLBWorkerMessage(data: GLBWorkerReceiveMessage) {
        if (data.uid != this.uid) return;
        
        Tile.glbLoadings.delete(this.uid);

        this.onGeometryWorkerMessage(data);
        this.onTextureWorkerMessage(data);
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

        if (parentTile) {
            const { childrenTiles } = parentTile;

            let readyBrotherCount = 0;
            childrenTiles.forEach(child => {
                if (child.isReady) readyBrotherCount++;
            });
            if (readyBrotherCount === 4) {
                parentTile.visible = false;
            }
        }

        if (this.map.debug) {
            if (!this.boxHelper) {
                this.boxHelper = new Box3Helper(this.geometry.boundingBox || new Box3());
                this.add(this.boxHelper);
            } else {
                this.boxHelper.box = this.geometry.boundingBox as Box3;
            }

        }
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
        this.childrenTiles.forEach(child => child.recycle());
        this.childrenTiles = [];
        this.visible = true;
    }

    /**
     * 回收对象
     * 1. 从场景中移除自身和中心。
     * 2. 取消正在进行的请求（主线程或者通知 woker 线程取消）
     */
    public recycle(): void {
        const { uid, map, geometry, childrenTiles, boundingBoxWorld } = this;

        Tile.textureLoadings.delete(uid);
        Tile.geometryLoadings.delete(uid);
        Tile.glbLoadings.delete(uid);

        this.textureWorker?.postMessage({ uid });
        this.geometryWorker?.postMessage({ uid });

        geometry.disposeBoundsTree();

        childrenTiles.forEach(child => child.recycle());

        geometry.boundingBox?.makeEmpty();
        geometry.boundingSphere?.makeEmpty();
        boundingBoxWorld.makeEmpty();

        map.remove(this);
        map.removeFromLoadQueue(this);

        this.childrenTiles = [];
        this.parentTile = null;
        this.visible = false;
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

        boundingBoxWorld.copy(geometry.boundingBox).applyMatrix4(this.matrixWorld);

        camera.getWorldPosition(Tile.VECTOR3);
        let distance = boundingBoxWorld.distanceToPoint(Tile.VECTOR3);
        distance /= Math.pow(2, 20 - level);

        const isInFrustum = map.cameraFrustum.intersectsBox(boundingBoxWorld);

        if (distance < 60 && isInFrustum) this.subdivide();
        if (distance > 80) this.simplify();

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
        this.material.map?.dispose();
        this.material.dispose();
    }

    /**
     * 从对象池中获取实例
     * @param map 当前的地图对象
     * @returns Tile
     */
    public static getInstance(map: SatelliteMap): Tile {
        let tile = Tile.pool.find(item => !item.isUsing);
        if (!tile) {
            tile = new Tile(map);
            Tile.pool.push(tile);
        }
        tile.isUsing = true;

        return tile;
    }

    public static onWorkerMessage(e: MessageEvent<TextureWorkerReceiveMessage | GeometryWorkerReceiveMessage | GLBWorkerReceiveMessage>) {
        const data = e.data;
        const type = data.type;
        let tile;
        const { textureLoadings, geometryLoadings, glbLoadings } = Tile;
        switch (type) {
            case 'texture':
                const textureData = data as TextureWorkerReceiveMessage;
                tile = textureLoadings.get(textureData.uid);
                tile?.onTextureWorkerMessage(textureData);
                break;
            case 'geometry':
                const geoData = data as GeometryWorkerReceiveMessage;
                tile = geometryLoadings.get(geoData.uid);
                tile?.onGeometryWorkerMessage(geoData);
                break;
            case 'glb':
                const glbData = data as GLBWorkerReceiveMessage;
                tile = glbLoadings.get(glbData.uid);
                tile?.onGLBWorkerMessage(glbData);
                break;
        }
    }
}