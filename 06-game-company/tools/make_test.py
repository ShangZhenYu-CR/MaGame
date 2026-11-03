#!/usr/bin/env python3
"""生成测试用页面：在 index.html / check.html 里注入 window.__dbg（测试脚本靠它执行游戏内代码）。
用法：python tools/make_test.py   → 生成 06-game-company/test_dbg.html 和 test_chk.html（不要提交这两个文件）"""
import pathlib
here = pathlib.Path(__file__).resolve().parent.parent
k = '}catch(e){__err(e)}</script></body></html>'
for src, dst in [('index.html', 'test_dbg.html'), ('check.html', 'test_chk.html')]:
    s = (here / src).read_text(encoding='utf-8')
    assert k in s, src + ' 结尾格式变了，更新 make_test.py'
    (here / dst).write_text(s.replace(k, 'window.__dbg=s=>eval(s);' + k), encoding='utf-8')
print('ok:', here / 'test_dbg.html', here / 'test_chk.html')
