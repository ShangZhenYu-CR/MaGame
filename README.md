# MAGAME · 马楠游戏合集

以马楠为主角的一组网页小游戏。每个游戏一个文件夹，`index.html` 双击就能在浏览器里玩，也可以直接用 GitHub Pages 在线访问。

| 文件夹 | 游戏 | 类型 | 平台 |
|---|---|---|---|
| [01-sneak-off-work](01-sneak-off-work/) | 马楠偷偷下班（原版 + 升级版） | 2D 俯视潜行，30 关 | 电脑 / 手机 |
| [02-escape-office](02-escape-office/) | 马楠偷偷下班 2 · 下班大逃亡 | 2D 潜行 + 随机楼层 + 升级 | 电脑 / 手机 |
| [03-steady-day](03-steady-day/) | 马楠的踏实一天 | 竖屏跳跃，5 段 + 5 个 Boss | 手机 / 平板 |
| [04-run-home-3d](04-run-home-3d/) | 马楠下班跑 3D | 三车道跑酷 | 电脑 / 手机 |
| [05-weekend-island-3d](05-weekend-island-3d/) | 马楠的周末 | 3D 平台跳跃 + 三阶段 Boss | 电脑 |
| [06-game-company](06-game-company/) | 马楠：通关游戏公司 | 2D 像素横版动作肉鸽（类死亡细胞） | 电脑（支持手柄） |

其他目录：

- `media/`：角色短片、像素小猫“拿铁”解说版视频
- `assets/character/`：角色设定图、四种表情的抠图头像

## 在线游玩（GitHub Pages）

仓库 Settings → Pages → Source 选 `Deploy from a branch`，分支选 `main`、目录选 `/ (root)`。几分钟后访问：

`https://shangzhenyu-cr.github.io/MAGAME/`

首页是游戏选择页，每个游戏的地址是 `.../MAGAME/文件夹名/`。

## 约定

- 每个游戏一个文件夹，命名为 `两位序号-英文短名`，入口统一叫 `index.html`。
- 每个文件夹里放一份 `README.md`，写清玩法、操作和当前版本。
- 游戏尽量保持单文件可运行；3D 游戏会从 CDN 加载 three.js r128，需要联网。
- 需要模块化开发的游戏（如 06）把源码放在 `src/`，用 `build.py` 拼成 `index.html`。
- 新增游戏时：建文件夹 → 放 `index.html` 和 `README.md` → 在上面的表格和根目录 `index.html` 里各加一行。
