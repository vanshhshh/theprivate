"""
Builds the homepage film plates from licensed source photography.

    python scripts/media/build_film_assets.py

1. Downloads each source original (exact Wikimedia Commons file, licence recorded below) into
   .data/media-src/ (git-ignored). Already-downloaded files are reused.
2. Keys the blown-out window panes of the cabin photograph to alpha, so the real sky plate shows
   through the actual window shapes (soft luminance ramp inside hand-fitted pane shapes).
3. Exports responsive WebP files to public/media/film/ and writes public/media/film/credits.json.

Licences: the cabin photograph is CC BY-SA 3.0, so the keyed derivative we publish
(cabin-*.webp) is also released under CC BY-SA 3.0 with attribution. The sky plates are CC0.

The aircraft plate (J-1) is NOT downloaded: it was supplied by ThePrivate (media-src/jet-supplied.png).
Its C2PA content credentials identify it as AI-generated (OpenAI). It is cleaned (garbled nacelle
lettering inpainted), cut out with rembg, mirrored to match the sky plate's sun direction, and
exported on alpha. Replace it with licensed air-to-air photography when available.

Requires: Pillow, numpy; for the aircraft plate also opencv-python and rembg.
"""

from __future__ import annotations

import json
import urllib.parse
import time
import urllib.request
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / ".data" / "media-src"
OUT = ROOT / "public" / "media" / "film"
UA = {"User-Agent": "ThePrivateMediaPipeline/1.0 (licensed asset build)"}

SOURCES = {
    "cabin": {
        "file": "https://upload.wikimedia.org/wikipedia/commons/c/c9/Embraer_Lineage_1000_interior_seat.jpg",
        "page": "https://commons.wikimedia.org/wiki/File:Embraer_Lineage_1000_interior_seat.jpg",
        "title": "Embraer Lineage 1000 interior seat",
        "author": "JetRequest.com",
        "license": "CC BY-SA 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0/",
        "changes": "Cropped, resized, window panes keyed to transparency and composited with a sky plate.",
    },
    "sky-horizon": {
        "file": "https://upload.wikimedia.org/wikipedia/commons/0/0b/Summer_above_the_clouds_%28Unsplash%29.jpg",
        "page": "https://commons.wikimedia.org/wiki/File:Summer_above_the_clouds_(Unsplash).jpg",
        "title": "Summer above the clouds",
        "author": "Liane Metzler",
        "license": "CC0 1.0",
        "licenseUrl": "https://creativecommons.org/publicdomain/zero/1.0/",
        "changes": "Resized.",
    },
    "sky-descent": {
        "file": "https://upload.wikimedia.org/wikipedia/commons/4/4b/Aerial_cloud_sunset._%28Unsplash%29.jpg",
        "page": "https://commons.wikimedia.org/wiki/File:Aerial_cloud_sunset._(Unsplash).jpg",
        "title": "Aerial cloud sunset",
        "author": "Christian Seeling",
        "license": "CC0 1.0",
        "licenseUrl": "https://creativecommons.org/publicdomain/zero/1.0/",
        "changes": "Resized.",
    },
}

SUPPLIED_JET = ROOT / "media-src" / "jet-supplied.png"

WIDTHS = {"jet": [1440, 960], "cabin": [3200, 1920, 1280], "sky-horizon": [3200, 1920, 1280], "sky-descent": [2560, 1600, 1024]}


def resolve_url(page: str) -> str:
    """Ask the Commons API for the canonical original URL (hash paths are not guessable)."""
    title = page.rsplit("/wiki/", 1)[1]
    api = f"https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url&titles={urllib.parse.quote(title)}"
    data = json.loads(fetch(api))
    return next(iter(data["query"]["pages"].values()))["imageinfo"][0]["url"]


def fetch(url: str) -> bytes:
    for attempt in range(6):
        try:
            return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60).read()
        except urllib.error.HTTPError as e:  # Commons rate-limits bursts
            if e.code != 429:
                raise
            time.sleep(4 * (attempt + 1))
    raise RuntimeError(f"rate limited: {url}")


def source(name: str) -> Image.Image:
    SRC.mkdir(parents=True, exist_ok=True)
    path = SRC / f"{name}.jpg"
    if not path.exists():
        path.write_bytes(fetch(resolve_url(SOURCES[name]["page"])))
        time.sleep(2)
    return Image.open(path).convert("RGB")


