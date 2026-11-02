# 马楠：通关游戏公司 · 美术第九批需求（马楠夏季服装）

给出图的同学（GPT）：本文档自包含。做完把 zip 放回本目录 `/MaGame/06-game-company/art/`，命名 `manan_summer.zip`（太大可以拆成 `_a` `_b`）。

## 一、要做什么

给马楠做一套**夏季服装**，玩家在标题画面可以切换。

- **上衣**：军绿色背心（无袖，圆领，贴身但不紧绷），露出两条手臂
- **下装**：黑色短裤，长度到膝盖上方一点，露出小腿
- **不变的部分**：脸、发型、肤色、白色运动鞋、身材比例全部和现在一样
- 手臂和小腿露出的皮肤用和脸一样的肤色，暗面和亮面也沿用脸上的颜色

建议配色（可以微调，但要一眼看出是军绿和黑）：

| 部位 | 亮面 | 中间色 | 暗面 |
|---|---|---|---|
| 军绿背心 | `#7a8a4a` | `#5a6a34` | `#3a4622` |
| 黑色短裤 | `#3a3a44` | `#24242c` | `#16161c` |

背心可以加两个小细节（可选）：领口和袖口一圈深一点的包边；胸口一块小小的浅色方形口袋或标签。

## 二、最重要的要求：只换衣服，动作一帧都不改

游戏是按帧读每只手的位置（`anchors.json`）来挂武器的。所以：

1. **每个文件的帧数、帧尺寸、每一帧的姿势、人物在帧里的位置，必须和现在的版本完全一致**。最好的做法是直接在现有的图上重画衣服部分。
2. 头、手、脚的位置不要动，前手（握武器的手）的像素位置不要动。
3. 卫衣去掉后人会变瘦一点，这是正常的：身体轮廓可以往里收，但**不要改变头顶高度和脚底位置**。
4. 翻滚、跳跃等衣服会飘动的帧，背心下摆可以有一点点动态。

如果某一帧实在需要改动手的位置，在 `anchors.json` 里写上新的位置（格式见下），没改的不用写。

## 三、要做的文件

底图就是现在游戏里用的这些文件（你之前交付的最新版本）。如果手上没有，项目负责人可以从 GitHub 下载 `06-game-company/art/player/` 文件夹给你。

规格和之前一样：**2 倍精度**，每帧 96×96 像素（逻辑 48×48），横向等宽序列帧，透明背景，朝右，外轮廓 1 像素 `#14121a`。

新文件名 = 原文件名中间加 `summer_`，例如 `player_idle@2x.png` → `player_summer_idle@2x.png`。

### A 组 · 必做（基础动作，做完这组就能在游戏里切换）

| 原文件 | 新文件 | 帧数 |
|---|---|---|
| `player_idle@2x.png` | `player_summer_idle@2x.png` | 4 |
| `player_run@2x.png` | `player_summer_run@2x.png` | 8 |
| `player_jump@2x.png` | `player_summer_jump@2x.png` | 2 |
| `player_fall@2x.png` | `player_summer_fall@2x.png` | 2 |
| `player_land@2x.png` | `player_summer_land@2x.png` | 2 |
| `player_djump@2x.png` | `player_summer_djump@2x.png` | 4 |
| `player_roll@2x.png` | `player_summer_roll@2x.png` | 6 |
| `player_hurt@2x.png` | `player_summer_hurt@2x.png` | 2 |
| `player_die@2x.png` | `player_summer_die@2x.png` | 6 |
| `player_atk_stylus@2x.png` | `player_summer_atk_stylus@2x.png` | 12 |
| `player_atk_dash@2x.png` | `player_summer_atk_dash@2x.png` | 5 |

### B 组 · 其余动作

| 原文件 | 新文件 | 帧数 |
|---|---|---|
| `player_atk_marker@2x.png` | `player_summer_atk_marker@2x.png` | 8 |
| `player_atk_ruler@2x.png` | `player_summer_atk_ruler@2x.png` | 12 |
| `player_atk_knife@2x.png` | `player_summer_atk_knife@2x.png` | 16 |
| `player_dive@2x.png` | `player_summer_dive@2x.png` | 3 |
| `player_dive_land@2x.png` | `player_summer_dive_land@2x.png` | 3 |
| `player_mantle@2x.png` | `player_summer_mantle@2x.png` | 4 |
| `player_heal@2x.png` | `player_summer_heal@2x.png` | 4 |
| `player_parry@2x.png` | `player_summer_parry@2x.png` | 2 |
| `player_spray@2x.png` | `player_summer_spray@2x.png` | 2 |

### C 组 · 第八批的新动作（第八批做完以后再做）

`player_summer_atk_whip`（12 帧）、`player_summer_atk_shears`（8 帧）、`player_summer_atk_render`（12 帧）、`player_summer_charge`（3 帧），底图用第八批交付的对应文件。

**某个动作没有夏季版时，游戏会自动用原来的卫衣版顶上**，所以可以分批交付，A 组优先。

## 四、交付

一个 zip：`manan_summer.zip`，里面：

- 全部 `player_summer_*@2x.png`
- `anchors.json`：只写**手的位置和原版不同**的帧，格式 `{"player_summer_run": [[x,y],[x,y],...]}`（2 倍像素坐标，每帧左上角为原点）；全部一致就不用提供
- `README.txt`：做了哪些文件、每个几帧、没做完的部分
- 可选：一张 `summer_preview.png`，把卫衣版和夏季版的待机第一帧并排放，方便对比
