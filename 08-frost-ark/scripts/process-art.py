#!/usr/bin/env python3
"""Prepare generated hand-painted art for Frost Ark (Python 3.10+, Pillow)."""
import argparse
from functools import lru_cache
from io import BytesIO
import json
from math import isfinite
from pathlib import Path
import re
import tempfile

from PIL import Image, ImageDraw, ImageOps


KEYS = {"magenta": (255, 0, 255), "green": (0, 255, 0)}
ROOT = Path(__file__).resolve().parents[1]
ICE = (12, 21, 32)
SLATE = (21, 36, 54)
LANCZOS = Image.Resampling.LANCZOS


def coords(values, length, label, check):
    if not isinstance(values, (tuple, list)) or len(values) != length or not all(check(v) for v in values):
        raise ValueError(f"invalid {label}: {values!r}")
    return values


def integers(values, length, label, lo=0, hi=2048):
    return coords(values, length, label, lambda v: type(v) is int and lo <= v <= hi)


def unit_pair(values, label):
    return coords(values, 2, label, lambda v: type(v) in (int, float) and 0 <= v <= 1)


def positive(value, label):
    if type(value) not in (int, float) or not isfinite(value) or value <= 0:
        raise ValueError(f"invalid {label}: {value!r}")
    return value


def grade(rgb):
    """Soften only the most saturated pixels; keep regular material values intact."""
    high, low = max(rgb), min(rgb)
    chroma = high - low
    if chroma < 120:
        return rgb
    moderate = min(0.12, (chroma - 120) / 950)
    lightness = sum(c * w for c, w in zip(rgb, (0.2126, 0.7152, 0.0722)))
    return tuple(round(c + (lightness - c) * moderate) for c in rgb)


