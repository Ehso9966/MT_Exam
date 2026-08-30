window.MT = window.MT || {};

MT.MathToolbar = (function () {
  function t(key, fallback) { return MT.Utils.t(key, null, fallback); }

  function insertAtCursor(textarea, text) {
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;
    textarea.value = value.slice(0, start) + text + value.slice(end);
    textarea.selectionStart = textarea.selectionEnd = start + text.length;
    textarea.focus();
  }

  function mathHint(sym) {
    if (sym.key) {
      const localized = t('math.hint' + sym.key.charAt(0).toUpperCase() + sym.key.slice(1), null);
      if (localized && localized.indexOf('math.hint') !== 0) return localized;
    }
    return sym.hint;
  }

  // Compact ∑ button that opens a dropdown of math symbols. Clicking a symbol
  // inserts $...$ LaTeX at the cursor in the given target (textarea/input).
  function renderMathDropdown(container, targetTextarea) {
    if (!container) return null;

    container.innerHTML = '';
    container.className = 'math-btn-wrap';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn sm math-btn-inline';
    btn.innerHTML = t('popup.mathButton', 'Math');
    btn.title = t('popup.mathToolbarHint', 'Insert math symbol');
    btn.setAttribute('aria-label', btn.title);

    function closeDropdown() {
      const existing = container.querySelector('.math-dropdown');
      if (existing) existing.remove();
      document.removeEventListener('click', onDocClick);
      document.removeEventListener('keydown', onKeyDown);
    }

    function onDocClick(e) {
      if (container.contains(e.target)) return;
      closeDropdown();
    }

    function onKeyDown(e) {
      if (e.key === 'Escape') closeDropdown();
    }

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      const existing = container.querySelector('.math-dropdown');
      if (existing) { closeDropdown(); return; }

      const dd = document.createElement('div');
      dd.className = 'math-dropdown';

      MT.Constants.MATH_SYMBOLS.forEach(function (sym) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'math-btn math-drop-btn';
        b.innerHTML = MT.Utils.escapeHtml(sym.label);
        b.title = mathHint(sym);
        b.addEventListener('click', function () {
          insertAtCursor(targetTextarea, ' $' + sym.latex + '$ ');
          closeDropdown();
        });
        dd.appendChild(b);
      });

      container.appendChild(dd);
      setTimeout(function () {
        document.addEventListener('click', onDocClick);
        document.addEventListener('keydown', onKeyDown);
      }, 0);
    });

    container.appendChild(btn);
    return container;
  }

  return { insertAtCursor, renderMathDropdown };
})();