import asyncio, sys
from playwright.async_api import async_playwright
import os
# Use Google Chrome if installed, otherwise Playwright's own Chromium.
CHROME = {'executable_path': '/usr/bin/google-chrome'} if os.path.exists('/usr/bin/google-chrome') else {}
OUT = sys.argv[1]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(**CHROME)
        ctx = await b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=1)
        pg = await ctx.new_page()
        pg.on('pageerror', lambda e: print('PAGEERROR', e))
        await pg.goto('http://localhost:8765/')
        await pg.evaluate("""() => localStorage.setItem('wordmix.v1', JSON.stringify({profile:{name:'Mum',avatar:'fox'}, deviceId:'devA', boards:{}}))""")
        await pg.reload(); await pg.wait_for_selector('[data-go="solo"]')
        print('version', await pg.evaluate("() => document.body.innerText.includes('25')"))
        await pg.click('[data-go="solo"]'); await pg.wait_for_timeout(500)
        await pg.click('[data-mode="classic"]'); await pg.click('[data-start]')
        t = 0
        letters = []
        for at, name in [(600,'a_shake'),(1900,'b_dropping'),(2700,'c_roll3'),(3600,'d_roll2'),(4380,'e_go'),(5200,'f_settled')]:
            await pg.wait_for_timeout(at - t); t = at
            await pg.screenshot(path=f'{OUT}/intro_{name}.png')
            letters.append(await pg.evaluate("() => Array.from(document.querySelectorAll('.screen:not(.leaving) .tile')).map(x => x.textContent).join('')"))
        print('letters over time', letters)
        cells = await pg.evaluate("() => WordMix.state && document.querySelectorAll('.cd-block').length")
        print('blockers left', cells)
        # swipe works after GO
        ws = await pg.evaluate("""() => { const cells = Array.from(document.querySelectorAll('.screen:not(.leaving) .tile')).map(t => t.textContent.toLowerCase()); return Array.from(WordMix.solve(cells, 4, 3).entries()).slice(0,1); }""")
        boxes = await pg.evaluate("""() => Array.from(document.querySelectorAll('.screen:not(.leaving) .tile')).map(t => { const r = t.getBoundingClientRect(); return [r.x + r.width/2, r.y + r.height/2]; })""")
        path = ws[0][1]
        await pg.mouse.move(*boxes[path[0]]); await pg.mouse.down()
        for i in path[1:]:
            await pg.mouse.move(*boxes[i], steps=5)
        await pg.mouse.up(); await pg.wait_for_timeout(400)
        print('word', ws[0][0], 'count', await pg.inner_text('[data-count] b'))
        # pinch block present
        print('viewport', await pg.evaluate("() => document.querySelector('meta[name=viewport]').content"))
        await b.close()
asyncio.run(main())
