import asyncio, sys
from playwright.async_api import async_playwright
import os
# Use Google Chrome if installed, otherwise Playwright's own Chromium.
CHROME = {'executable_path': '/usr/bin/google-chrome'} if os.path.exists('/usr/bin/google-chrome') else {}

URL = 'http://localhost:8765/#codes'
OUT = sys.argv[1]
SCREEN_ONLY = len(sys.argv) > 2 and sys.argv[2] == 'screen'
ARGS = ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--disable-features=WebRtcHideLocalIpsWithMdns']
P = 'big_' if SCREEN_ONLY else 'show_'

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

async def solve(page, k=6):
    return await page.evaluate("""(k) => { const cells = Array.from(document.querySelectorAll('.screen:not(.leaving) .tile')).map(t => t.textContent.toLowerCase()); const n = Math.round(Math.sqrt(cells.length)); return Array.from(WordMix.solve(cells, n, 3).entries()).sort((a,b)=>b[0].length-a[0].length).slice(0,k); }""", k)

async def profile(page, name, av):
    await page.goto(URL)
    await page.wait_for_selector('#pname', timeout=15000)
    await page.fill('#pname', name); await page.click(f'[data-av="{av}"]'); await page.click('[data-save]')
    await page.wait_for_selector('[data-go="party"]'); await page.wait_for_timeout(400)
    await page.click('[data-go="party"]'); await page.wait_for_timeout(400); await page.click('[data-near]'); await page.wait_for_timeout(500)

