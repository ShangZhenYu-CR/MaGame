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
