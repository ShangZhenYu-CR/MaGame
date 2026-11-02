# 06 · 美术素材需求（给图像生成用）

现在游戏里的所有图像都是代码画的占位像素。这份文档列出要替换的全部素材，按优先级排好，每一项都写了尺寸、帧数和生成提示词。素材生成好以后放进 `06-game-company/art/` 对应的子目录，我再接进游戏。

## 0. 统一规格（所有素材都要遵守）

> 给图像模型时**不要把整份文档贴进去**，会撑爆上下文。每个新对话只贴文末的“短提示词模板”，一次只要一个动作。

| 项目 | 规格 |
|---|---|
| 风格 | 2D 像素画，参考《死亡细胞》的厚涂像素风：轮廓清楚、明暗分两到三层、高光少而亮 |
| 游戏分辨率 | 480×270，整数放大显示。图像模型画不好 1 倍像素，**可以直接出大图**（像素风即可），我用脚本缩小到游戏尺寸 |
| 瓦片 | 16×16 |
| 描边 | 外轮廓统一用 `#14121a`，1 像素 |
| 光源 | 左上方 |
| 背景 | **纯品红 `#FF00FF` 纯色背景**，不要黑色或白色背景（马楠的夹克接近黑色，黑背景抠图会把衣服一起抠掉），不要阴影和地面 |
| 格式 | PNG 优先；JPG 也能用，但边缘会有杂色 |
| 排版 | 每张图只放一个动作，所有帧**一行等宽排开**，帧与帧之间留足空隙、互不重叠 |
| 比例 | 同一个角色的所有图里人物大小必须一致：**站立时人物高度约等于图片高度的 80%**，脚底贴近底边 |
| 动画 | 横向一条序列帧（sprite strip），每帧大小相同，帧与帧之间不留空 |
| 锚点 | 角色和敌人的**脚底中心**对齐在每帧底边中点；武器的**握持点**单独标出（见 1.3） |
| 朝向 | 全部朝右画，朝左由代码翻转 |
| 命名 | `类别_名字_动作.png`，比如 `player_run.png`、`enemy_bug_attack.png` |

**通用提示词前缀**（每次生成都加在前面）：

> pixel art, 1x scale, crisp pixels, no anti-aliasing, transparent background, side view facing right, limited palette, 1px dark outline #14121a, top-left lighting, Dead Cells style, office-themed roguelite

## 1. 主角 · 马楠（优先级最高）

参考 `assets/character/design-sheet.jpg`：寸头、深灰连帽夹克（胸口白色小 logo、拉链）、黑色工装裤（侧口袋）、白色厚底运动鞋，体型偏壮，表情踏实。

- 判定框 10×26，**每帧画布 32×32**，人物站立高约 28 像素，脚底贴在画布底边中点
- 配色：皮肤 `#e3b48e`／`#c4906b`，头发 `#1c1a19`，夹克 `#262a33`／`#363b46`／`#17191f`，裤子 `#2e2f28`／`#3d3e34`，鞋 `#f4f2ec`／`#a8a69e`

### 1.1 身体动画（不含武器，手部空出握持位置）

| 文件 | 帧数 | 说明 |
|---|---|---|
| `player_idle.png` | 4 | 站立呼吸，偶尔眨眼 |
| `player_run.png` | 8 | 跑步循环，身体微前倾 |
| `player_jump.png` | 2 | 起跳、上升 |
| `player_fall.png` | 2 | 下落（手臂张开） |
| `player_land.png` | 2 | 落地下蹲缓冲 |
| `player_djump.png` | 4 | 二段跳空翻一圈 |
| `player_roll.png` | 6 | 翻滚一圈，最后一帧接站立 |
| `player_mantle.png` | 4 | 攀边：双手扒墙沿 → 撑起 → 抬腿 → 站上去 |
| `player_hurt.png` | 2 | 被打后仰，皱眉 |
| `player_die.png` | 6 | 倒地躺平（死亡画面文案是“先躺一会儿”，可以带点喜感） |
| `player_heal.png` | 4 | 捧便当盒扒饭 |
| `player_dive.png` | 3 | 下劈：空中缩身，武器朝下 |
| `player_dive_land.png` | 3 | 下劈砸地，单膝跪地 |
| `player_parry.png` | 2 | Ctrl+Z 格挡：手举一块“撤销”牌挡在身前 |
| `player_spray.png` | 2 | 植被笔刷：单手前伸喷射 |

### 1.2 攻击动画（身体部分，每把主武器单独一套）

每段攻击分三段：**前摇 1 帧、出手 2 帧、收招 1 帧**，共 4 帧。

