#!/usr/bin/env python3
"""Offline synthetic fixture tests; do not use these drawings as game assets."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

from PIL import Image, ImageDraw


SPEC = importlib.util.spec_from_file_location("process_art", Path(__file__).with_name("process-art.py"))
art = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(art)


class ArtPipelineTest(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.root = Path(tmp.name)
        self.source = self.root / "source"
        self.source.mkdir()
        self.target = self.root / "target"
        self.review = self.root / "review.png"
        self.config = self.root / "prompt.json"

    def run_pipeline(self, assets, **config):
        self.config.write_text(json.dumps(dict(assets=assets, **config)), encoding="utf-8")
        art.build(self.config, self.source, self.target, self.review)
        return json.loads((self.target/"manifest.json").read_text(encoding="utf-8"))["assets"]

    def test_chroma_key_mixed_and_white_rims(self):
        for key, background, contaminated in (
            ("magenta", (255, 0, 255), (185, 75, 178)),
            ("green", (0, 255, 0), (75, 185, 75)),
        ):
            with self.subTest(key=key):
                image = Image.new("RGBA", (24, 24), background)
                pen = ImageDraw.Draw(image)
                paint = (60, 70, 80)
                pen.rectangle((6, 6, 17, 17), fill=paint)
                pen.line((5, 6, 5, 17), fill=contaminated)
                pen.line((6, 5, 17, 5), fill=(245, 244, 244))
                pen.rectangle((9, 9, 14, 14), fill=(245, 244, 244))
                result = art.key_sprite(image, key)
                self.assertEqual(result.getpixel((0, 0)), (0, 0, 0, 0))
                fringe = result.getpixel((5, 11))
                self.assertEqual(fringe[:3], paint)
                self.assertTrue(0 < fringe[3] < 255, fringe)
                self.assertEqual(result.getpixel((11, 5)), (*paint, 255))
                self.assertEqual(result.getpixel((11, 11)), (245, 244, 244, 255))

    def test_controlled_crops_anchors_webp_and_review(self):
        source = Image.new("RGB", (64, 32), (255, 0, 255))
        draw = ImageDraw.Draw(source)
        draw.rectangle((5, 8, 22, 25), fill=(117, 68, 35))
        draw.rectangle((36, 7, 60, 26), fill=(58, 94, 136))
        source.save(self.source/"sheet.png")
        Image.new("RGB", (100, 60), (90, 120, 145)).save(self.source/"sky.png")
        entries = self.run_pipeline([
            {"id": "sprite-a", "source": "sheet.png", "size": [64, 64], "crop": [0, 0, 32, 32]},
            {"id": "sprite-b", "source": "sheet.png", "size": [96, 96], "crop": [32, 0, 64, 32],
             "tileW": 2.5, "tileH": 2, "anchor": [0.5, 0.8], "targetAnchor": [0.5, 0.6]},
            {"id": "sky", "source": "sky.png", "size": [1024, 576], "key": "none", "format": "webp"},
        ])
        a, b, sky = (entries[v] for v in ("sprite-a", "sprite-b", "sky"))
        self.assertEqual([a["anchorX"], a["anchorY"]], [32, 60])
        self.assertEqual([b["anchorX"], b["anchorY"], b["tileW"], b["tileH"]], [48, 58, 2.5, 2])
        self.assertEqual(sky["contentBox"], [0, 0, 1024, 576])
        for info in entries.values():
            path = self.target/info["file"]
            self.assertEqual(info["bytes"], path.stat().st_size)
            self.assertLess(info["bytes"], 180_000)
            with Image.open(path) as image:
                self.assertEqual(image.size, (info["width"], info["height"]))
                if info is a or info is b:
                    self.assertEqual(image.convert("RGBA").getpixel((0, 0)), (0, 0, 0, 0))
                    self.assertGreater(image.convert("RGBA").getpixel((image.width//2, image.height//2))[3], 240)
        with Image.open(self.review) as review:
            self.assertEqual(review.getpixel((13, 92)), (242, 244, 245))
            self.assertEqual(review.getpixel((183, 92)), art.ICE)

    def test_rejects_empty_crop_path_escape_and_over_budget(self):
        Image.new("RGB", (20, 20), (255, 0, 255)).save(self.source/"empty.png")
        asset = {"id": "dummy", "source": "empty.png", "size": [64, 64]}
        with self.assertRaisesRegex(ValueError, "no foreground"):
            self.run_pipeline([asset])
        with self.assertRaisesRegex(ValueError, "outside --source-dir"):
            self.run_pipeline([dict(asset, source="../empty.png")])
        with self.assertRaisesRegex(ValueError, "crop outside"):
            self.run_pipeline([dict(asset, crop=[0, 0, 888, 888])])
        with self.assertRaisesRegex(ValueError, "budget exceeded"):
            self.run_pipeline([dict(asset, key="none")], budgetBytes=1)
        self.assertFalse(self.target.exists())


if __name__ == "__main__":
    unittest.main()
