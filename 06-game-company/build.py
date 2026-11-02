#!/usr/bin/env python3
"""把 src/ 里的模块拼成单文件 index.html。用法：python build.py"""
import pathlib
here=pathlib.Path(__file__).parent
order=['engine','art','level','actors','bosses','game']
import base64,json
art={p.stem:'data:image/png;base64,'+base64.b64encode(p.read_bytes()).decode() for p in sorted((here/'art').rglob('*.png'))}
js='const ART_SRC='+json.dumps(art)+';\n'+'\n'.join((here/'src'/f'{m}.js').read_text(encoding='utf-8') for m in order)
shell=(here/'src'/'shell.html').read_text(encoding='utf-8')
(here/'index.html').write_text(shell.replace('__JS__',js),encoding='utf-8')
print('已生成 index.html，', len(js), '字符')
