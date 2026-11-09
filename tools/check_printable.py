"""ตรวจ STL ชิ้นทดสอบ METO ก่อนส่งให้เจ้าของ: ปิดสนิท, ไม่มีชิ้นลอย, ไม่มีชั้นว่าง, พื้นที่ผิวคว่ำที่ต้องใช้ซัพพอร์ต

ใช้: python -I check_printable.py <ไฟล์.stl> [...]
"""
from __future__ import annotations

import sys

import numpy as np
import trimesh
from trimesh.intersections import mesh_plane

LAYER = 0.2
BED_TOL = 0.05
OVERHANG_NZ = -0.72  # ผิวหันลงชันกว่า ~46° จากแนวตั้ง = ต้องใช้ซัพพอร์ต


def components(mesh: trimesh.Trimesh) -> list[trimesh.Trimesh]:
    # แยกตามจุดยอดที่เชื่อมกัน (ไม่ต้องใช้ networkx)
    labels = trimesh.graph.connected_component_labels(mesh.face_adjacency, node_count=len(mesh.faces))
    return [mesh.submesh([np.where(labels == k)[0]], append=True) for k in np.unique(labels)]


def check(path: str) -> bool:
    mesh = trimesh.load(path, force="mesh")
    mesh.apply_translation([0, 0, -mesh.bounds[0][2]])
    ok = True
    notes = []
    if not mesh.is_watertight:
        ok = False
        notes.append("ไม่ปิดสนิท")
    for index, part in enumerate(components(mesh)):
        zmin, zmax = part.bounds[0][2], part.bounds[1][2]
        if zmin > BED_TOL:
            ok = False
            notes.append(f"ชิ้นลอย #{index} เริ่มที่ z={zmin:.2f}")
            continue
        gaps = [z for z in np.arange(LAYER / 2, zmax, LAYER)
                if len(mesh_plane(part, [0, 0, 1], [0, 0, z])) == 0]
        if gaps:
            ok = False
            notes.append(f"ชั้นว่าง #{index} ที่ z≈{gaps[0]:.1f}–{gaps[-1]:.1f}")
    normals = mesh.face_normals
    centers = mesh.triangles_center
    down = (normals[:, 2] < OVERHANG_NZ) & (centers[:, 2] > 0.3)
    area = float(mesh.area_faces[down].sum())
    if area > 4.0:
        ok = False
        notes.append(f"ผิวคว่ำต้องใช้ซัพพอร์ต ~{area:.0f} mm²")
    ext = mesh.extents
    print(f"{'ผ่าน ' if ok else 'ไม่ผ่าน'} {path}  {ext[0]:.1f}×{ext[1]:.1f}×{ext[2]:.1f}  {mesh.volume/1000:.1f} cm³  "
          + ("; ".join(notes) if notes else ""))
    return ok


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    results = [check(p) for p in sys.argv[1:]]
    sys.exit(0 if all(results) else 1)
