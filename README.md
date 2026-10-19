# PersonaVerse · Architecture B

通过个人描述生成动态标签星球，并在社交宇宙里探索共鸣的产品原型。当前实现全部放在本目录，没有覆盖 Architecture A。

```powershell
cd D:\dotless\architecture-b
npm install
npm run dev
```

开发地址：http://127.0.0.1:5173 。生产版（同时提供 AI 接口）：

```powershell
npm run build
npm start
```

生产地址：http://127.0.0.1:4173 。`npm run preview` 仅预览静态文件，不提供 AI 接口。

首页现在是社交宇宙：滚轮在近景 3D 与正交俯视星图间平滑过渡，拖动与惯性边缘平移探索居民；搜索自然语言会定位匹配的星球。查看共鸣信息、建议开场白、互发好友请求，或进入贴近地表的朋友圈。17 位示例居民、介绍与初始帖子均明确标注为虚构。右上角可以切换本机演示身份，体验对方接受请求，未实现真实账号、跨设备登录或在线多人服务。

朋友圈文本、照片、点赞、好友关系和发布后的星球保存在服务端 `.local/social-universe.json`，刷新与重启后保留；该目录不进 Git。发帖先独立保存，再调用 Profile Agent、Style Compiler 和语义坐标解读更新星球。失败保留原星球，提供重试；分析期间出现新帖会放弃过期结果。光年是三个创意语义维度在场景中的虚拟距离，共鸣指数随距离单调下降，并非真实天文距离或心理测量。示例坐标是手工演示值，成功发布/更新后的坐标才来自 AI。详见 [社交宇宙实现说明](docs/SOCIAL_UNIVERSE.md)。

「星球工作室」保留三类素材面板：自述/帖子、兴趣/音乐、图片/视频元数据/他人视角，依次调用 Profile Agent 和 Style Compiler，展示个人标签、专属视觉方向、动态星球与个性化奶蛙。支持填入虚构示例，用于演示。内部三种几何家族保留为编译模块，不再展示固定的 NEBULA / FRACTURE / CRYSTAL 选择入口。生成后点击「发布到宇宙」保存世界与 DNA；工作室尚未发布的输入草稿仍只存在页面内存。

三类素材可随时切换。生成后可查看标签、切换同一 DNA 的候选视觉方向、修改素材后重新生成，保存或导入 DNA / RenderSpec 与画面。已发布的 DNA 会在重新打开工作室时恢复，输入草稿与尚未发布的修改不会恢复。音频、视频帧分析不在实现范围内。

奶蛙使用用户提供的透明原图，LLM 在验证目录中组合服饰、单件配件和一个文字名牌；保留原图姿态，不生成任意 3D 模型或新姿势。配件支持吉他、耳机、相机、书、手柄；名牌可使用 DNA 中保留的真实输入乐队名。奶蛙随地表转动、始终朝向镜头，背面被星球遮挡；点击角色或“认识这只奶蛙”查看装扮含义。

丰富素材通常生成 6–8 个带含义与来源的小符号（最多 10 个），最多 3 个在奶蛙附近，其余按最小间距分布到不同经纬度。符号使用对比色图标牌，点击或从“小发现”列表选择可看清完整解释，列表选择还会自动转到相应视角。支持保存与导入当前版本 DNA，比赛演示可重复加载已生成结果。历史版本 JSON 不保证兼容。

已接入独立的角色生图流程：星球先完成，随后将完整 DNA 的气氛、主题、矛盾与角色概念交给图片服务，绘制不同姿态和服饰的奶龙。生成 PNG 使用纯绿色背景，客户端色键处理后替换地表角色，保持原有点击解释和名牌。图片服务失败会明确显示备用装扮，绝不把原图组合标作生图成功。当前配置的图片服务真实调用未成功返回图片，尚无成功生图示例。

图片服务默认复用文本服务地址和凭据，模型为 `gpt-image-2`；可单独设置 `PERSONAVERSE_IMAGE_API_KEY`、`PERSONAVERSE_IMAGE_BASE_URL`、`PERSONAVERSE_IMAGE_MODEL` 后重启。只接受标准 `/images/generations` 的 PNG base64 返回。图片缓存在未提交的 `.cache/mascots/`，DNA 导出的图片引用仅能在保有该缓存的服务器上恢复。角色生成有 45 秒超时及独立并发限制，不阻塞主星球。

支持拖动环绕、滚轮缩放、暂停、重置、沉浸查看与独立的云层 / 星带 / 大气开关。云层直接适配参考站 Greenheck Atmosphere 及原始 cloud.png；编译器可选择多层流光丝带、星尘轨道、分离短断弧或多边形折角光轨。星球的突起形态、颜色与材质也随 RenderSpec 变化；提示词要求不同方向在地貌、光影、空间层次与运动上作可见区分。深空背景含星点与远景行星。粒子只承担云层与轨道装饰，主表面仍为几何地形。空格切换暂停；Esc 退出沉浸视图，尊重系统减少动态偏好。

服务端默认读取当前用户的 `~/.codex/config.toml`，使用选中的 provider 的 `base_url` 和 `experimental_bearer_token`，固定使用用户指定的 `gpt-6-sol`，不改 Codex 的模型设置。也可通过 `PERSONAVERSE_API_KEY`、`PERSONAVERSE_BASE_URL`、`PERSONAVERSE_MODEL` 或 `PERSONAVERSE_CODEX_CONFIG` 环境变量覆盖。密钥不进入客户端。

- [完整产品与 AI 链路](docs/PRODUCT_ARCHITECTURE.md)
- [实现、资源出处、验证与限制](docs/IMPLEMENTATION_REPORT.md)
- [对比截图方法](docs/COMPARISON.md)
- [Profile Agent 提示词](server/prompts/profile-agent.md)
- [Style Compiler 提示词](server/prompts/style-compiler.md)
- [社交坐标解读提示词](server/prompts/social-signature.md)
- [语义导航提示词](server/prompts/social-navigation.md)
- [第三方许可证](THIRD_PARTY_NOTICES.md)

`npm test` 运行本地契约测试，不调用 LLM。`npx tsx server/smoke.ts` 会实际调用配置的 provider，两阶段使用虚构资料，结果保存到 `docs/ai-smoke-result.json`。


### 连续地貌与天气（2026-10-19）

导航中的「地貌实验室」打开 `/?planet-lab=1`，直接使用 Greenheck 原作地貌与云参数起步。支持海陆/山脉/五层海拔颜色、云浓淡/厚度/风向等实时编辑、同色随机地貌和自由参数生成；工作室也提供相同编辑器。新AI编译输出同样的 terrain/weather 配置，三个旧风格枚举保留兼容，不再限制为三个固定地表。来源、实际复用范围、兼容与验证见 [连续渲染器说明](docs/PROCEDURAL_RENDERER.md)。

## 2026-10-19：完整个性化渲染输入

参考原作界面的全部地形、五层配色、云粒子数量/独立大小/浓淡、光照/高光/方向/颜色、Bloom 控制已接入严格 RenderSpec；加入可调点云/丝带/断弧/多边形星环的尺寸、形态与独立运动，以及原有七轴裂缝。所有新 AI 输出显式给出参数和模块有无。主工作室保留分类输入与性格解读，手动控制移入可选微调面板。完整参数映射、兼容说明和真实模型验证见 [PROCEDURAL_RENDERER](docs/PROCEDURAL_RENDERER.md)。29项测试通过。
