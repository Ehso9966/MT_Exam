window.MT = window.MT || {};

/* MT.NumberStyles — configurable number styles for section titles and
   questions (arabic, roman, letters, with/without parentheses). */
MT.NumberStyles = (function () {
  function toRoman(num) {
    if (!num || num < 1 || num >= 4000) return String(num);
    var map = [
      [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
      [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
      [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']
    ];
    var out = '';
    for (var i = 0; i < map.length; i++) {
      while (num >= map[i][0]) { out += map[i][1]; num -= map[i][0]; }
    }
    return out;
  }

  function toLetters(num) {
    var out = '';
    while (num > 0) {
      var rem = (num - 1) % 26;
      out = String.fromCharCode(65 + rem) + out;
      num = Math.floor((num - 1) / 26);
    }
    return out;
  }

  var STYLES = [
    { id: 'arabic', label: '1 2 3', parens: false },
    { id: 'romanUpper', label: 'I II III', parens: false },
    { id: 'romanLower', label: 'i ii iii', parens: false },
    { id: 'lettersUpper', label: 'A B C', parens: false },
    { id: 'lettersLower', label: 'a b c', parens: false },
    { id: 'parenthesizedArabic', label: '(1) (2) (3)', parens: true },
    { id: 'parenthesizedRomanUpper', label: '(I) (II) (III)', parens: true },
    { id: 'parenthesizedRomanLower', label: '(i) (ii) (iii)', parens: true },
    { id: 'parenthesizedLettersUpper', label: '(A) (B) (C)', parens: true },
    { id: 'parenthesizedLettersLower', label: '(a) (b) (c)', parens: true }
  ];

  function getStyle(id) {
    for (var i = 0; i < STYLES.length; i++) {
      if (STYLES[i].id === id) return STYLES[i];
    }
    return STYLES[0];
  }

  // Base numeral token, no parentheses / trailing dot.
  function numeral(num, styleId, lang) {
    var my = lang !== 'en';
    switch (styleId) {
      case 'romanUpper': return toRoman(num);
      case 'romanLower': return toRoman(num).toLowerCase();
      case 'lettersUpper': return toLetters(num);
      case 'lettersLower': return toLetters(num).toLowerCase();
      case 'parenthesizedRomanUpper': return toRoman(num);
      case 'parenthesizedRomanLower': return toRoman(num).toLowerCase();
      case 'parenthesizedLettersUpper': return toLetters(num);
      case 'parenthesizedLettersLower': return toLetters(num).toLowerCase();
      default: return my ? MT.Utils.toMyanmarDigits(num) : String(num);
    }
  }

  // Token wrapped in parentheses when the style is parenthesized.
  function format(num, styleId, lang) {
    var base = numeral(num, styleId, lang);
    return getStyle(styleId).parens ? '(' + base + ')' : base;
  }

  // Full number display: parenthesized styles keep the parens, plain styles
  // get a trailing dot (e.g. "1.", "I.", "(1)").
  function display(num, styleId, lang) {
    var base = numeral(num, styleId, lang);
    return getStyle(styleId).parens ? '(' + base + ')' : base + '.';
  }

  // Bind a number chip (button) to open the style dropdown next to it.
  function bindDropdown(trigger, currentId, onSelect) {
    var dd = null;

    function close() {
      if (dd) { dd.remove(); dd = null; }
      document.removeEventListener('click', onDoc);
      document.removeEventListener('keydown', onKey);
    }
    function onDoc(e) { if (dd && !dd.contains(e.target) && e.target !== trigger) close(); }
    function onKey(e) { if (e.key === 'Escape') close(); }

    function open() {
      var rect = trigger.getBoundingClientRect();
      dd = document.createElement('div');
      dd.className = 'math-dropdown number-style-dropdown';
      STYLES.forEach(function (s) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'math-btn math-drop-btn' + (s.id === currentId ? ' active' : '');
        b.textContent = s.label;
        b.addEventListener('click', function () {
          if (onSelect) onSelect(s.id);
          close();
        });
        dd.appendChild(b);
      });
      dd.style.position = 'fixed';
      dd.style.top = (rect.bottom + 6) + 'px';
      dd.style.left = Math.max(8, Math.min(window.innerWidth - 210, rect.left)) + 'px';
      dd.style.zIndex = '1500';
      document.body.appendChild(dd);
      setTimeout(function () {
        document.addEventListener('click', onDoc);
        document.addEventListener('keydown', onKey);
      }, 0);
    }

    trigger.addEventListener('click', function (e) {
      e.stopPropagation();
      e.preventDefault();
      if (dd) close(); else open();
    });
  }

  return {
    STYLES: STYLES, getStyle: getStyle,
    numeral: numeral, format: format, display: display,
    bindDropdown: bindDropdown, toRoman: toRoman, toLetters: toLetters
  };
})();
