"""Render current runtime rank frames with code-rendered rank text for review."""
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "public/assets/game/ui/ranks/v03/manifest.json"
OUTPUT = ROOT / "artifacts/rank_badges_runtime_review_v01.png"
RANKS = ["sss", "s", "a", "b", "c", "f"]
LABELS = {"sss": "SSS", "s": "S", "a": "A", "b": "B", "c": "C", "f": "F"}
STYLE = {
    "sss": ((255, 215, 90), (138, 58, 16)),
    "s": ((255, 215, 90), (138, 58, 16)),
    "a": ((244, 246, 251), (90, 106, 138)),
    "b": ((244, 246, 251), (90, 106, 138)),
    "c": ((217, 212, 204), (106, 98, 90)),
    "f": ((217, 212, 204), (106, 98, 90)),
}
CELL, GAP, COLS = 300, 14, 3
HEADER, FOOTER = 64, 44


def font(size):
    for path in ("C:/Windows/Fonts/arialbd.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"):
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def main():
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8-sig"))
    records = {asset["tags"][-1]: asset for asset in manifest["files"]}
    canvas = Image.new("RGB", (GAP + COLS * (CELL + GAP), HEADER + 2 * (CELL + GAP) + FOOTER), (246, 240, 226))
    draw = ImageDraw.Draw(canvas)
    draw.text((GAP, 15), "RUNTIME RANK BADGES · FRAME + CODE LABEL", font=font(21), fill=(75, 42, 29))

    for index, rank in enumerate(RANKS):
        row, col = divmod(index, COLS)
        x, y = GAP + col * (CELL + GAP), HEADER + GAP + row * (CELL + GAP)
        draw.rounded_rectangle((x, y, x + CELL, y + CELL), radius=12, fill=(255, 250, 239), outline=(206, 185, 149), width=1)
        for yy in range(y + 5, y + CELL - 5, 16):
            for xx in range(x + 5, x + CELL - 5, 16):
                if ((xx - x) // 16 + (yy - y) // 16) % 2:
                    draw.rectangle((xx, yy, min(xx + 15, x + CELL - 6), min(yy + 15, y + CELL - 6)), fill=(232, 232, 232))
        asset = records[rank]
        with Image.open(ROOT / asset["path"]) as opened:
            badge = opened.convert("RGBA").resize((CELL - 12, CELL - 12), Image.Resampling.LANCZOS)
        canvas.paste(badge, (x + 6, y + 6), badge)

        label = LABELS[rank]
        # CSS uses one shared clamp(4.5rem, 8vw, 7rem) for every rank label.
        text_font = font(102)
        text_box = draw.textbbox((0, 0), label, font=text_font, stroke_width=4)
        tw, th = text_box[2] - text_box[0], text_box[3] - text_box[1]
        tx, ty = x + (CELL - tw) / 2, y + (CELL - th) / 2 - text_box[1]
        fill, outline = STYLE[rank]
        draw.text((tx + 2, ty + 5), label, font=text_font, fill=(45, 30, 25, 110), stroke_width=4, stroke_fill=(45, 30, 25, 110))
        draw.text((tx, ty), label, font=text_font, fill=fill, stroke_width=4, stroke_fill=outline)
        draw.text((x + 10, y + CELL - 29), rank.upper(), font=font(15), fill=(75, 42, 29))

    draw.text((GAP, HEADER + 2 * (CELL + GAP) + 7), "Checkerboard = transparent · Label uses runtime CSS rank colors/outline approximation", font=font(14), fill=(92, 75, 60))
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(OUTPUT)
    print(OUTPUT)


if __name__ == "__main__":
    main()
