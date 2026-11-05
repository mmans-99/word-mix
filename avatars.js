/* Word Mix avatars: simple flat animal faces drawn as SVG. */
(function (root) {
  'use strict';
  var INK = '#2E2117';
  function eyes(y, gap, r) {
    r = r || 2.6; gap = gap || 7;
    return '<circle cx="' + (32 - gap) + '" cy="' + y + '" r="' + r + '" fill="' + INK + '"/><circle cx="' + (32 + gap) + '" cy="' + y + '" r="' + r + '" fill="' + INK + '"/>';
  }
  var A = [
    { id: 'fox', name: 'Fox', bg: '#FFE2C7', svg:
      '<polygon points="13,30 17,8 29,21" fill="#E2581A"/><polygon points="51,30 47,8 35,21" fill="#E2581A"/>' +
      '<polygon points="17,26 18,14 25,21" fill="#FFF3E6"/><polygon points="47,26 46,14 39,21" fill="#FFF3E6"/>' +
      '<ellipse cx="32" cy="36" rx="19" ry="17" fill="#F26B21"/>' +
      '<path d="M13 37 Q32 31 51 37 Q45 55 32 55 Q19 55 13 37Z" fill="#FFF3E6"/>' + eyes(34, 7.5) +
      '<ellipse cx="32" cy="44" rx="3.4" ry="2.4" fill="' + INK + '"/>' },
    { id: 'cat', name: 'Cat', bg: '#DCE8FF', svg:
      '<polygon points="13,30 15,9 29,20" fill="#8E8EA0"/><polygon points="51,30 49,9 35,20" fill="#8E8EA0"/>' +
      '<polygon points="17,24 17.5,15 24,20" fill="#F7B6C8"/><polygon points="47,24 46.5,15 40,20" fill="#F7B6C8"/>' +
      '<circle cx="32" cy="37" r="19" fill="#A3A3B4"/>' +
      '<ellipse cx="25" cy="35" rx="2.8" ry="3.6" fill="' + INK + '"/><ellipse cx="39" cy="35" rx="2.8" ry="3.6" fill="' + INK + '"/>' +
      '<polygon points="29.5,42 34.5,42 32,45" fill="#E8789A"/>' +
      '<path d="M14 42 L24 43 M14 47 L24 45 M50 42 L40 43 M50 47 L40 45" stroke="' + INK + '" stroke-width="1.4" stroke-linecap="round"/>' },
    { id: 'owl', name: 'Owl', bg: '#E2F2D2', svg:
      '<polygon points="15,20 19,9 25,18" fill="#7A5236"/><polygon points="49,20 45,9 39,18" fill="#7A5236"/>' +
      '<ellipse cx="32" cy="37" rx="19" ry="20" fill="#8B5E3C"/>' +
      '<ellipse cx="32" cy="45" rx="11" ry="10" fill="#D9B48A"/>' +
      '<circle cx="24.5" cy="31" r="7.5" fill="#FFFFFF"/><circle cx="39.5" cy="31" r="7.5" fill="#FFFFFF"/>' +
      '<circle cx="24.5" cy="31" r="3.6" fill="' + INK + '"/><circle cx="39.5" cy="31" r="3.6" fill="' + INK + '"/>' +
      '<polygon points="29,38 35,38 32,44" fill="#FFB020"/>' },
    { id: 'bear', name: 'Bear', bg: '#F6E7C4', svg:
      '<circle cx="17" cy="20" r="7.5" fill="#8B5E3C"/><circle cx="47" cy="20" r="7.5" fill="#8B5E3C"/>' +
      '<circle cx="17" cy="20" r="3.6" fill="#C99B6D"/><circle cx="47" cy="20" r="3.6" fill="#C99B6D"/>' +
      '<circle cx="32" cy="36" r="19" fill="#8B5E3C"/>' +
      '<ellipse cx="32" cy="44" rx="9" ry="7" fill="#E3C29B"/>' + eyes(32, 7) +
      '<ellipse cx="32" cy="41" rx="3.4" ry="2.4" fill="' + INK + '"/>' },
    { id: 'panda', name: 'Panda', bg: '#DDF0E8', svg:
      '<circle cx="16" cy="19" r="7.5" fill="' + INK + '"/><circle cx="48" cy="19" r="7.5" fill="' + INK + '"/>' +
      '<circle cx="32" cy="36" r="19" fill="#FFFFFF"/>' +
      '<ellipse cx="24" cy="34" rx="5" ry="6.5" transform="rotate(30 24 34)" fill="' + INK + '"/>' +
      '<ellipse cx="40" cy="34" rx="5" ry="6.5" transform="rotate(-30 40 34)" fill="' + INK + '"/>' +
      '<circle cx="24.5" cy="33.5" r="1.8" fill="#FFFFFF"/><circle cx="39.5" cy="33.5" r="1.8" fill="#FFFFFF"/>' +
      '<ellipse cx="32" cy="43" rx="3.2" ry="2.3" fill="' + INK + '"/>' },
    { id: 'frog', name: 'Frog', bg: '#FFF1D6', svg:
      '<circle cx="21" cy="22" r="8.5" fill="#5DB33E"/><circle cx="43" cy="22" r="8.5" fill="#5DB33E"/>' +
      '<ellipse cx="32" cy="39" rx="21" ry="16" fill="#6CC24A"/>' +
      '<circle cx="21" cy="22" r="5" fill="#FFFFFF"/><circle cx="43" cy="22" r="5" fill="#FFFFFF"/>' +
      '<circle cx="21" cy="22.5" r="2.6" fill="' + INK + '"/><circle cx="43" cy="22.5" r="2.6" fill="' + INK + '"/>' +
      '<path d="M22 42 Q32 50 42 42" stroke="' + INK + '" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
      '<circle cx="17" cy="41" r="3" fill="#F7A1B5"/><circle cx="47" cy="41" r="3" fill="#F7A1B5"/>' },
    { id: 'rabbit', name: 'Rabbit', bg: '#FFE0EA', svg:
      '<ellipse cx="24" cy="15" rx="5.5" ry="13" fill="#FFFFFF"/><ellipse cx="40" cy="15" rx="5.5" ry="13" fill="#FFFFFF"/>' +
      '<ellipse cx="24" cy="16" rx="2.6" ry="9" fill="#F7B6C8"/><ellipse cx="40" cy="16" rx="2.6" ry="9" fill="#F7B6C8"/>' +
      '<circle cx="32" cy="40" r="17" fill="#FFFFFF"/>' + eyes(37, 6.5) +
      '<ellipse cx="32" cy="44" rx="2.8" ry="2" fill="#E8789A"/>' +
      '<rect x="29.6" y="46" width="4.8" height="5" rx="1" fill="#FFFFFF" stroke="' + INK + '" stroke-width="1"/>' },
    { id: 'penguin', name: 'Penguin', bg: '#D3EEF9', svg:
      '<circle cx="32" cy="35" r="21" fill="#2B3440"/>' +
      '<path d="M18 38 Q18 27 26 27 Q32 27 32 32 Q32 27 38 27 Q46 27 46 38 Q46 52 32 52 Q18 52 18 38Z" fill="#FFFFFF"/>' + eyes(35, 6.5) +
      '<polygon points="28.5,40 35.5,40 32,45" fill="#FFB020"/>' },
    { id: 'mouse', name: 'Mouse', bg: '#ECE4FF', svg:
      '<circle cx="15" cy="22" r="10.5" fill="#B4AEC2"/><circle cx="49" cy="22" r="10.5" fill="#B4AEC2"/>' +
      '<circle cx="15" cy="22" r="6" fill="#F7B6C8"/><circle cx="49" cy="22" r="6" fill="#F7B6C8"/>' +
      '<ellipse cx="32" cy="39" rx="16" ry="17" fill="#C9C3D6"/>' + eyes(36, 6) +
      '<circle cx="32" cy="46" r="2.6" fill="#E8789A"/>' +
      '<path d="M16 44 L25 45 M16 49 L25 47 M48 44 L39 45 M48 49 L39 47" stroke="' + INK + '" stroke-width="1.3" stroke-linecap="round"/>' },
    { id: 'koala', name: 'Koala', bg: '#E6EBEF', svg:
      '<circle cx="15" cy="26" r="10.5" fill="#97A1AC"/><circle cx="49" cy="26" r="10.5" fill="#97A1AC"/>' +
      '<circle cx="15" cy="26" r="6" fill="#E4E7EA"/><circle cx="49" cy="26" r="6" fill="#E4E7EA"/>' +
      '<circle cx="32" cy="37" r="17" fill="#A9B2BC"/>' + eyes(33, 7, 2.4) +
      '<ellipse cx="32" cy="41" rx="5" ry="7" fill="' + INK + '"/>' },
    { id: 'tiger', name: 'Tiger', bg: '#FFF2D0', svg:
      '<circle cx="17" cy="19" r="7" fill="#F2911B"/><circle cx="47" cy="19" r="7" fill="#F2911B"/>' +
      '<circle cx="17" cy="19" r="3.4" fill="#FFF3E6"/><circle cx="47" cy="19" r="3.4" fill="#FFF3E6"/>' +
      '<circle cx="32" cy="36" r="19" fill="#F5A623"/>' +
      '<path d="M32 17 L32 25 M25 18 L27 25 M39 18 L37 25 M13 34 L20 35 M51 34 L44 35 M14 41 L20 40 M50 41 L44 40" stroke="' + INK + '" stroke-width="2.4" stroke-linecap="round"/>' +
      '<ellipse cx="32" cy="45" rx="9" ry="7" fill="#FFF3E6"/>' + eyes(33, 7) +
      '<polygon points="29,41 35,41 32,44" fill="' + INK + '"/>' },
    { id: 'chick', name: 'Chick', bg: '#FFE3DA', svg:
      '<path d="M30 15 Q32 7 36 12 Q34 13 33 17Z" fill="#F5B800"/>' +
      '<circle cx="32" cy="36" r="20" fill="#FFD23F"/>' + eyes(33, 7) +
      '<polygon points="28,39 36,39 32,45" fill="#F26B21"/>' +
      '<circle cx="19" cy="41" r="3.2" fill="#F7A1B5"/><circle cx="45" cy="41" r="3.2" fill="#F7A1B5"/>' }
  ];
  var counter = 0;
  function svg(id, size) {
    var a = A.filter(function (x) { return x.id === id; })[0] || A[0];
    size = size || 48;
    var cid = 'wmav' + (++counter);
    return '<svg class="avatar" width="' + size + '" height="' + size + '" viewBox="0 0 64 64" aria-hidden="true">' +
      '<defs><clipPath id="' + cid + '"><circle cx="32" cy="32" r="32"/></clipPath></defs>' +
      '<circle cx="32" cy="32" r="32" fill="' + a.bg + '"/>' +
      '<g clip-path="url(#' + cid + ')">' + a.svg + '</g></svg>';
  }
  root.WMAvatars = { list: A, svg: svg };
})(window);