async def join(host, guest):
    await host.wait_for_selector('[data-qr]', timeout=15000); await host.wait_for_timeout(600)
    await host.click('[data-text]'); hcode = await host.input_value('[data-mine]')
    await guest.click('[data-join]'); await guest.wait_for_timeout(400)
    await guest.click('[data-text]'); await guest.fill('[data-paste]', hcode); await guest.click('[data-use]')
    await guest.wait_for_selector('[data-qr]', timeout=15000); await guest.wait_for_timeout(500)
    await guest.click('[data-text]'); gcode = await guest.input_value('[data-mine]'); await guest.click('[data-close]')
    await host.fill('[data-paste]', gcode); await host.click('[data-use]')

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(**CHROME, args=ARGS)
        hctx = await b.new_context(viewport={'width': 1180, 'height': 820} if SCREEN_ONLY else {'width': 390, 'height': 844}, device_scale_factor=1 if SCREEN_ONLY else 2, permissions=['camera'])
        g1 = await b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, permissions=['camera'])
        g2 = await b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, permissions=['camera'])
        host = await hctx.new_page(); a = await g1.new_page(); c = await g2.new_page()
        for nm, pg in (('host', host), ('a', a), ('c', c)):
            pg.on('pageerror', lambda e, n=nm: print('PAGEERROR', n, e))
            pg.on('console', lambda m, n=nm: print('CONSOLE', n, m.text) if m.type in ('error','warning') else None)
        await profile(host, 'Mum', 'fox'); await profile(a, 'Sami', 'panda'); await profile(c, 'Aisha', 'cat')
        await a.evaluate("() => { const S = WordMix.state(); S.shared['samiSolo1'] = {id:'samiSolo1', b:'classic:4', key:'d:x', name:'Sami', avatar:'panda', score:77, words:20, minLen:3, at:Date.now()}; }")
        await host.click('[data-host]'); await host.wait_for_timeout(500)
        if SCREEN_ONLY:
            await host.click('[data-screen="1"]')
        await host.click('[data-ptime="60"]')
        await host.click('[data-start]')
        await host.wait_for_timeout(1500)
        await host.screenshot(path=OUT + '/' + P + '01_lobby_cam.png')
        await join(host, a)
        try:
          await host.wait_for_function("() => document.querySelectorAll('.screen:not(.leaving) .prow').length >= " + ('1' if SCREEN_ONLY else '2'), timeout=20000)
        except Exception:
          await host.screenshot(path=OUT + '/dbg_h.png'); await a.screenshot(path=OUT + '/dbg_a.png')
          print('HOST:', (await host.inner_text('body'))[:300].replace('\n',' | ')); print('A:', (await a.inner_text('body'))[:300].replace('\n',' | '))
          raise
        await host.wait_for_function("() => document.querySelectorAll('.screen:not(.leaving) .prow').length >= " + ('1' if SCREEN_ONLY else '2'), timeout=20000)
        await host.wait_for_timeout(1200)
        await join(host, c)
        await host.wait_for_function("() => document.querySelectorAll('.screen:not(.leaving) .prow').length >= " + ('2' if SCREEN_ONLY else '3'), timeout=20000)
        await host.wait_for_timeout(800)
        await host.click('[data-start]')
        await host.wait_for_timeout(3900)
        if SCREEN_ONLY:
            await host.screenshot(path=OUT + '/' + P + '02_spectate.png')
        w = await solve(a)
        print('words', [x[0] for x in w])
        # shared word, plus unique ones
        await swipe(a, w[0][1]); await swipe(c, w[0][1])
        await swipe(a, w[1][1]); await swipe(a, w[2][1]); await swipe(c, w[3][1])
        if not SCREEN_ONLY:
            await swipe(host, w[4][1])
        await host.wait_for_timeout(600)
        if SCREEN_ONLY:
            await host.screenshot(path=OUT + '/' + P + '03_spectate_counts.png')
            print('live counts', await host.evaluate("() => Array.from(document.querySelectorAll('[data-cnt]')).map(e => e.textContent)"))
        for pg in (host, a, c):
            await pg.evaluate("() => { const real = Date.now; Date.now = () => real() + 400000; }")
        await host.wait_for_selector('.lbs-row', timeout=20000)
        await a.wait_for_selector('.ready-btn', timeout=20000)
        await host.wait_for_timeout(2200)
        await host.screenshot(path=OUT + '/' + P + '04_show_mid.png')
        await a.wait_for_timeout(2000); await a.screenshot(path=OUT + '/' + P + '05_phone_summary.png')
        await a.click('.ready-btn', force=True); await a.wait_for_timeout(300)
        await host.wait_for_timeout(2400)
        await a.click('[data-speed]', force=True)
        print('guest speed button:', await a.inner_text('[data-speed]'))
        await host.screenshot(path=OUT + '/' + P + '06_show_gems.png')
        await host.wait_for_selector('.winner-stage', timeout=45000)
        await host.wait_for_timeout(900)
        await host.screenshot(path=OUT + '/' + P + '07_winner.png')
        await host.wait_for_selector('[data-actions]:not([hidden])', timeout=45000)
        print('loser chips', await host.evaluate("() => Array.from(document.querySelectorAll('.loser-chip')).filter(e => !e.hidden).length"))
        await host.wait_for_timeout(1200)
        await host.screenshot(path=OUT + '/' + P + '08_final.png')
        print('ready chips visible', await host.evaluate("() => Array.from(document.querySelectorAll('.ready-chip')).filter(e => !e.hidden).length"))
        print('lb', await host.evaluate("() => Array.from(document.querySelectorAll('.lbs-row')).sort((x,y)=>x.getBoundingClientRect().top-y.getBoundingClientRect().top).map(r => r.innerText.replace(/\\n/g,' | '))"))
        print('phone summary', (await a.inner_text('.band')).replace('\n', ' | '))
        await host.wait_for_timeout(2500)
        for nm, pg in (('host', host), ('a', a), ('c', c)):
            print(nm, 'party board', await pg.evaluate("() => (WordMix.state().boards['party:4']||[]).map(r => r.name + ' ' + r.score).join(', ')"),
                  '| shared', await pg.evaluate("() => Object.values(WordMix.state().shared).map(r => r.b + ' ' + r.name + ' ' + r.score).sort().join(', ')"))
        # Next round straight from results
        await host.click('[data-act="0"]')
        await a.wait_for_selector('.tile', timeout=15000)
        await host.wait_for_timeout(4000)
        print('round 2 started on phone:', await a.evaluate("() => document.querySelectorAll('.screen:not(.leaving) .tile').length"))
        await b.close()

asyncio.run(main())
