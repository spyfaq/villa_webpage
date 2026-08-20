#!/usr/bin/env python3
"""Re-encode the villa photography into genuine, web-sized WebP.

The originals in this repo were full-resolution camera JPEGs (~5000px, 7-16 MB)
that had simply been renamed to .webp, so visitors downloaded roughly 67 MB to
look at a grid of 220px-tall thumbnails.

This produces two tiers from each source image:

    images/thumbs/<name>.webp   800px wide, q85  -> the gallery grid
    images/<name>.webp         2200px wide, q84  -> the lightbox and hero

Quality was chosen by measuring PSNR against a lossless downscale and by
comparing 1:1 crops of the most detail-heavy shot; both tiers are visually
indistinguishable from the originals at the sizes the site displays. 2200px is
the width a 2x display needs for the lightbox, whose CSS caps it at 1100 CSS px.

EXIF is dropped (one original carried GPS coordinates), but any EXIF
orientation flag is baked into the pixels first so nothing rotates.

Usage:
    python script/optimize_images.py --source-dir images-originals
"""
import argparse
import sys
from pathlib import Path

try:
    from PIL import Image, ImageOps
except ImportError:
    sys.exit("Pillow is required: pip install pillow")

IMAGES_DIR = Path("images")
THUMBS_DIR = IMAGES_DIR / "thumbs"

FULL_WIDTH, FULL_QUALITY = 2200, 84
THUMB_WIDTH, THUMB_QUALITY = 800, 85

# Small UI assets keep their own treatment: resized to what they actually
# render at, and kept lossless so the alpha edges stay crisp.
UI_ASSETS = {"whatsapp.webp": 64}


def encode(image: Image.Image, width: int, quality: int, dest: Path, lossless=False):
    out = image.copy()
    if out.width > width:
        out.thumbnail((width, width * 10), Image.LANCZOS)
    dest.parent.mkdir(parents=True, exist_ok=True)
    if lossless:
        out.save(dest, "WEBP", lossless=True, method=6)
    else:
        out.save(dest, "WEBP", quality=quality, method=6)
    return out.size, dest.stat().st_size


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--source-dir",
        default="images",
        help="Directory holding the source photographs (default: images, i.e. in place)",
    )
    args = ap.parse_args()
    source_dir = Path(args.source_dir)
    if not source_dir.is_dir():
        sys.exit(f"No such source directory: {source_dir}")

    sources = sorted(p for p in source_dir.glob("*.webp") if p.parent.name != "thumbs")
    if not sources:
        sys.exit(f"No .webp sources found in {source_dir}")

    before = after = 0
    print(f"{'image':<52} {'before':>9} {'thumb':>9} {'full':>9}")

    for src in sources:
        original_bytes = src.stat().st_size
        before += original_bytes

        with Image.open(src) as raw:
            image = ImageOps.exif_transpose(raw)
            if src.name in UI_ASSETS:
                size, size_bytes = encode(
                    image.convert("RGBA"),
                    UI_ASSETS[src.name],
                    0,
                    IMAGES_DIR / src.name,
                    lossless=True,
                )
                after += size_bytes
                print(
                    f"{src.name:<52} {original_bytes/1e6:8.1f}M "
                    f"{'-':>9} {size_bytes/1e3:8.0f}K  (UI asset {size[0]}x{size[1]})"
                )
                continue

            image = image.convert("RGB")
            thumb_size, thumb_bytes = encode(
                image, THUMB_WIDTH, THUMB_QUALITY, THUMBS_DIR / src.name
            )
            full_size, full_bytes = encode(
                image, FULL_WIDTH, FULL_QUALITY, IMAGES_DIR / src.name
            )

        after += thumb_bytes + full_bytes
        print(
            f"{src.name:<52} {original_bytes/1e6:8.1f}M "
            f"{thumb_bytes/1e3:8.0f}K {full_bytes/1e3:8.0f}K"
        )

    print(
        f"\n{len(sources)} images: {before/1e6:.0f} MB -> {after/1e6:.1f} MB "
        f"({before/after:.0f}x smaller in total)"
    )


if __name__ == "__main__":
    main()
