# 公网演示：Cloudflare Quick Tunnel

当前方案通过官方签名的 Windows `cloudflared` 将本机独立演示服务映射为 HTTPS 公网地址，不需要登录 Cloudflare 或购买域名。它同时代理前端与 Node API，因此不是只展示静态页面。

官方说明：https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/trycloudflare/

## 启停

在 `architecture-b` 目录运行：

```powershell
npm run build
./scripts/start-public-demo.ps1
```

启动脚本显示当次地址和体验码。再次运行会复用仍运行的服务和通道。体验码保存在忽略目录 `.local/public-demo-settings.json`，不会写入网页或仓库；运行地址和进程号保存在 `.local/public-demo-runtime.json`。官方程序下载到 `.local/tools/`，启动前验证 Cloudflare Authenticode 签名。后台进程使用隐藏窗口。

修改代码后的发布更新：

```powershell
npm run build
./scripts/restart-public-server.ps1
```

只重启服务，不更换通道地址；因为会话签名密钥重置，访客需要重新输入体验码。首次公网链接生效前可能需要几秒连接 Cloudflare 边缘。

结束公网访问：

```powershell
./scripts/stop-public-demo.ps1
```

停止脚本核对进程命令和路径，只停止本项目的公开演示服务与通道，保留原本4173端口的本地工作室和两份数据。

## 访问与数据

- 所有人可查看星图、星球和演示帖子。AI生成、生图、付费语义搜索、发帖、点赞、修改资料与好友写入均由 API 的统一入口要求体验码。
- 解锁使用12小时 HttpOnly / Secure / SameSite=Strict 签名会话 Cookie；不把体验码放入前端 bundle 或 localStorage。限制错误解锁尝试；公开来源通过当次精确 HTTPS origin 放行。
- 公开服务只监听127.0.0.1:4183，由 Cloudflare 出站隧道访问，不开放路由器端口。原本本地服务继续使用4173。
- `.local/public-social-universe.json` 是独立持久化演示数据，初次运行使用虚构种子；不会复制本地 `.local/social-universe.json`。公开演示中的帖子对其他访客可见。
- 这是共享示例身份体验，不是每位访客独立注册的账号体系；持有体验码者能切换示例身份并编辑共享演示内容。真实用户认证、个人权限隔离和生产部署仍需另外建设。
- 服务端继续读取已有本机 provider 配置。API凭据没有传给 Cloudflare配置、前端或仓库；只有后端向已配置的模型服务发出调用。体验码持有人发起的AI调用仍会消耗该后端额度。

## 临时域名与固定域名

Quick Tunnel 提供随机的 `*.trycloudflare.com` 域名，停止并重新创建通道通常会更换地址，不支持在这个免账号模式中挑选域名，也没有可用性保证。这台电脑断网、休眠、关机或停止服务时，网站不可用。

需要长期固定地址时，可在拥有域名的 Cloudflare 账号中创建命名 Tunnel，为如 `planet.example.com` 的自有子域名配置公开 hostname，继续指向本机4183端口，并将精确地址加入 `PERSONAVERSE_PUBLIC_ORIGINS`。电脑仍需常开。若要与电脑无关地持续在线，应把 Node 服务、服务端环境变量、持久数据卷一起部署到云主机，再绑定域名；仅上 Cloudflare Pages 静态目录不足以保留当前 API 与 JSON 持久化功能。

## 本次验证

2026-10-18：通过实际 Cloudflare HTTPS 地址访问首页、读取星图、解锁会话并执行真实语义搜索；未解锁的生成返回401，已解锁的无效帖子返回422，证明写入前有会话校验且解锁后能到达原数据验证。未为测试发布新帖子。构建与24项测试通过，新增覆盖写接口统一拦截、签名篡改拒绝、会话重置、Secure Cookie、错误码限流和跨域拒绝。没有通过手机蜂窝网络作独立地域测试，不能据此保证所有地区网络均可访问。
