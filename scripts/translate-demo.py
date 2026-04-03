#!/usr/bin/env python3
"""Replace Chinese tooltip text in desk-pet demo video with English.

Usage: python3 scripts/translate-demo.py
Input:  site/public/demo/demo.mp4
Output: site/public/demo/demo-en.mp4
"""

import json
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
INPUT_PATH = ROOT / "site/public/demo/demo.mp4"
OUTPUT_PATH = ROOT / "site/public/demo/demo-en.mp4"
FRAMES_IN = Path("/tmp/desk-pet-en/frames-in")
FRAMES_OUT = Path("/tmp/desk-pet-en/frames-out")

BG_COLOR = (247, 247, 247)
FONT_PATH = "/System/Library/Fonts/Helvetica.ttc"

SELF_STEPS = "10,395"
SELF_STATE = "Walking"

PEERS = [
    {"name": "Dash", "steps": "11,293", "state": "Running"},
    {"name": "Alice", "steps": "12,197", "state": "Running"},
    {"name": "Sparky", "steps": "13,597", "state": "Sprinting"},
    {"name": "Kevin", "steps": "10,297", "state": "Idle"},
    {"name": "Bob", "steps": "9,197", "state": "Walking"},
]


def _font(size, bold=False):
    return ImageFont.truetype(FONT_PATH, size, index=1 if bold else 0)


# ── Tooltip generators (2x Retina scale) ─────────────────────────────


