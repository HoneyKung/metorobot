# แปลง RoboPCA9685/meto_emotes.h → static/twin3d/emotes.js (ท่าทุกชุด ใช้ข้อมูลชุดเดียวกับเฟิร์มแวร์)
# ใช้: py -3 -I -X utf8 tools/gen_emotes_js.py   (รันซ้ำทุกครั้งที่แก้ meto_emotes.h)
import os, re, json
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = open(os.path.join(ROOT, "RoboPCA9685", "meto_emotes.h"), encoding="utf-8").read()
src = re.sub(r"//[^\n]*", "", src)
tok = {"EK": None, "ER": "R"}
def val(t):
    t = t.strip()
    if t.startswith("'"): return t[1:-1]
    return tok[t] if t in tok else int(t)
arrs = {}
for name, body in re.findall(r"const\s+EmoKey\s+(\w+)\[\]\s*=\s*\{(.*?)\};", src, re.S):
    rows = [[val(x) for x in r.split(",")] for r in re.findall(r"\{([^{}]*)\}", body)]
    arrs[name] = [dict(yaw=r[0], tilt=r[1], liftL=r[2], liftR=r[3], handL=r[4], handR=r[5], ms=r[6], face=(r[7] if len(r) > 7 else None)) for r in rows]
sets = {}
for code, names in re.findall(r"\{\s*'(.)',\s*\{([^}]*)\}", src):
    sets[code] = [n.strip() for n in names.split(",") if n.strip()]
head = ["// สร้างอัตโนมัติจาก RoboPCA9685/meto_emotes.h ด้วย tools/gen_emotes_js.py — ห้ามแก้ไฟล์นี้ตรง ๆ",
        "// null = ไม่แตะแกนนี้ (EK) · \"R\" = ท่าพัก (ER: แขนยก = REST_LIFT แขนลง · แขนกาง/หนีบ = กลาง) · face: หน้าในจังหวะ (null = คงเดิม)",
        "export const ARR = " + json.dumps(arrs, ensure_ascii=False) + ";",
        "export const SETS = " + json.dumps(sets, ensure_ascii=False) + ";",
        "export const REST_LIFT = " + re.search(r"#define REST_LIFT \((-?\d+)\)", open(os.path.join(ROOT, "RoboPCA9685", "meto_emotes.h"), encoding="utf-8").read()).group(1) + ";", ""]
open(os.path.join(ROOT, "static", "twin3d", "emotes.js"), "w", encoding="utf-8").write("\n".join(head))
print("ท่า", len(arrs), "ชุด", {k: len(v) for k, v in sets.items()})
