/* Word Mix nearby play: phone-to-phone WebRTC links set up by scanning QR codes.
   No server or internet is needed once the app is installed. */
(function (root) {
  'use strict';
  var PREFIX = 'WM1';
  var JSQR_URL = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';

  function slimSdp(sdp) {
    return sdp.split(/\r?\n/).filter(function (l) {
      if (!l) return false;
      if (/^a=candidate:.* tcp /i.test(l)) return false;
      if (/^a=(extmap|ice-options|msid-semantic)/.test(l)) return false;
      return true;
    }).join('\r\n') + '\r\n';
  }
  async function compress(str) {
    var bytes = new TextEncoder().encode(str);
    if (typeof CompressionStream === 'undefined') return { z: 0, bytes: bytes };
    var cs = new CompressionStream('deflate-raw');
    var w = cs.writable.getWriter();
    w.write(bytes); w.close();
    return { z: 1, bytes: new Uint8Array(await new Response(cs.readable).arrayBuffer()) };
  }
  async function decompress(bytes, z) {
    if (!z) return new TextDecoder().decode(bytes);
    if (typeof DecompressionStream === 'undefined') throw new Error('This phone cannot read that code. Update the browser and try again.');
    var ds = new DecompressionStream('deflate-raw');
    var w = ds.writable.getWriter();
    w.write(bytes); w.close();
    return new TextDecoder().decode(await new Response(ds.readable).arrayBuffer());
  }
  async function pack(desc) {
    var c = await compress(slimSdp(desc.sdp));
    return PREFIX + (desc.type === 'offer' ? 'O' : 'A') + c.z + WMQR.b45encode(c.bytes);
  }
  async function unpack(code) {
    code = String(code || '').replace(/[\r\n\t]/g, '').trim();
    if (code.indexOf(PREFIX) !== 0 || code.length < 10) throw new Error('That is not a Word Mix code.');
    var kind = code[3], z = code[4] === '1';
    var sdp = await decompress(WMQR.b45decode(code.slice(5)), z);
    return { type: kind === 'O' ? 'offer' : 'answer', sdp: sdp };
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
  async function startScanner(video, onCode, onError, opts) {
    opts = opts || {};
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
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: opts.facing || 'environment', width: { ideal: 1280 }, height: { ideal: 1280 } }, audio: false });
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
      timer = setTimeout(tick, opts.interval || 160);
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

  root.WMNet = {
    createOffer: createOffer, acceptAnswer: acceptAnswer, answerOffer: answerOffer,
    primeCamera: primeCamera, startScanner: startScanner, loadJsQR: loadJsQR, JSQR_URL: JSQR_URL,
    supported: typeof RTCPeerConnection !== 'undefined'
  };
})(window);
