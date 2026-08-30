window.MT = window.MT || {};

MT.Modal = (function () {
  const root = document.getElementById('modalRoot') || (function () {
    const el = document.createElement('div');
    el.id = 'modalRoot';
    document.body.appendChild(el);
    return el;
  })();

  let current = null;
  let currentOpts = null;

  function open(options) {
    const opts = Object.assign({
      title: '',
      content: '',
      footer: null,
      onClose: null,
      onBack: null,
      size: '',
      tone: '',
      boxClass: '',
      help: null
    }, options || {});

    close();

    // Stop the onboarding tour if a modal opens so the tooltip isn't hidden
    // behind it.
    if (MT.Tour && MT.Tour.isActive && MT.Tour.isActive()) MT.Tour.stop();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.onclick = function (e) { if (e.target === overlay) close(opts.onClose); };

    const box = document.createElement('div');
    box.className = 'modal-box' + (opts.size ? ' ' + opts.size : '') + (opts.sheet ? ' sheet' : '') + (opts.tone ? ' tone-' + opts.tone : '') + (opts.boxClass ? ' ' + opts.boxClass : '');

    if (opts.sheet) {
      const handle = document.createElement('div');
      handle.className = 'sheet-handle';
      handle.setAttribute('aria-hidden', 'true');
      box.appendChild(handle);
    }

    const header = document.createElement('div');
    header.className = 'modal-header';
    const title = document.createElement('h2');
    title.textContent = opts.title;
    header.appendChild(title);
    if (opts.help) {
      const helpBtn = document.createElement('button');
      helpBtn.className = 'modal-help';
      helpBtn.textContent = '❓';
      helpBtn.setAttribute('aria-label', MT.Utils.t('ui.help', null, 'Help'));
      helpBtn.onclick = function () {
        const panel = body.querySelector('.modal-help-panel');
        if (panel) panel.style.display = panel.style.display === 'none' ? '' : 'none';
      };
      header.appendChild(helpBtn);
    }
    if (opts.onBack) {
      header.classList.add('has-back');
      const backBtn = document.createElement('button');
      backBtn.className = 'modal-back';
      backBtn.textContent = '‹';
      backBtn.setAttribute('aria-label', MT.Utils.t('ui.back', null, 'Back'));
      backBtn.onclick = function () { opts.onBack(); };
      header.appendChild(backBtn);
    } else {
      const closeBtn = document.createElement('button');
      closeBtn.className = 'modal-close';
      closeBtn.textContent = '✕';
      closeBtn.setAttribute('aria-label', MT.Utils.t('ui.close', null, 'Close'));
      closeBtn.onclick = function () { close(opts.onClose); };
      header.appendChild(closeBtn);
    }

    const body = document.createElement('div');
    body.className = 'modal-body';
    if (typeof opts.content === 'string') body.innerHTML = opts.content;
    else if (opts.content instanceof Node) body.appendChild(opts.content);
    else if (opts.content) body.innerHTML = String(opts.content);

    if (opts.help) {
      const panel = document.createElement('div');
      panel.className = 'modal-help-panel';
      panel.style.display = 'none';
      panel.textContent = MT.Utils.t(opts.help, null, String(opts.help));
      body.insertBefore(panel, body.firstChild);
    }

    box.appendChild(header);
    box.appendChild(body);

    if (opts.footer) {
      const footer = document.createElement('div');
      footer.className = 'modal-footer';
      if (typeof opts.footer === 'function') {
        footer.appendChild(opts.footer(close));
      } else if (opts.footer instanceof Node) {
        footer.appendChild(opts.footer);
      } else if (typeof opts.footer === 'string') {
        footer.innerHTML = opts.footer;
      }
      box.appendChild(footer);
    }

    overlay.appendChild(box);
    root.appendChild(overlay);
    current = overlay;
    currentOpts = opts;

    requestAnimationFrame(function () { overlay.classList.add('open'); });
    return overlay;
  }

  function close(onDone) {
    const overlay = current;
    if (overlay) {
      overlay.classList.remove('open');
      if (onDone) onDone();
      setTimeout(function () {
        if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
        if (current === overlay) {
          current = null;
          currentOpts = null;
        }
      }, 200);
    } else if (onDone) {
      onDone();
    }
  }

  // Hardware back key: go to the previous popup if the modal has onBack,
  // otherwise close it. Returns true when a modal was handled.
  function handleBack() {
    if (!current || !currentOpts) return false;
    if (currentOpts.onBack) {
      currentOpts.onBack();
      return true;
    }
    close(currentOpts.onClose);
    return true;
  }

  function isOpen() { return current !== null; }

  return { open, close, isOpen, handleBack };
})();