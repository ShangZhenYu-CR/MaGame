# 11 月 4 日素材接入记录（v3.1 开发分支）

基线：main `6938a01`，接续 Confluence《开发进度与接手规范（v3.0）》。本记录中的“接入”指开发分支，合并 main 并通过发布验证后才是线上版本。

## 本次来源与选择

Dropbox 根目录：`/MaGame/06-game-company/art`。

| 来源包 | 采用内容 | 处理 |
| --- | --- | --- |
| `MaGame_art_revision_20261103_v1.zip` / `03_夏装完整动作/sprites` | 24 条夏装动画，共 146 帧 | 新增到 `art/player/`；采用同目录 `anchors_reference.json`，按键合并 |
| 同包 / `01_反握刀` | `player_atk_knife_reverse`、`weapon_knife_reverse`、`anchors.json` | 人物重命名为游戏现用 `player_atk_knife`；攻击使用配套反握刀，普通待机、冲刺等仍用对应原刀图 |
| 同包 / `04_刘敬阳` | `boss_ljy_transform_transition_fix` | 替换 `boss_ljy_transform`，保持 12 帧 |
| 同包 / `05_身体挂点` | 跑步耳部 8 帧补丁 | 核对参考图与正式 run 一致后，仅更新 `carry.player_run.ear` |
| `ljy_tornado_rising_12frames_20261103.zip` | 前后层 rising 龙卷 | 重命名为现用前后层名称，均为 12 帧、每帧 256×384，保持同帧播放 |
| `ljy_breath_transition_8frames_20261103.zip` | 吐息过渡及 8 帧嘴点 | 替换现用吐息图；发射点与绘制共用取帧函数，前 3 帧预备、后 5 帧循环 |

反握刀每段 4 帧，出手帧（段内从 0 数）：**3,2,3,3**。这是目视伸展峰值的接入选择，实机检查仍需确认攻击节奏。嘴点为素材作者估算，误差约 3 个实际像素。

## 已在 v3.0 的内容

仓库已包含刘敬阳全套动作、原版变身龙卷与火龙、天台背景和修正版地砖、剪切刀双片攻击与站立持握/跑动背负。此次只替换上表列出的修订。

`feedback_attack_fix.md` 明确记录 `manan_attack_fix.zip` 已在 v2.9 接入；`feedback_batch8-11_v2.md` 记录了第 8 批敌人/图标和第 10 批特效等早期接入。Dropbox 的 `MaGame_art_integration_status.md` 日期是 11 月 2 日，其“缺失”不能作为当前接入依据。

## 仍未启用及版本关系

| 项目 | 当前状态与原因 |
| --- | --- |
| 夏装 v6、attack_work v2–v5、a/b 分包 | 本次以整合修订包的 24 条为准，不逐包覆盖；未宣称已核验所有旧包字节内容 |
| 反握刀 review / candidate 包 | 采用更晚整合修订包的成套人物、刀图和锚点 |
| upflow / spiralflow 龙卷、lean_loop 吐息 | 本次选后续 rising / transition 包；较早变体未另行启用 |
| 整合包 `02_双持动作` | 整剪刀为 4 帧、64×64，握环改成横排，与现有双片剪刀绘制规则不同，保留候选；不覆盖 v3 双片持握 |
| 夏装 hold2_idle、draw_back、throw、place 等 | 24 条包不含这些动作，游戏按既有规则回退卫衣版；“24 条齐全”不等于所有特殊姿态都已换装 |
| 其他武器收起/持握 | 原 `_pending/weapon_carry`、`_pending/player_carry` 仍待按第十批规则接入 |
| 渲染大剑 14 帧版 | 原 `_pending/attack_fix2/optional` 未启用；本次夏装对应 12 帧版，不能直接用 14 帧替换 |

## 验证

- 已通过：`python build.py`；JS 语法检查；`git diff --check`。
- 已通过：`node tools/art_integration.js`，检查 24 动作/146 帧、夏装单/双手挂点、左右朝向反握刀和出手帧、吐息嘴点与帧同步。
- 已做素材目视：新版反握刀叠图、夏装剪刀、变身过渡、龙卷逐帧、吐息嘴点预览。目视不代表实机验收。
- 待完成：`wpn`、`tut2`、`cdx`、`tf`、`ljy`、`soak` 浏览器回归，以及 `audit.js` + `sheet.py` 和游戏内截图目视。

测试环境记录：默认 Playwright 1.62.1 的 Chromium 下载失败；随后使用 Playwright 1.51.1 成功安装 Chromium 134，但六组脚本均在 page.goto 加载本地测试页时退出，报 Target page, context or browser has been closed。HTTP 页面尝试也未能进入游戏检查。六组回归均为环境阻塞，不能标记通过。

构建、语法及素材契约检查已通过；在浏览器回归及实机视觉检查完成前保留为开发分支，不作为已发布版本。
