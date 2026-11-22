"""Assemble a review board from ComfyUI-generated owner character views.

This is a source/review document only. It does not create runtime game assets.
The character artwork itself is generated in ComfyUI with the recorded LoRAs.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "assets/source/comfyui/references"
OUT = ART / "owner_character_reference_board_v001.png"
W, H = 1536, 2048
BG = "#F5F1EB"
INK = "#332D31"
MUTED = "#776C72"
PANEL = "#FFFCF8"


def font(size):
    for path in (r"C:\Windows\Fonts\meiryo.ttc", r"C:\Windows\Fonts\YuGothM.ttc"):
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def fit(image, box):
    image = image.convert("RGB")
    image.thumbnail(box, Image.Resampling.LANCZOS)
    return image


canvas = Image.new("RGB", (W, H), BG)
draw = ImageDraw.Draw(canvas)
draw.text((48, 28), "店主 キャラクターリファレンス", font=font(38), fill=INK)
draw.text((49, 82), "ComfyUI + LoRA  |  v001  |  concept review", font=font(19), fill=MUTED)
draw.rounded_rectangle((1170, 34, 1488, 86), radius=18, fill="#EFE1D6")
draw.text((1192, 48), "採用前レビュー候補", font=font(19), fill=INK)

views = [
    ("owner_reference_portrait_v001.png", "顔・髪・ヘアピン"),
    ("owner_reference_shop_front_v001.png", "店舗服・正面"),
    ("owner_reference_back_v001.png", "店舗服・背面／横"),
    ("owner_reference_casual_v001.png", "私服・正面"),
]
left, top, gap, panel_w, panel_h = 48, 145, 24, 708, 735
for i, (filename, label) in enumerate(views):
    x = left + (i % 2) * (panel_w + gap)
    y = top + (i // 2) * (panel_h + 24)
    draw.rounded_rectangle((x, y, x + panel_w, y + panel_h), radius=18, fill=PANEL, outline="#DDD2C8", width=2)
    image = Image.open(ART / filename)
    scaled = fit(image, (panel_w - 36, panel_h - 92))
    ix = x + (panel_w - scaled.width) // 2
    iy = y + 12 + (panel_h - 68 - scaled.height) // 2
    canvas.paste(scaled, (ix, iy))
    draw.text((x + 24, y + panel_h - 44), label, font=font(23), fill=INK)

palette_x, palette_y = 48, 1680
draw.rounded_rectangle((palette_x, palette_y, 1488, 1855), radius=18, fill=PANEL, outline="#DDD2C8", width=2)
draw.text((palette_x + 20, palette_y + 18), "色設定", font=font(23), fill=INK)
swatches = [
    ("髪", "#D9D4E1"),
    ("瞳", "#D985B0"),
    ("ブラウス", "#F4EFE8"),
    ("エプロン", "#762F4A"),
    ("スカート", "#45323A"),
    ("私服", "#D69AAA"),
]
for i, (label, color) in enumerate(swatches):
    x = palette_x + 22 + i * 238
    draw.rounded_rectangle((x, palette_y + 58, x + 210, palette_y + 116), radius=12, fill=color)
    draw.text((x, palette_y + 124), label + "  " + color, font=font(16), fill=INK)

draw.text((48, 1880), "共通特徴: 銀灰色のミディアムヘア／双お団子／前髪左側のピンクのハートピン／ピンクの瞳", font=font(19), fill=INK)
draw.text((48, 1924), "店舗服: クリーム色ブラウス + 深紅エプロン + ダークブラウンのロングスカート　｜　私服: ピンクカーディガン + 白ブラウス + ベージュスカート", font=font(16), fill=MUTED)
draw.text((48, 1970), "色は生成画像をもとにした制作メモ用の近似値。顔・衣装の同一性と権利の最終承認は未完了。", font=font(16), fill=MUTED)
canvas.save(OUT, format="PNG", optimize=True)
print(OUT)
