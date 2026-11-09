"""
RoboMDT shared extensions
แยกไว้ไฟล์เดียวเพื่อให้ blueprint (auth.py / dashboard.py) เรียกใช้ได้
โดยไม่ต้อง import server.py กลับ (จะกลายเป็น circular import)
"""

import os

from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

# ที่เก็บตัวนับ — บน production ที่รันหลาย worker ควรตั้ง RATELIMIT_STORAGE_URI
# เป็น redis:// เพื่อให้ทุก worker นับร่วมกัน (memory:// นับแยกกันคนละ worker)
_STORAGE_URI = os.environ.get('RATELIMIT_STORAGE_URI', 'memory://')

limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=_STORAGE_URI,
    strategy='fixed-window',
)
