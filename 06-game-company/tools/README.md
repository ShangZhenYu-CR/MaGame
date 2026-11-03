# 回归测试脚本（Playwright + Chromium）

先 `python build.py`，再 `python tools/make_test.py` 生成 `test_dbg.html` / `test_chk.html`（已在 .gitignore，别提交）。

| 脚本 | 用法 | 检查什么 |
|---|---|---|
| `wpn.js` | `node tools/wpn.js $PWD/test_dbg.html` | 武器背包、切换器、各武器出招、地编工具 |
| `tut2.js` | 同上 | 新手教程 15 步能否走完 |
| `cdx.js` | 同上 | 图鉴、暂停 / 倒下回主页 |
| `tf.js` | 同上 | 刘敬阳半血变身、改名 |
| `ljy.js` | 同上 | 货梯 → 茶水间 → 天台 → 刘敬阳全招式 → 真结局 |
| `soak.js` | 同上 | 机器人自动跑 3 层，检查报错和对象数量上限 |
| `audit.js` | 先在 06-game-company 目录 `python -m http.server 8767`，再 `node tools/audit.js 输出目录 [武器,...]`，然后 `python tools/sheet.py 输出目录 表格目录` | 每把武器每段攻击逐帧截图拼表，看动作和特效是否对上 |
| `ljyv.js` | `node tools/ljyv.js $PWD/test_dbg.html 输出目录 '[["transform",false,[0.1,0.5,0.9]]]'` | 刘敬阳指定招式在指定时间点的画面 |
| `shv.js` | 起 http 服务后 `node tools/shv.js x 输出目录` | 剪切刀站立双手持、跑动背负、拔出 |

所有脚本输出最后一行 `errs []` 才算通过（页面无 JS 报错）。注意 `ljy.js` 里等待时间和 Boss 演出时长挂钩，改了演出时长要同步改等待。
