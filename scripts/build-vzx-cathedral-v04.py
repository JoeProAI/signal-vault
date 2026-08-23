from __future__ import annotations

import base64
import json
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "vzx/resources/signal-vault/layers-v04/cathedral-master-v04.png"
OUT_DIR = ROOT / "vzx/resources/signal-vault/layers-v04"
STATE_PATH = ROOT / "vzx/states/signal-cathedral-v04"
SIZE = (1664, 935)


LAYERS = [
    {"name": "crown_apex", "band": "highmid", "polys": [[(0.35, 0), (0.65, 0), (0.64, .19), (.50, .24), (.36, .19)]], "alpha": (.34, .68), "scale": (.985, .17), "cycle": (.018, .13, .05)},
    {"name": "crown_left", "band": "mid", "polys": [[(.20, .10), (.50, .10), (.50, .31), (.39, .32), (.29, .55), (.20, .55)]], "alpha": (.30, .66), "scale": (.975, .22), "cycle": (.025, .11, .12)},
    {"name": "crown_right", "band": "mid", "polys": [[(.50, .10), (.80, .10), (.80, .55), (.71, .55), (.61, .32), (.50, .31)]], "alpha": (.30, .66), "scale": (.975, .22), "cycle": (.025, .11, .62)},
    {"name": "main_column_left", "band": "bass", "polys": [[(.20, .18), (.40, .18), (.39, .86), (.20, .86)]], "alpha": (.36, .70), "scale": (.965, .28), "cycle": (.032, .095, .18)},
    {"name": "main_column_right", "band": "bass", "polys": [[(.60, .18), (.80, .18), (.80, .86), (.61, .86)]], "alpha": (.36, .70), "scale": (.965, .28), "cycle": (.032, .095, .68)},
    {"name": "outer_arch_left", "band": "lowmid", "polys": [[(0, 0), (.31, 0), (.30, .78), (0, .78)]], "alpha": (.26, .72), "scale": (.980, .20), "cycle": (.022, .075, .08)},
    {"name": "outer_arch_right", "band": "lowmid", "polys": [[(.69, 0), (1, 0), (1, .78), (.70, .78)]], "alpha": (.26, .72), "scale": (.980, .20), "cycle": (.022, .075, .58)},
    {"name": "inner_rib_left", "band": "mid", "polys": [[(.31, .24), (.50, .22), (.50, .72), (.32, .72)]], "alpha": (.28, .78), "scale": (.955, .30), "cycle": (.035, .14, .22)},
    {"name": "inner_rib_right", "band": "mid", "polys": [[(.50, .22), (.69, .24), (.68, .72), (.50, .72)]], "alpha": (.28, .78), "scale": (.955, .30), "cycle": (.035, .14, .72)},
    {"name": "portal_core", "band": "sub", "polys": [[(.38, .27), (.62, .27), (.65, .72), (.35, .72)]], "alpha": (.22, .86), "scale": (.925, .48), "cycle": (.045, .07, .00)},
    {"name": "upper_ribs_left", "band": "highmid", "polys": [[(.18, 0), (.46, 0), (.43, .34), (.22, .38)]], "alpha": (.24, .74), "scale": (.980, .18), "cycle": (.020, .17, .30)},
    {"name": "upper_ribs_right", "band": "highmid", "polys": [[(.54, 0), (.82, 0), (.78, .38), (.57, .34)]], "alpha": (.24, .74), "scale": (.980, .18), "cycle": (.020, .17, .80)},
    {"name": "aisle_glow_left", "band": "treble", "polys": [[(0, .30), (.28, .30), (.30, .78), (0, .82)]], "alpha": (.18, .90), "scale": (.990, .14), "cycle": (.016, .23, .10)},
    {"name": "aisle_glow_right", "band": "treble", "polys": [[(.72, .30), (1, .30), (1, .82), (.70, .78)]], "alpha": (.18, .90), "scale": (.990, .14), "cycle": (.016, .23, .60)},
    {"name": "root_left", "band": "bass", "polys": [[(.15, .58), (.43, .56), (.43, .86), (.14, .86)]], "alpha": (.28, .76), "scale": (.970, .30), "cycle": (.028, .105, .36)},
    {"name": "root_right", "band": "bass", "polys": [[(.57, .56), (.85, .58), (.86, .86), (.57, .86)]], "alpha": (.28, .76), "scale": (.970, .30), "cycle": (.028, .105, .86)},
    {"name": "stairs", "band": "lowmid", "polys": [[(.34, .66), (.66, .66), (.70, .90), (.30, .90)]], "alpha": (.32, .70), "scale": (.965, .24), "cycle": (.026, .12, .45)},
    {"name": "floor_center", "band": "sub", "polys": [[(.28, .78), (.72, .78), (.82, 1), (.18, 1)]], "alpha": (.24, .82), "scale": (.950, .38), "cycle": (.038, .08, .50)},
    {"name": "floor_left", "band": "treble", "polys": [[(0, .74), (.42, .74), (.40, 1), (0, 1)]], "alpha": (.20, .88), "scale": (.985, .18), "cycle": (.022, .19, .25)},
    {"name": "floor_right", "band": "treble", "polys": [[(.58, .74), (1, .74), (1, 1), (.60, 1)]], "alpha": (.20, .88), "scale": (.985, .18), "cycle": (.022, .19, .75)},
]