def key_cabin(im: Image.Image) -> Image.Image:
    a = np.asarray(im).astype(np.float32)
    h, w = a.shape[:2]
    lum = a.mean(2)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)

    def pane(cx, cy, rx, ry, rot, n=3.2):
        t = np.deg2rad(rot)
        x = (xx - cx) * np.cos(t) + (yy - cy) * np.sin(t)
        y = -(xx - cx) * np.sin(t) + (yy - cy) * np.cos(t)
        d = (np.abs(x / rx) ** n + np.abs(y / ry) ** n) ** (1 / n)
        return np.clip((1.08 - d) / 0.16, 0, 1)

    # Pane shapes fitted by eye to the 4000x2664 original (forward pane, aft pane).
    region = np.maximum(pane(3172, 1032, 238, 385, -6), pane(2118, 738, 125, 268, -12))
    ramp = np.clip((lum - 218) / (248 - 218), 0, 1)
    ramp = ramp * ramp * (3 - 2 * ramp)
    alpha = Image.fromarray(((1 - region * ramp) * 255).astype("uint8")).filter(ImageFilter.GaussianBlur(3))
    out = im.copy()
    out.putalpha(alpha)
    return out


def build_jet() -> Image.Image | None:
    if not SUPPLIED_JET.exists():
        print("jet: media-src/jet-supplied.png not found, skipping (slot stays MISSING)")
        return None
    import cv2
    from rembg import new_session, remove

    bgr = cv2.imread(str(SUPPLIED_JET))
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    # Generated "lettering" on the nacelle and marks on the fin: inpaint only the dark strokes.
    mask = np.zeros_like(gray)
    for x0, y0, x1, y1 in [(652, 432, 698, 488), (684, 288, 722, 348)]:
        roi = gray[y0:y1, x0:x1]
        local = cv2.medianBlur(roi, 15)
        mask[y0:y1, x0:x1] = ((local.astype(int) - roi.astype(int)) > 18).astype(np.uint8) * 255
    mask = cv2.dilate(mask, np.ones((3, 3), np.uint8), iterations=2)
    clean = cv2.inpaint(bgr, mask, 5, cv2.INPAINT_TELEA)
    rgb = Image.fromarray(cv2.cvtColor(clean, cv2.COLOR_BGR2RGB))

    cut = remove(rgb, session=new_session("isnet-general-use"))
    a = np.asarray(cut)[..., 3]
    n, lab, stats, _ = cv2.connectedComponentsWithStats((a > 24).astype(np.uint8))
    keep = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    a = np.where(lab == keep, a, 0).astype(np.uint8)
    cut.putalpha(Image.fromarray(a))
    # Mirror: the generated key light comes from the left; the sky plate's sun is on the right.
    cut = cut.transpose(Image.FLIP_LEFT_RIGHT)
    return cut.crop(cut.getbbox())


def export(name: str, im: Image.Image) -> list[dict]:
    OUT.mkdir(parents=True, exist_ok=True)
    files = []
    for w in WIDTHS[name]:
        h = round(im.height * w / im.width)
        r = im.resize((w, h), Image.LANCZOS) if w < im.width else im
        p = OUT / f"{name}-{r.width}.webp"
        r.save(p, "WEBP", quality=84 if name not in ("cabin", "jet") else 88, method=6, alpha_quality=90)
        files.append({"src": f"/media/film/{p.name}", "width": r.width, "height": r.height, "bytes": p.stat().st_size})
        print(f"  {p.name}  {r.width}x{r.height}  {p.stat().st_size // 1024} KB")
    return files


def main() -> None:
    jet = build_jet()
    if jet is not None:
        print("jet")
        export("jet", jet)
    credits = []
    for name, meta in SOURCES.items():
        print(name)
        im = source(name)
        if name == "cabin":
            im = key_cabin(im)
        files = export(name, im)
        credits.append({"id": name, **{k: v for k, v in meta.items() if k != "file"}, "files": files})
    (OUT / "credits.json").write_text(json.dumps(credits, indent=2) + "\n", encoding="utf-8")
    print("wrote credits.json")


if __name__ == "__main__":
    main()
