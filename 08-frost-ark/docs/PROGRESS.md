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