BANDS = {
    "sub": (0, 5.0),
    "bass": (1, 6.5),
    "lowmid": (2, 6.0),
    "mid": (4, 7.0),
    "highmid": (6, 8.5),
    "treble": (7, 11.0),
}


def b64(value: str) -> str:
    return base64.b64encode(value.encode("utf-8")).decode("ascii")


def px(poly: list[tuple[float, float]]) -> list[tuple[int, int]]:
    return [(round(x * SIZE[0]), round(y * SIZE[1])) for x, y in poly]


def build_images() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    master = Image.open(SOURCE).convert("RGB").resize(SIZE, Image.Resampling.LANCZOS)
    master.save(SOURCE, optimize=True)

    base = ImageEnhance.Brightness(master).enhance(.38)
    base = ImageEnhance.Color(base).enhance(.72)
    base.save(OUT_DIR / "00-cathedral-shadow-base.png", optimize=True)

    luminous = ImageEnhance.Brightness(master).enhance(1.12)
    luminance = master.convert("L").point(lambda value: max(0, min(255, round((value - 7) * 1.65))))

    for index, layer in enumerate(LAYERS, start=1):
        region = Image.new("L", SIZE, 0)
        draw = ImageDraw.Draw(region)
        for polygon in layer["polys"]:
            draw.polygon(px(polygon), fill=255)
        region = region.filter(ImageFilter.GaussianBlur(10))
        alpha = ImageChops.multiply(region, luminance)
        coverage = alpha.point(lambda value: 255 if value else 0)
        output = Image.composite(luminous, Image.new("RGB", SIZE, (0, 0, 0)), coverage)
        output.putalpha(alpha)
        output.save(OUT_DIR / f"{index:02d}-{layer['name'].replace('_', '-')}-alpha.png", optimize=True)

    manifest = {
        "master": SOURCE.name,
        "size": SIZE,
        "strategy": "dark stable base plus twenty luminous full-frame alpha plates",
        "layers": LAYERS,
    }
    (OUT_DIR / "layer-map.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")


