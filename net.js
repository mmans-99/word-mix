/* Word Mix nearby play: phone-to-phone WebRTC links set up by scanning QR codes.
   No server or internet is needed once the app is installed. */
(function (root) {
  'use strict';
  // Short codes (from Pubby): only the parts the other phone needs (login name, password,
  // security fingerprint and up to 4 local addresses), about 130 characters instead of ~600.
  // The other phone rebuilds the full connection message from them.
  // Format: WM2~o|a~ufrag~pwd~fingerprint(base64url)~addr:port,addr:port
  var PREFIX = 'WM2';
  var MAX_ADDRS = 4;
  var JSQR_URL = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';

  function parseCandidate(line) {
    var p = line.replace(/^a=/, '').replace(/^candidate:/, '').split(' ');
    if (p.length < 8 || p[6] !== 'typ') return null;
    return { component: Number(p[1]), protocol: p[2].toLowerCase(), addr: p[4], port: Number(p[5]), type: p[7] };
  }
  function toB64(bytes) {
    var s = '';
    for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function fromB64(s) {
    var bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
    var out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  function pack(desc) {
    var lines = desc.sdp.split(/\r?\n/);
    function val(prefix) {
      for (var i = 0; i < lines.length; i++) if (lines[i].indexOf(prefix) === 0) return lines[i].slice(prefix.length).trim();
      throw new Error('Could not make a code. Try again.');
    }
    var ufrag = val('a=ice-ufrag:'), pwd = val('a=ice-pwd:');
    var fp = val('a=fingerprint:').split(' ');
    if (String(fp[0]).toLowerCase() !== 'sha-256' || !fp[1]) throw new Error('Could not make a code. Try again.');
    var fpBytes = new Uint8Array(fp[1].split(':').map(function (x) { return parseInt(x, 16); }));
    var seen = {}, addrs = [];
    lines.forEach(function (l) {
      if (l.indexOf('a=candidate:') !== 0) return;
      var c = parseCandidate(l);
      if (!c || c.protocol !== 'udp' || c.component !== 1 || c.type !== 'host') return;
      var key = c.addr + ':' + c.port;
      if (seen[key]) return;
      seen[key] = 1; addrs.push(c);
    });
    // Plain addresses (192.168.x.x) first, then hidden ".local" names, then IPv6.
    function rank(a) { return /^\d+\.\d+\.\d+\.\d+$/.test(a) ? 0 : /\.local$/.test(a) ? 1 : 2; }
    addrs.sort(function (a, b) { return rank(a.addr) - rank(b.addr); });
    var cands = addrs.slice(0, MAX_ADDRS).map(function (c) { return c.addr + ':' + c.port; }).join(',');
    return [PREFIX, desc.type === 'offer' ? 'o' : 'a', ufrag, pwd, toB64(fpBytes), cands].join('~');
  }
  function unpack(code) {
    code = String(code || '').replace(/[\r\n\t]/g, '').trim();
    if (code.indexOf('WM1') === 0) throw new Error('That phone has an older Word Mix. Update both phones (Settings shows the version) and try again.');
    var parts = code.split('~');
    if (parts.length !== 6 || parts[0] !== PREFIX || (parts[1] !== 'o' && parts[1] !== 'a')) throw new Error('That is not a Word Mix code.');
    var fp;
    try { fp = fromB64(parts[4]); } catch (e) { fp = null; }
    if (!fp || fp.length !== 32 || !parts[2] || !parts[3]) throw new Error('That code is damaged. Scan it again.');
    var offer = parts[1] === 'o';
    var cands = parts[5] ? parts[5].split(',').map(function (c) {
      var i = c.lastIndexOf(':');
      return { addr: c.slice(0, i), port: Number(c.slice(i + 1)) };
    }).filter(function (c) { return c.addr && c.port > 0 && c.port < 65536 && c.port === Math.floor(c.port); }) : [];
    var hex = Array.prototype.map.call(fp, function (b) { return (b < 16 ? '0' : '') + b.toString(16).toUpperCase(); }).join(':');
    var sdp = [
      'v=0', 'o=- 1 2 IN IP4 127.0.0.1', 's=-', 't=0 0',
      'a=group:BUNDLE 0', 'a=msid-semantic: WMS',
      'm=application 9 UDP/DTLS/SCTP webrtc-datachannel', 'c=IN IP4 0.0.0.0'
    ].concat(cands.map(function (c, i) { return 'a=candidate:' + (i + 1) + ' 1 udp ' + (2122260223 - i) + ' ' + c.addr + ' ' + c.port + ' typ host generation 0'; }))
     .concat([
      'a=end-of-candidates',
      'a=ice-ufrag:' + parts[2], 'a=ice-pwd:' + parts[3],
      'a=fingerprint:sha-256 ' + hex,
      'a=setup:' + (offer ? 'actpass' : 'active'),
      'a=mid:0', 'a=sctp-port:5000', 'a=max-message-size:262144'
    ]).join('\r\n') + '\r\n';
    return { type: offer ? 'offer' : 'answer', sdp: sdp };
  }
  function waitIce(pc, ms) {
    return new Promise(function (res) {
      if (pc.iceGatheringState === 'complete') return res();
      var t = setTimeout(res, ms || 4000);
      pc.addEventListener('icegatheringstatechange', function () {
        if (pc.iceGatheringState === 'complete') { clearTimeout(t); res(); }
      });
    });
  }
  function newPc() { return new RTCPeerConnection({ iceServers: [] }); }

  // Host: one offer per guest.
  async function createOffer() {
    var pc = newPc();
    var dc = pc.createDataChannel('wordmix', { ordered: true });
    await pc.setLocalDescription(await pc.createOffer());
    await waitIce(pc);
    return { pc: pc, dc: dc, code: await pack(pc.localDescription) };
  }
  async function acceptAnswer(pc, code) {
    var d = await unpack(code);
    if (d.type !== 'answer') throw new Error('That is the host code. Scan the code on your friend’s phone.');
    await pc.setRemoteDescription(d);
  }
  // Guest: answer the host's offer.
  async function answerOffer(code) {
    var d = await unpack(code);
    if (d.type !== 'offer') throw new Error('That is a reply code. Scan the code on the host’s phone.');
    var pc = newPc();
    var dcPromise = new Promise(function (r) { pc.ondatachannel = function (e) { r(e.channel); }; });
    await pc.setRemoteDescription(d);
    await pc.setLocalDescription(await pc.createAnswer());
    await waitIce(pc);
    return { pc: pc, dcPromise: dcPromise, code: await pack(pc.localDescription) };
  }

  // Camera access also lets the browser share this phone's local network address,
  // which makes connections more reliable on home Wi-Fi.
  async function primeCamera() {
    try {
      var s = await navigator.mediaDevices.getUserMedia({ video: true });
      s.getTracks().forEach(function (t) { t.stop(); });
      return true;
    } catch (e) { return false; }
  }

  var jsqrPromise = null;
  function loadJsQR() {
    if (root.jsQR) return Promise.resolve(root.jsQR);
    if (!jsqrPromise) {
      jsqrPromise = new Promise(function (res, rej) {
        var s = document.createElement('script');
        s.src = JSQR_URL; s.async = true;
        s.onload = function () { root.jsQR ? res(root.jsQR) : rej(new Error('Scanner failed to load')); };
        s.onerror = function () { jsqrPromise = null; rej(new Error('The scanner is not downloaded yet. Open Word Mix once with internet, or use the text code.')); };
        document.head.appendChild(s);
      });
    }
    return jsqrPromise;
  }

  // Opens the camera inside `host` and calls onCode(text) when a Word Mix code is seen.
  async function startScanner(video, onCode, onError) {
    var stopped = false, stream = null, timer = null;
    var detector = null;
    try {
      if ('BarcodeDetector' in root) {
        var formats = await root.BarcodeDetector.getSupportedFormats();
        if (formats.indexOf('qr_code') >= 0) detector = new root.BarcodeDetector({ formats: ['qr_code'] });
      }
    } catch (e) { detector = null; }
    var decode = null;
    if (!detector) {
      try { decode = await loadJsQR(); } catch (e) { onError(e); return { stop: function () {} }; }
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 1280 } }, audio: false });
    } catch (e) {
      onError(new Error('Camera access was blocked. Allow the camera for this site, or use the text code.'));
      return { stop: function () {} };
    }
    video.setAttribute('playsinline', '');
    video.muted = true;
    video.srcObject = stream;
    try { await video.play(); } catch (e) {}
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d', { willReadFrequently: true });
    async function tick() {
      if (stopped) return;
      try {
        if (video.readyState >= 2 && video.videoWidth) {
          var text = null;
          if (detector) {
            var codes = await detector.detect(video);
            for (var i = 0; i < codes.length; i++) if (codes[i].rawValue.indexOf(PREFIX) === 0) { text = codes[i].rawValue; break; }
          } else {
            var w = video.videoWidth, h = video.videoHeight, s = Math.min(1, 900 / Math.max(w, h));
            canvas.width = Math.round(w * s); canvas.height = Math.round(h * s);
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            var img = ctx.getImageData(0, 0, canvas.width, canvas.height);
            var r = decode(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
            if (r && r.data && r.data.indexOf(PREFIX) === 0) text = r.data;
          }
          if (text) { api.stop(); onCode(text); return; }
        }
      } catch (e) {}
      timer = setTimeout(tick, 160);
    }
    var api = {
      stop: function () {
        stopped = true; clearTimeout(timer);
        if (stream) stream.getTracks().forEach(function (t) { t.stop(); });
        video.srcObject = null;
      }
    };
    tick();
    return api;
  }

  // Live connection readout for troubleshooting: what each side is trying and whether replies arrive.
  function browserName() {
    var u = navigator.userAgent;
    if (/SamsungBrowser\/([\d.]+)/.test(u)) return 'Samsung Internet ' + RegExp.$1;
    if (/CriOS\/([\d.]+)/.test(u)) return 'Chrome iOS ' + RegExp.$1;
    if (/Chrome\/([\d.]+)/.test(u)) return 'Chrome ' + RegExp.$1;
    if (/Version\/([\d.]+).*Safari/.test(u)) return 'Safari ' + RegExp.$1;
    return u.slice(0, 60);
  }
  function addrList(sdp) {
    var out = [];
    (sdp || '').split(/\r?\n/).forEach(function (l) {
      var m = /^a=candidate:\S+ \d+ (udp|tcp) \d+ (\S+) (\d+) typ (\w+)/i.exec(l);
      if (m) out.push((/\.local$/.test(m[2]) ? 'hidden-name' : m[2]) + ':' + m[3] + '/' + m[1]);
    });
    return out.length ? out.join(', ') : 'none listed';
  }
  async function describe(pc) {
    var lines = ['Browser: ' + browserName() + (window.matchMedia('(display-mode: standalone)').matches ? ' (installed app)' : ' (browser tab)'),
      'State: ice=' + pc.iceConnectionState + ' conn=' + (pc.connectionState || '?') + ' gather=' + pc.iceGatheringState,
      'My addresses: ' + addrList(pc.localDescription && pc.localDescription.sdp),
      'Their addresses: ' + addrList(pc.remoteDescription && pc.remoteDescription.sdp)];
    try {
      var st = await pc.getStats(), cands = {}, pairs = [];
      st.forEach(function (r) {
        if (r.type === 'local-candidate' || r.type === 'remote-candidate') cands[r.id] = (r.address || r.ip || '?') + ':' + r.port + ' ' + (r.candidateType || '');
        if (r.type === 'candidate-pair') pairs.push(r);
      });
      if (!pairs.length) lines.push('Attempts: none yet');
      pairs.slice(0, 6).forEach(function (p) {
        lines.push((cands[p.localCandidateId] || '?') + ' \u2192 ' + (cands[p.remoteCandidateId] || '?') + ' | ' + p.state +
          ' | sent ' + (p.requestsSent || 0) + ', replies ' + (p.responsesReceived || 0) + ', their tries ' + (p.requestsReceived || 0));
      });
    } catch (e) { lines.push('Stats unavailable: ' + e.message); }
    return lines.join('\n');
  }

  root.WMNet = {
    describe: describe,
    createOffer: createOffer, acceptAnswer: acceptAnswer, answerOffer: answerOffer,
    primeCamera: primeCamera, startScanner: startScanner, loadJsQR: loadJsQR, JSQR_URL: JSQR_URL,
    supported: typeof RTCPeerConnection !== 'undefined'
  };
})(window);
