# GitHub Pages / 首页接入交接

## 合并前

- 开发分支：`game/08-frost-ark`。在该分支固定候选 SHA，验证 Gate、干净 ZIP HTTP 与 file://、构建预览、截图和全量终验。
- `08-frost-ark/index.html` 可作项目子目录的 Pages 入口；`08-frost-ark/cover/index.html` 是带跳转的封面入口。子目录发布时仍保留只读的同级 `assets/character/head-0.png` 至 `head-3.png`。
- `main` 与现有正式 Pages 不代表未合入候选。没有用户授权，不变更生产部署来源，不修改首页，不新建公开发布仓库。
- 可先在本机运行 `npm run preview -- --host 127.0.0.1 --port 4173` 体验构建，或者在仓库父目录临时起静态 HTTP 服务检查与 Pages 等价的子目录入口。此预览不是发布。

## 用户确认后

1. 核对候选 SHA 与实际验收报告，单独审批合并。
2. 让主页标签指向 `./08-frost-ark/`；需要封面时用 `./08-frost-ark/cover/cover-frost-ark.webp`。仅更新用户批准的第 08 入口，不动其他游戏目录或共享头像。
3. GitHub Pages 部署成功后，清缓存重看首页第 08 卡片、子目录游戏、四张头像、首次音频解锁与新建存档；给用户实际 URL。

浏览器硬件横向对照可直接从候选 ZIP 打开 `benchmark.html`；固定船体、开启全部特效，不依赖正式 Pages，也不会写入正式存档。
