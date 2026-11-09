from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TEMP_VENDOR = Path.home() / "AppData" / "Local" / "Temp" / "robomdt_model_tools"
if TEMP_VENDOR.exists():
    sys.path.insert(0, str(TEMP_VENDOR))

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import trimesh
from mpl_toolkits.mplot3d.art3d import Poly3DCollection


SRC = ROOT / "stl redesigned" / "v1_long_lock"
OUT = SRC / "preview_assembled.png"
COLORS = ("#80cbc4", "#ffcc80", "#90caf9", "#ef9a9a")


def sampled_triangles(mesh: trimesh.Trimesh, limit: int = 9000) -> np.ndarray:
    triangles = mesh.triangles
    if len(triangles) <= limit:
        return triangles
    indices = np.linspace(0, len(triangles) - 1, limit, dtype=int)
    return triangles[indices]


def add_mesh(ax, mesh: trimesh.Trimesh, color: str, alpha: float = 0.78) -> None:
    poly = Poly3DCollection(
        sampled_triangles(mesh),
        facecolor=color,
        edgecolor="#455a64",
        linewidth=0.05,
        alpha=alpha,
    )
    ax.add_collection3d(poly)


def set_equal(ax, bounds: np.ndarray) -> None:
    center = bounds.mean(axis=0)
    radius = (bounds[1] - bounds[0]).max() / 2.0
    ax.set_xlim(center[0] - radius, center[0] + radius)
    ax.set_ylim(center[1] - radius, center[1] + radius)
    ax.set_zlim(center[2] - radius, center[2] + radius)
    ax.set_box_aspect((1, 1, 1))


def main() -> None:
    meshes = [trimesh.load_mesh(SRC / f"layer{i}_long_lock_v1.stl", process=True) for i in range(1, 5)]
    bounds = np.array([m.bounds for m in meshes])
    combined_bounds = np.array([bounds[:, 0, :].min(axis=0), bounds[:, 1, :].max(axis=0)])

    fig = plt.figure(figsize=(16, 8), constrained_layout=True)
    views = ((25, -55, "Front/isometric"), (20, 90, "Rear lock towers"))
    for idx, (elev, azim, title) in enumerate(views, 1):
        ax = fig.add_subplot(1, 2, idx, projection="3d")
        for mesh, color in zip(meshes, COLORS):
            add_mesh(ax, mesh, color)
        set_equal(ax, combined_bounds)
        ax.view_init(elev=elev, azim=azim)
        ax.set_title(title)
        ax.set_xlabel("X")
        ax.set_ylabel("Y")
        ax.set_zlabel("Z")
    fig.savefig(OUT, dpi=180)
    print(OUT)


if __name__ == "__main__":
    main()
