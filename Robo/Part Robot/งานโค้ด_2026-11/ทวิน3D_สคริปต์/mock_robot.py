# หุ่นปลอมไว้ทดสอบโหมดคุมหุ่นจริง: /run ตอบ 200 สลับ 409 BUSY (ทุกครั้งที่ 3) · /state ส่งค่าคงที่
import http.server, json, sys, time
from urllib.parse import urlparse, parse_qs
N = [0]; LOG = open(sys.argv[1], "w", encoding="utf-8")
STATE = dict(emo="H", yaw=30.0, tiltRel=4.0, lift1=20.0, lift2=-10.0, grip1=0, grip2=80, motDir="F", busy=0)
class H(http.server.BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def do_GET(self):
        u = urlparse(self.path)
        if u.path == "/run":
            N[0] += 1; cmd = parse_qs(u.query).get("cmd", [""])[0]
            code = 409 if (N[0] % 3 == 0 and cmd != "x;") else 200
            LOG.write("%.2f %d %s\n" % (time.time(), code, cmd)); LOG.flush()
            body = b"BUSY" if code == 409 else b"OK"
        elif u.path == "/state":
            code = 200; body = json.dumps(STATE).encode()
        else:
            code = 404; body = b"no"
        self.send_response(code); self.send_header("Access-Control-Allow-Origin", "*"); self.end_headers(); self.wfile.write(body)
http.server.ThreadingHTTPServer(("127.0.0.1", 8897), H).serve_forever()
