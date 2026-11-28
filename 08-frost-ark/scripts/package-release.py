#!/usr/bin/env python3
"""Package the validated static build and four read-only shared portraits."""
from argparse import ArgumentParser
from hashlib import sha256
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

root=Path(__file__).resolve().parents[1]
p=ArgumentParser()
p.add_argument("target",type=Path)
args=p.parse_args()
assets=[root.parent/"assets/character"/f"head-{i}.png" for i in range(4)]
game=[root/"index.html",root/"benchmark.html",*sorted((root/"dist").rglob("*")),*sorted((root/"cover").rglob("*"))]
assert (root/"dist/index.html").is_file() and (root/"cover/cover-frost-ark.webp").is_file()
args.target.parent.mkdir(parents=True,exist_ok=True)
with ZipFile(args.target,"w",ZIP_DEFLATED,compresslevel=6) as output:
    for file in [*game,*assets]:
        if file.is_file(): output.write(file,file.relative_to(root.parent).as_posix())
with ZipFile(args.target) as output:
    bad=output.testzip()
    if bad: raise RuntimeError(f"invalid release member: {bad}")
print(f"{args.target.name}	{args.target.stat().st_size}	{sha256(args.target.read_bytes()).hexdigest()}")
