# สร้างโมเดลสำหรับทวิน 3D (แขนรอบ 2 ใช้ simlib_r2.scene()) จาก scene() ใน simlib.py (ตำแหน่งประกอบจริง) + ตาราง interlock จาก .h
import sys, os, json, re, base64
SIMD = r"C:/Users/Acer/AppData/Local/Temp/claude/G--My-Drive-METTO-Code-RoboBlock/e69ff40e-5853-49cd-b79a-5fb19b92285d/scratchpad/sim"
sys.path.insert(0, SIMD)
from simlib_r2 import *   # แขนรอบ 2c (6 พ.ย.): ตัว U สั้นแบบ v12 แกน MG90S x 64.85 ยอด U ลดลง ไม่มีฝาครอบ ไม่มีปลายมือ · ของเดิมอยู่ simlib.py
OUT = r"G:/My Drive/METTO/Code/RoboBlock/static/twin3d/models"
os.makedirs(OUT, exist_ok=True)
P = scene()
parts = []
def save(name, m, frame, cat, shell=False, color=None):
    m = m.copy(); m.merge_vertices()
    f = OUT + "/" + name + ".stl"; m.export(f)
    parts.append(dict(name=name, file=name + ".stl", frame=frame, cat=cat, shell=shell, color=color, faces=int(len(m.faces))))
DEV_H = {"h_yaw_servo","h_tilt_servo","h_display","h_camera","h_xiao","h_mpr","h_copper","h_magnets","h_scr_disp"}
for n, d in P.items():
    g = d["g"]; m = d["m"]
    if n.endswith("_L") and g.startswith("arm"): continue          # แขนซ้าย = กระจกของแขนขวาในเบราว์เซอร์
    if n == "mg996_L": continue
    if n == "b_wheels":
        # แยกล้อซ้าย/ขวา ด้วยเครื่องหมาย X ของจุดศูนย์กลางชิ้นย่อย
        comps = m.split(only_watertight=False)
        R = [c for c in comps if c.centroid[0] > 0]; L = [c for c in comps if c.centroid[0] < 0]
        save("wheel_R", trimesh.util.concatenate(R), "wheel", "wheel"); save("wheel_L", trimesh.util.concatenate(L), "wheel", "wheel")
        continue
    if g == "body":
        if n.startswith("mg996"): save("mg996", m, "body", "device"); continue   # ตัว R, ตัว L = กระจก
        cat = "device" if n == "b_tt" else "body"
        save(n, m, "body", cat, shell=n.startswith("layer") or n in ("neck", "b_cover"))
    elif g == "ball": save(n, m, "body", "body")
    elif g in ("headF", "headM"):
        save(n, m, g, "device" if n in DEV_H else "head", shell=(n == "h_shell"))
    else:
        base = n[:-2]
        save("arm_" + base, m, g[:-2], "device" if base in ("mg90", "cable") else "arm")
# อุปกรณ์ภายใน: b_devices (ชั้น 1, 3) ตัดชิ้นที่ซ้ำกับของจริงออก + b_d_* (ชั้น 2 ผังล่าสุด)
dev = load(PP + "/b_devices.stl"); keep = []; drop = []
for c in dev.split(only_watertight=False):
    lo, hi = c.bounds; cz = (lo[2] + hi[2]) / 2
    why = None
    if 34.5 <= cz <= 58.5: why = "ชั้น2 (ใช้ b_d_* แทน)"
    elif abs(c.centroid[0]) > 50 and -125 < c.centroid[1] < -70: why = "ล้อ"
    elif hi[2] <= 13 and lo[1] > -25: why = "ลูกบอล"
    elif lo[2] >= 94 : why = "MG996 กล่อง"
    elif (hi[0]-lo[0]) < 7 and (hi[2]-lo[2]) > 60: why = "แท่งเกลียว"
    elif lo[1] > -125 and abs(c.centroid[0]) > 25 and cz < 34.5 and c.centroid[1] < -39 and (hi[1]-lo[1]) > 60: why = "TT"
    (drop if why else keep).append((c, why))
print("devices keep", len(keep), "drop", len(drop))
for c, w in drop: print("  drop", w, np.round(c.bounds, 1).tolist())
for c, w in keep: print("  keep", np.round(c.bounds, 1).tolist())
dv = trimesh.util.concatenate([c for c, _ in keep] + [load(PP + "/b_d_%s.stl" % k) for k in ["cm","lm","sw","tb","ubec","wago1","wago2"]])
save("devices", dv, "body", "device")
json.dump(dict(parts=parts,
               pivots=dict(YAW_O=YAW_O.tolist(), PIVOT_L=PIVOT_L.tolist(), ARM_AX=ARM_AX.tolist(), CLAMP_AX_R=CLAMP_AX_R.tolist(), TT_SHAFT=TT_SHAFT.tolist()),
               source="simlib.scene() " + SIMD), open(OUT + "/parts.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
# ---- interlock
H = open(r"G:/My Drive/METTO/Code/RoboBlock/RoboPCA9685/meto_interlock_table.h", encoding="utf-8").read()
D = {k: int(v) for k, v in re.findall(r"#define (ILK_\w+) (-?\d+)", H)}
lifts = [int(x) for x in re.search(r"ILK_LIFTS\[ILK_NL\] = \{([^}]*)\}", H).group(1).split(",")]
idx_txt = re.search(r"ILK_IDX\[ILK_NY\]\[ILK_NN\] PROGMEM = \{(.*?)\n\};", H, re.S).group(1)
idx = [[int(x) for x in row.split(",")] for row in re.findall(r"\{([\d,\s]+)\}", idx_txt)]
maps_txt = re.search(r"ILK_MAPS\[[^\]]*\]\[[^\]]*\] PROGMEM = \{(.*?)\n\};", H, re.S).group(1)
maps = [[int(x, 16) for x in row.split(",")] for row in re.findall(r"\{([0-9xA-Fa-f,\s]+)\}", maps_txt)]
assert len(idx) == D["ILK_NY"] and all(len(r) == D["ILK_NN"] for r in idx), (len(idx))
assert len(maps) == D["ILK_MAPS_N"] and all(len(r) == D["ILK_MAP_BYTES"] for r in maps), (len(maps), set(map(len, maps)))
assert len(lifts) == D["ILK_NL"]
json.dump(dict(defs=D, lifts=lifts, idx=idx, maps=[base64.b64encode(bytes(r)).decode() for r in maps],
               note="แปลงจาก RoboPCA9685/meto_interlock_table.h (ตารางเดียวกับเฟิร์มแวร์ หักเผื่อ 2 องศาแล้ว)"),
          open(OUT + "/interlock.json", "w", encoding="utf-8"), ensure_ascii=False)
tot = sum(os.path.getsize(OUT + "/" + f) for f in os.listdir(OUT))
print("parts", len(parts), "faces", sum(p["faces"] for p in parts), "MB", round(tot / 1e6, 2))
