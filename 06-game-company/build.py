#!/usr/bin/env python3
"""把 src/ 里的模块拼成单文件 index.html。用法：python build.py"""
import pathlib
here=pathlib.Path(__file__).parent
order=['engine','art','level','actors','bosses','game']
import base64,json
# 文件名带 @2x 的是两倍精度素材，同名时优先用 @2x
art={}
for p in sorted((here/'art').rglob('*.png'),key=lambda p:('@2x' in p.stem,str(p))):
    uri='data:image/png;base64,'+base64.b64encode(p.read_bytes()).decode()
    art[p.stem.replace('@2x','')]={'src':uri,'s':2} if '@2x' in p.stem else uri
anc={}
for p in sorted((here/'art').rglob('anchors.json')):anc.update(json.loads(p.read_text(encoding='utf-8')))
js='const ART_SRC='+json.dumps(art)+';\nconst ART_ANCHOR='+json.dumps(anc)+';\n'+'\n'.join((here/'src'/f'{m}.js').read_text(encoding='utf-8') for m in order)
shell=(here/'src'/'shell.html').read_text(encoding='utf-8')
(here/'index.html').write_text(shell.replace('__JS__',js),encoding='utf-8')
print('已生成 index.html，', len(js), '字符')
