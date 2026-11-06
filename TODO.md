# TODO.md

Remember: plan first, and no code until the user says to write it (see `CLAUDE.md`).

## Open questions for the user

- [ ] **Easy mode word checking:** Easy currently accepts any real word you find (only boards, hints and missed words use everyday words). Should Easy only accept everyday words? It's a one-line change.
- [ ] **Board choosing speed on phones:** boards now take about 60–100ms to choose on a computer, maybe up to about 0.5s on an older phone. If starting a round feels slow, reduce the number of boards tried in `makeBoard`.
- [ ] **Try version 26 Party on real phones:** results in step on every phone, host-only Speed up and Skip, the bar battle, crown and poop moving, trivia, the loading screen between rounds, and the child Hint button. Also the v25 round start and everyday-word boards.
- [ ] **Child hint sizes:** when the child is well behind, hints lean to the longest size anyone has found, which can be an 8 or 9-letter word. Check this feels right, or cap the size (for example at 6 letters).

## Small tidy-ups (suggested, not agreed)

- [ ] Remove the unused `.deal`, `.deal-wrap`, `.cd-slot` overlay styles in `styles.css`, left over from the v24 countdown.
- [ ] Further word-list cleaning if odd or unsuitable words turn up in play.

## Parked (don't build unless the user asks)

- [ ] **Fully offline dictionary:** word definitions currently need the internet (dictionaryapi.dev). Only cached ones work offline.
- [ ] **Hub / scoreboard-only device:** a device that joins just to show live rankings, results and session win tallies. Big-screen host mode covers part of this already. The user wants it to work on a device without a camera (just showing a QR code).
- [ ] **Online room codes:** play from different places over mobile data.
- [ ] **Shared scores across networks:** friends' scores synced per mode without being in the same room.
- [ ] **No-network play:** play with no Wi-Fi or hotspot at all. Not feasible across Android and iPhone as a web app.
- [ ] **Android app with a local server, plus the iOS web app,** working together seamlessly.

## Done (recent)

- [x] v26: host-controlled Party results, bar battle, crown and poop labels, session trivia, loading screen between rounds, child hints in Party and pass-and-play.
- [x] v25: boards favour everyday words; round start on the real board; no pinch zoom.
- [x] v24: full sound engine, music, sound settings and in-game switches.
- [x] v23: Easy mode, Child profile.
- [x] v22: word-list clean-up, solo results like Party, Party leaderboard shows every player, shared "Everyone" leaderboard.
- [x] Child mode: replaced by Easy mode plus the Child profile (the user decided against PINs and stars).
