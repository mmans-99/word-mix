import asyncio
from playwright.async_api import async_playwright
import os
# Use Google Chrome if installed, otherwise Playwright's own Chromium.
CHROME = {'executable_path': '/usr/bin/google-chrome'} if os.path.exists('/usr/bin/google-chrome') else {}
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(**CHROME)
        pg = await (await b.new_context(viewport={'width': 390, 'height': 844})).new_page()
        pg.on('pageerror', lambda e: print('PAGEERROR', e))
        await pg.goto('http://localhost:8765/')
        await pg.evaluate("() => localStorage.setItem('wordmix.v1', JSON.stringify({profile:{name:'Mum',avatar:'fox'}}))")
        await pg.reload(); await pg.wait_for_selector('[data-go="daily"]')
        await pg.click('[data-go="daily"]'); await pg.wait_for_timeout(600)
        st = await pg.query_selector('[data-start]')
        if st: await st.click()
        await pg.wait_for_timeout(4200)
        await pg.evaluate("() => { const real = Date.now; Date.now = () => real() + 400000; }")
        await pg.wait_for_selector('[data-skip]', timeout=20000); await pg.wait_for_timeout(500); await pg.click('[data-skip]'); await pg.wait_for_timeout(500)
        print((await pg.inner_text('.solo-stats')).replace('\n',' | '), '||', await pg.inner_text('[data-title]'))
        await pg.click('[data-boards]'); await pg.wait_for_timeout(500); await pg.click('[data-scope="all"]'); await pg.wait_for_timeout(400)
        print((await pg.inner_text('[data-body]'))[:400].replace('\n',' | '))
        await b.close()
asyncio.run(main())
