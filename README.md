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

首页直接输入个人描述，依次调用 Profile Agent 和 Style Compiler，展示个人标签、标签含义、专属视觉方向和动态星球。内部三种几何家族保留为编译模块，不再展示固定的 NEBULA / FRACTURE / CRYSTAL 选择入口。旧 preset/compare 查询参数不再控制首页，也不会意外暂停动画。

点击“还想加入音乐、兴趣或图片”补充内容；生成后可查看每个标签、切换同一 DNA 的候选视觉方向、修正描述和素材、保存 DNA / RenderSpec 与画面。素材保留在当前页面内存中，首页修改描述重新生成时也保留已补充的兴趣、音乐和图片；刷新即清空。音频、视频帧分析不在实现范围内。

支持拖动环绕、滚轮缩放、暂停、重置、沉浸查看与独立的流雾 / 星带 / 大气开关。星球自动自转，连续星带分层反向移动并缓慢进动；表面薄雾使用受光的多尺度透明网格壳，不是体积流体。空格切换暂停；Esc 退出沉浸视图。尊重系统的减少动态效果偏好。尚未输入描述时，示意星球明确标注为未解读用户。

服务端默认读取当前用户的 `~/.codex/config.toml`，使用选中的 provider 的 `base_url` 和 `experimental_bearer_token`，固定使用用户指定的 `gpt-6-sol`，不改 Codex 的模型设置。也可通过 `PERSONAVERSE_API_KEY`、`PERSONAVERSE_BASE_URL`、`PERSONAVERSE_MODEL` 或 `PERSONAVERSE_CODEX_CONFIG` 环境变量覆盖。密钥不进入客户端。

- [完整产品与 AI 链路](docs/PRODUCT_ARCHITECTURE.md)
- [实现、资源出处、验证与限制](docs/IMPLEMENTATION_REPORT.md)
- [对比截图方法](docs/COMPARISON.md)
- [Profile Agent 提示词](server/prompts/profile-agent.md)
- [Style Compiler 提示词](server/prompts/style-compiler.md)
- [第三方许可证](THIRD_PARTY_NOTICES.md)

`npm test` 运行本地契约测试，不调用 LLM。`npx tsx server/smoke.ts` 会实际调用配置的 provider，两阶段使用虚构资料，结果保存到 `docs/ai-smoke-result.json`。
