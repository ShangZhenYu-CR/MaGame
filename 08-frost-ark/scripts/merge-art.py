"""Integrate a reviewed art batch without dropping the approved catalog."""
import argparse
import json
from pathlib import Path
from shutil import copyfile

here = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("config", type=Path)
parser.add_argument("batch", type=Path)
args = parser.parse_args()
catalog = here / "src/assets/art"
manifest_path, prompts_path = catalog / "manifest.json", here / "art/prompts.json"

def read(path):
    return json.loads(path.read_text(encoding="utf-8"))

base, batch, specs, prompts = read(manifest_path), read(args.batch / "manifest.json"), read(args.config), read(prompts_path)
if base["version"] != 1 or batch["version"] != 1:
    raise SystemExit("Manifest version mismatch")
old, new = base["assets"], batch["assets"]
reviewed = specs["assets"]
if not new or len(reviewed) != len(new) or {v["id"] for v in reviewed} != set(new):
    raise SystemExit("Batch configuration and processed IDs differ")
if old.keys() & new.keys():
    raise SystemExit("Refusing to overwrite an approved asset ID")
names, total = set(), 0
for root, group in ((catalog, old), (args.batch, new)):
    for key, entry in group.items():
        file = entry["file"]
        if file not in {key + ".png", key + ".webp"} or Path(file).name != file or file in names:
            raise SystemExit(f"Improper or duplicate asset path: {file}")
        names.add(file)
        actual = (root / file).stat().st_size
        if entry["bytes"] != actual or (root == args.batch and (catalog / file).exists()):
            raise SystemExit(f"Size or destination mismatch: {file}")
        total += actual
if total > 9_000_000:
    raise SystemExit(f"Combined art budget exceeded: {total:,} bytes")
new_prompts = specs.get("prompts", {})
if prompts["prompts"].keys() & new_prompts.keys():
    raise SystemExit("Duplicate prompt ID")
for entry in new.values():
    file = entry["file"]
    copyfile(args.batch / file, catalog / file)
old.update(new)
prompts["assets"].extend(reviewed)
prompts["prompts"].update(new_prompts)
if specs.get("references"):
    prompts.setdefault("batchReferences", []).append(specs["references"])
for path, data in ((prompts_path, prompts), (manifest_path, base)):
    stage = path.with_suffix(".tmp")
    stage.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    stage.replace(path)
print(f"{len(new)} reviewed additions; {len(old)} assets / {total:,} bytes total")
