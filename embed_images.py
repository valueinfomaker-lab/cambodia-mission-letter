"""Embed all <img src="extracted_images/..."> into index.html as base64 data URIs.

Re-runnable: takes `index.source.html` as the clean source and writes embedded
output to `index.html`. On the first run, it copies the current `index.html`
to `index.source.html` so the original (relative-path) version is preserved.
"""
from __future__ import annotations

import base64
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SOURCE_HTML = ROOT / "index.source.html"
TARGET_HTML = ROOT / "index.html"

PATTERN_IMG = re.compile(r'src="(extracted_images/[^"]+)"')
PATTERN_DATA_SRC = re.compile(r'src="data:image/[^"]+"')


def encode_image(rel_path: str) -> str:
    img_path = ROOT / rel_path
    if not img_path.exists():
        raise FileNotFoundError(img_path)
    suffix = img_path.suffix.lower().lstrip(".")
    mime = "image/jpeg" if suffix in ("jpg", "jpeg") else f"image/{suffix}"
    b64 = base64.b64encode(img_path.read_bytes()).decode("ascii")
    return f"data:{mime};base64,{b64}"


def ensure_source() -> None:
    """If source backup doesn't exist, create one from current index.html.

    If current index.html already has data: URIs (i.e. previously embedded),
    refuse rather than corrupting the source backup.
    """
    if SOURCE_HTML.exists():
        return
    current = TARGET_HTML.read_text(encoding="utf-8")
    if PATTERN_DATA_SRC.search(current):
        raise SystemExit(
            "index.html appears to already contain embedded images, "
            "but index.source.html is missing. Refusing to overwrite the source."
        )
    shutil.copy2(TARGET_HTML, SOURCE_HTML)
    print(f"  created backup: {SOURCE_HTML.name}")


def main() -> None:
    ensure_source()
    html = SOURCE_HTML.read_text(encoding="utf-8")
    seen: dict[str, str] = {}
    count = 0

    def replace(match: re.Match[str]) -> str:
        nonlocal count
        rel = match.group(1)
        if rel not in seen:
            seen[rel] = encode_image(rel)
            count += 1
        return f'src="{seen[rel]}"'

    out = PATTERN_IMG.sub(replace, html)
    TARGET_HTML.write_text(out, encoding="utf-8")

    src_kb = SOURCE_HTML.stat().st_size / 1024
    out_kb = TARGET_HTML.stat().st_size / 1024
    print(f"embedded {count} unique images")
    print(f"  source : {src_kb:>9.1f} KB  ({SOURCE_HTML.name})")
    print(f"  target : {out_kb:>9.1f} KB  ({TARGET_HTML.name})")


if __name__ == "__main__":
    main()
