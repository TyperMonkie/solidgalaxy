# 连续地貌与天气渲染器（2026-10-19）

## 来源与改造

直接适配 [Daniel Greenheck 的 threejs-procedural-planets](https://github.com/dgreenheck/threejs-procedural-planets)，核对版本 `23457d4f8e6bedf22aa266e12c92f850822ff3a4`，MIT。保留完整许可于 `THIRD_PARTY_NOTICES.md`。没有把整个已有项目换名作为 PersonaVerse；复用的是实质性的核心地形和云渲染模块，个人资料理解、结构化编译、角色、星环、社交星图和页面仍由本项目实现。

原先只保留了噪声函数，并把大多数参数写死，三种地貌风格成为主要差异来源。本次恢复原作的 simplex、fractal、ridged 三种噪声基函数及连续幅度、锐度、偏移、尺度、持续度、频率比、层数；同时接入五层海拔颜色、四个分界与融合宽度、实际径向起伏及有限差分凹凸强度/采样距离。它们改变实际位移、海陆分布和表面法线，不只是颜色。

`ProceduralSettings.greenheckTerrain()` 保存原作 main.js 地形默认参数；半径20缩放为1，因此径向比例为 .05。颜色从原作线性RGB转换为本项目十六进制sRGB配置。`greenheck-layers.glsl` 改编原作五层混色。`PlanetMaterial.ts` 将所有控制接入 shader。几何家族枚举保留兼容；有 terrain 对象的新世界统一采用这套连续地貌，tectonic 可叠加裂缝，faceted 可有小型矿物装饰，不再各自强制采用一种写死的地表。

云层继续直接适配原作 `Atmosphere` 的球壳精灵、原始 cloud.png、simplex密度和受光。新增 density、opacity、scale、altitude、thickness、size、particles、speed、drift、color。scale和球壳尺寸按20倍单位转换；size是参考视距下的像素尺寸，粒子实际大小增加视距修正以适配滚轮和社交镜头。云的演化与风向独立于星环流速，全部遵从总暂停。云仍是精灵近似，不是光线步进体积散射。

保留本项目的光照/色调映射、相机、星空与星环，因此“原作参数”恢复的是地形与云配置，不是逐像素复刻原网站。

## 产品集成

- `/?planet-lab=1` 地貌实验室：初始使用原作地貌与云参数。支持同色随机地貌、完整随机参数、算法选择、地貌/天气/色层/自转编辑，以及恢复原作地貌与云参数。
- 工作室右侧“自定义地貌、云海与天气”可编辑当前人的星球。已生成世界的手动修改随现有DNA导出和发布机制保存。修改不改变 DNA.seed，不假称是 AI 自动推断的修改。
- `PlanetCore` 在只改地貌/天气时保留地表缓冲区、符号、镜头和旋转姿态；地表只更新uniform，云配置改变时只重建云资源。暂停使用独立状态，不再改写保存的动画配置。
- 社交远景改用相同地貌材质（低成本网格与层数限制），近景使用完整材质和天气配置，避免靠近时变成另一套条纹球。远景不绘制每颗星球的全部云与装饰。
- 示例居民视觉版本升级为3，仅更新 source=demo 的已知示例；不覆盖AI/工作室星球、帖子或好友关系。

## AI与兼容

能力目录升级为v3；Profile Agent 描述大陆、山地和天气关系；Style Compiler 输出 terrain/weather 的全部字段。严格校验字段、范围、五个颜色、四个分界/融合及资源预算。新编译对象必须显式提供 terrain/weather；旧保存对象可以省略，并保留旧渲染分支/云默认值。新地形的 terrain.relief 是主要起伏控制，旧 geometry.displacement 留作兼容。云500–8000点，Eco最多1800；Eco地形最多6层，其他最多10层。位移另有限幅 .32。

使用固定长度的同类数组，避免 tuple 生成的 prefixItems 被严格 Responses schema 拒绝。实际服务测试发现并修复了此兼容问题，没有用备用预设掩盖错误。

随机功能采样连续参数，而不是选择三个成品。仍是有限数学算法生成的径向地形，不支持任意拓扑、洞穴、任意新模型或无限风格；极端参数会有平坦海面或浓云遮蔽，这也是开放控制的结果。AI生成质量不能仅由参数差异保证。

## 验证

- 27项测试通过，包含旧保存兼容、完整配置JSON往返、新编译字段必填、严格Responses数组兼容、连续参数覆盖、非法参数拒绝与现有社交/访问控制回归。
- 生产构建通过。浏览器实测原作默认地貌/云，完成同seed、同相机姿态、同配色、暂停下的地貌对照：仅 period 从 .29 改为2，呈现群岛与广阔连续陆地；同一地貌 density 在-1与1之间变化，可从云散尽调到厚云覆盖。最终构建的新检查页无浏览器error日志。
- 虚构资料经真实 Profile Agent 后，分别编译“留白的潮线”和“云下连山”，均 degraded:false。前者 simplex / offset -.21 / period1.12 / relief .034 / density -.51 / thickness .029；后者 ridged / offset -.08 / period1.17 / relief .094 / density .11 / thickness .067。证明两阶段链路会选择地貌与天气参数，不能据此宣称所有真实用户都明显不同。
- 本机截图和完整虚构测试结果留在不入Git的 `.local/previews` 与 `.local/procedural-ai-*.json`。本报告不发布凭据或真实个人资料。
