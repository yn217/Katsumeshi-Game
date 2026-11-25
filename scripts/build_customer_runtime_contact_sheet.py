"""Build a contact sheet from the exact customer sprites referenced at runtime."""
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
CHARACTERS = ROOT / "public/assets/game/characters"
OUTPUT = ROOT / "artifacts/characters_current_runtime_review_v02.png"
TYPES = [("regular", "Regular"), ("student", "Student"), ("worker", "Worker"), ("tourist", "Tourist")]
RANKS = [("sss", "SSS"), ("s", "S"), ("a", "A"), ("b", "B"), ("c", "C"), ("f", "F")]
CELL_W, CELL_H, IMAGE_H = 184, 222, 180
COLS, ROWS = len(RANKS), len(TYPES)
MARGIN_LEFT, MARGIN_TOP = 180, 86


def load_font(size):
    for candidate in ("C:/Windows/Fonts/arial.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"):
        if Path(candidate).exists():
            return ImageFont.truetype(candidate, size)
    return ImageFont.load_default()


def main():
    v05 = json.loads((CHARACTERS / "v05/manifest.json").read_text(encoding="utf-8-sig"))
    v06 = json.loads((CHARACTERS / "regular/v06/manifest.json").read_text(encoding="utf-8-sig"))
    regular_base = {
        asset["rank"].lower(): asset
        for asset in v05["assets"]
        if asset.get("characterType") == "regular" and asset.get("rank")
    }
    # Older manifests use identifiers instead of a characterType property.
    for asset in v05["assets"]:
        asset_id = asset.get("id", "")
        if asset_id.startswith("char_regular_reaction_"):
            rank = asset_id.removeprefix("char_regular_reaction_").split("_")[0]
            regular_base.setdefault(rank, asset)
    overrides = {
        asset["rank"].lower(): asset
        for asset in v06["assets"]
        if asset.get("id") in {"char_regular_reaction_c_v103", "char_regular_reaction_f_v103"}
    }
    by_id = {
        asset.get("id"): asset
        for asset in v05["assets"]
        if asset.get("id")
    }
    canvas = Image.new(
        "RGB",
        (MARGIN_LEFT + COLS * CELL_W + 16, MARGIN_TOP + ROWS * CELL_H + 48),
        (246, 240, 226),
    )
    draw = ImageDraw.Draw(canvas)
    title_font, label_font, small_font = load_font(21), load_font(16), load_font(12)
    draw.text((18, 16), "CURRENT CUSTOMER RUNTIME · 4 TYPES × 6 RANKS", font=title_font, fill=(75, 42, 29))

    for col, (_, rank_label) in enumerate(RANKS):
        draw.text((MARGIN_LEFT + col * CELL_W + 8, 58), rank_label, font=label_font, fill=(133, 38, 30))

    for row, (customer, customer_label) in enumerate(TYPES):
        y = MARGIN_TOP + row * CELL_H
        draw.text((18, y + 12), customer_label, font=label_font, fill=(75, 42, 29))
        for col, (rank, _) in enumerate(RANKS):
            if customer == "regular" and rank in overrides:
                asset = overrides[rank]
            elif customer == "regular":
                asset = regular_base.get(rank)
            else:
                asset = by_id.get(f"char_{customer}_reaction_{rank}_v101")
            if not asset:
                raise ValueError(f"Missing current runtime manifest record: {customer}/{rank}")
            path = ROOT / asset["path"]
            if not path.is_file():
                raise FileNotFoundError(path)

            x = MARGIN_LEFT + col * CELL_W
            draw.rounded_rectangle(
                (x, y, x + CELL_W - 8, y + CELL_H - 8),
                radius=9,
                fill=(255, 250, 239),
                outline=(206, 185, 149),
                width=1,
            )
            # Checkerboard makes each sprite's actual alpha edge visible.
            for yy in range(y + 4, y + IMAGE_H, 12):
                for xx in range(x + 4, x + CELL_W - 12, 12):
                    if ((xx - x) // 12 + (yy - y) // 12) % 2:
                        draw.rectangle(
                            (xx, yy, min(xx + 11, x + CELL_W - 13), min(yy + 11, y + IMAGE_H - 1)),
                            fill=(232, 232, 232),
                        )
            with Image.open(path) as source:
                sprite = source.convert("RGBA")
                sprite.thumbnail((CELL_W - 20, IMAGE_H - 12), Image.Resampling.LANCZOS)
                px = x + (CELL_W - 8 - sprite.width) // 2
                py = y + 4 + (IMAGE_H - 12 - sprite.height) // 2
                canvas.paste(sprite, (px, py), sprite)
            version = "v103" if asset.get("id", "").endswith("v103") else "v101"
            draw.text((x + 8, y + IMAGE_H + 4), version, font=small_font, fill=(92, 75, 60))

    draw.text(
        (18, MARGIN_TOP + ROWS * CELL_H + 8),
        "Regular C/F: v103 · Other sprites: v101 · all rows use current runtime references",
        font=small_font,
        fill=(92, 75, 60),
    )
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(OUTPUT)
    print(OUTPUT)


if __name__ == "__main__":
    main()
