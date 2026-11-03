# Crops product pictures from the Kodosi and BoBe repos into card art (run once, by hand):
#   uv run --with pillow python scripts/art.py
from pathlib import Path
from PIL import Image

REPOS = Path.home() / "Repos"
OUT = Path(__file__).resolve().parent.parent / "art"
W, H = 802, 300  # twice the 401x150 picture area of a card

def save(src: Path, box, name: str):
    img = Image.open(src).convert("RGB").crop(box).resize((W, H), Image.LANCZOS)
    img.save(OUT / name, "JPEG", quality=84, optimize=True, progressive=True)
    print(name, (OUT / name).stat().st_size)

for mode in ("dark", "light"):
    save(REPOS / f"Kodosi/docs/media/app-{mode}.webp", (0, 0, 1336, 500), f"kodosi-{mode}.jpg")
    save(REPOS / f"BoBe/docs/media/banner-{mode}.png", (0, 0, 2000, 748), f"bobe-{mode}.jpg")
