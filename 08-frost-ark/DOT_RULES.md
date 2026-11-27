# ChatGPT Dot 执行铁律（`08-frost-ark`）

每次开始新任务或恢复会话时，先读本文件与 `MILESTONES.md`。

## 1. 远端路径与边界红线（唯一真相源）

- **GitHub 仓库**：`https://github.com/ShangZhenYu-CR/MaGame.git`
- **唯一工作分支**：`game/08-frost-ark`（URL: `https://github.com/ShangZhenYu-CR/MaGame/tree/game/08-frost-ark`）
- **Google Drive 镜像根目录**：`MaGame-Dot/08-frost-ark/`（ID: `16oAjTkGj8PJpr86Cg5QJbPjgwLXsb6cV`，URL: `https://drive.google.com/drive/folders/16oAjTkGj8PJpr86Cg5QJbPjgwLXsb6cV`）
  - `00-计划与日志`：`15KrNm01arotqhZao80dhQTPxua1OIwlF`
  - `01-实机截图验收`：`151g3MrQbOc6k7VSSz8njvjmhf8TyWg6e`
  - `02-验收与测试报告`：`1eS2pOUBHwLnOlAuoSahxX5IYSnoO5AA5`
  - `03-里程碑试玩包`：`1Rl-zugEXgZ6HOpzUboBqn0VB7Eu2fkoX`
- **绝对禁区**：
  - 严禁向 `main` 分支推送或合并。
  - 严禁修改 `01-*` 至 `07-*`、仓库根目录 `index.html`、`assets/` 下的任何文件。
  - 马楠 4 表情头像仅以只读相对路径引用：`../assets/character/head-0.png ~ head-3.png`。
  - 所有源码与产物严格限定在 `08-frost-ark/` 内；构建后必须同步提交 `08-frost-ark/index.html` 与 `08-frost-ark/dist/`（确保 GitHub Pages 静态直开）。

## 2. 严禁降级与假完工

- 严禁擅自缩水或降级三大核心支柱：
  1. 云海抓钩拾荒 + 模块化移动方舟扩建 + 航图登岛
  2. 实时二维热力场 + 挡风隔热 + 1/4 Lightmap 暖橙火光 vs 冰蓝暴雪 + 大寒潮
  3. 7 种生态云兽驯服 + 暖区兽窝打工/随行分工 + 小猫拿铁晴雨表/拾取
- 严禁通过删除/弱化 `scripts/check-data.ts`、`scripts/sim-smoke.ts`、`scripts/e2e-visual.ts` 的校验断言来让门禁变绿；新里程碑只能**追加**断言。
- **同一报错最多自修 3 轮**：3 轮未解决立即停止空耗额度，如实汇报卡点、尝试过的方案及可选路径，等待人类拍板。

## 3. 代码风格与审美纪律

- `src/` 游戏代码力求简洁直白：不写冗余工厂层、不写吞错的宽泛 `try/catch`（报错直接暴露）、不为假设的未来需求写冗余配置分支。
- 严格遵守四层解耦：`src/data/`（纯 JSON）→ `src/sim/`（零 DOM/Canvas 依赖）→ `src/render/`（只读状态，程序化像素图集 + 1/4 Lightmap）→ `src/ui/`（极简暗石板 HUD）。
- 视觉硬红线：
  - 严禁纯黑 `#000000` 铺底（用 `#0C1520` / `#152436` 深邃冰蓝石墨）；
  - 严禁蓝紫/青紫渐变、霓虹外发光与用 Emoji 当 UI 图标；
  - 所有温度、燃料、倒计时、资源数强制使用等宽字体 + `font-variant-numeric: tabular-nums`；
  - 严格实现 `Esc` 逐层退栈、按钮热区 `>= 28px`、建筑预览虚影和 4 秒无打断拆除撤销条。

## 4. 防丢盘提交与双轨同步节奏

1. **小步勤推**：每完成 1 个子任务立刻 `git commit && git push origin game/08-frost-ark`，禁止把未推送改动留在 Dot 云盘过夜。
2. **三道强制门禁**：每个 Milestone 完工前必须跑通 `npm run gate`（数据校验 + 类型检查 + 静态构建 + 无头生存闭环 + Playwright 实机截图且 console 0 报错）。
3. **亲眼查图**：Playwright 截出的每张验收 PNG，Dot 必须自己打开检查，确认无黑屏、无文字重叠、暖橙与冰蓝对比清晰，再上传 Google Drive。
4. **Google Drive 同步**：每个 Milestone 完工时：
   - 更新 `MILESTONES.md` 与 `docs/PROGRESS.md` 并同步更新到 `00-计划与日志`；
   - 在 `01-实机截图验收` 下建 `M0/`…`M6/` 目录上传全部验收截图；
   - 上传测试报告 JSON 到 `02-验收与测试报告`；
   - 将 `index.html` 与 `dist/` 打包为 `frost-ark-M*.zip` 上传到 `03-里程碑试玩包`。

## 5. 汇报格式铁律

- 用给玩家说话的大白话汇报：先说结论和玩家能看到的实机变化，不堆文件名和内部函数名。
- 附 Google Drive 截图目录链接，方便人类在手机上直接看图。
- 每次汇报末尾必须写**【偏离报告】**：逐条列出哪些按方案完成、哪些改动或未完成及原因；完全一致则明确写“无偏离”。
- 每完成一个完整里程碑后主动汇报并等待确认（除非人类明确授权连续推进多个里程碑）。
