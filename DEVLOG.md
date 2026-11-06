# DEVLOG.md

Newest first. Each version commit adds an entry here.

## Version 25: 6 Nov 2026 (commit 1c1f21b)

**Why:** the user found 5-letter words much rarer than in Boggle.

**Investigation:**
- The board rules already matched Boggle: 8-way neighbours, no tile reuse, crossing paths allowed, Qu as one tile worth 2 letters.
- The letter mix was Boggle-like, from a weighted bag with vowel, repeat and rare-letter limits.
- 5-letter words were already about 24% of all words on 4×4, against about 19% in Boggle.
- The real cause: only about 7 of the about 20 five-letter words per 4×4 Normal board were everyday words. The rest were obscure dictionary words. Board picking also counted obscure words, so it could choose boards that looked rich but had few findable words.

**Changes:**
- **Boards favour everyday words.** `makeBoard` now tries several boards (Normal 60/40/25 for 4/5/6, Easy 80/50/25) and keeps the one with the highest `countFindable` (everyday words 1 point, everyday 5+ letter words 3). Any real word still scores.
  - 4×4 Normal: total words 77 → 166, everyday 5-letter 6.4 → 18.6, everyday 6+ letter 2.3 → 8.3.
  - 5×5 Normal: everyday 5-letter 16.1 → 30.4. 6×6 Normal: 23.4 → 41.4.
  - Easy stays ahead of Normal (4×4 Easy: 22 everyday 5-letter words).
  - About 60–100ms per board on a computer.
- **Round start on the real board.** No more orange overlay.
  - The empty board shakes, the tiles drop in one by one, and the letters roll randomly during "3, 2". On "Go!" they settle on the real letters in a ripple.
  - The word bar says "Get ready…" until Go. The same applies on the big screen.
  - New `countdown(screenEl, boardEl, opts)` and `tileLetter`. New CSS `.cd-block`, `.cd-layer`, `.mixing`, `.shaking`, `.pre`, `.drop-in`, `.rolling`, `.settle`.
- **No pinch zoom.**
  - The viewport has `maximum-scale=1, minimum-scale=1, user-scalable=no`.
  - iPhone pinch is blocked with gesture and two-finger `touchmove` listeners.
  - Double-tap zoom is off with `touch-action: manipulation`.
  - Zooming on a computer is untouched; the user only wanted pinch zoom gone.
- Tests: all passed (intro, solo, easy, sound, pass-and-play child, daily, 3-phone Party, big screen).
- Afterwards: added the project docs (`CLAUDE.md`, `PROJECT.md`, `CODE.md`, `TODO.md`, `DEVLOG.md`) and `dev/` (tests, preview builder, sound board).

## Version 24: 6 Nov 2026 (commit 791962b)

- New `sound.js` (`WMSound`) with all sounds made in Web Audio. Every variant is in Settings → "Choose your sounds", with the user's picks as defaults: Marimba, Pop chime, Arcade cascade, Soft buzz, Clock tick, Whistle.
- Round start: dice shake, tiles drop, beep beep BEEP, Go. At this point it was still on an orange overlay.
- Letter chimes rise in pitch. Valid, long-word, bad-move, not-a-word and already-found sounds.
- Background music in every mode. In the last 10 seconds the music speeds up and the tick plays, with urgent beeps in the final 3 seconds, then the whistle.
- Results sounds: swish, sparkle, tally ticks, confetti pop, fanfare, applause.
- Sound effects and Music switches with separate volume sliders, also in the in-game ☰ menu. Music can be off with effects on.
- In Party, music and ticking play only on the host or big screen.

## Version 23: 6 Nov 2026 (commits 8cfecdc, 58dd36d)

- **Easy mode:** a Normal | Easy switch on solo and Party setup. More vowels, no J, Q, X or Z, boards rich in everyday words (`words_easy.txt`, 8,630 words). Separate Easy leaderboards. Daily stays Normal.
- **Child profile:** a Settings toggle and a pass-and-play "Child" tick. Child players get 3- and 4-letter hints and double points in Party and pass-and-play. Results look normal.
- An empty commit republished GitHub Pages when the user asked to "push it again".

## Version 22: 6 Nov 2026 (commit c55087b)

- Cleaner word list, without child-unfriendly and obscure words.
- Animated solo results like Party, with missed words, personal best and ranks.
- The Party leaderboard shows every player's score.
- The shared "Everyone" leaderboard: scores swap between phones that play Party together, kept separate from "This phone".

## Earlier, 5 Nov 2026 (first build to v21)

- 6c839f0: first version of Word Mix. Solo, pass and play, Classic, Blitz, Zen, Daily, 4×4 to 6×6, offline.
- de9df14: British spellings only in the word list.
- b57bf7a: Party mode, Survival, Rarity, Daily Puzzle. New scoring with a unique-word bonus. Up to 8 players. Dark theme. Hint lightbulb and in-game hint settings. Full round breakdown and session standings.
- 66e4520: fits all screen sizes (landscape game layout, wide-screen menus).
- b3da6ff, 83a7505, 6d4a6f4: follow the phone's dark mode, and stop browsers (Samsung Internet) repainting the Original colours.
- 973a066: updates load straight away (network first, reload at the home screen). Bigger tablet layout.
- 6b6090d → 4a91e56: tried hands-free joining with the host's front camera, then removed it. Full animated results on every phone with a Ready button. Big-screen host mode.
- f888355: hint frequency in words (Lots, Sometimes, Rarely, Very little, None), default 8 seconds.
- d1fe097: no pull-down-to-refresh in the installed app.
- bc1668f, 4f47b82, 8efc55b, a452eb1, 88b2c4d, 183712c, 23beb9f: hotspot connection fixes (camera keeps running while codes are made, joiner waits to be contacted, longer connect time), screen kept awake, reading colour-inverted QR codes, offline scanner, connection diagnostics (now hidden), version number in Settings. Found that Chrome on Android can't play over its own hotspot; use Samsung Internet.
- b2beb01, aba131d: results scroll as one page, no crossed-out words, tap a word for its definition, slower reveal with Speed up, "Loser" label for last place.
