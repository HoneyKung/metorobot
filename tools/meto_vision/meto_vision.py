# -*- coding: utf-8 -*-
"""
METO vision (กล้องขั้น 2) — คอมเป็นคนดูภาพจากกล้องหัวหุ่น

  py -3 meto_vision.py run                 # ดูภาพสด + สั่งหุ่น
  py -3 meto_vision.py run --dry-run       # ดูภาพสด ไม่สั่งหุ่น (แค่พิมพ์คำสั่งที่จะส่ง)
  py -3 meto_vision.py run --source 0      # ใช้เว็บแคมคอมแทนกล้องหุ่น (ลองระบบ)
  py -3 meto_vision.py enroll --name farm  # ถ่ายหน้า 5 รูป แล้วจำคนนี้
  py -3 meto_vision.py enroll --name farm --folder รูป\\farm   # จำจากรูปในโฟลเดอร์
  py -3 meto_vision.py test                # ทดสอบออฟไลน์ (ไม่ต้องมีหุ่น/กล้อง) + วัด FPS

ส่งอะไรไปหุ่น (ใช้ /run เดิมทั้งหมด ไม่ต้องแก้เฟิร์มแวร์หลัก):
  เจ้าของที่จำได้  → /run?cmd=emo:H;emo:B;     (ยิ้ม แล้วเขิน)
  เห็นคน           → /run?cmd=yaw:<องศา>;       (หันหัวไปหาคน · อ่าน yaw ปัจจุบันจาก /state)
  เห็นขวด/แก้ว     → ไม่สั่งหุ่น แต่เปิดให้ถามได้ที่ http://localhost:8765/objects (+ ไฟล์ latest_objects.json)
"""
import argparse
import json
import os
import queue
import sys
import threading
import time
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import cv2
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
MODELS = os.path.join(HERE, "models")
FACES_DIR = os.path.join(HERE, "faces")
FACES_DB = os.path.join(HERE, "faces_db.npz")

YUNET_URL = ("https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/"
             "face_detection_yunet_2023mar.onnx")
SFACE_URL = ("https://github.com/opencv/opencv_zoo/raw/main/models/face_recognition_sface/"
             "face_recognition_sface_2021dec.onnx")

DEFAULT_CFG = {
    "robot_url": "http://MDTrobot.local",
    "camera_url": "http://metocam.local:81/stream",
    "camera_mode": "both",          # สั่งกล้องเข้าโหมดนี้ตอนเริ่ม (both / stream / "" = ไม่สั่ง)
    "yolo_model": "yolov8n.pt",
    "yolo_conf": 0.4,
    "yolo_imgsz": 320,              # 320 เร็ว · 640 แม่นกว่าแต่ช้า
    "object_labels": ["person", "bottle", "cup"],
    "face_match_threshold": 0.363,  # cosine SFace (ค่ามาตรฐาน OpenCV) · สูง = เข้มขึ้น
    "greet_names": [],              # [] = ทักทุกคนที่ลงทะเบียน · ใส่ชื่อ = ทักเฉพาะคนนี้
    "greet_cmd": "emo:H;emo:B;",
    "greet_cooldown_s": 60,
    "look_enable": True,
    "look_period_s": 0.5,           # ส่ง yaw ถี่สุดทุก 0.5 วิ
    "look_hfov_deg": 50.0,          # มุมมองแนวนอนของภาพ (both 240×240 ≈ 50 · stream VGA ≈ 60–66)
    "look_kp": 0.6,
    "look_dead_frac": 0.08,         # คนอยู่ห่างกลางภาพไม่เกิน 8% ของความกว้าง = ไม่หัน
    "look_limit_deg": 60.0,         # ตรงกับ TRK_YAW_LIM ในเฟิร์มแวร์หลัก
    "look_x_sign": 1,               # ภาพกลับด้านแล้วหัวหันหนี → ตั้ง -1
    "look_skip_if_robot_tracking": True,  # หุ่นกำลังหันตามหน้าเอง (faceSeen=1) → คอมไม่แย่ง
    "report_port": 8765,
    "state_period_s": 0.5,
}


