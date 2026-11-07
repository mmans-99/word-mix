# DEVLOG.md

Newest first. Each version commit adds an entry here.

## Version 28: 7 Nov 2026 (commit 857b578)

**Why:** the user's other game, Pubby, connects phones with much shorter QR codes. A hotspot test of Word Mix with mobile data off failed; the diagnostics showed the hosting phone was the Word Mix app installed from Chrome (Chrome can't connect over its own phone's hotspot), not Samsung Internet. Pubby worked because it was hosted in Samsung Internet. The shorter codes were still worth bringing over.

**Changes:**
- **Short connection codes (from Pubby):** codes now carry only the login name, password, security fingerprint and up to 4 local addresses (UDP host addresses, plain IPv4 first, then hidden ".local" names, then IPv6). About 130 characters instead of about 590, so the QR has fewer, bigger squares and scans faster. The receiving phone rebuilds the full connection message. Format `WM2~o|a~ufrag~pwd~fingerprint~addr:port,...` in `net.js` (`pack`/`unpack`). No compression or Base45 needed any more.
- Scanning an old-format code (`WM1`) says the other phone has an older Word Mix and both should update. Old and new versions can't connect to each other.
- The camera scanner is unchanged (built-in reader where the browser has one, jsQR on iPhones).
- Tests: all pass, including the 3-phone Party test with the new codes. A new code drawn as a QR reads back correctly.

## Version 27: 7 Nov 2026 (commit d7b14c5)

**Why:** the user wanted Word Mix to look and feel more like Netflix's Boggle Party TV game (own artwork and names, not copies), with a choice between their warm colours and a Boggle-style blue and purple, a livelier results show, and 90-second rounds.

**Changes:**
- **Colour schemes:** Settings → Colour scheme: Warm (default) or Party (sky-blue to periwinkle, dark plum tiles with white letters, aqua and mint buttons, orange-to-pink results background). Light or dark is a separate setting (Match phone, Light, Dark; "Original" renamed "Light"). Each device keeps its own choice. `S.settings.scheme`, `data-scheme` on `<html>`.
- **Chunky look in both schemes:** thick dark outlines, solid ledges under buttons and cards, gradient backgrounds, and Montserrat 800–900 for headings, numbers, tiles and buttons (loaded from Google Fonts like Bricolage).
- **Round start:** a 3D-style "3, 2, Go!", and the round's settings as badges under "Get ready…" (board size, time, shortest word, Easy, Rarity). The big screen shows the badges and a scoring rules card while a round is played.
- **Swiping in Party** is aqua, then green for a real word, so a found word stands out.
- **Results show (Party and pass-and-play):**
  - A board at the top lights up each word's path, letter by letter (gold for a word only one player found).
  - A split "words counted" meter: shared words fill the bottom (pink or orange), then words only one player found fill a gold top section that flashes for each one. Total words above, words counted below.
  - "+points" float up over the bars when a word lands. Avatars react: heart eyes for a word only they found, smiling eyes for a shared one (new `mood` argument in `WMAvatars.svg`).
  - Bars are coloured by current place: gold 1st, aqua 2nd, pink 3rd, one plain colour for 4th to 8th, ties share. Places (1st, 2nd…) show faintly in the bars and turn bold at the end.
  - Winner and Loser labels sit just above each player's score. Round 1: they only appear once every score is in. Round 2 on: last round's labels start on their bars, rise with them, and jump live to whoever is first and last during the count.
  - "★ Personal best!" under anyone who beats their best Party score on this board (needs an earlier score on this phone or in shared scores).
  - Round highlights cycle at the end: Longest word (with a mini board of its path and a caption), Team effort, Dead heat, Photo finish, Runaway win, Lone ranger, Word storm.
  - The scoring rules card sits above the words list.
  - Big landscape screens (TV, tablet) have their own layout: board, meter and word on top, bars underneath, all on one screen, with the rules, trivia and words on the right.
- **90-second rounds:** Party round lengths are 1 min, 90s, 2 min and 3 min, with 90s the default. Classic has a 90 seconds / 3 minutes switch, 90 seconds by default, stored as mode `classic90` with its own leaderboards (Classic tab has the same switch). Existing players are moved to the 90-second defaults once (`S.last.t90`). Daily stays 3 minutes.
- Preview builder now starts the page with `<!DOCTYPE html>` and a viewport tag.
- Tests: all pass. New `dev/tests/shots_v27.py` takes screenshots of both schemes on phone and TV sizes over two pass-and-play rounds.

## Version 26: 6 Nov 2026 (commit fa98904)

**Why:** in Party, the host's and players' results ran at different speeds (each phone had its own Speed up), and a child playing Normal boards still found it hard.

**Changes:**
- **Party results follow the host.** The host's screen (or the big screen) runs the reveal and sends each step to the phones (`rstep`), so every screen shows the same word at the same time. Speed up and Skip are only on the host and change every screen (`rspeed`, `rskip`). A phone that hears nothing from the host for 6 seconds finishes on its own.
- **Default reveal about 15% quicker:** each word 0.95–1.55s (was 1.1–1.8s).
- **Bar battle results** for Party and pass-and-play: a bar per player with avatar and name underneath. Each word pops up above the bars, then flies into the bars of whoever found it, and the bars rise.
- **Each round is scored on its own.** The overall-totals view is gone and the bars stay up at the end.
- **Crown and poop labels:** 👑 Winner for the top score, 💩 Loser for the lowest. They stay with those players into the next round and move across (or bounce) when the result changes.
- **Session trivia card**, cycling every 4 seconds: most words, longest word, most unusual word, most unique words, most wins, most 💩s, best single round, best average, and each player's summary.
- **Loading screen between Party rounds:** when the host taps Start next round, every phone shows "Round N, Get ready…" for 5 seconds with the players, their labels and the trivia, then the round starts. Ready ticks show under each player's bar on the host.
- **Child hints in Party and pass-and-play:**
  - The Hint button is always there and refills over 5 seconds after a hint. It's ready straight away when the child finds a word on their own.
  - Hint size follows the longest word anyone has found so far (in pass-and-play, the players before the child). It leans longer the further behind the child is, using live scores that phones now send with `count` and the host passes back in `live`.
  - Words found from a hint aren't doubled for the child. Solo hints are unchanged.
- Tests: `test_child.py` and `test_big_screen.py` updated for the new results; new `test_pass_hints.py`. The big-screen test now waits for the 3-2-1 before swiping.

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
