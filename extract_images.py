"""Extract individual photo regions from each composite slide.

Algorithm:
1. Find rows/columns that are nearly all white (background gutters between photos).
2. The non-white spans in each axis define candidate row-bands and col-bands.
3. For each band intersection, decide if it's a photo by checking saturation density.
4. Crop and save each photo cell.
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image

SOURCE_DIR = Path("/Users/joseph/mission/01.camboida/01.cambodia/photos")
OUTPUT_DIR = Path("/Users/joseph/mission/01.camboida/01.cambodia/extracted_images")

WHITE_THRESHOLD = 235
WHITE_FRACTION = 0.985
SAT_THRESHOLD = 25
PHOTO_SAT_FRACTION = 0.35
MIN_BAND_SIZE = 60


def find_bands(white_axis: np.ndarray) -> list[tuple[int, int]]:
    """Return [(start, end_inclusive), ...] of non-white spans along the axis."""
    bands: list[tuple[int, int]] = []
    n = len(white_axis)
    i = 0
    while i < n:
        if not white_axis[i]:
            j = i
            while j < n and not white_axis[j]:
                j += 1
            if j - i >= MIN_BAND_SIZE:
                bands.append((i, j - 1))
            i = j
        else:
            i += 1
    return bands


def extract(img_path: Path, output_subdir: Path) -> int:
    img = Image.open(img_path).convert("RGB")
    arr = np.array(img)
    H, W = arr.shape[:2]

    rgb_min = arr.min(axis=2)
    is_white = rgb_min >= WHITE_THRESHOLD

    row_white_frac = is_white.mean(axis=1)
    col_white_frac = is_white.mean(axis=0)
    row_is_gutter = row_white_frac >= WHITE_FRACTION
    col_is_gutter = col_white_frac >= WHITE_FRACTION

    row_bands = find_bands(row_is_gutter)
    col_bands = find_bands(col_is_gutter)

    if not row_bands or not col_bands:
        return 0

    sat = np.array(img.convert("HSV"))[:, :, 1]
    saturated = sat > SAT_THRESHOLD

    cells: list[tuple[int, int, int, int]] = []
    for y0, y1 in row_bands:
        for x0, x1 in col_bands:
            cell = saturated[y0 : y1 + 1, x0 : x1 + 1]
            if cell.size == 0:
                continue
            if cell.mean() >= PHOTO_SAT_FRACTION:
                cells.append((y0, x0, y1, x1))

    cells.sort(key=lambda c: (c[0], c[1]))

    output_subdir.mkdir(parents=True, exist_ok=True)
    for idx, (y0, x0, y1, x1) in enumerate(cells, start=1):
        cropped = img.crop((x0, y0, x1 + 1, y1 + 1))
        cropped.save(output_subdir / f"img_{idx:02d}.jpeg", quality=92)
    return len(cells)


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for src in sorted(SOURCE_DIR.glob("*.jpeg")):
        stem = src.stem.split()[-1]
        sub = OUTPUT_DIR / f"slide_{stem}"
        for old in sub.glob("*.jpeg"):
            old.unlink()
        n = extract(src, sub)
        print(f"{src.name}: {n} photos -> {sub.name}")


if __name__ == "__main__":
    main()
