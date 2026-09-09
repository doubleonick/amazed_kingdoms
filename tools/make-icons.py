#!/usr/bin/env python3
"""Regenerate the app icons from the game's own castle sprite.

    python3 tools/make-icons.py

The icon is not a drawing anyone maintains separately — it is read out of
castle.js, so it cannot drift from the art in the game. Change the keep and
run this again.

Needs Pillow:  pip install pillow
"""
from PIL import Image, ImageDraw
import re, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC  = os.path.join(ROOT, "castle.js")
SIZES = [48, 72, 96, 144, 192, 256, 512]

src = open(SRC, encoding="utf-8").read()
GRID = re.findall(r'"([^"]*)"', re.search(r"var GRID = \[(.*?)\n  \];", src, re.S).group(1))
CH, CW = len(GRID), len(GRID[0])
KEEP_W = 34                                  # the keep, without the curtain wall

def const(pat):
    return [int(x) for x in re.search(pat, src).groups()]
FX, FY, FW, FH = const(r"var FLAG = \{ x: (\d+), y: (\d+), w: (\d+), h: (\d+) \}")
KX, KY         = const(r"var KEYHOLE = \{ x: (\d+), y: (\d+) \}")

STONE = {"ink": (4, 10, 34), "body": (36, 64, 140), "lit": (74, 120, 216)}
GATE  = {"body": (169, 113, 60), "edge": (110, 69, 34), "lit": (214, 160, 106)}
SKY   = ((143, 212, 255), (27, 79, 214))
GRASS = ((49, 169, 79), (34, 131, 60))
FIELD, DEVICE_INK = (255, 107, 179), (58, 11, 34)
A_GLYPH = [".###.", "#...#", "##.##", "#...#", "#...#"]

def keep(d, ox, oy, s):
    for y in range(CH):
        for x in range(KEEP_W):
            c = GRID[y][x]
            if c == ".":
                continue
            if c in "OP":  col = STONE["ink"]
            elif c == "B": col = STONE["body"] if (y and GRID[y-1][x] == "B") else STONE["lit"]
            elif c == "D": col = GATE["body"] if (y and GRID[y-1][x] == "D") else GATE["lit"]
            elif c == "d": col = GATE["edge"]
            elif c == "W": col = (10, 16, 56)
            elif c == "F": col = FIELD
            else:          continue
            d.rectangle([ox+x*s, oy+y*s, ox+x*s+s-1, oy+y*s+s-1], fill=col)
    for ox2, oy2, col in ((FX+(FW-5)//2, FY+(FH-5)//2, DEVICE_INK), (KX, KY, (10, 16, 56))):
        for j, row in enumerate(A_GLYPH):
            for i, ch in enumerate(row):
                if ch == "#":
                    d.rectangle([ox+(ox2+i)*s, oy+(oy2+j)*s,
                                 ox+(ox2+i)*s+s-1, oy+(oy2+j)*s+s-1], fill=col)

def icon(px, maskable=False):
    im = Image.new("RGBA", (px, px), (0, 0, 0, 0))
    d  = ImageDraw.Draw(im)
    for y in range(px):
        u = y / px
        d.rectangle([0, y, px, y],
                    fill=tuple(int(SKY[0][i] + (SKY[1][i]-SKY[0][i])*u) for i in range(3)))
    # a maskable icon must keep its content inside the safe circle
    pad   = 0.16 if maskable else 0.06
    inner = px * (1 - 2*pad)
    s = max(1, int(inner / CH))
    while KEEP_W * s > inner and s > 1:
        s -= 1
    cw, chh = KEEP_W*s, CH*s
    ox, oy  = (px-cw)//2, (px-chh)//2 + int(px*0.02)
    ground  = oy + chh
    cell = max(2, s*3)
    for y in range(ground, px, cell):
        for x in range(0, px, cell):
            odd = ((x//cell) + (y//cell)) % 2
            d.rectangle([x, y, x+cell, y+cell], fill=GRASS[1] if odd else GRASS[0])
    keep(d, ox, oy, s)
    return im

def main():
    for size in SIZES:
        icon(size).save(os.path.join(ROOT, "icon-%d.png" % size))
    icon(512, maskable=True).save(os.path.join(ROOT, "icon-maskable-512.png"))
    print("wrote %d icons from castle.js" % (len(SIZES) + 1))

if __name__ == "__main__":
    sys.exit(main())
