import asyncio, sys
# Usage: python3 measure_boards.py [easy]
from playwright.async_api import async_playwright
import os
# Use Google Chrome if installed, otherwise Playwright's own Chromium.
CHROME = {'executable_path': '/usr/bin/google-chrome'} if os.path.exists('/usr/bin/google-chrome') else {}
JS = """() => {
  const W = window.WordMix, out = {};
  for (const n of [4,5,6]) {
    const t0 = performance.now(), rows = [];
    for (let s = 1; s <= 40; s++) {
      const b = W.makeBoard(n, 3, 5000 + s, EASY);
      const ws = Array.from(b.words.keys());
      rows.push({ all: ws.length, ev: ws.filter(W.isEasyWord).length,
        ev5: ws.filter(w => w.length === 5 && W.isEasyWord(w)).length,
        ev6: ws.filter(w => w.length >= 6 && W.isEasyWord(w)).length });
    }
    const avg = f => (rows.reduce((a, r) => a + r[f], 0) / rows.length).toFixed(1);
    const sorted = rows.map(r => r.ev).sort((a,b)=>a-b);
    out[n] = { ms: ((performance.now() - t0) / 40).toFixed(0), all: avg('all'), ev: avg('ev'), ev5: avg('ev5'), ev6: avg('ev6'), p50: sorted[20], p90: sorted[36] };
  }
  return out;
}"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(**CHROME, args=["--no-sandbox"])
        pg = await b.new_page()
        await pg.goto("http://localhost:8765/index.html")
        await pg.wait_for_function("window.WordMix && window.WordMix.makeBoard && window.WordMix.isEasyWord('cat') !== undefined", timeout=20000)
        await pg.wait_for_timeout(1500)
        print(await pg.evaluate(JS.replace('EASY', 'true' if 'easy' in sys.argv[1:] else 'false')))
        await b.close()
asyncio.run(main())
