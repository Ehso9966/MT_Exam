window.MT = window.MT || {};

MT.Toast = (function () {
  const root = document.getElementById('toastRoot') || (function () {
    const el = document.createElement('div');
    el.className = 'toast-container';
    document.body.appendChild(el);
    return el;
  })();

  function t(key, fallback) { return MT.Utils.t(key, null, fallback); }

  const DEFAULTS = {
    type: 'info',
    duration: 2000,
    closable: true
  };

  function show(message, options) {
    const opts = Object.assign({}, DEFAULTS, options || {});
    const toast = document.createElement('div');
    toast.className = 'toast ' + opts.type;
    toast.setAttribute('role', 'status');

    const text = document.createElement('span');
    text.textContent = message;
    text.style.flex = '1';
    toast.appendChild(text);

    if (opts.closable) {
      const closeBtn = document.createElement('button');
      closeBtn.className = 'toast-close';
      closeBtn.textContent = '✕';
      closeBtn.setAttribute('aria-label', t('ui.close', 'Close'));
      closeBtn.onclick = function () { dismiss(toast); };
      toast.appendChild(closeBtn);
    }

    if (opts.action) {
      const actionBtn = document.createElement('button');
      actionBtn.className = 'toast-action';
      actionBtn.textContent = opts.action.label;
      actionBtn.onclick = function () {
        if (opts.action.onClick) opts.action.onClick();
        dismiss(toast);
      };
      toast.appendChild(actionBtn);
    }

    root.appendChild(toast);

    if (opts.duration > 0) {
      setTimeout(function () { dismiss(toast); }, opts.duration);
    }

    return toast;
  }

  function dismiss(toast) {
    if (toast.parentNode) toast.parentNode.removeChild(toast);
  }

  function success(message, opts) { return show(message, Object.assign({ type: 'success' }, opts || {})); }
  function warning(message, opts) { return show(message, Object.assign({ type: 'warning' }, opts || {})); }
  function error(message, opts) { return show(message, Object.assign({ type: 'error', duration: 6000 }, opts || {})); }
  function info(message, opts) { return show(message, opts); }

  // "Deleted" toast with an undo action — used by every delete flow.
  function successDeleted() {
    success(t('ui.deleted', 'ဖျက်ပြီး'), {
      action: { label: t('ui.undo', '↩ ပြန်ပြင်မည်'), onClick: function () { MT.State.undo(); } }
    });
  }

  return { success, warning, error, info, successDeleted };
})();