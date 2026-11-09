from __future__ import annotations

import argparse
import csv
import math
import re
import struct
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont


IMAGE_SIZE = (1400, 1050)
BACKGROUND = (247, 249, 252, 255)
TEXT_COLOR = (31, 42, 55, 255)


@dataclass
class Mesh:
    path: Path
    vertices: np.ndarray
    normals: np.ndarray

    @property
    def bounds_min(self) -> np.ndarray:
        return self.vertices.reshape(-1, 3).min(axis=0)

    @property
    def bounds_max(self) -> np.ndarray:
        return self.vertices.reshape(-1, 3).max(axis=0)

    @property
    def dimensions(self) -> np.ndarray:
        return self.bounds_max - self.bounds_min


def load_stl(path: Path) -> Mesh:
    data = path.read_bytes()
    is_binary = False
    if len(data) >= 84:
        triangle_count = struct.unpack_from("<I", data, 80)[0]
        is_binary = 84 + triangle_count * 50 == len(data)

    if is_binary:
        record = np.dtype(
            [
                ("normal", "<f4", (3,)),
                ("vertices", "<f4", (3, 3)),
                ("attribute", "<u2"),
            ]
        )
        triangles = np.frombuffer(data, dtype=record, offset=84, count=triangle_count)
        vertices = triangles["vertices"].astype(np.float64)
        stored_normals = triangles["normal"].astype(np.float64)
    else:
        text = data.decode("utf-8", errors="ignore")
        values = []
        for line in text.splitlines():
            parts = line.strip().split()
            if len(parts) == 4 and parts[0].lower() == "vertex":
                values.append([float(parts[1]), float(parts[2]), float(parts[3])])
        if len(values) % 3:
            raise ValueError(f"Invalid ASCII STL: {path}")
        vertices = np.asarray(values, dtype=np.float64).reshape(-1, 3, 3)
        stored_normals = np.zeros((len(vertices), 3), dtype=np.float64)

    calculated = np.cross(vertices[:, 1] - vertices[:, 0], vertices[:, 2] - vertices[:, 0])
    lengths = np.linalg.norm(calculated, axis=1)
    valid = lengths > 1e-12
    calculated[valid] /= lengths[valid, None]

    stored_lengths = np.linalg.norm(stored_normals, axis=1)
    use_stored = stored_lengths > 0.5
    normals = calculated
    normals[use_stored] = stored_normals[use_stored] / stored_lengths[use_stored, None]
    return Mesh(path=path, vertices=vertices, normals=normals)


def normalize(vector: np.ndarray) -> np.ndarray:
    length = np.linalg.norm(vector)
    if length < 1e-12:
        raise ValueError("Cannot normalize a zero-length vector")
    return vector / length


def camera_basis(camera_direction: tuple[float, float, float]) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    forward = normalize(np.asarray(camera_direction, dtype=np.float64))
    world_up = np.array([0.0, 0.0, 1.0])
    if abs(float(np.dot(forward, world_up))) > 0.96:
        world_up = np.array([0.0, 1.0, 0.0])
    right = normalize(np.cross(world_up, forward))
    up = normalize(np.cross(forward, right))
    return right, up, forward


def base_color_for(name: str) -> tuple[int, int, int]:
    if name.startswith("ชั้น") and "ก้าน" not in name and "คอ" not in name:
        match = re.search(r"ชั้น(\d)", name)
        palette = [(39, 105, 170), (38, 128, 190), (35, 151, 181), (43, 167, 154), (89, 173, 121)]
        if match:
            return palette[(int(match.group(1)) - 1) % len(palette)]
        return palette[0]
    if "ก้าน" in name or "ยึด" in name:
        return (230, 137, 53)
    if "ล้อ" in name or "สายพาน" in name:
        return (80, 91, 105)
    if "แขน" in name:
        return (131, 92, 181)
    if "คอ" in name:
        return (69, 142, 191)
    return (47, 125, 181)


