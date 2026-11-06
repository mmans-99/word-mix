import asyncio, json
from playwright.async_api import async_playwright
import os
# Use Google Chrome if installed, otherwise Playwright's own Chromium.
CHROME = {'executable_path': '/usr/bin/google-chrome'} if os.path.exists('/usr/bin/google-chrome') else {}
JS = """(args) => {
  const out = {normal: [], easy: []};
  for (const easy of [false, true]) {
    for (let s = 1; s <= 60; s++) {
      const b = window.WordMix.makeBoard(4, 3, 1000 + s, easy);
      const words = Array.from(b.words.keys());
      const fives = words.filter(w => w.length === 5);
      const everyday5 = fives.filter(w => window.WordMix.isEasyWord(w));
      const vowels = b.cells.filter(c => 'aeiou'.includes((c.l||c.letter||c||'').toString().toLowerCase())).length;
      (easy ? out.easy : out.normal).push({total: words.length, five: fives.length, everyday5: everyday5.length, vowels});
    }
  }
  return out;
}"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(**CHROME, args=["--no-sandbox"])
        pg = await b.new_page()
        await pg.goto("http://localhost:8765/index.html")
        await pg.wait_for_function("window.WordMix && window.WordMix.makeBoard", timeout=20000)
        r = await pg.evaluate(JS)
        for k in ("normal","easy"):
            rows = r[k]; n = len(rows)
            avg = lambda f: sum(x[f] for x in rows)/n
            print(f"{k}: boards={n} avg total words={avg('total'):.0f}, avg 5-letter={avg('five'):.1f}, avg everyday 5-letter={avg('everyday5'):.1f}, avg vowels={avg('vowels'):.1f}")
        await b.close()
asyncio.run(main())
