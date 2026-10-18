# Architecture B 实现与实际结果

## 工作区与技术栈

初始 `D:\dotless` 为空，也不是 Git 仓库，没有现成渲染依赖或 Architecture A。应用创建于独立 `architecture-b` 目录。没有覆盖用户已有实现；没有使用 Genesis 的地形或着色器。

实际安装并锁定在 package-lock.json：React 19.3.1、Three.js 0.186.1、Vite 8.3.4、TypeScript 5.9.3、Zod 4.6.7。没有为一个空项目引入不必要的 Fiber 适配层；PlanetCore 是直接使用 Three.js 的独立类，React 只负责交互界面。

## 实际检查的外部源码

参考仓库均放在 `D:\personaverse-references`，不在应用源码目录。对应提交与完整许可证保存在 THIRD_PARTY_NOTICES.md。

| 仓库 | 实际阅读的文件 | 最终用途 |
|---|---|---|
| dgreenheck/threejs-procedural-planets | index.html 中地形/顶点/片元 shader；scripts/main.js、atmosphere.js | **直接移植** simplex3/fractal3/terrainHeight；改造 GPU 位移、高度混色与有限差分法线。未采用其粒子大气或素材 |
| ashima/webgl-noise | src/noise3D.glsl 与许可证 | 保留原始 3D simplex 实现用于可选云壳；Greenheck 地形本身也包含 Ashima 的 simplex 算法 |
| Eluvade/cosmos | src/seed.ts、glsl/features/flow-layer.glsl.ts、glsl/composer.ts、standalone/gas-giant.glsl.ts | **改造 hashSeed 整数混合代码**生成可重现的独立子种子；参考模块化和流动层设计。没有将其 2D canvas 输出冒充 3D 星球 |
| XenoverseUp/procedural-planets | glsl/compute/vertex-compute.fs、glsl/planet/planet.fs、components/planet-cpu/mesh-generation.ts、editor/lights.tsx | 检查 GPU/CPU 生成、多层与 ridged noise；作为技术参考，最终没有搬入其 GPGPU 管线 |
| prolearner/procedural-planet | shader/material.js、js/GradientNoise.js | 检查分形噪声和旧式纹理生成；未复制旧 Three.js 接口、模型或纹理 |
| pmndrs/react-three-fiber | packages/fiber/package.json、src/core/loop.ts | 确认渲染循环与版本约束，作为评估参考，未复制或安装 Fiber |
| pmndrs/react-postprocessing | package.json、src/EffectComposer.tsx、src/effects/Bloom.tsx | 检查合成与兼容性；最终使用 Three.js 官方 composer/Bloom/OutputPass |

Three.js 官方 `ConvexGeometry` 用于真实六棱柱端面，`RoomEnvironment` 与 PMREM 用于次级结构的环境高光。主星球的粗糙度/金属度调节是风格化高光，不是完整的物理 BSDF。没有复制外部贴图、照片、天空盒或模型。

## PlanetCore 架构

`RenderSpec → PlanetCore → Geometry / Material / Atmosphere / Clouds / Orbits / Structures / Lighting / Animation / PostFX`

- 几何只在配置改变时创建，逐帧不重建。主要地形位移在 GPU 顶点着色器中执行。
- 主表面材质直接采用用户认可的 Greenheck 地形基础，保留多尺度细节，再修正法线、视线和光方向的坐标空间。
- FRACTURE 的凹槽与发光使用同一个域扭曲裂隙函数，确实改变网格位置。
- 轨道由自定义连续带状网格组成，具有开口、不等宽、不同分段和解析的星球投影阴影。
- 次级晶体/岩块使用 InstancedMesh；材质与几何复用，释放时去重 dispose。
- 大气是网格壳层；可选云也是透明网格。装饰星点默认关闭，主视觉不依赖 Points。
- 质量档位限制 DPR、几何分辨率和噪声 octave 数。Eco 绕过后处理。
- 相机采用 OrbitControls，支持阻尼、缩放限制、重置、暂停和固定对比姿态。

## 三种预设的结构差异

| 预设 | 表面/轮廓 | 材质 | 轨道/运动 |
|---|---|---|---|
| NEBULA | 连续多尺度山脊、较低位移、深色盆地与细致海岸层次 | 蓝紫/青色五层高度混色，局部缓慢流动 | 两条不等宽的开放曲带，轻缓自转 |
| FRACTURE | 更粗糙的地壳、实际凹入的扭曲断层、少量漂浮岩块 | 深色岩层与局部橙色裂隙，缓慢能量变化 | 五段有明显断口的倾斜弧带，自转较慢 |
| CRYSTAL | 不同拓扑的棱面核心、六棱柱矿物簇、偏移的晶体端面 | 冷色矿物与局部核心光，次级晶体使用 PhysicalMaterial | 四段多边形轨道，克制的高光与慢速运动 |