def render_mesh(
    mesh: Mesh,
    output_path: Path,
    camera_direction: tuple[float, float, float],
    base_color: tuple[int, int, int],
) -> None:
    width, height = IMAGE_SIZE
    right, up, forward = camera_basis(camera_direction)
    center = (mesh.bounds_min + mesh.bounds_max) / 2.0
    centered = mesh.vertices - center

    projected_x = np.tensordot(centered, right, axes=([2], [0]))
    projected_y = np.tensordot(centered, up, axes=([2], [0]))
    projected_z = np.tensordot(centered, forward, axes=([2], [0]))

    x_min, x_max = float(projected_x.min()), float(projected_x.max())
    y_min, y_max = float(projected_y.min()), float(projected_y.max())
    projected_width = max(x_max - x_min, 1e-9)
    projected_height = max(y_max - y_min, 1e-9)
    scale = min(width * 0.78 / projected_width, height * 0.74 / projected_height)
    x_center = (x_min + x_max) / 2.0
    y_center = (y_min + y_max) / 2.0

    screen_x = (projected_x - x_center) * scale + width / 2.0
    screen_y = height / 2.0 - (projected_y - y_center) * scale
    screen = np.stack((screen_x, screen_y), axis=2)

    face_visibility = mesh.normals @ forward
    visible = face_visibility > -0.02
    depth = projected_z.mean(axis=1)
    order = np.argsort(depth)

    object_layer = Image.new("RGBA", IMAGE_SIZE, (0, 0, 0, 0))
    draw = ImageDraw.Draw(object_layer, "RGBA")
    light = normalize(np.asarray((0.35, -0.55, 1.0), dtype=np.float64))
    brightness = 0.48 + 0.52 * np.clip(mesh.normals @ light, 0.0, 1.0)
    camera_fill = 0.08 * np.clip(face_visibility, 0.0, 1.0)
    brightness = np.clip(brightness + camera_fill, 0.35, 1.05)

    for face_index in order:
        if not visible[face_index]:
            continue
        polygon = [tuple(point) for point in screen[face_index]]
        shade = float(brightness[face_index])
        color = tuple(max(0, min(255, int(channel * shade))) for channel in base_color)
        draw.polygon(polygon, fill=(*color, 255))

    alpha = object_layer.getchannel("A")
    expanded = alpha.filter(ImageFilter.MaxFilter(9))
    outline_alpha = np.asarray(expanded, dtype=np.int16) - np.asarray(alpha, dtype=np.int16)
    outline_alpha = Image.fromarray(np.clip(outline_alpha, 0, 90).astype(np.uint8), mode="L")
    outline = Image.new("RGBA", IMAGE_SIZE, (24, 39, 55, 0))
    outline.putalpha(outline_alpha)

    shadow_mask = alpha.filter(ImageFilter.GaussianBlur(22))
    shadow = Image.new("RGBA", IMAGE_SIZE, (12, 25, 38, 0))
    shadow.putalpha(shadow_mask.point(lambda value: int(value * 0.20)))
    shifted_shadow = Image.new("RGBA", IMAGE_SIZE, (0, 0, 0, 0))
    shifted_shadow.alpha_composite(shadow, (18, 25))

    canvas = Image.new("RGBA", IMAGE_SIZE, BACKGROUND)
    canvas.alpha_composite(shifted_shadow)
    canvas.alpha_composite(outline)
    canvas.alpha_composite(object_layer)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    canvas.convert("RGB").save(output_path, quality=96)


def natural_sort_key(path: Path) -> tuple:
    name = path.stem
    main = re.fullmatch(r"ชั้น(\d+)", name)
    if main:
        return (0, int(main.group(1)), name)
    support = re.match(r"ชั้น(\d+)", name)
    if support:
        return (1, int(support.group(1)), name)
    if "คอ" in name:
        return (2, 0, name)
    if "สายพาน" in name:
        return (3, 0, name)
    if "ล้อ" in name:
        return (4, 0, name)
    if "แขน" in name:
        return (5, 0, name)
    return (6, 0, name)


