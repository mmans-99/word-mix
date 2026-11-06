/* Word Mix sounds. Every sound is made live by the phone (Web Audio), so nothing is downloaded.
   Effects and music have separate volumes and on/off switches. */
(function (root) {
  'use strict';
  var getSettings = function () { return {}; };
  var ctx = null, master, sfx, music, shimmerIn, noiseBuf;
  var live = new Set();

  var VARIANTS = {
    tile: [['marimba', 'Marimba'], ['synth', 'Synth']],
    valid: [['pop', 'Pop chime'], ['bell', 'Bell']],
    long: [['cascade', 'Arcade cascade'], ['brass', 'Brass sting']],
    bad: [['buzz', 'Soft buzz'], ['thump', 'Dry thump']],
    overlay: [['tick', 'Clock tick'], ['heart', 'Heartbeat'], ['off', 'None']],
    end: [['whistle', 'Whistle'], ['buzzer', 'Buzzer']]
  };
  var GROUP_NAMES = { tile: 'Letter chime', valid: 'Word found', long: 'Long word (6+ letters)', bad: 'Wrong move', overlay: 'Last 10 seconds', end: 'Time’s up' };
  var DEFAULT_PICKS = { tile: 'marimba', valid: 'pop', long: 'cascade', bad: 'buzz', overlay: 'tick', end: 'whistle' };

  function st() { return getSettings() || {}; }
  function pick(g) { var p = st().snd || {}; return p[g] || DEFAULT_PICKS[g]; }
  function fxOn() { return st().sound !== false; }
  function musicOn() { return st().music !== false; }

  function init() {
    if (ctx) return ctx;
    try {
      var AC = root.AudioContext || root.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    } catch (e) { ctx = null; return null; }
    var comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -12; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.2;
    master = ctx.createGain(); master.gain.value = 0.9;
    sfx = ctx.createGain(); music = ctx.createGain();
    sfx.connect(master); music.connect(master); master.connect(comp); comp.connect(ctx.destination);
    shimmerIn = ctx.createGain();
    var dl = ctx.createDelay(1); dl.delayTime.value = 0.11;
    var fb = ctx.createGain(); fb.gain.value = 0.38;
    shimmerIn.connect(sfx); shimmerIn.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(sfx);
    var len = ctx.sampleRate * 2;
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = noiseBuf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    apply();
    return ctx;
  }
  function unlock() { init(); if (ctx && ctx.state === 'suspended') { try { ctx.resume(); } catch (e) {} } }
  function apply() {
    if (!ctx) return;
    var s = st();
    var sv = fxOn() ? (s.sfxVol == null ? 0.8 : s.sfxVol) : 0;
    var mv = musicOn() ? (s.musicVol == null ? 0.6 : s.musicVol) * 0.55 : 0;
    sfx.gain.setTargetAtTime(sv, ctx.currentTime, 0.02);
    music.gain.setTargetAtTime(mv, ctx.currentTime, 0.02);
    Music.refresh();
  }
  function ready(out) {
    if (!ctx) return false;
    if (out === music) return musicOn();
    return fxOn();
  }
  function now() { return ctx ? ctx.currentTime : 0; }
  function track(src) { live.add(src); src.onended = function () { live.delete(src); }; }

  function env(p, t, peak, a, d) {
    p.setValueAtTime(0.0001, t);
    p.linearRampToValueAtTime(Math.max(0.0002, peak), t + a);
    p.exponentialRampToValueAtTime(0.0001, t + a + Math.max(0.01, d));
  }
  function sus(p, t, peak, a, hold, r) {
    p.setValueAtTime(0.0001, t);
    p.linearRampToValueAtTime(peak, t + a);
    p.setValueAtTime(peak, t + a + hold);
    p.linearRampToValueAtTime(0.0001, t + a + hold + r);
  }
  function tone(o) {
    var out = o.out || sfx;
    if (!ready(out)) return;
    var t = o.t == null ? ctx.currentTime : o.t, a = o.attack == null ? 0.004 : o.attack;
    var osc = ctx.createOscillator();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.f, t);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, t + (o.glide || o.dur));
    var g = ctx.createGain();
    env(g.gain, t, o.vol == null ? 0.2 : o.vol, a, o.dur);
    var node = osc;
    if (o.lp) { var f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; osc.connect(f); node = f; }
    node.connect(g); g.connect(out);
    osc.start(t); osc.stop(t + a + o.dur + 0.05); track(osc);
  }
  function noise(o) {
    var out = o.out || sfx;
    if (!ready(out)) return;
    var t = o.t == null ? ctx.currentTime : o.t, a = o.attack == null ? 0.002 : o.attack;
    var s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    var f = ctx.createBiquadFilter(); f.type = o.ft || 'bandpass';
    f.frequency.setValueAtTime(o.f || 2000, t);
    if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, t + a + o.dur);
    f.Q.value = o.q == null ? 1 : o.q;
    var g = ctx.createGain(); env(g.gain, t, o.vol == null ? 0.2 : o.vol, a, o.dur);
    s.connect(f); f.connect(g);
    var last = g;
    if (o.pan != null && ctx.createStereoPanner) { var p = ctx.createStereoPanner(); p.pan.value = o.pan; g.connect(p); last = p; }
    last.connect(out);
    s.start(t, Math.random() * 1.5); s.stop(t + a + o.dur + 0.05); track(s);
  }
  function brass(freqs, t, dur, vol) {
    if (!ready(sfx)) return;
    var f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 1.5;
    f.frequency.setValueAtTime(450, t); f.frequency.linearRampToValueAtTime(3400, t + 0.05); f.frequency.exponentialRampToValueAtTime(1300, t + dur);
    var g = ctx.createGain(); sus(g.gain, t, vol, 0.025, Math.max(0.02, dur - 0.1), 0.12);
    f.connect(g); g.connect(sfx);
    freqs.forEach(function (fr) {
      [-9, 9].forEach(function (dt) {
        var o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = fr; o.detune.value = dt;
        o.connect(f); o.start(t); o.stop(t + dur + 0.25); track(o);
      });
    });
  }
  function at(t, fn) { return setTimeout(fn, Math.max(0, (t - now()) * 1000)); }

  // ---------- Round start: dice shake, tiles landing, beep beep BEEP ----------
  var START = { shake: 0, drop: 1.35, beeps: [2.55, 3.4, 4.25], total: 4.6 };
  function shake(t0) {
    var D = 1.25, shakes = 8;
    for (var k = 0; k < shakes; k++) {
      var ts = t0 + k * (D / shakes) + Math.random() * 0.02;
      var fade = Math.min(1, (k + 1) / 2) * (k === shakes - 1 ? 0.6 : 1);
      var hits = 7 + Math.floor(Math.random() * 6);
      for (var i = 0; i < hits; i++) {
        var th = ts + Math.random() * 0.09, v = (0.12 + Math.random() * 0.2) * fade;
        if (Math.random() < 0.62) noise({ t: th, dur: 0.01 + Math.random() * 0.02, f: 1800 + Math.random() * 2800, q: 7, vol: v, pan: Math.random() * 1.2 - 0.6 });
        else tone({ t: th, f: 300 + Math.random() * 380, dur: 0.035, type: 'triangle', vol: v * 0.8 });
      }
    }
    noise({ t: t0, dur: D, f: 600, ft: 'lowpass', q: 0.4, vol: 0.05, attack: 0.15 });
  }
  function drop(t0, count) {
    var gap = 0.9 / count;
    for (var i = 0; i < count; i++) {
      var t = t0 + i * gap + Math.random() * 0.008, row = i / count;
      noise({ t: t, dur: 0.014, f: 2600 + row * 1000, q: 8, vol: 0.3 });
      tone({ t: t, f: 1300 + row * 360, f2: 600, glide: 0.03, dur: 0.03, type: 'triangle', vol: 0.11 });
      tone({ t: t, f: 210, dur: 0.06, vol: 0.08 });
    }
    var end = t0 + 0.95;
    tone({ t: end, f: 140, f2: 70, dur: 0.12, vol: 0.25 });
    noise({ t: end, dur: 0.04, f: 900, ft: 'lowpass', vol: 0.12 });
  }
  function beep(t, big) {
    tone({ t: t, f: big ? 1760 : 880, dur: big ? 0.45 : 0.13, vol: big ? 0.28 : 0.22 });
    tone({ t: t, f: big ? 1760 : 880, dur: big ? 0.4 : 0.1, type: 'triangle', vol: big ? 0.08 : 0.05 });
    if (big) tone({ t: t, f: 880, dur: 0.45, vol: 0.1 });
  }
  // Plays the round start. full=false plays only the beeps (players' phones in a Party game).
  // Calls cb.drop(i, count) as each tile lands and cb.beat(i) on each beep. Always takes START.total seconds.
  function roundStart(opts) {
    unlock();
    var timers = [], t0 = now() + 0.05, count = opts.tiles || 16;
    var cb = opts || {};
    if (ctx) {
      if (opts.full) { shake(t0 + START.shake); drop(t0 + START.drop, count); }
      START.beeps.forEach(function (b, i) { beep(t0 + b, i === 2); });
    }
    function later(sec, fn) { timers.push(setTimeout(fn, sec * 1000)); }
    if (cb.shake) later(START.shake, cb.shake);
    for (var i = 0; i < count; i++) (function (i) { later(START.drop + i * (0.9 / count), function () { if (cb.drop) cb.drop(i, count); }); })(i);
    START.beeps.forEach(function (b, i) { later(b, function () { if (cb.beat) cb.beat(i); }); });
    later(START.beeps[2] + 0.05, function () { if (cb.go) cb.go(); });
    return { cancel: function () { timers.forEach(clearTimeout); } };
  }

  // ---------- While playing ----------
  var SCALE = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98, 1760, 2093, 2349.32, 2637.02, 3135.96, 3520, 4186.01];
  function letter(i, variant) {
    if (!ctx) return;
    var t = now(), f = SCALE[Math.max(0, Math.min(i, SCALE.length - 1))];
    if ((variant || pick('tile')) === 'marimba') {
      tone({ t: t, f: f, dur: 0.38, vol: 0.2, attack: 0.002 });
      tone({ t: t, f: f * 4, dur: 0.05, vol: 0.05, attack: 0.001 });
      tone({ t: t, f: f * 0.5, dur: 0.2, vol: 0.05, attack: 0.002 });
    } else {
      tone({ t: t, f: f, dur: 0.22, type: 'square', vol: 0.055, lp: 2400 });
      tone({ t: t, f: f * 2, dur: 0.12, type: 'triangle', vol: 0.045 });
    }
  }
  function valid(variant, t) {
    if (!ctx) return;
    t = t == null ? now() : t;
    if ((variant || pick('valid')) === 'pop') {
      tone({ t: t, f: 380, f2: 1250, glide: 0.035, dur: 0.06, vol: 0.26 });
      tone({ t: t + 0.04, f: 1567.98, dur: 0.5, vol: 0.15 });
      tone({ t: t + 0.04, f: 2093, dur: 0.35, vol: 0.08 });
      tone({ t: t + 0.04, f: 3135.96, dur: 0.18, vol: 0.035 });
    } else {
      [[1, 0.2, 0.95], [2, 0.07, 0.6], [2.76, 0.06, 0.4], [5.4, 0.03, 0.2]].forEach(function (p) { tone({ t: t, f: 1318.51 * p[0], dur: p[2], vol: p[1], attack: 0.002 }); });
    }
  }
  function longWord(variant, t) {
    if (!ctx) return;
    t = t == null ? now() : t;
    if ((variant || pick('long')) === 'cascade') {
      var n = [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98, 2093, 2637.02];
      n.forEach(function (f, i) { tone({ t: t + i * 0.055, f: f, dur: 0.13, type: 'square', vol: 0.07, lp: 3500 }); });
      var e = t + n.length * 0.055;
      [2093, 2637.02, 3135.96].forEach(function (f, i) { tone({ t: e + i * 0.01, f: f, dur: 0.6, vol: 0.075, out: shimmerIn }); });
    } else {
      brass([261.63, 329.63, 392], t, 0.11, 0.05);
      brass([349.23, 440, 523.25, 698.46], t + 0.14, 0.62, 0.045);
    }
  }
  function word(len) { if (len >= 6) longWord(); else valid(); }
  function badMove(variant) {
    if (!ctx) return;
    var t = now();
    if ((variant || pick('bad')) === 'thump') {
      tone({ t: t, f: 150, f2: 55, glide: 0.1, dur: 0.12, vol: 0.38 });
      noise({ t: t, dur: 0.05, f: 350, ft: 'lowpass', vol: 0.13 });
    } else {
      tone({ t: t, f: 98, dur: 0.15, type: 'square', vol: 0.1, lp: 650, attack: 0.01 });
      tone({ t: t, f: 103, dur: 0.15, type: 'square', vol: 0.065, lp: 650, attack: 0.01 });
    }
  }
  function thrum(t, f, dur) {
    if (!ready(sfx)) return;
    var o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
    var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 950;
    var g = ctx.createGain(); sus(g.gain, t, 0.2, 0.01, dur - 0.05, 0.04);
    var trem = ctx.createGain(); trem.gain.value = 0.5;
    var lfo = ctx.createOscillator(); lfo.frequency.value = 24;
    var depth = ctx.createGain(); depth.gain.value = 0.5;
    lfo.connect(depth); depth.connect(trem.gain);
    o.connect(lp); lp.connect(g); g.connect(trem); trem.connect(sfx);
    o.start(t); o.stop(t + dur + 0.05); lfo.start(t); lfo.stop(t + dur + 0.05); track(o); track(lfo);
  }
  function notWord() { if (!ctx) return; var t = now(); thrum(t, 165, 0.15); thrum(t + 0.17, 128, 0.2); }
  function again() {
    if (!ready(sfx)) return;
    var t = now();
    var o = ctx.createOscillator();
    o.frequency.setValueAtTime(240, t); o.frequency.exponentialRampToValueAtTime(420, t + 0.12); o.frequency.exponentialRampToValueAtTime(330, t + 0.4);
    var lfo = ctx.createOscillator(); lfo.frequency.value = 15;
    var depth = ctx.createGain(); depth.gain.setValueAtTime(110, t); depth.gain.exponentialRampToValueAtTime(1, t + 0.42);
    lfo.connect(depth); depth.connect(o.frequency);
    var g = ctx.createGain(); env(g.gain, t, 0.22, 0.01, 0.42);
    o.connect(g); g.connect(sfx);
    o.start(t); o.stop(t + 0.5); lfo.start(t); lfo.stop(t + 0.5); track(o); track(lfo);
  }

  // ---------- Music: a light jazz-pop loop (Fmaj7, Em7, Dm7, Cmaj7) ----------
  var CH = [[174.61, 220, 261.63, 329.63], [164.81, 196, 246.94, 293.66], [146.83, 174.61, 220, 261.63], [130.81, 164.81, 196, 246.94]];
  var BASS = [87.31, 82.41, 73.42, 65.41];
  var Music = {
    wanted: false, on: false, base: 100, bpm: 100, urgency: 0, step: 0, next: 0, iv: null,
    // The game says when music should play; the player's Music switch decides whether it does.
    want: function (yes) { this.wanted = !!yes; if (!yes) this.urgency = 0; this.refresh(); },
    refresh: function () { if (this.wanted && musicOn() && ctx) this.start(); else this.stop(); },
    start: function () {
      if (this.on || !ctx) return;
      this.on = true; this.step = 0; this.next = ctx.currentTime + 0.08;
      var self = this;
      this.iv = setInterval(function () { self.sched(); }, 25);
      this.sched();
    },
    stop: function () { this.on = false; clearInterval(this.iv); this.iv = null; },
    setUrgency: function (k) { this.urgency = Math.max(0, Math.min(1, k)); },
    sched: function () {
      while (this.on && this.next < ctx.currentTime + 0.15) {
        this.bpm = this.base * (1 + 0.45 * this.urgency);
        var sd = 60 / this.bpm / 4;
        playStep(this.step, this.next + (this.step % 2 ? sd * 0.14 : 0), sd);
        this.next += sd; this.step = (this.step + 1) % 64;
      }
    }
  };
  function playStep(s, t, sd) {
    var bar = s >> 4, n = s & 15, ch = CH[bar], root = BASS[bar];
    if (n === 0 || n === 8) tone({ t: t, f: 130, f2: 45, glide: 0.11, dur: 0.2, vol: 0.34, out: music });
    if (n === 11) tone({ t: t, f: 120, f2: 45, glide: 0.1, dur: 0.15, vol: 0.18, out: music });
    if (n === 4 || n === 12) { noise({ t: t, dur: 0.11, f: 1800, q: 0.8, vol: 0.12, out: music }); tone({ t: t, f: 190, dur: 0.05, type: 'triangle', vol: 0.05, out: music }); }
    if (n % 2 === 0) noise({ t: t, dur: 0.03, f: 7500, ft: 'highpass', vol: n % 4 === 2 ? 0.05 : 0.03, out: music });
    var b = { 0: [root, 3], 3: [root, 1.5], 6: [root * 1.5, 1.5], 8: [root, 2], 11: [root * 2, 1], 14: [root * 1.5, 1.5] }[n];
    if (b) { tone({ t: t, f: b[0], dur: sd * b[1], type: 'triangle', vol: 0.2, lp: 700, out: music }); tone({ t: t, f: b[0], dur: sd * b[1], vol: 0.12, out: music }); }
    if (n === 0) ch.forEach(function (f) { tone({ t: t, f: f * 2, dur: sd * 7, vol: 0.016, attack: 0.04, out: music }); });
    if (n === 6 || n === 10) ch.forEach(function (f) {
      tone({ t: t, f: f * 2, dur: sd * 1.4, vol: 0.03, attack: 0.006, out: music });
      tone({ t: t, f: f * 4, dur: sd * 0.8, type: 'triangle', vol: 0.006, attack: 0.006, out: music });
    });
    if (bar === 3 && n >= 12 && n <= 14) tone({ t: t, f: [1046.5, 987.77, 783.99][n - 12], dur: sd * 2, vol: 0.035, out: music });
  }

  // ---------- Last 10 seconds ----------
  // Called on each half second in the last 10 seconds. half = 0 on the whole second, 1 halfway.
  function lastTen(half, variant) {
    if (!ctx) return;
    var v = variant || pick('overlay'), t = now();
    if (v === 'tick') {
      noise({ t: t, dur: 0.02, f: half ? 2400 : 3300, q: 10, vol: 0.3 });
      tone({ t: t, f: half ? 1300 : 1800, dur: 0.03, vol: 0.07 });
    } else if (v === 'heart' && !half) {
      tone({ t: t, f: 75, f2: 45, glide: 0.15, dur: 0.16, vol: 0.55 });
      tone({ t: t + 0.22, f: 65, f2: 40, glide: 0.13, dur: 0.14, vol: 0.4 });
      noise({ t: t, dur: 0.05, f: 200, ft: 'lowpass', vol: 0.12 });
    }
  }
  function urgent(i) {
    if (!ctx) return;
    var t = now(), f = 988 * (1 + Math.max(0, i) * 0.12);
    tone({ t: t, f: f, dur: 0.1, type: 'square', vol: 0.09, lp: 3000 });
    tone({ t: t + 0.18, f: f, dur: 0.1, type: 'square', vol: 0.09, lp: 3000 });
  }
  function timesUp(variant) {
    if (!ready(sfx)) return;
    var t = now() + 0.02;
    if ((variant || pick('end')) === 'buzzer') {
      var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1600;
      var g = ctx.createGain(); sus(g.gain, t, 0.22, 0.01, 0.85, 0.08);
      lp.connect(g); g.connect(sfx);
      [[110, 'sawtooth'], [116, 'sawtooth'], [55, 'square']].forEach(function (p) {
        var o = ctx.createOscillator(); o.type = p[1]; o.frequency.value = p[0]; o.connect(lp); o.start(t); o.stop(t + 1); track(o);
      });
      return;
    }
    [[0, 0.12], [0.22, 0.12], [0.44, 0.75]].forEach(function (p) {
      var tt = t + p[0];
      var o = ctx.createOscillator(); o.frequency.value = 2650;
      var lfo = ctx.createOscillator(); lfo.frequency.value = 38;
      var dp = ctx.createGain(); dp.gain.value = 240;
      lfo.connect(dp); dp.connect(o.frequency);
      var g = ctx.createGain(); sus(g.gain, tt, 0.12, 0.015, p[1], 0.04);
      o.connect(g); g.connect(sfx);
      o.start(tt); o.stop(tt + p[1] + 0.1); lfo.start(tt); lfo.stop(tt + p[1] + 0.1); track(o); track(lfo);
      noise({ t: tt, dur: p[1], f: 2650, q: 4, vol: 0.035, attack: 0.01 });
    });
  }

  // ---------- Results ----------
  function swish() { if (!ctx) return; noise({ t: now(), dur: 0.26, f: 6500, f2: 700, q: 1.4, vol: 0.36, attack: 0.03 }); }
  function sparkle() {
    if (!ctx) return;
    var t = now();
    [1567.98, 2093, 2637.02, 3135.96, 4186.01].forEach(function (f, i) { tone({ t: t + i * 0.045, f: f, dur: 0.45, vol: 0.065, out: shimmerIn }); });
    tone({ t: t, f: 1046.5, dur: 0.8, type: 'triangle', vol: 0.045 });
    for (var i = 0; i < 7; i++) tone({ t: t + 0.15 + Math.random() * 0.45, f: 3000 + Math.random() * 3000, dur: 0.1, vol: 0.022, out: shimmerIn });
  }
  var tallyN = 0, tallyAt = 0;
  // One tick of the score counter; the pitch climbs while the count keeps going.
  function tallyTick() {
    if (!ctx) return;
    var t = now();
    if (t - tallyAt < 0.028) return;
    if (t - tallyAt > 0.6) tallyN = 0;
    tallyAt = t; tallyN++;
    tone({ t: t, f: 1500 + Math.min(tallyN, 40) * 22, dur: 0.012, type: 'square', vol: 0.045, lp: 6000, attack: 0.001 });
  }
  function ding() { if (!ctx) return; var t = now(); tone({ t: t, f: 2093, dur: 0.35, vol: 0.11 }); tone({ t: t, f: 3135.96, dur: 0.22, vol: 0.045 }); }
  function win() {
    if (!ctx) return;
    var t = now();
    noise({ t: t, dur: 0.08, f: 3000, ft: 'lowpass', vol: 0.45 });
    tone({ t: t, f: 190, f2: 50, glide: 0.14, dur: 0.16, vol: 0.42 });
    for (var i = 0; i < 26; i++) noise({ t: t + 0.03 + Math.random() * 0.5, dur: 0.006, f: 3000 + Math.random() * 4000, q: 3, vol: 0.11, pan: Math.random() * 1.6 - 0.8 });
    var f = t + 0.15;
    brass([392, 783.99], f, 0.1, 0.05);
    brass([392, 783.99], f + 0.14, 0.1, 0.05);
    brass([392, 783.99], f + 0.28, 0.1, 0.05);
    brass([261.63, 329.63, 392, 523.25], f + 0.44, 0.9, 0.045);
    for (var k = 0; k < 220; k++) {
      var u = Math.pow(Math.random(), 1.5);
      noise({ t: t + 0.35 + u * 3.2, dur: 0.012 + Math.random() * 0.02, f: 1000 + Math.random() * 1600, q: 1.4, vol: (0.03 + Math.random() * 0.05) * Math.sqrt(1 - u * 0.9), pan: Math.random() * 1.6 - 0.8 });
    }
  }
  // A simple note, for small things like hints and buttons. delay is in seconds.
  function simple(f, dur, type, vol, delay) {
    if (!ctx) return;
    tone({ t: now() + (delay || 0), f: f, dur: dur, type: type, vol: (vol || 0.08) * 1.6 });
  }
  function preview(group, variant) {
    unlock();
    if (!ctx) return;
    if (group === 'tile') { for (var i = 0; i < 6; i++) (function (i) { setTimeout(function () { letter(i, variant); }, i * 150); })(i); }
    else if (group === 'valid') valid(variant);
    else if (group === 'long') longWord(variant);
    else if (group === 'bad') badMove(variant);
    else if (group === 'overlay') { if (variant === 'off') return; for (var k = 0; k < 6; k++) (function (k) { setTimeout(function () { lastTen(k % 2, variant); }, k * 500); })(k); }
    else if (group === 'end') timesUp(variant);
  }
  function stopAll() { Music.want(false); live.forEach(function (s) { try { s.stop(); } catch (e) {} }); live.clear(); }

  root.WMSound = {
    config: function (fn) { getSettings = fn; },
    unlock: unlock, apply: apply, VARIANTS: VARIANTS, GROUP_NAMES: GROUP_NAMES, DEFAULT_PICKS: DEFAULT_PICKS, START: START,
    roundStart: roundStart, letter: letter, word: word, badMove: badMove, notWord: notWord, again: again,
    music: Music, lastTen: lastTen, urgent: urgent, timesUp: timesUp,
    swish: swish, sparkle: sparkle, tallyTick: tallyTick, ding: ding, win: win, simple: simple, valid: valid,
    preview: preview, stopAll: stopAll
  };
})(window);
