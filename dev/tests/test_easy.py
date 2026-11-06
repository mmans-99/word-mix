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
        pg = await (await b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2)).new_page()
        pg.on('pageerror', lambda e: print('PAGEERROR', e))
        await pg.goto('http://localhost:8765/')
        await pg.evaluate("() => localStorage.setItem('wordmix.v1', JSON.stringify({profile:{name:'Mum',avatar:'fox'}, deviceId:'devA'}))")
        await pg.reload(); await pg.wait_for_selector('[data-go="solo"]'); await pg.wait_for_timeout(800)
        # Board quality: easy vs normal
        print(await pg.evaluate("""() => { const r = {}; for (const e of [false, true]) { let words = 0, easyW = 0, rare = 0; for (let i = 0; i < 20; i++) { const bd = WordMix.makeBoard(4, 3, null, e); words += bd.words.size; bd.words.forEach((p, w) => { if (WordMix.isEasyWord(w)) easyW++; }); rare += bd.cells.filter(c => 'jqxz'.includes(c[0])).length; } r[e ? 'easy' : 'normal'] = { avgWords: words / 20, avgEveryday: easyW / 20, rareLetters: rare }; } return JSON.stringify(r); }"""))
        # Child double points: shared + unique words
        print('scores', await pg.evaluate("""() => { const R = WordMix.computeRound([{name:'Mum', words:['cat','dogs','table']}, {name:'Kid', child:true, words:['cat','sun']}], 'length'); return R.rows.map(r => r.p.name + ' ' + r.score).join(', '); }"""))
        await pg.click('[data-go="solo"]'); await pg.wait_for_timeout(500)
        await pg.click('[data-easy="1"]'); await pg.wait_for_timeout(200)
        await pg.screenshot(path=OUT + '/easy_01_setup.png')
        await pg.click('[data-mode="classic"]'); await pg.click('[data-start]')
        await pg.wait_for_timeout(5400)
        cells = await pg.evaluate("() => Array.from(document.querySelectorAll('.screen:not(.leaving) .tile')).map(t => t.textContent)")
        print('easy board', ''.join(cells))
        ws = await pg.evaluate("""() => { const cells = Array.from(document.querySelectorAll('.screen:not(.leaving) .tile')).map(t => t.textContent.toLowerCase()); return Array.from(WordMix.solve(cells, 4, 3).entries()).sort((a,b)=>b[0].length-a[0].length).slice(0,5); }""")
        for w in ws: await swipe(pg, w[1])
        await pg.evaluate("() => { const real = Date.now; Date.now = () => real() + 400000; }")
        await pg.wait_for_selector('[data-skip]', timeout=20000); await pg.wait_for_timeout(400); await pg.click('[data-skip]'); await pg.wait_for_timeout(500)
        print('eyebrow', await pg.inner_text('.show-band .eyebrow'), '| keys', await pg.evaluate("() => Object.keys(WordMix.state().boards).join(',')"))
        print('gems everyday?', await pg.evaluate("() => Array.from(document.querySelectorAll('.gem b, .gem-long b')).map(e => e.textContent + ':' + WordMix.isEasyWord(e.textContent.toLowerCase())).join(' ')"))
        await pg.click('[data-boards]'); await pg.wait_for_timeout(500)
        await pg.screenshot(path=OUT + '/easy_02_lb.png')
        print('lb easy rows', await pg.evaluate("() => document.querySelectorAll('.lb-row').length"))
        await pg.click('[data-level="0"]'); await pg.wait_for_timeout(300)
        print('lb normal rows', await pg.evaluate("() => document.querySelectorAll('.lb-row').length"))
        # Child profile setting + hints
        await pg.click('[data-back]'); await pg.wait_for_timeout(500)
        await pg.evaluate("() => { const S = WordMix.state(); S.profile.child = true; }")
        await pg.click('[data-go="solo"]'); await pg.wait_for_timeout(500)
        await pg.click('[data-easy="0"]'); await pg.click('[data-start]'); await pg.wait_for_timeout(5400)
        lens = []
        for i in range(6):
            await pg.evaluate("() => { const real = Date.now; const s = Date.now(); }")
            await pg.wait_for_selector('[data-hint]', timeout=15000)
            await pg.click('[data-hint]'); await pg.wait_for_timeout(200)
            lens.append(await pg.evaluate("() => document.querySelectorAll('.screen:not(.leaving) .tile.hinted').length"))
            await pg.wait_for_timeout(3200)
        print('child hint lengths', lens)
        await b.close()
asyncio.run(main())