def create_self_tooltip():
    f_num = _font(28, bold=True)
    f_unit = _font(16)
    f_state = _font(16)

    d = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
    num_bb = d.textbbox((0, 0), SELF_STEPS, font=f_num)
    num_w, num_h = num_bb[2] - num_bb[0], num_bb[3] - num_bb[1]
    unit_bb = d.textbbox((0, 0), " steps", font=f_unit)
    unit_w = unit_bb[2] - unit_bb[0]
    state_bb = d.textbbox((0, 0), SELF_STATE, font=f_state)
    state_w = state_bb[2] - state_bb[0]

    row1_w = num_w + unit_w + 4
    bar_w = 100
    content_w = max(row1_w, state_w, bar_w)
    px, py = 16, 14
    tt_w = content_w + px * 2
    tt_h = py + num_h + 6 + 15 + 8 + 4 + py
    arrow_h = 6

    img = Image.new("RGBA", (tt_w, tt_h + arrow_h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    bg = (30, 32, 48, 217)
    draw.rounded_rectangle((0, 0, tt_w - 1, tt_h - 1), radius=16, fill=bg)
    cx = tt_w // 2
    draw.polygon(
        [(cx - 5, tt_h - 1), (cx + 5, tt_h - 1), (cx, tt_h + arrow_h - 1)],
        fill=bg,
    )

    y = py
    x0 = (tt_w - row1_w) // 2
    draw.text((x0, y - 2), SELF_STEPS, fill=(248, 250, 252, 255), font=f_num)
    draw.text(
        (x0 + num_w + 4, y + num_h - 14),
        " steps",
        fill=(100, 116, 139, 255),
        font=f_unit,
    )
    y += num_h + 6
    draw.text(
        ((tt_w - state_w) // 2, y),
        SELF_STATE,
        fill=(148, 163, 184, 255),
        font=f_state,
    )
    y += 20
    bx = (tt_w - bar_w) // 2
    draw.rectangle((bx, y, bx + bar_w, y + 3), fill=(255, 255, 255, 15))
    draw.rectangle(
        (bx, y, bx + int(bar_w * 0.55), y + 3), fill=(74, 222, 128, 255)
    )
    return img


def create_peer_tooltip(name, steps, state):
    f_name = _font(18, bold=True)
    f_det = _font(14)

    d = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
    name_bb = d.textbbox((0, 0), name, font=f_name)
    name_w, name_h = name_bb[2] - name_bb[0], name_bb[3] - name_bb[1]
    steps_txt = f"{steps} steps"
    s_bb = d.textbbox((0, 0), steps_txt, font=f_det)
    steps_w = s_bb[2] - s_bb[0]
    st_bb = d.textbbox((0, 0), state, font=f_det)
    state_w = st_bb[2] - st_bb[0]
    detail_w = steps_w + 8 + state_w

    content_w = max(name_w, detail_w)
    px, py = 12, 8
    tt_w = content_w + px * 2
    tt_h = py + name_h + 6 + 13 + py

    img = Image.new("RGBA", (tt_w, tt_h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    bg = (15, 23, 42, 230)
    draw.rounded_rectangle((0, 0, tt_w - 1, tt_h - 1), radius=10, fill=bg)

    draw.text(((tt_w - name_w) // 2, py), name, fill=(241, 245, 249, 255), font=f_name)
    dy = py + name_h + 6
    dx = (tt_w - detail_w) // 2
    draw.text((dx, dy), steps_txt, fill=(167, 139, 250, 255), font=f_det)
    draw.text((dx + steps_w + 8, dy), state, fill=(148, 163, 184, 255), font=f_det)
    return img


# ── Tooltip detection (two-phase) ────────────────────────────────────


def find_tooltip(img_array):
    r = img_array[:, :, 0].astype(np.int16)
    g = img_array[:, :, 1].astype(np.int16)
    b = img_array[:, :, 2].astype(np.int16)
    gray = (r + g + b) / 3.0
    is_dark = (gray < 80) & (b > r)
    h, w = is_dark.shape

    seed_rows = []
    for y in range(h):
        row = is_dark[y]
        best = 0
        best_s = 0
        run = 0
        run_s = 0
        for x in range(w):
            if row[x]:
                if run == 0:
                    run_s = x
                run += 1
            else:
                if run > best:
                    best = run
                    best_s = run_s
                run = 0
        if run > best:
            best = run
            best_s = run_s
        if best > 40:
            seed_rows.append((y, best_s, best_s + best - 1))

    if not seed_rows:
        return None

    groups = []
    cur = [seed_rows[0]]
    for i in range(1, len(seed_rows)):
        if seed_rows[i][0] - seed_rows[i - 1][0] <= 3:
            cur.append(seed_rows[i])
        else:
            if len(cur) >= 5:
                groups.append(cur)
            cur = [seed_rows[i]]
    if len(cur) >= 5:
        groups.append(cur)
    if not groups:
        return None

    groups.sort(key=len, reverse=True)
    best_g = groups[0]
    sy1, sy2 = best_g[0][0], best_g[-1][0]
    sx1 = min(r[1] for r in best_g)
    sx2 = max(r[2] for r in best_g)
    span = sx2 - sx1 + 1
    min_dark = int(span * 0.20)

    y1 = sy1
    for y in range(sy1 - 1, max(0, sy1 - 40) - 1, -1):
        if int(np.sum(is_dark[y, sx1 : sx2 + 1])) >= min_dark:
            y1 = y
        else:
            break

    y2 = sy2
    for y in range(sy2 + 1, min(h, sy2 + 40)):
        if int(np.sum(is_dark[y, sx1 : sx2 + 1])) >= min_dark:
            y2 = y
        else:
            break

    if (sx2 - sx1 + 1) * (y2 - y1 + 1) < 500:
        return None
    return (sx1, y1, sx2, y2)


# ── Compositing ──────────────────────────────────────────────────────


def paste_tooltip(base, tooltip, cx, cy):
    tw, th = tooltip.size
    x, y = cx - tw // 2, cy - th // 2
    canvas = base.convert("RGBA")
    layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    layer.paste(tooltip, (x, y))
    return Image.alpha_composite(canvas, layer).convert("RGB")


# ── Main ─────────────────────────────────────────────────────────────


def main():
    FRAMES_OUT.mkdir(parents=True, exist_ok=True)

    frame_files = sorted(FRAMES_IN.glob("frame_*.png"))
    total = len(frame_files)
    if total == 0:
        print("No input frames found. Run ffmpeg first.")
        return
    print(f"Processing {total} frames...")

    self_tt = create_self_tooltip()
    peer_tts = [create_peer_tooltip(p["name"], p["steps"], p["state"]) for p in PEERS]

    print(f"  Self tooltip: {self_tt.size}")
    for i, pt in enumerate(peer_tts):
        print(f"  Peer {PEERS[i]['name']:>8s}: {pt.size}")

    peer_idx = -1
    prev_type = None
    prev_cx = None
    no_tt = 0

    for fi, fp in enumerate(frame_files):
        img = Image.open(fp)
        arr = np.array(img)
        bb = find_tooltip(arr)

        if bb:
            x1, y1, x2, y2 = bb
            cx, cy = (x1 + x2) // 2, (y1 + y2) // 2
            bh = y2 - y1 + 1
            is_self = bh > 85

            # Erase original tooltip region
            ey1 = max(0, y1 - 3)
            ey2 = min(arr.shape[0] - 1, y2 + 8)
            ex1 = max(0, x1 - 3)
            ex2 = min(arr.shape[1] - 1, x2 + 3)
            arr[ey1 : ey2 + 1, ex1 : ex2 + 1] = BG_COLOR
            img = Image.fromarray(arr)

            if is_self:
                img = paste_tooltip(img, self_tt, cx, cy)
                prev_type = "self"
                prev_cx = cx
            else:
                if (
                    prev_type != "peer"
                    or (prev_cx is not None and abs(cx - prev_cx) > 15)
                    or no_tt > 10
                ):
                    peer_idx = min(peer_idx + 1, len(PEERS) - 1)
                img = paste_tooltip(img, peer_tts[peer_idx], cx, cy)
                prev_type = "peer"
                prev_cx = cx

            no_tt = 0
        else:
            no_tt += 1

        img.save(FRAMES_OUT / fp.name)
        if (fi + 1) % 200 == 0 or fi + 1 == total:
            print(f"  {fi+1}/{total}")

    print("Assembling video...")
    probe = subprocess.run(
        ["ffprobe", "-v", "quiet", "-print_format", "json", "-show_streams", str(INPUT_PATH)],
        capture_output=True, text=True,
    )
    fps = json.loads(probe.stdout)["streams"][0].get("r_frame_rate", "60/1")

    subprocess.run(
        [
            "ffmpeg", "-y", "-framerate", fps,
            "-i", str(FRAMES_OUT / "frame_%04d.png"),
            "-c:v", "libx264", "-crf", "18", "-preset", "medium",
            "-pix_fmt", "yuv420p", str(OUTPUT_PATH),
        ],
        capture_output=True,
    )
    print(f"✓ {OUTPUT_PATH} ({OUTPUT_PATH.stat().st_size / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
