# 霜云方舟 · 精绘素材入库

原图由 imagegen 生成，仅放在仓库外的临时目录。游戏与试玩 ZIP 使用
`src/assets/art/` 的精简文件，不依赖原图或网络，也不在游戏启动时运行 Python。

## 从原图到审片

需要 Python 3.10+、Pillow 10.0+（带 WebP 编码）。

```bash
python -m pip install 'Pillow>=10'
python scripts/test-process-art.py
python scripts/process-art.py --config art/prompts.json --source-dir /tmp/frost-ark-originals
```

建议第一次以 `--output-dir /tmp/frost-ark-review/art` 和
`--review /tmp/frost-ark-review/art-review-sheet.png` 写入临时目录；先打开审片，
确认浅灰棋盘和深冰蓝底上的粉边、绿边与白边，检查视角、形象与比例。不合格的
单件重生或重新调整裁框再跑，不能把未审片素材接入游戏。通过后再用默认输出目录
`src/assets/art/`、默认审片图 `artifacts/art-review-sheet.png` 重跑。

`art/prompts.json` 可保存生图描述与源文件来源；CLI 只消费 `assets` 数组：

```json
{
  "assets": [
    {
      "id": "manan-south", "source": "manan-directions.png",
      "crop": [0, 0, 512, 512], "size": [128, 128], "key": "magenta",
      "tileW": 1.0, "tileH": 1.0
    },
    {
      "id": "cloud-sea", "source": "clouds.png",
      "size": [1024, 576], "key": "none", "format": "webp"
    }
  ]
}
```

- `crop` 是原图中的 `[左, 上, 右, 下]` 像素坐标（不含右、下边）；不填使用整张原图。拼版图必须为每个精灵填写独立裁框，别让相邻素材进入同一框。
- `key` 选 `magenta`（默认）、`green` 或 `none`。只有无幕布的背景图或已经透明的输入应该用 `none`；对透明物件同时注明 `"fit": "contain"`。常规纯洋红和纯绿用默认阈值；个别生成件可调整 `keyClear`、`keyOpaque` 与 `fringe`，避免误删主体高饱和小部件。
- `fit` 默认对有幕布输入紧裁后等比放入规范画布（`contain`），无幕布背景使用等比铺满（`cover`）。需要铺满固定 UV 区域时可以明确选择 `stretch`；此时脚底位置需用 `targetAnchor` 明确指定。
- 地面精灵默认把紧裁后的底边中心对齐画布宽度 50%、高度 94.5% 处。透视地基、炉体或垂挂结构可用 `anchor` 覆盖主体的脚底位置，并用 `targetAnchor` 调整到输出画布的位置，轴向 `0 = 左/上`、`1 = 右/下`。`tileW`、`tileH` 是渲染时整个画布的世界格尺寸，可以是小数；清单中的 `anchorX`、`anchorY` 和 `contentBox` 均为输出像素。
- 先尝试保留原颜色的轻量 PNG 或无损 WebP，超出预算才逐级压缩。上限：常规精灵每张 90,000 字节、背景 180,000 字节、整批 4,500,000 字节。测试用的几何图仅生成在临时目录，从不成为素材。旧版废弃文件应显式移除，不能继续打入试玩包。

## 只处理一批新增素材

增量制作时，把 `process-art.py` 的 `--output-dir` 和 `--review` 指向临时目录。
打开双背景审片图验过后，用
`python scripts/merge-art.py /tmp/batch-prompts.json /tmp/processed-art` 合并。
合并器保留既有资产，拒绝重复 ID、文件、字节不符及超过总预算的批次。
