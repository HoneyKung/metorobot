import asyncio, json, sys
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
        pg = await b.new_page(viewport={"width": 1400, "height": 850})
        logs = []; pg.on("console", lambda m: logs.append((m.type, m.text))); pg.on("pageerror", lambda e: logs.append(("pageerror", str(e))))
        await pg.goto(sys.argv[1], timeout=300000); await pg.wait_for_function("window.__twinReady === true", timeout=300000)
        R = {"console_before_real": list(logs)}
        await pg.fill("#real-host", "http://127.0.0.1:8897")
        await pg.click("#real-on"); await pg.mouse.click(700, 650)
        for k, ms in [("e", 1200), ("ArrowLeft", 800), ("g", 600), ("w", 1500), ("a", 600), ("3", 50), ("r", 50)]:
            await pg.keyboard.down(k); await pg.wait_for_timeout(ms); await pg.keyboard.up(k); await pg.wait_for_timeout(400)
        await pg.keyboard.down("w"); await pg.wait_for_timeout(300); await pg.keyboard.press(" "); await pg.keyboard.up("w"); await pg.wait_for_timeout(800)
        R["last"] = await pg.evaluate("document.querySelector('#real-last').textContent")
        await pg.click("#real-follow"); await pg.wait_for_timeout(3000)
        R["follow"] = await pg.evaluate("({ax: twin.ax.map(a=>+a.pos.toFixed(1)), emo: twin.emo, v: +twin.drive.v.toFixed(0), status: document.querySelector('#real-text').textContent})")
        await pg.screenshot(path=sys.argv[2])
        R["console"] = logs
        print(json.dumps(R, ensure_ascii=False, indent=1)); await b.close()
asyncio.run(main())
