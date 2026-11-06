# PROJECT.md: what Word Mix is

## The idea

A Boggle-style word game for the family, played on phones. Swipe across touching letters to make words. It works fully offline once installed, and phones can play together in the same room with no internet.

- **Who plays:** the user's family, on a mix of Android phones (Samsung Internet), iPhones and iPads. That includes a child, who plays with the Child profile.
- **Where:** at home and offline. Multiplayer runs phone to phone over Wi-Fi or a phone's hotspot.
- **Hosting:** GitHub Pages (https://mmans-99.github.io/word-mix/). Installed with "Add to home screen".

## Look and feel (agreed design decisions)

- Colourful and bright but not childish, and not the usual "AI look". Warm palette in the direction of Scrabble GO. Font: Bricolage Grotesque.
- All tiles are one colour. The user dislikes multi-coloured tiles.
- Colour themes: Original and Dark, with Auto following the phone's dark mode. The Original colours are protected so browser dark modes (Samsung Internet) don't repaint them.
- Slow, satisfying animations. Results reveal slowly, with a Speed up button and Skip (in Party, only the host has them, and they change every screen).
- Opening screen with player names, avatars and the mode choice.
- No pinch zoom on phones (v25). Double-tap zoom is off too.
- British spellings only.

## How a round plays

- **Swipe** across touching letters. A word can go up, down, left, right or diagonally (8 directions). A path can't use the same tile twice, but it can cross itself and zig-zag. The word submits when you lift your finger, with no Enter button. Sliding back onto the previous tile undoes it.
- **Qu** is one tile that counts as 2 letters for length and points. A board has at most one.
- **No twist or rotate** feature, by decision.
- **During play** there's no found-words list and no per-word points. Everything is tallied at the end. The header shows the clock and the number of words found.
- **Feedback:** valid words flash green with a sound. A bad move (a tile that isn't touching or is already used) plays a soft buzz. "Not a word" and "Already found" each have their own sound.
- **Round start (v25)** happens on the real board. The empty board shakes with a dice-shake sound, the tiles drop in one by one, and the letters roll through random letters during beep, beep, BEEP ("3", "2", "Go!"). On Go the tiles settle on the real letters in a quick ripple. The rolling letters are random, never the real ones, so nobody gets a head start. Every phone's countdown lasts exactly as long, so Party phones start together. The word bar says "Get ready…" until Go.
- **Last 10 seconds:** the music speeds up and a ticking plays over it. Urgent beeps sound in the final 3 seconds, then a whistle.
- **In-game ☰ menu:** pause, hint settings, Sound effects switch, Music switch, quit.

## Board sizes and letters

- 4×4, 5×5 or 6×6, with a minimum word length setting.
- Letters are drawn from a weighted bag that favours E, A, O and I, then T, N, S, R and L. J, Q, X and Z are rare. Limits keep it Boggle-like: 30–45% vowels, at most 2 of any letter on a 4×4 (E up to 3), only one Q, and only a few awkward letters (J, K, Q, V, W, X, Y, Z).
- **Boards favour everyday words (v25).** The game tries several boards and keeps the one with the most *everyday* words, with everyday words of 5+ letters counting extra. Any real word still scores. Result on 4×4 Normal: about 19 everyday 5-letter words per board, up from about 6.

## Scoring

- **By length** (default): 3 letters = 1, 4 = 2, 5 = 3, then +1 per extra letter (6 = 4, 7 = 5…).
- **By rarity:** each letter has a value (E, A, S… 1 point, up to Q and Z 10), and a word scores the total of its letters.
- **Party and pass-and-play:** a word only one player found scores double ("Only you ×2"). Shared words score normally. Words aren't crossed out.
- **Child profile:** a child player's words score double in Party and pass-and-play, on Normal and Easy boards. Words they found from a hint score like anyone else's (v26). Not in solo. Results look completely normal, with nothing labelled "child".

## Modes

Solo modes:
- **Classic:** 3 minutes.
- **Blitz:** 1 minute.
- **Survival:** start with 1 minute. Every word adds time (3 letters +3s, 4 letters +5s, 5 letters +7s, more for longer words), and the clock speeds up as you go.
- **Rarity:** 3 minutes with rarity scoring.
- **Zen:** no timer, finish when you like. Not ranked.
- **Daily Puzzle:** one board a day, the same for everyone (seeded from the date). Only your first try counts. Later tries are practice and not ranked. Always Normal difficulty.

Together:
- **Pass and play:** 2 to 8 players take turns on one phone. Each player can be ticked as "Child".
- **Party:** 2 to 8 players, each on their own phone, phone to phone (see below). Round length 1, 2 or 3 minutes, scoring by length or rarity.

## Difficulty: Normal and Easy

- A Normal | Easy switch on solo and Party setup. No PIN or stars, just easier gameplay.
- **Easy boards** use more vowels and no J, Q, X or Z. They're chosen for everyday words, and hints and "missed" words only use everyday words (an 8,630-word everyday list).
- Easy currently still accepts any real word you find. Whether Easy should only accept everyday words is an open question in `TODO.md`.
- Easy has its own leaderboards: a Normal | Easy switch on both "This phone" and "Everyone".

## Child profile

- A toggle in Settings for the player on this phone, plus a per-player "Child" tick in pass-and-play.
- **Solo:** a child gets the normal hints (3 and 4-letter words, after the idle delay).
- **Party and pass-and-play (v26):** the child's Hint button is always on screen from the start. After a hint it refills over 5 seconds (a filling bar on the button). If the child finds a word on their own, it's ready again straight away.
  - Hint size follows the longest word anyone has found so far: 3 letters at first, then up to 4 once someone finds a 4-letter word, and so on. In pass-and-play this means the players who went before the child.
  - Boost: the child's score is compared with the other players' average. Level means middle sizes, well behind leans to the longest allowed, ahead leans to 3 letters.
  - The child's own words score double. Words they found from a hint score normally (the unique-word double still applies).
- It works on Normal and Easy games. Results show normally, with no separate child labelling.

## Hints

- A lightbulb Hint button appears above the grid when you haven't touched the screen for a while. The player taps it. Hints are never shown automatically.
- How often hints appear: Lots, Sometimes, Rarely, Very little or None. The default is 8 seconds with no touch. Adjustable in Settings and in the in-game ☰ menu.
- Hints are 3-letter words only (a setting), except child players (see Child profile). On Easy boards only everyday words are hinted.
- Hint uses are counted and shown in results.

## Party (phone to phone)

- Connections use WebRTC, set up by scanning QR codes between phones. No server and no internet are needed once the app is installed.
- The host creates a code, a player scans it with their camera, the player shows their answer code, and the host scans that. Then the next player joins. Up to 8 players.
- **Hotspot play:** works in Samsung Internet. Chrome on Android can't play over its own phone's hotspot, so use Samsung Internet. A warning shows on screens with no network.
- **Big-screen host mode:** the host device doesn't play. It shows the live "words found so far" for each player and the results for everyone to watch.
- The host decides everything: it makes the board, starts the rounds and works out the scores. A phone that rejoins replaces its old connection.
- The screen stays awake during play and setup.
- **Results (v26 bar battle):** each player has a bar with their avatar and name underneath. Each word pops up above the bars, then flies into the bars of the players who found it, and the bars rise like a live battle. Shared words come first, then unique ones with sparkles. Default speed is about 15% quicker than v25.
  - **Host in control:** the host's screen (or the big screen) runs the reveal and every phone shows the same word at the same moment. Only the host has Speed up and Skip, and they change every screen. A phone that loses touch with the host finishes the reveal by itself.
  - **Each round is scored on its own.** No running totals. The bars stay up at the end.
  - **Crown and poop:** the highest score gets a 👑 Winner label, the lowest a 💩 Loser label (ties share; nobody is Loser if everyone tied). The labels stay with those players into the next round, and when the result changes they move across to the new holders, or bounce if the same player keeps them. In round 1 they drop in.
  - **Session trivia** cycles under the bars: most words, longest word, most unusual word (not an everyday word, highest letter value), most unique words, most wins, most 💩s, best single round, best average, and each player's session summary.
  - Then every word found (tap for its meaning) and "Missed opportunity!".
  - Players tap Ready and the host sees a ✓ Ready under their name. Only the host can start the next round.
- **Between rounds:** when the host taps Start next round, every phone shows a 5-second loading screen ("Round N, Get ready…") with the players, their crown or 💩, the trivia card and a filling bar, then the normal round start.
- Music and ticking only play on the host phone or big screen, so phones don't play music out of time with each other. Each player's phone still plays its own countdown beeps, letter and word sounds, the final beeps and the whistle.

## Results

- **Solo:** the same slow reveal as Party. Words appear one by one and the total counts up. Then "Missed opportunity!" shows the longest word on the board and 3 best words you missed (everyday words only on Easy). Then your personal best, the "New personal best!" celebration, and your ranks on this phone and with everyone.
- Tap any word for its definition. Definitions come from dictionaryapi.dev when online and are cached on the phone.
- No crossed-out words anywhere.

## Leaderboards

- **This phone:** scores from games played on this phone (top 20 per board).
- **Everyone:** this phone's scores plus scores swapped automatically with every phone you've played Party with (top 25 per board). Shared scores are kept separate from personal ones, and both are shown wherever possible.
- One board per mode and size (Classic, Blitz, Survival, Rarity, Party, Daily), with separate Easy boards. Daily has today's board and "best daily scores ever". Zen and Daily practice aren't ranked.

## Sound and music (v24)

- Every sound is made in code with Web Audio. Nothing is a recording.
- Settings has switches for Sound effects and Music, separate volume sliders for each, and "Choose your sounds", where every version can be previewed and picked.
- Default picks (the user's choices): letter chime Marimba, word found Pop chime, long word (6+) Arcade cascade, wrong move Soft buzz, last-10-seconds overlay Clock tick (there's also a None choice), time's up Whistle.
- Letter chimes rise in pitch as the word grows.
- Background music plays during rounds in every mode, and stops when paused.
- Results have a swish for shared words, a sparkle for unique words, counter ticks, and confetti pop, fanfare and applause for a win or a new best.
- On iPhone and iPad, the silent switch mutes the game.

## Settings

Profile (name and avatar) and Child profile toggle; theme (Auto, Original, Dark); hint frequency and 3-letter-only hints; vibration; sound effects, music, both volume sliders and sound choices. The version number shows at the bottom.

## Word lists

- `words.txt`: 70,444 words, British spellings only, cleaned in v22 to remove child-unfriendly words (e.g. "tit", "pud") and obscure ones (e.g. "lun", "lis").
- `words_easy.txt`: 8,630 everyday words, taken from word-frequency data (hermitdave FrequencyWords) minus a drop list. Used for Easy boards, all hints and missed words on Easy, and choosing boards in both modes.
