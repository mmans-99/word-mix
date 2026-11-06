import asyncio, sys
from playwright.async_api import async_playwright
import os
# Use Google Chrome if installed, otherwise Playwright's own Chromium.
CHROME = {'executable_path': '/usr/bin/google-chrome'} if os.path.exists('/usr/bin/google-chrome') else {}
OUT = sys.argv[1]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(**CHROME)
        pg = await (await b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2)).new_page()
        pg.on('pageerror', lambda e: print('PAGEERROR', e))
        await pg.goto('http://localhost:8765/')
        await pg.evaluate("() => localStorage.setItem('wordmix.v1', JSON.stringify({profile:{name:'Mum',avatar:'fox'}, deviceId:'devA', saved:[{name:'Mum',avatar:'fox'},{name:'Zara',avatar:'cat'}]}))")
        await pg.reload(); await pg.wait_for_selector('[data-go="party"]'); await pg.wait_for_timeout(500)
        await pg.click('[data-go="party"]'); await pg.wait_for_timeout(500)
        await pg.click('[data-pass]'); await pg.wait_for_timeout(500)
        await pg.click('[data-add]'); await pg.wait_for_timeout(400); await pg.click('[data-pick="0"]'); await pg.wait_for_timeout(300)
        await pg.click('[data-child="1"]'); await pg.wait_for_timeout(300)
        await pg.evaluate("() => document.querySelector('.scroll').scrollTo(0, 600)"); await pg.wait_for_timeout(200)
        await pg.screenshot(path=OUT + '/child_01_pass.png')
        print('saved', await pg.evaluate("() => JSON.stringify(WordMix.state().saved)"))
        await pg.click('[data-back]'); await pg.wait_for_timeout(400); await pg.click('[data-back]'); await pg.wait_for_timeout(400)
        await pg.click("[data-settings]"); await pg.wait_for_timeout(400)
        await pg.click('[data-childp]'); await pg.wait_for_timeout(300)
        await pg.evaluate("() => document.querySelector('.scroll').scrollTo(0, 800)"); await pg.wait_for_timeout(200)
        await pg.screenshot(path=OUT + '/child_02_settings.png')
        print('profile child', await pg.evaluate("() => WordMix.state().profile.child"))
        await b.close()
asyncio.run(main())
