# 08 · 马楠：霜云方舟（Frost Sky Ark）

2D 俯视生存建造沙盒（MaGame 独立云端分支）：融合**云海拾荒移动基地**、**方舟生态驯兽分工**与**暖橙火光 vs 冰蓝暴雪**热力生存。

- **当前阶段**：M0 已交付，等待截图验收；M1 未开始
- **GitHub 分支**：[`game/08-frost-ark`](https://github.com/ShangZhenYu-CR/MaGame/tree/game/08-frost-ark)
- **项目目录**：[`08-frost-ark/`](https://github.com/ShangZhenYu-CR/MaGame/tree/game/08-frost-ark/08-frost-ark)
- **Google Drive 总目录**：[`MaGame-Dot/08-frost-ark`](https://drive.google.com/drive/folders/16oAjTkGj8PJpr86Cg5QJbPjgwLXsb6cV)

## 云端验收与备份路径（Google Drive）

| 目录 | 用途 | 链接 / Folder ID |
|---|---|---|
| `00-计划与日志` | 完整策划案、交接手册与 `PROGRESS.md` | [打开目录](https://drive.google.com/drive/folders/15KrNm01arotqhZao80dhQTPxua1OIwlF) (`15KrNm01arotqhZao80dhQTPxua1OIwlF`) |
| `01-实机截图验收` | 按 `M0`–`M6` 存放 Playwright 实机截图 | [打开目录](https://drive.google.com/drive/folders/151g3MrQbOc6k7VSSz8njvjmhf8TyWg6e) (`151g3MrQbOc6k7VSSz8njvjmhf8TyWg6e`) |
| `02-验收与测试报告` | 数据校验与无头模拟报告 | [打开目录](https://drive.google.com/drive/folders/1eS2pOUBHwLnOlAuoSahxX5IYSnoO5AA5) (`1eS2pOUBHwLnOlAuoSahxX5IYSnoO5AA5`) |
| `03-里程碑试玩包` | 每个里程碑的静态构建包 `frost-ark-M*.zip` | [打开目录](https://drive.google.com/drive/folders/1Rl-zugEXgZ6HOpzUboBqn0VB7Eu2fkoX) (`1Rl-zugEXgZ6HOpzUboBqn0VB7Eu2fkoX`) |

## M0 · 第一次开船

- **WASD** 移动；甲板边缘会阻止坠落。
- **Q** 切回抓钩。向云海按住左键预瞄、蓄力，松开抛钩。够不到就等残骸漂近一点。
- **1** 选甲板。在现有甲板直边看见松青虚影后点左键拼接。
- **I** 打开背包并手制火把；**2** 选择火把，左键放到空甲板上。
- **Esc** 先关背包，再退回抓钩。进度存到当前浏览器，也可在背包导出或导入 JSON。
- 如从 ZIP 试玩，解压后在同时包含 `08-frost-ark/` 和 `assets/` 的目录运行 `python -m http.server 8000`，访问 `http://localhost:8000/08-frost-ark/`。不要双击 HTML；浏览器需通过 HTTP 加载游戏模块。标题状态卡读取同级共享资产中的原头像。

## 开发与验收命令

```bash
npm install
npx playwright install chromium
npm run dev           # 本地热更新开发（打开 /dev.html）
npm run gate:headless # 数据校验 + 类型检查 + 静态构建 + 无头模拟冒烟
npm run gate          # 完整三道门禁（含 Playwright 实机截图验收）
```

> 详细开发方案见 `docs/GDD.md`，Dot 自治铁律见 `DOT_RULES.md`，里程碑清单见 `MILESTONES.md`。
