# TODO.md

Remember: plan first, and no code until the user says to write it (see `CLAUDE.md`).

## Open questions for the user

- [ ] **Easy mode word checking:** Easy currently accepts any real word you find (only boards, hints and missed words use everyday words). Should Easy only accept everyday words? It's a one-line change.
- [ ] **Board choosing speed on phones:** boards now take about 60–100ms to choose on a computer, maybe up to about 0.5s on an older phone. If starting a round feels slow, reduce the number of boards tried in `makeBoard`.
- [ ] **Try version 25 on real phones:** the new round start (tiles drop, letters roll, settle on Go), everyday-word boards and no pinch zoom. Party on a mix of phones in particular.

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

- [x] v25: boards favour everyday words; round start on the real board; no pinch zoom.
- [x] v24: full sound engine, music, sound settings and in-game switches.
- [x] v23: Easy mode, Child profile.
- [x] v22: word-list clean-up, solo results like Party, Party leaderboard shows every player, shared "Everyone" leaderboard.
- [x] Child mode: replaced by Easy mode plus the Child profile (the user decided against PINs and stars).
