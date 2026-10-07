#!/usr/bin/env python3
"""Собирает широкий кадр hero «как на макете» и экспортирует его для сайта.

Исходник hero-source.jpg (1480x744) — это центр кадра из макета ровно в 2x
разрешении (смещение 330,40 в координатах макета, найдено через NCC = 0.9997).
Макет шире: в нём видно больше гор, неба и солнце. Скрипт берёт края из макета
(убирает впечатанный текст интерфейса, увеличивает x2) и вставляет в центр
чёткий исходник с мягкими швами.

Если появится оригинал в большем разрешении — положите его вместо
docs/reference/hero-source.jpg и поправьте SCALE/OFFSET (или замените
сборку на прямой экспорт оригинала).

Ниже кадра пикселей нет ни в одном источнике, поэтому продолжение вниз
синтезируется: нижняя часть зеркалится и размывается всё сильнее, уходя в фон.

Запуск из корня репозитория:  python3 tools/build_hero.py
Нужен Pillow с поддержкой AVIF и WebP, и numpy.
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
MOCKUP = ROOT / 'docs/reference/mockup.webp'
SOURCE = ROOT / 'docs/reference/hero-source.jpg'
OUT = ROOT / 'assets/img'

SCALE = 2                 # исходник = макет x2
OFFSET = (330, 40)        # где исходник лежит в макете
HERO_BOX = (0, 0, 1214, 412)  # hero-полоса в макете

# Впечатанный в макет интерфейс: (box в координатах макета, медиана, размытие, растушёвка)
TEXT_BOXES = [
    ((40, 14, 1185, 44), 7, 1.5, 4),      # шапка: PTH, навигация, меню
    ((20, 85, 290, 395), 15, 4, 12),      # 01/05, заголовок, абзац, scroll
    ((1076, 110, 1170, 290), 9, 2, 8),    # IDEAS ENGINEERED INTO REALITY + линия
]
SEAM = 110                # ширина мягкого шва, px исходника

# Продолжение вниз: кадр зеркалится и постепенно размывается, пока тело
# не растворится в фоне сайта.
EXTEND = 440                                  # px исходника под кадром
BLUR_START = 220                              # размытие начинается выше шва, ещё на теле
STRETCH_TOP, STRETCH_BOTTOM = .85, .55        # доля вытягивания у шва и внизу (остальное — зеркало)
BLUR_LEVELS = [0, 2, 4, 8, 16, 32, 64, 110]   # радиусы, между которыми интерполируем
BG = np.array([11, 14, 17], dtype=np.float32)  # #0B0E11 — фон сайта


def soft_mask(size, box, feather):
    m = Image.new('L', size, 0)
    ImageDraw.Draw(m).rectangle(box, fill=255)
    return m.filter(ImageFilter.GaussianBlur(feather))


def remove_text(img, box, median, blur, feather):
    clean = img
    for _ in range(2):
        clean = clean.filter(ImageFilter.MedianFilter(median))
    clean = clean.filter(ImageFilter.GaussianBlur(blur))
    return Image.composite(clean, img, soft_mask(img.size, box, feather))


def seam_mask(w, h, top):
    """Альфа исходника: 1 внутри, плавный спад к краям, где он стыкуется с макетом."""
    x = np.minimum(np.arange(w), np.arange(w)[::-1]) / SEAM
    a = np.clip(x, 0, 1) ** 1.2
    if top:
        y = np.clip(np.arange(h) / (SEAM * 0.5), 0, 1) ** 1.2
        a = np.outer(y, a)
    else:
        a = np.tile(a, (h, 1))
    return Image.fromarray((a * 255).astype(np.uint8))


def smoothstep(t):
    t = np.clip(t, 0, 1)
    return t * t * (3 - 2 * t)


def extend_bottom(img):
    """Продолжает кадр вниз с нарастающим размытием и уходом в цвет фона."""
    w, h = img.size
    # Ниже шва — нижний край кадра, вытянутый вниз (тело «продолжается»),
    # с небольшой примесью зеркала, чтобы под размытием оставалась фактура.
    px = np.asarray(img, dtype=np.float32)
    edge = px[h - 10:h].mean(axis=0)
    stretch = np.repeat(edge[None], EXTEND, axis=0)
    mirror = px[h - EXTEND:h][::-1]
    mix = np.linspace(STRETCH_TOP, STRETCH_BOTTOM, EXTEND, dtype=np.float32)[:, None, None]
    ext = stretch * mix + mirror * (1 - mix)
    tall = Image.new('RGB', (w, h + EXTEND))
    tall.paste(img, (0, 0))
    tall.paste(Image.fromarray(np.clip(ext, 0, 255).astype(np.uint8)), (0, h))

    levels = [np.asarray(tall if r == 0 else tall.filter(ImageFilter.GaussianBlur(r)), dtype=np.float32)
              for r in BLUR_LEVELS]
    H = h + EXTEND
    y = np.arange(H, dtype=np.float32)
    start = h - BLUR_START
    radius = BLUR_LEVELS[-1] * np.clip((y - start) / (H - start), 0, 1) ** 1.6
    idx = np.interp(radius, BLUR_LEVELS, np.arange(len(BLUR_LEVELS)))

    out = np.empty_like(levels[0])
    for row in range(H):
        lo = int(idx[row]); hi = min(lo + 1, len(levels) - 1); f = idx[row] - lo
        out[row] = levels[lo][row] * (1 - f) + levels[hi][row] * f

    # уход в цвет фона: начинается чуть выше шва, к низу кадра — ровно #0B0E11
    d = smoothstep((y - (h - 60)) / (EXTEND + 60))[:, None, None]
    out = out * (1 - d) + BG * d
    # мелкое зерно против полос на плавных градиентах после сжатия
    out[h - BLUR_START:] += np.random.default_rng(11).normal(0, 1.1, out[h - BLUR_START:].shape[:2])[..., None]
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))


def build():
    mock = Image.open(MOCKUP).convert('RGB').crop(HERO_BOX)
    src = Image.open(SOURCE).convert('RGB')

    for box, med, blur, feather in TEXT_BOXES:
        mock = remove_text(mock, box, med, blur, feather)

    w, h = mock.size[0] * SCALE, mock.size[1] * SCALE
    base = mock.resize((w, h), Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=2, percent=50, threshold=2))
    # лёгкое зерно, чтобы увеличенные края по фактуре совпадали с исходником
    px = np.asarray(base, dtype=np.float32)
    px += np.random.default_rng(7).normal(0, 1.6, px.shape[:2])[..., None]
    base = Image.fromarray(np.clip(px, 0, 255).astype(np.uint8))

    ox, oy = OFFSET[0] * SCALE, OFFSET[1] * SCALE
    base.paste(src, (ox, oy), seam_mask(*src.size, top=oy > 0))
    return base


def export(img, name, width=None, box=None):
    if box:
        img = img.crop(box)
    if width and img.width > width:
        img = img.resize((width, round(img.height * width / img.width)), Image.LANCZOS)
    img.save(OUT / f'{name}.avif', quality=78, speed=4)
    img.save(OUT / f'{name}.webp', quality=90, method=6)
    print(f'{name}: {img.size}  avif {(OUT / f"{name}.avif").stat().st_size // 1024} KB, '
          f'webp {(OUT / f"{name}.webp").stat().st_size // 1024} KB')


if __name__ == '__main__':
    frame = build()                                  # 2428x824 — сам кадр
    hero = extend_bottom(frame)                      # 2428x1264 — с растворением вниз
    export(hero, 'hero')                             # десктоп
    export(hero, 'hero-1600', width=1600)            # десктоп до ~1250 px
    export(hero, 'hero-m', box=(800, 0, 1840, hero.height))  # планшет/телефон: портретный кроп
    og = frame.crop((560, 0, 2130, 824)).resize((1200, 630), Image.LANCZOS)
    og.save(OUT / 'og.jpg', quality=88, optimize=True, progressive=True)
    print('og.jpg', og.size)
