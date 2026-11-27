# 08 · 马楠：霜云方舟（Frost Sky Ark）

2D 俯视生存建造沙盒（MaGame 独立云端分支）：融合**云海拾荒移动基地**、**方舟生态驯兽分工**与**暖橙火光 vs 冰蓝暴雪**热力生存。

- **当前阶段**：M3 · 云海航图与浮岛远征（专用分支与试玩 ZIP）；公开 Pages 仍为 M1
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
- 走到储物箱旁按 **E**，可存取物品；箱内物品会随自动存档和 JSON 一起保存。
- **I** 打开背包并手制火把；**2** 选择火把，左键放到空甲板上。
- **Esc** 先关背包，再退回抓钩。进度存到当前浏览器，也可在背包导出或导入 JSON。
- **ZIP 试玩**：把整个 ZIP 解压，再双击 `08-frost-ark/index.html`。不用启动服务器，也不用装 Python。请保留解压后的目录结构，左上角头像从同级共享资产目录读取。旧的 HTTP 存档和双击打开的本地存档不一定共用；可用背包中的 JSON 导入导出迁移。
- [GitHub 在线构建和产物](https://github.com/ShangZhenYu-CR/MaGame/actions/runs/45956832321)：Actions 只在专用分支构建；从 Artifacts 下载安装包，和现有 GitHub Pages 发布互不影响。

## M1 · 过一夜

- 到了暴雪夜，甲板边角会失温，主炉边能回温；体温耗尽会开始掉生命。
- **3** 放挡风墙，**R** 在主炉附近添柴。**U** 用 4 块浮木板和 2 件冻铁废件升级主炉，拿铁会拾回暖区里的掉落物。可用 **G** 放下一块浮木观察，**F** 手动拾回。
- [直接在线玩](https://shangzhenyu-cr.github.io/MaGame/08-frost-ark/) · [M1 实机及同机位美术对比](https://drive.google.com/drive/folders/1Qwbi4tatTt1NeoD4XY7iigwhLU-aUXIl)。

## M2 · 把方舟建成工坊

- **B** 打开建造手册。先建木工台，走近按 **E** 研究；把鼠标移到甲板格，吸附虚影会显示占位。浮力不足时不能继续加重。
- 把捕捞网栏放在靠云海的外缘，分拣臂放在三格内，走近按 **E** 收取自动打捞的材料。熔炉、灶台和温室也用 **E** 打开加工界面。
- 热力中继塔会延伸暖区；设备太冷会减速或停机。基础炼铁需要的煤可从漂流残骸中得到。
- **X** 切换拆除，点选格子后 **Z** 在 4 秒内撤销，期间可继续走动。**M** 静音；**Esc** 先关当前工艺窗口，再退出建造或拆除。

[M2 实机验收与试玩目录](https://drive.google.com/drive/folders/1LuNdwPYSwB_tJYCJqgd6r6CT9FT4bfYp)。

## M3 · 开船去浮岛

- **N** 打开航图。走到方舟北侧的舵轮旁，选目的地并设为航向，按 **E** 起航或停止。方舟驶入靠泊范围会自动靠泊。
- 到右舷船边按 **E** 搭跳板，用 **WASD** 沿板走上浮岛；原路走回，不需要切换场景。离港前先收起跳板。
- **I** 打开背包制作手斧或矿镐。走近树木、矿脉或遗迹箱按 **E** 采伐、开采或开箱。损坏工具可修理，也可用霜铁升级。已经收集的矿和箱不会因离岛或重开存档而刷新。
- [M3 实机验收与试玩目录](https://drive.google.com/drive/folders/1TflYR2toV2rMVukhcDUTYSN3H4KT-9jD)。

## 开发与验收命令

```bash
npm install
npx playwright install chromium
npm run dev           # 本地热更新开发（打开 /dev.html）
npm run gate:headless # 数据校验 + 类型检查 + 静态构建 + 无头模拟冒烟
npm run gate          # 完整三道门禁（含 Playwright 实机截图验收）
```

> 详细开发方案见 `docs/GDD.md`，Dot 自治铁律见 `DOT_RULES.md`，里程碑清单见 `MILESTONES.md`。
