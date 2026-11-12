# Ikonok generálása: python3 tools/make-icons.py
# Semleges ikon (nem köthető egy valutához): kék háttéren fehér árcédula, rajta két ellentétes nyíl (átváltás).
from PIL import Image, ImageDraw
import math, os

OUT = os.path.join(os.path.dirname(__file__), '..', 'icons')
os.makedirs(OUT, exist_ok=True)

BLUE = (37, 99, 235, 255)
TAG_SCALE = 0.86  # a cédula mérete a háttérhez képest
WHITE = (255, 255, 255, 255)


def arrow(d, x0, x1, y, head, width, color, direction):
    """Vízszintes nyíl x0-tól x1-ig; direction=+1 jobbra, -1 balra mutat."""
    tip, tail = (x1, x0) if direction > 0 else (x0, x1)
    base = tip - direction * head
    d.line([(tail, y), (base, y)], fill=color, width=width)
    d.polygon([(tip, y), (base, y - head * 0.8), (base, y + head * 0.8)], fill=color)


def tag_polygon(S, angle_deg):
    # Árcédula: balra mutató hegyes vég, jobbra lekerekítetlen téglalap; a középpont körül elforgatva.
    pts = [(0.10, 0.50), (0.30, 0.27), (0.88, 0.27), (0.88, 0.73), (0.30, 0.73)]
    pts = [(0.5 + (x - 0.5) * TAG_SCALE, 0.5 + (y - 0.5) * TAG_SCALE) for x, y in pts]
    cx, cy = 0.5, 0.5
    a = math.radians(angle_deg)
    out = []
    for x, y in pts:
        dx, dy = x - cx, y - cy
        out.append(((cx + dx * math.cos(a) - dy * math.sin(a)) * S, (cy + dx * math.sin(a) + dy * math.cos(a)) * S))
    return out


def rotate_point(S, x, y, angle_deg):
    a = math.radians(angle_deg)
    dx, dy = x - 0.5, y - 0.5
    return ((0.5 + dx * math.cos(a) - dy * math.sin(a)) * S, (0.5 + dx * math.sin(a) + dy * math.cos(a)) * S)


def draw_icon(size):
    S = size * 8  # nagyban rajzolunk, majd kicsinyítünk (élsimítás)
    img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 0, S - 1, S - 1], radius=int(S * 0.22), fill=BLUE)

    if size <= 32:
        # Kicsiben csak a két vastag nyíl fér el olvashatóan.
        w = int(S * 0.13)
        arrow(d, S * 0.16, S * 0.84, S * 0.34, S * 0.22, w, WHITE, +1)
        arrow(d, S * 0.16, S * 0.84, S * 0.66, S * 0.22, w, WHITE, -1)
    else:
        angle = -30
        layer = Image.new('RGBA', (S, S), (0, 0, 0, 0))
        ld = ImageDraw.Draw(layer)
        ld.polygon(tag_polygon(S, 0), fill=WHITE)
        # lyuk a cédulán
        hx, hy, hr = (0.5 + (0.27 - 0.5) * TAG_SCALE) * S, 0.50 * S, 0.05 * S
        ld.ellipse([hx - hr, hy - hr, hx + hr, hy + hr], fill=(0, 0, 0, 0))
        # nyilak a cédulán
        k = lambda v: (0.5 + (v - 0.5) * TAG_SCALE) * S
        w = int(S * 0.06)
        arrow(ld, k(0.40), k(0.80), k(0.41), S * 0.095, w, BLUE, +1)
        arrow(ld, k(0.40), k(0.80), k(0.59), S * 0.095, w, BLUE, -1)
        layer = layer.rotate(-angle, resample=Image.BICUBIC, center=(S / 2, S / 2))
        img.alpha_composite(layer)

    return img.resize((size, size), Image.LANCZOS)


for size in (16, 32, 48):
    draw_icon(size).save(os.path.join(OUT, f'icon-{size}.png'))
    print('icons/icon-%d.png' % size)

# 128: a Chrome Web Store előírása szerint 96x96-os rajz, körben 16 px átlátszó szegéllyel.
canvas = Image.new('RGBA', (128, 128), (0, 0, 0, 0))
canvas.alpha_composite(draw_icon(96), (16, 16))
canvas.save(os.path.join(OUT, 'icon-128.png'))
print('icons/icon-128.png')