def load_cfg():
    cfg = dict(DEFAULT_CFG)
    p = os.path.join(HERE, "config.json")
    if os.path.exists(p):
        with open(p, encoding="utf-8") as f:
            cfg.update(json.load(f))
    return cfg


def log(*a):
    print(time.strftime("%H:%M:%S"), *a, flush=True)


# ---------------------------------------------------------------- รูปภาพ (รองรับชื่อไฟล์ไทย)
def imread_u(path):
    data = np.fromfile(path, dtype=np.uint8)
    return cv2.imdecode(data, cv2.IMREAD_COLOR) if data.size else None


def imwrite_u(path, img):
    ok, buf = cv2.imencode(os.path.splitext(path)[1] or ".jpg", img)
    if ok:
        buf.tofile(path)
    return ok


def download(url, dst):
    if os.path.exists(dst) and os.path.getsize(dst) > 10000:
        return dst
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    log("ดาวน์โหลด", os.path.basename(dst), "...")
    tmp = dst + ".part"
    urllib.request.urlretrieve(url, tmp)
    os.replace(tmp, dst)
    return dst


# ---------------------------------------------------------------- แหล่งภาพ
class MjpegReader:
    """อ่าน MJPEG จาก /stream ของกล้อง เก็บแค่ภาพล่าสุด (ไม่ค้างคิว = ภาพไม่ดีเลย์)"""

    def __init__(self, url):
        self.url, self.frame, self.seq, self.err = url, None, 0, ""
        self.lock = threading.Lock()
        self.stop = False
        threading.Thread(target=self._loop, daemon=True).start()

    def _loop(self):
        while not self.stop:
            try:
                with urllib.request.urlopen(self.url, timeout=5) as r:
                    buf = b""
                    self.err = ""
                    while not self.stop:
                        chunk = r.read(8192)
                        if not chunk:
                            break
                        buf += chunk
                        a = buf.find(b"\xff\xd8")
                        b = buf.find(b"\xff\xd9", a + 2) if a >= 0 else -1
                        while a >= 0 and b >= 0:
                            jpg = buf[a:b + 2]
                            buf = buf[b + 2:]
                            img = cv2.imdecode(np.frombuffer(jpg, np.uint8), cv2.IMREAD_COLOR)
                            if img is not None:
                                with self.lock:
                                    self.frame, self.seq = img, self.seq + 1
                            a = buf.find(b"\xff\xd8")
                            b = buf.find(b"\xff\xd9", a + 2) if a >= 0 else -1
                        if len(buf) > 2_000_000:
                            buf = b""
            except Exception as e:  # กล้องยังไม่ขึ้น / หลุด → ลองใหม่
                self.err = str(e)[:80]
                time.sleep(1.0)

    def read(self):
        with self.lock:
            return self.seq, self.frame


class CvReader:
    """เว็บแคม (ตัวเลข) หรือไฟล์วิดีโอ"""

    def __init__(self, src):
        self.cap = cv2.VideoCapture(int(src) if str(src).isdigit() else src)
        self.seq, self.err = 0, ""

    def read(self):
        ok, f = self.cap.read()
        if not ok:
            self.err = "อ่านภาพไม่ได้"
            return self.seq, None
        self.seq += 1
        return self.seq, f


def open_source(src):
    return MjpegReader(src) if str(src).startswith("http") else CvReader(src)


