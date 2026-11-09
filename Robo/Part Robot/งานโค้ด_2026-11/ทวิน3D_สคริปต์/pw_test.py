# ทดสอบหน้า twin3d ด้วยคีย์บอร์ดจริง (Playwright) + แคปภาพ
import asyncio, json, os, sys
from playwright.async_api import async_playwright
URL = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8899/static/twin3d/index.html"
OUT = r"C:/Users/Acer/AppData/Local/Temp/claude/G--My-Drive-METTO-Code-RoboBlock/e69ff40e-5853-49cd-b79a-5fb19b92285d/scratchpad/twin3d/shots"
os.makedirs(OUT, exist_ok=True)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
        pg = await b.new_page(viewport={"width": 1400, "height": 850})
        logs = []
        pg.on("console", lambda m: logs.append((m.type, m.text)))
        pg.on("pageerror", lambda e: logs.append(("pageerror", str(e))))
        await pg.goto(URL, timeout=300000)
        await pg.wait_for_function("window.__twinReady === true", timeout=120000)
        await pg.mouse.click(700, 600)          # โฟกัสฉาก
        R = {}
        snap = lambda: pg.evaluate("twin.ax.map(a=>+a.pos.toFixed(1))")
        async def hold(k, ms):
            await pg.keyboard.down(k); await pg.wait_for_timeout(ms); await pg.keyboard.up(k)
        async def settle(ms=900): await pg.wait_for_timeout(ms)
        toast = lambda: pg.evaluate("document.querySelector('#toast').textContent")
        # ทุกปุ่มแกน
        for k in ["q","z","e","c","f","v","g","b","ArrowLeft","ArrowRight","ArrowUp","ArrowDown"]:
            before = await snap(); await hold(k, 400); await settle(700); after = await snap()
            R["key_" + k] = [before, after]
            await hold("r", 50); await settle(2200)
        # เดิน
        d0 = await pg.evaluate("({...twin.drive})")
        await hold("w", 1000); await settle(600); R["W"] = await pg.evaluate("[twin.drive.x, twin.drive.y].map(v=>+v.toFixed(0))")
        await hold("s", 500); await settle(600); R["S"] = await pg.evaluate("[twin.drive.x, twin.drive.y].map(v=>+v.toFixed(0))")
        await hold("a", 400); await settle(600); R["A_heading"] = await pg.evaluate("+(twin.drive.h*57.3).toFixed(0)")
        await hold("d", 400); await settle(600); R["D_heading"] = await pg.evaluate("+(twin.drive.h*57.3).toFixed(0)")
        await pg.keyboard.down("w"); await pg.wait_for_timeout(500); await pg.keyboard.up("w"); await pg.keyboard.press(" "); await pg.wait_for_timeout(30)
        R["space_v"] = await pg.evaluate("twin.drive.v")
        await pg.keyboard.press("Home")
        for i in range(1, 10):
            await pg.keyboard.press(str(i)); R["emo%d" % i] = await pg.evaluate("twin.emo")
        # คีย์แป้นไทย: ใช้ code เดียวกัน (กด KeyQ ตอนแป้นไทย = ๆ) — จำลองด้วย dispatch key ภาษาไทย
        R["thai_layout_q"] = await pg.evaluate("""(async()=>{const b=twin.ax[0].pos; window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyQ',key:'ๆ'})); await new Promise(r=>setTimeout(r,400)); window.dispatchEvent(new KeyboardEvent('keyup',{code:'KeyQ',key:'ๆ'})); await new Promise(r=>setTimeout(r,600)); return [b, +twin.ax[0].pos.toFixed(1)];})()""")
        await hold("r", 50); await settle(2500)
        # interlock: หน้าตรง หนีบสุดแล้วยก → ต้องติด ~41
        await hold("g", 900); await hold("e", 1600); await settle(600)
        R["ilk_grip_then_lift"] = await snap(); R["ilk_toast"] = await toast()
        await hold("r", 50); await settle(2500)
        # ภาพ 1 ท่าปกติ
        await pg.keyboard.press("1"); await pg.evaluate("twin.setView('iso')"); await pg.wait_for_timeout(2600)
        await pg.screenshot(path=OUT + "/01_ท่าปกติ.png")
        # ภาพ 2 ยกแขนหนีบ (หัน 46 แล้วยก 48 หนีบ 28 สองแขน)
        await hold("ArrowLeft", 500); await settle(1000)
        await pg.keyboard.down("f"); await pg.keyboard.down("g"); await pg.wait_for_timeout(800); await pg.keyboard.up("f"); await pg.keyboard.up("g")
        await pg.keyboard.down("q"); await pg.keyboard.down("e"); await pg.wait_for_timeout(1300); await pg.keyboard.up("q"); await pg.keyboard.up("e")
        await settle(1200); await pg.keyboard.press("2"); R["pose_lift_grip"] = await snap()
        await pg.evaluate("twin.setView('iso')"); await pg.wait_for_timeout(2600)
        await pg.screenshot(path=OUT + "/02_ยกแขนหนีบ.png")
        # ทดสอบ: ลองหันกลับตรงตอนยกหนีบ → ต้องติด
        await hold("ArrowRight", 900); await settle(800); R["yaw_back_while_lifting"] = await snap(); R["yaw_back_toast"] = await toast()
        await hold("r", 50); await settle(3000)
        # ภาพ 3 หัวหันพยัก
        await hold("ArrowRight", 600); await settle(800); await hold("ArrowDown", 400); await settle(800)
        await pg.keyboard.press("8"); R["pose_head"] = await snap()
        await pg.click("button[data-view=front]"); await pg.wait_for_timeout(2600)
        await pg.screenshot(path=OUT + "/03_หัวหันพยัก.png")
        # ภาพ 4 มองข้างใน
        await hold("r", 50); await settle(2500)
        await pg.click("button[data-shell=ghost]"); await pg.click("button[data-view=side]"); await pg.keyboard.press("6"); await pg.wait_for_timeout(2600)
        await pg.screenshot(path=OUT + "/04_มองข้างใน.png")
        await pg.click("button[data-shell=hide]"); await pg.wait_for_timeout(300); await pg.click("button[data-view=top]"); await pg.wait_for_timeout(1500)
        await pg.screenshot(path=OUT + "/05_ซ่อนเปลือก_มุมบน.png")
        await pg.click("#show-dev"); await pg.wait_for_timeout(300); R["devices_hidden"] = await pg.evaluate("document.querySelector('#show-dev').checked")
        await pg.click("#show-dev"); await pg.click("button[data-shell=solid]")
        for k in ["t", "y", "u", "x", "x", "x", "h", "h"]: await pg.keyboard.press(k)
        # โหมดหุ่นจริง (ไม่มีหุ่น) → ต้องไม่พัง ต้องขึ้นสถานะติดต่อไม่ได้
        await pg.fill("#real-host", "http://127.0.0.1:9")   # พอร์ตที่ไม่มีใครฟัง แทน MDTrobot.local
        await pg.click("#real-on"); await pg.mouse.click(700, 600)
        await hold("e", 500); await pg.keyboard.press("2"); await pg.wait_for_timeout(2500)
        R["real_status"] = await pg.evaluate("document.querySelector('#real-text').textContent + ' | ' + document.querySelector('#real-last').textContent")
        await pg.click("#real-follow"); await pg.wait_for_timeout(2500)
        R["follow_status"] = await pg.evaluate("document.querySelector('#real-text').textContent")
        await pg.click("#real-follow"); await pg.click("#real-on")
        R["console"] = logs
        print(json.dumps(R, ensure_ascii=False, indent=1))
        await b.close()
asyncio.run(main())
