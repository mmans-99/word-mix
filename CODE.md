# CODE.md: how the code works

Plain HTML, CSS and JavaScript, with no build step and no framework. All code is ES5-style inside IIFEs (`(function () { 'use strict'; ... })()`), so it runs on older phone browsers.

## Files

| File | What it is |
|---|---|
| `index.html` | The page shell. Viewport meta (no pinch zoom), fonts, and loads `qr.js`, `avatars.js`, `net.js`, `sound.js`, then `app.js`. |
| `app.js` | The whole game (~2,000 lines): boards, screens, play, results, leaderboards, settings, Party. |
| `sound.js` | `WMSound`: all sound effects and music, made with Web Audio. |
| `net.js` | `WMNet`: WebRTC phone-to-phone connections, with the connection codes packed into QR codes. Loads jsQR from jsDelivr for scanning. |
| `qr.js` | Makes the QR code images. |
| `avatars.js` | The avatar drawings (fox, panda…). |
| `styles.css` | All styles. Theme colours are CSS variables. |
| `sw.js` | Service worker for offline play. |
| `manifest.webmanifest`, `icons/` | Install-to-home-screen details and icons. |
| `words.txt` | Full dictionary, 70,444 words, sorted, one per line, lower case, British spellings. |
| `words_easy.txt` | 8,630 everyday words. |
| `dev/` | Not part of the game: tests, `build_preview.py`, `sound-board.html`. |

## app.js sections (in order)

1. **Helpers:** `$`, `$$`, `esc`, `on`, `wait`, `todayKey`, `hashStr`, `rng(seed)` (a seeded random generator), the pinch-zoom block, and scoring: `pts(len)`, `LETTER_VALUE`, `rarityPts`, `scoreOf(w, scoring)`.
2. **Storage:** everything is in `localStorage` under `'wordmix.v1'` (the `S` object). `DEFAULTS`, `save()`, `applyTheme()`, `rememberPlayer()`. Definitions are cached separately under `'wordmix.defs'`.
3. **Sound and haptics:** `Snd` is a thin wrapper around `WMSound`. `buzz(ms)` vibrates.
4. **Dictionary and boards:**
   - `loadWords()` fetches `words.txt` and `words_easy.txt`. In the preview build they're inlined as `#wm-words` and `#wm-easy`.
   - `WORDS` is the sorted array, `WSET` the Set, and `EASY` the Set of everyday words. `isEasyWord(w)` returns true if `EASY` hasn't loaded.
   - `hasPrefix(p)` does a binary search on `WORDS`. `neighbours(n)` lists the 8-way neighbours of each cell.
   - `solve(cells, n, minLen)` does a depth-first search over every path, pruned by prefix, and returns a `Map` of word → path.
   - `FREQ` and `FREQ_EASY` are the letter weights. `makeBag`, `pickLetter(rand, bag)`, and `makeCells(n, rand, easy)` with the vowel, repeat and rare-letter limits.
   - `countFindable(words)`: everyday words count 1, everyday words of 5+ letters count 3.
   - `makeBoard(n, minLen, seed, easy)` tries `attempts` boards (Normal: 60/40/25 for 4/5/6; Easy: 80/50/25) and keeps the one with the highest `countFindable`. It returns `{n, minLen, cells, words, easy}`. Cells are lower-case letters, with `'qu'` for the Qu tile.
   - `boardFromCells(...)` rebuilds a board from the cells sent by a Party host.
5. **Modes:** `MODES`, `SURVIVAL_START`, `survivalBonus(len)`.
6. **Leaderboards (data):**
   - `boardKey(mode, n, easy)` gives `"mode:n"`, `"mode:n:e"` for Easy, or `"daily:YYYY-MM-DD"`.
   - `S.boards` holds this phone's scores. `S.shared` is an id-keyed map of everyone's scores. Every score has an `id` so it's never counted twice.
   - `sharedEntry`, `sharedList(b)` (`'daily:best'` covers every daily), `pruneShared`, `mergeShared(entries)` (validates board keys with a regex), `addScore(mode, n, minLen, player, score, words, opts)` with `opts.easy`, `opts.id` and `opts.at`, and `rankOf`.
   - Limits: 20 per board on this phone, `SHARED_PER_BOARD = 25`.