# ---------------------------------------------------------------- ตาเห็น
class Vision:
    def __init__(self, cfg, need_yolo=True):
        self.cfg = cfg
        self.yolo = None
        if need_yolo:
            from ultralytics import YOLO
            os.makedirs(MODELS, exist_ok=True)
            mp = os.path.join(MODELS, cfg["yolo_model"])
            self.yolo = YOLO(mp)                     # ไม่มีไฟล์ = ultralytics ดาวน์โหลดลง models/ ให้เอง
            names = self.yolo.names
            self.keep = [i for i, n in names.items() if n in cfg["object_labels"]]
        yunet = download(YUNET_URL, os.path.join(MODELS, "face_detection_yunet_2023mar.onnx"))
        sface = download(SFACE_URL, os.path.join(MODELS, "face_recognition_sface_2021dec.onnx"))
        self.det = cv2.FaceDetectorYN.create(yunet, "", (320, 320), 0.8, 0.3, 5000)
        self.rec = cv2.FaceRecognizerSF.create(sface, "")
        self.db_names, self.db_feats = [], np.zeros((0, 128), np.float32)
        self.load_db()

    def load_db(self):
        if os.path.exists(FACES_DB):
            d = np.load(FACES_DB, allow_pickle=False)
            self.db_names = [str(n) for n in d["names"]]
            self.db_feats = d["feats"].astype(np.float32)

    def objects(self, img):
        if self.yolo is None:
            return []
        r = self.yolo.predict(img, imgsz=self.cfg["yolo_imgsz"], conf=self.cfg["yolo_conf"],
                              classes=self.keep, verbose=False)[0]
        out = []
        for b in r.boxes:
            x1, y1, x2, y2 = [float(v) for v in b.xyxy[0]]
            out.append({"label": r.names[int(b.cls)], "conf": round(float(b.conf), 2),
                        "box": [int(x1), int(y1), int(x2), int(y2)]})
        return out

    def faces_raw(self, img):
        h, w = img.shape[:2]
        self.det.setInputSize((w, h))
        _, f = self.det.detect(img)
        return [] if f is None else list(f)

    def feature(self, img, face_row):
        crop = self.rec.alignCrop(img, face_row)
        return self.rec.feature(crop).flatten().astype(np.float32), crop

    def faces(self, img):
        out = []
        for row in self.faces_raw(img):
            x, y, w, h = [int(v) for v in row[:4]]
            name, score = "?", 0.0
            if len(self.db_names):
                feat, _ = self.feature(img, row)
                fn = feat / (np.linalg.norm(feat) + 1e-9)
                dbn = self.db_feats / (np.linalg.norm(self.db_feats, axis=1, keepdims=True) + 1e-9)
                sims = dbn @ fn
                i = int(np.argmax(sims))
                score = float(sims[i])
                if score >= self.cfg["face_match_threshold"]:
                    name = self.db_names[i]
            out.append({"box": [x, y, x + w, y + h], "name": name, "score": round(score, 3),
                        "det": round(float(row[14]), 2)})
        return out


# ---------------------------------------------------------------- หุ่น
class Robot:
    """ส่ง /run ในเธรดแยก (เน็ตช้าไม่ทำให้ภาพค้าง) · คิวยาว 1 = คำสั่งใหม่ทับคำสั่งเก่าที่ยังไม่ได้ส่ง"""

    def __init__(self, url, dry, state_period):
        self.url, self.dry = url.rstrip("/"), dry
        self.state, self.state_t, self.last, self.ok = {}, 0.0, "", None
        self.q = queue.Queue(maxsize=1)
        self.state_period = state_period
        threading.Thread(target=self._send_loop, daemon=True).start()
        threading.Thread(target=self._state_loop, daemon=True).start()

    def _get(self, path, timeout=1.5):
        with urllib.request.urlopen(self.url + path, timeout=timeout) as r:
            return r.status, r.read().decode("utf-8", "replace")

    def _state_loop(self):
        while True:
            if not self.dry:
                try:
                    _, body = self._get("/state", 1.0)
                    self.state, self.state_t, self.ok = json.loads(body), time.time(), True
                except Exception:
                    self.ok = False
            time.sleep(self.state_period)

    def _send_loop(self):
        while True:
            cmd = self.q.get()
            if self.dry:
                self.last = "[dry] " + cmd
                log("หุ่น (dry-run) ←", cmd)
                continue
            try:
                code, body = self._get("/run?cmd=" + urllib.parse.quote(cmd, safe=":;"), 2.0)
                self.last = f"{cmd} → {body}"
            except urllib.error.HTTPError as e:   # 409 BUSY = หุ่นทำคำสั่งอื่นอยู่ ข้ามไป
                self.last = f"{cmd} → {e.code} {e.read().decode('utf-8', 'replace')}"
            except Exception as e:
                self.last = f"{cmd} → ส่งไม่ได้ ({str(e)[:40]})"
            log("หุ่น ←", self.last)

    def send(self, cmd):
        try:
            self.q.get_nowait()
        except queue.Empty:
            pass
        self.q.put_nowait(cmd)

    def yaw_now(self):
        if self.state and time.time() - self.state_t < 2.0:
            return float(self.state.get("yaw", 0.0)), int(self.state.get("faceSeen", 0))
        return None, 0


