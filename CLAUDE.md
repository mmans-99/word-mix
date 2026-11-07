# CLAUDE.md: start here

Word Mix is a Boggle-style word game for phones, built as an offline web app (PWA) and hosted on GitHub Pages.

- Live game: https://mmans-99.github.io/word-mix/
- Repo: https://github.com/mmans-99/word-mix (branch `main`, Pages serves the repo root)
- Current version: **28** (see `APP_VERSION` in `app.js` and `VERSION` in `sw.js`)

## At the start of every chat

Read all five project docs before doing anything else, to get up to date:

1. `CLAUDE.md`: this file. Rules and how to work.
2. `PROJECT.md`: what the game is, every feature and every design decision.
3. `CODE.md`: how the code is organised, key functions, data formats and gotchas.
4. `TODO.md`: open questions, parked ideas and known issues.
5. `DEVLOG.md`: version history and what changed in each version.

## The rules (always follow these)

1. **Plan first.** For any change, explain the plan in plain words and wait.
2. **No code until the user says to write it.** Questions, explanations and checks (reading code, measuring things) are fine. Changing files is not, until the user gives the go-ahead (for example "yes, make the changes").
3. **Test before showing.** After making changes, run the tests (see below) and check the result yourself, using screenshots where the change is visual.
4. **Only commit and push when the user is happy.** Show the user the result, for example through the preview artifact or screenshots. Only when they say they're happy, bump the version, commit and push to GitHub as the new version.
5. **Update the docs with every commit.** Each version commit also updates `DEVLOG.md` (what changed), `TODO.md` (done, new or parked items), and `PROJECT.md` / `CODE.md` where features or code changed. Update the version number in this file too.
6. **Parked means parked.** Don't build anything listed under "Parked" in `TODO.md` unless the user asks for it.

## How the user likes to work

- British English everywhere, in the game and in replies. The word list uses British spellings only.
- Plain language: explain what something does for the player, not code jargon.
- For setup or how-to guides, give detailed step-by-step instructions that explain every step and term.
- The user plays on Android (Samsung Internet) and the family uses a mix of Android phones, iPhones and iPads.
- The user often thinks out loud and asks "does that make sense?". Confirm your understanding back to them before building.

## Release checklist (only after the user says they're happy)

1. Bump `APP_VERSION` in `app.js` and `VERSION` (`'wordmix-vNN'`) in `sw.js`. Both must change, or phones keep the old cached copy.
2. If you added a new file the game needs offline, add it to `SHELL` in `sw.js`.
3. Run the tests (below). They must all pass with no `PAGEERROR`.
4. Update `DEVLOG.md`, `TODO.md`, `PROJECT.md` and `CODE.md`, and the version in this file.
5. Commit with a message like `Version NN: short summary`, then push to `origin main`.
6. Rebuild the preview (`python3 dev/build_preview.py`) and republish the preview artifact if one is in use.
7. Tell the user that Settings shows "Version NN" once their phone has the update.

## Testing

Tests are Playwright scripts in `dev/tests/`. They drive the real game in Chrome or Chromium.

1. Start a local server from the repo root, in the background: `python3 -m http.server 8765`
2. Run a test with an output folder for screenshots: `python3 dev/tests/test_solo.py dev/out`

Tests:

| Test | What it checks |
|---|---|
| `test_intro.py` | The round start: tiles drop in, letters roll, then settle on Go. Swiping works after Go. Viewport has no zoom. |
| `test_solo.py` | Solo game, swiping words, the animated results, play again, moving old saves to shared scores |
| `test_easy.py` | Easy mode boards and the Easy leaderboards |
| `test_sound.py` | Sound settings, sound choices, in-game sound and music switches |
| `test_pass_child.py` | Pass-and-play with a child player (double points) |
| `test_pass_hints.py` | Pass-and-play child hints: always-there button, 5-second refill, reset on own word, sizes follow the player before, hinted words not doubled |
| `test_daily.py` | Daily Puzzle and its leaderboards |
| `test_child.py` | 3-phone Party game over WebRTC with a child player: child Hint button, results in step on every phone, host-only Speed up, crown and poop labels, trivia, loading screen, round 2 with the crown moving. Add `screen` as a second argument for big-screen host mode. |
| `test_big_screen.py` | The big-screen host results show |
| `check_boards.py` | Average words and everyday 5-letter words per 4×4 board, Normal and Easy |
| `shots_v27.py` | Screenshots, not a pass/fail test: `python3 dev/tests/shots_v27.py dev/out party light tv` (scheme `warm`/`party`, `light`/`dark`, `phone`/`tv`). Two pass-and-play rounds: home, countdown, play, mid-reveal, final, round 2 with live labels. |
| `measure_boards.py` | Board stats for 4×4, 5×5 and 6×6 (add `easy` for Easy boards), with time per board |

Notes:
- `test_child.py` sometimes times out in the lobby (WebRTC in the test machine). Run it again before suspecting the code.
- "Failed to load resource" console lines are web fonts the test machine can't download. They're harmless.
- Background servers in the cloud workspace can be stopped after a time limit. If tests suddenly get `ERR_CONNECTION_REFUSED`, restart the server.

## Previewing

`python3 dev/build_preview.py` builds `dev/preview/word-mix.html`, a single self-contained page with all the code and word lists inlined. It can be published as a Claude artifact so the user can try changes before they're pushed. `dev/sound-board.html` is the standalone sound board that was used to choose the sounds.
