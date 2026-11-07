import asyncio, sys, os
from playwright.async_api import async_playwright
# Screenshots of the v27 look: both colour schemes, phone and TV sizes, countdown badges,
# and the results show (lit word path, words-counted meter, reactions, podium, highlights).
# Usage: python3 dev/tests/shots_v27.py dev/out [warm|party] [light|dark] [phone|tv]
CHROME = {'executable_path': '/usr/bin/google-chrome'} if os.path.exists('/usr/bin/google-chrome') else {}
OUT = sys.argv[1]
SCHEME = sys.argv[2] if len(sys.argv) > 2 else 'warm'
THEME = 'dark' if len(sys.argv) > 3 and sys.argv[3] == 'dark' else 'original'
SIZE = sys.argv[4] if len(sys.argv) > 4 else 'phone'
VIEW = {'width': 1280, 'height': 720} if SIZE == 'tv' else {'width': 390, 'height': 844}
TAG = SCHEME + '_' + ('dark' if THEME == 'dark' else 'light') + '_' + SIZE

async def swipe(page, path):
    boxes = await page.evaluate("""() => Array.from(document.querySelectorAll('.screen:not(.leaving) .tile')).map(t => { const r = t.getBoundingClientRect(); return [r.x + r.width/2, r.y + r.height/2]; })""")
    x, y = boxes[path[0]]
    await page.mouse.move(x, y); await page.mouse.down()
    for i in path[1:]:
        tx, ty = boxes[i]
        for s in range(1, 5):
            await page.mouse.move(x + (tx - x) * s / 4, y + (ty - y) * s / 4)
        x, y = tx, ty
    await page.mouse.up()
    await page.wait_for_timeout(150)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(**CHROME)
        pg = await (await b.new_context(viewport=VIEW, device_scale_factor=1 if SIZE == 'tv' else 2)).new_page()
        pg.on('pageerror', lambda e: print('PAGEERROR', e))
        await pg.goto('http://localhost:8765/')
        await pg.evaluate("""([sc, th]) => localStorage.setItem('wordmix.v1', JSON.stringify({profile:{name:'Mum',avatar:'fox'}, deviceId:'devA',
          saved:[{name:'Zara',avatar:'owl'},{name:'Sami',avatar:'panda'}], settings:{scheme: sc, theme: th, themeChosen: true},
          boards:{'party:4':[{name:'Sami',avatar:'panda',score:3,words:2,at:1,minLen:3,n:4}]}}))""", [SCHEME, THEME])
        await pg.reload(); await pg.wait_for_selector('[data-go="party"]'); await pg.wait_for_timeout(1200)
        await pg.screenshot(path=f'{OUT}/v27_{TAG}_1_home.png')
        await pg.click('[data-go="party"]'); await pg.wait_for_timeout(500)
        await pg.click('[data-pass]'); await pg.wait_for_timeout(500)
        for k in range(2):
            await pg.click('[data-add]'); await pg.wait_for_timeout(400); await pg.click('[data-pick="0"]'); await pg.wait_for_timeout(300)
        await pg.click('[data-start]'); await pg.wait_for_timeout(600)
        await play_round(pg, [(0, 9), (3, 9), (5, 12)], True)
        await pg.wait_for_selector('.bstage', timeout=15000)
        await pg.wait_for_timeout(9000)
        await pg.screenshot(path=f'{OUT}/v27_{TAG}_4_reveal.png')
        await pg.click('[data-speed]')
        await pg.wait_for_selector('[data-actions]:not([hidden])', timeout=60000)
        await pg.wait_for_timeout(1500)
        await pg.screenshot(path=f'{OUT}/v27_{TAG}_5_final.png')
        print(TAG, 'pb chips', await pg.evaluate("() => Array.from(document.querySelectorAll('[data-pb]:not([hidden])')).length"),
              '| places', await pg.evaluate("() => Array.from(document.querySelectorAll('.bbar')).map(e => e.getAttribute('data-rank')).join(',')"),
              '| counted', await pg.evaluate("() => (document.querySelector('[data-counted]')||{}).textContent"),
              '| labels', await pg.evaluate("() => Array.from(document.querySelectorAll('.lbadge')).map(b => b.className + '@' + b.style.left + '/' + b.style.bottom).join(' ')"))
        # Round 2: last round's labels start on their bars and follow the lead live.
        await pg.click('[data-act="0"]'); await pg.wait_for_timeout(800)
        await play_round(pg, [(9, 20), (0, 4), (6, 12)], False)
        await pg.wait_for_selector('.bstage', timeout=15000)
        await pg.wait_for_timeout(2000)
        print(TAG, 'round 2 start labels', await pg.evaluate("() => Array.from(document.querySelectorAll('.lbadge')).map(b => b.className + '@' + b.style.left + '/' + b.style.bottom).join(' ')"))
        await pg.wait_for_timeout(9000)
        await pg.screenshot(path=f'{OUT}/v27_{TAG}_6_round2.png')
        print(TAG, 'round 2 mid labels', await pg.evaluate("() => Array.from(document.querySelectorAll('.lbadge')).map(b => b.className + '@' + b.style.left + '/' + b.style.bottom).join(' ')"))
        await pg.click('[data-skip]'); await pg.wait_for_timeout(1500)
        await pg.screenshot(path=f'{OUT}/v27_{TAG}_7_round2_final.png')
        await b.close()

async def play_round(pg, picks, shots):
        for t, (a, z) in enumerate(picks):
            await pg.click('[data-ready]')
            await pg.wait_for_timeout(3300)
            if t == 0 and shots:
                await pg.screenshot(path=f'{OUT}/v27_{TAG}_2_countdown.png')
            await pg.wait_for_timeout(2600)
            w = await pg.evaluate("""() => { const cells = Array.from(document.querySelectorAll('.screen:not(.leaving) .tile')).map(t => t.textContent.toLowerCase()); return Array.from(WordMix.solve(cells, 4, 3).entries()).sort((a,b)=>b[0].length-a[0].length || (a[0]<b[0]?-1:1)); }""")
            for x in w[a:z]:
                await swipe(pg, x[1])
            if t == 0 and shots:
                await pg.screenshot(path=f'{OUT}/v27_{TAG}_3_play.png')
            await pg.evaluate("() => { const real = Date.now; Date.now = () => real() + 400000; }")
            if t < 2:
                await pg.wait_for_selector('[data-ready]', timeout=10000); await pg.wait_for_timeout(600)
asyncio.run(main())
