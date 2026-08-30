window.MT = window.MT || {};

MT.Utils = (function () {
  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function toMyanmarDigits(num) {
    const map = { '0': '၀', '1': '၁', '2': '၂', '3': '၃', '4': '၄', '5': '၅', '6': '၆', '7': '၇', '8': '၈', '9': '၉' };
    return String(num).replace(/[0-9]/g, function (d) { return map[d]; });
  }

  function toWesternDigits(str) {
    const map = { '၀': '0', '၁': '1', '၂': '2', '၃': '3', '၄': '4', '၅': '5', '၆': '6', '၇': '7', '၈': '8', '၉': '9' };
    return String(str).replace(/[၀-၉]/g, function (d) { return map[d]; });
  }

  // Convert a minute count to a clean hours string (up to 2 decimals, trailing
  // zeros trimmed) that round-trips back to the original minutes on *60.
  function formatDurationHours(minutes) {
    const h = Math.round((Number(minutes) / 60) * 100) / 100;
    return String(h);
  }

  // Format a number with Western or Myanmar digits depending on the UI language.
  function digits(n) {
    return (MT.I18n && MT.I18n.getLang() === 'en') ? String(n) : toMyanmarDigits(n);
  }

  // Shared i18n lookup: key + optional {{vars}} object + optional fallback used
  // when i18n is unavailable. MT.I18n is guaranteed loaded before any caller.
  function t(key, vars, fallback) {
    if (MT.I18n && MT.I18n.t) return MT.I18n.t(key, vars);
    return fallback !== undefined ? fallback : key;
  }

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'class') node.className = attrs[k];
        else if (k === 'dataset') Object.assign(node.dataset, attrs[k]);
        else if (k === 'style') {
          if (typeof attrs[k] === 'string') node.style.cssText = attrs[k];
          else Object.assign(node.style, attrs[k]);
        }
        else if (k.startsWith('on') && typeof attrs[k] === 'function') {
          node.addEventListener(k.slice(2), attrs[k]);
        }         else if (k === 'html') { node.innerHTML = attrs[k]; }
        else if (k === 'checked' || k === 'disabled' || k === 'selected' ||
                 k === 'readonly' || k === 'required' || k === 'multiple' ||
                 k === 'autofocus' || k === 'hidden') { node[k] = !!attrs[k]; }
        else if (attrs[k] !== undefined && attrs[k] !== null) node.setAttribute(k, attrs[k]);
      });
    }
    if (children) {
      [].concat(children).forEach(function (c) {
        if (c == null) return;
        node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
      });
    }
    return node;
  }

  function download(filename, content, mime) {
    const blob = (content instanceof Blob)
      ? content
      : new Blob([content], { type: mime || 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 500);
  }

  return {
    escapeHtml, toMyanmarDigits, toWesternDigits, digits, t,
    formatDurationHours,
    el, download
  };
})();