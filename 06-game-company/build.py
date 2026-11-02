#!/usr/bin/env python3
"""把 src/ 里的模块拼成 index.html。

用法：
  python build.py          图片按相对路径引用 art/ 下的文件（默认，index.html 很小，发布时要带上 art/ 目录）
  python build.py --embed  图片全部内嵌进 index.html（单文件可运行，但体积大）
"""
import base64, hashlib, json, pathlib, sys

here = pathlib.Path(__file__).parent
order = ['version', 'engine', 'art', 'level', 'actors', 'bosses', 'game']
embed = '--embed' in sys.argv

# 文件名带 @2x 的是两倍精度素材，同名时优先用 @2x
art = {}
for p in sorted((here / 'art').rglob('*.png'), key=lambda p: ('@2x' in p.stem, str(p))):
    if embed:
        src = 'data:image/png;base64,' + base64.b64encode(p.read_bytes()).decode()
    else:
        # 加上内容哈希，素材更新后浏览器不会继续用缓存里的旧图
        src = p.relative_to(here).as_posix() + '?v=' + hashlib.md5(p.read_bytes()).hexdigest()[:8]
    art[p.stem.replace('@2x', '')] = {'src': src, 's': 2} if '@2x' in p.stem else src

anc = {}
for p in sorted((here / 'art').rglob('anchors.json')):
    anc.update(json.loads(p.read_text(encoding='utf-8')))

# 非正方形帧的帧宽（逻辑像素），按名字前缀匹配
fw_table = json.loads((here / 'art' / 'frames.json').read_text(encoding='utf-8'))

def frame_w(name, height, scale, width=None):
    # 单张图（装饰物、武器、图标）整张就是一帧
    if width is not None and name.startswith(('decor_', 'weapon_', 'icon_')):
        return width
    for k, v in fw_table.items():
        if name.startswith(k):
            return v * scale
    return height

# 每帧底部透明行数（逻辑像素）：以脚底为锚点的素材画的时候往下补，避免悬空。
# 有 Pillow 就重新量并写进 art/gaps.json；没有就沿用上次量好的文件。
gaps_file = here / 'art' / 'gaps.json'
try:
    from PIL import Image
    gaps = {}
    for p in sorted((here / 'art').rglob('*.png')):
        name = p.stem.replace('@2x', '')
        if not name.startswith(('player_', 'enemy_', 'boss_', 'pk_', 'decor_')):
            continue
        scale = 2 if '@2x' in p.stem else 1
        im = Image.open(p).convert('RGBA')
        w = frame_w(name, im.height, scale, im.width)
        alpha = im.getchannel('A')
        row = []
        for i in range(max(1, im.width // w)):
            bb = alpha.crop((i * w, 0, i * w + w, im.height)).getbbox()
            row.append(round((im.height - bb[3]) / scale, 1) if bb else 0)
        if any(row):
            gaps[name] = row
    gaps_file.write_text(json.dumps(gaps, ensure_ascii=False), encoding='utf-8')
except ImportError:
    gaps = json.loads(gaps_file.read_text(encoding='utf-8')) if gaps_file.exists() else {}

js = ('const ART_SRC=' + json.dumps(art) + ';\nconst ART_ANCHOR=' + json.dumps(anc) + ';\nconst ART_FW=' + json.dumps(fw_table)
      + ';\nconst ART_GAP=' + json.dumps(gaps) + ';\n'
      + '\n'.join((here / 'src' / f'{m}.js').read_text(encoding='utf-8') for m in order))
shell = (here / 'src' / 'shell.html').read_text(encoding='utf-8')
(here / 'index.html').write_text(shell.replace('__JS__', js), encoding='utf-8')
print('已生成 index.html，', len(js), '字符', '（图片内嵌）' if embed else '（图片引用 art/）')
