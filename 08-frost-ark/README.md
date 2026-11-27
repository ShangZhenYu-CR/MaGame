# 08 · 马楠：霜云方舟（Frost Sky Ark）

2D 俯视生存建造沙盒（MaGame 独立云端分支）：融合**云海拾荒移动基地**、**方舟生态驯兽分工**与**暖橙火光 vs 冰蓝暴雪**热力生存。

- **当前阶段**：Bootstrap 起跑线就绪（待 ChatGPT Dot 从 M0 接手开发）
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

## 核心按键（规划）

- `WASD`：移动马楠 / 航图巡航
- `鼠标左键`：使用当前工具、蓄力抛抓钩、建造放置
- `鼠标右键`：取消建造预览 / 快捷交互
- `1–9`：切换快捷栏
- `E`：交互、靠泊登岛、投喂驯兽
- `B` / `C` / `T` / `M`：建造 / 合成 / 驯兽管理 / 云海航图
- `Space`：闪避翻滚
- `Esc`：逐层退栈（取消虚影 → 关浮层 → 暂停）

## 开发与验收命令

```bash
npm install
npm run dev           # 本地热更新开发（打开 /dev.html）
npm run gate:headless # 数据校验 + 类型检查 + 静态构建 + 无头模拟冒烟
npm run gate          # 完整三道门禁（含 Playwright 实机截图验收）
```

> 详细开发方案见 `docs/GDD.md`，Dot 自治铁律见 `DOT_RULES.md`，里程碑清单见 `MILESTONES.md`。
