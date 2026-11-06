import asyncio, sys
from playwright.async_api import async_playwright
import os
# Use Google Chrome if installed, otherwise Playwright's own Chromium.
CHROME = {'executable_path': '/usr/bin/google-chrome'} if os.path.exists('/usr/bin/google-chrome') else {}
OUT = sys.argv[1]
async def swipe(page, path):
    boxes = await page.evaluate("""() => Array.from(document.querySelectorAll('.screen:not(.leaving) .tile')).map(t => { const r = t.getBoundingClientRect(); return [r.x + r.width/2, r.y + r.height/2]; })""")
    x, y = boxes[path[0]]
    await page.mouse.move(x, y); await page.mouse.down()
    for i in path[1:]:
        tx, ty = boxes[i]
        for s in range(1, 6): await page.mouse.move(x + (tx - x) * s / 5, y + (ty - y) * s / 5)
        x, y = tx, ty
    await page.mouse.up(); await page.wait_for_timeout(250)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(**CHROME)
        ctx = await b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2)
        pg = await ctx.new_page()
        pg.on('pageerror', lambda e: print('PAGEERROR', e))
        # Seed an older-format save to check the move to shared scores
        await pg.goto('http://localhost:8765/')
        await pg.evaluate("""() => localStorage.setItem('wordmix.v1', JSON.stringify({profile:{name:'Mum',avatar:'fox'}, deviceId:'devA', boards:{'classic:4':[{name:'Mum',avatar:'fox',score:9,words:6,minLen:3,at:1700000000000},{name:'Sami',avatar:'panda',score:4,words:3,minLen:3,at:1700000001000}]}}))""")
        await pg.reload(); await pg.wait_for_selector('[data-go="solo"]')
        print('migrated shared', await pg.evaluate("() => Object.keys(WordMix.state().shared).length"), 'words', await pg.evaluate("() => document.body.innerText.length>0"))
        for t in ['lun','lis','tit','pud','splice','colour','ewe','travelled']:
            pass
        await pg.click('[data-go="solo"]'); await pg.wait_for_timeout(500)
        await pg.click('[data-mode="classic"]'); await pg.click('[data-start]')
        await pg.wait_for_timeout(5400)
        ws = await pg.evaluate("""() => { const cells = Array.from(document.querySelectorAll('.screen:not(.leaving) .tile')).map(t => t.textContent.toLowerCase()); return Array.from(WordMix.solve(cells, 4, 3).entries()).sort((a,b)=>b[0].length-a[0].length).slice(0,9); }""")
        print('words', [w[0] for w in ws])
        for w in ws: await swipe(pg, w[1])
        await pg.evaluate("() => { const real = Date.now; Date.now = () => real() + 400000; }")
        await pg.wait_for_selector('[data-stream]', timeout=20000)
        await pg.wait_for_timeout(5000); await pg.screenshot(path=OUT + '/solo_01_mid.png')
        await pg.click('[data-speed]')
        await pg.wait_for_selector('[data-actions]:not([hidden])', timeout=60000)
        await pg.wait_for_timeout(1200); await pg.screenshot(path=OUT + '/solo_02_final.png', full_page=False)
        print('title', await pg.inner_text('[data-title]'), '| total', await pg.inner_text('[data-total]'))
        print('stats', (await pg.inner_text('.solo-stats')).replace('\n', ' | '))
        await pg.evaluate("() => document.querySelector('.scroll').scrollTo(0, 99999)"); await pg.wait_for_timeout(300)
        await pg.screenshot(path=OUT + '/solo_03_bottom.png')
        # Play again then skip
        await pg.click('[data-again]'); await pg.wait_for_timeout(5400)
        ws = await pg.evaluate("""() => { const cells = Array.from(document.querySelectorAll('.screen:not(.leaving) .tile')).map(t => t.textContent.toLowerCase()); return Array.from(WordMix.solve(cells, 4, 3).entries()).slice(0,2); }""")
        for w in ws: await swipe(pg, w[1])
        await pg.evaluate("() => { const real = Date.now; Date.now = () => real() + 800000; }")
        await pg.wait_for_selector('[data-skip]', timeout=20000); await pg.wait_for_timeout(800)
        await pg.click('[data-skip]'); await pg.wait_for_timeout(600)
        print('after skip title', await pg.inner_text('[data-title]'), '| stats', (await pg.inner_text('.solo-stats')).replace('\n', ' | '))
        await pg.screenshot(path=OUT + '/solo_04_skip.png')
        await pg.click('[data-boards]'); await pg.wait_for_timeout(700)
        await pg.screenshot(path=OUT + '/solo_05_lb_mine.png')
        await pg.click('[data-scope="all"]'); await pg.wait_for_timeout(700)
        await pg.screenshot(path=OUT + '/solo_06_lb_all.png')
        print('everyone rows', await pg.evaluate("() => document.querySelectorAll('.lb-row').length"))
        await b.close()
asyncio.run(main())
