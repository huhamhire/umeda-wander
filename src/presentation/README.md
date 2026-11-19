# 呈现层

`MapScene` 保留场景、镜头、状态同步及生命周期，静态模型、标签、手势和外观分别维护。

```text
presentation/
├── map-scene.ts             # 场景协调与挂载／释放
├── camera/                  # 取景、定位、旋转和 MapGestures
├── labels/                  # DOM 标签、遮挡、碰撞及平贴文字纹理
├── appearance/              # 配色、灰化和展开缓动
├── components/              # 页签、楼层选项、版权及定位标记
└── models/
    ├── map-models.ts        # 模型构造和输出组登记
    ├── model-primitives.ts  # 基础网格、材质缓存及合批
    ├── floor-geometry.ts    # 共用楼板裁剪
    ├── buildings/          # 商业楼板、体量、通廊及立面
    ├── stations/           # 设备、基座、屋顶、轨道及路线
    └── public-areas/       # 环境、桥面、通路及天井
```

## 协作接口

- `MapModels` 接收领域布局、楼层、设施和 Three.js 场景，输出楼层组、设备、可点选对象及标签锚点。不创建 WebGLRenderer 或页面标签，CPU 核查与 H5 共用此入口；平贴楼板文字可在浏览器内生成 Canvas 纹理。
- `SceneLabels` 接收锚点及每帧可见状态，管理页面标签投影、灰化、遮挡及碰撞。次要设施共用一个按需创建的定位标签。`dispose()` 只移除自己的节点。
- `MapGestures` 识别点击、拖动、双指缩放与旋转、鼠标中键旋转。手机以双指起始中点为轴，按帧合并两指坐标，并按初始位移锁定俯仰、转向或缩放，直到触点组合变化。拾取、镜头变化和选择通过回调交给 MapScene，事件监听随实例释放。
- `RouteModel` 按当前楼层渲染已计算的路线。地图点选只使用已登记的路线节点。
- `MapScene.dispose()` 取消帧、监听和 ResizeObserver，移除标签，释放场景几何、材质、纹理及渲染器。调用方移除场景时使用此入口。

各站共用这些能力，专属结构由领域数据驱动，不复制七套渲染器。直接导入具体模块，不添加旧路径转发；离线及替身测试不替代浏览器和手机验收。详见[架构说明](../../docs/development/architecture.md)。
