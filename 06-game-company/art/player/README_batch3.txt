马楠：通关游戏公司 第三批（测试候选版）

PNG 透明背景，横向连续排列，每帧 48×48。坐标以帧左上角为 (0,0)，右 x 下 y。
player_roll.png — 6 帧：蹲身、前折、抱团、翻转、展开、起身；抱团缩至最多 26×24、蹲姿不超过 30 像素高。
player_idle.png — 4 帧：站立、吸气、闭眼、回落。呼吸变化仍偏细微。
player_atk_stylus.png — 12 帧：三段，每段前摇、出手1、出手2、收招；已重画握持手势。
player_atk_dash.png — 5 帧：蹲身、突进、出手、收招、站稳。
player_djump.png — 4 帧：抱膝、翻转、倒置、展开。
player_dive.png — 3 帧：蓄势、下冲、下劈。
player_dive_land.png — 3 帧：单膝落地、停顿、起身。
player_mantle.png — 4 帧：抓沿、撑起、抬腿、站立；无墙。
player_heal.png — 4 帧：准备、夹饭、吃饭、满足。
player_die.png — 6 帧：踉跄、跪倒、倒地、侧卧、坐下、躺平。
player_parry.png — 2 帧：举键帽、挡住；键帽已画在人物图里。
player_spray.png — 2 帧：抬枪、前伸喷涂；喷枪已画在人物图里。
player_atk_marker.png — 8 帧：双手横扫、举起下砸，各4帧。
player_atk_ruler.png — 12 帧：三段突刺，各4帧。
player_atk_knife.png — 16 帧：四段快速斩击，各4帧。

anchors.json 给出各持物动作每帧估算手部坐标，及上一批 weapon_stylus 的握点。雕刻笔及冲刺斩坐标已按手部位置检查过 16×16 雕刻笔叠加，参见 grip_overlay_preview.png；武器放在角色层之后并按游戏动作旋转，其他武器坐标仍是初始估算，须在游戏中调试；parry/spray 的道具已画入图片，不要重复绘制。

仍需游戏内验证：低分辨率下握笔手指细节不明显，角色动画、武器旋转角度和实际游戏中的挂载效果尚未验证；锤、枪、刀挂点尚未叠加对应武器校准。武器新图标及 C/D/E 组未制作；跑步未返工。请先作为测试候选，不要覆盖正式素材。
