import asyncio, sys
from playwright.async_api import async_playwright
import os
# Use Google Chrome if installed, otherwise Playwright's own Chromium.
CHROME = {'executable_path': '/usr/bin/google-chrome'} if os.path.exists('/usr/bin/google-chrome') else {}
OUT = sys.argv[1]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(**CHROME, args=['--autoplay-policy=no-user-gesture-required'])
        pg = await (await b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2)).new_page()
        pg.on('pageerror', lambda e: print('PAGEERROR', e))
        await pg.goto('http://localhost:8765/')
        await pg.evaluate("() => localStorage.setItem('wordmix.v1', JSON.stringify({profile:{name:'Mum',avatar:'fox'}, deviceId:'devA', settings:{sound:true}}))")
        await pg.reload(); await pg.wait_for_selector('[data-go="solo"]'); await pg.wait_for_timeout(500)
        print('defaults', await pg.evaluate("() => JSON.stringify([WordMix.state().settings.snd, WordMix.state().settings.music, WordMix.state().settings.musicVol])"))
        await pg.click('[data-go="solo"]'); await pg.wait_for_timeout(400)
        await pg.click('[data-mode="blitz"]'); await pg.click('[data-start]')
        await pg.wait_for_timeout(700); await pg.screenshot(path=OUT + '/snd_01_shake.png')
        await pg.wait_for_timeout(1300); await pg.screenshot(path=OUT + '/snd_02_drop.png')
        await pg.wait_for_timeout(1300); await pg.screenshot(path=OUT + '/snd_03_count.png')
        await pg.wait_for_timeout(1800)
        print('music on after GO', await pg.evaluate("() => WMSound.music.on"))
        await pg.click('[data-menu]'); await pg.wait_for_timeout(400)
        await pg.screenshot(path=OUT + '/snd_04_menu.png')
        print('music paused', await pg.evaluate("() => WMSound.music.on"))
        await pg.click('[data-stg="music"]'); await pg.wait_for_timeout(200)
        await pg.click('[data-resume]'); await pg.wait_for_timeout(400)
        print('music off setting respected', await pg.evaluate("() => [WordMix.state().settings.music, WMSound.music.on, WMSound.music.wanted]"))
        await pg.click('[data-menu]'); await pg.click('[data-stg="music"]'); await pg.click('[data-resume]'); await pg.wait_for_timeout(300)
        print('music back on', await pg.evaluate("() => WMSound.music.on"))
        # jump to last 10 seconds
        await pg.evaluate("() => { const real = Date.now; Date.now = () => real() + 52000; }")
        await pg.wait_for_timeout(1500)
        print('urgency', await pg.evaluate("() => WMSound.music.urgency.toFixed(2)"), 'bpm', await pg.evaluate("() => Math.round(WMSound.music.bpm)"))
        await pg.wait_for_timeout(9000)
        print('music after end', await pg.evaluate("() => WMSound.music.on"))
        await pg.wait_for_selector('[data-skip]', timeout=20000)
        await pg.click('[data-skip]'); await pg.wait_for_timeout(500)
        await pg.click('[data-home]'); await pg.wait_for_timeout(500)
        await pg.click('[data-settings]'); await pg.wait_for_timeout(500)
        await pg.evaluate("() => document.querySelector('.scroll').scrollTo(0, 500)"); await pg.wait_for_timeout(200)
        await pg.screenshot(path=OUT + '/snd_05_settings.png')
        await pg.click('[data-sndg="end"][data-sndv="buzzer"]'); await pg.wait_for_timeout(300)
        print('pick saved', await pg.evaluate("() => JSON.parse(localStorage.getItem('wordmix.v1')).settings.snd.end"))
        await pg.screenshot(path=OUT + '/snd_06_settings2.png', full_page=False)
        await b.close()
asyncio.run(main())
