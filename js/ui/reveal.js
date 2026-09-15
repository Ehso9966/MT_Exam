/* MT Exam Studio — reveal.js
   Fade-in "appear" on scroll. Any element with [data-reveal] is hidden
   initially (via html.js-reveal in app.css) and revealed once it enters the
   viewport. Use data-reveal-delay="120" for a stagger effect.
   Self-contained (no dependencies) so the static pages can load it too. */
window.MT = window.MT || {};

MT.Reveal = (function () {
  function init() {
    document.documentElement.classList.add('js-reveal');
    var els = document.querySelectorAll('[data-reveal]');
    if (!els.length) return;

    // No IO support or reduced-motion: show everything immediately.
    if (!('IntersectionObserver' in window)) {
      Array.prototype.forEach.call(els, function (el) { el.classList.add('revealed'); });
      return;
    }
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      Array.prototype.forEach.call(els, function (el) { el.classList.add('revealed'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var delay = parseInt(el.getAttribute('data-reveal-delay') || '0', 10);
        if (delay > 0) el.style.transitionDelay = delay + 'ms';
        el.classList.add('revealed');
        io.unobserve(el);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

    Array.prototype.forEach.call(els, function (el) { io.observe(el); });
  }

  return { init: init };
})();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', MT.Reveal.init);
} else {
  MT.Reveal.init();
}