| 文件 | 段数 | 动作 |
|---|---|---|
| `player_atk_stylus.png` | 3 段 × 4 帧 | 雕刻笔：上撩 → 下劈 → 大力横扫（第三段身体前冲更多） |
| `player_atk_marker.png` | 2 段 × 4 帧 | 布尔锤：抡圆横扫 → 举过头顶砸地，前摇明显更长 |
| `player_atk_ruler.png` | 3 段 × 4 帧 | 挤出长枪：两次直刺 → 一次弓步长刺 |
| `player_atk_knife.png` | 4 段 × 4 帧 | 切线刀：左右快切三次 → 转身斩 |
| `player_atk_dash.png` | 5 帧 | 冲刺斩（翻滚后出手），身体压低向前突进，所有武器共用 |

### 1.3 武器（拿在手上的样子）

每把画两张：手持图（朝右、刀尖朝右上 45°，握持点在图片里用 1 个 `#ff00ff` 像素标出，我读完会删掉）和 24×24 图标。

| 武器 | 手持图尺寸 | 外观 |
|---|---|---|
| 雕刻笔 stylus | 16×16 | 黑色数位笔，橙色笔尖发光 `#ffb84a` |
| 布尔锤 marker | 24×24 | 木柄 + 半透明蓝色立方体锤头，锤头上画一个布尔运算的“减”符号 |
| 挤出长枪 ruler | 36×12 | 银色长杆，枪头是橙色的挤出箭头（像 3D 软件里的挤出手柄） |
| 切线刀 knife | 16×16 | 短刀，青色刀刃 `#7ff0e0`，刀身上有一条网格线 |
| 变换轴 palette | 16×16 | 红绿蓝三色坐标轴（3D 软件的移动手柄），会旋转飞出 |
| 植被笔刷 airbrush | 16×16 | 喷枪 + 绿色叶片 |
| Ctrl+Z eraser | 16×16 | 白色键帽，上面印着弯箭头 |
| 熔岩材质球 inkbomb | 12×12 | 橙红色发光材质球 |
| 碰撞体方块 boxcol | 32×32 | 灰白方块，绿色线框边和对角线（游戏引擎的碰撞体） |
| 预制体炮台 turret | 16×20 | 三脚架 + 白色小炮塔 + 蓝色炮管 |

## 2. 普通敌人

每只敌人都要这几个动画：**待机 / 移动 4 帧、前摇 3 帧（动作夸张，要让玩家一眼看出“要打了”）、攻击 3–4 帧、硬直 2 帧、死亡 5 帧**。被打时的闪白、精英的红光都由代码处理，不用画。

| 名字 | 文件前缀 | 画布 | 楼层 | 外观和攻击 |
|---|---|---|---|---|
| 穿模怪 | `enemy_crumple` | 24×24 | 1F、2F | 粉紫色和黑色的棋盘格方块（缺材质的样子），身上戳出几根蓝色法线。前摇缩成一团，然后扑过来 |
| 返工便签 | `enemy_sticky` | 16×16 | 1F | 会飞的黄色便签，上面写着红色“改”字。前摇抖动，然后俯冲 |
| 打印机 | `enemy_printer` | 28×24 | 1F | 灰色办公打印机，出纸口像嘴。前摇咔哒咔哒，吐出一张纸 |
| Bug | `enemy_bug` | 16×12 | 2F | 绿色像素甲虫，背上一个红色感叹号。会跳着扑人 |
| 报错弹窗 | `enemy_popup` | 28×20 | 2F、3F | 飘着的 Windows 风格报错窗，红色叉号。前摇窗口变红，发射红叉 |
| 防火墙 | `enemy_firewall` | 20×28 | 2F、3F | 砖墙盾牌 + 火焰纹，正面挡伤害。冲撞后会有“喘气”动画（2 帧，这时候背后和正面都能打） |
| KPI 表 | `enemy_kpi` | 20×28 | 3F | 会走路的柱状图，三根红黄绿柱子当身体。前摇柱子拔高，砸地放出冲击波 |
| 会议邀请 | `enemy_invite` | 20×20 | 3F | 白色信封 + 蓝色日历角标。贴上来就把人“拉进会议”定身 |

## 3. Boss

每个 Boss 都要：**登场 6 帧、待机 4 帧、走路 6 帧、失衡（破绽）4 帧循环、怒吼（转阶段）6 帧、死亡 8 帧**，加上下面各自的招式。招式同样拆成前摇 / 出手 / 收招。

### 3.1 主美 · 改稿大师（1F）· 画布 48×56

贝雷帽、黄围巾、紫色长风衣、墨镜，手拿一支巨大的红笔。

