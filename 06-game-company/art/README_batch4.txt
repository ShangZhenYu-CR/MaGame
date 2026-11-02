马楠游戏 第四批 V2 · 2倍素材测试包
全部 PNG 直接从高分辨率原始图制作，未将 1x 成品放大。@2x 文件尺寸是逻辑尺寸的两倍。
角色 96×96，穿模怪 64×64，便签 48×48，打印机 80×64，主美 144×160。
横向连续帧，背景透明；坐标原点为每帧左上角。

【返工】
player_atk_ruler@2x.png：12帧；3段，每段前摇、出手、伸直、收招。站姿约84像素高；手部坐标为估算值。
player_die@2x.png：6帧；踉跄、跪倒、侧倒、侧躺、仰躺、闭眼躺平。

【C/D 动画】
enemy_crumple_attack@2x.png：3帧，攻击。
enemy_crumple_die@2x.png：5帧，死亡。
enemy_crumple_idle@2x.png：4帧，待机。
enemy_crumple_stun@2x.png：2帧，硬直。
enemy_crumple_wind@2x.png：3帧，攻击前摇。
enemy_printer_attack@2x.png：3帧，攻击。
enemy_printer_die@2x.png：5帧，死亡。
enemy_printer_idle@2x.png：4帧，待机。
enemy_printer_stun@2x.png：2帧，硬直。
enemy_printer_wind@2x.png：3帧，攻击前摇。
enemy_sticky_attack@2x.png：3帧，攻击。
enemy_sticky_die@2x.png：5帧，死亡。
enemy_sticky_idle@2x.png：4帧，待机。
enemy_sticky_stun@2x.png：2帧，硬直。
enemy_sticky_wind@2x.png：3帧，攻击前摇。
boss_ad_dash@2x.png：4帧，主美动作。
boss_ad_dash_wind@2x.png：3帧，主美动作。
boss_ad_die@2x.png：8帧，主美动作。
boss_ad_idle@2x.png：4帧，主美动作。
boss_ad_intro@2x.png：6帧，主美动作。
boss_ad_notes@2x.png：4帧，主美动作。
boss_ad_recover@2x.png：2帧，主美动作。
boss_ad_roar@2x.png：6帧，主美动作。
boss_ad_stagger@2x.png：4帧，主美动作。
boss_ad_stamp@2x.png：8帧，主美动作。
boss_ad_walk@2x.png：6帧，主美动作。

【武器图标与效果】
weapon_marker@2x.png / weapon_ruler@2x.png / weapon_knife@2x.png：锤、枪、刀各1张，握点见 anchors.json。
icon_*.png：各1张图标，48×48。
proj_paper@2x.png：2帧；proj_note@2x.png：4帧；proj_wave@2x.png：3帧。
fx_hit@2x.png：4帧；fx_crit@2x.png：5帧；fx_poise_break@2x.png：5帧。

【待完成与限制】
主美各帧红笔笔尖与打印机每帧出纸口挂点尚未可靠标定，因此 anchors.json 未包含这些坐标；切勿将这些动作的伤害判定视为已校准。
长枪手部坐标与武器握点按画面估算，尚未在游戏里联调。
主美同源生成但部分帧有风格和尺寸漂移；普通敌人各动作分别生成，切换时外观可能变化，硬直帧带星星，打印机部分帧带纸张。
冲击波是向外扩散的圆环，游戏内需确认方向是否适配；@2x 的 1 像素描边未逐像素核验。
旧角色全部动作重出、F组敌人尚未制作。
第四批 V2 挂点补充，配合 manan_sprites_batch4.zip。
anchors.json 包含原有武器、长枪、主美每帧红笔笔尖和打印机每帧出纸口。坐标是实际两倍图像像素，原点为每帧左上，x右y下。
主美红笔坐标已逐帧静态图检查，红点标注见 boss_tip_review.png，仍需游戏运行时验证。打印机坐标按各帧出纸口视觉位置标定，死亡第4、5帧机器已碎裂没有出纸口，设为 null；调用方应处理 null。旧版长枪及武器握点仍为初始值。
第四批 V2 · 2F 敌人补充（测试候选）
PNG 均从原始大图重采样，横向连续帧，透明背景。
Bug：48×40；报错弹窗：80×56；防火墙：56×80。

enemy_bug_attack@2x.png — 3 帧
enemy_bug_die@2x.png — 5 帧
enemy_bug_idle@2x.png — 4 帧
enemy_bug_stun@2x.png — 2 帧
enemy_bug_wind@2x.png — 3 帧
enemy_firewall_attack@2x.png — 3 帧
enemy_firewall_die@2x.png — 5 帧
enemy_firewall_idle@2x.png — 4 帧
enemy_firewall_stun@2x.png — 2 帧
enemy_firewall_tired@2x.png — 2 帧
enemy_firewall_wind@2x.png — 3 帧
enemy_popup_attack@2x.png — 3 帧
enemy_popup_die@2x.png — 5 帧
enemy_popup_idle@2x.png — 4 帧
enemy_popup_stun@2x.png — 2 帧
enemy_popup_wind@2x.png — 3 帧

限制：各动作是分别生成，敌人切换动作时外观可能变化；部分动作带特效。弹窗攻击表现为红色射线而非红叉，防火墙攻击表现为出拳而非盾牌冲撞。bug 待机偏正面，攻击偏侧面。帧尺寸/透明通道已验证，尚未接入游戏。