class Brain:
    """ตัดสินใจว่าจะส่งอะไรไปหุ่น"""

    def __init__(self, cfg, robot):
        self.cfg, self.robot = cfg, robot
        self.last_greet, self.last_look, self.sim_yaw = {}, 0.0, 0.0
        self.report = {"t": 0, "objects": [], "faces": []}

    def step(self, img, objs, faces):
        c, now = self.cfg, time.time()
        h, w = img.shape[:2]
        # 1) เจ้าของที่จำได้ → ทัก (ยิ้ม+เขิน)
        greet_set = set(c["greet_names"]) or None
        for f in faces:
            n = f["name"]
            if n != "?" and (greet_set is None or n in greet_set):
                if now - self.last_greet.get(n, 0) > c["greet_cooldown_s"]:
                    self.last_greet[n] = now
                    self.last_look = now + 2.5          # ให้ท่าทักเล่นจบก่อนค่อยหันต่อ
                    log(f"จำได้: {n} ({f['score']}) → ทัก")
                    self.robot.send(c["greet_cmd"])
                    break
        # 2) เห็นคน → หันหัวไปหา (ใช้หน้าถ้ามี แม่นกว่า)
        if c["look_enable"] and now - self.last_look >= c["look_period_s"]:
            tgt = None
            if faces:
                tgt = max(faces, key=lambda f: f["box"][2] - f["box"][0])["box"]
            else:
                ppl = [o for o in objs if o["label"] == "person"]
                if ppl:
                    b = max(ppl, key=lambda o: (o["box"][2] - o["box"][0]) * (o["box"][3] - o["box"][1]))["box"]
                    tgt = [b[0], b[1], b[2], b[1] + (b[3] - b[1]) // 4]   # มองช่วงหัว (1/4 บนของกรอบ)
            if tgt:
                xoff = ((tgt[0] + tgt[2]) / 2 - w / 2) / w           # −0.5..0.5 (ลบ = ซ้ายภาพ)
                yaw, robot_tracking = self.robot.yaw_now()
                if yaw is None:
                    yaw = self.sim_yaw                              # dry-run / ยังอ่าน /state ไม่ได้
                skip = c["look_skip_if_robot_tracking"] and robot_tracking
                if abs(xoff) > c["look_dead_frac"] and not skip:
                    err = -c["look_x_sign"] * xoff * c["look_hfov_deg"]   # ซ้ายภาพ → + (ซ้ายหุ่น) เหมือน CAM_X_SIGN
                    lim = c["look_limit_deg"]
                    new = max(-lim, min(lim, yaw + c["look_kp"] * err))
                    if abs(new - yaw) >= 1.0:
                        self.sim_yaw = new
                        self.last_look = now
                        self.robot.send(f"yaw:{new:.0f};")
        # 3) ขวด/แก้ว → รายงานตำแหน่ง (ให้บล็อก "ไปหยิบ" มาถามทีหลัง)
        yaw, _ = self.robot.yaw_now()
        yaw = self.sim_yaw if yaw is None else yaw
        rep = []
        for o in objs:
            if o["label"] == "person":
                continue
            b = o["box"]
            cx = ((b[0] + b[2]) / 2 - w / 2) / w
            cy = ((b[1] + b[3]) / 2 - h / 2) / h
            rep.append({"label": o["label"], "conf": o["conf"],
                        "x": round(cx * 200), "y": round(cy * 200),       # −100..100 แบบเดียวกับบรรทัด F
                        "w": round((b[2] - b[0]) * 100 / w),               # % ของความกว้างภาพ (ใหญ่ = ใกล้)
                        "bearing_deg": round(yaw - c["look_x_sign"] * cx * c["look_hfov_deg"], 1),
                        "box": b})
        self.report = {"t": round(now, 2), "frame": [w, h], "head_yaw": round(yaw, 1), "objects": rep,
                       "faces": [{"name": f["name"], "score": f["score"], "box": f["box"]} for f in faces]}
        return self.report


def start_report_server(brain, port):
    class H(BaseHTTPRequestHandler):
        def do_GET(self):
            body = json.dumps(brain.report, ensure_ascii=False).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(body)

        def log_message(self, *a):
            pass
    try:
        srv = ThreadingHTTPServer(("0.0.0.0", port), H)
        threading.Thread(target=srv.serve_forever, daemon=True).start()
        log(f"รายงานวัตถุ: http://localhost:{port}/objects")
    except OSError as e:
        log("เปิดพอร์ตรายงานไม่ได้:", e)


# ---------------------------------------------------------------- วาด
COLORS = {"person": (80, 200, 80), "bottle": (0, 160, 255), "cup": (0, 220, 255)}


def draw(img, objs, faces, hud):
    for o in objs:
        b, col = o["box"], COLORS.get(o["label"], (200, 200, 200))
        cv2.rectangle(img, (b[0], b[1]), (b[2], b[3]), col, 2)
        cv2.putText(img, f"{o['label']} {o['conf']:.2f}", (b[0], max(12, b[1] - 4)),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, col, 1, cv2.LINE_AA)
    for f in faces:
        b = f["box"]
        col = (255, 120, 0) if f["name"] != "?" else (200, 200, 200)
        cv2.rectangle(img, (b[0], b[1]), (b[2], b[3]), col, 2)
        label = f["name"].encode("ascii", "replace").decode() + (f" {f['score']:.2f}" if f["score"] else "")
        cv2.putText(img, label, (b[0], b[3] + 14), cv2.FONT_HERSHEY_SIMPLEX, 0.45, col, 1, cv2.LINE_AA)
    y = 16
    for line in hud:
        cv2.putText(img, line, (6, y), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 0, 0), 3, cv2.LINE_AA)
        cv2.putText(img, line, (6, y), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1, cv2.LINE_AA)
        y += 16
    return img


