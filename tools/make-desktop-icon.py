#!/usr/bin/env python3
"""Build the Windows desktop icon from the maze's own imagery.

    python3 tools/make-desktop-icon.py

The app icons are the castle (tools/make-icons.py). This one is the maze:
the corner a player starts in, walls lit along the top and shadowed along
the bottom exactly as the game draws them, with a gold key on the floor.

Nothing here is drawn by hand. The wall shape comes from sample-maze.json,
the palette and the key sprite are parsed out of index.html, so changing
the game's colours changes the icon and neither can drift from the other.

No Pillow. The whole point of an icon generator is that it runs, and this
one only needs zlib and struct from the standard library.
"""
import json
import os
import re
import struct
import sys
import zlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAZE = os.path.join(ROOT, "sample-maze.json")
GAME = os.path.join(ROOT, "index.html")
OUT  = os.path.join(ROOT, "icon-maze.ico")

SIDE_BIT = {"N": 1, "E": 2, "S": 4, "W": 8}

# Windows asks for these; the small ones carry the taskbar and the tree view.
# Seven blocks is what reads as a maze: nine goes busy and five is stripes.
# Small sizes drop to five because seven corridors in 32px is mush.
SIZES = [(16, 5), (24, 5), (32, 5), (48, 7), (64, 7), (128, 7), (256, 7)]


# ---- read the game, rather than restating it ------------------------------

def palette(src):
    """The default theme, from the C={...} block in index.html."""
    want = ["floor", "floorDot", "wall", "wallTop", "wallLow", "key"]
    out = {}
    for name in want:
        m = re.search(r'\b%s\s*:\s*"(#[0-9A-Fa-f]{6})"' % name, src)
        if not m:
            sys.exit("could not find colour %r in index.html" % name)
        out[name] = m.group(1)
    return out


def key_sprite(src):
    """SPR.keyNum — 13x5, '#' is gold and '.' is see-through."""
    m = re.search(r'keyNum\s*:\s*\[(.*?)\]', src, re.S)
    if not m:
        sys.exit("could not find SPR.keyNum in index.html")
    return re.findall(r'"([^"]*)"', m.group(1))


def rgb(hexstr):
    h = hexstr.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), 255)


# ---- the maze, exactly as index.html decides what is wall -----------------