7. **Word definitions:** `lookup(w)` tries `baseForms(w)` against `https://api.dictionaryapi.dev/api/v2/entries/en/`, cached. `showDefinition` opens the sheet.
8. **Keep awake:** `keepAwake()` uses a Wake Lock during play and nearby setup.
9. **Screen management:** `mount(html, cls)` swaps screens with animation (`.screen`, `.leaving`) and runs `scr.cleanup`. Also `toast`, `logo`, `backBand`, `avatar`, `confirmBox`.
10. **Profile and Home:** `profileEditor`, `editMyProfile`, `home()`, `party()` (the Together menu).
11. **Game setup:** `setup(kind)` with kind `'solo'`, `'pass'` or `'host'`. It covers the mode, size, min length, Normal | Easy switch (`data-easy`), party time and scoring. The choices are remembered in `S.last`. `finalCfg(cfg)`, `startDaily()`, and `addPlayerSheet()` (pass-and-play players, with the Child tick).
12. **The game:**
    - `tileLetter(t, c)` sets a tile's letter.
    - `countdown(screenEl, boardEl, {n, full, cells, tiles, easy})` is the round start on the real board (v25). It works like this:
      - It adds a transparent `.cd-block` over the screen, so nothing can be tapped, and a `.cd-layer` over the board for the "3 / 2 / Go!" numbers.
      - The board gets `.mixing` (empty slot look) and `.shaking`.
      - `WMSound.roundStart` calls `drop(i)`: each tile gets `.rolling` and its cell `.drop-in`, and a 90ms interval rolls random letters.
      - Then it calls `beat(i)`, then `go()`: the tiles settle onto the real letters with a stagger of `(row + col) × 25ms` (`.settle`), the blockers are removed, and the promise resolves.
      - `full: false` plays only the beeps. This is used for player phones in Party, where the visuals still play.
    - `playBoard(opts)` is the play screen. `opts.onWord(count, {score, long})`, `opts.childHints()` → `{maxLen, others}`, and `onEnd` gets `{words, hints, hinted, lasted}`. Tiles start as `.tile.pre` and empty. It includes layout, swipe handling (pointer events, `adj()`, backtrack by sliding back, `badMove` sound), the trail SVG, submit, the timer (Survival `addTime`), the last-10-seconds urgency, music, hints (`hintMenu`, pool by child or easy), the ☰ pause menu (`soundSwitches()` / `bindSoundSwitches()`) and `finish()`. `opts.ambient` is false on Party player phones (no music or ticking). It returns `{forceEnd, el, start, isEnded}`.
