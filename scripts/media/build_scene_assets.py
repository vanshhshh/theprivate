"""
Builds the photographic scene plates used across the site (one per route family), graded to the
homepage film's palette so every page reads as part of the same film.

    python scripts/media/build_scene_assets.py

Downloads each licensed original from Wikimedia Commons into .data/media-src/ (git-ignored),
crops, applies the shared grade, exports responsive WebP to public/media/scenes/ and writes
src/components/cinematic/scenes.json (sizes, focal points, alt text and licence credits) which
the frontend imports. Requires Pillow and numpy.
"""

from __future__ import annotations

import json
import time
import urllib.parse
import urllib.request
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / ".data" / "media-src"
OUT = ROOT / "public" / "media" / "scenes"
MANIFEST = ROOT / "src" / "components" / "cinematic" / "scenes.json"
UA = {"User-Agent": "ThePrivateMediaPipeline/1.0 (licensed asset build)"}
WIDTHS = [2560, 1600, 960]

# crop: (left, top, right, bottom) as fractions of the original. focal: object-position (x, y).
SCENES = {
    "ramp-dusk": {
        "page": "https://commons.wikimedia.org/wiki/File:G550_(2632546219).jpg",
        "title": "G550",
        "author": "John Murphy",
        "license": "CC BY-SA 2.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.0/",
        "crop": (0, 0.02, 1, 0.92),
        "focal": (0.5, 0.45),
        "alt": "A business jet silhouetted on the ramp against a low golden sun.",
    },
    "wing-dusk": {
        "page": "https://commons.wikimedia.org/wiki/File:Aircraft_cabin_window_views_of_sunset,_a_flight_towards_Kolkata_from_Hyderabad_04.jpg",
        "title": "Aircraft cabin window views of sunset, a flight towards Kolkata from Hyderabad",
        "author": "Pinakpani",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0/",
        "crop": (0, 0.1, 1, 0.86),
        "focal": (0.6, 0.5),
        "alt": "An aircraft wing above a sea of clouds at sunset.",
    },
    "cabin-aisle": {
        "page": "https://commons.wikimedia.org/wiki/File:Gulfstream_G550,_EBACE_2018,_Le_Grand-Saconnex_(BL7C0727).jpg",
        "title": "Gulfstream G550, EBACE 2018, Le Grand-Saconnex (BL7C0727)",
        "author": "Matti Blume",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0/",
        "crop": (0, 0.04, 1, 1),
        "focal": (0.5, 0.55),
        "alt": "The aisle of a business jet cabin: cream leather club seats and oval windows.",
    },
    "cabin-warm": {
        "page": "https://commons.wikimedia.org/wiki/File:EBACE_2019,_Le_Grand-Saconnex_(EB190586).jpg",
        "title": "EBACE 2019, Le Grand-Saconnex (EB190586)",
        "author": "Matti Blume",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0/",
        "crop": (0, 0, 1, 1),
        "focal": (0.5, 0.6),
        "alt": "A long business jet cabin with warm ceiling light and paired leather seats.",
    },
    "flight-deck": {
        "page": "https://commons.wikimedia.org/wiki/File:Gulfstream_G280,_EBACE_2018,_Le_Grand-Saconnex_(BL7C0664).jpg",
        "title": "Gulfstream G280, EBACE 2018, Le Grand-Saconnex (BL7C0664)",
        "author": "Matti Blume",
        "license": "CC BY-SA 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0/",
        # The instrument panel only: the windscreen view (a trade-show ramp) is cropped away.
        "crop": (0, 0.34, 1, 1),
        "focal": (0.5, 0.4),
        "alt": "The flight deck of a business jet, its displays lit.",
    },
    "window-light": {
        "page": "https://commons.wikimedia.org/wiki/File:US_Navy_101231-N-6070S-351_Aviation_Warfare_Systems_Operator_1st_Class_Andrew_Gill,_assigned_to_Fleet_Logistics_Support_Squadron_(VR)_51,.jpg",
        "title": "Cabin window at sunrise (US Navy 101231-N-6070S-351)",
        "author": "U.S. Navy photo by Mass Communication Specialist 2nd Class Justin E. Stumberg",
        "license": "Public domain",
        "licenseUrl": None,
        # Cropped to the window: the crew member on the right of the original is excluded.
        "crop": (0, 0, 0.64, 1),
        "focal": (0.45, 0.45),
        "alt": "First light through an aircraft window, above the clouds.",
    },
}


def fetch(url: str) -> bytes:
    for attempt in range(6):
        try:
            return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60).read()
        except urllib.error.HTTPError as e:
            if e.code != 429:
                raise
            time.sleep(4 * (attempt + 1))
    raise RuntimeError(f"rate limited: {url}")


def original(name: str, page: str) -> Image.Image:
    SRC.mkdir(parents=True, exist_ok=True)
    path = SRC / f"scene-{name}.jpg"
    if not path.exists():
        title = urllib.parse.unquote(page.rsplit("/wiki/", 1)[1])
        api = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(
            {"action": "query", "format": "json", "prop": "imageinfo", "iiprop": "url", "titles": title}
        )
        info = json.loads(fetch(api))
        url = next(iter(info["query"]["pages"].values()))["imageinfo"][0]["url"]
        path.write_bytes(fetch(url))
        time.sleep(2)
    return Image.open(path).convert("RGB")


def grade(im: Image.Image) -> Image.Image:
    """The film grade: shadows drift toward night (#0e1418), highlights toward warm paper light."""
    a = np.asarray(im).astype(np.float32) / 255
    lum = (a * [0.2126, 0.7152, 0.0722]).sum(2, keepdims=True)
    night = np.array([14, 20, 24], np.float32) / 255
    warm = np.array([1.0, 0.94, 0.86], np.float32)
    shadows = (1 - lum) ** 2 * 0.18
    highs = lum**2 * 0.08
    a = a * (1 - shadows) + night * shadows
    a = a * (1 - highs) + warm * highs * a.max(2, keepdims=True)
    a = np.clip((a - 0.5) * 1.04 + 0.5, 0, 1)  # gentle contrast
    return Image.fromarray((a * 255).astype(np.uint8))


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = {}
    for name, s in SCENES.items():
        im = original(name, s["page"])
        l, t, r, b = s["crop"]
        im = im.crop((round(l * im.width), round(t * im.height), round(r * im.width), round(b * im.height)))
        im = grade(im)
        files = []
        for w in WIDTHS:
            if w > im.width and files:
                continue
            r_ = im.resize((min(w, im.width), round(im.height * min(w, im.width) / im.width)), Image.LANCZOS)
            p = OUT / f"{name}-{r_.width}.webp"
            r_.save(p, "WEBP", quality=80, method=6)
            files.append({"src": f"/media/scenes/{p.name}", "width": r_.width})
            print(f"{p.name} {r_.width}x{r_.height} {p.stat().st_size // 1024} KB")
        manifest[name] = {
            "src": files[1]["src"] if len(files) > 1 else files[0]["src"],
            "srcSet": ", ".join(f"{f['src']} {f['width']}w" for f in files),
            "aspect": round(im.width / im.height, 4),
            "focal": {"x": s["focal"][0], "y": s["focal"][1]},
            "alt": s["alt"],
            "credit": {
                "work": s["title"],
                "author": s["author"],
                "license": s["license"],
                "licenseUrl": s["licenseUrl"],
                "source": s["page"],
                "changes": "Cropped, resized and colour graded to match the homepage film."
                + (" Our adaptation is released under the same licence." if "SA" in s["license"] else ""),
            },
        }
    MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {MANIFEST.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
