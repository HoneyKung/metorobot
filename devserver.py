# -*- coding: utf-8 -*-
"""เสิร์ฟไฟล์สแตติกไว้ดูหน้าเว็บตอนพัฒนา (ไม่ใช่ตัวรันจริง — ตัวจริงคือ server.py)

รับพอร์ตจาก environment variable PORT ไม่ฝังเลขไว้ในคำสั่ง
เพราะเครื่องที่รันอาจมีอะไรถือพอร์ตนั้นอยู่แล้ว แล้วจะสตาร์ตไม่ขึ้น
(เคยชนกับ `python -m http.server 8899` ที่ค้างอยู่จากรอบก่อนมาแล้ว)
`python -m http.server` อ่าน PORT เองไม่ได้ ต้องมีตัวห่อบาง ๆ แบบนี้

ใส่ Cache-Control: no-store ให้ด้วย — ไฟล์ระหว่างพัฒนาแก้ถี่มาก
ถ้าปล่อยให้เบราว์เซอร์แคช จะแก้โค้ดแล้วไม่เห็นผล นึกว่าโค้ดผิดทั้งที่แคชค้าง
"""
import http.server
import os
import socketserver

PORT = int(os.environ.get('PORT', '8899'))


class DevHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        super().end_headers()

    def log_message(self, fmt, *args):
        # ปิด log ราย request ไม่งั้นคอนโซลท่วมจนหา error จริงไม่เจอ
        pass


class DevServer(socketserver.ThreadingTCPServer):
    # กันอาการ "Address already in use" ค้างหลังปิดเซิร์ฟเวอร์รอบก่อน
    allow_reuse_address = True
    daemon_threads = True


if __name__ == '__main__':
    with DevServer(('', PORT), DevHandler) as httpd:
        print('serving static files on http://localhost:%d' % PORT, flush=True)
        httpd.serve_forever()
