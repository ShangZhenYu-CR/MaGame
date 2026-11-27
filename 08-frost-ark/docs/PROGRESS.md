# 《马楠：霜云方舟》进度与偏离日志

## 2026-11-27 · Bootstrap 起跑线就绪（架构侧）
- **已完成**：
  - 基于 `origin/main` 创建独立分支 `game/08-frost-ark`，未触碰 `main` 与 `01–07` 目录。
  - 搭建 `08-frost-ark/` 四层目录骨架、`src/sim/types.ts` 状态契约、初始 JSON 数据表、色板常量与三道门禁脚本（`check-data`、`sim-smoke`、`e2e-visual`）。
  - 创建 Google Drive 双轨验收目录 `MaGame-Dot/08-frost-ark/`（ID: `16oAjTkGj8PJpr86Cg5QJbPjgwLXsb6cV`）及 4 个子目录。
- **下一步**：交由 ChatGPT Dot 直接启动 `M0 · 骨架与最小可玩闭环`。
- **偏离报告**：无偏离。

## 2026-11-27 · M0 已交付，等待截图验收

- **可以玩到**：在 7×7 浮石木甲板上移动，边缘不会踩空。瞄准云海中的木箱、冻铁或缆绳，按住左键蓄力、松开抓钩，拉回后进背包。用浮木接出新地板，在背包手搓并放下防风火把。
- **门禁**：数据、类型、静态构建、确定性模拟、Playwright 实机全部通过（Chromium 控制台与页面异常均为 0）；原断言未删改。实机验证 IndexedDB 刷新后读回搭建结果，JSON 导出含新甲板和火把，合法导入可用，坏档不会覆盖进度。三张 1280×720 截图已逐张查看，无黑屏、重叠，冷暖清晰。
- **交付**：[M0 三张截图](https://drive.google.com/drive/folders/1kaJjzAQi4XdaCETR-2N0NolvKRlqld38) · [测试报告](https://drive.google.com/file/d/1bUIr0qepuPmwH0MXHWMLJB3nkyjEdk2t/view) · [试玩 ZIP](https://drive.google.com/file/d/1DY7y7GlZkKPo0-XpvR6Gyt7nPdpaKP7D/view)。代码验收版本：`df39b9cfd2cafda88456bf2bd5d8c4768eafad95`。
- **偏离报告**：云端 Git CLI 无登录，改由 GitHub 连接在同一目标分支小步提交并逐次回读。原 Playwright 下载地址返回 403，改从 Chrome for Testing 官方源安装同版 headless Chromium；测试脚本改用 `node --import tsx` 绕开启动器 IPC，断言不变。ZIP 额外包含一份只读原头像以保持指定相对路径可用，未改源资产。开局储物箱是场景设施，M0 未加存取交互。未开始 M1。

## 2026-11-27 · M0 角色升级和储物箱补齐

- 马楠改为原生 64×64 像素帧，四向各有待机和 4 张步态帧，共 20 张。以原设定的寸头、炭黑连帽外套、浅色鞋和暖色提灯重绘，HUD 头像保持只读原图。
- 走到储物箱旁按 E 或点击箱子即可存取。箱内物品随刷新和 JSON 恢复；旧 M0 存档兼容，未改锁定的核心类型。
- `npm run gate` 通过。浏览器零报错，补测储物存取、刷新和 JSON 回读；原有断言未删改。解压试玩 ZIP 后重新走完同一套浏览器验收。已逐张查看 4 张实机截图和角色逐帧图；测试版本 `635f20631d27d36d76610902e9be7c0cd8e5486a`。
- [最新验收图](https://drive.google.com/drive/folders/1kaJjzAQi4XdaCETR-2N0NolvKRlqld38) · [角色逐帧图](https://drive.google.com/file/d/1VhuswPY66WGHNdiKmgIaGHbb27FuV71d/view) · [更新试玩包](https://drive.google.com/file/d/1DY7y7GlZkKPo0-XpvR6Gyt7nPdpaKP7D/view)。
- **偏离报告**：上一版的储物箱交互缺口已补齐。仍按已验证的云端提交和 Chromium 路径交付，未改项目外文件，无新增功能偏离。M0 开发验收通过，等待玩家确认，未开始 M1。

## 2026-11-27 · 双击白屏修复与 GitHub Actions 在线构建

- 复现：旧构建双击 HTML 时，浏览器拒绝本地跨来源 JS/CSS，只剩未加载样式和脚本的白底内容。修复后完整解压即可双击 `08-frost-ark/index.html`，无需 Python 或本地服务器。
- 门禁通过；对新 ZIP 解压后的主入口和 `dist/index.html` 逐个跑通抓钩、建造、储物和存档实机回归；已查看并上传第 6 张本地双击开局截图。
- [GitHub Actions 在线构建](https://github.com/ShangZhenYu-CR/MaGame/actions/runs/45956832321) 已成功（构建提交 `3a9d058a443a113482565169c062ba63e7b8e748`）；已产出 `frost-ark-playtest` 和实机截图。Drive 上同一试玩包链接已替换为可双击的修正版。
- **偏离报告**：此前门禁只测了 HTTP，现已把双击启动检查加入门禁。为响应在线构建，在专用分支新增一份 GitHub Actions 配置（GitHub 规定路径为 `.github/workflows/`）；不写 `main`，不更改现有 Pages 发布或共享资产。M1 未开始。

## 2026-11-27 · M1 冷暖生存与开局美术

- 保持原队列，完成 4 Hz 热扩散、可建挡风墙、昼／黄昏／暴雪夜、体温与生命、四张头像、1/4 冷暖光照、风雪火星、拿铁情绪以及二级炉暖区拾取。
- 开局采用分层程序化云海、带厚度浮石和木板纹理、炉门和火焰、三类有独立轮廓的漂流残骸；马楠仍为原生 64×64 并补了衣褶、鞋带与头发细节。不改原四张头像和共享素材。
- 同机位、同原生 1280×720 计算及同游戏缩放对比开局白昼和夜间；M0 夜间基线没有独立夜间美术，仍用相同夜间时段的 M0 画面，不后期造雪。[M1 验收图](https://drive.google.com/drive/folders/1Qwbi4tatTt1NeoD4XY7iigwhLU-aUXIl) · [试玩 ZIP](https://drive.google.com/file/d/1zK_fdQnU7cTU__9MRVoJjlGwC1X7GWpB/view)。
- 本地及 [GitHub Actions](https://github.com/ShangZhenYu-CR/MaGame/actions/runs/45959659072) 门禁通过，保留既有测试。独立解压 ZIP 经 `file://` 走完试玩，四张头像均真实解码。当前代码验收 `fd6d263`。
- 【偏离报告】无功能删减。为保证 M1 的表情都能在离线包使用，发布包和 CI 的独立解压门禁加入其余三张共享头像的只读原件；源码仍在专用分支，Pages 只更新已授权游戏目录。M2 等待用户确认。

## 2026-11-27 · M1.5 精绘资产与视觉验收

- M1 功能已由用户确认；本轮只改美术、表现与界面。代码提交 `a0762114d307a578b65fd2a4b93665e75ffe620e`，仅更新专用分支 `game/08-frost-ark`；`main` 和线上版保持 M1，M2 暂停。
- 实测认证 ImageGen 可用，精绘入库 33 件（含四向马楠、拿铁三状态、两级主炉、舰体构件、残骸、云海与图标），合计 685,852 B；生图原图不入 Git。统一输出画布与锚点，洋红去背/净边/压缩均有测试。首轮图标版面在审片发现过小，已重新校准锚点并重新审过，未把有问题的版本接入。
- 调整为 64 px/格（1280×720 时），滚轮 44–80 px/格；实装护栏、包角、锥形浮石与冰凌、热力霜、接触影与 Y 排序、冷暖光与风雪、失温霜花、顶部短 Toast、角标图标和三条生存条。
- `npm run gate` 通过；既有 M0/M1 功能断言没有删减。HTTP 与独立解压后两种 `file://` 入口全流程通过，四张共享头像原件随 ZIP 提供。新增素材全部解码且图标有可见内容；游戏执行时无生图／Python／网络依赖。Vite 对内联资源给出体积提示，压缩试玩 ZIP 为 4,053,458 B。
- [5 张验收图](https://drive.google.com/drive/folders/1Y9GcHtY3QGDTbozvFRQU6CpN65Oo0vZ_) · [同场景对比](https://drive.google.com/file/d/1X_R-MZqFZjSvT74mH9uowDDzgJss096m/view)（两侧原始分辨率均为 1280×720，标注默认镜头差异） · [试玩 ZIP](https://drive.google.com/file/d/14rR9zINYfPzMfPJn-9BpqKYg3u_XPqEI/view) · [GitHub 构建记录](https://github.com/ShangZhenYu-CR/MaGame/actions/runs/45965196847)。

## 2026-11-27 · M2 建造科技树与自动化拾荒

- 用户确认 M1.5 美术验收。M2 开工先修五项：纵向专用护栏与薄木侧舷、锥石与冰凌只挂底缘；漂流物在船体下方合成并用云雾轻融；拿铁缩至约 65%、残骸约 75%；规则六角改成透明精绘自然冰纹；加强暴雪风丝与炉火火星。
- 可以从木工台研究，按浮力预算造网栏、分拣臂、熔炉、灶台、热力中继塔、温室、保温墙、浮力核心和铁甲板。网栏拦漂流物，附近分拣臂自动收取；在加工设备查看耗材、进度与产出。热力扩展、结冻停机、2×2 温室占地、4 秒不打断移动的撤销及跨存档恢复可验证。
- `B` 建造手册、`E` 使用设备、`X` 拆除、`Z` 撤销、`M` 静音。带延迟／预热的提示、逐层 Esc、等宽读数与精绘物品图。
- 43 项新增 ImageGen 成品（3 项画面修整、10 张建筑、30 枚图标）；连同基线共 76 件、1,172,625 B。分批在浅棋盘与深冰蓝底审核，旧清单条目保留，未把生图原件入库。
- 通过 `npm run gate`、3 项美术管线测试、HTTP 全流程、两种 `file://` 入口启动，以及使用交付 ZIP 干净解压后双击 `08-frost-ark/index.html` 的全流程实机。保留原有断言，无浏览器报错。用户可先看 [M2 验收目录](https://drive.google.com/drive/folders/1LuNdwPYSwB_tJYCJqgd6r6CT9FT4bfYp)，或下载 [M2 试玩 ZIP](https://drive.google.com/file/d/1ANdChtWf2BeQ7FK6JFyaMzULNnA4dLTY/view)。源码 `18fdf43`，静态入口 `272b1ce`。
- 【偏离报告】云端曾重连并回退工作树，源码已按原改动恢复，三批生成美术用原提示词重生、重审，已用匹配成品的审片图覆盖旧截图；没有功能降级。只提交 `game/08-frost-ark` 的游戏目录，不改 `main`、其他游戏或共享资产。等待 M2 验收，不启动 M3。
