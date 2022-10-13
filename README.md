# SATELLITE MAP

> 基于 Threejs 和 utm 坐标的卫星高程图

## 基本使用
这是一个在 threejs 中展示卫星地图的简单示例。
```javascript
import { SatelliteMap } from 'satellite-map.js';

const satelliteMap = new SatelliteMap({

    // 最大层级
    maxLevel: 19,

    // 最小层级
    minLevel: 5,

    // utm 区号
    zone: 50,

    // 展示范围左上角坐标
    start: { lat: 42.423176, lon: 113.889034 },

    // 展示范围右下角坐标
    end: { lat: 36.386768, lon: 124.314903 },

    // 地形误差，数值越小顶点越多，缺省时根据层级自动计算
    maxError: 10,

    // 卫星瓦片数据源
    satelliteResource: (level: number, x: number, y: number) => {
        return `https://mts1.google.com/vt/lyrs=s&hl=zh-CN&x=${x}&y=${y}&z=${level}`;
    },

    // 地形高程瓦片数据源，目前只支持 mapbox rgb 高程图。
    terrainResource: (level: number, x: number, y: number) => {
        return `https://api.mapbox.com/v4/mapbox.terrain-rgb/${level}/${x}/${y}.pngraw?access_token=YOUR_TOKEN_HERE`;
    },

    // 使用 glb 工具生成的 glb 瓦片
    glbResource: (level: number, x: number, y: number) => {
        return `http://xxx.xxx.xxx.xxx/tiles/${level}/${x}/${y}/tile.glb`;
    },

    // draco 解码器路径，使用 glb 瓦块时，需要此参数（glb 未经 draco 压缩时不用）。
    dracoPath: '/draco/'
});

// 显示瓦片边界、层级、编号
satelliteMap.debug = true;

// 添加到场景中
scene.add(satelliteMap);

// 主循环
function animate() {
    requestAnimationFrame(animate);

    // 在循环中更新地图，地图内部有节流处理，无须担心过度执行。
    satelliteMap.update(camera);

    // ...渲染场景
}

```

## 地形修正

由于高程瓦片的高程数据并不是十分精确，会导致有正确高程数据的模型被卫星图所覆盖或其无法紧贴地面。
解决问题的途径是初始化 `SatelliteMap` 时向其传入 `terrainFixGeometrys` 参数，示例如下：

```javascript
import { SatelliteMap, ElevationFix } from 'satellite-map.js';

const satelliteMap = new SatelliteMap({

    // ...其他参数
    terrainFixGeometrys: [{

        // BufferGeometry 类型，地图将根据其高程进行修正。
        geometry: geometry,

        // 修正模式 DOWN：降低高于几何体的顶点，UP：抬高低于几何体的顶点，MATCH：将顶点高程与几何体完全匹配；
        // 几何体必须为未被使用的。
        mode: ElevationFix.DOWN
    }]
});
```

## 注意事项
1. 地图默认为 Y 轴向上，和 threejs 默认一致，在其它轴向的相机里需要旋转对应角度。
2. 地形修正时传如的几何体也应该为 Y 轴向上。