def load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        Path("C:/Windows/Fonts/tahoma.ttf"),
        Path("C:/Windows/Fonts/LeelawUI.ttf"),
        Path("C:/Windows/Fonts/arial.ttf"),
    ]
    for font_path in candidates:
        if font_path.exists():
            return ImageFont.truetype(str(font_path), size=size)
    return ImageFont.load_default()


def fit_label(text: str, font_size: int, max_width: int) -> ImageFont.ImageFont:
    while font_size >= 16:
        font = load_font(font_size)
        bbox = font.getbbox(text)
        if bbox[2] - bbox[0] <= max_width:
            return font
        font_size -= 1
    return load_font(16)


def build_contact_sheet(records: list[dict], output_path: Path) -> None:
    canvas = Image.new("RGB", (1920, 1080), (244, 247, 251))
    draw = ImageDraw.Draw(canvas)
    title_font = load_font(43)
    subtitle_font = load_font(24)
    draw.text((70, 32), "ภาพรวมชิ้นส่วน RoboBlock", font=title_font, fill=TEXT_COLOR[:3])
    draw.text((70, 88), "เลือกมุมเฉียงเป็นภาพหลักในสไลด์ และใช้มุมฉายเพื่ออธิบายรายละเอียด", font=subtitle_font, fill=(80, 94, 112))

    columns, rows = 4, 4
    margin_x, top = 55, 145
    gap_x, gap_y = 18, 16
    cell_w = (1920 - margin_x * 2 - gap_x * (columns - 1)) // columns
    cell_h = (1080 - top - 35 - gap_y * (rows - 1)) // rows

    for index, record in enumerate(records):
        row, col = divmod(index, columns)
        x = margin_x + col * (cell_w + gap_x)
        y = top + row * (cell_h + gap_y)
        draw.rounded_rectangle((x, y, x + cell_w, y + cell_h), radius=18, fill="white", outline=(220, 227, 235), width=2)
        thumb = Image.open(record["hero_path"]).convert("RGB")
        thumb.thumbnail((cell_w - 24, cell_h - 70), Image.Resampling.LANCZOS)
        image_x = x + (cell_w - thumb.width) // 2
        image_y = y + 8
        canvas.paste(thumb, (image_x, image_y))
        label = f"{index + 1:02d}  {record['name']}"
        font = fit_label(label, 22, cell_w - 24)
        draw.text((x + 14, y + cell_h - 54), label, font=font, fill=TEXT_COLOR[:3])
        dims = record["dimensions"]
        dim_text = f"{dims[0]:.1f} x {dims[1]:.1f} x {dims[2]:.1f} mm"
        draw.text((x + 14, y + cell_h - 28), dim_text, font=load_font(17), fill=(92, 107, 124))

    output_path.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(output_path, quality=96)


def write_readme(output_dir: Path, records: list[dict]) -> None:
    lines = [
        "# ภาพ STL สำหรับทำสไลด์",
        "",
        "ชุดภาพนี้เรนเดอร์จากไฟล์ STL ต้นฉบับโดยไม่แก้รูปทรงชิ้นงาน",
        "",
        "## วิธีเลือกภาพ",
        "",
        "- `01_มุมเฉียงหลัก.png` ใช้เป็นภาพเด่นของแต่ละชิ้น เพราะเห็นความสูง รูเจาะ และรูปทรงโดยรวมพร้อมกัน",
        "- `02_ด้านบน.png` ใช้อธิบายผัง รูเจาะ ระยะวางอุปกรณ์ และพื้นที่ฐาน",
        "- `03_ด้านหน้า.png` ใช้อธิบายความสูง ระดับชั้น และรูปทรงด้านหน้า",
        "- `04_ด้านข้าง.png` ใช้อธิบายความหนา ระยะยื่น และตำแหน่งจุดยึดด้านข้าง",
        "- `00_ภาพรวมทุกชิ้น.png` ใช้เปิดหัวข้อ Completed Work หรือสรุปชิ้นส่วนที่ออกแบบแล้ว",
        "",
        "## รายการชิ้นงาน",
        "",
        "| ลำดับ | ชิ้นงาน | ขนาด X x Y x Z (mm) | จำนวนสามเหลี่ยม |",
        "|---:|---|---:|---:|",
    ]
    for index, record in enumerate(records, start=1):
        dims = record["dimensions"]
        lines.append(
            f"| {index:02d} | {record['name']} | {dims[0]:.2f} x {dims[1]:.2f} x {dims[2]:.2f} | {record['triangles']:,} |"
        )
    lines.extend(
        [
            "",
            "หมายเหตุ: ขนาดอ่านจากกรอบครอบของโมเดล STL และถือว่าหน่วยของไฟล์เป็นมิลลิเมตร",
            "",
        ]
    )
    (output_dir / "README.md").write_text("\n".join(lines), encoding="utf-8-sig")