| 招式 | 帧数 | 动作 |
|---|---|---|
| 红笔冲刺 dash | 前摇 3 + 冲刺 4 + 收招 2 | 红笔向后拉满，然后整个人冲过去；二阶段以后会连冲两到三次 |
| 扔修改意见 notes | 4 | 抬手扔出几张纸 |
| 盖章砸地 stamp | 起跳 3 + 空中 2 + 落地 3 | 跳出画面，从上方砸下来 |

### 3.2 制作人 · 需求变更（2F）· 画布 40×48

蓝色西装、红领带、耳麦，手拿文件夹。

| 招式 | 帧数 | 动作 |
|---|---|---|
| 瞬移 tele | 消失 4 + 出现 4 | 化成蓝色像素消散再出现 |
| 扔需求文档 doc | 4 | 文件夹甩出文档，文档会飞回来 |
| 需求变更 change | 4 | 拍桌，地面出现红色区域 |
| 上线新功能 laser | 前摇 4 + 发射 3 | 指向前方，整排激光（三阶段两排） |

### 3.3 老板 · 画大饼（顶层）· 画布 56×64

大肚子、黑西装、金领带、头发稀疏，手里端着一张饼。

| 招式 | 帧数 | 动作 |
|---|---|---|
| 扔饼 pie | 4 | 抛出几张饼，落地会弹 |
| 跳砸 pound | 起跳 3 + 空中 2 + 落地 3 | 三阶段连跳三次 |
| KPI 上涨 kpi | 4 | 双手上举，地面升起柱子 |
| 画大饼 bigpie | 6 | 双手比划出一张巨大的饼滚过来 |

## 4. 投射物和特效

| 文件 | 尺寸 × 帧 | 说明 |
|---|---|---|
| `fx_slash_{武器}.png` | 48×32 × 3 | 每把主武器的刀光，用武器主色 |
| `fx_hit.png` | 16×16 × 4 | 普通命中火花 |
| `fx_crit.png` | 24×24 × 5 | 暴击命中，更大、带金色 |
| `fx_poise_break.png` | 24×24 × 5 | 打断韧性（破防），金色碎裂 |
| `fx_perfect_dodge.png` | 48×48 × 6 | 完美闪避：金色圆环扩散 |
| `fx_stagger_stars.png` | 16×8 × 4 | Boss 失衡时头顶转圈的星星 |
| `fx_roar.png` | 96×96 × 6 | Boss 怒吼冲击环 |
| `fx_dust.png` | 8×8 × 4 | 跑步、落地扬尘 |
| `fx_djump_ring.png` | 24×8 × 4 | 二段跳脚下光环 |
| `fx_dive_impact.png` | 64×24 × 5 | 下劈砸地 |
| `proj_paper.png` `proj_x.png` `proj_note.png` `proj_doc.png` | 12×12 × 2 | 打印纸、报错红叉、修改意见、需求文档 |
| `proj_pie.png` / `proj_bigpie.png` | 12×12 × 4 / 44×44 × 4 | 饼（旋转） |
| `proj_wave.png` | 12×12 × 3 | 地面冲击波 |
| `proj_lava_pool.png` | 56×8 × 4 | 熔岩池 |
| `proj_kpi_bar.png` | 22×80 | KPI 柱（红、黄、绿各一张） |
| `proj_laser.png` | 32×10 × 3 | 激光段（可横向平铺） |
| `proj_zone.png` | 32×8 × 3 | 需求变更区域（可平铺） |

## 5. 场景

### 5.1 瓦片（每层一套，16×16）

文件 `tiles_f1.png`、`tiles_f2.png`、`tiles_f3.png`，排成 8 列的网格：

1. 地面顶面（左 / 中 / 右各 1，中间多画 2 个变体）
2. 地面填充（3 个变体）
3. 地面左右侧边
4. 单向平台（左 / 中 / 右）
5. 图钉陷阱
6. 线框台阶（“补模型”前的半透明蓝色线框）
7. 天花板
8. Boss 房封门

| 楼层 | 色调 |
|---|---|
| 1F 美术部 | 米白墙、木地板，暖黄光，墙上贴原画 |
| 2F 研发部 | 深蓝墙、灰地毯，冷蓝光，机房和显示器 |
| 顶层总裁办 | 米金墙、深红地毯，金色装饰，落地窗 |

### 5.2 背景（每层 3 层视差，480×270，左右可无缝平铺）

- `bg_f{1,2,3}_far.png`：远景（窗外城市 / 天空）
- `bg_f{1,2,3}_mid.png`：墙面和柱子
- `bg_f{1,2,3}_near.png`：近景遮挡（可选，半透明）

### 5.3 装饰物件