def build_state() -> None:
    lines = []
    meta = "Signal Cathedral V04|Joseph | Signal Vault|||Twenty-plate spectral architecture engine with coordinated scale, opacity and phase motion."
    lines.append(f"meta_set {b64(meta)}")
    lines.append("component_create sound;input_visualization_listener audio -1.160000 0.000000")

    for row, (band, (octave, speed)) in enumerate(BANDS.items()):
        y = .30 - row * .09
        lines.append(f"component_create maths;interpolation;float_smoother band_{band} -1.000000 {y:.6f}")
        lines.append(f"param_set band_{band} speed {speed:.20f}")

    lines.extend([
        "component_create texture;loaders;png_tex_load base_texture -1.160000 0.820000",
        f"ps64 base_texture filename {b64('resources/signal-vault/layers-v04/00-cathedral-shadow-base.png')}",
        "param_set base_texture flip_vertical 1",
        "component_create renderers;basic;textured_rectangle base_layer -0.980000 0.820000",
        "param_set base_layer facing_camera 0",
        "param_set base_layer size 1.00000000000000000000,0.56189903846153840000,0.00000000000000000000",
        "component_create renderers;opengl_modifiers;blend_mode cathedral_composite 0.860000 0.100000",
        "cpp screen0 1.040000 0.100000",
        "param_set screen0 clear_color 0.00000000000000000000,0.00000000000000000000,0.00400000000000000000,1.00000000000000000000",
        "param_set screen0 gamma_correction 1.00000000000000000000",
    ])

    for index, layer in enumerate(LAYERS, start=1):
        key = f"plate_{index:02d}"
        col = (index - 1) % 5
        row = (index - 1) // 5
        x = -0.82 + col * .34
        y = .72 - row * .38
        alpha_base, alpha_gain = layer["alpha"]
        scale_base, scale_gain = layer["scale"]
        cycle_amp, cycle_freq, cycle_phase = layer["cycle"]
        filename = f"{index:02d}-{layer['name'].replace('_', '-')}-alpha.png"
        lines.extend([
            f"component_create texture;loaders;png_tex_load {key}_texture {x:.6f} {y:.6f}",
            f"ps64 {key}_texture filename {b64('resources/signal-vault/layers-v04/' + filename)}",
            f"param_set {key}_texture flip_vertical 1",
            f"component_create renderers;basic;textured_rectangle {key}_layer {x + .08:.6f} {y:.6f}",
            f"param_set {key}_layer facing_camera 0",
            f"param_set {key}_layer size 1.00000000000000000000,0.56189903846153840000,0.00000000000000000000",
            f"component_create maths;arithmetics;binary;mult {key}_alpha_audio {x:.6f} {y - .08:.6f}",
            f"param_set {key}_alpha_audio param2 {alpha_gain:.20f}",
            f"component_create maths;oscillators;oscillator {key}_alpha_cycle {x + .08:.6f} {y - .08:.6f}",
            f"param_set {key}_alpha_cycle amp {cycle_amp * .8:.20f}",
            f"param_set {key}_alpha_cycle ofs {alpha_base:.20f}",
            f"param_set {key}_alpha_cycle freq {cycle_freq * 1.37:.20f}",
            f"param_set {key}_alpha_cycle phase {cycle_phase:.20f}",
            f"component_create maths;arithmetics;binary;add {key}_alpha_sum {x + .16:.6f} {y - .08:.6f}",
            f"component_create maths;converters;4float_to_float4 {key}_color {x + .24:.6f} {y - .08:.6f}",
            f"param_set {key}_color floata 1.00000000000000000000",
            f"param_set {key}_color floatb 1.00000000000000000000",
            f"param_set {key}_color floatc 1.00000000000000000000",
            f"component_create maths;arithmetics;binary;mult {key}_scale_audio {x:.6f} {y - .16:.6f}",
            f"param_set {key}_scale_audio param2 {scale_gain:.20f}",
            f"component_create maths;oscillators;oscillator {key}_scale_cycle {x + .08:.6f} {y - .16:.6f}",
            f"param_set {key}_scale_cycle amp {cycle_amp:.20f}",
            f"param_set {key}_scale_cycle ofs {scale_base:.20f}",
            f"param_set {key}_scale_cycle freq {cycle_freq:.20f}",
            f"param_set {key}_scale_cycle phase {cycle_phase:.20f}",
            f"component_create maths;arithmetics;binary;add {key}_scale_sum {x + .16:.6f} {y - .16:.6f}",
            f"component_create maths;converters;float_to_float3 {key}_scale_vector {x + .24:.6f} {y - .16:.6f}",
            f"component_create renderers;opengl_modifiers;gl_scale {key}_scale {x + .32:.6f} {y:.6f}",
        ])

    lines.append("")
    for band, (octave, _speed) in BANDS.items():
        lines.append(f"param_connect band_{band} value_in audio octaves_l_{octave}")
    lines.append("param_connect base_layer texture_in base_texture texture")
    lines.append("param_connect cathedral_composite render_in base_layer render_out")

    for index, layer in enumerate(LAYERS, start=1):
        key = f"plate_{index:02d}"
        band = layer["band"]
        lines.extend([
            f"param_connect {key}_layer texture_in {key}_texture texture",
            f"param_connect {key}_alpha_audio param1 band_{band} result_float",
            f"param_connect {key}_alpha_sum param1 {key}_alpha_cycle float",
            f"param_connect {key}_alpha_sum param2 {key}_alpha_audio product",
            f"param_connect {key}_color floatd {key}_alpha_sum sum",
            f"param_connect {key}_layer color_multiplier {key}_color result_float4",
            f"param_connect {key}_scale_audio param1 band_{band} result_float",
            f"param_connect {key}_scale_sum param1 {key}_scale_cycle float",
            f"param_connect {key}_scale_sum param2 {key}_scale_audio product",
            f"param_connect {key}_scale_vector param1 {key}_scale_sum sum",
            f"param_connect {key}_scale scale {key}_scale_vector result_float3",
            f"param_connect {key}_scale render_in {key}_layer render_out",
            f"param_connect cathedral_composite render_in {key}_scale render_out",
        ])

    lines.append("param_connect screen0 screen cathedral_composite render_out")
    STATE_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")


if __name__ == "__main__":
    build_images()
    build_state()
    print(f"Built {len(LAYERS)} cathedral plates in {OUT_DIR}")
    print(f"Built VZX state {STATE_PATH}")
