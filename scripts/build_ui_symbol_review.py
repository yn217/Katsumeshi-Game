from pathlib import Path
import ast
import re
import cairosvg
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'src/icons.mjs'
OUTPUT = ROOT / 'artifacts/ui_symbol_review_v01.png'
NAMES = ['info', 'menu', 'refresh', 'play', 'down', 'left', 'check', 'star', 'testTube', 'right']
LABELS = ['info', 'menu', 'retry', 'play', 'down', 'back', 'check', 'rank', 'debug', 'next']


def main():
    source = SOURCE.read_text(encoding='utf-8')
    icons = source.split('const ui = {', 1)[1].split('\n};', 1)[0]
    width, height, cell, gap = 680, 382, 124, 12
    sheet = Image.new('RGB', (width, height), '#f6efe1')
    draw = ImageDraw.Draw(sheet)
    font_path = 'C:/Windows/Fonts/arial.ttf'
    font = ImageFont.truetype(font_path, 15) if Path(font_path).exists() else ImageFont.load_default()
    title_font = ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf', 21) if Path('C:/Windows/Fonts/arialbd.ttf').exists() else font
    draw.text((gap, 10), 'UI SYMBOLS · INLINE SVG REVIEW', fill='#4a2a20', font=title_font)
    for index, (name, label) in enumerate(zip(NAMES, LABELS)):
        row, col = divmod(index, 5)
        x, y = gap + col * (cell + gap), 48 + row * (cell + gap)
        entry = re.search(rf'^\s+{re.escape(name)}: S\((.*?)\),\s*$', icons, re.M)
        if not entry:
            raise ValueError(f'Missing SVG icon entry: {name}')
        raw = entry.group(1)
        parts = re.findall(r"'(?:\\.|[^'])*'|\bC\b", raw)
        body = ''.join('currentColor' if part == 'C' else ast.literal_eval(part) for part in parts)
        svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" color="#6a1814">{body}</svg>'
        png = cairosvg.svg2png(bytestring=svg.encode(), output_width=78, output_height=78)
        import io
        icon = Image.open(io.BytesIO(png)).convert('RGBA')
        draw.rounded_rectangle((x, y, x + cell, y + cell), radius=10, fill='#fffaf0', outline='#d9a441', width=2)
        sheet.paste(icon, (x + (cell - icon.width) // 2, y + 9), icon)
        box = draw.textbbox((0, 0), label, font=font)
        draw.text((x + (cell - (box[2] - box[0])) // 2, y + 92), label, fill='#4a2a20', font=font)
    draw.text((gap, height - 22), 'Rendered from src/icons.mjs · currentColor previews in deep red', fill='#7a5a48', font=font)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(OUTPUT)
    print(OUTPUT)


if __name__ == '__main__':
    main()
