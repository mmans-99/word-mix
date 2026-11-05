/* Word Mix: small QR code encoder (alphanumeric and byte modes) plus Base45.
   Used to pass connection codes between phones without the internet. */
(function (root) {
  'use strict';

  var ECC_PER_BLOCK = {
    L: [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    M: [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28]
  };
  var NUM_BLOCKS = {
    L: [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
    M: [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49]
  };
  var FORMAT_BITS = { L: 1, M: 0 };
  var ALNUM = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';

  function rawModules(ver) {
    var r = (16 * ver + 128) * ver + 64;
    if (ver >= 2) {
      var na = Math.floor(ver / 7) + 2;
      r -= (25 * na - 10) * na - 55;
      if (ver >= 7) r -= 36;
    }
    return r;
  }
  function dataCodewords(ver, ecl) {
    return Math.floor(rawModules(ver) / 8) - ECC_PER_BLOCK[ecl][ver] * NUM_BLOCKS[ecl][ver];
  }
  function gfMul(x, y) {
    var z = 0;
    for (var i = 7; i >= 0; i--) {
      z = (z << 1) ^ ((z >>> 7) * 0x11d);
      z ^= ((y >>> i) & 1) * x;
    }
    return z & 0xff;
  }
  function rsDivisor(degree) {
    var res = [];
    for (var i = 0; i < degree - 1; i++) res.push(0);
    res.push(1);
    var root = 1;
    for (var k = 0; k < degree; k++) {
      for (var j = 0; j < res.length; j++) {
        res[j] = gfMul(res[j], root);
        if (j + 1 < res.length) res[j] ^= res[j + 1];
      }
      root = gfMul(root, 0x02);
    }
    return res;
  }
  function rsRemainder(data, div) {
    var res = div.map(function () { return 0; });
    data.forEach(function (b) {
      var factor = b ^ res.shift();
      res.push(0);
      for (var i = 0; i < res.length; i++) res[i] ^= gfMul(div[i], factor);
    });
    return res;
  }

  function isAlnum(text) {
    for (var i = 0; i < text.length; i++) if (ALNUM.indexOf(text[i]) < 0) return false;
    return true;
  }
  function utf8(text) {
    var out = [], s = unescape(encodeURIComponent(text));
    for (var i = 0; i < s.length; i++) out.push(s.charCodeAt(i));
    return out;
  }

  function encode(text, ecl) {
    ecl = ecl || 'L';
    var alnum = isAlnum(text);
    var bytes = alnum ? null : utf8(text);
    var count = alnum ? text.length : bytes.length;
    var ver, bits;
    for (ver = 1; ver <= 40; ver++) {
      var ccBits = alnum ? (ver <= 9 ? 9 : ver <= 26 ? 11 : 13) : (ver <= 9 ? 8 : 16);
      var dataBits = alnum ? (Math.floor(count / 2) * 11 + (count % 2) * 6) : count * 8;
      var need = 4 + ccBits + dataBits;
      if (need <= dataCodewords(ver, ecl) * 8) {
        bits = [];
        var push = function (val, len) { for (var i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
        push(alnum ? 2 : 4, 4);
        push(count, ccBits);
        if (alnum) {
          for (var i = 0; i + 1 < text.length; i += 2) push(ALNUM.indexOf(text[i]) * 45 + ALNUM.indexOf(text[i + 1]), 11);
          if (text.length % 2) push(ALNUM.indexOf(text[text.length - 1]), 6);
        } else {
          bytes.forEach(function (b) { push(b, 8); });
        }
        break;
      }
    }
    if (!bits) throw new Error('Text too long for a QR code');
    var cap = dataCodewords(ver, ecl) * 8;
    for (var t = 0; t < 4 && bits.length < cap; t++) bits.push(0);
    while (bits.length % 8) bits.push(0);
    var data = [];
    for (var b = 0; b < bits.length; b += 8) {
      var v = 0;
      for (var k = 0; k < 8; k++) v = (v << 1) | bits[b + k];
      data.push(v);
    }
    for (var pad = 0xec; data.length < cap / 8; pad ^= 0xec ^ 0x11) data.push(pad);

    // Error correction and interleaving.
    var numBlocks = NUM_BLOCKS[ecl][ver], eccLen = ECC_PER_BLOCK[ecl][ver];
    var rawCw = Math.floor(rawModules(ver) / 8);
    var numShort = numBlocks - rawCw % numBlocks;
    var shortLen = Math.floor(rawCw / numBlocks);
    var div = rsDivisor(eccLen), blocks = [];
    for (var bi = 0, pos = 0; bi < numBlocks; bi++) {
      var dat = data.slice(pos, pos + shortLen - eccLen + (bi < numShort ? 0 : 1));
      pos += dat.length;
      var ecc = rsRemainder(dat, div);
      if (bi < numShort) dat.push(0);
      blocks.push(dat.concat(ecc));
    }
    var all = [];
    for (var ci = 0; ci < blocks[0].length; ci++) {
      for (var bj = 0; bj < blocks.length; bj++) {
        if (ci !== shortLen - eccLen || bj >= numShort) all.push(blocks[bj][ci]);
      }
    }

    // Build the matrix.
    var size = ver * 4 + 17;
    var mod = [], fn = [];
    for (var y = 0; y < size; y++) {
      mod.push(new Array(size).fill(false));
      fn.push(new Array(size).fill(false));
    }
    function setF(x, y, dark) { mod[y][x] = dark; fn[y][x] = true; }
    for (var i2 = 0; i2 < size; i2++) { setF(6, i2, i2 % 2 === 0); setF(i2, 6, i2 % 2 === 0); }
    function finder(cx, cy) {
      for (var dy = -4; dy <= 4; dy++) for (var dx = -4; dx <= 4; dx++) {
        var d = Math.max(Math.abs(dx), Math.abs(dy)), xx = cx + dx, yy = cy + dy;
        if (xx >= 0 && xx < size && yy >= 0 && yy < size) setF(xx, yy, d !== 2 && d !== 4);
      }
    }
    finder(3, 3); finder(size - 4, 3); finder(3, size - 4);
    var align = [];
    if (ver > 1) {
      var na = Math.floor(ver / 7) + 2;
      var step = ver === 32 ? 26 : Math.ceil((ver * 4 + 4) / (na * 2 - 2)) * 2;
      align = [6];
      for (var p = size - 7; align.length < na; p -= step) align.splice(1, 0, p);
    }
    for (var ai = 0; ai < align.length; ai++) for (var aj = 0; aj < align.length; aj++) {
      if ((ai === 0 && aj === 0) || (ai === 0 && aj === align.length - 1) || (ai === align.length - 1 && aj === 0)) continue;
      for (var ady = -2; ady <= 2; ady++) for (var adx = -2; adx <= 2; adx++)
        setF(align[ai] + adx, align[aj] + ady, Math.max(Math.abs(adx), Math.abs(ady)) !== 1);
    }
    function drawFormat(mask) {
      var d = (FORMAT_BITS[ecl] << 3) | mask, rem = d;
      for (var i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
      var fb = ((d << 10) | rem) ^ 0x5412;
      var g = function (i) { return ((fb >>> i) & 1) !== 0; };
      for (var a = 0; a <= 5; a++) setF(8, a, g(a));
      setF(8, 7, g(6)); setF(8, 8, g(7)); setF(7, 8, g(8));
      for (var c = 9; c < 15; c++) setF(14 - c, 8, g(c));
      for (var e = 0; e < 8; e++) setF(size - 1 - e, 8, g(e));
      for (var f = 8; f < 15; f++) setF(8, size - 15 + f, g(f));
      setF(8, size - 8, true);
    }
    drawFormat(0);
    if (ver >= 7) {
      var rem2 = ver;
      for (var q = 0; q < 12; q++) rem2 = (rem2 << 1) ^ ((rem2 >>> 11) * 0x1f25);
      var vb = (ver << 12) | rem2;
      for (var vi = 0; vi < 18; vi++) {
        var bit = ((vb >>> vi) & 1) !== 0, va = size - 11 + vi % 3, vbb = Math.floor(vi / 3);
        setF(va, vbb, bit); setF(vbb, va, bit);
      }
    }
    var bitIdx = 0;
    for (var right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (var vert = 0; vert < size; vert++) for (var j = 0; j < 2; j++) {
        var x = right - j, up = ((right + 1) & 2) === 0, yy2 = up ? size - 1 - vert : vert;
        if (!fn[yy2][x] && bitIdx < all.length * 8) {
          mod[yy2][x] = ((all[bitIdx >>> 3] >>> (7 - (bitIdx & 7))) & 1) !== 0;
          bitIdx++;
        }
      }
    }
    function maskFn(m, x, y) {
      switch (m) {
        case 0: return (x + y) % 2 === 0;
        case 1: return y % 2 === 0;
        case 2: return x % 3 === 0;
        case 3: return (x + y) % 3 === 0;
        case 4: return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
        case 5: return x * y % 2 + x * y % 3 === 0;
        case 6: return (x * y % 2 + x * y % 3) % 2 === 0;
        default: return ((x + y) % 2 + x * y % 3) % 2 === 0;
      }
    }
    function applyMask(m) {
      for (var y = 0; y < size; y++) for (var x = 0; x < size; x++)
        if (!fn[y][x] && maskFn(m, x, y)) mod[y][x] = !mod[y][x];
    }
    function penalty() {
      var score = 0, dark = 0;
      for (var y = 0; y < size; y++) {
        var runR = 1, runC = 1;
        for (var x = 0; x < size; x++) {
          if (mod[y][x]) dark++;
          if (x > 0) {
            if (mod[y][x] === mod[y][x - 1]) { runR++; if (runR === 5) score += 3; else if (runR > 5) score++; } else runR = 1;
            if (mod[x][y] === mod[x - 1][y]) { runC++; if (runC === 5) score += 3; else if (runC > 5) score++; } else runC = 1;
          }
          if (x < size - 1 && y < size - 1) {
            var c = mod[y][x];
            if (c === mod[y][x + 1] && c === mod[y + 1][x] && c === mod[y + 1][x + 1]) score += 3;
          }
        }
      }
      score += Math.floor(Math.abs(dark * 20 - size * size * 10) / (size * size)) * 10;
      return score;
    }
    var best = 0, bestScore = Infinity;
    for (var m = 0; m < 8; m++) {
      applyMask(m); drawFormat(m);
      var s = penalty();
      if (s < bestScore) { bestScore = s; best = m; }
      applyMask(m);
    }
    applyMask(best); drawFormat(best);
    return { size: size, version: ver, modules: mod };
  }

  function toCanvas(canvas, text, opts) {
    opts = opts || {};
    var qr = encode(text, opts.ecl || 'L');
    var quiet = 3, n = qr.size + quiet * 2;
    var px = opts.size || 300;
    var dpr = (root.devicePixelRatio || 1);
    canvas.width = Math.round(px * dpr);
    canvas.height = Math.round(px * dpr);
    canvas.style.width = px + 'px';
    canvas.style.height = px + 'px';
    var ctx = canvas.getContext('2d');
    var scale = canvas.width / n;
    ctx.fillStyle = opts.light || '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = opts.dark || '#000000';
    for (var y = 0; y < qr.size; y++) for (var x = 0; x < qr.size; x++) {
      if (qr.modules[y][x]) {
        var x0 = Math.floor((x + quiet) * scale), y0 = Math.floor((y + quiet) * scale);
        var x1 = Math.floor((x + quiet + 1) * scale), y1 = Math.floor((y + quiet + 1) * scale);
        ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
      }
    }
    return qr;
  }

  // Base45 (RFC 9285): packs bytes into the QR alphanumeric alphabet.
  var B45 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';
  function b45encode(bytes) {
    var out = '';
    for (var i = 0; i < bytes.length; i += 2) {
      if (i + 1 < bytes.length) {
        var x = bytes[i] * 256 + bytes[i + 1];
        out += B45[x % 45] + B45[Math.floor(x / 45) % 45] + B45[Math.floor(x / 2025)];
      } else {
        var y = bytes[i];
        out += B45[y % 45] + B45[Math.floor(y / 45)];
      }
    }
    return out;
  }
  function b45decode(str) {
    var out = [];
    for (var i = 0; i < str.length; i += 3) {
      var c = B45.indexOf(str[i]), d = B45.indexOf(str[i + 1]);
      if (c < 0 || d < 0) throw new Error('Bad code');
      if (i + 2 < str.length) {
        var e = B45.indexOf(str[i + 2]);
        if (e < 0) throw new Error('Bad code');
        var x = c + d * 45 + e * 2025;
        if (x > 65535) throw new Error('Bad code');
        out.push(x >> 8, x & 255);
      } else {
        var y = c + d * 45;
        if (y > 255) throw new Error('Bad code');
        out.push(y);
      }
    }
    return new Uint8Array(out);
  }

  root.WMQR = { encode: encode, toCanvas: toCanvas, b45encode: b45encode, b45decode: b45decode };
})(typeof window !== 'undefined' ? window : globalThis);