def main() -> None:
    parser = argparse.ArgumentParser(description="Render STL parts into slide-ready PNG images")
    parser.add_argument("input_dir", type=Path)
    parser.add_argument("output_dir", type=Path)
    args = parser.parse_args()

    stl_files = sorted(args.input_dir.glob("*.stl"), key=natural_sort_key)
    if not stl_files:
        raise SystemExit(f"No STL files found in {args.input_dir}")

    args.output_dir.mkdir(parents=True, exist_ok=True)
    views = [
        ("01_มุมเฉียงหลัก.png", (1.25, -1.45, 0.95)),
        ("02_ด้านบน.png", (0.0, 0.0, 1.0)),
        ("03_ด้านหน้า.png", (0.0, -1.0, 0.0)),
        ("04_ด้านข้าง.png", (1.0, 0.0, 0.0)),
    ]
    records: list[dict] = []

    for index, stl_path in enumerate(stl_files, start=1):
        mesh = load_stl(stl_path)
        part_dir = args.output_dir / f"{index:02d}_{stl_path.stem}"
        color = base_color_for(stl_path.stem)
        for filename, camera in views:
            render_mesh(mesh, part_dir / filename, camera, color)
        records.append(
            {
                "name": stl_path.stem,
                "source": str(stl_path),
                "folder": str(part_dir),
                "hero_path": str(part_dir / views[0][0]),
                "dimensions": mesh.dimensions,
                "bounds_min": mesh.bounds_min,
                "bounds_max": mesh.bounds_max,
                "triangles": len(mesh.vertices),
            }
        )
        print(f"Rendered {index:02d}/{len(stl_files):02d}: {stl_path.name}", flush=True)

    with (args.output_dir / "รายการชิ้นงาน.csv").open("w", newline="", encoding="utf-8-sig") as csv_file:
        writer = csv.writer(csv_file)
        writer.writerow(
            [
                "ลำดับ",
                "ชื่อชิ้นงาน",
                "ขนาด X (mm)",
                "ขนาด Y (mm)",
                "ขนาด Z (mm)",
                "จำนวนสามเหลี่ยม",
                "ไฟล์ต้นฉบับ",
                "โฟลเดอร์ภาพ",
                "Min X",
                "Min Y",
                "Min Z",
                "Max X",
                "Max Y",
                "Max Z",
            ]
        )
        for index, record in enumerate(records, start=1):
            writer.writerow(
                [
                    index,
                    record["name"],
                    *[f"{value:.3f}" for value in record["dimensions"]],
                    record["triangles"],
                    record["source"],
                    record["folder"],
                    *[f"{value:.3f}" for value in record["bounds_min"]],
                    *[f"{value:.3f}" for value in record["bounds_max"]],
                ]
            )

    build_contact_sheet(records, args.output_dir / "00_ภาพรวมทุกชิ้น.png")
    write_readme(args.output_dir, records)
    print(f"Done: {args.output_dir}", flush=True)


if __name__ == "__main__":
    main()
