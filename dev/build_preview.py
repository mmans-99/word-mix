# Builds one self-contained HTML file of the game (all code and word lists inline)
# for previewing as a Claude artifact. Usage, from the repo root:
#   python3 dev/build_preview.py
# Output: dev/preview/word-mix.html (not committed).
import os
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
r = lambda f: open(os.path.join(D, f), encoding='utf-8').read()
out = ['<!DOCTYPE html>', '<meta charset="utf-8">', '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no">', '<title>Word Mix</title>',
 '<link rel="preconnect" href="https://fonts.googleapis.com">',
 '<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500..800&family=Montserrat:wght@700;800;900&display=swap" rel="stylesheet">',
 '<style>', r('styles.css'), '</style>', '<main id="app"></main>',
 '<script type="text/plain" id="wm-words">' + r('words.txt').strip() + '</script>',
 '<script type="text/plain" id="wm-easy">' + r('words_easy.txt').strip() + '</script>',
 '<script>window.WM_PREVIEW = true;</script>']
for f in ('qr.js', 'avatars.js', 'net.js', 'sound.js', 'app.js'):
    out += ['<script>', r(f).replace('</script', '<\\/script'), '</script>']
os.makedirs(os.path.join(D, 'dev', 'preview'), exist_ok=True)
open(os.path.join(D, 'dev', 'preview', 'word-mix.html'), 'w', encoding='utf-8').write('\n'.join(out) + '\n')
