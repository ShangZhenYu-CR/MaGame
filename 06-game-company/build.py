#!/usr/bin/env python3
"""把 src/ 里的模块拼成 index.html。

用法：
  python build.py          图片按相对路径引用 art/ 下的文件（默认，index.html 很小，发布时要带上 art/ 目录）
  python build.py --embed  图片全部内嵌进 index.html（单文件可运行，但体积大）
"""
import base64, json, pathlib, sys

here = pathlib.Path(__file__).parent
order = ['engine', 'art', 'level', 'actors', 'bosses', 'game']
embed = '--embed' in sys.argv

# 文件名带 @2x 的是两倍精度素材，同名时优先用 @2x
art = {}
for p in sorted((here / 'art').rglob('*.png'), key=lambda p: ('@2x' in p.stem, str(p))):
    if embed:
        src = 'data:image/png;base64,' + base64.b64encode(p.read_bytes()).decode()
    else:
        src = p.relative_to(here).as_posix()
    art[p.stem.replace('@2x', '')] = {'src': src, 's': 2} if '@2x' in p.stem else src

anc = {}
for p in sorted((here / 'art').rglob('anchors.json')):
    anc.update(json.loads(p.read_text(encoding='utf-8')))

js = ('const ART_SRC=' + json.dumps(art) + ';\nconst ART_ANCHOR=' + json.dumps(anc) + ';\n'
      + '\n'.join((here / 'src' / f'{m}.js').read_text(encoding='utf-8') for m in order))
shell = (here / 'src' / 'shell.html').read_text(encoding='utf-8')
(here / 'index.html').write_text(shell.replace('__JS__', js), encoding='utf-8')
print('已生成 index.html，', len(js), '字符', '（图片内嵌）' if embed else '（图片引用 art/）')
