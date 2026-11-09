from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VENDOR = ROOT / ".tmp_model_tools"
sys.path.insert(0, str(VENDOR))

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import trimesh


SRC = ROOT / "stl file"
OUT = ROOT / "stl redesigned" / "analysis"
OUT.mkdir(parents=True, exist_ok=True)


def plot_section(ax, mesh: trimesh.Trimesh, z: float, color: str) -> int:
    section = mesh.section(plane_origin=[0.0, 0.0, z], plane_normal=[0.0, 0.0, 1.0])
    if section is None:
        return 0
    paths = section.discrete
    for points in paths:
        ax.plot(points[:, 0], points[:, 1], color=color, linewidth=1.0)
    return len(paths)


def main() -> None:
    layer_files = [SRC / f"ชั้น{i}.stl" for i in range(1, 5)]
    report = []

    fig, axes = plt.subplots(4, 3, figsize=(15, 20), constrained_layout=True)
    for row, path in enumerate(layer_files):
        mesh = trimesh.load_mesh(path, process=True)
        zmin, zmax = mesh.bounds[:, 2]
        eps = min(0.5, (zmax - zmin) * 0.02)

        bottom_count = plot_section(axes[row, 0], mesh, zmin + eps, "#1967d2")
        mid_count = plot_section(axes[row, 1], mesh, (zmin + zmax) / 2.0, "#6a1b9a")
        top_count = plot_section(axes[row, 2], mesh, zmax - eps, "#d93025")

        for col, title in enumerate(("bottom", "middle", "top")):
            ax = axes[row, col]
            ax.set_aspect("equal", adjustable="box")
            ax.grid(True, alpha=0.2)
            ax.set_title(f"Layer {row + 1} — {title}")
            ax.set_xlabel("X mm")
            ax.set_ylabel("Y mm")

        report.append(
            {
                "layer": row + 1,
                "file": path.name,
                "bounds_min": mesh.bounds[0].round(3).tolist(),
                "bounds_max": mesh.bounds[1].round(3).tolist(),
                "extents": mesh.extents.round(3).tolist(),
                "bottom_paths": bottom_count,
                "middle_paths": mid_count,
                "top_paths": top_count,
                "watertight": bool(mesh.is_watertight),
            }
        )

    fig.savefig(OUT / "layer_sections.png", dpi=180)
    plt.close(fig)

    lines = [
        "# STL interface analysis",
        "",
        "Generated from the original files without modifying them.",
        "",
        "| Layer | Extents XYZ (mm) | Min XYZ | Max XYZ | Bottom paths | Mid paths | Top paths | Watertight |",
        "|---:|---|---|---|---:|---:|---:|:---:|",
    ]
    for item in report:
        lines.append(
            f"| {item['layer']} | {item['extents']} | {item['bounds_min']} | "
            f"{item['bounds_max']} | {item['bottom_paths']} | {item['middle_paths']} | "
            f"{item['top_paths']} | {'yes' if item['watertight'] else 'no'} |"
        )
    (OUT / "report.md").write_text("\n".join(lines) + "\n", encoding="utf-8")

    for item in report:
        print(item)


if __name__ == "__main__":
    main()