13. **Scoring:** `scoreWords(words, uniqueSet, scoring, mult)` (mult is a number or a function of the word), `wordMult(p, w, hintedSet)` (2 for a child's own words, 1 for hinted words and adults), `childMult(p)` and `KID_COOLDOWN` (5000ms).
14. **Solo:** `playSolo(cfg)`, `tallyUp`, `wordRows`, `fmtTime`, `resultsSolo(...)` (animated reveal, missed words, personal best and ranks).
15. **Pass and play:** `playPass(cfg, players, session)`. A child player's `childHints` uses the longest word and average score of the players who went before; results pass `hinted` through to `resultsShow` (role `'local'`).
16. **Party results:** `computeRound(players, scoring)` (counts, unique set, finders, rows), `roundLabels(rows)` (winner and loser keys), `updateSession(session, rows, scoring)` (per-player session facts and `session.labels`), `standings`, `triviaLines(session)` (`[{h, b, av}]`), `triviaCard(lines)` (cycles every 4s), `cleanTrivia` / `cleanLabels` (check host data) and `roundLoading(round, players, labels, lines, ms)` (the between-rounds screen, `NEXT_WAIT` = 5000ms).
17. **Big screen:** `spectate(board, cfg, players, roundNo, onEnd, onQuit)` shows live counts, uses the same countdown, and plays music.
18. **Animated results:** `animateNum`, `confetti`, `BAR_COLS`, `resultsShow(cfg, players, opts)`, the bar battle:
    - `opts.role` is `'local'` (pass-and-play), `'host'` or `'follow'` (Party player phones). The reveal is a list of `steps`. Local and host run them on timers, and the host calls `opts.onStep(i)`, `onSpeed(s)` and `onSkip()` to broadcast. Followers run steps only through `api.goTo(i)`, with `api.setSpeed` and `api.skip`. A follower that hears nothing for 6 seconds switches to local (`guard`).
    - Each word has two steps: `popWord` (above the bars) and `flyWord` (`.fly-chip` elements on `document.body`, Web Animations, then the bar rises via `drawBars`). `flyGen` stops chips scoring after a skip.
    - Labels: `.lbadge` elements in `[data-labels]`, positioned by column. They start on `prev` holders and `moveLabels` moves, bounces, drops or removes them.
    - Returns `{el, setReady, goTo, setSpeed, skip, round, trivia, prev, labels}`.
19. **Leaderboards (screen):** `leaderboards(back, mode, n)` with This phone | Everyone and Normal | Easy switches.
20. **Hint and sound controls:** `soundSwitches`, `bindSoundSwitches`, `soundSettings`, `bindSoundSettings` (sliders `data-vol`, choices `data-sndg` / `data-sndv` → `WMSound.preview`), `hintControls`, `bindHintControls`.
21. **Settings:** `settings()`.
22. **Nearby play:** `nearby()`, `openScanner`, `codeFallback`, `netWarning`, `liveDiag` (hidden diagnostics), `qrHtml` / `drawQr`, `send`, `sendShared`, `hostLobby(cfg)`, `joinGame()`.
    - `hostLobby`: `liveUpdate(id, score, long)` keeps `round.live` and broadcasts `live`; `hostHintInfo()` feeds the host's own child hints; `nextRound()` broadcasts `next`, shows `roundLoading` and then calls `startRound()` (which goes back to the lobby if everyone has left). `round` holds `done`, `hinted`, `live`, `maxLen`, `myWords` and `myHinted`. Results use role `'host'` and broadcast `rstep` / `rspeed` / `rskip` tagged with the round id.
    - `joinGame`: `show` is the current results show, `showRid` its round id and `ctl` the host's step, speed and skip that arrived early. `live` holds the host's `live` message for this phone's child hints (other players' average excludes `myId`).
23. **Boot:** `boot()`. `window.WordMix` exposes `solve`, `makeBoard`, `computeRound`, `isEasyWord` and `state()` for tests.

## Party messages (JSON over the WebRTC data channel)

The host is in charge. Player phones only send their own actions.

| Message | Direction | Meaning |
|---|---|---|
| `hello` `{name, avatar, did, child}` | player → host | Join. `did` is the device id, so a rejoining phone replaces its old link. |
| `welcome` `{id}` | host → player | The player's id. |
| `lobby` `{players, mode, n, minLen}` | host → all | Lobby list. |
| `start` `{cells, n, minLen, mode, time, scoring, easy, players}` | host → all | Round start with the board and settings. |
| `count` `{n, score, long}` | player → host | Live number of words found (big screen), plus score and longest word length for child hints. |
| `live` `{max, scores}` | host → all | Longest word length so far and every player's live score (by id), for child hints. |
| `done` `{words, hinted}` | player → host | The player's words at the end of the round, and which of them came from hints. |
| `results` `{players, …, round, trivia, prev, rid}` | host → all | The round's words per player (with `hinted`), the trivia lines and last round's label holders. Each phone works out the scores with `computeRound`. |
| `rstep` `{i, rid}` / `rspeed` `{s, rid}` / `rskip` `{rid}` | host → all | The host's results reveal: step reached, speed, skip. Kept in `ctl` if they arrive before the phone's show is up. |
| `next` `{round, trivia, labels, players}` | host → all | Show the between-rounds loading screen. `start` follows after `NEXT_WAIT`. |
| `ready` | player → host | The player pressed Ready on the summary. |
| `sync` `{entries, last}` | both ways | Shared leaderboard scores, sent in chunks. |
| `bye` | host → all | The host closed the game. |