def set_camera_mode(cfg):
    m = cfg.get("camera_mode")
    url = cfg["camera_url"]
    if not m or not url.startswith("http"):
        return
    p = urllib.parse.urlparse(url)
    ctrl = f"{p.scheme}://{p.hostname}/mode?m={m}"          # /mode อยู่พอร์ต 80
    try:
        with urllib.request.urlopen(ctrl, timeout=3) as r:
            log("กล้อง:", r.read().decode()[:120])
    except Exception as e:
        log("สั่งโหมดกล้องไม่ได้ (ยังลองอ่านภาพต่อ):", str(e)[:60])


# ---------------------------------------------------------------- คำสั่ง
def cmd_run(args, cfg):
    src = args.source or cfg["camera_url"]
    if src == cfg["camera_url"]:
        set_camera_mode(cfg)
    vis = Vision(cfg)
    robot = Robot(args.robot or cfg["robot_url"], args.dry_run, cfg["state_period_s"])
    brain = Brain(cfg, robot)
    start_report_server(brain, cfg["report_port"])
    reader = open_source(src)
    log("แหล่งภาพ:", src, "| หุ่น:", robot.url, "(dry-run)" if robot.dry else "")
    log("ปุ่ม: q = ออก · p = หยุด/เริ่มสั่งหุ่น")
    last_seq, fps, t0, n, paused = -1, 0.0, time.time(), 0, False
    out_json = os.path.join(HERE, "latest_objects.json")
    while True:
        seq, frame = reader.read()
        if frame is None or seq == last_seq:
            blank = np.zeros((240, 320, 3), np.uint8)
            cv2.putText(blank, "waiting for camera...", (10, 120), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
            cv2.putText(blank, reader.err[:45], (10, 145), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 0, 255), 1)
            if frame is None:
                cv2.imshow("METO vision", blank)
            if (cv2.waitKey(10) & 0xFF) == ord("q"):
                break
            continue
        last_seq = seq
        img = frame.copy()
        objs = vis.objects(img)
        faces = vis.faces(img)
        if not paused:
            rep = brain.step(img, objs, faces)
            if rep["objects"]:
                with open(out_json, "w", encoding="utf-8") as f:
                    json.dump(rep, f, ensure_ascii=False)
        n += 1
        if time.time() - t0 >= 1.0:
            fps, t0, n = n / (time.time() - t0), time.time(), 0
        st = "robot OK" if robot.ok else ("dry-run" if robot.dry else "robot ?")
        hud = [f"{fps:.1f} fps  {img.shape[1]}x{img.shape[0]}  {st}{'  PAUSED' if paused else ''}",
               robot.last[-50:].encode("ascii", "replace").decode()]
        cv2.imshow("METO vision", draw(img, objs, faces, hud))
        k = cv2.waitKey(1) & 0xFF
        if k == ord("q"):
            break
        if k == ord("p"):
            paused = not paused
    cv2.destroyAllWindows()


