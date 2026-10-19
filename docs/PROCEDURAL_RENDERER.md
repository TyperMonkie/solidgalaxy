# 完整个性化渲染输入（2026-10-19）

PersonaVerse 的工作流仍是「分类个人素材 → Profile Agent → Universe DNA → Style Compiler → 已校验 RenderSpec → 渲染」。本次只扩展渲染能力与编译合同，保留角色、可发现标签、社交星图、好友与帖子。所有新生成世界必须显式提供完整参数，包括关闭的模块；不再由页面补一组固定云、环或光照。允许云、环、边缘大气、Bloom 缺席，关闭也属于创意选择。

## 来源与范围

直接适配 [Daniel Greenheck 的 threejs-procedural-planets](https://github.com/dgreenheck/threejs-procedural-planets)，核对 commit `23457d4f8e6bedf22aa266e12c92f850822ff3a4`，MIT。完整许可见 `THIRD_PARTY_NOTICES.md`。逐项核对 `.local/reference-greenheck/scripts/ui.js` 的所有界面参数；本项目没有复制它的整套页面、天空盒和应用框架。复用核心地形、五层混色、有限差分法线、云精灵算法与 cloud.png，并将原作光照、高光与 Bloom 控制接入产品。

| 原作参数 | RenderSpec 输入 | 渲染落点 |
| --- | --- | --- |
| Type / Amplitude / Sharpness / Offset / Period | terrain.noise / amplitude / sharpness / offset / period | PlanetMaterial → Greenheck terrainHeight；连续海陆分布与实际位移 |
| Persistence / Lacunarity / Octaves | terrain.persistence / lacunarity / octaves | 分形细节；0 持续度可用，层数扩展到10 |
| Layer 1–5 RGB | terrain.colors[5] | 五层海拔色；线性RGB默认值转换为sRGB十六进制 |
| Transition 2–5 / Blend 12–45 | terrain.transitions[4] / blends[4] | 分界与融合；新合同要求分界非递减 |
| Bump Strength / Offset | terrain.bumpStrength / bumpOffset | 位移法线混合与采样距离，完整 .0001–.1 范围 |
| Atmosphere Thickness / Radius | weather.thickness / altitude | 球壳厚度 .005–.25，原作半径20规范化为1，云半径为1+altitude |
| Particle Count | weather.particles | 1–50000；正常画质遵从输入，Eco最多1800 |
| Min / Max Particle Size | weather.minParticleSize / maxParticleSize | 独立0–200；按种子在区间采样，增加视距/像素比修正 |
| Density / Opacity / Scale / Speed / RGB | weather.density / opacity / scale / speed / color | 浓淡、透明度、团块尺度、时间演化、颜色；density完整-2–2 |
| Ambient / Diffuse / Specular / Shininess | lighting.ambient / intensity / specular / shininess | 独立环境光/漫反射/高光0–5与锐度0–25 |
| Light Direction XYZ / RGB | lighting.direction[3] / color | 非零世界空间光源方向、色彩；同步地表/云/大气边缘/装饰受光 |
| Bloom Threshold / Strength / Radius | bloom.threshold / strength / radius | UnrealBloomPass；完整0–1 / 0–1 / 0–2范围 |

`greenheckTerrain/Weather/Lighting/Bloom()` 保存原作对应默认配置。原作 `fractal3` 在 persistence=0 时有零分母，本次只在该边界使用首层归一值；对已有非零输入保留原算法。sharpness=0 时显式取常量幂，避免0的0次方未定义。高光的pow底数与零方向也加保护。

这并非逐像素复刻：本项目保留相机、ACES色调映射、自己的背景与星环，地表高光叠加原有粗糙度/金属感，原作五层地貌可叠加我们的裂缝。云依然是原作球壳精灵近似，不是光线步进体积云。极端全云、全平、过亮参数也可能产生不理想画面；参数自由并不等于所有组合都美观。

## 本项目扩展的全部输入

- 地形：`terrain.relief` 控制实际起伏；`geometry.fractures` 的 density/branching/directionality/distortion/width/coverage/depth 控制密度、分支、方向、扭曲、宽度、覆盖与深度；palette/emission 控制裂缝颜色/自发光。所有地形家族使用同一连续地形系统。
- 天气：`modules.clouds` 决定有无；`weather.drift` 独立正负风向；数量、粒子大小与噪声浓淡共同决定云的表现，不强制每颗星球都有雾。
- 星环：`orbits.enabled/type` 可选无环、纯点云、丝带、断弧、多边形环；radius/width/layers/arc/eccentricity/warp 控制尺度、宽度、层数、弧长、椭圆程度与起伏；particles/particleSize/opacity/colors 控制星尘、尺寸、透明度与两色；tilt/inclination/speed/precession 控制角度、独立正负环绕速度、进动。纯点云不再暗中附带实体丝带。点云数量0–20000，Eco最多2400。
- 其他：大气边缘有无/颜色/强度、材质粗糙度/金属感、角色与标签、装饰数量、自转/流动/总动态开关仍由合同控制。背景星空是社交场景环境，旧 stars 标记不控制该背景；能力目录明确说明这一兼容字段。
- Bloom 在工作室与社交近景都遵从编译配置；社交远景为保留星图可读性直接渲染，接近时平滑引入选中星球的辉光。远景不画每颗星球的全部云，星环减少层数/点数但保留类型和形状；近景用保存的画质与配置。

## AI、界面与保存兼容

能力目录v4与两阶段提示词描述了这些真实能力。新编译必须提供 terrain/weather/bloom、完整lighting与完整orbits，包含关闭时的参数。拒绝未知组件、越界、零光向量、粒子大小倒置和海拔层序倒置。严格Responses schema每个对象字段必填，使用定长同类数组，避免prefixItems。

提示词要求根据整份DNA及选定方向共同选择地理、天气、轨道、光照与独立运动，并解释其关系。没有“开放=无云”等关键词字典或客观人格真相主张。原始隐私素材只交给Profile，Compiler接收DNA与能力目录。模型输出还可能趋同，不能仅靠开放参数保证所有人的美术质量。

主界面展示本次生成的天气与轨道状态；外部固定开关已收进「查看参数 / 手动微调」。不需用户先开云或选环才生成。手动改动随DNA导出与发布保存，并提供「恢复本次AI生成参数」。生成结果原样应用，云/环关闭和高光/Bloom为0不会被客户端覆盖。`/?studio=1` 是完整产品，`/?planet-lab=1` 仅为独立渲染测试。

旧保存允许缺少新增字段，通过兼容函数得到旧默认值，不偷偷重写它们的人格解读。旧 weather.size 仅作尺寸区间的兼容来源；新AI schema已移除此旧字段，只输出独立min/max。已有星球需重新生成才会得到新的完整个性化参数。quality为low与系统减少动态偏好属于运行预算/可访问性控制，不改变保存的创意配置。

## 验证

- 29项测试：新合同所有对象字段必填；原作范围端点；旧保存兼容；非法参数阻断；纯点云/带状几何、点数/尺度/独立速度；完整生成链保留无云/无环/无大气和零高光/零Bloom；既有社交/访问控制回归。生产构建通过。
- 使用先前经真实Profile生成的虚构DNA再次运行两个方向，均 `degraded:false`。薄云方向：3200粒子、尺寸37–86、density=-.49；一层小断弧、radius2.14、width.012、speed.006；暖光方向[-.76,.29,.48]、specular.94；Bloom强度.08。厚云方向：6800粒子、尺寸43–103、density=.28、thickness=.098；无环；光向[.79,.24,.36]、specular.32；Bloom强度0。参数来自真实模型，未人工改成演示答案。
- 浏览器核验了实际GPU画面：边界参数无云无环、AI厚云地表与原作精灵云、纯点云裂缝组合、宽丝带以及完整工作室。仅记录完成核验的画面；不宣称稳定60fps或5万粒子性能已压测。开发对照和虚构资料结果仅保存在被Git忽略的.local。