`MAX_PLAYERS` is 8. In big-screen mode (`cfg.screenOnly`) the host isn't a player.

## sound.js (`WMSound`)

- `config(getSettings)` reads the volumes, switches and picks from `S.settings`.
- `VARIANTS` and `DEFAULT_PICKS`. The pick groups are `tile`, `valid`, `long`, `bad`, `overlay` and `end`.
- `START = {shake: 0, drop: 1.35, beeps: [2.55, 3.4, 4.25], total: 4.6}` sets the round-start timing in seconds. `roundStart({full, tiles, drop, beat, go})` schedules the sounds and calls the callbacks. Every phone takes exactly `total` seconds.
- Effects: `letter(i)`, `word(len)`, `badMove`, `notWord`, `again`, `lastTen`, `urgent`, `timesUp`, `swish`, `sparkle`, `tallyTick`, `ding`, `win`, `valid`, `simple`, `preview(group, variant)` and `stopAll`.
- `music`: `want(bool)`, `refresh()`, `setUrgency()`. It's a looping scheduler (Fmaj7 / Em7 / Dm7 / Cmaj7, with bass and hats) that speeds up in the last 10 seconds. It only plays when it's wanted and the Music setting is on.
- A compressor sits on the master output, plus a shimmer delay bus.

## Storage (`S` in localStorage `'wordmix.v1'`)

```
profile {name, avatar, child}, saved [players], deviceId,
settings {hintDelay, hint3, sound, music, sfxVol, musicVol, snd{group: variant}, vibrate, theme, hintChosen},
boards {"mode:n[:e]" | "daily:YYYY-MM-DD" | "daily:best": [scores]},
shared {id: entry}, sharedInit, daily {...}, last {mode, size, minLen, partyTime, scoring, easy}
```

## Service worker (`sw.js`)

- `VERSION = 'wordmix-vNN'`. Bump it on every release.
- `SHELL` lists every file the game needs offline. `EXTRA` holds jsQR and the Google Font.
- Same-origin requests are network-first (so updates show straight away) with a cached fallback. The app reloads at the home screen when a new version is ready.

## Gotchas

- **Curly quotes in source:** some strings in `app.js` use real `’`, `…` and `—` characters. When editing, match them exactly, or the edit fails to apply.
- **Version bump:** if `sw.js` `VERSION` isn't bumped, phones keep the old cached files.
- **Samsung Internet dark mode** repaints colours. The Original theme is protected against this; don't remove that styling.
- **Chrome on Android** can't do WebRTC over its own phone's hotspot. Samsung Internet can.
- **iPhone** ignores `user-scalable=no`, so pinch zoom is blocked with `gesturestart` and two-finger `touchmove` listeners at the top of `app.js`. Double-tap zoom is turned off with `touch-action: manipulation` on `html, body`. The board itself has `touch-action: none`.
- **iPhone silent switch** mutes Web Audio.
- **Board generation time:** about 60–100ms per board on a computer, possibly up to about 0.5s on an older phone.
- Old `.deal` / `.deal-wrap` styles from the v24 overlay countdown are unused since v25 (see `TODO.md`).
- `.badge` is an older class (personal-best badge). The results labels use `.lbadge`.
- The child Hint button (`.hint-btn.kid`) only appears when `playBoard` gets `opts.childHints` (pass-and-play and Party) and the player is a child. Solo hints are unchanged.
