window.MT = window.MT || {};

MT.MathRenderer = (function () {
  function renderInline(latex) {
    if (typeof katex === 'undefined') return latex;
    try {
      return katex.renderToString(latex, { throwOnError: false, displayMode: false });
    } catch (e) {
      return '<span class="mt-error">' + latex + '</span>';
    }
  }

  function renderBlock(latex) {
    if (typeof katex === 'undefined') return latex;
    try {
      return katex.renderToString(latex, { throwOnError: false, displayMode: true });
    } catch (e) {
      return '<div class="mt-error">' + latex + '</div>';
    }
  }

  function renderAllInElement(el) {
    if (typeof renderMathInElement !== 'undefined') {
      try {
        renderMathInElement(el, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '\\[', right: '\\]', display: true },
            { left: '$', right: '$', display: false },
            { left: '\\(', right: '\\)', display: false }
          ]
        });
      } catch (e) { /* ignore */ }
    }
  }

  // Render question text that may contain math delimiters into HTML.
  // Plain segments are HTML-escaped; $...$ / \(...\) / $$...$$ / \[...\] are
  // rendered with KaTeX at build time (no dependency on auto-render).
  function renderTextWithMath(text) {
    var str = String(text || '');
    if (!str) return '';
    var re = /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\$([^$\n]+?)\$|\\\(([\s\S]+?)\\\)/g;
    var out = '';
    var last = 0;
    var m;
    function esc(seg) {
      return MT.Utils.escapeHtml(seg).replace(/\r?\n/g, '<br>');
    }
    while ((m = re.exec(str)) !== null) {
      out += esc(str.slice(last, m.index));
      if (m[1] !== undefined) out += renderBlock(m[1]);
      else if (m[2] !== undefined) out += renderBlock(m[2]);
      else if (m[3] !== undefined) out += looksLikeMath(m[3]) ? renderInline(m[3]) : esc(m[3]);
      else if (m[4] !== undefined) out += renderInline(m[4]);
      last = re.lastIndex;
    }
    out += esc(str.slice(last));
    return out;
  }

  // $...$ is ambiguous (currency, etc.). Only treat as math when the content
  // actually looks like LaTeX.
  function looksLikeMath(s) {
    return /\\|\^|_|\{/.test(s);
  }

  return { renderInline, renderBlock, renderAllInElement, renderTextWithMath, looksLikeMath };
})();