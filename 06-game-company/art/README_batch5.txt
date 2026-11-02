马楠第五批修订补充包（2×）

用途：与此前第五批包相比，本包将文件放在根目录，并重新输出 A 组、两位 Boss 动作、KPI 待机及两条可横向平铺投射物。
锚点：anchors.json 坐标为 2× 像素、每帧左上角为原点；依次对应动画每帧。坐标依据手或指尖目测标注，建议进游戏微调。
场景 G 组按第六批 v2 取代，本包不含场景。

已知仍需确认：
1. boss_pd_doc 最后一帧飞出纸张贴近帧右边缘；纸张投射物为单独的 proj_doc，避免重复显示。
2. boss_ceo_pound 为保持完整的跳跃高度，人物略小于站立帧；请游戏内检查。boss_ceo_stagger 没有单独画掉落的饼，可配合 proj_pie。
3. enemy_popup_attack 图中已有红叉飞出，接入独立 proj_x 时请确认不会重复显示。
4. enemy_kpi_attack 的地面冲击波较弱，可配合游戏特效；各动作仍需在游戏中检查连续性与实际手感。
5. 此包不包含可选的马楠待机/跑步优化。

文件清单（帧序即从左到右）：
boss_ad_dash@2x.png：4 帧；144×160 像素/帧；按序动画或状态变化。
boss_ad_notes@2x.png：4 帧；144×160 像素/帧；按序动画或状态变化。
boss_ceo_bigpie@2x.png：6 帧；160×176 像素/帧；推大饼。
boss_ceo_die@2x.png：8 帧；160×176 像素/帧；败退。
boss_ceo_idle@2x.png：4 帧；160×176 像素/帧；待机循环。
boss_ceo_intro@2x.png：6 帧；160×176 像素/帧；登场。
boss_ceo_kpi@2x.png：4 帧；160×176 像素/帧；举手。
boss_ceo_pie@2x.png：4 帧；160×176 像素/帧；抛饼。
boss_ceo_pound@2x.png：8 帧；160×176 像素/帧；起跳—空中—落地。
boss_ceo_recover@2x.png：2 帧；160×176 像素/帧；收招。
boss_ceo_roar@2x.png：6 帧；160×176 像素/帧；转阶段。
boss_ceo_stagger@2x.png：4 帧；160×176 像素/帧；失衡。
boss_ceo_walk@2x.png：6 帧；160×176 像素/帧；行走。
boss_pd_change@2x.png：4 帧；128×144 像素/帧；需求变更。
boss_pd_die@2x.png：8 帧；128×144 像素/帧；败退。
boss_pd_doc@2x.png：4 帧；128×144 像素/帧；甩文件。
boss_pd_idle@2x.png：4 帧；128×144 像素/帧；待机循环。
boss_pd_intro@2x.png：6 帧；128×144 像素/帧；登场。
boss_pd_laser@2x.png：6 帧；128×144 像素/帧；指尖蓄力发射。
boss_pd_roar@2x.png：6 帧；128×144 像素/帧；转阶段。
boss_pd_stagger@2x.png：4 帧；128×144 像素/帧；失衡。
boss_pd_tele_in@2x.png：4 帧；128×144 像素/帧；出现。
boss_pd_tele_out@2x.png：4 帧；128×144 像素/帧；消失。
enemy_crumple_attack@2x.png：3 帧；64×64 像素/帧；攻击。
enemy_invite_attack@2x.png：3 帧；64×56 像素/帧；攻击。
enemy_invite_die@2x.png：5 帧；64×56 像素/帧；败退。
enemy_invite_idle@2x.png：4 帧；64×56 像素/帧；待机循环。
enemy_invite_stun@2x.png：2 帧；64×56 像素/帧；眩晕。
enemy_invite_wind@2x.png：3 帧；64×56 像素/帧；前摇。
enemy_kpi_attack@2x.png：3 帧；56×80 像素/帧；攻击。
enemy_kpi_die@2x.png：5 帧；56×80 像素/帧；败退。
enemy_kpi_idle@2x.png：4 帧；56×80 像素/帧；待机循环。
enemy_kpi_stun@2x.png：2 帧；56×80 像素/帧；眩晕。
enemy_kpi_wind@2x.png：3 帧；56×80 像素/帧；前摇。
enemy_popup_attack@2x.png：3 帧；80×56 像素/帧；攻击。
enemy_sticky_attack@2x.png：3 帧；48×48 像素/帧；攻击。
fx_dive@2x.png：5 帧；128×48 像素/帧；按序动画或状态变化。
fx_djump@2x.png：4 帧；48×16 像素/帧；按序动画或状态变化。
fx_dust@2x.png：4 帧；32×16 像素/帧；按序动画或状态变化。
fx_perfect_dodge@2x.png：6 帧；96×96 像素/帧；按序动画或状态变化。
fx_roar@2x.png：6 帧；192×192 像素/帧；转阶段。
pk_bp@2x.png：4 帧；32×28 像素/帧；按序动画或状态变化。
pk_cchest@2x.png：2 帧；48×32 像素/帧；依次关闭、打开。
pk_cell@2x.png：4 帧；16×16 像素/帧；按序动画或状态变化。
pk_chest@2x.png：2 帧；48×32 像素/帧；依次关闭、打开。
pk_crate@2x.png：2 帧；32×32 像素/帧；依次完好、破损。
pk_door@2x.png：2 帧；56×88 像素/帧；依次关闭、打开。
pk_food@2x.png：1 帧；32×24 像素/帧；按序动画或状态变化。
pk_rush@2x.png：2 帧；32×36 像素/帧；按序动画或状态变化。
pk_scroll@2x.png：4 帧；32×28 像素/帧；按序动画或状态变化。
pk_tdoor@2x.png：3 帧；56×84 像素/帧；依次绿色、红色、灰色。
pk_wireterm@2x.png：2 帧；32×44 像素/帧；按序动画或状态变化。
proj_bigpie@2x.png：4 帧；96×96 像素/帧；推大饼。
proj_doc@2x.png：4 帧；32×40 像素/帧；甩文件。
proj_kpi_bar@2x.png：3 帧；48×160 像素/帧；依次红、黄、绿。
proj_laser@2x.png：3 帧；64×24 像素/帧；指尖蓄力发射。
proj_pie@2x.png：4 帧；32×32 像素/帧；抛饼。
proj_x@2x.png：2 帧；24×24 像素/帧；按序动画或状态变化。
proj_zone@2x.png：3 帧；64×20 像素/帧；按序动画或状态变化。
