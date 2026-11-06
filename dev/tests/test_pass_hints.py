import asyncio, sys
from playwright.async_api import async_playwright
import os
# Pass-and-play with a child second: the child's Hint button is always there and refills,
# hint sizes follow the player who went before, and hinted words don't score double.
CHROME = {'executable_path': '/usr/bin/google-chrome'} if os.path.exists('/usr/bin/google-chrome') else {}
OUT = sys.argv[1]

async def swipe(page, path):
    boxes = await page.evaluate("""() => Array.from(document.querySelectorAll('.screen:not(.leaving) .tile')).map(t => { const r = t.getBoundingClientRect(); return [r.x + r.width/2, r.y + r.height/2]; })""")
    x, y = boxes[path[0]]
    await page.mouse.move(x, y); await page.mouse.down()
    for i in path[1:]:
        tx, ty = boxes[i]
        for s in range(1, 6):
            await page.mouse.move(x + (tx - x) * s / 5, y + (ty - y) * s / 5)
        x, y = tx, ty
    await page.mouse.up()
    await page.wait_for_timeout(300)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(**CHROME)
        pg = await (await b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2)).new_page()
        pg.on('pageerror', lambda e: print('PAGEERROR', e))
        await pg.goto('http://localhost:8765/')
        await pg.evaluate("() => localStorage.setItem('wordmix.v1', JSON.stringify({profile:{name:'Mum',avatar:'fox'}, deviceId:'devA', saved:[{name:'Zara',avatar:'cat'}]}))")
        await pg.reload(); await pg.wait_for_selector('[data-go="party"]'); await pg.wait_for_timeout(500)
        await pg.click('[data-go="party"]'); await pg.wait_for_timeout(500)
        await pg.click('[data-pass]'); await pg.wait_for_timeout(500)
        await pg.click('[data-add]'); await pg.wait_for_timeout(400); await pg.click('[data-pick="0"]'); await pg.wait_for_timeout(300)
        await pg.click('[data-child="1"]'); await pg.wait_for_timeout(300)
        await pg.click('[data-start]'); await pg.wait_for_timeout(600)
        # Mum's turn: find long words.
        await pg.click('[data-ready]'); await pg.wait_for_timeout(6500)
        print('adult hint button', await pg.evaluate("() => !!document.querySelector('.screen:not(.leaving) .hint-btn.kid')"))
        w = await pg.evaluate("""() => { const cells = Array.from(document.querySelectorAll('.screen:not(.leaving) .tile')).map(t => t.textContent.toLowerCase()); return Array.from(WordMix.solve(cells, 4, 3).entries()).sort((a,b)=>b[0].length-a[0].length).slice(0,3); }""")
        for x in w:
            await swipe(pg, x[1])
        print('mum found', [x[0] for x in w])
        await pg.evaluate("() => { const real = Date.now; Date.now = () => real() + 400000; }")
        await pg.wait_for_selector('[data-ready]', timeout=10000); await pg.wait_for_timeout(600)
        # Zara's turn.
        await pg.click('[data-ready]'); await pg.wait_for_timeout(6500)
        print('child hint button', await pg.evaluate("() => !!document.querySelector('.screen:not(.leaving) .hint-btn.kid')"))
        lens = []
        hinted = []
        for k in range(6):
            await pg.click('.hint-btn.kid'); await pg.wait_for_timeout(200)
            path = await pg.evaluate("() => Array.from(document.querySelectorAll('.screen:not(.leaving) .tile')).map((t, i) => t.classList.contains('hinted') ? i : -1).filter(i => i >= 0)")
            cool = await pg.evaluate("() => document.querySelector('.hint-btn.kid').classList.contains('cooling')")
            lens.append(len(path))
            if k == 0:
                await pg.screenshot(path=OUT + '/passhint_01_cooling.png')
            # Pressing again while cooling does nothing.
            await pg.click('.hint-btn.kid'); await pg.wait_for_timeout(100)
            # Trace the hinted word (tile order: rebuild from the board's word list).
            cands = await pg.evaluate("""(cells) => { const tiles = Array.from(document.querySelectorAll('.screen:not(.leaving) .tile')); const letters = tiles.map(t => t.textContent.toLowerCase()); const set = new Set(cells); const out = []; for (const [w, p] of WordMix.solve(letters, 4, 3)) { if (p.length === set.size && p.every(i => set.has(i))) out.push(w); } return out; }""", path)
            print('hint', k, 'tiles match', cands)
            word_path = await pg.evaluate("""(cells) => { const tiles = Array.from(document.querySelectorAll('.screen:not(.leaving) .tile')); const letters = tiles.map(t => t.textContent.toLowerCase()); const set = new Set(cells); for (const [w, p] of WordMix.solve(letters, 4, 3)) { if (p.length === set.size && p.every(i => set.has(i))) return p; } return null; }""", path)
            if word_path:
                await swipe(pg, word_path)
                hinted.append(word_path)
            # Wait out the refill (a hinted word doesn't reset it).
            await pg.wait_for_timeout(5200)
        print('child hint word lengths', lens, '| cooling after hint', cool)
        # A word of her own resets the button straight away.
        await pg.click('.hint-btn.kid'); await pg.wait_for_timeout(200)
        before = await pg.evaluate("() => document.querySelector('.hint-btn.kid').classList.contains('cooling')")
        own = await pg.evaluate("""() => { const cells = Array.from(document.querySelectorAll('.screen:not(.leaving) .tile')).map(t => t.textContent.toLowerCase()); const found = new Set(); return Array.from(WordMix.solve(cells, 4, 3).entries()).filter(e => e[0].length === 3).map(e => e[1]); }""")
        for pth in own[:8]:
            await swipe(pg, pth)
        await pg.wait_for_timeout(300)
        after = await pg.evaluate("() => document.querySelector('.hint-btn.kid').classList.contains('cooling')")
        print('cooling before own word', before, '| after own word', after)
        await pg.evaluate("() => { const real = Date.now; Date.now = () => real() + 900000; }")
        await pg.wait_for_selector('.bstage', timeout=15000)
        await pg.click('[data-skip]'); await pg.wait_for_timeout(800)
        print('scores', await pg.evaluate("() => { const n = Array.from(document.querySelectorAll('.bname b')).map(b => b.textContent); return Array.from(document.querySelectorAll('[data-score]')).map((s, i) => n[i] + '=' + s.textContent).join(', '); }"))
        print('stream', await pg.evaluate("() => Array.from(document.querySelectorAll('.sw')).map(e => e.querySelector('b').textContent + ':' + e.querySelector('.who small').textContent + ':' + e.querySelector('.pts').textContent).join(' | ')"))
        print('labels', await pg.evaluate("() => Array.from(document.querySelectorAll('.lbadge')).map(b => b.className)"))
        await pg.screenshot(path=OUT + '/passhint_02_results.png')
        await b.close()
asyncio.run(main())