def save_db(names, feats):
    np.savez(FACES_DB, names=np.array(names), feats=np.array(feats, np.float32))


def cmd_enroll(args, cfg):
    vis = Vision(cfg, need_yolo=False)
    name = args.name.strip()
    person_dir = os.path.join(FACES_DIR, name)
    os.makedirs(person_dir, exist_ok=True)
    feats = []
    if args.folder:                                      # จากรูปในโฟลเดอร์
        for fn in sorted(os.listdir(args.folder)):
            img = imread_u(os.path.join(args.folder, fn))
            if img is None:
                continue
            fr = vis.faces_raw(img)
            if not fr:
                log("ไม่เจอหน้าใน", fn)
                continue
            row = max(fr, key=lambda r: r[2] * r[3])
            feat, crop = vis.feature(img, row)
            feats.append(feat)
            imwrite_u(os.path.join(person_dir, f"{len(feats):02d}.jpg"), crop)
    else:                                                # ถ่ายสดจากกล้องหุ่น/เว็บแคม
        src = args.source or cfg["camera_url"]
        if src == cfg["camera_url"]:
            set_camera_mode(cfg)
        reader = open_source(src)
        log(f"ลงทะเบียน '{name}': มองกล้อง หันซ้ายขวาเล็กน้อย ถ่าย {args.shots} รูป ห่างกันรูปละ 1 วิ (q = ยกเลิก)")
        last_seq, last_shot = -1, 0.0
        while len(feats) < args.shots:
            seq, frame = reader.read()
            if frame is None or seq == last_seq:
                if (cv2.waitKey(10) & 0xFF) == ord("q"):
                    return
                continue
            last_seq = seq
            img = frame.copy()
            fr = vis.faces_raw(img)
            msg = f"{name}: {len(feats)}/{args.shots}"
            if len(fr) == 1 and time.time() - last_shot >= 1.0:
                feat, crop = vis.feature(img, fr[0])
                feats.append(feat)
                last_shot = time.time()
                imwrite_u(os.path.join(person_dir, f"{len(feats):02d}.jpg"), crop)
                log(f"ถ่ายแล้ว {len(feats)}/{args.shots}")
            elif len(fr) != 1:
                msg += "  (need exactly 1 face)"
            for r in fr:
                x, y, w, h = [int(v) for v in r[:4]]
                cv2.rectangle(img, (x, y), (x + w, y + h), (255, 120, 0), 2)
            draw(img, [], [], [msg.encode("ascii", "replace").decode()])
            cv2.imshow("METO enroll", img)
            if (cv2.waitKey(1) & 0xFF) == ord("q"):
                return
        cv2.destroyAllWindows()
    if not feats:
        log("ไม่ได้หน้าเลย — ไม่บันทึก")
        return
    names = [n for n in vis.db_names if n != name]       # ลงซ้ำชื่อเดิม = แทนของเก่า
    old = [f for n, f in zip(vis.db_names, vis.db_feats) if n != name]
    save_db(names + [name] * len(feats), old + feats)
    log(f"บันทึก '{name}' {len(feats)} รูป → {FACES_DB}")


