/* Word Mix: a word-grid game for phones. Works offline; nearby play over WebRTC. */
(function () {
  'use strict';

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
  function pts(len) { if (len <= 4) return 1; if (len === 5) return 2; if (len === 6) return 3; if (len === 7) return 5; return 11; }
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
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M9 6v12M15 6v12"/></svg>',
    play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>'
  };

  // ---------- Storage ----------
  var KEY = 'wordmix.v1';
  var DEFAULTS = { profile: null, saved: [], settings: { hintDelay: 5, hint3: true, sound: true, vibrate: true }, boards: {}, last: { mode: 'classic', size: 4, minLen: 3 } };
  var S;
  try { S = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { S = {}; }
  S = Object.assign({}, DEFAULTS, S);
  S.settings = Object.assign({}, DEFAULTS.settings, S.settings || {});
  S.last = Object.assign({}, DEFAULTS.last, S.last || {});
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  function rememberPlayer(p) {
    S.saved = S.saved.filter(function (x) { return x.name.toLowerCase() !== p.name.toLowerCase(); });
    S.saved.unshift({ name: p.name, avatar: p.avatar });
    S.saved = S.saved.slice(0, 12);
    save();
  }

  // ---------- Sound and haptics ----------
  var Snd = {
    ctx: null,
    init: function () {
      if (this.ctx) return;
      try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { this.ctx = null; }
    },
    tone: function (f, dur, type, vol, delay) {
      if (!S.settings.sound || !this.ctx) return;
      var c = this.ctx, t = c.currentTime + (delay || 0);
      var o = c.createOscillator(), g = c.createGain();
      o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol || 0.08, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(c.destination);
      o.start(t); o.stop(t + dur + 0.02);
    },
    tick: function (i) { this.tone(420 + Math.min(i, 12) * 45, 0.07, 'triangle', 0.05); },
    good: function (len) { this.tone(660, 0.14, 'sine', 0.08); this.tone(880, 0.18, 'sine', 0.08, 0.1); if (len >= 6) this.tone(1175, 0.26, 'sine', 0.07, 0.22); },
    bad: function () { this.tone(190, 0.2, 'square', 0.03); },
    tally: function () { this.tone(1046, 0.05, 'triangle', 0.035); },
    cheer: function () { [523, 659, 784, 1046].forEach(function (f, i) { Snd.tone(f, 0.22, 'sine', 0.06, i * 0.11); }); }
  };
  function buzz(ms) { if (S.settings.vibrate && navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} } }
  document.addEventListener('pointerdown', function () {
    Snd.init();
    if (Snd.ctx && Snd.ctx.state === 'suspended') Snd.ctx.resume();
  }, { capture: true });

  // ---------- Dictionary and boards ----------
  var WORDS = [], WSET = null;
  function loadWords() {
    var inline = document.getElementById('wm-words');
    if (inline) {
      WORDS = inline.textContent.trim().split('\n');
      WSET = new Set(WORDS);
      return Promise.resolve();
    }
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
  var BAG = (function () {
    var out = [], re = /([a-z])(\d+)/g, m, total = 0;
    while ((m = re.exec(FREQ))) { total += +m[2]; out.push([m[1], total]); }
    return { list: out, total: total };
  })();
  function pickLetter(rand) {
    var x = rand() * BAG.total;
    for (var i = 0; i < BAG.list.length; i++) if (x < BAG.list[i][1]) return BAG.list[i][0];
    return 'e';
  }
  function makeCells(n, rand) {
    var size = n * n;
    for (var tries = 0; tries < 200; tries++) {
      var cells = [], counts = {}, vowels = 0, rare = 0, ok = true;
      for (var i = 0; i < size; i++) {
        var l = pickLetter(rand);
        counts[l] = (counts[l] || 0) + 1;
        if ('aeiou'.indexOf(l) >= 0) vowels++;
        if ('jkqvwxzy'.indexOf(l) >= 0) rare++;
        cells.push(l === 'q' ? 'qu' : l);
      }
      var maxSame = Math.max(2, Math.ceil(size / 8)), maxE = Math.max(3, Math.ceil(size / 6));
      for (var k in counts) if (counts[k] > (k === 'e' ? maxE : maxSame)) ok = false;
      if ((counts.q || 0) > 1) ok = false;
      if (rare > Math.ceil(size / 10)) ok = false;
      if (vowels < size * 0.3 || vowels > size * 0.45) ok = false;
      if (ok) return cells;
    }
    return cells;
  }
  function makeBoard(n, minLen, seed) {
    var rand = rng(seed == null ? (Math.random() * 4294967296) >>> 0 : seed);
    var target = { 4: 40, 5: 110, 6: 200 }[n], best = null;
    var attempts = n === 6 ? 10 : 20;
    for (var a = 0; a < attempts; a++) {
      var cells = makeCells(n, rand);
      var words = solve(cells, n, minLen);
      if (!best || words.size > best.words.size) best = { cells: cells, words: words };
      if (words.size >= target) break;
    }
    return { n: n, minLen: minLen, cells: best.cells, words: best.words };
  }
  function boardFromCells(cells, n, minLen) { return { n: n, minLen: minLen, cells: cells, words: solve(cells, n, minLen) }; }

  // ---------- Modes ----------
  var MODES = {
    classic: { name: 'Classic', time: 180, desc: '3 minutes' },
    blitz: { name: 'Blitz', time: 60, desc: '1 minute, go fast' },
    zen: { name: 'Zen', time: 0, desc: 'No timer, finish when you like' },
    daily: { name: 'Daily', time: 180, desc: 'One board a day, 3 minutes' }
  };
  function boardKey(mode, n) { return mode === 'daily' ? 'daily:' + todayKey() : mode + ':' + n; }
  function addScore(mode, n, minLen, player, score, words) {
    if (mode === 'zen') return false;
    var key = boardKey(mode, n);
    var list = S.boards[key] || [];
    var prevBest = list.length ? list[0].score : -1;
    list.push({ name: player.name, avatar: player.avatar, score: score, words: words, minLen: minLen, at: Date.now() });
    list.sort(function (a, b) { return b.score - a.score || a.at - b.at; });
    S.boards[key] = list.slice(0, 20);
    save();
    return score > prevBest && score > 0;
  }

  // ---------- Screen management ----------
  var current = null;
  function mount(html, cls) {
    if (current && current.cleanup) { try { current.cleanup(); } catch (e) {} }
    var old = $$('.screen', app).filter(function (s) { return !s.classList.contains('leaving'); });
    old.forEach(function (s) { s.classList.add('leaving'); setTimeout(function () { s.remove(); }, 280); });
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
      onSave: function (p) { S.profile = p; rememberPlayer(p); save(); (back || home)(); }
    });
  }

  // ---------- Home ----------
  function home() {
    if (!S.profile) return editMyProfile(home);
    var scr = mount(
      '<header class="band" style="padding-bottom:24px">' +
      '<div class="band-row"><button class="player-chip" data-profile aria-label="Edit profile">' + avatar(S.profile.avatar, 40) + '<span>' + esc(S.profile.name) + '</span></button>' +
      '<button class="icon-btn" data-settings aria-label="Settings">' + I.gear + '</button></div>' +
      '<div style="display:flex;justify-content:center;padding:8px 0 4px">' + logo(true, true) + '</div></header>' +
      '<div class="scroll">' +
      choice('solo', I.user, '#FFE2C7', '#C8530F', 'Play solo', 'Beat your best score') +
      choice('pass', I.users, '#DCE8FF', '#1E4FA8', 'Pass and play', '2 to 6 players on one phone') +
      choice('nearby', I.wifi, '#DDF0E8', '#2E7D1E', 'Play nearby', 'Phone to phone, no internet needed') +
      '<button class="btn btn-white" data-boards>' + I.trophy + 'Leaderboards</button>' +
      '</div>'
    );
    var el = scr.el;
    function choice(id, icon, bg, fg, title, sub) {
      return '<button class="big-choice" data-go="' + id + '"><span class="ic" style="background:' + bg + ';color:' + fg + '">' + icon + '</span><span><b>' + title + '</b><small>' + sub + '</small></span></button>';
    }
    $('[data-profile]', el).onclick = function () { editMyProfile(home); };
    $('[data-settings]', el).onclick = function () { settings(home); };
    $('[data-boards]', el).onclick = function () { leaderboards(home); };
    on(el, '[data-go]', 'click', function (e) {
      var go = e.currentTarget.getAttribute('data-go');
      if (go === 'solo') setup('solo');
      else if (go === 'pass') setup('pass');
      else nearby();
    });
  }

  // ---------- Game setup ----------
  function setup(kind, preset) {
    var cfg = Object.assign({ mode: S.last.mode, size: S.last.size, minLen: S.last.minLen }, preset || {});
    if (kind === 'host' && cfg.mode === 'zen') cfg.mode = 'classic';
    var players = kind === 'pass' ? (setup.players || [S.profile]) : null;
    if (kind === 'pass') setup.players = players;
    var titles = { solo: 'Play solo', pass: 'Pass and play', host: 'Host a game' };
    var scr = mount(backBand(titles[kind]) + '<div class="scroll" data-body></div>');
    var el = scr.el;
    on(el, '[data-back]', 'click', function () { kind === 'host' ? nearby() : home(); });
    function render() {
      var modes = Object.keys(MODES).filter(function (m) { return !(kind === 'host' && m === 'zen'); });
      var daily = cfg.mode === 'daily';
      var html = '<span class="label">Mode</span><div class="modes">' +
        modes.map(function (m) { return '<button class="mode" data-mode="' + m + '" aria-pressed="' + (cfg.mode === m) + '"><b>' + MODES[m].name + '</b><small>' + MODES[m].desc + '</small></button>'; }).join('') +
        '</div>';
      if (!daily) {
        html += '<span class="label">Board size</span><div class="seg">' +
          [4, 5, 6].map(function (n) { return '<button data-size="' + n + '" aria-pressed="' + (cfg.size === n) + '">' + n + ' × ' + n + '</button>'; }).join('') + '</div>' +
          '<span class="label">Shortest word</span><div class="seg">' +
          [3, 4].map(function (n) { return '<button data-min="' + n + '" aria-pressed="' + (cfg.minLen === n) + '">' + n + ' letters</button>'; }).join('') + '</div>';
      } else {
        html += '<p class="hint-text">Today’s board is the same for everyone playing Word Mix: 4 × 4, 3-letter words and up.</p>';
      }
      if (kind === 'pass') {
        html += '<span class="label">Players (' + players.length + ' of 6)</span><div class="players">' +
          players.map(function (p, i) { return '<div class="prow">' + avatar(p.avatar, 44) + '<b>' + esc(p.name) + '</b>' + (players.length > 1 ? '<button class="x" data-rm="' + i + '" aria-label="Remove ' + esc(p.name) + '">' + I.close + '</button>' : '') + '</div>'; }).join('') +
          '</div>' + (players.length < 6 ? '<button class="btn btn-white" data-add>' + I.plus + 'Add player</button>' : '');
      }
      var ready = kind !== 'pass' || players.length >= 2;
      html += '<button class="btn btn-orange" data-start ' + (ready ? '' : 'disabled') + ' style="margin-top:6px">' + (kind === 'host' ? 'Next: invite players' : 'Start') + '</button>';
      if (kind === 'pass' && !ready) html += '<p class="hint-text" style="text-align:center">Add at least one more player.</p>';
      var body = $('[data-body]', el);
      body.innerHTML = html;
      on(body, '[data-mode]', 'click', function (e) { cfg.mode = e.currentTarget.getAttribute('data-mode'); render(); });
      on(body, '[data-size]', 'click', function (e) { cfg.size = +e.currentTarget.getAttribute('data-size'); render(); });
      on(body, '[data-min]', 'click', function (e) { cfg.minLen = +e.currentTarget.getAttribute('data-min'); render(); });
      on(body, '[data-rm]', 'click', function (e) { players.splice(+e.currentTarget.getAttribute('data-rm'), 1); render(); });
      on(body, '[data-add]', 'click', function () { addPlayerSheet(players, render); });
      $('[data-start]', body).onclick = function () {
        S.last = { mode: cfg.mode, size: cfg.size, minLen: cfg.minLen }; save();
        var c = finalCfg(cfg);
        if (kind === 'solo') playSolo(c);
        else if (kind === 'pass') { setup.players = players; playPass(c, players); }
        else hostLobby(c);
      };
    }
    render();
  }
  function finalCfg(cfg) {
    var daily = cfg.mode === 'daily';
    return { mode: cfg.mode, n: daily ? 4 : cfg.size, minLen: daily ? 3 : cfg.minLen, time: MODES[cfg.mode].time, seed: daily ? hashStr('wordmix-' + todayKey()) : null };
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
          rememberPlayer(p); players.push(p); setup.players = players; setup('pass');
        }
      });
    };
  }

  // ---------- The game ----------
  function countdown(parent) {
    return new Promise(function (res) {
      var o = document.createElement('div');
      o.className = 'overlay center';
      o.style.background = 'rgba(242,107,33,.92)';
      parent.appendChild(o);
      var n = 3;
      function step() {
        if (n === 0) { o.remove(); res(); return; }
        o.innerHTML = '<div class="countdown" aria-live="assertive">' + n + '</div>';
        Snd.tone(n === 1 ? 880 : 660, 0.12, 'sine', 0.07);
        n--; setTimeout(step, 900);
      }
      step();
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
      '<button class="icon-btn" data-menu aria-label="Pause">' + I.menu + '</button></div></div>' +
      '<div style="display:flex;gap:10px">' +
      (timed ? '<div class="stat"><span class="clock" data-clock>0:00</span><div class="bar"><i data-bar></i></div></div>' : '<div class="stat"><span class="clock">Zen</span><span style="font-weight:700;color:var(--muted);font-size:14px">No timer</span></div>') +
      '<div class="count" data-count><b>0</b><small>words</small></div></div></header>' +
      '<div class="wordbar"><div class="w placeholder" data-word>Swipe to start</div><div class="m" data-msg aria-live="polite">Lift your finger to submit</div></div>' +
      '<div class="board-wrap" data-wrap><div class="board-panel"><div class="board" data-board style="--n:' + n + '"></div></div></div>' +
      '<div class="game-foot" data-foot></div>'
    );
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
      var w = wrap.clientWidth - 32, h = wrap.clientHeight - 24;
      var side = Math.max(200, Math.min(w, h, 520)) - 16;
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
      if (foundSet.has(w)) { setMsg('Already found', 'bad', W); Snd.bad(); buzz(30); return; }
      foundSet.add(w); found.push(w);
      setMsg(['Nice!', 'Got it!', 'Good one!', 'Yes!', 'Lovely!'][found.length % 5], 'good', W);
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
      dragging = true; path = [c]; paint(); Snd.tick(0); buzz(6);
    });
    boardEl.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var c = cellAt(e, false);
      if (c < 0) return;
      var last = path[path.length - 1];
      if (c === last) return;
      if (path.length > 1 && c === path[path.length - 2]) { path.pop(); paint(); Snd.tick(path.length - 1); return; }
      if (path.indexOf(c) < 0 && adj(last, c)) { path.push(c); paint(); Snd.tick(path.length - 1); buzz(6); }
    });
    function up() { if (!dragging) return; dragging = false; submit(); }
    boardEl.addEventListener('pointerup', up);
    boardEl.addEventListener('pointercancel', up);

    // Hints: after a touch, wait for the idle delay; then offer a Hint button for 3 seconds.
    var lastTouch = Date.now(), armed = true, hintBtnUntil = 0, hintGlowUntil = 0, hintPath = null;
    function touched() { lastTouch = Date.now(); armed = true; if (hintBtnUntil) hideHintBtn(); }
    el.addEventListener('pointerdown', function (e) { if (!e.target.closest('[data-hint]')) touched(); }, true);
    function showHintBtn() {
      hintBtnUntil = Date.now() + 3000;
      foot.innerHTML = '<button class="hint-btn" data-hint>' + I.bulb + 'Hint</button>';
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
      b.words.forEach(function (p, w) { if (!foundSet.has(w) && (!S.settings.hint3 || w.length === 3)) pool.push(p); });
      if (!pool.length) { setMsg(S.settings.hint3 ? 'No 3-letter words left to hint' : 'No words left to hint', 'hint'); return; }
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

    // Timer and pause. The clock starts once the 3-2-1 countdown is over.
    var started = false, paused = false, remaining = cfg.time * 1000, endAt = Date.now() + remaining;
    function start() {
      if (started || ended) return;
      started = true; endAt = Date.now() + cfg.time * 1000; lastTouch = Date.now(); armed = true;
    }
    var clockEl = $('[data-clock]', el), barEl = $('[data-bar]', el);
    function fmt(ms) { var s = Math.ceil(ms / 1000), m = Math.floor(s / 60); s %= 60; return m + ':' + (s < 10 ? '0' : '') + s; }
    var lastBeep = -1;
    function tick() {
      if (ended) return;
      var now = Date.now();
      if (!started) { if (timed) { clockEl.textContent = fmt(cfg.time * 1000); barEl.style.transform = 'scaleX(1)'; } return; }
      if (timed && !paused) {
        var left = Math.max(0, endAt - now);
        clockEl.textContent = fmt(left);
        barEl.style.transform = 'scaleX(' + (left / (cfg.time * 1000)) + ')';
        var secs = Math.ceil(left / 1000);
        if (secs <= 5 && secs > 0 && secs !== lastBeep) { lastBeep = secs; Snd.tone(1200, 0.06, 'triangle', 0.04); }
        if (left <= 0) { finish(); return; }
      }
      if (hintGlowUntil && now >= hintGlowUntil) clearHintGlow();
      if (hintBtnUntil && now >= hintBtnUntil) hideHintBtn();
      var delay = S.settings.hintDelay;
      if (!paused && delay > 0 && armed && !dragging && !hintBtnUntil && !hintPath && now - lastTouch >= delay * 1000) { armed = false; showHintBtn(); }
    }
    var timer = setInterval(tick, 200);
    tick();
    function pause() {
      if (paused || ended) return;
      paused = true; remaining = endAt - Date.now();
      if (dragging) { dragging = false; path = []; paint(); }
      var o = document.createElement('div');
      o.className = 'overlay center';
      o.innerHTML = '<div class="dialog" role="dialog" aria-modal="true"><h2 class="title">' + (opts.multiplayer ? 'Game menu' : 'Paused') + '</h2>' +
        (opts.multiplayer ? '<p class="hint-text">The clock keeps running in a nearby game.</p>' : '') +
        '<button class="btn btn-orange" data-resume>Resume</button><button class="btn btn-white" data-quit>' + (opts.multiplayer ? 'Leave game' : 'Quit to home') + '</button></div>';
      el.appendChild(o);
      $('[data-resume]', o).onclick = function () { o.remove(); resume(); };
      $('[data-quit]', o).onclick = function () { o.remove(); ended = true; stop(); opts.onQuit ? opts.onQuit() : home(); };
    }
    function resume() {
      if (!opts.multiplayer) endAt = Date.now() + remaining;
      paused = false; lastTouch = Date.now(); armed = true;
    }
    $('[data-menu]', el).onclick = pause;
    var fin = $('[data-finish]', el);
    if (fin) fin.onclick = function () { confirmBox('Finish this round?', 'Finish', 'Keep playing').then(function (y) { if (y) finish(); }); };
    function onVis() { if (document.hidden && timed && !opts.multiplayer) pause(); }
    document.addEventListener('visibilitychange', onVis);
    function stop() {
      clearInterval(timer);
      window.removeEventListener('resize', layout);
      document.removeEventListener('visibilitychange', onVis);
    }
    function finish() {
      if (ended) return;
      ended = true; dragging = false; path = []; paint(); stop(); clearHintGlow(); foot.innerHTML = '';
      setMsg(timed ? 'Time’s up!' : 'Round over', 'good');
      Snd.tone(523, 0.3, 'sine', 0.07); Snd.tone(392, 0.4, 'sine', 0.07, 0.25);
      buzz(60);
      setTimeout(function () { opts.onEnd({ words: found.slice(), hints: hintsUsed }); }, 1100);
    }
    scr.cleanup = function () { ended = true; stop(); };
    boardEl.addEventListener('pointerdown', function (e) { if (!started) e.stopImmediatePropagation(); }, true);
    var api = { forceEnd: finish, el: el, start: start, isEnded: function () { return ended; } };
    countdown(el).then(start);
    return api;
  }

  function scoreWords(words, sharedSet) {
    return words.map(function (w) { var shared = sharedSet && sharedSet.has(w); return { w: w, p: shared ? 0 : pts(w.length), shared: shared }; });
  }
  // ---------- Solo ----------
  function playSolo(cfg) {
    var board = makeBoard(cfg.n, cfg.minLen, cfg.seed);
    var game = playBoard({
      board: board, cfg: cfg, player: S.profile,
      onEnd: function (res) {
        var list = scoreWords(res.words).sort(function (a, b) { return b.p - a.p || b.w.length - a.w.length; });
        var total = list.reduce(function (a, x) { return a + x.p; }, 0);
        var best = addScore(cfg.mode, cfg.n, cfg.minLen, S.profile, total, list.length);
        resultsSolo(cfg, list, total, res.hints, best);
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
      return '<div class="wrow' + (x.shared ? ' shared' : '') + '" style="animation-delay:' + ((baseDelay || 0) + i * 0.15) + 's"><b>' + esc(x.w.toUpperCase()) + '</b><span class="pts">' + (x.shared ? 'shared, 0' : x.p + (x.p === 1 ? ' pt' : ' pts')) + '</span></div>';
    }).join('');
  }
  function resultsSolo(cfg, list, total, hints, best) {
    var scr = mount(
      '<header class="band" style="padding-top:calc(26px + env(safe-area-inset-top));padding-bottom:22px;gap:6px">' +
      '<div class="eyebrow">' + (cfg.time ? 'Time’s up' : 'Round over') + ' · ' + MODES[cfg.mode].name + '</div>' +
      '<div class="total" data-total>0</div>' +
      '<div class="sub">' + plural(list.length, 'word', 'words') + (hints ? ' · ' + plural(hints, 'hint', 'hints') + ' used' : '') + '</div>' +
      (best ? '<div class="badge">New best score!</div>' : '') + '</header>' +
      '<div class="scroll"><span class="label">Your words</span>' + wordRows(list, 0.5) +
      '<div style="display:flex;flex-direction:column;gap:10px;margin-top:8px"><button class="btn btn-blue" data-again>' + I.play + 'Play again</button>' +
      '<button class="btn btn-white" data-home>Home</button></div></div>'
    );
    setTimeout(function () { tallyUp($('[data-total]', scr.el), total); }, 450);
    if (best) setTimeout(function () { Snd.cheer(); }, 900);
    $('[data-again]', scr.el).onclick = function () { playSolo(finalCfg({ mode: cfg.mode, size: cfg.n, minLen: cfg.minLen })); };
    $('[data-home]', scr.el).onclick = home;
  }

  // ---------- Pass and play ----------
  function playPass(cfg, players) {
    var board = makeBoard(cfg.n, cfg.minLen, cfg.seed);
    var results = [];
    function turn(i) {
      if (i >= players.length) return resultsMulti(cfg, players.map(function (p, k) { return { name: p.name, avatar: p.avatar, words: results[k].words, hints: results[k].hints }; }), {
        again: function () { playPass(finalCfg({ mode: cfg.mode, size: cfg.n, minLen: cfg.minLen }), players); },
        save: true
      });
      var p = players[i];
      var scr = mount(
        '<div class="loading" style="gap:16px;padding:24px;text-align:center">' +
        '<div style="animation:dialogIn .7s cubic-bezier(.3,1.4,.5,1) both">' + avatar(p.avatar, 120) + '</div>' +
        '<h2 class="title" style="color:#FFF;font-size:30px">Pass to ' + esc(p.name) + '</h2>' +
        '<p>' + (i === 0 ? 'Everyone plays the same board, one at a time.' : 'No peeking at the last player’s board!') + '</p>' +
        '<button class="btn btn-white" data-ready style="min-width:220px">I’m ' + esc(p.name) + ', start</button>' +
        '<button class="btn btn-ghost" data-quit style="color:#3A1A05">Quit</button></div>'
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

  // players: [{name, avatar, words:[...], hints?, id?}]
  function resultsMulti(cfg, players, opts) {
    var counts = {};
    players.forEach(function (p) { p.words.forEach(function (w) { counts[w] = (counts[w] || 0) + 1; }); });
    var shared = new Set(Object.keys(counts).filter(function (w) { return counts[w] > 1; }));
    var rows = players.map(function (p) {
      var list = scoreWords(p.words, shared).sort(function (a, b) { return (a.shared - b.shared) || b.p - a.p || b.w.length - a.w.length; });
      return { p: p, list: list, score: list.reduce(function (a, x) { return a + x.p; }, 0) };
    }).sort(function (a, b) { return b.score - a.score; });
    if (opts.save) rows.forEach(function (r) { addScore(cfg.mode, cfg.n, cfg.minLen, r.p, r.score, r.list.length); });
    if (opts.saveMine) rows.forEach(function (r) { if (r.p.me) addScore(cfg.mode, cfg.n, cfg.minLen, r.p, r.score, r.list.length); });
    var top = rows[0].score, winners = rows.filter(function (r) { return r.score === top; });
    var title = winners.length > 1 ? 'It’s a tie!' : esc(winners[0].p.name) + ' wins!';
    var selected = 0;
    rows.forEach(function (r, i) { if (r.p.me) selected = i; });
    var scr = mount(
      '<header class="band" style="padding-top:calc(24px + env(safe-area-inset-top));padding-bottom:22px;gap:6px;align-items:center">' +
      '<div class="eyebrow">Results · ' + MODES[cfg.mode].name + '</div>' +
      '<div style="animation:dialogIn .7s .2s cubic-bezier(.3,1.4,.5,1) both">' + avatar(winners[0].p.avatar, 84) + '</div>' +
      '<div class="total" style="font-size:40px">' + title + '</div>' +
      '<div class="sub">Shared words score nothing</div></header>' +
      '<div class="scroll"><div class="players" data-ranks>' +
      rows.map(function (r, i) {
        return '<button class="rank' + (r.score === top ? ' first' : '') + '" data-sel="' + i + '" aria-pressed="' + (i === selected) + '" style="animation-delay:' + (0.3 + i * 0.18) + 's"><span class="pos">' + (i + 1) + '</span>' + avatar(r.p.avatar, 44) +
          '<span class="nm"><b>' + esc(r.p.name) + '</b><small>' + plural(r.list.length, 'word', 'words') + ' · tap to see</small></span><span class="sc" data-sc="' + i + '">0</span></button>';
      }).join('') + '</div>' +
      '<span class="label" data-wl></span><div class="players" data-words></div>' +
      '<div style="display:flex;flex-direction:column;gap:10px;margin-top:8px">' +
      (opts.again ? '<button class="btn btn-blue" data-again>' + I.play + (opts.againLabel || 'Play again') + '</button>' : '') +
      (opts.note ? '<p class="hint-text" style="text-align:center">' + esc(opts.note) + '</p>' : '') +
      '<button class="btn btn-white" data-home>' + (opts.homeLabel || 'Home') + '</button></div></div>'
    );
    var el = scr.el;
    function showWords(i) {
      selected = i;
      $$('[data-sel]', el).forEach(function (b) { b.setAttribute('aria-pressed', String(+b.getAttribute('data-sel') === i)); });
      $('[data-wl]', el).textContent = rows[i].p.name + '’s words';
      $('[data-words]', el).innerHTML = wordRows(rows[i].list, 0);
    }
    on(el, '[data-sel]', 'click', function (e) { showWords(+e.currentTarget.getAttribute('data-sel')); });
    showWords(selected);
    rows.forEach(function (r, i) { setTimeout(function () { tallyUp($('[data-sc="' + i + '"]', el), r.score); }, 600 + i * 250); });
    setTimeout(function () { Snd.cheer(); }, 900);
    if (opts.again) $('[data-again]', el).onclick = opts.again;
    $('[data-home]', el).onclick = opts.home || home;
    return scr;
  }

  // ---------- Leaderboards ----------
  function leaderboards(back) {
    var tab = 'classic', size = 4;
    var scr = mount(backBand('Leaderboards') + '<div class="scroll" data-body></div>');
    on(scr.el, '[data-back]', 'click', back);
    function render() {
      var key = tab === 'daily' ? 'daily:' + todayKey() : tab + ':' + size;
      var list = S.boards[key] || [];
      var html = '<div class="seg">' + ['classic', 'blitz', 'daily'].map(function (m) { return '<button data-tab="' + m + '" aria-pressed="' + (tab === m) + '">' + MODES[m].name + '</button>'; }).join('') + '</div>';
      if (tab !== 'daily') html += '<div class="seg">' + [4, 5, 6].map(function (n) { return '<button data-size="' + n + '" aria-pressed="' + (size === n) + '">' + n + ' × ' + n + '</button>'; }).join('') + '</div>';
      else html += '<p class="hint-text">Today’s daily board scores on this phone.</p>';
      html += list.length ? list.slice(0, 10).map(function (r, i) {
        var d = new Date(r.at);
        return '<div class="lb-row" style="animation-delay:' + (i * 0.07) + 's"><span class="pos">' + (i + 1) + '</span>' + avatar(r.avatar, 42) +
          '<span class="nm"><b>' + esc(r.name) + '</b><small>' + plural(r.words, 'word', 'words') + (r.minLen === 4 ? ' · 4+ letters' : '') + ' · ' + d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) + '</small></span><span class="sc">' + r.score + '</span></div>';
      }).join('') : '<p class="empty">No scores yet. Play a round to get on the board!</p>';
      var body = $('[data-body]', scr.el);
      body.innerHTML = html;
      on(body, '[data-tab]', 'click', function (e) { tab = e.currentTarget.getAttribute('data-tab'); render(); });
      on(body, '[data-size]', 'click', function (e) { size = +e.currentTarget.getAttribute('data-size'); render(); });
    }
    render();
  }

  // ---------- Settings ----------
  function settings(back) {
    var scr = mount(backBand('Settings') + '<div class="scroll" data-body></div>');
    on(scr.el, '[data-back]', 'click', back);
    function render() {
      var st = S.settings;
      var body = $('[data-body]', scr.el);
      body.innerHTML =
        '<div class="card"><span class="label">Hint button</span>' +
        '<p class="hint-text">Shows after this long without touching the screen, stays for 3 seconds, then waits for your next touch.</p>' +
        '<div class="seg">' + [[0, 'Off'], [5, '5 sec'], [10, '10 sec'], [20, '20 sec']].map(function (o) { return '<button data-delay="' + o[0] + '" aria-pressed="' + (st.hintDelay === o[0]) + '">' + o[1] + '</button>'; }).join('') + '</div>' +
        '<span class="label">Hints show</span><div class="seg">' +
        '<button data-h3="1" aria-pressed="' + st.hint3 + '">3-letter words</button><button data-h3="0" aria-pressed="' + !st.hint3 + '">Any word</button></div></div>' +
        '<div class="card">' + toggle('sound', 'Sound effects', st.sound) + toggle('vibrate', 'Vibration', st.vibrate) + '</div>' +
        '<button class="btn btn-white" data-profile>' + I.user + 'Edit my profile</button>' +
        '<button class="btn btn-white" data-clear>Clear leaderboards</button>' +
        '<p class="hint-text" style="text-align:center">Word list: ' + WORDS.length.toLocaleString() + ' British English words.</p>';
      on(body, '[data-delay]', 'click', function (e) { st.hintDelay = +e.currentTarget.getAttribute('data-delay'); save(); render(); });
      on(body, '[data-h3]', 'click', function (e) { st.hint3 = e.currentTarget.getAttribute('data-h3') === '1'; save(); render(); });
      on(body, '[data-tg]', 'click', function (e) { var k = e.currentTarget.getAttribute('data-tg'); st[k] = !st[k]; save(); render(); if (k === 'vibrate') buzz(20); });
      $('[data-profile]', body).onclick = function () { editMyProfile(function () { settings(back); }); };
      $('[data-clear]', body).onclick = function () {
        confirmBox('Clear all leaderboard scores on this phone?', 'Clear scores', 'Cancel').then(function (y) { if (y) { S.boards = {}; save(); toast('Leaderboards cleared'); } });
      };
    }
    function toggle(key, label, val) { return '<div class="toggle-row"><span id="tl-' + key + '">' + label + '</span><button class="switch" role="switch" aria-labelledby="tl-' + key + '" aria-checked="' + val + '" data-tg="' + key + '"></button></div>'; }
    render();
  }

  // ---------- Nearby play ----------
  function nearby() {
    if (window.WM_PREVIEW) { toast('Nearby play works in the installed version of Word Mix, not this preview', 3600); return; }
    if (!WMNet.supported) { toast('This browser cannot do nearby play'); return home(); }
    var scr = mount(backBand('Play nearby') + '<div class="scroll">' +
      '<div class="card"><b style="font-size:18px">How it works</b><ol class="steps">' +
      '<li>Everyone joins the same Wi-Fi, or the host turns on their phone’s hotspot.</li>' +
      '<li>The host picks a mode and shows a code.</li>' +
      '<li>Each friend scans it, then the host scans the reply.</li></ol></div>' +
      '<button class="big-choice" data-host><span class="ic" style="background:#FFE2C7;color:#C8530F">' + I.wifi + '</span><span><b>Host a game</b><small>Up to 6 players</small></span></button>' +
      '<button class="big-choice" data-join><span class="ic" style="background:#DCE8FF;color:#1E4FA8">' + I.camera + '</span><span><b>Join a game</b><small>Scan the host’s code</small></span></button>' +
      '</div>');
    on(scr.el, '[data-back]', 'click', home);
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
  function qrHtml() { return '<div class="qr-box"><canvas data-qr></canvas></div>'; }
  function drawQr(el, code) {
    var c = $('[data-qr]', el);
    if (!c) return;
    var card = c.closest('.card') || el;
    var w = Math.min(320, (card.clientWidth || 320) - 32 - 28);
    WMQR.toCanvas(c, code, { size: Math.max(220, w), dark: '#2E2117' });
  }
  function send(dc, msg) { try { if (dc && dc.readyState === 'open') dc.send(JSON.stringify(msg)); } catch (e) {} }

  // Host
  function hostLobby(cfg) {
    var me = { id: 'h', name: S.profile.name, avatar: S.profile.avatar, me: true };
    var guests = [];
    var pending = null, busy = false, inGame = false, closed = false, gen = 0, guestSeq = 0;
    var round = null;
    function players() { return [me].concat(guests.map(function (g) { return { id: g.id, name: g.name, avatar: g.avatar }; })); }
    function broadcast(msg) { guests.forEach(function (g) { send(g.dc, msg); }); }
    function lobbyMsg() { return { t: 'lobby', players: players(), mode: cfg.mode, n: cfg.n, minLen: cfg.minLen }; }
    function teardown() {
      closed = true;
      broadcast({ t: 'bye' });
      guests.forEach(function (g) { try { g.pc.close(); } catch (e) {} });
      if (pending) try { pending.pc.close(); } catch (e) {}
    }
    function newOffer() {
      if (closed || guests.length >= 5) { pending = null; render(); return; }
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
          g.name = String(m.name || 'Player').slice(0, 14); g.avatar = String(m.avatar || 'fox');
          if (!g.ready) {
            g.ready = true; guests.push(g); busy = false;
            send(g.dc, { t: 'welcome', id: g.id });
            Snd.good(3); toast(g.name + ' joined');
            broadcast(lobbyMsg());
            if (!inGame) newOffer();
          }
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
      var html = '<div class="card"><span class="label">' + MODES[cfg.mode].name + ' · ' + cfg.n + ' × ' + cfg.n + ' · Players ' + list.length + ' of 6</span><div class="players">' +
        list.map(function (p) { return '<div class="prow">' + avatar(p.avatar, 44) + '<b>' + esc(p.name) + '</b><span class="tag">' + (p.id === 'h' ? 'Host' : 'Joined') + '</span></div>'; }).join('') + '</div></div>';
      if (guests.length < 5) {
        html += '<div class="card" style="align-items:stretch"><b style="font-size:18px">Add a player</b>';
        if (busy) html += '<div class="status"><span class="spinner"></span>Connecting…</div>';
        else if (!pending) html += '<div class="status"><span class="spinner"></span>Making a code…</div>';
        else html += '<p class="hint-text">1. Your friend taps <b>Join a game</b> and scans this.</p>' + qrHtml() +
          '<p class="hint-text">2. Then scan the code that appears on their phone.</p>' +
          '<button class="btn btn-blue" data-scan>' + I.camera + 'Scan their reply</button>' +
          '<button class="btn btn-ghost" data-text>Can’t scan? Use a text code</button>';
        html += '</div>';
      }
      html += '<button class="btn btn-orange" data-start ' + (guests.length ? '' : 'disabled') + '>' + I.play + 'Start game</button>';
      if (!guests.length) html += '<p class="hint-text" style="text-align:center">Waiting for at least one friend to join.</p>';
      body.innerHTML = html;
      if (pending && !busy) {
        drawQr(body, pending.code);
        $('[data-scan]', body).onclick = function () { openScanner('Point at the code on your friend’s phone', accept); };
        $('[data-text]', body).onclick = function () { codeFallback(pending.code, accept, 'Their reply code'); };
      }
      var st = $('[data-start]', body);
      if (st) st.onclick = startRound;
    }
    function accept(code) {
      if (!pending) return;
      busy = true; render();
      var p = pending;
      WMNet.acceptAnswer(p.pc, code).then(function () {
        setTimeout(function () {
          if (busy && pending === p && !(guests.some(function (g) { return g.pc === p.pc; }))) {
            busy = false; toast('Could not connect. Check you are on the same Wi-Fi.'); try { p.pc.close(); } catch (e) {} newOffer();
          }
        }, 15000);
      }).catch(function (e) { busy = false; toast(e.message || 'That code did not work'); render(); });
    }
    function startRound() {
      if (!guests.length) return;
      gen++;
      if (pending && !busy) { try { pending.pc.close(); } catch (e) {} pending = null; }
      inGame = true;
      var board = makeBoard(cfg.n, cfg.minLen, cfg.seed);
      var everyone = players();
      round = { done: {}, finished: false, myWords: null, timer: null };
      round.check = function () {
        if (round.finished || !round.myWords) return;
        var waiting = guests.filter(function (g) { return !round.done[g.id]; });
        if (waiting.length && !round.timeoutHit) return;
        round.finished = true; clearTimeout(round.timer);
        var res = everyone.filter(function (p) { return p.id === 'h' || round.done[p.id] || guests.some(function (g) { return g.id === p.id; }); }).map(function (p) {
          return { id: p.id, name: p.name, avatar: p.avatar, words: p.id === 'h' ? round.myWords : (round.done[p.id] || []) };
        });
        broadcast({ t: 'results', players: res, mode: cfg.mode, n: cfg.n, minLen: cfg.minLen });
        var mine = res.map(function (r) { return Object.assign({}, r, { me: r.id === 'h' }); });
        inGame = false;
        resultsMulti(cfg, mine, {
          saveMine: true, againLabel: 'Back to lobby',
          again: function () { round = null; broadcast(lobbyMsg()); scr = null; newOffer(); },
          homeLabel: 'Close game', home: function () { teardown(); home(); }
        });
      };
      broadcast({ t: 'start', cells: board.cells, n: cfg.n, minLen: cfg.minLen, mode: cfg.mode, time: cfg.time, players: everyone });
      var g = playBoard({
        board: board, cfg: cfg, player: me, multiplayer: true,
        onEnd: function (r) {
          round.myWords = r.words;
          mount('<div class="loading"><span class="spinner" style="width:40px;height:40px;border-width:5px"></span><p>Collecting everyone’s words…</p></div>');
          round.timer = setTimeout(function () { round.timeoutHit = true; round.check(); }, 8000);
          round.check();
        },
        onQuit: function () { teardown(); home(); }
      });

    }
    WMNet.primeCamera().then(newOffer);
    render();
  }

  // Guest
  function joinGame() {
    var link = null, dc = null, hostPlayers = [], game = null, closed = false, lastCfg = null, myId = null;
    var scr = mount(backBand('Join a game') + '<div class="scroll" data-body></div>');
    function leave() { closed = true; try { if (link) link.pc.close(); } catch (e) {} }
    on(scr.el, '[data-back]', 'click', function () { leave(); nearby(); });
    function step1() {
      var body = $('[data-body]', scr.el);
      body.innerHTML = '<div class="card"><b style="font-size:18px">Scan the host’s code</b><p class="hint-text">Ask the host to tap <b>Host a game</b>. Their screen will show a code.</p>' +
        '<button class="btn btn-blue" data-scan>' + I.camera + 'Open camera</button><button class="btn btn-ghost" data-text>Can’t scan? Use a text code</button></div>';
      $('[data-scan]', body).onclick = function () { openScanner('Point at the code on the host’s phone', gotOffer); };
      $('[data-text]', body).onclick = function () { codeFallback(null, gotOffer, 'Host’s code'); };
    }
    function gotOffer(code) {
      var body = $('[data-body]', scr.el);
      body.innerHTML = '<div class="status"><span class="spinner"></span>Making your reply…</div>';
      WMNet.answerOffer(code).then(function (l) {
        if (closed) { l.pc.close(); return; }
        link = l;
        body.innerHTML = '<div class="card" style="align-items:stretch"><b style="font-size:18px">Show this to the host</b><p class="hint-text">The host taps <b>Scan their reply</b> and points their phone at this code.</p>' + qrHtml() +
          '<div class="status"><span class="spinner"></span>Waiting for the host…</div><button class="btn btn-ghost" data-text>Can’t scan? Use a text code</button></div>';
        drawQr(body, l.code);
        $('[data-text]', body).onclick = function () { codeFallback(l.code, null); };
        l.pc.addEventListener('connectionstatechange', function () {
          if (l.pc.connectionState === 'failed') { toast('Could not connect. Check you are on the same Wi-Fi.'); if (!closed) { leave(); joinGame(); } }
        });
        l.dcPromise.then(function (ch) {
          dc = ch;
          ch.onopen = function () { send(dc, { t: 'hello', name: S.profile.name, avatar: S.profile.avatar }); };
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
      else if (m.t === 'lobby') { if (!game || game.isEnded()) lobby(m); else { hostPlayers = m.players; } }
      else if (m.t === 'start') {
        var cfg = { mode: m.mode, n: m.n, minLen: m.minLen, time: m.time };
        var board = boardFromCells(m.cells, m.n, m.minLen);
        game = playBoard({
          board: board, cfg: cfg, player: S.profile, multiplayer: true,
          onEnd: function (r) {
            send(dc, { t: 'done', words: r.words });
            mount('<div class="loading"><span class="spinner" style="width:40px;height:40px;border-width:5px"></span><p>Waiting for everyone’s words…</p></div>');
          },
          onQuit: function () { leave(); home(); }
        });

      } else if (m.t === 'results') {
        if (game && !game.isEnded()) game.forceEnd();
        var players = (m.players || []).map(function (p) { return { id: p.id, name: p.name, avatar: p.avatar, words: p.words || [], me: p.id === myId }; });
        var cfg2 = { mode: m.mode, n: m.n, minLen: m.minLen, time: MODES[m.mode] ? MODES[m.mode].time : 0 };
        setTimeout(function () {
          resultsMulti(cfg2, players, { saveMine: true, note: 'The host can start another round.', homeLabel: 'Leave game', home: function () { leave(); home(); } });
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
    loadWords().then(home, function () {
      $('.loading p', app).textContent = 'Could not load the word list. Check your connection and reopen Word Mix.';
    });
  }
  window.WordMix = { solve: solve, makeBoard: makeBoard, state: function () { return S; } };
  boot();
})();
