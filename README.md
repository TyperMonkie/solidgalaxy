# PersonaVerse · Architecture B

通过个人描述生成动态标签星球的初版产品。当前工作区原本为空，全部实现放在本目录，没有覆盖 Architecture A。

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

首页通过三类素材面板输入自述/帖子、兴趣/音乐、图片/视频元数据/他人视角，依次调用 Profile Agent 和 Style Compiler，展示个人标签、专属视觉方向、动态星球与一只个性化奶蛙。支持一键填入虚构示例，用于比赛演示。内部三种几何家族保留为编译模块，不再展示固定的 NEBULA / FRACTURE / CRYSTAL 选择入口。

三类素材可随时切换，已填内容保留在当前页面内存中。生成后可查看标签、切换同一 DNA 的候选视觉方向、修改素材后重新生成，保存 DNA / RenderSpec 与画面。刷新即清空。音频、视频帧分析不在实现范围内。

奶蛙使用用户提供的透明原图，LLM 在验证目录中组合服饰、单件配件和一个文字名牌；保留原图姿态，不生成任意 3D 模型或新姿势。配件支持吉他、耳机、相机、书、手柄；名牌可使用 DNA 中保留的真实输入乐队名。奶蛙随地表转动、始终朝向镜头，背面被星球遮挡；点击角色或“认识这只奶蛙”查看装扮含义。

丰富素材通常生成 6–8 个带含义与来源的小符号（最多 10 个），最多 3 个在奶蛙附近，其余按最小间距分布到不同经纬度。符号使用对比色图标牌，点击或从“小发现”列表选择可看清完整解释，列表选择还会自动转到相应视角。支持保存与导入当前版本 DNA，比赛演示可重复加载已生成结果。历史版本 JSON 不保证兼容。

当前角色仍为确定性的图层组合，尚未接入真正的图像生成。未来可将角色合成器替换为“原图参考 + DNA 装扮说明 → 透明角色图”的生图模块，继续使用同一个地表锚点与点击解释；世界符号的分布不依赖生图。

支持拖动环绕、滚轮缩放、暂停、重置、沉浸查看与独立的云层 / 星带 / 大气开关。云层直接适配参考站 Greenheck Atmosphere 及原始 cloud.png；星环可切换透明细丝带和稀疏点状轨道，粒子只承担云层与轨道装饰。星球主表面仍为几何地形。空格切换暂停；Esc 退出沉浸视图，尊重系统减少动态偏好。

服务端默认读取当前用户的 `~/.codex/config.toml`，使用选中的 provider 的 `base_url` 和 `experimental_bearer_token`，固定使用用户指定的 `gpt-6-sol`，不改 Codex 的模型设置。也可通过 `PERSONAVERSE_API_KEY`、`PERSONAVERSE_BASE_URL`、`PERSONAVERSE_MODEL` 或 `PERSONAVERSE_CODEX_CONFIG` 环境变量覆盖。密钥不进入客户端。

- [完整产品与 AI 链路](docs/PRODUCT_ARCHITECTURE.md)
- [实现、资源出处、验证与限制](docs/IMPLEMENTATION_REPORT.md)
- [对比截图方法](docs/COMPARISON.md)
- [Profile Agent 提示词](server/prompts/profile-agent.md)
- [Style Compiler 提示词](server/prompts/style-compiler.md)
- [第三方许可证](THIRD_PARTY_NOTICES.md)

`npm test` 运行本地契约测试，不调用 LLM。`npx tsx server/smoke.ts` 会实际调用配置的 provider，两阶段使用虚构资料，结果保存到 `docs/ai-smoke-result.json`。