def cmd_test(args, cfg):
    """ทดสอบออฟไลน์: ภาพตัวอย่างของ ultralytics + ภาพสังเคราะห์ + ลงทะเบียน/จำหน้า + หุ่นปลอม"""
    import ultralytics
    out_dir = os.path.join(HERE, "test_out")
    os.makedirs(out_dir, exist_ok=True)
    assets = os.path.join(os.path.dirname(ultralytics.__file__), "assets")
    imgs = {fn: imread_u(os.path.join(assets, fn)) for fn in ("bus.jpg", "zidane.jpg")}
    for fn in os.listdir(os.path.join(HERE, "test_images")) if os.path.isdir(os.path.join(HERE, "test_images")) else []:
        im = imread_u(os.path.join(HERE, "test_images", fn))
        if im is not None:
            imgs[fn] = im

    # หุ่นปลอมบนเครื่อง: /state + /run (จดคำสั่งที่ได้รับ)
    got = []

    class Fake(BaseHTTPRequestHandler):
        def do_GET(self):
            p = urllib.parse.urlparse(self.path)
            if p.path == "/run":
                got.append(urllib.parse.parse_qs(p.query).get("cmd", [""])[0])
                body = b"OK"
            else:
                body = json.dumps({"yaw": 0.0, "faceSeen": 0}).encode()
            self.send_response(200)
            self.end_headers()
            self.wfile.write(body)

        def log_message(self, *a):
            pass
    srv = ThreadingHTTPServer(("127.0.0.1", 0), Fake)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    fake_url = f"http://127.0.0.1:{srv.server_port}"

    t = time.time()
    vis = Vision(cfg)
    log(f"โหลดโมเดล {time.time() - t:.1f} วิ")

    # ลงทะเบียนหน้าแรกของ zidane.jpg เป็น "testperson" (ใช้ db ชั่วคราว ไม่ทับของจริง)
    z = imgs["zidane.jpg"]
    fr = vis.faces_raw(z)
    real_names, real_feats = vis.db_names, vis.db_feats
    if fr:
        row = max(fr, key=lambda r: r[2] * r[3])
        feat, _ = vis.feature(z, row)
        vis.db_names, vis.db_feats = ["testperson"], feat[None, :]
        log(f"zidane.jpg: เจอ {len(fr)} หน้า · ลงทะเบียนหน้าใหญ่สุดเป็น testperson")

    # ภาพทดสอบการจำ: ย่อ + กลับซ้ายขวา + สว่างขึ้น (ไม่ใช่ภาพเดิมเป๊ะ)
    imgs["zidane_flip_small.jpg"] = cv2.convertScaleAbs(cv2.flip(cv2.resize(z, None, fx=0.6, fy=0.6), 1), alpha=1.15, beta=10)

    robot = Robot(fake_url, False, 0.2)
    brain = Brain(cfg, robot)
    time.sleep(0.4)
    for fn, img in imgs.items():
        objs = vis.objects(img)
        faces = vis.faces(img)
        rep = brain.step(img, objs, faces)
        brain.last_look = 0
        labels = {}
        for o in objs:
            labels[o["label"]] = labels.get(o["label"], 0) + 1
        log(f"{fn}: {labels} · หน้า {[(f['name'], f['score']) for f in faces]}"
            + (f" · รายงาน {[(o['label'], o['x'], o['bearing_deg']) for o in rep['objects']]}" if rep["objects"] else ""))
        imwrite_u(os.path.join(out_dir, "out_" + os.path.splitext(fn)[0] + ".jpg"), draw(img.copy(), objs, faces, [fn]))
    time.sleep(0.6)
    log("หุ่นปลอมได้รับ /run:", got)

    # วัด FPS (ภาพขนาดเท่ากล้องจริง)
    for size, label, isz in (((240, 240), "240x240 (both)", 320), ((640, 480), "640x480 (stream VGA)", 320),
                             ((640, 480), "640x480 imgsz640", 640)):
        frame = cv2.resize(imgs["bus.jpg"], size)
        vis.cfg["yolo_imgsz"] = isz
        vis.objects(frame)
        N = args.n
        t = time.time()
        for _ in range(N):
            vis.objects(frame)
        t_y = (time.time() - t) / N
        t = time.time()
        for _ in range(N):
            vis.faces(frame)
        t_f = (time.time() - t) / N
        log(f"FPS {label}: YOLO {1 / t_y:.1f} · หน้า(YuNet+SFace) {1 / t_f:.1f} · รวม {1 / (t_y + t_f):.1f}")
    vis.db_names, vis.db_feats = real_names, real_feats
    log("ภาพผลอยู่ที่", out_dir)