NEBULA 现在优先保留用户认可的参考演示的地形质感，因此比最初纯流线方案更接近有山脉的异星地貌。它并不是气体流体模拟。

## 新建与修改的文件

本任务中不存在被覆盖的旧文件，以下均为新应用内文件，后续迭代仅修改这些文件：

- 应用/构建：package.json、package-lock.json、tsconfig.json、vite.config.ts、index.html、.gitignore、public/favicon.svg。
- UI：src/main.tsx、App.tsx、Personalization.tsx、style.css。
- 渲染：src/planet/PlanetCore.ts、PlanetGeometry.ts、PlanetMaterial.ts、PlanetAtmosphere.ts、PlanetClouds.ts、OrbitalGeometry.ts、SurfaceStructures.ts、PlanetPostFX.ts、RenderSpec.ts、PlanetPresets.ts、procedural.ts。
- GLSL：src/planet/vendor/greenheck-terrain.glsl、shaders/terrain.glsl、surface.vert.glsl、surface.frag.glsl、noise3D.glsl。common.glsl 为早期流线实验的辅助噪声，最终主表面不再使用。
- AI：src/ai/schemas.ts、capabilities.ts；server/config.ts、llm.ts、pipeline.ts、api.ts、index.ts、smoke.ts、diagnose.ts；server/prompts 下的两个完整提示词。
- 验证/说明：tests/contracts.test.ts、README.md、THIRD_PARTY_NOTICES.md、docs 中的产品链路、对比说明、截图与真实 AI 结果。

## 构建与实际检查

- `npm run build` 成功：包含客户端、服务端和 Vite 配置的 TypeScript 检查，并构建静态资源。
- `npm test` 通过 5 项有意义的契约测试：三预设有效且结构不同、无效模型参数被拒绝、种子稳定、图像数据与来源引用隔离、捏造证据和方向被拒绝。
- 已实际在浏览器中查看 NEBULA、FRACTURE、CRYSTAL，而非只运行构建。早期原型的粗糙表面、宽环带与过强尖峰已根据画面修改；主材质重做为 Greenheck 基础。
- 生产版真实加载，最终 NEBULA 页面无浏览器 error 日志。三预设在装饰粒子关闭的状态下截图。额外关闭 NEBULA 的大气、轨道、次级结构后，主地表仍正常显示，截图为 screenshots/nebula-core-only.jpg。
- 本机短时 RAF 采样约 60 FPS，主几何约 8–9 万三角面（NEBULA/FRACTURE），CRYSTAL 约一万以内；这不等于普通笔记本稳定 60 FPS。`frameMs` 是 CPU 提交时间，不是 GPU 完成时间。完整快照存于 screenshots/measurements.json。
- `gpt-6-sol` 已通过用户提供的 provider 完成实际两阶段调用，约 47 秒，输出通过严格验证，未走降级。另一次通过实际页面填写虚构资料、生成 DNA 并应用到星球的流程也成功，输出与页面截图见 ai-ui-result.json、screenshots/ai-dna-result.jpg、screenshots/ai-applied.jpg。最初的 JSON Schema 元组与 provider 严格模式不兼容，已改成有固定长度约束的同类型数组，未切换模型。

## 粒子关闭与 A/B

三张最终截图均为 `modules.stars=false`。大气、山脊、矿物、裂隙和轨道都由网格或连续材质生成；关闭装饰星点不会丢失这些结构。审美是否达到预期仍应由用户结合截图与实际交互判断。

本地没有 A 版，未生成虚假的 A/B 胜负评价。固定视角与匹配截图的具体步骤见 COMPARISON.md。

## 剩余限制

1. 这是可运行的独立初版，不应把它描述为已达到离线电影渲染品质。环带仍可进一步增加材质层次和真实遮挡。
2. 主表面为高质量程序材质与风格化光照，尚无完整 PBR、地形自阴影、折射、体积散射或真正的破碎动力学。
3. CRYSTAL 的矿物是实体不透明棱面，不是透明宝石；FRACTURE 主要用位移断层表现破裂，并非完全分离的地壳模拟。
4. AI 当前只能组合已实现的三种设计家族；不支持任意描述直接创造新组件。图像通路已实现，但本次真实调用只使用虚构文字资料，未声称验证过多模态图片效果。
5. LLM 和第三方 provider 的延迟、配额和多模态可用性需进一步测试。没有账号系统、持久化数据库或生产部署。
6. Three.js 的生产分块约 597 KB（压缩前）触发 Vite 体积提示，构建成功；仍可进一步按功能拆包和做加载优化。Google Fonts 不可用时会使用本地字体回退。
7. 本次性能为当前设备的短时前台采样，没有覆盖长时间温控、集成显卡、所有质量档位或多设备基准。

