window.MT = window.MT || {};

/* MT.Tour — lightweight, zero-dependency onboarding overlay.
   Highlights UI elements with a dimmed "hole", shows a themed tooltip in the
   active language, and records first-time-visit completion in localStorage. */
MT.Tour = (function () {
  var CENTER_CLASS = 'tour-center';
  var root = null;
  var highlight = null;
  var tooltip = null;
  var current = -1;
  var running = false;
  var repaintTimer = null;

  function t(key, vars) { return MT.Utils.t(key, vars); }

  var STEPS = [
    { target: '#paperPreview .paper-preview', placement: 'bottom', titleKey: 'tour.welcomeTitle', bodyKey: 'tour.welcomeBody' },
    { target: '#btnNewExam', placement: 'bottom', titleKey: 'tour.newTitle', bodyKey: 'tour.newBody' },
    { target: '#btnImportJson', placement: 'bottom', titleKey: 'tour.openTitle', bodyKey: 'tour.openBody' },
    { target: '#btnFab', placement: 'left', titleKey: 'tour.fabTitle', bodyKey: 'tour.fabBody' },
    { target: '#pageSizeChips', placement: 'bottom', titleKey: 'tour.sizeTitle', bodyKey: 'tour.sizeBody' },
    { target: '.stepper', placement: 'left', titleKey: 'tour.spacingTitle', bodyKey: 'tour.spacingBody' },
    { target: '#statusStrip', placement: 'bottom', titleKey: 'tour.statusTitle', bodyKey: 'tour.statusBody' },
    { target: '#btnDownload', placement: 'bottom', titleKey: 'tour.exportTitle', bodyKey: 'tour.exportBody' },
    { target: null, placement: 'center', titleKey: 'tour.doneTitle', bodyKey: 'tour.doneBody' }
  ];

  function build() {
    if (root) return;
    root = document.createElement('div');
    root.className = 'tour-root';
    root.id = 'mtTourRoot';

    highlight = document.createElement('div');
    highlight.className = 'tour-highlight';

    tooltip = document.createElement('div');
    tooltip.className = 'tour-tooltip';
    tooltip.setAttribute('role', 'dialog');
    tooltip.setAttribute('aria-label', t('ui.help'));

    root.appendChild(highlight);
    root.appendChild(tooltip);
    document.body.appendChild(root);
  }

  function teardown() {
    if (root && root.parentNode) root.parentNode.removeChild(root);
    root = null;
    highlight = null;
    tooltip = null;
  }

  function getEl(step) {
    return step.target ? document.querySelector(step.target) : null;
  }

  function renderTooltip(step) {
    var html = '';
    html += '<button type="button" class="tour-close" aria-label="' + t('tour.close') + '">✕</button>';
    html += '<div class="tour-step">' + t('tour.stepCount', { current: String(current + 1), total: String(STEPS.length) }) + '</div>';
    html += '<div class="tour-title">' + t(step.titleKey) + '</div>';
    html += '<div class="tour-body">' + t(step.bodyKey) + '</div>';
    html += '<div class="tour-actions">';
    html += '<button type="button" class="btn ghost" id="tourSkipBtn">' + t('tour.skip') + '</button>';
    html += '<button type="button" class="btn" id="tourNextBtn">' + (current >= STEPS.length - 1 ? t('tour.done') : t('tour.next')) + '</button>';
    html += '</div>';
    tooltip.innerHTML = html;

    var close = tooltip.querySelector('.tour-close');
    var skip = tooltip.querySelector('#tourSkipBtn');
    var next = tooltip.querySelector('#tourNextBtn');
    if (close) close.addEventListener('click', function (e) { e.stopPropagation(); stop(); });
    if (skip) skip.addEventListener('click', function (e) { e.stopPropagation(); stop(); });
    if (next) next.addEventListener('click', function (e) {
      e.stopPropagation();
      if (current >= STEPS.length - 1) stop(); else go(current + 1);
    });
  }

  function place(step) {
    var el = getEl(step);
    var rect = el ? el.getBoundingClientRect() : null;
    var hasTarget = rect && rect.width > 0 && rect.height > 0;

    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var tw = tooltip.offsetWidth || 320;
    var th = tooltip.offsetHeight || 170;
    var margin = 12;
    var top, left;
    var centered = !hasTarget;

    if (hasTarget) {
      root.classList.remove(CENTER_CLASS);
      highlight.style.display = 'block';

      // Clamp the highlight to the visible viewport so a target that is taller
      // than the screen (e.g. the paper preview) never renders an off-screen
      // or oversized highlight box.
      var visLeft = Math.max(rect.left, 0);
      var visTop = Math.max(rect.top, 0);
      var visRight = Math.min(rect.right, vw);
      var visBottom = Math.min(rect.bottom, vh);
      var visW = Math.max(0, visRight - visLeft);
      var visH = Math.max(0, visBottom - visTop);

      highlight.style.left = visLeft + 'px';
      highlight.style.top = visTop + 'px';
      highlight.style.width = visW + 'px';
      highlight.style.height = visH + 'px';

      var p = step.placement;
      var spaceBottom = vh - visBottom;
      var spaceTop = visTop;
      var spaceRight = vw - visRight;
      var spaceLeft = visLeft;

      if (p === 'bottom' && spaceBottom < th + margin && spaceTop > th + margin) p = 'top';
      else if (p === 'top' && spaceTop < th + margin && spaceBottom > th + margin) p = 'bottom';
      if (p === 'left' && spaceLeft < tw + margin && spaceRight > tw + margin) p = 'right';
      else if (p === 'right' && spaceRight < tw + margin && spaceLeft > tw + margin) p = 'left';

      switch (p) {
        case 'top':
          top = visTop - th - margin;
          left = visLeft + visW / 2 - tw / 2;
          break;
        case 'bottom':
          top = visBottom + margin;
          left = visLeft + visW / 2 - tw / 2;
          break;
        case 'left':
          top = visTop + visH / 2 - th / 2;
          left = visLeft - tw - margin;
          break;
        default: // right
          top = visTop + visH / 2 - th / 2;
          left = visRight + margin;
      }
      left = Math.max(margin, Math.min(vw - tw - margin, left));
      top = Math.max(margin, Math.min(vh - th - margin, top));

      // Never let the tooltip cover the highlighted element. If the preferred
      // side overlaps, re-place it above or below (whichever has room).
      var overlaps = !(left + tw <= visLeft || left >= visRight || top + th <= visTop || top >= visBottom);
      if (overlaps) {
        var above = visTop - th - margin;
        var below = visBottom + margin;
        var fitsAbove = above >= margin;
        var fitsBelow = below + th <= vh - margin;
        var hCenter = Math.max(margin, Math.min(vw - tw - margin, visLeft + visW / 2 - tw / 2));
        if (fitsAbove && fitsBelow) {
          // Both fit — prefer the original side, otherwise place it below.
          top = (p === 'top') ? above : below;
        } else if (fitsBelow) {
          top = below;
        } else if (fitsAbove) {
          top = above;
        } else {
          // Neither side has room: use the side with more space. The CSS
          // max-height keeps the tooltip inside the viewport.
          top = (spaceTop >= spaceBottom)
            ? Math.max(margin, above)
            : Math.min(vh - th - margin, below);
        }
        left = hCenter;
      }
    }

    if (centered) {
      top = Math.round((vh - th) / 2);
      left = Math.round((vw - tw) / 2);
      root.classList.add(CENTER_CLASS);
      highlight.style.display = 'none';
    }

    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
  }

  function go(index) {
    current = index;
    var step = STEPS[index];
    if (!step) { stop(); return; }

    // Skip steps whose target is missing or hidden (unless it's a center
    // step), so a broken selector never shows a confusing "done"-style card.
    if (step.target) {
      var el = getEl(step);
      var r = el ? el.getBoundingClientRect() : null;
      if (!el || !r || r.width <= 0 || r.height <= 0) {
        if (current >= STEPS.length - 1) { stop(); return; }
        go(current + 1);
        return;
      }
      // Auto-scroll so the highlighted element is fully visible and the
      // tooltip has room next to it.
      var vh = window.innerHeight;
      if (r.top < 10 || r.top > vh - 100 || r.bottom > vh - 10) {
        try {
          el.scrollIntoView({ block: 'center', behavior: 'auto', inline: 'nearest' });
        } catch (e) {
          el.scrollIntoView();
        }
      }
    }

    renderTooltip(step);
    place(step);
  }

  function start() {
    if (running) return;
    running = true;
    build();
    // First step: show the light directly at the target (no slide from origin).
    highlight.style.transition = 'none';
    go(0);
    void highlight.offsetWidth;
    highlight.style.transition = '';
    window.addEventListener('resize', onRepaint);
    window.addEventListener('scroll', onRepaint, true);
    document.addEventListener('keydown', onKey);
    // Mark as seen as soon as it auto-starts, so a killed tab mid-tour never
    // re-nags a returning user.
    markSeen();
  }

  function stop() {
    if (!running) return;
    running = false;
    window.removeEventListener('resize', onRepaint);
    window.removeEventListener('scroll', onRepaint, true);
    document.removeEventListener('keydown', onKey);
    teardown();
    markSeen();
  }

  function isActive() {
    return running;
  }

  function markSeen() {
    try {
      localStorage.setItem(MT.Constants.STORAGE_KEYS.tourSeen, '1');
    } catch (e) { /* ignore */ }
  }

  function onKey(e) {
    if (e.key === 'Escape') {
      stop();
    } else if (e.key === 'ArrowRight') {
      if (current >= STEPS.length - 1) stop(); else go(current + 1);
    } else if (e.key === 'ArrowLeft' && current > 0) {
      go(current - 1);
    }
  }

  function onRepaint() {
    if (!running) return;
    if (repaintTimer) clearTimeout(repaintTimer);
    repaintTimer = setTimeout(function () {
      repaintTimer = null;
      if (running) place(STEPS[current]);
    }, 80);
  }

  return { start: start, stop: stop, isActive: isActive };
})();