def main():
    ap = argparse.ArgumentParser(description="METO vision — คอมดูภาพจากกล้องหัวหุ่น")
    sub = ap.add_subparsers(dest="cmd", required=True)
    r = sub.add_parser("run")
    r.add_argument("--source", help="URL /stream, เลขเว็บแคม (0) หรือไฟล์วิดีโอ")
    r.add_argument("--robot", help="เช่น http://192.168.43.50")
    r.add_argument("--dry-run", action="store_true", help="ไม่ส่งคำสั่งไปหุ่น")
    e = sub.add_parser("enroll")
    e.add_argument("--name", required=True, help="ชื่อ (แนะนำภาษาอังกฤษ — หน้าต่างภาพแสดงไทยไม่ได้)")
    e.add_argument("--shots", type=int, default=5)
    e.add_argument("--source")
    e.add_argument("--folder", help="โฟลเดอร์รูปของคนนี้ (แทนการถ่ายสด)")
    t = sub.add_parser("test")
    t.add_argument("-n", type=int, default=20, help="จำนวนรอบวัด FPS")
    t.add_argument("--imgsz", type=int, help="ขนาดภาพเข้า YOLO ตอนทดสอบภาพ COCO (ของในภาพเล็ก ใช้ 640)")
    t.add_argument("--conf", type=float)
    args = ap.parse_args()
    cfg = load_cfg()
    if args.cmd == "test":
        cfg["yolo_imgsz"] = args.imgsz or cfg["yolo_imgsz"]
        cfg["yolo_conf"] = args.conf or cfg["yolo_conf"]
    {"run": cmd_run, "enroll": cmd_enroll, "test": cmd_test}[args.cmd](args, cfg)


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    main()
