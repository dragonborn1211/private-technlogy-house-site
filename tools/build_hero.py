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
    hero = build()                                   # 2428x824
    export(hero, 'hero')                             # десктоп, полный кадр
    export(hero, 'hero-1600', width=1600)            # десктоп до ~1250 px
    export(hero, 'hero-m', box=(800, 0, 1840, 824))  # телефон: портретный кроп вокруг лица
    og = hero.crop((560, 0, 2130, 824)).resize((1200, 630), Image.LANCZOS)
    og.save(OUT / 'og.jpg', quality=88, optimize=True, progressive=True)
    print('og.jpg', og.size)