| 物件 | 尺寸 | 楼层 |
|---|---|---|
| 画架 easel | 24×30 | 1F |
| 画框 frame | 24×16 | 1F、3F |
| 绿植 plant | 16×26 | 全部 |
| 白板 board | 32×28 | 1F、2F |
| 书架 shelf | 32×19 | 1F |
| 饮水机 cooler | 14×30 | 1F |
| 显示器 monitor | 22×20 | 2F、3F |
| 服务器机柜 server | 20×46 | 2F |
| 海报 poster | 18×24 | 2F、3F |
| 奖杯 trophy | 14×20 | 3F |
| 窗户 window | 40×36 | 全部 |
| 吊灯 lamp | 16×10 | 全部 |

## 6. 拾取物和互动物件

| 物件 | 尺寸 × 帧 | 说明 |
|---|---|---|
| 灵感（货币） | 6×6 × 4 | 金色小星星，闪烁 |
| 便当 | 14×12 | 回血 |
| 宝箱 | 20×14 × 2 | 关 / 开 |
| 纸箱 | 16×14 × 2 | 完好 / 破损 |
| 灵感卷轴 | 16×12 × 4 | 飘浮发光 |
| 武器掉落光圈 | 20×20 × 4 | 武器下方的光 |
| 下一层的门 | 24×40 × 2 | 关 / 开 |
| 准时下班门 | 24×38 × 3 | 绿色（可进）/ 红色（超时）/ 已用 |
| 补模型终端 | 14×20 × 2 | 未用 / 已用 |
| 加急任务单 | 14×16 × 2 | 红色抬头的任务单，带感叹号 |

## 7. 界面

| 文件 | 说明 |
|---|---|
| `ui_logo.png` | 标题 Logo“马楠：通关游戏公司”，像素字，约 240×80 |
| `ui_hp_frame.png` | 血条框（9 宫格可拉伸） |
| `ui_slot.png` | 武器格子 32×32 |
| `ui_boss_bar.png` | Boss 血条框 + 破绽条框 |
| `ui_upg_{id}.png` | 茶水间升级图标 24×24，共 9 个，替换现在的 emoji：dmg 灵感爆发、hp 加班体质、roll 摸鱼大师、spd 速写手、flask 多带个便当、steal 落笔有神、jump 人体工学椅、crit 甲方满意、cd 快捷键大师 |
| `ui_stat_{line,color,body}.png` | 建模 / 地编 / 体力 属性图标 16×16 |
| `ui_card.png` | 升级卡片底图 |
| `ui_flask.png` | 便当图标 12×12（满 / 空 2 帧） |

## 8. 生成顺序建议

1. 马楠的身体动画（1.1）和雕刻笔的攻击（1.2 的第一行）
2. 1F 的瓦片、背景、三种敌人、主美 Boss
3. 命中和刀光特效（第 4 节前 5 项）
4. 其余武器
5. 2F、顶层的全部素材
6. 界面

每批生成完直接放进 `art/`，告诉我放了哪些，我就接进代码，没有素材的部分继续用现在的代码像素画。

## 短提示词模板（每次只贴这一段，替换方括号）

> 像素风游戏角色序列帧，侧面朝右。角色：[马楠：寸头年轻男人，深灰色连帽拉链夹克，胸口白色小 logo，黑色工装裤带侧口袋，白色厚底运动鞋]。动作：[跑步循环]，共 [8] 帧，一行等宽排开，帧之间留空不重叠。纯品红 #FF00FF 背景，无阴影无地面。每一帧人物大小一致，脚底对齐同一条水平线。

## 提示词示例

**马楠跑步**

> pixel art, 1x scale, crisp pixels, no anti-aliasing, transparent background, side view facing right, 1px dark outline #14121a, top-left lighting, Dead Cells style. Sprite strip of 8 frames, each 32x32, run cycle of a stocky young Chinese man with a buzz cut, dark grey zip-up hoodie jacket with small white logo, black cargo pants, chunky white sneakers, determined calm face, feet at bottom center of each frame.

**穿模怪前摇**

> pixel art, 1x scale, transparent background, side view facing right, 1px dark outline. Sprite strip of 3 frames, each 24x24: a small cube monster covered in magenta-and-black checkerboard missing-texture pattern, blue normal-vector spikes sticking out, angry eyes, squashing down to prepare a pounce.

**主美 Boss 待机**

> pixel art, 1x scale, transparent background, side view facing right, 1px dark outline. Sprite strip of 4 frames, each 48x56: an art director boss with a red beret, yellow scarf, long purple coat, black sunglasses, holding a giant red marker pen like a sword, arrogant idle breathing pose.
