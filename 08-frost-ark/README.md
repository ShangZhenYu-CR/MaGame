# 马楠：霜云方舟

开一艘漂在云海里的小船。捡残骸、造暖屋、去浮岛，带着拿铁和云兽一起熬过寒潮。收齐四枚火种后，点燃太阳方舟，在极光天穹迎战霜鲸。

![霜云方舟封面](cover/cover-frost-ark.webp)

## 开玩

- 离线包：整包解压，保留同级 `assets/`，双击 `08-frost-ark/index.html`。首次操作解锁网页音频，无需联网。
- 开发：在本目录运行 `npm install` 后 `npm run dev`。`npm run build` 同时生成静态入口和双击入口。`npm run gate` 跑数据、类型、构建、模拟和 Chromium 实机回归。
- 存档：三个本地槽互相独立。I 背包可导出或导入 JSON；K 系统设置可选存档、调音量、开关震动、修改昼夜速度。

## 键鼠

| 操作 | 按键 |
|---|---|
| 移动、翻滚、慢步接近云兽 | WASD、Space、Shift |
| 抛钩 & 采集 | Q 选抓钩，按住左键蓄力、松开；E 执行唯一提示动作 |
| 航图和建造 | N、B；X 拆除、Z 撤销 |
| 船上补给 | R 添柴、U 升炉、H 热食、I 背包 |
| 武器、伙伴和舰战 | T、V、G；C 齐射、P 抢修主炉 |
| 指引与资料 | L 航海日志，J 图鉴，O 成就，K 设置，M 总静音 |
| 其他 | 1–9 快捷栏；Esc 逐层关闭，滚轮缩放 |

## 开发与验收

- 本分支只改 `08-frost-ark/`。共有角色头像只读引用，不改仓库根目录或其他游戏。
- 精绘资产管线见 [ART_SPEC.md](docs/ART_SPEC.md)；开发记录见 [PROGRESS.md](docs/PROGRESS.md) 与 [CHANGELOG.md](CHANGELOG.md)。
- [发版与 Pages 挂载说明](docs/PAGES_HANDOFF.md) · [公开验收清单](docs/RELEASE_CHECKLIST.md)

## 在自己的电脑测巨舰帧率

用新版试玩 ZIP，完整解压后双击 `08-frost-ark/benchmark.html`，最大化浏览器，点「开始压测」并保持窗口在前台。两分钟后可以下载实测 JSON。场景固定为 24×24 甲板、50 座建筑、12 只云兽和寒潮三波，风雪、粒子、光影全部开启，正式游戏存档不读也不写。记录浏览器及硬件，在相同窗口尺寸下比较。
