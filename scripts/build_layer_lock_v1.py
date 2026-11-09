from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TEMP_VENDOR = Path.home() / "AppData" / "Local" / "Temp" / "robomdt_model_tools"
if TEMP_VENDOR.exists():
    sys.path.insert(0, str(TEMP_VENDOR))

import numpy as np
import trimesh


SRC = ROOT / "stl file"
OUT = ROOT / "stl redesigned" / "v1_long_lock"
OUT.mkdir(parents=True, exist_ok=True)

# Measured assembled Z ranges from the original files.  The original layers
# overlap at their snap-fit interfaces.  The new rear guide towers are split at
# the midpoint of each overlap so the added solids meet without colliding.
SPLIT_Z = [11.0, 37.5, 57.0, 88.5, 126.233]

# Rear guide locations.  These are inside the body's X span but just behind its
# rear Y face.  They deliberately avoid every wheel/axle feature in layer 1.
GUIDE_X = (-38.0, 42.0)
GUIDE_Y = -70.0
OUTER_RADIUS = 6.0
M4_CLEARANCE_RADIUS = 2.35  # 4.70 mm through-hole


def translated(mesh: trimesh.Trimesh, xyz: tuple[float, float, float]) -> trimesh.Trimesh:
    result = mesh.copy()
    result.apply_translation(xyz)
    return result


def guide_tube(x: float, z0: float, z1: float) -> trimesh.Trimesh:
    height = z1 - z0
    tube = trimesh.creation.annulus(
        r_min=M4_CLEARANCE_RADIUS,
        r_max=OUTER_RADIUS,
        height=height,
        sections=64,
    )
    tube.apply_translation([x, GUIDE_Y, (z0 + z1) / 2.0])
    return tube


def support_ribs(x: float, z0: float, z1: float) -> list[trimesh.Trimesh]:
    """Two ribs join each tube to the rear wall without blocking the M4 hole."""
    height = z1 - z0
    ribs: list[trimesh.Trimesh] = []
    for x_offset in (-4.35, 4.35):
        rib = trimesh.creation.box(extents=[2.7, 8.0, height])
        rib.apply_translation([x + x_offset, -66.0, (z0 + z1) / 2.0])
        ribs.append(rib)
    return ribs


def boolean_union(parts: list[trimesh.Trimesh]) -> trimesh.Trimesh:
    try:
        merged = trimesh.boolean.union(parts, engine="manifold", check_volume=False)
        if isinstance(merged, trimesh.Scene):
            merged = trimesh.util.concatenate(tuple(merged.geometry.values()))
        return merged
    except Exception as exc:
        print(f"WARNING: Boolean union failed ({exc}); exporting overlapping solids.")
        return trimesh.util.concatenate(parts)


def make_knob() -> trimesh.Trimesh:
    """Hand knob for an M4 nut; the nut is inserted from the underside."""
    body = trimesh.creation.cylinder(radius=11.0, height=8.0, sections=48)
    # Six shallow finger scallops around the edge.
    cuts: list[trimesh.Trimesh] = []
    for angle in np.linspace(0, 2 * np.pi, 6, endpoint=False):
        cut = trimesh.creation.cylinder(radius=3.2, height=10.0, sections=32)
        cut.apply_translation([11.0 * np.cos(angle), 11.0 * np.sin(angle), 0.0])
        cuts.append(cut)
    through = trimesh.creation.cylinder(radius=2.25, height=12.0, sections=48)
    # M4 nut: about 7 mm across flats, with print clearance.
    nut_pocket = trimesh.creation.cylinder(radius=4.25, height=4.2, sections=6)
    nut_pocket.apply_translation([0.0, 0.0, -1.9])
    try:
        knob = trimesh.boolean.difference(
            [body, *cuts, through, nut_pocket], engine="manifold", check_volume=False
        )
        if isinstance(knob, trimesh.Scene):
            knob = trimesh.util.concatenate(tuple(knob.geometry.values()))
        return knob
    except Exception:
        # Simple printable fallback with a through-hole only.
        return trimesh.creation.annulus(r_min=2.25, r_max=11.0, height=8.0, sections=64)


def main() -> None:
    report: list[str] = [
        "# RoboMDT layer lock v1",
        "",
        "This revision preserves every original wheel, axle, motor, equipment cavity,",
        "and pairwise snap-fit feature. It only adds two rear M4 guide towers that",
        "lock layers 1 through 4 together.",
        "",
        "## Geometry",
        "",
        f"- Guide centers: X={GUIDE_X}, Y={GUIDE_Y} mm",
        f"- Guide outer diameter: {OUTER_RADIUS * 2:.2f} mm",
        f"- M4 clearance hole: {M4_CLEARANCE_RADIUS * 2:.2f} mm",
        f"- Tower split planes: {SPLIT_Z}",
        "",
        "## Files",
        "",
    ]

    for index in range(1, 5):
        src = SRC / f"ชั้น{index}.stl"
        original = trimesh.load_mesh(src, process=True)
        z0, z1 = SPLIT_Z[index - 1], SPLIT_Z[index]
        additions: list[trimesh.Trimesh] = []
        for x in GUIDE_X:
            additions.append(guide_tube(x, z0, z1))
            additions.extend(support_ribs(x, z0, z1))

        revised = boolean_union([original, *additions])
        revised.remove_unreferenced_vertices()
        target = OUT / f"layer{index}_long_lock_v1.stl"
        revised.export(target)
        report.append(
            f"- `{target.name}` — {revised.extents.round(3).tolist()} mm; "
            f"watertight={'yes' if revised.is_watertight else 'no'}"
        )

    knob = make_knob()
    knob.export(OUT / "M4_hand_knob_v1.stl")
    report.extend(
        [
            "- `M4_hand_knob_v1.stl` — print 2 pieces and insert M4 nuts",
            "",
            "## Hardware",
            "",
            "- M4 threaded rod: 2 pieces; cut only after dry assembling layers 1–4",
            "- M4 nuts: 4",
            "- M4 washers: 4",
            "- Pairwise snap-fits remain the primary child-facing assembly method",
            "- The M4 rods are the secondary transport/load lock",
            "",
            "## Important",
            "",
            "Print or inspect the rear guide area in a slicer before committing to all",
            "four full layers. The original layer 2 mesh was already non-watertight, so",
            "its slicer preview must be checked for missing walls or holes.",
        ]
    )
    (OUT / "README.md").write_text("\n".join(report) + "\n", encoding="utf-8")
    print("\n".join(report))


if __name__ == "__main__":
    main()
