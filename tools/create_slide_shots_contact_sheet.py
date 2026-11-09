from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(r"G:\My Drive\METTO\Code\RoboBlock\slide-shots")
OUTPUT = ROOT / "00-contact-sheet.png"


def font(size: int):
    for path in (
        Path(r"C:\Windows\Fonts\tahoma.ttf"),
        Path(r"C:\Windows\Fonts\LeelawUI.ttf"),
        Path(r"C:\Windows\Fonts\arial.ttf"),
    ):
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def main():
    shots = sorted(p for p in ROOT.glob("*.png") if p.name != OUTPUT.name)
    columns = 4
    rows = (len(shots) + columns - 1) // columns
    width = 1920
    margin = 40
    gap = 18
    title_h = 110
    cell_w = (width - margin * 2 - gap * (columns - 1)) // columns
    cell_h = 285
    height = title_h + margin + rows * cell_h + (rows - 1) * gap + margin

    canvas = Image.new("RGB", (width, height), (241, 245, 249))
    draw = ImageDraw.Draw(canvas)
    draw.text((margin, 28), f"ชุดภาพเว็บไซต์สำหรับตรวจ ({len(shots)} ภาพ)", font=font(42), fill=(25, 38, 55))
    draw.text((margin, 78), "ชื่อไฟล์เรียงตามลำดับฟีเจอร์ที่แคปไว้", font=font(22), fill=(81, 96, 113))

    for index, shot in enumerate(shots):
        row, col = divmod(index, columns)
        x = margin + col * (cell_w + gap)
        y = title_h + margin + row * (cell_h + gap)
        draw.rounded_rectangle((x, y, x + cell_w, y + cell_h), 14, fill="white", outline=(211, 220, 230), width=2)

        with Image.open(shot) as source:
            thumb = source.convert("RGB")
            thumb.thumbnail((cell_w - 20, cell_h - 62), Image.Resampling.LANCZOS)
            image_x = x + (cell_w - thumb.width) // 2
            image_y = y + 10
            canvas.paste(thumb, (image_x, image_y))

        label = shot.stem
        label_font = font(19)
        while label_font.getbbox(label)[2] > cell_w - 24:
            size = max(13, getattr(label_font, "size", 19) - 1)
            label_font = font(size)
            if size == 13:
                break
        draw.text((x + 12, y + cell_h - 38), label, font=label_font, fill=(28, 42, 60))

    canvas.save(OUTPUT, quality=95)
    print(OUTPUT)


if __name__ == "__main__":
    main()
