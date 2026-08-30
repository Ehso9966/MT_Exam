window.MT = window.MT || {};

MT.Dialogs = (function () {
  function t(key) { return MT.Utils.t(key); }

  function confirm(options) {
    const opts = Object.assign({
      title: t('dialog.confirmTitle'),
      message: '',
      okText: t('dialog.ok'),
      cancelText: t('dialog.cancel'),
      okClass: ''
    }, options || {});

    return new Promise(function (resolve) {
      const body = document.createElement('div');
      const p = document.createElement('p');
      p.textContent = opts.message;
      p.style.margin = '0';
      body.appendChild(p);

      const footer = function (close) {
        const cancel = document.createElement('button');
        cancel.className = 'btn secondary';
        cancel.textContent = opts.cancelText;
        cancel.onclick = function () { close(); resolve(false); };

        const ok = document.createElement('button');
        ok.className = 'btn' + (opts.okClass ? ' ' + opts.okClass : '');
        ok.textContent = opts.okText;
        ok.onclick = function () { close(); resolve(true); };

        const wrap = document.createElement('div');
        wrap.style.cssText = 'display:flex;gap:8px;width:100%;justify-content:flex-end';
        wrap.appendChild(cancel);
        wrap.appendChild(ok);
        return wrap;
      };

      MT.Modal.open({
        title: opts.title,
        content: body,
        footer: footer,
        onClose: function () { resolve(false); }
      });
    });
  }

  return { confirm };
})();