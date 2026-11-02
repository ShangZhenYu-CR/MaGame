马楠：通关游戏公司 · 第七批返工

所有尺寸为实际像素。文件名与原资源相同；本包为替换文件。

1. 墙面：六张 bg_f*_mid、bg_f*_arena 为 960×640。缩小窗户与墙饰，移除灯具、家具及绿植；窗洞采用实际 alpha 透明。mid 左右边缘相等，arena 不要求平铺。
2. 吊灯：decor_f1_lamp、decor_f2_lamp 各 48×32；decor_f3_chandelier 为 64×48。按第七批指定的新尺寸输出，尺寸比旧文件大；三张均无吊绳。
3. tiles_f1/f2/f3：256×96，8×3 格。0–11 和 16–17 格完全不透明，6–8 换为低对比填充；12–15 和 18–23 保留原文件像素。
4. boss_ceo_pound：8 帧、每帧 160×176。第 3–6 帧重新绘制，画面内人物包围盒高度 144 像素；1、2、7、8 帧逐像素保留原文件。
5. 额外包含三层可选 near：960×160，透明、半透明近景剪影，左右边缘相等。
6. 可选 player_idle、player_run：尝试重做，但呼吸与左右腿交替未达到预期，因此未放入替换包，游戏中仍用旧版。

接入提示：窗框外的照片、卷帘等属于贴墙装饰；建议在游戏实机中检查背景视觉比例与动画连续性。

文件清单：
bg_f1_arena@2x.png — 960×640 PNG
bg_f1_mid@2x.png — 960×640 PNG
bg_f1_near@2x.png — 960×160 PNG
bg_f2_arena@2x.png — 960×640 PNG
bg_f2_mid@2x.png — 960×640 PNG
bg_f2_near@2x.png — 960×160 PNG
bg_f3_arena@2x.png — 960×640 PNG
bg_f3_mid@2x.png — 960×640 PNG
bg_f3_near@2x.png — 960×160 PNG
boss_ceo_pound@2x.png — 1280×176 PNG
decor_f1_lamp@2x.png — 48×32 PNG
decor_f2_lamp@2x.png — 48×32 PNG
decor_f3_chandelier@2x.png — 64×48 PNG
tiles_f1@2x.png — 256×96 PNG
tiles_f2@2x.png — 256×96 PNG
tiles_f3@2x.png — 256×96 PNG
