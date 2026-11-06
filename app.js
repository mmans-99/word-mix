/* Word Mix: a word-grid game for phones. Works offline; nearby play over WebRTC. */
(function () {
  'use strict';

  var APP_VERSION = 24;
  // ---------- Helpers ----------
  var app = document.getElementById('app');
  function $(sel, el) { return (el || document).querySelector(sel); }
  function $$(sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function on(el, sel, ev, fn) { $$(sel, el).forEach(function (n) { n.addEventListener(ev, fn); }); }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function todayKey() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function hashStr(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { var a = seed >>> 0; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  // 3 letters 1, 4 letters 2, 5 letters 3, then +1 for each extra letter.
  function pts(len) { if (len <= 3) return 1; if (len === 4) return 2; if (len === 5) return 3; return len - 2; }
  // Rarity scoring: common letters are worth little, rare ones a lot.
  var LETTER_VALUE = { a: 1, b: 3, c: 3, d: 2, e: 1, f: 4, g: 2, h: 4, i: 1, j: 8, k: 5, l: 1, m: 3, n: 1, o: 1, p: 3, q: 10, r: 1, s: 1, t: 1, u: 1, v: 4, w: 4, x: 8, y: 4, z: 10 };
  function rarityPts(w) { var t = 0; for (var i = 0; i < w.length; i++) t += LETTER_VALUE[w[i]] || 1; return t; }
  function scoreOf(w, scoring) { return scoring === 'rarity' ? rarityPts(w) : pts(w.length); }
  function plural(n, a, b) { return n + ' ' + (n === 1 ? a : b); }

  var I = {
    gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>',
    users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.5 3.5-5.5 7-5.5s7 2 7 5.5"/><circle cx="17" cy="7" r="3"/><path d="M17 13.5c3 0 5 1.8 5 5"/></svg>',
    wifi: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 9a15 15 0 0 1 20 0"/><path d="M5.5 12.5a10 10 0 0 1 13 0"/><path d="M9 16a5 5 0 0 1 6 0"/><circle cx="12" cy="19.5" r="1.2" fill="currentColor"/></svg>',
    trophy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/></svg>',
    bulb: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
    play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>'
  };

  // ---------- Storage ----------
  var KEY = 'wordmix.v1';
  var DEFAULTS = { profile: null, saved: [], settings: { hintDelay: 8, hint3: true, sound: true, music: true, sfxVol: 0.8, musicVol: 0.6, snd: {}, vibrate: true, theme: 'auto' }, boards: {}, shared: {}, daily: {}, deviceId: null, last: { mode: 'classic', size: 4, minLen: 3, partyTime: 180 } };
  var S;
  try { S = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { S = {}; }
  S = Object.assign({}, DEFAULTS, S);
  S.settings = Object.assign({}, DEFAULTS.settings, S.settings || {});
  S.settings.snd = Object.assign({}, WMSound.DEFAULT_PICKS, S.settings.snd || {});
  S.last = Object.assign({}, DEFAULTS.last, S.last || {});
  S.daily = S.daily || {};
  // Older saves used a 5-second default; use the new 8-second default unless the player chose a setting.
  if (!S.settings.hintChosen && S.settings.hintDelay === 5) S.settings.hintDelay = 8;
  if (!S.deviceId) S.deviceId = Math.random().toString(36).slice(2) + Date.now().toString(36);
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  save();
  // Older saves defaulted to 'original' before the player could choose; follow the phone instead.
  if (S.settings.theme === 'original' && !S.settings.themeChosen) S.settings.theme = 'auto';
  var darkQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  function applyTheme() {
    var t = S.settings.theme;
    var dark = t === 'dark' || (t === 'auto' && darkQuery && darkQuery.matches);
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content', dark ? '#E2621C' : '#F26B21');
    // Always tell the browser this page handles light and dark itself. Browsers with their own
    // dark mode (Samsung Internet, Chrome's auto-dark) only repaint pages that say they're light-only,
    // so this keeps the Original colours exactly as drawn even when the browser is in dark mode.
    var cs = document.querySelector('meta[name="color-scheme"]');
    if (cs) cs.setAttribute('content', 'light dark');
    document.documentElement.style.colorScheme = 'light dark';
  }
  applyTheme();
  if (darkQuery) {
    var onScheme = function () { if (S.settings.theme === 'auto') applyTheme(); };
    if (darkQuery.addEventListener) darkQuery.addEventListener('change', onScheme); else if (darkQuery.addListener) darkQuery.addListener(onScheme);
  }
  function rememberPlayer(p) {
    S.saved = S.saved.filter(function (x) { return x.name.toLowerCase() !== p.name.toLowerCase(); });
    S.saved.unshift({ name: p.name, avatar: p.avatar, child: !!p.child });
    S.saved = S.saved.slice(0, 12);
    save();
  }

  // ---------- Sound and haptics ----------
  // All sounds live in sound.js. These short names are used around the game.
  WMSound.config(function () { return S.settings; });
  var Snd = {
    tone: function (f, dur, type, vol, delay) { WMSound.simple(f, dur, type, vol, delay); },
    tick: function (i) { WMSound.letter(i); },
    good: function (len) { WMSound.word(len); },
    bad: function () { WMSound.notWord(); },
    tally: function () { WMSound.tallyTick(); },
    cheer: function () { WMSound.win(); }
  };
  function buzz(ms) { if (S.settings.vibrate && navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} } }
  document.addEventListener('pointerdown', function () { WMSound.unlock(); }, { capture: true });

  // ---------- Dictionary and boards ----------
  var WORDS = [], WSET = null;
  // Easy mode: everyday words. They decide which boards are picked, the hints and the missed words.
  // Any real word still counts in Easy mode.
  var EASY = null;
  function isEasyWord(w) { return EASY ? EASY.has(w) : true; }
  function loadWords() {
    var inline = document.getElementById('wm-words');
    if (inline) {
      WORDS = inline.textContent.trim().split('\n');
      WSET = new Set(WORDS);
      var ie = document.getElementById('wm-easy');
      if (ie) EASY = new Set(ie.textContent.trim().split('\n'));
      return Promise.resolve();
    }
    fetch('words_easy.txt').then(function (r) { return r.ok ? r.text() : null; })
      .then(function (t) { if (t) EASY = new Set(t.trim().split('\n')); }).catch(function () {});
    return fetch('words.txt').then(function (r) {
      if (!r.ok) throw new Error('words');
      return r.text();
    }).then(function (t) {
      WORDS = t.split('\n');
      WSET = new Set(WORDS);
    });
  }
  function hasPrefix(p) {
    var lo = 0, hi = WORDS.length;
    while (lo < hi) { var mid = (lo + hi) >> 1; if (WORDS[mid] < p) lo = mid + 1; else hi = mid; }
    return lo < WORDS.length && WORDS[lo].lastIndexOf(p, 0) === 0;
  }
  var NEIGH = {};
  function neighbours(n) {
    if (NEIGH[n]) return NEIGH[n];
    var list = [];
    for (var i = 0; i < n * n; i++) {
      var r = Math.floor(i / n), c = i % n, a = [];
      for (var dr = -1; dr <= 1; dr++) for (var dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        var rr = r + dr, cc = c + dc;
        if (rr >= 0 && rr < n && cc >= 0 && cc < n) a.push(rr * n + cc);
      }
      list.push(a);
    }
    return (NEIGH[n] = list);
  }
  function solve(cells, n, minLen) {
    var found = new Map(), nb = neighbours(n), used = new Array(n * n).fill(false), cache = new Map(), path = [];
    function pre(p) { var v = cache.get(p); if (v === undefined) { v = hasPrefix(p); cache.set(p, v); } return v; }
    function go(i, word) {
      var w = word + cells[i];
      if (!pre(w)) return;
      used[i] = true; path.push(i);
      if (w.length >= minLen && WSET.has(w) && !found.has(w)) found.set(w, path.slice());
      var a = nb[i];
      for (var k = 0; k < a.length; k++) if (!used[a[k]]) go(a[k], w);
      used[i] = false; path.pop();
    }
    for (var i = 0; i < n * n; i++) go(i, '');
    return found;
  }
  var FREQ = 'a85b20c40d40e115f18g25h30i75j3k10l50m30n65o70p30q4r70s65t70u35v12w15x4y18z4';
  // Easy boards: more vowels and common letters, no J, Q, X or Z.
  var FREQ_EASY = 'a95b18c34d42e130f14g24h30i82j0k7l55m30n66o85p28q0r70s75t76u38v5w14x0y14z0';
  function makeBag(str) {
    var out = [], re = /([a-z])(\d+)/g, m, total = 0;
    while ((m = re.exec(str))) { if (+m[2]) { total += +m[2]; out.push([m[1], total]); } }
    return { list: out, total: total };
  }
  var BAG = makeBag(FREQ), BAG_EASY = makeBag(FREQ_EASY);
  function pickLetter(rand, bag) {
    bag = bag || BAG;
    var x = rand() * bag.total;
    for (var i = 0; i < bag.list.length; i++) if (x < bag.list[i][1]) return bag.list[i][0];
    return 'e';
  }
  function makeCells(n, rand, easy) {
    var size = n * n;
    for (var tries = 0; tries < 200; tries++) {
      var cells = [], counts = {}, vowels = 0, rare = 0, ok = true;
      for (var i = 0; i < size; i++) {
        var l = pickLetter(rand, easy ? BAG_EASY : BAG);
        counts[l] = (counts[l] || 0) + 1;
        if ('aeiou'.indexOf(l) >= 0) vowels++;
        if ('jkqvwxzy'.indexOf(l) >= 0) rare++;
        cells.push(l === 'q' ? 'qu' : l);
      }
      var maxSame = Math.max(2, Math.ceil(size / 8)), maxE = Math.max(3, Math.ceil(size / 6));
      for (var k in counts) if (counts[k] > (k === 'e' ? maxE : maxSame)) ok = false;
      if ((counts.q || 0) > 1) ok = false;
      if (rare > Math.ceil(size / 10)) ok = false;
      if (vowels < size * (easy ? 0.36 : 0.3) || vowels > size * (easy ? 0.5 : 0.45)) ok = false;
      if (ok) return cells;
    }
    return cells;
  }
  function countEasy(words) { var c = 0; words.forEach(function (p, w) { if (isEasyWord(w)) c++; }); return c; }
  function makeBoard(n, minLen, seed, easy) {
    var rand = rng(seed == null ? (Math.random() * 4294967296) >>> 0 : seed);
    // Easy boards are judged on how many everyday words they hold.
    var target = easy ? { 4: 70, 5: 170, 6: 300 }[n] : { 4: 40, 5: 110, 6: 200 }[n], best = null;
    var attempts = easy ? (n === 6 ? 25 : n === 5 ? 50 : 80) : (n === 6 ? 10 : 20);
    for (var a = 0; a < attempts; a++) {
      var cells = makeCells(n, rand, easy);
      var words = solve(cells, n, minLen);
      var score = easy ? countEasy(words) : words.size;
      if (!best || score > best.score) best = { cells: cells, words: words, score: score };
      if (score >= target) break;
    }
    return { n: n, minLen: minLen, cells: best.cells, words: best.words, easy: !!easy };
  }
  function boardFromCells(cells, n, minLen, easy) { return { n: n, minLen: minLen, cells: cells, words: solve(cells, n, minLen), easy: !!easy }; }

  // ---------- Modes ----------
  var MODES = {
    classic: { name: 'Classic', time: 180, desc: '3 minutes' },
    blitz: { name: 'Blitz', time: 60, desc: '1 minute, go fast' },
    survival: { name: 'Survival', time: 60, desc: 'Words add time to a shrinking clock' },
    rarity: { name: 'Rarity', time: 180, desc: 'Rare letters like Q, Z and X score big' },
    zen: { name: 'Zen', time: 0, desc: 'No timer, finish when you like' },
    party: { name: 'Party', time: 180, desc: '2 to 8 players' },
    daily: { name: 'Daily Puzzle', time: 180, desc: 'One board a day' }
  };
  var SURVIVAL_START = 60;
  function survivalBonus(len) { return 1 + 2 * pts(len); }
  function boardKey(mode, n, easy) { return mode === 'daily' ? 'daily:' + todayKey() : mode + ':' + n + (easy ? ':e' : ''); }
  // Two separate sets of scores:
  //  S.boards  - "This phone": games played on this phone.
  //  S.shared  - "Everyone": this phone's scores plus scores swapped with other phones in Party games.
  // Every score has an id so the same score is never counted twice when phones swap.
  var SHARED_PER_BOARD = 25;
  function byScore(a, b) { return b.score - a.score || a.at - b.at; }
  function newId() { return S.deviceId + ':' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function myKey() { return 'd:' + S.deviceId; }
  S.shared = S.shared || {};
  if (!S.sharedInit) {
    // First run with shared scores: give older scores ids and copy them in.
    Object.keys(S.boards).forEach(function (b) {
      (S.boards[b] || []).forEach(function (r, i) {
        if (!r.id) r.id = S.deviceId + ':old' + b + ':' + r.at + ':' + i;
        if (b !== 'daily:best') S.shared[r.id] = sharedEntry(b, r);
      });
    });
    S.sharedInit = true; save();
  }
  function sharedEntry(b, r) {
    return { id: r.id, b: b, key: r.key || '', name: r.name, avatar: r.avatar, score: r.score, words: r.words, minLen: r.minLen, at: r.at };
  }
  // The shared list for one leaderboard, best first. 'daily:best' is built from every daily puzzle.
  function sharedList(b) {
    var out = [];
    Object.keys(S.shared).forEach(function (id) {
      var r = S.shared[id];
      if (r.b === b || (b === 'daily:best' && r.b.indexOf('daily:') === 0)) out.push(r);
    });
    return out.sort(byScore);
  }
  function pruneShared() {
    var groups = {};
    Object.keys(S.shared).forEach(function (id) { var r = S.shared[id]; (groups[r.b] = groups[r.b] || []).push(r); });
    var keepDaily = {};
    sharedList('daily:best').slice(0, SHARED_PER_BOARD).forEach(function (r) { keepDaily[r.id] = true; });
    var cutoff = Date.now() - 45 * 864e5;
    Object.keys(groups).forEach(function (b) {
      groups[b].sort(byScore).forEach(function (r, i) {
        var old = b.indexOf('daily:') === 0 && r.at < cutoff && !keepDaily[r.id];
        if (i >= SHARED_PER_BOARD || old) delete S.shared[r.id];
      });
    });
  }
  // Adds scores received from another phone. Returns how many were new.
  function mergeShared(entries) {
    var added = 0;
    (Array.isArray(entries) ? entries : []).slice(0, 2000).forEach(function (e) {
      if (!e || typeof e.id !== 'string' || typeof e.b !== 'string' || S.shared[e.id]) return;
      if (!/^(classic|blitz|survival|rarity|party):[456](:e)?$|^daily:\d{4}-\d\d-\d\d$/.test(e.b)) return;
      var score = Math.max(0, Math.min(100000, Math.round(+e.score || 0)));
      S.shared[e.id.slice(0, 80)] = { id: e.id.slice(0, 80), b: e.b, key: String(e.key || '').slice(0, 60), name: String(e.name || 'Player').slice(0, 14), avatar: String(e.avatar || 'fox').slice(0, 20),
        score: score, words: Math.max(0, Math.round(+e.words || 0)), minLen: +e.minLen === 4 ? 4 : 3, at: +e.at || Date.now() };
      added++;
    });
    if (added) { pruneShared(); save(); }
    return added;
  }
  function allShared() { return Object.keys(S.shared).map(function (id) { return S.shared[id]; }); }
  // Saves one score to this phone's board and to the shared scores. Returns {best, id, key}.
  function addScore(mode, n, minLen, player, score, words, opts) {
    opts = opts || {};
    if (mode === 'zen') return { best: false };
    var key = boardKey(mode, n, opts.easy && mode !== 'daily');
    var at = opts.at || Date.now();
    var r = { id: opts.id || newId(), key: player.key || (player.me || player === S.profile ? myKey() : 'n:' + String(player.name).toLowerCase()),
      name: player.name, avatar: player.avatar, score: score, words: words, minLen: minLen, at: at };
    if (opts.easy && mode !== 'daily') r.easy = true;
    var list = S.boards[key] || [];
    if (list.some(function (x) { return x.id === r.id; })) return { best: false, id: r.id, key: key };
    if (mode === 'daily') {
      var all = S.boards['daily:best'] || [];
      all.push(Object.assign({ day: todayKey() }, r));
      all.sort(byScore);
      S.boards['daily:best'] = all.slice(0, 20);
    }
    var prevBest = list.length ? list[0].score : -1;
    list.push(r);
    list.sort(byScore);
    S.boards[key] = list.slice(0, 20);
    S.shared[r.id] = sharedEntry(key, r);
    pruneShared();
    save();
    return { best: score > prevBest && score > 0, id: r.id, key: key };
  }
  // Where a saved score ranks: on this phone and with everyone. null if it didn't make the list.
  function rankOf(id, b) {
    function pos(list) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return { pos: i + 1, of: list.length }; return null; }
    return { mine: pos(S.boards[b] || []), all: pos(sharedList(b)) };
  }

  // ---------- Word definitions ----------
  // Looked up from the free Wiktionary-based dictionary when online; saved so they work offline later.
  var DEF_KEY = 'wordmix.defs';
  function defCache() { try { return JSON.parse(localStorage.getItem(DEF_KEY)) || {}; } catch (e) { return {}; } }
  function saveDef(w, d) {
    var c = defCache(); c[w] = d;
    var keys = Object.keys(c);
    if (keys.length > 400) keys.slice(0, keys.length - 400).forEach(function (k) { delete c[k]; });
    try { localStorage.setItem(DEF_KEY, JSON.stringify(c)); } catch (e) {}
  }
  function baseForms(w) {
    var f = [w];
    if (/ies$/.test(w)) f.push(w.slice(0, -3) + 'y');
    if (/es$/.test(w)) f.push(w.slice(0, -2));
    if (/s$/.test(w) && !/ss$/.test(w)) f.push(w.slice(0, -1));
    if (/ied$/.test(w)) f.push(w.slice(0, -3) + 'y');
    if (/ed$/.test(w)) { f.push(w.slice(0, -2)); f.push(w.slice(0, -1)); if (/(.)\1ed$/.test(w)) f.push(w.slice(0, -3)); }
    if (/ing$/.test(w)) { f.push(w.slice(0, -3)); f.push(w.slice(0, -3) + 'e'); if (/(.)\1ing$/.test(w)) f.push(w.slice(0, -4)); }
    if (/er$/.test(w)) { f.push(w.slice(0, -2)); f.push(w.slice(0, -1)); }
    if (/est$/.test(w)) { f.push(w.slice(0, -3)); f.push(w.slice(0, -2)); }
    if (/ly$/.test(w)) f.push(w.slice(0, -2));
    if (/is(e|ed|es|ing|ation)$/.test(w)) f.push(w.replace(/is(e|ed|es|ing|ation)$/, 'iz$1'));
    if (/our/.test(w)) f.push(w.replace('our', 'or'));
    return f.filter(function (x, i) { return x.length >= 2 && f.indexOf(x) === i; });
  }
  function lookup(w) {
    var forms = baseForms(w), i = 0;
    function next() {
      if (i >= forms.length) return Promise.resolve(null);
      var f = forms[i++];
      return fetch('https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(f)).then(function (r) {
        if (r.status === 404) return next();
        if (!r.ok) throw new Error('lookup');
        return r.json().then(function (data) {
          var senses = [];
          (data || []).forEach(function (entry) {
            (entry.meanings || []).forEach(function (m) {
              (m.definitions || []).slice(0, 2).forEach(function (d) { if (senses.length < 4) senses.push({ pos: m.partOfSpeech || '', text: d.definition || '', ex: d.example || '' }); });
            });
          });
          return senses.length ? { base: f, senses: senses } : next();
        });
      });
    }
    return next();
  }
  function showDefinition(w) {
    var o = document.createElement('div');
    o.className = 'overlay';
    o.innerHTML = '<div class="sheet def-sheet" role="dialog" aria-modal="true" aria-label="Definition of ' + esc(w) + '"><div class="def-head"><h2 class="title">' + esc(w.toUpperCase()) + '</h2><span class="pts">' + plural(pts(w.length), 'pt', 'pts') + '</span></div><div data-defbody><div class="status"><span class="spinner"></span>Looking it up\u2026</div></div><button class="btn btn-white" data-close>Close</button></div>';
    app.appendChild(o);
    function close() { o.remove(); }
    $('[data-close]', o).onclick = close;
    o.addEventListener('click', function (e) { if (e.target === o) close(); });
    var body = $('[data-defbody]', o);
    function render(d) {
      if (!d) { body.innerHTML = '<p class="hint-text">No definition found for this word. It\u2019s in Word Mix\u2019s word list, but the online dictionary doesn\u2019t have an entry for it.</p>'; return; }
      body.innerHTML = (d.base !== w ? '<p class="hint-text">From <b>' + esc(d.base) + '</b></p>' : '') +
        '<ol class="defs">' + d.senses.map(function (x) { return '<li><span class="pos">' + esc(x.pos) + '</span> ' + esc(x.text) + (x.ex ? '<em>\u201c' + esc(x.ex) + '\u201d</em>' : '') + '</li>'; }).join('') + '</ol>' +
        '<p class="hint-text def-src">Definitions from Wiktionary via the Free Dictionary API.</p>';
    }
    var cached = defCache()[w];
    if (cached !== undefined) { render(cached); return; }
    if (navigator.onLine === false) { body.innerHTML = '<p class="hint-text">Definitions need the internet the first time. Once you\u2019ve looked a word up, it works offline too.</p>'; return; }
    lookup(w).then(function (d) { saveDef(w, d); if (o.isConnected) render(d); }, function () {
      if (o.isConnected) body.innerHTML = '<p class="hint-text">Couldn\u2019t reach the dictionary. Definitions need the internet the first time you look a word up.</p>';
    });
  }
  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-def]');
    if (t && !e.target.closest('.board')) showDefinition(t.getAttribute('data-def'));
  });
  document.addEventListener('keydown', function (e) {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.getAttribute && e.target.getAttribute('data-def')) { e.preventDefault(); showDefinition(e.target.getAttribute('data-def')); }
  });

  // ---------- Keep the screen awake during play and nearby setup ----------
  var wake = { lock: null, want: false };
  function keepAwake(on) {
    wake.want = on;
    if (!('wakeLock' in navigator)) return;
    if (on && !wake.lock && !document.hidden) {
      navigator.wakeLock.request('screen').then(function (l) { wake.lock = l; l.addEventListener('release', function () { wake.lock = null; }); }).catch(function () {});
    } else if (!on && wake.lock) { wake.lock.release().catch(function () {}); wake.lock = null; }
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden && wake.want) keepAwake(true); });

  // ---------- Screen management ----------
  var current = null;
  function mount(html, cls) {
    if (current && current.cleanup) { try { current.cleanup(); } catch (e) {} }
    var old = $$('.screen', app).filter(function (s) { return !s.classList.contains('leaving'); });
    old.forEach(function (s) { s.classList.add('leaving'); setTimeout(function () { s.remove(); }, 280); });
    window.WM_AT_HOME = false;
    keepAwake(true);
    var el = document.createElement('section');
    el.className = 'screen' + (cls ? ' ' + cls : '');
    el.innerHTML = html;
    app.appendChild(el);
    current = { el: el, cleanup: null };
    return current;
  }
  function toast(msg, ms) {
    var t = document.createElement('div');
    t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg;
    app.appendChild(t);
    setTimeout(function () { t.remove(); }, ms || 2600);
  }
  function logo(big, intro) {
    var letters = 'WORDMIX'.split(''), html = '';
    letters.forEach(function (ch, i) {
      if (i === 4) html += '<span class="gap"></span>';
      var r = (i % 2 ? 4 : -4) + 'deg';
      html += '<span class="lt" style="--r:' + r + ';transform:rotate(' + r + ');animation-delay:' + (intro ? i * 0.11 : 0) + 's"><span style="animation-delay:' + (i * 0.25) + 's">' + ch + '</span></span>';
    });
    return '<div class="logo' + (big ? ' big' : '') + (intro ? ' intro' : '') + '" role="img" aria-label="Word Mix">' + html + '</div>';
  }
  function backBand(title, extra) {
    return '<header class="band"><div class="band-row"><button class="icon-btn" data-back aria-label="Back">' + I.back + '</button><h1>' + esc(title) + '</h1><div style="width:44px;display:flex;justify-content:flex-end">' + (extra || '') + '</div></div></header>';
  }
  function avatar(id, size) { return WMAvatars.svg(id, size); }
  function confirmBox(text, yes, no) {
    return new Promise(function (res) {
      var o = document.createElement('div');
      o.className = 'overlay center';
      o.innerHTML = '<div class="dialog" role="dialog" aria-modal="true"><h2 class="title">' + esc(text) + '</h2><button class="btn btn-orange" data-y>' + esc(yes) + '</button><button class="btn btn-white" data-n>' + esc(no) + '</button></div>';
      app.appendChild(o);
      o.querySelector('[data-y]').onclick = function () { o.remove(); res(true); };
      o.querySelector('[data-n]').onclick = function () { o.remove(); res(false); };
    });
  }

  // ---------- Profile ----------
  function profileEditor(opts) {
    // opts: {title, name, avatar, button, onSave, onBack}
    var sel = opts.avatar || WMAvatars.list[Math.floor(Math.random() * WMAvatars.list.length)].id;
    var scr = mount(
      (opts.onBack ? backBand(opts.title) : '<header class="band" style="align-items:center;padding-top:calc(28px + env(safe-area-inset-top));padding-bottom:26px">' + logo(true, true) + '</header>') +
      '<div class="scroll">' +
      (opts.onBack ? '' : '<h2 class="title">' + esc(opts.title) + '</h2>') +
      '<label class="label" for="pname">Name</label>' +
      '<input id="pname" class="text-input" maxlength="14" autocomplete="off" placeholder="Your name" value="' + esc(opts.name || '') + '">' +
      '<span class="label">Avatar</span><div class="avatar-grid">' +
      WMAvatars.list.map(function (a) { return '<button type="button" data-av="' + a.id + '" aria-label="' + a.name + '" aria-pressed="' + (a.id === sel) + '">' + avatar(a.id, 72) + '</button>'; }).join('') +
      '</div><button class="btn btn-orange" data-save style="margin-top:6px">' + esc(opts.button || 'Save') + '</button></div>'
    );
    var el = scr.el;
    on(el, '[data-av]', 'click', function (e) {
      sel = e.currentTarget.getAttribute('data-av');
      $$('[data-av]', el).forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-av') === sel)); });
      Snd.tick(3);
    });
    on(el, '[data-back]', 'click', function () { opts.onBack(); });
    $('[data-save]', el).onclick = function () {
      var name = $('#pname', el).value.trim().replace(/\s+/g, ' ');
      if (!name) { $('#pname', el).focus(); toast('Type a name first'); return; }
      opts.onSave({ name: name, avatar: sel });
    };
  }
  function editMyProfile(back) {
    profileEditor({
      title: S.profile ? 'Your profile' : 'Welcome! Who’s playing?',
      name: S.profile && S.profile.name, avatar: S.profile && S.profile.avatar,
      button: S.profile ? 'Save' : 'Let’s play',
      onBack: S.profile ? back : null,
      onSave: function (p) { p.child = !!(S.profile && S.profile.child); S.profile = p; rememberPlayer(p); save(); (back || home)(); }
    });
  }

  // ---------- Home ----------
  function home() {
    if (!S.profile) return editMyProfile(home);
    if (window.WM_PENDING_RELOAD) { location.reload(); return; }
    var today = S.daily[todayKey()];
    var scr = mount(
      '<header class="band" style="padding-bottom:24px">' +
      '<div class="band-row"><button class="player-chip" data-profile aria-label="Edit profile">' + avatar(S.profile.avatar, 40) + '<span>' + esc(S.profile.name) + '</span></button>' +
      '<button class="icon-btn" data-settings aria-label="Settings">' + I.gear + '</button></div>' +
      '<div style="display:flex;justify-content:center;padding:8px 0 4px">' + logo(true, true) + '</div></header>' +
      '<div class="scroll home-grid">' +
      choice('solo', I.user, '#FFE2C7', '#C8530F', 'Play solo', 'Classic, Blitz, Survival or Zen') +
      choice('party', I.users, '#DCE8FF', '#1E4FA8', 'Party mode', '2 to 8 players, one phone or many') +
      choice('daily', I.calendar, '#DDF0E8', '#2E7D1E', 'Daily Puzzle', today ? 'Played today: ' + plural(today.score, 'point', 'points') : 'Today’s board, your first try counts') +
      '<button class="btn btn-white" data-boards>' + I.trophy + 'Leaderboards</button>' +
      '</div>'
    );
    var el = scr.el;
    function choice(id, icon, bg, fg, title, sub) {
      return '<button class="big-choice" data-go="' + id + '"><span class="ic" style="background:' + bg + ';color:' + fg + '">' + icon + '</span><span><b>' + title + '</b><small>' + esc(sub) + '</small></span></button>';
    }
    $('[data-profile]', el).onclick = function () { editMyProfile(home); };
    $('[data-settings]', el).onclick = function () { settings(home); };
    $('[data-boards]', el).onclick = function () { leaderboards(home); };
    window.WM_AT_HOME = true;
    keepAwake(false);
    on(el, '[data-go]', 'click', function (e) {
      var go = e.currentTarget.getAttribute('data-go');
      if (go === 'solo') setup('solo');
      else if (go === 'party') party();
      else startDaily();
    });
  }

  function party() {
    var scr = mount(backBand('Party mode') + '<div class="scroll">' +
      '<p class="hint-text">Everyone plays the same board. Words only you found score double.</p>' +
      '<button class="big-choice" data-pass><span class="ic" style="background:#FFE2C7;color:#C8530F">' + I.users + '</span><span><b>One phone</b><small>Pass and play, 2 to 8 players</small></span></button>' +
      '<button class="big-choice" data-near><span class="ic" style="background:#DCE8FF;color:#1E4FA8">' + I.wifi + '</span><span><b>Phone to phone</b><small>Up to 8 phones, no internet needed</small></span></button>' +
      '</div>');
    on(scr.el, '[data-back]', 'click', home);
    $('[data-pass]', scr.el).onclick = function () { setup('pass'); };
    $('[data-near]', scr.el).onclick = nearby;
  }

  // ---------- Game setup ----------
  var MAX_PLAYERS = 8;
  function setup(kind) {
    var isParty = kind !== 'solo';
    var cfg = { mode: isParty ? 'party' : (['classic', 'blitz', 'survival', 'rarity', 'zen'].indexOf(S.last.mode) >= 0 ? S.last.mode : 'classic'), size: S.last.size, minLen: S.last.minLen, partyTime: S.last.partyTime || 180, scoring: S.last.scoring || 'length', easy: !!S.last.easy };
    var players = kind === 'pass' ? (setup.players || [S.profile]) : null;
    if (kind === 'pass') setup.players = players;
    var titles = { solo: 'Play solo', pass: 'Pass and play', host: 'Host a game' };
    var scr = mount(backBand(titles[kind]) + '<div class="scroll" data-body></div>');
    var el = scr.el;
    on(el, '[data-back]', 'click', function () { kind === 'host' ? nearby() : kind === 'pass' ? party() : home(); });
    function render() {
      var html = '';
      if (!isParty) {
        html += '<span class="label">Mode</span><div class="modes">' +
          ['classic', 'blitz', 'survival', 'rarity', 'zen'].map(function (m) { return '<button class="mode" data-mode="' + m + '" aria-pressed="' + (cfg.mode === m) + '"><b>' + MODES[m].name + '</b><small>' + MODES[m].desc + '</small></button>'; }).join('') + '</div>';
        if (cfg.mode === 'rarity') html += '<p class="hint-text">3 minutes. Each letter has a value: common ones like E, A and S are 1 point, rarer ones more, up to 10 for Q and Z. A word scores the total of its letters.</p>';
        if (cfg.mode === 'survival') html += '<p class="hint-text">Start with 1 minute. Every word adds time: 3 letters +3s, 4 letters +5s, 5 letters +7s, and more for longer words. The clock speeds up as you go.</p>';
      } else {
        html += '<span class="label">Round length</span><div class="seg">' +
          [[60, '1 min'], [120, '2 min'], [180, '3 min']].map(function (t) { return '<button data-ptime="' + t[0] + '" aria-pressed="' + (cfg.partyTime === t[0]) + '">' + t[1] + '</button>'; }).join('') + '</div>' +
          '<span class="label">Scoring</span><div class="seg">' +
          '<button data-scoring="length" aria-pressed="' + (cfg.scoring !== 'rarity') + '">By length</button><button data-scoring="rarity" aria-pressed="' + (cfg.scoring === 'rarity') + '">By rarity</button></div>' +
          '<p class="hint-text">' + (cfg.scoring === 'rarity' ? 'Words score the value of their letters: E, A, S are 1 point, Q and Z are 10.' : '3 letters 1 point, 4 letters 2, 5 letters 3, then 1 more per extra letter.') + ' Words only you found score double.</p>';
      }
      html += '<span class="label">Difficulty</span><div class="seg">' +
        '<button data-easy="0" aria-pressed="' + !cfg.easy + '">Normal</button><button data-easy="1" aria-pressed="' + !!cfg.easy + '">Easy</button></div>' +
        (cfg.easy ? '<p class="hint-text">Easy boards have more vowels and everyday words. Hints and missed words use everyday words. Any real word still counts. Easy scores have their own leaderboards.</p>' : '');
      html += '<span class="label">Board size</span><div class="seg">' +
        [4, 5, 6].map(function (n) { return '<button data-size="' + n + '" aria-pressed="' + (cfg.size === n) + '">' + n + ' × ' + n + '</button>'; }).join('') + '</div>' +
        '<span class="label">Shortest word</span><div class="seg">' +
        [3, 4].map(function (n) { return '<button data-min="' + n + '" aria-pressed="' + (cfg.minLen === n) + '">' + n + ' letters</button>'; }).join('') + '</div>';
      if (kind === 'host') {
        html += '<span class="label">This device</span><div class="seg">' +
          '<button data-screen="0" aria-pressed="' + !cfg.screenOnly + '">Plays too</button><button data-screen="1" aria-pressed="' + !!cfg.screenOnly + '">Big screen only</button></div>' +
          '<p class="hint-text">' + (cfg.screenOnly ? 'This screen shows the board, the live word counts and the animated results, like a TV. Everyone else plays on their phones. Best on an iPad or laptop placed where everyone can see it.' : 'You play on this device too, and it shows the animated results at the end of each round.') + '</p>';
      }
      if (kind === 'pass') {
        html += '<span class="label">Players (' + players.length + ' of ' + MAX_PLAYERS + ')</span><div class="players">' +
          players.map(function (p, i) { return '<div class="prow">' + avatar(p.avatar, 44) + '<b>' + esc(p.name) + '</b>' +
            '<button class="child-tick" data-child="' + i + '" aria-pressed="' + !!p.child + '">' + (p.child ? '\u2713 ' : '') + 'Child</button>' +
            (players.length > 1 ? '<button class="x" data-rm="' + i + '" aria-label="Remove ' + esc(p.name) + '">' + I.close + '</button>' : '') + '</div>'; }).join('') +
          '</div>' + (players.length < MAX_PLAYERS ? '<button class="btn btn-white" data-add>' + I.plus + 'Add player</button>' : '') +
          '<p class="hint-text">Tick Child for younger players: they get 3 and 4-letter hints and their words score double.</p>';
      }
      var ready = kind !== 'pass' || players.length >= 2;
      html += '<button class="btn btn-orange" data-start ' + (ready ? '' : 'disabled') + ' style="margin-top:6px">' + (kind === 'host' ? 'Next: invite players' : 'Start') + '</button>';
      if (kind === 'pass' && !ready) html += '<p class="hint-text" style="text-align:center">Add at least one more player.</p>';
      var body = $('[data-body]', el);
      body.innerHTML = html;
      on(body, '[data-mode]', 'click', function (e) { cfg.mode = e.currentTarget.getAttribute('data-mode'); render(); });
      on(body, '[data-ptime]', 'click', function (e) { cfg.partyTime = +e.currentTarget.getAttribute('data-ptime'); render(); });
      on(body, '[data-screen]', 'click', function (e) { cfg.screenOnly = e.currentTarget.getAttribute('data-screen') === '1'; render(); });
      on(body, '[data-scoring]', 'click', function (e) { cfg.scoring = e.currentTarget.getAttribute('data-scoring'); render(); });
      on(body, '[data-size]', 'click', function (e) { cfg.size = +e.currentTarget.getAttribute('data-size'); render(); });
      on(body, '[data-easy]', 'click', function (e) { cfg.easy = e.currentTarget.getAttribute('data-easy') === '1'; render(); });
      on(body, '[data-min]', 'click', function (e) { cfg.minLen = +e.currentTarget.getAttribute('data-min'); render(); });
      on(body, '[data-child]', 'click', function (e) {
        var p = players[+e.currentTarget.getAttribute('data-child')];
        p.child = !p.child;
        if (p === S.profile || p.name === S.profile.name) { S.profile.child = p.child; save(); }
        else rememberPlayer(p);
        render();
      });
      on(body, '[data-rm]', 'click', function (e) { players.splice(+e.currentTarget.getAttribute('data-rm'), 1); render(); });
      on(body, '[data-add]', 'click', function () { addPlayerSheet(players, render); });
      $('[data-start]', body).onclick = function () {
        S.last = { mode: isParty ? S.last.mode : cfg.mode, size: cfg.size, minLen: cfg.minLen, partyTime: cfg.partyTime, scoring: cfg.scoring, easy: !!cfg.easy }; save();
        var c = finalCfg(cfg);
        if (kind === 'solo') playSolo(c);
        else if (kind === 'pass') { setup.players = players; playPass(c, players); }
        else hostLobby(c);
      };
    }
    render();
  }
  function finalCfg(cfg) {
    if (cfg.mode === 'daily') return { mode: 'daily', n: 4, minLen: 3, time: 180, seed: hashStr('wordmix-' + todayKey()), scoring: 'length' };
    return {
      mode: cfg.mode, n: cfg.size, minLen: cfg.minLen, seed: null,
      scoring: cfg.mode === 'rarity' ? 'rarity' : cfg.mode === 'party' ? (cfg.scoring || 'length') : 'length',
      time: cfg.mode === 'party' ? (cfg.partyTime || 180) : MODES[cfg.mode].time,
      survival: cfg.mode === 'survival',
      easy: !!cfg.easy,
      screenOnly: !!cfg.screenOnly
    };
  }
  function startDaily() {
    var cfg = finalCfg({ mode: 'daily' });
    var done = S.daily[todayKey()];
    if (!done) return playSolo(cfg);
    confirmBox('You scored ' + plural(done.score, 'point', 'points') + ' on today’s puzzle. Play again for practice? It won’t count.', 'Practice', 'Not now').then(function (y) {
      if (y) { cfg.practice = true; playSolo(cfg); }
    });
  }
  function addPlayerSheet(players, done) {
    var names = players.map(function (p) { return p.name.toLowerCase(); });
    var saved = S.saved.filter(function (p) { return names.indexOf(p.name.toLowerCase()) < 0; });
    var o = document.createElement('div');
    o.className = 'overlay';
    o.innerHTML = '<div class="sheet" role="dialog" aria-modal="true"><h2 class="title">Add a player</h2>' +
      (saved.length ? '<span class="label">Recent players</span><div class="players">' + saved.map(function (p, i) { return '<button class="prow" style="border:0;text-align:left;width:100%" data-pick="' + i + '">' + avatar(p.avatar, 44) + '<b>' + esc(p.name) + '</b></button>'; }).join('') + '</div>' : '') +
      '<button class="btn btn-orange" data-new>' + I.plus + 'New player</button><button class="btn btn-ghost" data-close>Cancel</button></div>';
    app.appendChild(o);
    on(o, '[data-pick]', 'click', function (e) { players.push(saved[+e.currentTarget.getAttribute('data-pick')]); o.remove(); done(); });
    $('[data-close]', o).onclick = function () { o.remove(); };
    $('[data-new]', o).onclick = function () {
      o.remove();
      var back = function () { setup('pass'); };
      profileEditor({
        title: 'New player', button: 'Add player', onBack: back,
        onSave: function (p) {
          if (players.some(function (x) { return x.name.toLowerCase() === p.name.toLowerCase(); })) { toast('That name is already playing'); return; }
          if (players.length >= MAX_PLAYERS) return setup('pass'); rememberPlayer(p); players.push(p); setup.players = players; setup('pass');
        }
      });
    };
  }

  // ---------- The game ----------
  // Round start: the letters shake, the tiles land, then beep, beep, BEEP. full=false plays only the beeps.
  // Always the same length, so every phone in a Party game starts together.
  function countdown(parent, o) {
    o = o || {};
    var n = o.n || 4;
    return new Promise(function (res) {
      var ov = document.createElement('div');
      ov.className = 'overlay center';
      ov.style.background = 'var(--orange)';
      ov.innerHTML = '<div class="deal-wrap"><div class="countdown cd-slot" data-cd aria-live="assertive"></div>' +
        '<div class="deal shake" style="grid-template-columns:repeat(' + n + ',1fr)">' + new Array(n * n + 1).join('<i></i>') + '</div>' +
        '<p class="deal-cap" data-cap>Mixing the letters\u2026</p></div>';
      parent.appendChild(ov);
      var deal = $('.deal', ov), cd = $('[data-cd]', ov), cap = $('[data-cap]', ov);
      WMSound.roundStart({
        full: o.full !== false, tiles: n * n,
        drop: function (i) { if (i === 0) { deal.classList.remove('shake'); deal.classList.add('dropping'); } var t = deal.children[i]; if (t) t.classList.add('in'); },
        beat: function (i) { cap.textContent = ''; cd.textContent = i === 2 ? 'Go!' : String(3 - i); cd.classList.remove('cd-pop'); void cd.offsetWidth; cd.classList.add('cd-pop'); buzz(i === 2 ? 40 : 15); },
        go: function () { ov.style.pointerEvents = 'none'; ov.classList.add('cd-out'); setTimeout(function () { ov.remove(); }, 320); res(); }
      });
    });
  }

  // opts: {board, cfg, player, label, multiplayer, onEnd(result), onQuit}
  function playBoard(opts) {
    var b = opts.board, cfg = opts.cfg, n = b.n;
    var timed = cfg.time > 0;
    var scr = mount(
      '<header class="band game-band"><div class="band-row">' +
      '<div style="display:flex;align-items:center;gap:10px;min-width:0">' + avatar(opts.player.avatar, 40) + '<b style="color:#FFF;font-size:18px;font-weight:800;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(opts.label || opts.player.name) + '</b></div>' +
      '<div style="display:flex;gap:8px">' + (timed ? '' : '<button class="band-btn" data-finish>Finish</button>') +
      '<button class="icon-btn" data-menu aria-label="Game menu">' + I.menu + '</button></div></div>' +
      '<div style="display:flex;gap:10px">' +
      (timed ? '<div class="stat"><span class="clock" data-clock>0:00</span><div class="bar"><i data-bar></i></div></div>' : '<div class="stat"><span class="clock">Zen</span><span style="font-weight:700;color:var(--muted);font-size:14px">No timer</span></div>') +
      '<div class="count" data-count><b>0</b><small>words</small></div></div></header>' +
      '<div class="wordbar"><div class="w placeholder" data-word>Swipe to start</div><div class="m" data-msg aria-live="polite">Lift your finger to submit</div></div>' +
      '<div class="board-wrap" data-wrap><div class="hint-row" data-foot></div><div class="board-panel"><div class="board" data-board style="--n:' + n + '"></div></div></div>' +
      '<div class="game-foot"></div>'
    , 'game');
    var el = scr.el;
    var boardEl = $('[data-board]', el), wordEl = $('[data-word]', el), msgEl = $('[data-msg]', el), foot = $('[data-foot]', el);
    var cellsEl = [], tilesEl = [];
    b.cells.forEach(function (c, i) {
      var cell = document.createElement('div');
      cell.className = 'cell intro';
      cell.style.animationDelay = ((Math.floor(i / n) + (i % n)) * 0.07) + 's';
      var t = document.createElement('div');
      t.className = 'tile' + (c === 'qu' ? ' qu' : '');
      t.textContent = c === 'qu' ? 'Qu' : c.toUpperCase();
      t.setAttribute('aria-label', 'Letter ' + (c === 'qu' ? 'Q U' : c.toUpperCase()));
      cell.appendChild(t); boardEl.appendChild(cell);
      cellsEl.push(cell); tilesEl.push(t);
    });
    var svgNS = 'http://www.w3.org/2000/svg';
    var trail = document.createElementNS(svgNS, 'svg'); trail.setAttribute('class', 'trail'); trail.setAttribute('aria-hidden', 'true');
    var poly = document.createElementNS(svgNS, 'polyline'); trail.appendChild(poly); boardEl.appendChild(trail);

    var geo = { side: 0, gap: 0, tile: 0, pitch: 0 };
    function layout() {
      var wrap = $('[data-wrap]', el);
      // In landscape the hint sits beside the board; in portrait, just above it.
      var land = window.matchMedia('(orientation: landscape) and (min-width: 600px)').matches;
      var hrow = $('[data-foot]', el), wbar = $('.wordbar', el);
      if (land && hrow.parentNode !== el) el.insertBefore(hrow, wbar.nextSibling);
      if (!land && hrow.parentNode !== wrap) wrap.insertBefore(hrow, wrap.firstChild);
      var cs = getComputedStyle(wrap), hr = $('.hint-row', wrap);
      var w = wrap.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight), h = wrap.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - (hr ? hr.offsetHeight : 0);
      var side = Math.max(180, Math.min(w, h, 720)) - 16;
      var gap = Math.round(side * (n === 4 ? 0.03 : 0.022));
      var tile = (side - gap * (n - 1)) / n;
      geo = { side: side, gap: gap, tile: tile, pitch: tile + gap };
      boardEl.style.width = side + 'px'; boardEl.style.height = side + 'px';
      boardEl.style.setProperty('--gap', gap + 'px');
      boardEl.style.setProperty('--ts', tile + 'px');
      trail.setAttribute('viewBox', '0 0 ' + side + ' ' + side);
      trail.setAttribute('width', side); trail.setAttribute('height', side);
      poly.setAttribute('stroke-width', Math.max(8, tile * 0.16));
      drawTrail();
    }
    window.addEventListener('resize', layout);
    requestAnimationFrame(layout);

    var found = [], foundSet = new Set(), path = [], dragging = false, ended = false, hintsUsed = 0;
    function wordOf(p) { return p.map(function (i) { return b.cells[i]; }).join(''); }
    function center(i) { return [(i % n) * geo.pitch + geo.tile / 2, Math.floor(i / n) * geo.pitch + geo.tile / 2]; }
    function drawTrail() {
      poly.setAttribute('points', path.length > 1 ? path.map(function (i) { return center(i).join(','); }).join(' ') : '');
    }
    function cellAt(e, loose) {
      var r = boardEl.getBoundingClientRect();
      var s = geo.side / r.width;
      var x = (e.clientX - r.left) * s, y = (e.clientY - r.top) * s;
      var c = Math.floor(x / geo.pitch), row = Math.floor(y / geo.pitch);
      if (c < 0 || c >= n || row < 0 || row >= n) return -1;
      if (!loose) {
        var dx = x - (c * geo.pitch + geo.tile / 2), dy = y - (row * geo.pitch + geo.tile / 2);
        if (Math.sqrt(dx * dx + dy * dy) > geo.tile * 0.42) return -1;
      }
      return row * n + c;
    }
    function adj(a, c) { return a !== c && Math.abs(Math.floor(a / n) - Math.floor(c / n)) <= 1 && Math.abs(a % n - c % n) <= 1; }
    function paint() {
      var w = wordOf(path);
      var valid = w.length >= b.minLen && WSET.has(w) && !foundSet.has(w);
      tilesEl.forEach(function (t, i) {
        var s = path.indexOf(i) >= 0;
        t.classList.toggle('sel', s);
        t.classList.toggle('valid', s && valid);
      });
      poly.setAttribute('stroke', valid ? '#2E7D1E' : '#F26B21');
      drawTrail();
      if (path.length) {
        wordEl.className = 'w' + (valid ? ' valid' : '');
        wordEl.textContent = w.toUpperCase();
        msgEl.className = 'm'; msgEl.textContent = '';
      }
    }
    function setMsg(text, kind, wordText) {
      wordEl.className = 'w ' + (wordText ? kind : 'placeholder');
      wordEl.textContent = wordText || 'Swipe to start';
      msgEl.className = 'm fadein ' + (kind || '');
      msgEl.textContent = text;
      if (kind === 'bad') { wordEl.classList.remove('shake'); void wordEl.offsetWidth; wordEl.classList.add('shake'); }
    }
    function submit() {
      var p = path.slice(); path = []; paint();
      var w = wordOf(p);
      if (p.length < 2) { return; }
      var W = w.toUpperCase();
      if (w.length < b.minLen) { setMsg('Words need ' + b.minLen + ' or more letters', 'bad', W); Snd.bad(); buzz(30); return; }
      if (!WSET.has(w)) { setMsg('Not in the word list', 'bad', W); Snd.bad(); buzz(30); return; }
      if (foundSet.has(w)) { setMsg('Already found', 'bad', W); WMSound.again(); buzz(30); return; }
      foundSet.add(w); found.push(w);
      setMsg(['Nice!', 'Got it!', 'Good one!', 'Yes!', 'Lovely!'][found.length % 5], 'good', W);
      if (cfg.survival) addTime(survivalBonus(w.length));
      if (opts.onWord) opts.onWord(found.length);
      Snd.good(w.length); buzz(15);
      var cnt = $('[data-count]', el); $('b', cnt).textContent = found.length;
      cnt.classList.remove('pop'); void cnt.offsetWidth; cnt.classList.add('pop');
      p.forEach(function (i, k) {
        var t = tilesEl[i];
        t.classList.remove('cheer'); void t.offsetWidth;
        t.style.animationDelay = (k * 0.09) + 's';
        t.classList.add('cheer');
        setTimeout(function () { t.classList.remove('cheer'); t.style.animationDelay = ''; }, 1000 + k * 90);
      });
    }
    boardEl.addEventListener('pointerdown', function (e) {
      if (ended || paused) return;
      e.preventDefault();
      try { boardEl.setPointerCapture(e.pointerId); } catch (err) {}
      var c = cellAt(e, true);
      if (c < 0) return;
      dragging = true; path = [c]; badCell = -1; paint(); Snd.tick(0); buzz(6);
    });
    boardEl.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var c = cellAt(e, false);
      if (c < 0) return;
      var last = path[path.length - 1];
      if (c === last) return;
      if (path.length > 1 && c === path[path.length - 2]) { path.pop(); paint(); Snd.tick(path.length - 1); return; }
      if (path.indexOf(c) < 0 && adj(last, c)) { path.push(c); paint(); Snd.tick(path.length - 1); buzz(6); badCell = -1; }
      else if (c !== badCell) { badCell = c; WMSound.badMove(); }
    });
    var badCell = -1;
    function up() { if (!dragging) return; dragging = false; submit(); }
    boardEl.addEventListener('pointerup', up);
    boardEl.addEventListener('pointercancel', up);

    // Hints: after a touch, wait for the idle delay; then offer a Hint button for 3 seconds.
    var lastTouch = Date.now(), armed = true, hintBtnUntil = 0, hintGlowUntil = 0, hintPath = null;
    function touched() { lastTouch = Date.now(); armed = true; if (hintBtnUntil) hideHintBtn(); }
    el.addEventListener('pointerdown', function (e) { if (!e.target.closest('[data-hint]')) touched(); }, true);
    function showHintBtn() {
      hintBtnUntil = Date.now() + 3000;
      foot.innerHTML = '<button class="hint-btn" data-hint aria-label="Show a hint">' + I.bulb + '<span>Hint</span></button>';
      Snd.tone(1318, 0.08, 'sine', 0.035);
      $('[data-hint]', foot).onclick = useHint;
    }
    function hideHintBtn() {
      hintBtnUntil = 0;
      var btn = $('[data-hint]', foot);
      if (btn) { btn.classList.add('out'); setTimeout(function () { if (!hintBtnUntil) foot.innerHTML = ''; }, 450); }
    }
    function useHint() {
      hideHintBtn();
      lastTouch = Date.now(); armed = true;
      var pool = [];
      var child = !!(opts.player && opts.player.child);
      function lenOk(w) { return child ? w.length <= 4 : (!S.settings.hint3 || w.length === 3); }
      b.words.forEach(function (p, w) { if (!foundSet.has(w) && lenOk(w) && (!b.easy || isEasyWord(w))) pool.push(p); });
      if (!pool.length) { setMsg(child ? 'No 3 or 4-letter words left to hint' : S.settings.hint3 ? 'No 3-letter words left to hint' : 'No words left to hint', 'hint'); return; }
      hintsUsed++;
      hintPath = pool[Math.floor(Math.random() * pool.length)];
      hintPath.forEach(function (i) { tilesEl[i].classList.add('hinted'); });
      hintGlowUntil = Date.now() + 3000;
      setMsg('Hint: trace the glowing tiles', 'hint');
      Snd.tone(988, 0.15, 'sine', 0.06);
    }
    function clearHintGlow() {
      if (hintPath) hintPath.forEach(function (i) { tilesEl[i].classList.remove('hinted'); });
      hintPath = null; hintGlowUntil = 0;
    }

    // Timer and menu. The clock starts once the 3-2-1 countdown is over.
    // `left` counts down by real time; Survival drains faster the longer you last.
    var started = false, paused = false, left = cfg.time * 1000, maxLeft = cfg.time * 1000, lastNow = 0, elapsed = 0;
    // Music and the ticking play on the phone that runs the round (not on players' phones in Party).
    var ambient = opts.ambient !== false, lastHalf = -1;
    function start() {
      if (started || ended) return;
      started = true; lastNow = Date.now(); lastTouch = Date.now(); armed = true;
      if (ambient) WMSound.music.want(true);
    }
    function addTime(secs) {
      left += secs * 1000; maxLeft = Math.max(maxLeft, left);
      var st = $('.stat', el);
      var tag = document.createElement('span');
      tag.className = 'plus-time'; tag.textContent = '+' + secs + 's';
      st.appendChild(tag); setTimeout(function () { tag.remove(); }, 1500);
    }
    var clockEl = $('[data-clock]', el), barEl = $('[data-bar]', el);
    function fmt(ms) { var s = Math.ceil(ms / 1000), m = Math.floor(s / 60); s %= 60; return m + ':' + (s < 10 ? '0' : '') + s; }
    var lastBeep = -1;
    function tick() {
      if (ended) return;
      var now = Date.now();
      if (!started) { if (timed) { clockEl.textContent = fmt(cfg.time * 1000); barEl.style.transform = 'scaleX(1)'; } return; }
      var dt = now - lastNow; lastNow = now;
      if (timed && !paused) {
        elapsed += dt;
        var speed = cfg.survival ? Math.min(2.5, 1 + elapsed / 120000) : 1;
        left = Math.max(0, left - dt * speed);
        clockEl.textContent = fmt(left);
        barEl.style.transform = 'scaleX(' + (left / maxLeft) + ')';
        var secs = Math.ceil(left / 1000), half = Math.ceil(left / 500);
        if (left > 0 && left <= 10000) {
          if (ambient) WMSound.music.setUrgency(1 - left / 10000);
          if (half !== lastHalf) { lastHalf = half; if (ambient) WMSound.lastTen(half % 2); }
        } else if (lastHalf !== -1) { lastHalf = -1; WMSound.music.setUrgency(0); }
        if (secs <= 3 && secs > 0 && secs !== lastBeep) { lastBeep = secs; WMSound.urgent(3 - secs); }
        if (secs > 3) lastBeep = -1;
        if (left <= 0) { finish(); return; }
      }
      if (hintGlowUntil && now >= hintGlowUntil) clearHintGlow();
      if (hintBtnUntil && now >= hintBtnUntil) hideHintBtn();
      var delay = S.settings.hintDelay;
      if (!paused && delay > 0 && armed && !dragging && !hintBtnUntil && !hintPath && now - lastTouch >= delay * 1000) { armed = false; showHintBtn(); }
    }
    var timer = setInterval(tick, 100);
    tick();
    function pause() {
      if (paused || ended) return;
      if (!opts.multiplayer) { paused = true; WMSound.music.want(false); }
      if (dragging) { dragging = false; path = []; paint(); }
      if (hintBtnUntil) hideHintBtn();
      var o = document.createElement('div');
      o.className = 'overlay center';
      el.appendChild(o);
      function main() {
        o.innerHTML = '<div class="dialog" role="dialog" aria-modal="true"><h2 class="title">' + (opts.multiplayer ? 'Game menu' : 'Paused') + '</h2>' +
          (opts.multiplayer ? '<p class="hint-text">The clock keeps running in a phone-to-phone game.</p>' : '') +
          '<button class="btn btn-orange" data-resume>Resume</button>' +
          '<div class="menu-sound">' + soundSwitches() + '</div>' +
          '<button class="btn btn-white" data-hints>' + I.bulb + 'Hint settings</button>' +
          '<button class="btn btn-white" data-quit>' + (opts.multiplayer ? 'Leave game' : 'Quit to home') + '</button></div>';
        $('[data-resume]', o).onclick = function () { o.remove(); resume(); };
        $('[data-hints]', o).onclick = hintMenu;
        bindSoundSwitches(o, main);
        $('[data-quit]', o).onclick = function () { o.remove(); ended = true; stop(); opts.onQuit ? opts.onQuit() : home(); };
      }
      function hintMenu() {
        o.innerHTML = '<div class="dialog" role="dialog" aria-modal="true" style="text-align:left"><h2 class="title">Hint settings</h2>' +
          '<p class="hint-text">When you haven’t made a move for a while, a lightbulb pops up above the grid for 3 seconds. Choose how often that happens.</p>' +
          hintControls() + '<button class="btn btn-orange" data-back2>Done</button></div>';
        bindHintControls(o, hintMenu);
        $('[data-back2]', o).onclick = main;
      }
      main();
    }
    function resume() {
      paused = false; lastNow = Date.now(); lastTouch = Date.now(); armed = true;
      if (ambient && started && !ended) WMSound.music.want(true);
    }
    $('[data-menu]', el).onclick = pause;
    var fin = $('[data-finish]', el);
    if (fin) fin.onclick = function () { confirmBox('Finish this round?', 'Finish', 'Keep playing').then(function (y) { if (y) finish(); }); };
    function onVis() { if (document.hidden && timed && !opts.multiplayer) pause(); }
    document.addEventListener('visibilitychange', onVis);
    function stop() {
      clearInterval(timer);
      if (ambient) WMSound.music.want(false);
      window.removeEventListener('resize', layout);
      document.removeEventListener('visibilitychange', onVis);
    }
    function finish() {
      if (ended) return;
      ended = true; dragging = false; path = []; paint(); stop(); clearHintGlow(); foot.innerHTML = '';
      setMsg(timed ? 'Time’s up!' : 'Round over', 'good');
      if (timed) WMSound.timesUp(); else WMSound.ding();
      buzz(60);
      setTimeout(function () { opts.onEnd({ words: found.slice(), hints: hintsUsed, lasted: elapsed }); }, 1100);
    }
    scr.cleanup = function () { ended = true; stop(); };
    boardEl.addEventListener('pointerdown', function (e) { if (!started) e.stopImmediatePropagation(); }, true);
    var api = { forceEnd: finish, el: el, start: start, isEnded: function () { return ended; } };
    countdown(el, { n: n, full: ambient }).then(start);
    return api;
  }

  // In Party mode a word nobody else found scores double.
  function scoreWords(words, uniqueSet, scoring, mult) {
    mult = mult || 1;
    return words.map(function (w) {
      var base = scoreOf(w, scoring);
      if (!uniqueSet) return { w: w, p: base };
      var u = uniqueSet.has(w);
      return { w: w, p: (u ? base * 2 : base) * mult, unique: u, shared: !u };
    });
  }
  // Child profiles score double in Party and pass-and-play, so they can keep up with grown-ups.
  function childMult(p) { return p && p.child ? 2 : 1; }
  // ---------- Solo ----------
  function playSolo(cfg) {
    var board = makeBoard(cfg.n, cfg.minLen, cfg.seed, cfg.easy);
    playBoard({
      board: board, cfg: cfg, player: S.profile,
      onEnd: function (res) {
        var list = scoreWords(res.words, null, cfg.scoring).sort(function (a, b) { return b.p - a.p || b.w.length - a.w.length; });
        var total = list.reduce(function (a, x) { return a + x.p; }, 0);
        var saved = { best: false }, rank = null;
        var prev = (S.boards[cfg.mode === 'daily' ? 'daily:best' : boardKey(cfg.mode, cfg.n, cfg.easy)] || []).filter(function (r) { return r.key === myKey() || (!r.key && r.name === S.profile.name); })[0];
        if (cfg.mode === 'daily') {
          if (!cfg.practice) {
            S.daily[todayKey()] = { score: total, words: list.length };
            saved = addScore('daily', 4, 3, S.profile, total, list.length);
            rank = rankOf(saved.id, saved.key);
            var ever = rankOf(saved.id, 'daily:best');
            rank.everMine = ever.mine; rank.everAll = ever.all;
            save();
          }
        } else if (cfg.mode !== 'zen') {
          saved = addScore(cfg.mode, cfg.n, cfg.minLen, S.profile, total, list.length, { easy: cfg.easy });
          rank = rankOf(saved.id, saved.key);
        }
        // Personal best = this player's own best before this game.
        saved.pb = prev ? prev.score : null;
        resultsSolo(cfg, list, total, res, saved, rank, board);
      }
    });
  }
  function tallyUp(el, total) {
    var t = 0, step = Math.max(1, Math.ceil(total / 40));
    if (!total) return;
    var iv = setInterval(function () {
      t = Math.min(total, t + step);
      el.textContent = t; Snd.tally();
      if (t >= total) clearInterval(iv);
    }, 55);
  }
  function wordRows(list, baseDelay) {
    if (!list.length) return '<p class="empty">No words this round.</p>';
    return list.map(function (x, i) {
      var tag = x.unique ? '<span class="tag">Only you ×2</span>' : x.shared ? '<span class="tag">Shared</span>' : '';
      return '<div class="wrow' + (x.unique ? ' unique' : '') + '" data-def="' + esc(x.w) + '" role="button" tabindex="0" style="animation-delay:' + ((baseDelay || 0) + i * 0.15) + 's"><b>' + esc(x.w.toUpperCase()) + '</b>' + tag + '<span class="pts">' + x.p + (x.p === 1 ? ' pt' : ' pts') + '</span></div>';
    }).join('');
  }
  function fmtTime(ms) { var s = Math.round(ms / 1000), m = Math.floor(s / 60); s %= 60; return m + ':' + (s < 10 ? '0' : '') + s; }
  // Solo results: the same slow reveal as Party, then personal best and ranks.
  function resultsSolo(cfg, list, total, res, saved, rank, board) {
    var scoring = cfg.scoring || 'length', hints = res.hints || 0;
    var eyebrow = (cfg.survival ? 'Out of time' : cfg.time ? 'Time’s up' : 'Round over') + ' · ' + MODES[cfg.mode].name + (cfg.easy ? ' · Easy' : '');
    var seq = list.slice().sort(function (a, b) { return a.p - b.p || a.w.length - b.w.length; });
    var topSet = {};
    // Gold for the highest-scoring word(s), when they're 5+ letters.
    list.forEach(function (x) { if (x.p === list[0].p && x.w.length >= 5 && Object.keys(topSet).length < 3) topSet[x.w] = true; });
    var found = {}; list.forEach(function (x) { found[x.w] = true; });
    var gems = [], longest = '';
    if (board && board.words) {
      var bw = Array.from(board.words.keys()).filter(function (w) { return !board.easy || isEasyWord(w); });
      gems = bw.filter(function (w) { return !found[w]; }).sort(function (a, b) { return scoreOf(b, scoring) - scoreOf(a, scoring) || b.length - a.length; }).slice(0, 3);
      longest = bw.sort(function (a, b) { return b.length - a.length || scoreOf(b, scoring) - scoreOf(a, scoring); })[0] || '';
    }
    var myLongest = list.slice().sort(function (a, b) { return b.w.length - a.w.length || b.p - a.p; })[0];
    var hadPB = saved.pb !== null && saved.pb !== undefined;
    var newPB = total > 0 && (!hadPB || total > saved.pb) && cfg.mode !== 'zen' && !cfg.practice;
    function rkText(r, limit) { return r ? '#' + r.pos + ' of ' + r.of : 'Outside the top ' + limit; }
    var statRows = [['Words found', String(list.length)]];
    if (myLongest) statRows.push(['Longest word', myLongest.w.toUpperCase()]);
    if (cfg.survival) statRows.push(['Lasted', fmtTime(res.lasted || 0)]);
    if (hints) statRows.push(['Hints used', String(hints)]);
    var rankRows = [];
    if (cfg.mode === 'daily' && cfg.practice) rankRows.push(['Practice round', 'Not ranked']);
    else if (cfg.mode === 'zen') rankRows.push(['Zen mode', 'Not ranked']);
    else if (rank) {
      rankRows.push(['Your best before', hadPB ? String(saved.pb) : 'First game']);
      if (cfg.mode === 'daily') {
        rankRows.push(['Today on this phone', rkText(rank.mine, 20)]);
        rankRows.push(['Today with everyone', rkText(rank.all, SHARED_PER_BOARD)]);
        rankRows.push(['All-time daily, everyone', rkText(rank.everAll, SHARED_PER_BOARD)]);
      } else {
        rankRows.push(['On this phone', rkText(rank.mine, 20)]);
        rankRows.push(['With everyone', rkText(rank.all, SHARED_PER_BOARD)]);
      }
    }
    function rowsHtml(rows, hidden) {
      return rows.map(function (r) { return '<div class="stat-row"' + (hidden ? ' data-rank hidden' : '') + '><span>' + esc(r[0]) + '</span><b>' + esc(r[1]) + '</b></div>'; }).join('');
    }
    var scr = mount(
      '<header class="band show-band"><div class="band-row"><div class="eyebrow" style="text-align:left">' + esc(eyebrow) + '</div>' +
      '<div style="display:flex;gap:8px"><button class="band-btn" data-speed aria-pressed="false">⏩ Speed up</button><button class="band-btn" data-skip>Skip</button></div></div>' +
      '<div class="total" data-total>0</div>' +
      '<div class="sub" data-title>Counting your words…</div></header>' +
      '<div class="scroll"><div class="show">' +
      '<section class="show-lb"><span class="label">' + esc(S.profile.name) + '</span><div class="card solo-stats"><div class="solo-av">' + avatar(S.profile.avatar, 64) + '</div>' +
      rowsHtml(statRows, false) + rowsHtml(rankRows, true) + '</div></section>' +
      '<section class="show-words"><span class="label">Your words · tap one to see what it means</span><div class="stream" data-stream>' +
      (list.length ? '' : '<p class="empty">No words this round.</p>') + '</div><div data-gems></div></section>' +
      '</div><div class="show-actions" data-actions hidden></div></div>'
    );
    var el = scr.el, stream = $('[data-stream]', el), totalEl = $('[data-total]', el), done = false, timers = [], shown = 0;
    function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
    scr.cleanup = function () { timers.forEach(clearTimeout); };
    var speed = 1, steps = [], stepAt = 0;
    function step(after, fn) { steps.push({ after: after, fn: fn }); }
    function runSteps() {
      if (stepAt >= steps.length) return;
      var st = steps[stepAt++];
      later(function () { st.fn(); runSteps(); }, st.after / speed);
    }
    function wordEl(x, instant) {
      var d = document.createElement('div');
      var top = topSet[x.w];
      d.className = 'sw' + (instant ? ' settled ' + (top ? 'gold' : 'ok') : ' in');
      d.setAttribute('data-def', x.w); d.setAttribute('role', 'button'); d.tabIndex = 0;
      d.innerHTML = '<span class="ww"><b>' + esc(x.w.toUpperCase()) + '</b></span><span class="tag">' + (top ? 'Top word' : '') + '</span><span class="pts">+' + x.p + '</span>' +
        (top && !instant ? '<span class="sparks" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></span>' : '');
      return d;
    }
    var gap = Math.max(650, Math.min(1500, 30000 / Math.max(1, seq.length)));
    step(1000, function () {});
    seq.forEach(function (x) {
      var d;
      step(gap * 0.4, function () { d = wordEl(x, false); stream.insertBefore(d, stream.firstChild); });
      step(gap * 0.6, function () {
        d.classList.remove('in'); d.classList.add(topSet[x.w] ? 'gold' : 'ok');
        if (topSet[x.w]) WMSound.sparkle(); else WMSound.letter(Math.min(9, x.p + 1));
        var old = shown; shown += x.p;
        animateNum(totalEl, old, shown, 600 / speed);
      });
    });
    function showGems(animated) {
      if (!gems.length && !longest) return;
      var g = $('[data-gems]', el);
      g.innerHTML = '<div class="card gems' + (animated ? ' pop-in' : '') + '"><div class="missed">Missed opportunity!</div>' +
        (longest ? '<div class="gem-long" data-def="' + esc(longest) + '" role="button" tabindex="0"><small>Longest word on the board</small><b>' + esc(longest.toUpperCase()) + '</b><span>' + longest.length + ' letters · ' + plural(scoreOf(longest, scoring), 'point', 'points') +
          (found[longest] ? ' · you found it!' : ' · you missed it') + '</span></div>' : '') +
        gems.map(function (w, i) { return '<div class="gem" data-def="' + esc(w) + '" role="button" tabindex="0" style="animation-delay:' + (animated ? 0.4 + i * 0.25 : 0) + 's"><b>' + esc(w.toUpperCase()) + '</b><span class="pts">' + plural(scoreOf(w, scoring), 'pt', 'pts') + '</span></div>'; }).join('') + '</div>';
      if (animated) { Snd.tone(392, 0.2, 'triangle', 0.05); Snd.tone(330, 0.3, 'triangle', 0.05, 0.18); }
    }
    function finalTitle(animated) {
      var t = $('[data-title]', el);
      t.textContent = total === 0 ? 'No words this time. Have another go!' : newPB ? 'New personal best!' : plural(list.length, 'word', 'words') + ' · ' + plural(total, 'point', 'points');
      if (newPB) t.classList.add('pb-title');
      if (animated) t.classList.add('pop-in');
      $$('[data-rank]', el).forEach(function (r, i) { r.hidden = false; if (animated) { r.classList.add('pop-in'); r.style.animationDelay = (i * 0.15) + 's'; } });
      if (newPB && animated) { confetti(el); Snd.cheer(); buzz(60); }
    }
    function finish() {
      if (done) return;
      done = true;
      var sk = $('[data-skip]', el); if (sk) sk.remove();
      var sp = $('[data-speed]', el); if (sp) sp.remove();
      var a = $('[data-actions]', el);
      a.innerHTML = (cfg.mode === 'daily' ? '<button class="btn btn-blue" data-boards>' + I.trophy + 'Daily leaderboard</button>' : '<button class="btn btn-blue" data-again>' + I.play + 'Play again</button>' +
        (cfg.mode !== 'zen' ? '<button class="btn btn-white" data-boards>' + I.trophy + 'Leaderboards</button>' : '')) +
        '<button class="btn btn-white" data-home>Home</button>';
      a.hidden = false; a.classList.add('pop-in');
      var ag = $('[data-again]', a);
      if (ag) ag.onclick = function () { playSolo(finalCfg({ mode: cfg.mode, size: cfg.n, minLen: cfg.minLen, easy: cfg.easy })); };
      var lb = $('[data-boards]', a);
      if (lb) lb.onclick = function () { leaderboards(home, cfg.mode, cfg.n, cfg.easy); };
      $('[data-home]', a).onclick = home;
    }
    step(1300, function () { showGems(true); });
    step(1800, function () { totalEl.textContent = total; finalTitle(true); });
    step(1600, finish);
    runSteps();
    $('[data-speed]', el).onclick = function (e) {
      speed = speed === 1 ? 3 : 1;
      var b = e.currentTarget;
      b.setAttribute('aria-pressed', String(speed > 1));
      b.textContent = speed > 1 ? '▶ Normal speed' : '⏩ Speed up';
    };
    $('[data-skip]', el).onclick = function () {
      timers.forEach(clearTimeout); timers = [];
      if (list.length) stream.innerHTML = '';
      seq.slice().reverse().forEach(function (x) { stream.appendChild(wordEl(x, true)); });
      totalEl.textContent = total;
      showGems(false); finalTitle(false); finish();
    };
  }

  // ---------- Pass and play ----------
  function playPass(cfg, players, session) {
    session = session || { round: 0, totals: {} };
    var board = makeBoard(cfg.n, cfg.minLen, cfg.seed, cfg.easy);
    var results = [];
    function turn(i) {
      if (i >= players.length) return resultsShow(cfg, players.map(function (p, k) { return { key: 'n:' + p.name.toLowerCase(), name: p.name, avatar: p.avatar, child: !!p.child, words: results[k].words, hints: results[k].hints }; }), {
        board: board, session: session, save: true,
        actions: [
          { label: 'Next round', cls: 'btn-blue', icon: I.play, run: function () { playPass(cfg, players, session); } },
          { label: 'Home', run: home }
        ]
      });
      var p = players[i];
      var scr = mount(
        '<div class="loading" style="gap:16px;padding:24px;text-align:center">' +
        '<div style="animation:dialogIn .7s cubic-bezier(.3,1.4,.5,1) both">' + avatar(p.avatar, 120) + '</div>' +
        '<h2 class="title" style="color:#FFF;font-size:30px">Pass to ' + esc(p.name) + '</h2>' +
        '<p>' + (i === 0 ? 'Everyone plays the same board, one at a time.' : 'No peeking at the last player’s board!') + '</p>' +
        '<button class="btn btn-white" data-ready style="min-width:220px">I’m ' + esc(p.name) + ', start</button>' +
        '<button class="btn btn-ghost" data-quit style="color:var(--band-ink)">Quit</button></div>'
      );
      $('[data-ready]', scr.el).onclick = function () {
        var g = playBoard({
          board: board, cfg: cfg, player: p, label: p.name + ' (' + (i + 1) + '/' + players.length + ')',
          onEnd: function (res) { results[i] = res; turn(i + 1); }
        });

      };
      $('[data-quit]', scr.el).onclick = function () { confirmBox('Quit this game?', 'Quit', 'Keep playing').then(function (y) { if (y) home(); }); };
    }
    turn(0);
  }

  // ---------- Party results ----------
  // players: [{key, name, avatar, words:[...], me?}]
  function computeRound(players, scoring) {
    var counts = {}, finders = {};
    players.forEach(function (p) {
      p.words.forEach(function (w) { counts[w] = (counts[w] || 0) + 1; (finders[w] = finders[w] || []).push(p); });
    });
    var unique = new Set(Object.keys(counts).filter(function (w) { return counts[w] === 1; }));
    var rows = players.map(function (p) {
      var list = scoreWords(p.words, unique, scoring, childMult(p)).sort(function (a, b) { return b.p - a.p || b.w.length - a.w.length; });
      var longest = p.words.slice().sort(function (a, b) { return b.length - a.length || scoreOf(b, scoring) - scoreOf(a, scoring); })[0] || '';
      return { p: p, list: list, score: list.reduce(function (a, x) { return a + x.p; }, 0), longest: longest, uniques: list.filter(function (x) { return x.unique; }).length };
    }).sort(function (a, b) { return b.score - a.score; });
    return { rows: rows, counts: counts, finders: finders, unique: unique };
  }
  function updateSession(session, rows) {
    session.round = (session.round || 0) + 1;
    var top = rows.length ? rows[0].score : 0;
    rows.forEach(function (r) {
      var k = r.p.key || r.p.id || r.p.name;
      var t = session.totals[k] || { total: 0, wins: 0 };
      t.name = r.p.name; t.avatar = r.p.avatar; t.total += r.score;
      if (r.score === top && top > 0) t.wins++;
      session.totals[k] = t;
    });
    return standings(session);
  }
  function standings(session) {
    return Object.keys(session.totals).map(function (k) { return Object.assign({ key: k }, session.totals[k]); }).sort(function (a, b) { return b.total - a.total; });
  }
  // ---------- Big screen during a round (host device not playing) ----------
  function spectate(board, cfg, players, roundNo, onEnd, onQuit) {
    var n = board.n;
    var scr = mount(
      '<header class="band game-band"><div class="band-row"><b style="color:#FFF;font-size:20px;font-weight:800">Round ' + roundNo + ' · Big screen</b>' +
      '<button class="icon-btn" data-menu aria-label="Game menu">' + I.menu + '</button></div>' +
      '<div style="display:flex;gap:10px"><div class="stat"><span class="clock" data-clock>0:00</span><div class="bar"><i data-bar></i></div></div></div></header>' +
      '<section class="spect-players"><span class="label">Words found so far</span><div class="players">' +
      players.map(function (p) { return '<div class="prow">' + avatar(p.avatar, 44) + '<b>' + esc(p.name) + '</b><span class="sc" data-cnt="' + esc(p.id) + '">0</span></div>'; }).join('') +
      '</div></section>' +
      '<div class="board-wrap" data-wrap><div class="board-panel"><div class="board" data-board style="--n:' + n + '"></div></div></div>', 'game spect');
    var el = scr.el, boardEl = $('[data-board]', el);
    board.cells.forEach(function (c, i) {
      var cell = document.createElement('div');
      cell.className = 'cell intro';
      cell.style.animationDelay = ((Math.floor(i / n) + (i % n)) * 0.07) + 's';
      cell.innerHTML = '<div class="tile' + (c === 'qu' ? ' qu' : '') + '">' + (c === 'qu' ? 'Qu' : c.toUpperCase()) + '</div>';
      boardEl.appendChild(cell);
    });
    function layout() {
      var wrap = $('[data-wrap]', el), cs = getComputedStyle(wrap);
      var w = wrap.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight), h = wrap.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      var side = Math.max(180, Math.min(w, h, 820)) - 16, gap = Math.round(side * (n === 4 ? 0.03 : 0.022)), tile = (side - gap * (n - 1)) / n;
      boardEl.style.width = side + 'px'; boardEl.style.height = side + 'px';
      boardEl.style.setProperty('--gap', gap + 'px'); boardEl.style.setProperty('--ts', tile + 'px');
    }
    window.addEventListener('resize', layout);
    requestAnimationFrame(layout);
    var clockEl = $('[data-clock]', el), barEl = $('[data-bar]', el), left = cfg.time * 1000, last = 0, started = false, ended = false;
    function fmt(ms) { var s = Math.ceil(ms / 1000), m = Math.floor(s / 60); s %= 60; return m + ':' + (s < 10 ? '0' : '') + s; }
    clockEl.textContent = fmt(left);
    var lastHalf = -1, lastBeep = -1;
    var timer = setInterval(function () {
      if (!started || ended) return;
      var now = Date.now(); left = Math.max(0, left - (now - last)); last = now;
      clockEl.textContent = fmt(left); barEl.style.transform = 'scaleX(' + (left / (cfg.time * 1000)) + ')';
      var s = Math.ceil(left / 1000), half = Math.ceil(left / 500);
      if (left > 0 && left <= 10000) {
        WMSound.music.setUrgency(1 - left / 10000);
        if (half !== lastHalf) { lastHalf = half; WMSound.lastTen(half % 2); }
      }
      if (s <= 3 && s > 0 && s !== lastBeep) { lastBeep = s; WMSound.urgent(3 - s); }
      if (left <= 0) stop(true);
    }, 100);
    function stop(fin) {
      if (ended) return;
      ended = true; clearInterval(timer); window.removeEventListener('resize', layout);
      WMSound.music.want(false);
      if (fin) { WMSound.timesUp(); setTimeout(onEnd, 900); }
    }
    scr.cleanup = function () { stop(false); };
    $('[data-menu]', el).onclick = function () {
      confirmBox('Close the game for everyone?', 'Close game', 'Keep going').then(function (y) { if (y) { stop(false); onQuit(); } });
    };
    countdown(el, { n: board.n || cfg.n, full: true }).then(function () { started = true; last = Date.now(); WMSound.music.want(true); });
    return {
      setCount: function (id, c) {
        var e = $('[data-cnt="' + id + '"]', el);
        if (e && String(c) !== e.textContent) { e.textContent = c; e.classList.remove('bump'); void e.offsetWidth; e.classList.add('bump'); }
      }
    };
  }

  // ---------- Animated round results (shared screen) ----------
  function animateNum(el, from, to, ms) {
    if (!el) return;
    if (from === to) { el.textContent = to; return; }
    var t0 = performance.now(), lastShown = from;
    function step(now) {
      var k = Math.min(1, (now - t0) / ms);
      var v = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 2)));
      if (v !== lastShown) { lastShown = v; el.textContent = v; Snd.tally(); }
      if (k < 1) requestAnimationFrame(step); else el.textContent = to;
    }
    requestAnimationFrame(step);
  }
  function confetti(host) {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var c = document.createElement('canvas');
    c.className = 'confetti';
    host.appendChild(c);
    var dpr = window.devicePixelRatio || 1, W = host.clientWidth, H = host.clientHeight;
    c.width = W * dpr; c.height = H * dpr;
    var ctx = c.getContext('2d'); ctx.scale(dpr, dpr);
    var cols = ['#F26B21', '#FFC93A', '#86D069', '#2F6FDE', '#F0457A', '#FFF3D9'];
    var bits = [];
    for (var i = 0; i < 160; i++) bits.push({ x: W / 2 + (Math.random() - 0.5) * 80, y: H * 0.42, vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 15 - 4, r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.4, w: 6 + Math.random() * 6, h: 8 + Math.random() * 8, c: cols[i % cols.length] });
    var t0 = performance.now();
    function frame(now) {
      ctx.clearRect(0, 0, W, H);
      bits.forEach(function (b) {
        b.vy += 0.35; b.vx *= 0.99; b.x += b.vx; b.y += b.vy; b.r += b.vr;
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.r); ctx.fillStyle = b.c; ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h); ctx.restore();
      });
      if (now - t0 < 3500) requestAnimationFrame(frame); else c.remove();
    }
    requestAnimationFrame(frame);
  }

  // players: [{key, id?, name, avatar, words, me?}]
  // opts: {board, session | totals+round, save, saveMine, actions:[{label, cls, icon, run}], note, readyKeys:[...]}
  function resultsShow(cfg, players, opts) {
    var scoring = cfg.scoring || 'length';
    var R = computeRound(players, scoring);
    // Every player's score goes on this phone's Party leaderboard. The round id stops the same
    // score being counted twice when phones swap scores.
    if (opts.save) {
      var rid = opts.rid || newId(), at = opts.at || Date.now();
      R.rows.forEach(function (r) { addScore('party', cfg.n, cfg.minLen, r.p, r.score, r.list.length, { id: rid + ':' + (r.p.key || r.p.name), at: at, easy: cfg.easy }); });
    }
    var table = opts.session ? updateSession(opts.session, R.rows) : (opts.totals || []);
    var round = opts.session ? opts.session.round : (opts.round || 1);
    var P = players.map(function (p, i) { return { p: p, key: p.key || p.id || p.name, idx: i, score: 0, final: 0, total: 0 }; });
    R.rows.forEach(function (r) { P.forEach(function (x) { if (x.p === r.p) x.final = r.score; }); });
    P.forEach(function (x) { var t = table.filter(function (y) { return y.key === x.key; })[0]; x.total = t ? t.total : x.final; x.wins = t ? t.wins : 0; });
    var words = Object.keys(R.counts).map(function (w) { return { w: w, base: scoreOf(w, scoring), unique: R.unique.has(w), who: R.finders[w] }; });
    var seq = words.filter(function (x) { return !x.unique; }).sort(function (a, b) { return a.base - b.base; })
      .concat(words.filter(function (x) { return x.unique; }).sort(function (a, b) { return a.base - b.base || a.w.length - b.w.length; }));
    var gems = [], longest = '';
    if (opts.board && opts.board.words) {
      var bw = Array.from(opts.board.words.keys()).filter(function (w) { return !opts.board.easy || isEasyWord(w); });
      gems = bw.filter(function (w) { return !R.counts[w]; }).sort(function (a, b) { return scoreOf(b, scoring) - scoreOf(a, scoring) || b.length - a.length; }).slice(0, 3);
      longest = bw.sort(function (a, b) { return b.length - a.length || scoreOf(b, scoring) - scoreOf(a, scoring); })[0] || '';
    }
    var winners = R.rows.filter(function (r) { return r.score === R.rows[0].score; });
    // Last place gets the Loser label (nobody does if everyone tied).
    var lowest = R.rows.length ? R.rows[R.rows.length - 1].score : 0;
    var losers = R.rows.length > 1 && lowest < R.rows[0].score ? R.rows.filter(function (r) { return r.score === lowest; }) : [];
    function showLosers() {
      losers.forEach(function (r) { P.forEach(function (x) { if (x.p === r.p) { var c = $('[data-loser="' + x.idx + '"]', el); if (c) c.hidden = false; } }); });
    }
    var scr = mount(
      '<header class="band show-band"><div class="band-row"><div class="eyebrow" style="text-align:left">Round ' + round + ' · ' + (scoring === 'rarity' ? 'Rarity scoring' : 'Party') + '</div>' +
      '<div style="display:flex;gap:8px"><button class="band-btn" data-speed aria-pressed="false">\u23e9 Speed up</button><button class="band-btn" data-skip>Skip</button></div></div>' +
      '<div class="show-title" data-title>Counting the words…</div>' +
      '<div class="sub">Shared words score normally. Words only one player found score double.</div></header>' +
      '<div class="scroll"><div class="show">' +
      '<section class="show-lb"><span class="label" data-lbtitle>This round</span><div class="lb-stage" data-stage style="height:' + (P.length * 66) + 'px">' +
      P.map(function (x) {
        return '<div class="lbs-row" data-row="' + x.idx + '">' + avatar(x.p.avatar, 42) + '<span class="nm"><b>' + esc(x.p.name) + (x.p.me ? ' (you)' : '') + '</b><small data-sub="' + x.idx + '"></small></span>' +
          '<span class="ready-chip" data-ready="' + x.idx + '" hidden>Ready</span><span class="loser-chip" data-loser="' + x.idx + '" hidden>Loser</span><span class="crown" data-crown="' + x.idx + '" hidden>★</span><span class="sc" data-score="' + x.idx + '">0</span></div>';
      }).join('') + '</div></section>' +
      '<section class="show-words"><span class="label">Words \u00b7 tap one to see what it means</span><div class="stream" data-stream></div><div data-gems></div></section>' +
      '</div><div class="show-actions" data-actions hidden></div></div>' +
      (opts.onReady ? '<div class="ready-bar"><button class="btn ready-btn" data-readyme>' + I.play + 'Ready for next round</button></div>' : '')
    );
    var rme = $('[data-readyme]', scr.el);
    if (rme) rme.onclick = function () {
      if (rme.classList.contains('done')) return;
      rme.classList.add('done'); rme.innerHTML = '\u2713 Ready! Waiting for the host\u2026';
      buzz(30); Snd.good(3); opts.onReady();
    };
    var el = scr.el, stream = $('[data-stream]', el), done = false, timers = [];
    function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
    scr.cleanup = function () { timers.forEach(clearTimeout); };
    function place(byTotal) {
      var order = P.slice().sort(function (a, b) { return (byTotal ? b.total - a.total : b.score - a.score) || a.idx - b.idx; });
      order.forEach(function (x, i) {
        var row = $('[data-row="' + x.idx + '"]', el);
        row.style.transform = 'translateY(' + (i * 66) + 'px)';
        row.classList.toggle('lead', i === 0 && (byTotal ? x.total : x.score) > 0);
      });
    }
    place(false);
    function wordEl(x, instant) {
      var d = document.createElement('div');
      d.className = 'sw' + (instant ? ' settled ' + (x.unique ? 'gold' : 'dup') : ' in');
      d.setAttribute('data-def', x.w); d.setAttribute('role', 'button'); d.tabIndex = 0;
      d.innerHTML = '<span class="ww"><b>' + esc(x.w.toUpperCase()) + '</b><span class="who">' + x.who.map(function (p) { return avatar(p.avatar, 22); }).join('') + '<small>' + esc(x.who.map(function (p) { return p.name; }).join(', ')) + '</small></span></span>' +
        '<span class="tag">' + (x.unique ? 'Unique ×2' : 'Shared') + '</span><span class="pts">' + (x.unique ? x.base + ' × 2 = ' + (x.base * 2) : '+' + x.base) + '</span>' +
        (x.unique && !instant ? '<span class="sparks" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></span>' : '');
      return d;
    }
    function award(x) {
      x.who.forEach(function (p) {
        var t = P.filter(function (y) { return y.p === p; })[0];
        var old = t.score; t.score += (x.unique ? x.base * 2 : x.base) * childMult(p);
        animateNum($('[data-score="' + t.idx + '"]', el), old, t.score, 700 / speed);
      });
      place(false);
    }
    // The reveal runs as a list of steps. Each waits its own time divided by the current speed,
    // so the Speed up button takes effect straight away.
    var speed = 1, steps = [], stepAt = 0;
    function step(after, fn) { steps.push({ after: after, fn: fn }); }
    function runSteps() {
      if (stepAt >= steps.length) return;
      var st = steps[stepAt++];
      later(function () { st.fn(); runSteps(); }, st.after / speed);
    }
    var gap = Math.max(1100, Math.min(1800, 40000 / Math.max(1, seq.length)));
    step(1200, function () {});
    seq.forEach(function (x) {
      var d;
      step(gap * 0.45, function () { d = wordEl(x, false); stream.insertBefore(d, stream.firstChild); });
      step(gap * 0.55, function () {
        d.classList.remove('in'); d.classList.add(x.unique ? 'gold' : 'dup');
        if (x.unique) WMSound.sparkle(); else WMSound.swish();
        award(x);
      });
    });
    function showGems(animated) {
      if (!gems.length && !longest) return;
      var g = $('[data-gems]', el);
      g.innerHTML = '<div class="card gems' + (animated ? ' pop-in' : '') + '"><div class="missed">Missed opportunity!</div>' +
        (longest ? '<div class="gem-long" data-def="' + esc(longest) + '" role="button" tabindex="0"><small>Longest word on the board</small><b>' + esc(longest.toUpperCase()) + '</b><span>' + longest.length + ' letters · ' + plural(scoreOf(longest, scoring), 'point', 'points') +
          (R.counts[longest] ? ' · found by ' + esc(R.finders[longest].map(function (p) { return p.name; }).join(', ')) : ' · nobody found it') + '</span></div>' : '') +
        gems.map(function (w, i) { return '<div class="gem" data-def="' + esc(w) + '" role="button" tabindex="0" style="animation-delay:' + (animated ? 0.4 + i * 0.25 : 0) + 's"><b>' + esc(w.toUpperCase()) + '</b><span class="pts">' + plural(scoreOf(w, scoring), 'pt', 'pts') + '</span></div>'; }).join('') + '</div>';
      if (animated) { Snd.tone(392, 0.2, 'triangle', 0.05); Snd.tone(330, 0.3, 'triangle', 0.05, 0.18); }
    }
    function title() {
      var t = $('[data-title]', el);
      t.textContent = winners.length > 1 ? 'It’s a tie!' : winners[0].p.name + ' wins round ' + round + '!';
      t.classList.add('pop-in');
    }
    function celebrate(next) {
      var w = winners[0];
      var o = document.createElement('div');
      o.className = 'overlay center winner-stage';
      o.innerHTML = '<div class="winner-card"><div class="winner-av">' + avatar(w.p.avatar, 150) + '</div><div class="winner-name">' + (winners.length > 1 ? 'It’s a tie!' : esc(w.p.name) + ' wins!') + '</div><div class="winner-pts">' + plural(w.score, 'point', 'points') + ' this round</div>' +
        (losers.length ? '<div class="loser-line">' + losers.map(function (r) { return avatar(r.p.avatar, 36); }).join('') + '<span>' + esc(losers.map(function (r) { return r.p.name; }).join(' & ')) + (losers.length > 1 ? ' are the losers' : ' is the loser') + '</span></div>' : '') +
        '<p class="hint-text" style="color:#FFF3D9">Tap to continue</p></div>';
      el.appendChild(o);
      confetti(o); Snd.cheer();
      var gone = false;
      function close() { if (gone) return; gone = true; o.classList.add('leaving-ov'); setTimeout(function () { o.remove(); next(); }, 350); }
      o.onclick = close; later(close, 5500 / speed);
    }
    function standingsView(animated) {
      $('[data-lbtitle]', el).textContent = table.length ? 'Overall after ' + plural(round, 'round', 'rounds') : 'This round';
      P.forEach(function (x) {
        var sc = $('[data-score="' + x.idx + '"]', el);
        if (animated) animateNum(sc, x.final, x.total, 1500 / speed); else sc.textContent = x.total;
        $('[data-sub="' + x.idx + '"]', el).textContent = '+' + x.final + ' this round · ' + plural(x.wins, 'win', 'wins');
      });
      place(true);
      var lead = P.slice().sort(function (a, b) { return b.total - a.total || a.idx - b.idx; })[0];
      if (lead && lead.total > 0) $('[data-crown="' + lead.idx + '"]', el).hidden = false;
    }
    function finish() {
      if (done) return;
      done = true;
      var sk = $('[data-skip]', el); if (sk) sk.remove();
      var sp = $('[data-speed]', el); if (sp) sp.remove();
      var a = $('[data-actions]', el);
      a.innerHTML = (opts.note ? '<p class="hint-text" style="text-align:center">' + esc(opts.note) + '</p>' : '') +
        (opts.actions || []).map(function (x, i) { return '<button class="btn ' + (x.cls || 'btn-white') + '" data-act="' + i + '">' + (x.icon || '') + esc(x.label) + '</button>'; }).join('');
      a.hidden = false; a.classList.add('pop-in');
      on(a, '[data-act]', 'click', function (e) { var x = opts.actions[+e.currentTarget.getAttribute('data-act')]; x.run(); });
    }
    step(1500, function () { showGems(true); });
    step(3500, function () { title(); showLosers(); celebrate(function () { later(function () { standingsView(true); later(finish, 1800 / speed); }, 600 / speed); }); });
    runSteps();
    $('[data-speed]', el).onclick = function (e) {
      speed = speed === 1 ? 3 : 1;
      var b = e.currentTarget;
      b.setAttribute('aria-pressed', String(speed > 1));
      b.textContent = speed > 1 ? '\u25b6 Normal speed' : '\u23e9 Speed up';
    };
    $('[data-skip]', el).onclick = function () {
      timers.forEach(clearTimeout); timers = [];
      $$('.winner-stage', el).forEach(function (n) { n.remove(); });
      stream.innerHTML = '';
      seq.slice().reverse().forEach(function (x) { stream.appendChild(wordEl(x, true)); });
      P.forEach(function (x) { x.score = x.final; });
      showGems(false); title(); showLosers(); standingsView(false); finish();
    };
    return {
      el: el,
      setReady: function (key) {
        P.forEach(function (x) { if (x.key === key) { var c = $('[data-ready="' + x.idx + '"]', el); if (c) c.hidden = false; } });
        if (opts.onReadyChange) opts.onReadyChange();
      },
      round: round, table: table
    };
  }

  // ---------- Leaderboards ----------
  var lbScope = 'mine';
  var lbEasy = false;
  function leaderboards(back, startTab, startSize, startEasy) {
    var tab = startTab && startTab !== 'zen' ? startTab : 'classic', size = startSize || 4;
    if (startEasy !== undefined) lbEasy = !!startEasy;
    var scr = mount(backBand('Leaderboards') + '<div class="scroll" data-body></div>');
    on(scr.el, '[data-back]', 'click', back);
    function rowsHtml(list, showDay) {
      return list.length ? list.slice(0, 10).map(function (r, i) {
        var d = new Date(r.at);
        return '<div class="lb-row" style="animation-delay:' + (i * 0.07) + 's"><span class="pos">' + (i + 1) + '</span>' + avatar(r.avatar, 42) +
          '<span class="nm"><b>' + esc(r.name) + '</b><small>' + plural(r.words, 'word', 'words') + (r.minLen === 4 ? ' · 4+ letters' : '') + ' · ' + d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) + '</small></span><span class="sc">' + r.score + '</span></div>';
      }).join('') : '<p class="empty">No scores yet. Play a round to get on the board!</p>';
    }
    function get(b) { return lbScope === 'all' ? sharedList(b) : (S.boards[b] || []); }
    function render() {
      var tabs = ['classic', 'blitz', 'survival', 'rarity', 'party', 'daily'];
      var names = { classic: 'Classic', blitz: 'Blitz', survival: 'Survival', rarity: 'Rarity', party: 'Party', daily: 'Daily' };
      var html = '<div class="seg scope">' +
        '<button data-scope="mine" aria-pressed="' + (lbScope === 'mine') + '">This phone</button><button data-scope="all" aria-pressed="' + (lbScope === 'all') + '">Everyone</button></div>' +
        '<p class="hint-text">' + (lbScope === 'all' ? 'Scores from this phone plus every phone you\u2019ve played Party with. Phones swap scores automatically when they play together.' : 'Scores from games played on this phone.') + '</p>' +
        '<div class="seg tabs">' + tabs.map(function (m) { return '<button data-tab="' + m + '" aria-pressed="' + (tab === m) + '">' + names[m] + '</button>'; }).join('') + '</div>';
      if (tab === 'daily') {
        html += '<span class="label">Today’s puzzle</span><p class="hint-text">Only each player’s first try counts.</p>' + rowsHtml(get('daily:' + todayKey())) +
          '<span class="label" style="margin-top:8px">Best daily scores ever</span>' + rowsHtml(get('daily:best'));
      } else {
        html += '<div class="seg">' + [4, 5, 6].map(function (n) { return '<button data-size="' + n + '" aria-pressed="' + (size === n) + '">' + n + ' × ' + n + '</button>'; }).join('') + '</div>' +
          '<div class="seg level"><button data-level="0" aria-pressed="' + !lbEasy + '">Normal</button><button data-level="1" aria-pressed="' + lbEasy + '">Easy</button></div>' +
          rowsHtml(get(tab + ':' + size + (lbEasy ? ':e' : '')));
      }
      var body = $('[data-body]', scr.el);
      body.innerHTML = html;
      on(body, '[data-tab]', 'click', function (e) { tab = e.currentTarget.getAttribute('data-tab'); render(); });
      on(body, '[data-scope]', 'click', function (e) { lbScope = e.currentTarget.getAttribute('data-scope'); render(); });
      on(body, '[data-level]', 'click', function (e) { lbEasy = e.currentTarget.getAttribute('data-level') === '1'; render(); });
      on(body, '[data-size]', 'click', function (e) { size = +e.currentTarget.getAttribute('data-size'); render(); });
    }
    render();
  }

  // ---------- Hint controls (settings screen and in-game menu) ----------
  function soundSwitches() {
    var st = S.settings;
    function sw(key, label) { return '<div class="toggle-row"><span id="ms-' + key + '">' + label + '</span><button class="switch" role="switch" aria-labelledby="ms-' + key + '" aria-checked="' + (st[key] !== false) + '" data-stg="' + key + '"></button></div>'; }
    return sw('sound', 'Sound effects') + sw('music', 'Music');
  }
  function bindSoundSwitches(root, rerender) {
    on(root, '[data-stg]', 'click', function (e) {
      var k = e.currentTarget.getAttribute('data-stg');
      S.settings[k] = S.settings[k] === false; save(); WMSound.apply(); rerender();
    });
  }
  function soundSettings() {
    var st = S.settings;
    function slider(key, label, val) {
      return '<div class="vol-row"><label for="vol-' + key + '">' + label + '</label><input type="range" id="vol-' + key + '" min="0" max="100" step="5" value="' + Math.round(val * 100) + '" data-vol="' + key + '"' + '><output for="vol-' + key + '" data-volout="' + key + '">' + Math.round(val * 100) + '</output></div>';
    }
    var html = '<div class="card"><b style="font-size:18px">Sound</b>' + soundSwitches() +
      slider('sfxVol', 'Effects', st.sfxVol == null ? 0.8 : st.sfxVol) + slider('musicVol', 'Music', st.musicVol == null ? 0.6 : st.musicVol) +
      '<p class="hint-text">Turn Music off to play your own music or a podcast while still hearing the game. You can also switch both from the \u2630 menu during a game.</p></div>' +
      '<div class="card"><b style="font-size:18px">Choose your sounds</b><p class="hint-text">Tap one to hear it and use it.</p>';
    Object.keys(WMSound.VARIANTS).forEach(function (g) {
      html += '<span class="label">' + WMSound.GROUP_NAMES[g] + '</span><div class="seg">' +
        WMSound.VARIANTS[g].map(function (v) { return '<button data-sndg="' + g + '" data-sndv="' + v[0] + '" aria-pressed="' + (st.snd[g] === v[0]) + '">' + v[1] + '</button>'; }).join('') + '</div>';
    });
    return html + '</div>';
  }
  function bindSoundSettings(root, rerender) {
    bindSoundSwitches(root, rerender);
    on(root, '[data-sndg]', 'click', function (e) {
      var g = e.currentTarget.getAttribute('data-sndg'), v = e.currentTarget.getAttribute('data-sndv');
      S.settings.snd[g] = v; save();
      $$('[data-sndg="' + g + '"]', root).forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-sndv') === v)); });
      WMSound.preview(g, v);
    });
    $$('[data-vol]', root).forEach(function (r) {
      var k = r.getAttribute('data-vol');
      r.addEventListener('input', function () { S.settings[k] = r.value / 100; $('[data-volout="' + k + '"]', root).textContent = r.value; WMSound.apply(); });
      r.addEventListener('change', function () {
        save();
        if (k === 'sfxVol') WMSound.valid();
      });
    });
  }
  function hintControls() {
    var st = S.settings;
    var opts = [[5, 'Lots'], [8, 'Sometimes'], [15, 'Rarely'], [25, 'Very little'], [0, 'None']];
    var known = opts.some(function (o) { return o[0] === st.hintDelay; });
    return '<span class="label">How often hints appear</span><div class="seg hint-seg">' +
      opts.map(function (o) { return '<button data-delay="' + o[0] + '" aria-pressed="' + (known ? st.hintDelay === o[0] : o[0] === 8) + '">' + o[1] + '</button>'; }).join('') + '</div>' +
      '<span class="label">Hints show</span><div class="seg">' +
      '<button data-h3="1" aria-pressed="' + st.hint3 + '">3-letter words</button><button data-h3="0" aria-pressed="' + !st.hint3 + '">Any word</button></div>';
  }
  function bindHintControls(root, rerender) {
    on(root, '[data-delay]', 'click', function (e) { S.settings.hintDelay = +e.currentTarget.getAttribute('data-delay'); S.settings.hintChosen = true; save(); rerender(); });
    on(root, '[data-h3]', 'click', function (e) { S.settings.hint3 = e.currentTarget.getAttribute('data-h3') === '1'; save(); rerender(); });
  }

  // ---------- Settings ----------
  function settings(back) {
    var scr = mount(backBand('Settings') + '<div class="scroll" data-body></div>');
    on(scr.el, '[data-back]', 'click', back);
    function render() {
      var st = S.settings;
      var body = $('[data-body]', scr.el);
      body.innerHTML =
        '<div class="card"><span class="label">Colours</span><div class="seg">' +
        '<button data-theme="auto" aria-pressed="' + (st.theme === 'auto') + '">Match phone</button><button data-theme="original" aria-pressed="' + (st.theme === 'original') + '">Original</button><button data-theme="dark" aria-pressed="' + (st.theme === 'dark') + '">Dark</button></div>' +
        '</div>' +
        '<div class="card"><b style="font-size:18px">Hints</b>' +
        '<p class="hint-text">A lightbulb pops up above the grid when you haven\u2019t made a move for a while. It stays for 3 seconds. You can also change this from the \u2630 menu during a game.</p>' +
        hintControls() + '</div>' +
        soundSettings() +
        '<div class="card">' + toggle('vibrate', 'Vibration', st.vibrate) + '</div>' +
        '<div class="card"><div class="toggle-row"><span id="tl-child">Child profile</span><button class="switch" role="switch" aria-labelledby="tl-child" aria-checked="' + !!S.profile.child + '" data-childp></button></div>' +
        '<p class="hint-text">For younger players. Hints show 3 and 4-letter words, and in Party games your words score double so you can keep up with grown-ups.</p></div>' +
        '<button class="btn btn-white" data-profile>' + I.user + 'Edit my profile</button>' +
        '<button class="btn btn-white" data-clear>Clear leaderboards</button>' +
        '<p class="hint-text" style="text-align:center">Word list: ' + WORDS.length.toLocaleString() + ' British English words' + (EASY ? ' (' + EASY.size.toLocaleString() + ' everyday words for Easy)' : '') + '.<br>Version ' + APP_VERSION + '</p>';
      bindHintControls(body, render);
      on(body, '[data-theme]', 'click', function (e) { st.theme = e.currentTarget.getAttribute('data-theme'); st.themeChosen = true; save(); applyTheme(); render(); });
      bindSoundSettings(body, render);
      on(body, '[data-tg]', 'click', function (e) { var k = e.currentTarget.getAttribute('data-tg'); st[k] = !st[k]; save(); render(); if (k === 'vibrate') buzz(20); });
      $('[data-profile]', body).onclick = function () { editMyProfile(function () { settings(back); }); };
      $('[data-childp]', body).onclick = function () { S.profile.child = !S.profile.child; save(); render(); };
      $('[data-clear]', body).onclick = function () {
        confirmBox('Clear all leaderboard scores on this phone? This clears both This phone and Everyone.', 'Clear scores', 'Cancel').then(function (y) { if (y) { S.boards = {}; S.shared = {}; S.daily = {}; save(); toast('Leaderboards cleared'); } });
      };
    }
    function toggle(key, label, val) { return '<div class="toggle-row"><span id="tl-' + key + '">' + label + '</span><button class="switch" role="switch" aria-labelledby="tl-' + key + '" aria-checked="' + val + '" data-tg="' + key + '"></button></div>'; }
    render();
  }

  // ---------- Nearby play ----------
  function nearby() {
    if (window.WM_PREVIEW) { toast('Nearby play works in the installed version of Word Mix, not this preview', 3600); return; }
    if (!WMNet.supported) { toast('This browser cannot do nearby play'); return home(); }
    var scr = mount(backBand('Play nearby') + '<div class="scroll">' + netWarning() +
      '<div class="card"><b style="font-size:18px">How it works</b><ol class="steps">' +
      '<li>Everyone joins the same Wi-Fi, or the host turns on their phone’s hotspot. No internet needed, but Wi-Fi must be on (not Airplane mode with Wi-Fi off).</li>' +
      '<li>The host picks a mode and shows a code.</li>' +
      '<li>Each friend scans it, then the host scans the reply.</li></ol></div>' +
      '<button class="big-choice" data-host><span class="ic" style="background:#FFE2C7;color:#C8530F">' + I.wifi + '</span><span><b>Host a game</b><small>Up to 8 players</small></span></button>' +
      '<button class="big-choice" data-join><span class="ic" style="background:#DCE8FF;color:#1E4FA8">' + I.camera + '</span><span><b>Join a game</b><small>Scan the host’s code</small></span></button>' +
      '</div>');
    on(scr.el, '[data-back]', 'click', party);
    $('[data-host]', scr.el).onclick = function () { setup('host'); };
    $('[data-join]', scr.el).onclick = joinGame;
  }
  function openScanner(title, onCode) {
    var o = document.createElement('div');
    o.className = 'scanner';
    o.innerHTML = '<video aria-label="Camera view"></video><div class="frame"></div>' +
      '<div class="bar-bottom"><span data-st>' + esc(title) + '</span><button class="btn btn-white" data-cancel style="min-width:200px">Cancel</button></div>';
    app.appendChild(o);
    var ctl = { stop: function () {} };
    var closed = false;
    function close() { if (closed) return; closed = true; ctl.stop(); o.remove(); }
    $('[data-cancel]', o).onclick = close;
    WMNet.startScanner($('video', o), function (text) { buzz(40); Snd.tone(1046, 0.1, 'sine', 0.06); close(); onCode(text); },
      function (err) { $('[data-st]', o).textContent = err.message; }).then(function (c) { ctl = c; if (closed) c.stop(); });
    return { close: close };
  }
  var SHOW_CODES = /codes/.test(location.hash);
  function codeFallback(code, onPaste, pasteLabel) {
    var o = document.createElement('div');
    o.className = 'overlay';
    o.innerHTML = '<div class="sheet" role="dialog" aria-modal="true"><h2 class="title">Use a text code</h2>' +
      (code ? '<span class="label">Your code (copy and send it)</span><textarea class="code-area" readonly data-mine>' + esc(code) + '</textarea><button class="btn btn-white" data-copy>Copy code</button>' : '') +
      (onPaste ? '<label class="label" for="paste">' + esc(pasteLabel) + '</label><textarea id="paste" class="code-area" data-paste placeholder="Paste the code here"></textarea><button class="btn btn-orange" data-use>Use this code</button>' : '') +
      '<button class="btn btn-ghost" data-close>Close</button></div>';
    app.appendChild(o);
    $('[data-close]', o).onclick = function () { o.remove(); };
    var copy = $('[data-copy]', o);
    if (copy) copy.onclick = function () {
      var t = $('[data-mine]', o); t.select();
      (navigator.clipboard ? navigator.clipboard.writeText(code) : Promise.reject()).then(function () { toast('Copied'); }, function () { document.execCommand('copy'); toast('Copied'); });
    };
    var use = $('[data-use]', o);
    if (use) use.onclick = function () { var v = $('[data-paste]', o).value.trim(); if (v) { o.remove(); onPaste(v); } };
  }
  // Phones need a shared network (Wi-Fi router or a hotspot) even with no internet.
  function netWarning() {
    var chromeAndroid = /Android/i.test(navigator.userAgent) && /Chrome\//.test(navigator.userAgent) && !/SamsungBrowser|EdgA|OPR|Firefox/i.test(navigator.userAgent);
    var note = chromeAndroid ? '<div class="card net-warn"><b>Playing over a phone hotspot?</b><p class="hint-text">Chrome on Android can\u2019t connect to other devices through this phone\u2019s own hotspot. Use Word Mix in <b>Samsung Internet</b> on this phone for hotspot games. Chrome works fine when everyone is on the same Wi-Fi router.</p></div>' : '';
    if (navigator.onLine !== false) return note;
    return '<div class="card net-warn" role="alert"><b>This device isn\u2019t on any network</b>' +
      '<p class="hint-text">Phones can\u2019t connect with Wi-Fi off or in Airplane mode. With no internet, the host turns on their phone\u2019s <b>hotspot</b> (mobile data can be off), and everyone joins that Wi-Fi. Or all join the same Wi-Fi router.</p></div>';
  }
  window.addEventListener('online', function () { $$('.net-warn', app).forEach(function (n) { n.remove(); }); });
  // Shows WMNet.describe(pc) every second in el until stop() is called.
  function liveDiag(el, pc) {
    var on = true;
    (function tick() {
      if (!on || !el.isConnected) return;
      WMNet.describe(pc).then(function (t) { if (on) el.textContent = 'Version ' + APP_VERSION + '\n' + t; setTimeout(tick, 1000); });
    })();
    return function () { on = false; };
  }
  function qrHtml() { return '<div class="qr-box"><canvas data-qr></canvas></div>'; }
  function drawQr(el, code) {
    var c = $('[data-qr]', el);
    if (!c) return;
    var card = c.closest('.card') || el;
    var w = Math.min(320, (card.clientWidth || 320) - 72, window.innerWidth - 100);
    WMQR.toCanvas(c, code, { size: Math.max(220, w), dark: '#2E2117' });
  }
  function send(dc, msg) { try { if (dc && dc.readyState === 'open') dc.send(JSON.stringify(msg)); } catch (e) {} }
  // Sends this phone's shared leaderboard in small pieces. The last piece is marked so the host can reply with its own.
  function sendShared(dc) {
    var all = allShared(), size = 80;
    if (!all.length) { send(dc, { t: 'sync', entries: [], last: true }); return; }
    for (var i = 0; i < all.length; i += size) send(dc, { t: 'sync', entries: all.slice(i, i + size), last: i + size >= all.length });
  }

  // Host
  function hostLobby(cfg) {
    var me = { id: 'h', key: myKey(), name: S.profile.name, avatar: S.profile.avatar, child: !!S.profile.child, me: true };
    var guests = [];
    var pending = null, busy = false, inGame = false, closed = false, gen = 0, guestSeq = 0;
    var round = null;
    var session = { round: 0, totals: {} };
    var spectator = null, resultsApi = null;
    function players() { return (cfg.screenOnly ? [] : [me]).concat(guests.map(function (g) { return { id: g.id, key: 'd:' + (g.did || g.id), name: g.name, avatar: g.avatar, child: !!g.child }; })); }
    function broadcast(msg) { guests.forEach(function (g) { send(g.dc, msg); }); }
    function lobbyMsg() { return { t: 'lobby', players: players(), mode: cfg.mode, n: cfg.n, minLen: cfg.minLen }; }
    function teardown() {
      closed = true;
      broadcast({ t: 'bye' });
      guests.forEach(function (g) { try { g.pc.close(); } catch (e) {} });
      if (pending) try { pending.pc.close(); } catch (e) {}
    }
    function newOffer() {
      if (closed || guests.length >= MAX_PLAYERS - 1) { pending = null; render(); return; }
      var my = ++gen;
      pending = null; render();
      WMNet.createOffer().then(function (o) {
        if (closed || my !== gen) { o.pc.close(); return; }
        pending = o; wireGuest(o); render();
      }).catch(function () { toast('Could not create a code. Try again.'); });
    }
    function wireGuest(o) {
      var g = { id: 'g' + (++guestSeq) + Date.now().toString(36), pc: o.pc, dc: o.dc, name: 'Player', avatar: 'fox', ready: false };
      o.dc.onmessage = function (e) {
        var m; try { m = JSON.parse(e.data); } catch (err) { return; }
        if (m.t === 'hello') {
          g.name = String(m.name || 'Player').slice(0, 14); g.avatar = String(m.avatar || 'fox'); g.did = String(m.did || ''); g.child = !!m.child;
          // Same phone rejoining: replace its old connection instead of adding a second player.
          var old = g.did && guests.filter(function (x) { return x !== g && x.did === g.did; })[0];
          if (old) { old.replaced = true; guests.splice(guests.indexOf(old), 1); try { old.pc.close(); } catch (err) {} }
          if (S.profile && g.name.toLowerCase() !== S.profile.name.toLowerCase()) rememberPlayer({ name: g.name, avatar: g.avatar });
          if (!g.ready) {
            g.ready = true; guests.push(g); busy = false;
            send(g.dc, { t: 'welcome', id: g.id });
            Snd.good(3); toast(g.name + (old ? ' rejoined' : ' joined'));
            broadcast(lobbyMsg());
            if (!inGame) newOffer();
          }
        } else if (m.t === 'sync') {
          mergeShared(m.entries);
          if (m.last) sendShared(g.dc);
        } else if (m.t === 'count') {
          if (spectator) spectator.setCount(g.id, +m.n || 0);
        } else if (m.t === 'ready') {
          if (resultsApi) resultsApi.setReady('d:' + (g.did || g.id));
        } else if (m.t === 'done' && round) {
          round.done[g.id] = Array.isArray(m.words) ? m.words.slice(0, 2000).map(String) : [];
          round.check();
        }
      };
      o.dc.onclose = function () { dropGuest(g); };
      o.pc.addEventListener('connectionstatechange', function () {
        if (o.pc.connectionState === 'failed' || o.pc.connectionState === 'closed') {
          if (!g.ready && pending && pending.pc === o.pc) { busy = false; toast('That connection failed. Try again.'); newOffer(); }
          else dropGuest(g);
        }
      });
    }
    function dropGuest(g) {
      var i = guests.indexOf(g);
      if (i < 0) return;
      guests.splice(i, 1);
      try { g.pc.close(); } catch (e) {}
      if (!closed) {
        toast(g.name + ' left');
        broadcast(lobbyMsg());
        if (round) round.check();
        if (!inGame) { if (!pending) newOffer(); else render(); }
      }
    }
    var scr = null;
    function render() {
      if (inGame || closed) return;
      if (!scr || !scr.el.isConnected) {
        scr = mount(backBand('Host a game') + '<div class="scroll" data-body></div>');
        scr.cleanup = function () {};
        on(scr.el, '[data-back]', 'click', function () {
          confirmBox('Close this game?', 'Close game', 'Stay').then(function (y) { if (y) { teardown(); nearby(); } });
        });
      }
      var body = $('[data-body]', scr.el);
      var list = players();
      var html = netWarning() + '<div class="card"><span class="label">' + MODES[cfg.mode].name + ' · ' + cfg.n + ' × ' + cfg.n + ' · Players ' + list.length + ' of ' + MAX_PLAYERS + '</span><div class="players">' +
        list.map(function (p) { return '<div class="prow">' + avatar(p.avatar, 44) + '<b>' + esc(p.name) + '</b><span class="tag">' + (p.id === 'h' ? 'Host' : 'Joined') + '</span></div>'; }).join('') +
        (cfg.screenOnly ? '<p class="hint-text">This device is the big screen and doesn\u2019t play.' + (list.length ? '' : ' Waiting for players to join.') + '</p>' : '') + '</div></div>';
      if (guests.length < MAX_PLAYERS - 1) {
        html += '<div class="card" style="align-items:stretch"><b style="font-size:18px">Add a player</b>';
        if (busy) html += '<div class="status"><span class="spinner"></span>Connecting…</div>' + (SHOW_CODES ? '<pre class="diag-box" data-diag></pre>' : '');
        else if (!pending) html += '<div class="status"><span class="spinner"></span>Making a code…</div>';
        else html += '<p class="hint-text"><b>1.</b> Your friend taps <b>Party mode</b> \u2192 <b>Phone to phone</b> \u2192 <b>Join a game</b> and scans this code.</p>' + qrHtml() +
          '<p class="hint-text"><b>2.</b> A code appears on their phone. Tap below and point your camera at it.</p>' +
          '<button class="btn btn-blue" data-scan>' + I.camera + 'Scan their code</button>' +
          (SHOW_CODES ? '<button class="btn btn-ghost" data-text>Use a text code</button>' : '');
        html += '</div>';
      }
      html += '<button class="btn btn-orange" data-start ' + (guests.length ? '' : 'disabled') + '>' + I.play + 'Start game</button>';
      if (!guests.length) html += '<p class="hint-text" style="text-align:center">Waiting for at least one friend to join.</p>';
      body.innerHTML = html;
      var dg = $('[data-diag]', body);
      if (dg && pending) liveDiag(dg, pending.pc);
      if (pending && !busy) {
        drawQr(body, pending.code);
        $('[data-scan]', body).onclick = function () { openScanner('Point at the code on your friend\u2019s phone', accept); };
        if (SHOW_CODES) $('[data-text]', body).onclick = function () { codeFallback(pending.code, accept, 'Their reply code'); };
      }
      var st = $('[data-start]', body);
      if (st) st.onclick = startRound;
    }
    function accept(code) {
      if (!pending) return;
      busy = true; render();
      var p = pending;
      WMNet.acceptAnswer(p.pc, code).then(function () {
        render();
        setTimeout(function () {
          if (busy && pending === p && !(guests.some(function (g) { return g.pc === p.pc; }))) {
            busy = false; toast('Could not connect. Check you are on the same Wi-Fi.'); try { p.pc.close(); } catch (e) {} newOffer();
          }
        }, 45000);
      }).catch(function (e) { busy = false; toast(e.message || 'That code did not work'); render(); });
    }
    function startRound() {
      if (!guests.length) return;
      gen++;
      if (pending && !busy) { try { pending.pc.close(); } catch (e) {} pending = null; }
      inGame = true; resultsApi = null;
      var board = makeBoard(cfg.n, cfg.minLen, cfg.seed, cfg.easy);
      var everyone = players();
      round = { done: {}, finished: false, myWords: cfg.screenOnly ? [] : null, timer: null, board: board };
      round.check = function () {
        if (round.finished || !round.myWords) return;
        var waiting = guests.filter(function (g) { return !round.done[g.id]; });
        if (waiting.length && !round.timeoutHit) return;
        round.finished = true; clearTimeout(round.timer);
        spectator = null;
        var res = everyone.filter(function (p) { return p.id === 'h' || round.done[p.id] || guests.some(function (g) { return g.id === p.id; }); }).map(function (p) {
          return { id: p.id, key: p.key, name: p.name, avatar: p.avatar, child: !!p.child, words: p.id === 'h' ? round.myWords : (round.done[p.id] || []) };
        });
        var mine = res.map(function (r) { return Object.assign({}, r, { me: r.id === 'h' }); });
        var rid = newId(), at = Date.now();
        inGame = false;
        resultsApi = resultsShow(cfg, mine, {
          board: round.board, session: session, save: true, rid: rid, at: at,
          note: 'Players tap Ready on their phones. You can start whenever you like.',
          actions: [
            { label: 'Start next round', cls: 'btn-blue', icon: I.play, run: function () { if (!guests.length) { toast('Everyone has left. Go back to the lobby to add players.'); return; } startRound(); } },
            { label: 'Back to lobby to add players', run: function () { resultsApi = null; round = null; broadcast(lobbyMsg()); scr = null; newOffer(); } },
            { label: 'Close game', run: function () { teardown(); home(); } }
          ]
        });
        broadcast({ t: 'results', players: res, mode: cfg.mode, n: cfg.n, minLen: cfg.minLen, scoring: cfg.scoring, easy: !!cfg.easy, round: resultsApi.round, totals: resultsApi.table, rid: rid, at: at });
        // Then swap leaderboards so every phone has everyone's scores.
        setTimeout(function () { guests.forEach(function (g) { sendShared(g.dc); }); }, 1500);
      };
      broadcast({ t: 'start', cells: board.cells, n: cfg.n, minLen: cfg.minLen, mode: cfg.mode, time: cfg.time, scoring: cfg.scoring, easy: !!cfg.easy, players: everyone });
      function collecting() {
        mount('<div class="loading"><span class="spinner" style="width:40px;height:40px;border-width:5px"></span><p>Collecting everyone’s words…</p></div>');
        round.timer = setTimeout(function () { round.timeoutHit = true; round.check(); }, 8000);
        round.check();
      }
      if (cfg.screenOnly) {
        spectator = spectate(board, cfg, everyone, session.round + 1, function () { collecting(); }, function () { teardown(); home(); });
        return;
      }
      playBoard({
        board: board, cfg: cfg, player: me, multiplayer: true,
        onEnd: function (r) { round.myWords = r.words; collecting(); },
        onQuit: function () { teardown(); home(); }
      });
    }
    WMNet.primeCamera().then(newOffer);
    render();
  }

  // Guest
  function joinGame() {
    var link = null, dc = null, hostPlayers = [], game = null, closed = false, lastCfg = null, myId = null, lastBoard = null;
    var scr = mount(backBand('Join a game') + '<div class="scroll" data-body></div>');
    function leave() { closed = true; try { if (link) link.pc.close(); } catch (e) {} }
    on(scr.el, '[data-back]', 'click', function () { leave(); nearby(); });
    function step1() {
      var body = $('[data-body]', scr.el);
      body.innerHTML = netWarning() + '<div class="card"><b style="font-size:18px">Scan the host’s code</b><p class="hint-text">Ask the host to tap <b>Host a game</b>. Their screen will show a code.</p>' +
        '<button class="btn btn-blue" data-scan>' + I.camera + 'Open camera</button>' + (SHOW_CODES ? '<button class="btn btn-ghost" data-text>Use a text code</button>' : '') + '</div>';
      $('[data-scan]', body).onclick = function () { openScanner('Point at the code on the host’s phone', gotOffer); };
      if (SHOW_CODES) $('[data-text]', body).onclick = function () { codeFallback(null, gotOffer, 'Host’s code'); };
    }
    function gotOffer(code) {
      var body = $('[data-body]', scr.el);
      body.innerHTML = '<div class="status"><span class="spinner"></span>Making your reply…</div>';
      WMNet.answerOffer(code).then(function (l) {
        if (closed) { l.pc.close(); return; }
        link = l;
        body.innerHTML = '<div class="card" style="align-items:stretch"><b style="font-size:18px">Show this to the host</b><p class="hint-text">The host taps <b>Scan their code</b> and points their phone at this code.</p>' + qrHtml() +
          '<div class="status"><span class="spinner"></span>Waiting for the host…</div>' + (SHOW_CODES ? '<pre class="diag-box" data-diag></pre>' : '') + (SHOW_CODES ? '<button class="btn btn-ghost" data-text>Use a text code</button>' : '') + '</div>';
        drawQr(body, l.code);
        if ($('[data-diag]', body)) liveDiag($('[data-diag]', body), l.pc);
        if (SHOW_CODES) $('[data-text]', body).onclick = function () { codeFallback(l.code, null); };
        l.pc.addEventListener('connectionstatechange', function () {
          if (l.pc.connectionState === 'failed') toast('Could not connect. Check you are on the same Wi-Fi or hotspot.', 5000);
        });
        l.dcPromise.then(function (ch) {
          dc = ch;
          ch.onopen = function () { send(dc, { t: 'hello', name: S.profile.name, avatar: S.profile.avatar, did: S.deviceId, child: !!S.profile.child }); sendShared(dc); };
          if (ch.readyState === 'open') ch.onopen();
          ch.onmessage = onMsg;
          ch.onclose = function () { if (!closed) { closed = true; toast('Lost connection to the host'); home(); } };
        });
      }).catch(function (e) { toast(e.message || 'That code did not work'); step1(); });
    }
    function lobby(m) {
      if (m) { hostPlayers = m.players || hostPlayers; lastCfg = m; }
      var s = mount(backBand('Waiting to start') + '<div class="scroll"><div class="card"><div class="status" style="justify-content:flex-start"><span class="spinner"></span>Connected! The host will start the game.</div>' +
        (lastCfg ? '<span class="label">' + MODES[lastCfg.mode].name + ' · ' + lastCfg.n + ' × ' + lastCfg.n + '</span>' : '') +
        '<div class="players">' + hostPlayers.map(function (p) { return '<div class="prow">' + avatar(p.avatar, 44) + '<b>' + esc(p.name) + '</b><span class="tag">' + (p.id === 'h' ? 'Host' : '') + '</span></div>'; }).join('') + '</div></div></div>');
      s.cleanup = function () {};
      on(s.el, '[data-back]', 'click', function () {
        confirmBox('Leave this game?', 'Leave', 'Stay').then(function (y) { if (y) { leave(); home(); } });
      });
    }
    function onMsg(e) {
      var m; try { m = JSON.parse(e.data); } catch (err) { return; }
      if (m.t === 'welcome') { myId = m.id; }
      else if (m.t === 'sync') { mergeShared(m.entries); }
      else if (m.t === 'lobby') { if (!game || game.isEnded()) lobby(m); else { hostPlayers = m.players; } }
      else if (m.t === 'start') {
        var cfg = { mode: m.mode, n: m.n, minLen: m.minLen, time: m.time, scoring: m.scoring || 'length', easy: !!m.easy };
        var board = boardFromCells(m.cells, m.n, m.minLen, !!m.easy);
        lastBoard = board;
        game = playBoard({
          board: board, cfg: cfg, player: S.profile, multiplayer: true, ambient: false,
          onWord: function (n) { send(dc, { t: 'count', n: n }); },
          onEnd: function (r) {
            send(dc, { t: 'done', words: r.words });
            mount('<div class="loading"><span class="spinner" style="width:40px;height:40px;border-width:5px"></span><p>Waiting for everyone’s words…</p></div>');
          },
          onQuit: function () { leave(); home(); }
        });

      } else if (m.t === 'results') {
        if (game && !game.isEnded()) game.forceEnd();
        var players = (m.players || []).map(function (p) { return { id: p.id, key: p.key, name: String(p.name).slice(0, 14), avatar: p.avatar, child: !!p.child, words: (p.words || []).map(String), me: p.id === myId }; });
        var cfg2 = { mode: m.mode, n: m.n, minLen: m.minLen, scoring: m.scoring || 'length', easy: !!m.easy, time: MODES[m.mode] ? MODES[m.mode].time : 0 };
        setTimeout(function () {
          resultsShow(cfg2, players, { board: lastBoard, totals: m.totals || [], round: m.round || 1, save: true, rid: typeof m.rid === 'string' ? m.rid.slice(0, 60) : null, at: +m.at || Date.now(),
            note: 'The host starts the next round.',
            onReady: function () { send(dc, { t: 'ready' }); },
            actions: [{ label: 'Leave game', run: function () { confirmBox('Leave this game?', 'Leave', 'Stay').then(function (y) { if (y) { leave(); home(); } }); } }] });
        }, game && !game.isEnded() ? 1200 : 0);
      } else if (m.t === 'bye') {
        closed = true; toast('The host closed the game'); home();
      }
    }
    step1();
  }

  // ---------- Boot ----------
  function boot() {
    app.innerHTML = '<section class="screen"><div class="loading">' + logo(true, true) + '<p>Loading words…</p></div></section>';
    if (navigator.onLine !== false && !('BarcodeDetector' in window)) setTimeout(function () { WMNet.loadJsQR().catch(function () {}); }, 3000);
    loadWords().then(home, function () {
      $('.loading p', app).textContent = 'Could not load the word list. Check your connection and reopen Word Mix.';
    });
  }
  window.WordMix = { solve: solve, makeBoard: makeBoard, computeRound: computeRound, isEasyWord: isEasyWord, state: function () { return S; } };
  boot();
})();