def is_wall(doc, bx, by):
    """Mirrors isWallBlock(): odd/odd is a cell, even/even a pillar, and the
    two mixed cases are the gap east or south of a cell."""
    w, h = doc["size"]["w"], doc["size"]["h"]
    if bx < 0 or by < 0 or bx > 2 * w or by > 2 * h:
        return True
    ox, oy = bx % 2, by % 2
    if ox == 1 and oy == 1:
        return False
    if ox == 0 and oy == 0:
        return True
    if ox == 0 and oy == 1:
        return not open_at(doc, bx // 2 - 1, (by - 1) // 2, "E")
    if ox == 1 and oy == 0:
        return not open_at(doc, (bx - 1) // 2, by // 2 - 1, "S")
    return True


def open_at(doc, x, y, side):
    w, h = doc["size"]["w"], doc["size"]["h"]
    if x < 0 or y < 0 or x >= w or y >= h:
        return False
    return bool(doc["open"][y][x] & SIDE_BIT[side])


# ---- drawing --------------------------------------------------------------

class Canvas(object):
    def __init__(self, size, fill):
        self.n = size
        self.px = [list(fill) for _ in range(size * size)]

    def rect(self, x, y, w, h, col):
        for yy in range(max(0, y), min(self.n, y + h)):
            row = yy * self.n
            for xx in range(max(0, x), min(self.n, x + w)):
                self.px[row + xx] = list(col)

    def rgba_rows(self):
        for y in range(self.n):
            row = bytearray()
            for x in range(self.n):
                row += bytes(self.px[y * self.n + x])
            yield row


def render(size, blocks, doc, pal, key, cols):
    """One icon. `blocks` blocks across, drawn crisp — no resampling, so
    every edge stays where the game would put it."""
    b = size // blocks                      # block size in pixels
    used = b * blocks
    pad = (size - used) // 2                # centre any remainder
    cv = Canvas(size, cols["floor"])

    # The lit top and shaded bottom are 3px on a 14px block. Keep the ratio,
    # but never let them round away entirely — they are what reads as depth.
    lip = max(1, round(3 * b / 14.0))

    for by in range(blocks):
        for bx in range(blocks):
            x, y = pad + bx * b, pad + by * b
            if is_wall(doc, bx, by):
                cv.rect(x, y, b, b, cols["wall"])
                cv.rect(x, y, b, lip, cols["wallTop"])
                cv.rect(x, y + b - lip, b, lip, cols["wallLow"])
            else:
                cv.rect(x, y, b, b, cols["floor"])
                if (bx + by) % 2 == 0 and b >= 6:
                    d = max(1, b // 7)
                    cv.rect(x + b // 2 - d // 2, y + b // 2 - d // 2,
                            d, d, cols["floorDot"])

    # The key, on the floor where sample-maze.json puts it. The gold is the
    # one thing the eye lands on, so the small sizes keep a pip of it rather
    # than going all blue — a 13x5 sprite in a 3px block is a smear.
    k = doc["keys"][0]["cell"]
    kbx, kby = 2 * k["x"] + 1, 2 * k["y"] + 1
    if kbx < blocks and kby < blocks:
        scale = max(1, int(round(b / 14.0)))
        kw, kh = len(key[0]) * scale, len(key) * scale
        if kw <= b and b >= 8:
            ox = pad + kbx * b + (b - kw) // 2
            oy = pad + kby * b + (b - kh) // 2
            for ry, rowstr in enumerate(key):
                for rx, ch in enumerate(rowstr):
                    if ch == "#":
                        cv.rect(ox + rx * scale, oy + ry * scale,
                                scale, scale, cols["key"])
        else:
            pip = max(1, b // 2)
            cv.rect(pad + kbx * b + (b - pip) // 2,
                    pad + kby * b + (b - pip) // 2, pip, pip, cols["key"])
    return cv


# ---- PNG and ICO, by hand -------------------------------------------------

def png(cv):
    def chunk(tag, data):
        c = tag + data
        return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c) & 0xFFFFFFFF)

    raw = bytearray()
    for row in cv.rgba_rows():
        raw += b"\x00" + row            # filter 0, no prediction
    return (b"\x89PNG\r\n\x1a\n"
            + chunk(b"IHDR", struct.pack(">IIBBBBB", cv.n, cv.n, 8, 6, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(bytes(raw), 9))
            + chunk(b"IEND", b""))


def ico(images):
    """images: [(size, png bytes)] — PNG-compressed entries, which every
    Windows since Vista reads and which keeps 256px from being enormous."""
    n = len(images)
    head = struct.pack("<HHH", 0, 1, n)
    offset = 6 + 16 * n
    entries, blobs = b"", b""
    for size, data in images:
        dim = 0 if size >= 256 else size
        entries += struct.pack("<BBBBHHII", dim, dim, 0, 0, 1, 32,
                               len(data), offset)
        offset += len(data)
        blobs += data
    return head + entries + blobs


def main():
    src = open(GAME, encoding="utf-8").read()
    doc = json.load(open(MAZE, encoding="utf-8"))
    pal = palette(src)
    key = key_sprite(src)
    cols = dict((k, rgb(v)) for k, v in pal.items())

    images = []
    for size, blocks in SIZES:
        images.append((size, png(render(size, blocks, doc, pal, key, cols))))

    open(OUT, "wb").write(ico(images))
    print("wrote %s — %d sizes (%s) from sample-maze.json"
          % (os.path.basename(OUT), len(images),
             ", ".join(str(s) for s, _ in SIZES)))


if __name__ == "__main__":
    sys.exit(main())