def key_sprite(image, key, clear=38, opaque=140, fringe=2):
    """Clear near-key and reconstruct foreground in a short band on its edge.

    Work in straight RGBA, replacing the RGB of feathered/key-biased pixels
    with adjacent opaque paint. This avoids a bright outline on dark or light
    ground when alpha blends. Solid internal whites are left alone.
    """
    width, height = image.size
    pixels = image.convert("RGBA")
    source = list(pixels.get_flattened_data() if hasattr(pixels, "get_flattened_data") else pixels.getdata())
    if key not in KEYS:
        raise ValueError(f"unknown key {key!r}; use magenta, green, or none")
    matte = KEYS[key]
    distance = [max(abs(c - k) for c, k in zip(pixel[:3], matte)) for pixel in source]
    alpha = [round(p[3] * max(0, min(1, (d - clear) / (opaque - clear))))
             for p, d in zip(source, distance)]

    def bias(color):
        red, green, blue = color[:3]
        return min(red, blue) - green if key == "magenta" else green - max(red, blue)

    def close(x, y, radius):
        return (yy * width + xx for yy in range(max(0, y-radius), min(height, y+radius+1))
                for xx in range(max(0, x-radius), min(width, x+radius+1)))

    result = []
    for idx, (pixel, mask) in enumerate(zip(source, alpha)):
        if not mask:
            result.append((0, 0, 0, 0))
            continue
        x, y = idx % width, idx // width
        rgb = pixel[:3]
        if alpha[idx] < 250 or bias(rgb) > 17 or (min(rgb) > 224 and max(rgb) - min(rgb) < 20):
            on_edge = any(alpha[j] < 130 for j in close(x, y, fringe))
            if on_edge:
                # Slightly deeper uncontaminated paint is a reliable foreground
                # estimate; do not turn an intentional white subject gray.
                donors = [j for j in close(x, y, fringe + 2)
                          if alpha[j] >= 250 and bias(source[j]) <= 12]
                nonwhite = [j for j in donors if min(source[j][:3]) < 214]
                white_rim = max(rgb) - min(rgb) < 20 and min(rgb) > 224
                if white_rim and nonwhite:
                    # Only a one-pixel white fringe abutting keyed pixels is
                    # replaced; extended pale or snowy details remain intact.
                    nearest = min(nonwhite, key=lambda j: (j%width-x)**2 + (j//width-y)**2)
                    if (nearest%width-x)**2 + (nearest//width-y)**2 <= 2 and any(
                        alpha[j] < 40 for j in close(x, y, 1)
                    ):
                        rgb = source[nearest][:3]
                elif (mask < 250 or bias(rgb) > 17) and donors:
                    nearest = min(donors, key=lambda j: (j%width-x)**2 + (j//width-y)**2)
                    rgb = source[nearest][:3]
                elif bias(rgb) > 17:
                    # Extremely thin details may have no solid donor. Neutralize
                    # excess keyed channel instead of leaving a tinted outline.
                    red, green, blue = rgb
                    rgb = (min(red, green + 14), green, min(blue, green + 14)) if key == "magenta" else (
                        red, min(green, max(red, blue) + 14), blue)
        result.append((*grade(rgb), mask))
    output = Image.new("RGBA", image.size)
    output.putdata(result)
    return output


def tight_box(image):
    # Don't let wisps of low-alpha residue around the subject dictate the scale.
    return image.getchannel("A").point(lambda v: 255 if v >= 25 else 0).getbbox()


def sprite_canvas(image, asset, size):
    box = tight_box(image)
    if not box:
        raise ValueError("source crop has no foreground after chroma key")
    image = image.crop(box)
    sw, sh = image.size
    tw, th = size
    ax, ay = unit_pair(asset.get("anchor", [0.5, 1]), "anchor")
    dx, dy = unit_pair(asset.get("targetAnchor", [0.5, 0.945]), "targetAnchor")
    padding, = integers([asset.get("padding", 2)], 1, "padding")
    x, y = round(tw * dx), round(th * dy)
    constraints = [(x-padding, sw*ax), (tw-x-padding, sw*(1-ax)),
                   (y-padding, sh*ay), (th-y-padding, sh*(1-ay))]
    scale = min(span / segment for span, segment in constraints if segment > 0)
    if scale <= 0:
        raise ValueError("targetAnchor does not leave room to fit the sprite with its padding")
    scaled = max(1, round(sw*scale)), max(1, round(sh*scale))
    image = image.resize(scaled, LANCZOS)
    result = Image.new("RGBA", size)
    result.paste(image, (x-round(scaled[0]*ax), y-round(scaled[1]*ay)))
    return result, x, y


def prepare(image, asset, size):
    mode = asset.get("key", "magenta")
    if mode != "none":
        clear, opaque = integers([asset.get("keyClear", 38), asset.get("keyOpaque", 140)],
                                 2, "key thresholds", hi=255)
        fringe, = integers([asset.get("fringe", 2)], 1, "fringe radius", lo=1, hi=6)
        if clear >= opaque:
            raise ValueError("keyClear must be below keyOpaque")
        image = key_sprite(image, mode, clear, opaque, fringe)
    fit = asset.get("fit", "cover" if mode == "none" else "contain")
    if fit == "contain":
        return sprite_canvas(image, asset, size)
    if fit not in {"cover", "stretch"}:
        raise ValueError(f"unknown fit {fit!r}")
    x, y = unit_pair(asset.get("targetAnchor", [0.5, 0.5]), "targetAnchor")
    result = ImageOps.fit(image, size, LANCZOS) if fit == "cover" else image.resize(size, LANCZOS)
    if mode == "none" and result.getchannel("A").getextrema() == (255, 255):
        result = result.convert("RGB")
    return result, round(x * size[0]), round(y * size[1])


def defringe_magenta(image):
    """Opt-in final composite-safe edge cleanup for palettes without purple.

    Saturated backing that survives the first key is transparent. Preserve the
    warm/cold hue of remaining semi-transparent details by removing only their
    shared magenta excess, including the resizer's ringing pixels.
    """
    cleaned = []
    image = image.convert("RGBA")
    pixels = image.get_flattened_data() if hasattr(image, "get_flattened_data") else image.getdata()
    for r, g, b, a in pixels:
        bias = min(r, b) - g
        if a < 4 or (bias > 48 and abs(r-b) <= 100):
            cleaned.append((0, 0, 0, 0))
            continue
        excess = max(0, bias - 10)
        cleaned.append((r-excess, g, b-excess, a))
    image.putdata(cleaned)
    return image


def encode(image, fmt, limit):
    # Prefer full RGBA without palette quantization. If PNG is too big, try
    # progressively smaller RGBA palettes, letting Pillow quantize alpha too.
    if fmt == "png":
        def encodings():
            yield image, {"optimize": True}
            for colors in (256, 224, 192, 160, 128):
                yield image.convert("RGBA").quantize(colors, Image.Quantize.FASTOCTREE), {'optimize': True}
    else:
        def encodings():
            yield image, {'lossless': True, 'method': 6, 'exact': True}
            for quality in (92, 86, 80, 74, 68, 60):
                yield image, {'quality': quality, 'method': 6, 'exact': True}
    for candidate, options in encodings():
        buffer = BytesIO()
        candidate.save(buffer, format=fmt.upper(), **options)
        if buffer.tell() <= limit:
            return buffer.getvalue()
    raise ValueError(f"can't fit {fmt.upper()} inside {limit:,} bytes without excessive compression")


def review_sheet(entries):
    columns = min(3, len(entries))
    width, row_height = 360, 207
    sheet = Image.new("RGB", (width*columns, 58 + row_height*((len(entries)+columns-1)//columns)), ICE)
    draw = ImageDraw.Draw(sheet)
    draw.text((16, 12), "FROST ARK / ART REVIEW", fill="#e0edf6")
    draw.text((16, 32), "Alpha and anchoring checks: light checkerboard | deep ice", fill="#a8c3d8")
    for i, (asset_id, info, image) in enumerate(entries):
        x, y = (i % columns)*width, 58+(i//columns)*row_height
        draw.rectangle((x+4, y+4, x+width-5, y+row_height-5), fill=SLATE)
        draw.text((x+12, y+10), asset_id, fill="#e3eef6")
        draw.text((x+12, y+186), f"{info['width']}x{info['height']} | anchor {info['anchorX']},{info['anchorY']} | {info['bytes']:,} bytes", fill="#bed3e0")
        preview = image.convert("RGBA")
        preview.thumbnail((157, 145), LANCZOS)
        for offset, checker in ((10, True), (182, False)):
            panel = Image.new("RGB", (168, 148), ICE)
            if checker:
                panel_draw = ImageDraw.Draw(panel)
                for yy in range(0, 148, 12):
                    for xx in range(0, 168, 12):
                        shade = "#dce2e6" if (xx//12 + yy//12) % 2 else "#f2f4f5"
                        panel_draw.rectangle((xx, yy, xx+11, yy+11), fill=shade)
            panel.paste(preview, ((168-preview.width)//2, (148-preview.height)//2), preview)
            sheet.paste(panel, (x+offset, y+31))
    return sheet


def build(config_path, source_dir, output_dir, review_path):
    config = json.loads(config_path.read_text(encoding="utf-8"))
    if not isinstance(config.get("assets"), list) or not config["assets"]:
        raise ValueError("config must contain a nonempty assets array")
    source_dir = source_dir.resolve()
    output_dir = output_dir.resolve()
    if output_dir == source_dir or output_dir.is_relative_to(source_dir):
        raise ValueError("processed output directory must be separate from source directory")
    assets = {}
    encoded = {}
    review_entries = []

    @lru_cache(maxsize=8)
    def load(source):
        with Image.open(source) as raw:
            return ImageOps.exif_transpose(raw).convert("RGBA")

    for asset in config["assets"]:
        asset_id = asset.get("id")
        if not isinstance(asset_id, str) or not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", asset_id):
            raise ValueError(f"invalid asset id {asset_id!r}")
        if asset_id in assets:
            raise ValueError(f"duplicate asset id {asset_id}")
        try:
            source = (source_dir / asset["source"]).resolve()
            if not source.is_relative_to(source_dir):
                raise ValueError("source is outside --source-dir")
            size = integers(asset["size"], 2, "size", lo=1, hi=1024)
            fmt = asset.get("format", "png")
            if fmt not in {"png", "webp"}:
                raise ValueError("format must be png or webp")
            image = load(source)
            if "crop" in asset:
                left, top, right, bottom = integers(asset["crop"], 4, "crop", hi=65536)
                if not (left < right <= image.width and top < bottom <= image.height):
                    raise ValueError(f"crop outside source {image.size}: {asset['crop']}")
                image = image.crop((left, top, right, bottom))
            processed, anchor_x, anchor_y = prepare(image, asset, size)
            if asset.get("postDefringe") == "magenta":
                processed = defringe_magenta(processed)
            limit = min(asset.get("maxBytes", 180_000 if asset.get("key") == "none" else 90_000),
                        180_000 if asset.get("key") == "none" else 90_000)
            data = encode(processed, fmt, positive(limit, "maxBytes"))
            file = f"{asset_id}.{fmt}"
            with Image.open(BytesIO(data)) as verified:
                review_image = verified.convert("RGBA")
            content_box = tight_box(review_image)
            if not content_box:
                raise ValueError("encoded image has no visible foreground")
            info = {
                "file": file, "width": processed.width, "height": processed.height,
                "anchorX": anchor_x, "anchorY": anchor_y,
                "tileW": positive(asset.get("tileW", 1), "tileW"),
                "tileH": positive(asset.get("tileH", 1), "tileH"),
                "contentBox": content_box,
                "bytes": len(data),
            }
            assets[asset_id] = info
            encoded[file] = data
            review_entries.append((asset_id, info, review_image))
        except (KeyError, TypeError, OSError, ValueError) as error:
            raise ValueError(f"{asset_id}: {error}") from error

    total = sum(len(data) for data in encoded.values())
    budget = min(positive(config.get("budgetBytes", 4_500_000), "budgetBytes"), 4_500_000)
    if total > budget:
        raise ValueError(f"asset budget exceeded: {total:,} of {budget:,} bytes")
    output_dir.mkdir(parents=True, exist_ok=True)
    review_path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix=".art-", dir=output_dir) as scratch:
        stage = Path(scratch)
        for file, data in encoded.items():
            (stage / file).write_bytes(data)
        manifest = {"version": 1, "assets": assets}
        (stage / "manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        review_sheet(review_entries).save(review_path, optimize=True)
        for file in encoded:
            (stage / file).replace(output_dir / file)
        (stage / "manifest.json").replace(output_dir / "manifest.json")
    print(f"{len(assets)} assets, {total:,}/{budget:,} bytes; review: {review_path}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", type=Path, default=ROOT/"art/prompts.json")
    parser.add_argument("--source-dir", type=Path, required=True, help="untracked imagegen source directory")
    parser.add_argument("--output-dir", type=Path, default=ROOT/"src/assets/art")
    parser.add_argument("--review", type=Path, default=ROOT/"artifacts/art-review-sheet.png")
    args = parser.parse_args()
    try:
        build(args.config, args.source_dir, args.output_dir, args.review)
    except (OSError, ValueError) as error:
        parser.exit(2, f"process-art: {error}\n")


if __name__ == "__main__":
    main()
