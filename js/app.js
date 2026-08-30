window.MT = window.MT || {};

MT.App = (function () {

  function t(key, vars) { return MT.Utils.t(key, vars); }
  function digits(n) { return MT.Utils.digits(n); }

  function init() {
    MT.I18n.init();
    MT.I18n.applyDOM();
    document.title = t('appTitle');

    if (MT.Storage.LocalDraft.hasDraft()) {
      const draft = MT.Storage.LocalDraft.load();
      if (draft) {
        MT.State.load(draft);
      } else {
        MT.State.reset();
      }
    } else {
      MT.State.reset();
    }

    // Default subject = မြန်မာ
    if (!MT.State.get().metadata.subject) {
      MT.State.setMetadata({ subject: 'မြန်မာ' });
    }

    bindHeader();
    bindSidebar();
    bindStatusStrip();
    bindFooter();
    bindSeoLang();
    bindAppBack();
    bindModeToggle();
    applyMode();

    MT.State.subscribe(onStateChange);
    MT.PaperUi.init();
    render();
    reveal();
    window.addEventListener('error', function () { reveal(); });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { render(); });
    }
    window.addEventListener('load', function () { render(); });
    if (window.MT_CDN) {
      window.MT_CDN.load().then(function () { render(); });
    }

    // First-visit onboarding tour (auto-shows once, reopenable via ❓ button)
    try {
      if (!document.body.classList.contains('seo-mode') && !localStorage.getItem(MT.Constants.STORAGE_KEYS.tourSeen)) {
        setTimeout(function () {
          if (MT.Tour && !MT.Tour.isActive()) MT.Tour.start();
        }, 900);
      }
    } catch (e) { /* ignore */ }
  }

  function reveal() {
    document.body.classList.add('mt-ready');
  }

  /* ---------- SEO section language toggle ---------- */
  function bindSeoLang() {
    var seoBtn = document.getElementById('btnSeoLang');
    if (!seoBtn) return;
    seoBtn.addEventListener('click', function () {
      MT.I18n.toggle();
      render();
      MT.I18n.applyDOM();
    });
  }

  /* ---------- Landing (SEO) vs App mode toggle ---------- */
  function applyMode() {
    const inApp = window.location.hash === '#app';
    document.body.classList.toggle('seo-mode', !inApp);
  }

  function showApp() {
    document.body.classList.remove('seo-mode');
    try { history.replaceState(null, '', '#app'); } catch (e) {}
    render();
  }

  function showLanding() {
    document.body.classList.add('seo-mode');
    try { history.replaceState(null, '', window.location.pathname + window.location.search); } catch (e) {}
    MT.I18n.applyDOM();
  }

  function bindModeToggle() {
    var cta = document.querySelector('.seo-cta a[href="#app"]');
    if (cta) {
      cta.addEventListener('click', function (e) {
        e.preventDefault();
        showApp();
      });
    }
    var logo = document.querySelector('.logo');
    if (logo) {
      logo.addEventListener('click', function () {
        if (document.body.classList.contains('seo-mode')) return;
        showLanding();
      });
    }
  }

  /* ---------- Hardware back key (Android WebView) ---------- */
  function bindAppBack() {
    if (!window.history || !window.history.pushState) return;
    var guard = { app: true };
    function reGuard() {
      try { history.pushState(guard, ''); } catch (e) {}
    }
    reGuard();
    window.addEventListener('popstate', function () {
      if (MT.Modal && MT.Modal.isOpen && MT.Modal.isOpen()) {
        MT.Modal.handleBack();
        reGuard();
        return;
      }
      // On the preview (no modal) → confirm exit.
      MT.Dialogs.confirm({
        title: t('ui.exitApp'),
        message: t('ui.exitAppMsg'),
        okText: t('ui.exit'),
        cancelText: t('ui.cancel'),
        okClass: 'danger'
      }).then(function (ok) {
        if (ok) {
          if (window.Android && window.Android.exit) { window.Android.exit(); }
          else { try { window.close(); } catch (e) {} }
        } else {
          reGuard();
        }
      });
    });
    window.addEventListener('pageshow', function (e) {
      if (e.persisted) reGuard();
    });
  }

  /* ---------- Status strip → details ---------- */
  function bindStatusStrip() {
    const strip = document.getElementById('statusStrip');
    if (!strip) return;
    strip.setAttribute('role', 'button');
    strip.setAttribute('tabindex', '0');
    strip.setAttribute('aria-label', t('valid.detailsTitle'));
    function open() {
      if (MT.Validation && MT.Validation.Exam && MT.Validation.Exam.openStatusDetails) {
        MT.Validation.Exam.openStatusDetails();
      }
    }
    strip.addEventListener('click', open);
    strip.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
    });
  }

  /* ---------- Header ---------- */
  function bindHeader() {
    const $ = function (id) { return document.getElementById(id); };

    const langBtn = $('btnLangToggle');
    if (langBtn) langBtn.addEventListener('click', function () {
      MT.I18n.toggle();
      render();
      MT.I18n.applyDOM();
    });

    $('btnNewExam').addEventListener('click', function () {
      MT.Dialogs.confirm({
        title: t('dialog.newExamTitle', 'အသစ်ဖန်တီးမည်'),
        message: t('dialog.newExamConfirm'),
        okText: t('ui.new')
      }).then(function (ok) {
        if (ok) {
          MT.State.reset();
          MT.Storage.LocalDraft.clear();
          MT.Toast.success(t('ui.newExamStarted'), {
            action: { label: t('ui.undo', '↩ ပြန်ပြင်မည်'), onClick: function () { MT.State.undo(); } }
          });
        }
      });
    });

    $('btnImportJson').addEventListener('click', function () {
      MT.Storage.ImportJson.importFile().then(function (exam) {
        MT.State.load(exam);
        MT.Storage.LocalDraft.save(exam);
        var sections = (exam.sections || []).length;
        var questions = (exam.sections || []).reduce(function (sum, s) {
          return sum + ((s.questions || []).length);
        }, 0);
        MT.Toast.success(t('ui.fileOpened') + ' — ' + t('ui.importSummary', { sections: digits(sections), questions: digits(questions) }));
      }).catch(function (err) {
        MT.Toast.error(err.message || t('error.importFail'));
      });
    });

    $('btnDownload').addEventListener('click', function () {
      if (MT.PaperUi && MT.PaperUi.openDownloadMenu) MT.PaperUi.openDownloadMenu();
    });

    const btnHelp = document.getElementById('btnHelp');
    if (btnHelp) btnHelp.addEventListener('click', function () {
      if (MT.Tour) MT.Tour.start();
    });
  }

  /* ---------- Footer ---------- */
  function bindFooter() {
    const year = document.getElementById('footerYear');
    if (year) year.textContent = String(new Date().getFullYear());

    const supportBtn = document.getElementById('footerSupportBtn');
    if (supportBtn) supportBtn.addEventListener('click', openSupportModal);

    const feedback = document.getElementById('footerFeedback');
    if (feedback) {
      const tgImg = document.createElement('img');
      tgImg.src = 'assets/icons/Tg_icon.png';
      tgImg.alt = 'Telegram';
      tgImg.style.cssText = 'width:16px;height:16px;vertical-align:middle;margin-right:3px';
      feedback.appendChild(document.createTextNode(t('footer.feedback') + ' ('));
      feedback.appendChild(tgImg);
      feedback.appendChild(document.createTextNode('https://t.me/Mt_Exam) ' + t('footer.feedbackAfter')));
    }
  }

  function openSupportModal() {
    if (!MT.Modal) return;

    // ---- Account card (bold, prominent) ----
    const account = document.createElement('div');
    account.className = 'support-account';

    const nameRow = document.createElement('div');
    nameRow.className = 'support-row';
    const nameLabel = document.createElement('span');
    nameLabel.className = 'support-label';
    nameLabel.textContent = t('support.nameLabel') + ':';
    const nameVal = document.createElement('span');
    nameVal.className = 'support-name';
    nameVal.textContent = t('support.name');
    const nameConfirm = document.createElement('span');
    nameConfirm.className = 'support-name-confirm';
    nameConfirm.textContent = t('support.nameConfirm');
    nameRow.appendChild(nameLabel);
    nameRow.appendChild(nameVal);
    nameRow.appendChild(nameConfirm);

    const numRow = document.createElement('div');
    numRow.className = 'support-row';
    const numLabel = document.createElement('span');
    numLabel.className = 'support-label';
    numLabel.textContent = t('support.numberLabel') + ':';
    const numBox = document.createElement('div');
    numBox.className = 'support-number-box';
    const numVal = document.createElement('span');
    numVal.className = 'support-number';
    numVal.textContent = t('support.number');
    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'support-copy-btn';
    copyBtn.textContent = '📋 ' + t('support.copy');
    copyBtn.addEventListener('click', function () {
      const num = t('support.number');
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(num).then(function () {
          MT.Toast.success(t('support.copied'));
        }).catch(function () { fallbackCopy(num); });
      } else {
        fallbackCopy(num);
      }
    });
    numBox.appendChild(numVal);
    numBox.appendChild(copyBtn);
    numRow.appendChild(numLabel);
    numRow.appendChild(numBox);

    account.appendChild(nameRow);
    account.appendChild(numRow);

    // ---- QR display area ----
    const qrWrap = document.createElement('div');
    qrWrap.className = 'support-qr';
    const qr = document.createElement('img');
    qr.id = 'supportQr';
    qr.alt = 'QR';
    qr.src = 'assets/QR receive/kpay_qr.png';
    qrWrap.appendChild(qr);

    const body = document.createElement('div');
    body.className = 'support-body';
    body.appendChild(account);
    body.appendChild(qrWrap);

    // ---- Donation note ----
    const note = document.createElement('p');
    note.className = 'support-note';
    const noteHighlight = document.createElement('span');
    noteHighlight.className = 'support-note-highlight';
    noteHighlight.textContent = t('support.note');
    note.appendChild(noteHighlight);
    body.appendChild(note);

    // ---- Footer toggle buttons (KPay / WavePay) ----
    function makeToggle(icon, label, qrSrc) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'support-toggle';
      const img = document.createElement('img');
      img.src = icon;
      img.alt = label;
      const span = document.createElement('span');
      span.textContent = label;
      btn.appendChild(img);
      btn.appendChild(span);
      btn.addEventListener('click', function () {
        const toggles = btn.parentNode;
        toggles.querySelectorAll('.support-toggle').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        qr.src = qrSrc;
      });
      return btn;
    }

    const toggles = document.createElement('div');
    toggles.className = 'support-toggles';
    const kpayBtn = makeToggle('assets/icons/Kpay_icon.png', t('support.kpay'), 'assets/QR receive/kpay_qr.png');
    kpayBtn.classList.add('active');
    const waveBtn = makeToggle('assets/icons/wavepay_icon.jpeg', t('support.wavepay'), 'assets/QR receive/wavepay_qr.jpg');
    toggles.appendChild(kpayBtn);
    toggles.appendChild(waveBtn);

    MT.Modal.open({
      title: t('support.title'),
      content: body,
      footer: function () { return toggles; },
      size: 'modal-lg',
      tone: 'primary',
      help: 'help.support'
    });
  }

  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      MT.Toast.success(t('support.copied'));
    } catch (e) {
      MT.Toast.error(t('support.copy'));
    }
    document.body.removeChild(ta);
  }

  /* ---------- Section-list sidebar ---------- */
  function bindSidebar() {
    const btn = document.getElementById('btnAddSection');
    if (btn) {
      btn.addEventListener('click', function () {
        if (MT.PaperUi && MT.PaperUi.openAddSectionModal) MT.PaperUi.openAddSectionModal();
      });
    }
  }

  /* ---------- API settings modal ---------- */
  function openApiSettings() {
    const body = MT.Utils.el('div', { class: 'ai-settings' });

    const intro = MT.Utils.el('p', { class: 'ai-settings-intro' }, t('ui.aiModeTitle'));
    body.appendChild(intro);

    // ---- Mode selector (MT AI vs BYOK) ----
    const modeWrap = MT.Utils.el('div', { class: 'add-question-popup' });

    const mtaiCard = MT.Utils.el('button', { type: 'button', class: 'add-question-option' });
    mtaiCard.innerHTML = '<span class="aq-icon">🤖</span>' +
      '<span class="aq-text"><b>' + t('ui.aiModeMtai') + '</b><span class="aq-desc">' + t('ui.aiModeMtaiDesc') + '</span></span>';
    const byokCard = MT.Utils.el('button', { type: 'button', class: 'add-question-option' });
    byokCard.innerHTML = '<span class="aq-icon">🔑</span>' +
      '<span class="aq-text"><b>' + t('ui.aiModeByok') + '</b><span class="aq-desc">' + t('ui.aiModeByokDesc') + '</span></span>';
    modeWrap.appendChild(mtaiCard);
    modeWrap.appendChild(byokCard);
    body.appendChild(modeWrap);

    let mode = MT.BaiClient.getMode();

    // ---- BYOK key field (hidden in MT AI mode) ----
    const keyField = MT.Utils.el('div', { class: 'field' });
    keyField.appendChild(MT.Utils.el('label', {}, t('ui.apiKey') + ' (BYOK)'));
    const keyWrap = MT.Utils.el('div', { class: 'ai-key-wrap' });
    const keyInput = MT.Utils.el('input', {
      type: 'password',
      class: 'input',
      value: MT.BaiClient.getCustomKey ? MT.BaiClient.getCustomKey() : '',
      placeholder: 'sk-...',
      autocomplete: 'off'
    });
    const keyToggle = MT.Utils.el('button', { type: 'button', class: 'ai-key-toggle', title: t('ui.showHide') }, '👁');
    keyToggle.addEventListener('click', function () {
      const show = keyInput.type === 'password';
      keyInput.type = show ? 'text' : 'password';
      keyToggle.textContent = show ? '🙈' : '👁';
    });
    keyWrap.appendChild(keyInput);
    keyWrap.appendChild(keyToggle);
    keyField.appendChild(keyWrap);
    keyField.appendChild(MT.Utils.el('div', { class: 'hint' }, t('ui.apiKeyWarning')));
    body.appendChild(keyField);

    // ---- Model field (hidden in MT AI mode) ----
    const modelField = MT.Utils.el('div', { class: 'field' });
    modelField.appendChild(MT.Utils.el('label', {}, t('ui.model')));
    const modelInput = MT.Utils.el('input', {
      type: 'text',
      class: 'input',
      value: MT.BaiClient.getModel() || '',
      placeholder: 'deepseek-v4-flash-vision-exp'
    });
    modelField.appendChild(modelInput);
    modelField.appendChild(MT.Utils.el('div', { class: 'hint' }, t('ui.visionModelHint')));
    body.appendChild(modelField);

    // ---- MT AI note (shown only in MT AI mode) ----
    const mtaiNote = MT.Utils.el('div', { class: 'hint' }, '🤖 ' + t('ui.mtaiNote'));
    body.appendChild(mtaiNote);

    // ---- Status area ----
    const statusDiv = MT.Utils.el('div', { id: 'apiStatus', class: 'ai-settings-status' });
    body.appendChild(statusDiv);

    // ---- Active / visible state -----
    function refreshMode() {
      const isMtai = mode === 'mtai';
      mtaiCard.classList.toggle('active', isMtai);
      byokCard.classList.toggle('active', !isMtai);
      keyField.style.display = isMtai ? 'none' : '';
      modelField.style.display = isMtai ? 'none' : '';
      mtaiNote.style.display = isMtai ? '' : 'none';
      if (!isMtai && !modelInput.value) modelInput.value = MT.BaiClient.getModel() || '';
    }
    refreshMode();

    mtaiCard.addEventListener('click', function () { mode = 'mtai'; refreshMode(); });
    byokCard.addEventListener('click', function () { mode = 'custom'; refreshMode(); });

    // ---- Test / Discover ----
    let modelList = [];
    function runTest() {
      const isMtai = mode === 'mtai';
      const key = isMtai ? MT.BaiClient.getApiKey() : keyInput.value.trim();
      if (!key) { statusDiv.innerHTML = '<span class="badge err">' + t('error.noKey') + '</span>'; return; }
      statusDiv.innerHTML = '<span class="spinner"></span> ' + t('ui.settingLoading');
      MT.BaiClient.testConnection(key, MT.BaiClient.DEFAULT_BASE_URL)
        .then(function (data) {
          modelList = (data.data || data.models || []).map(function (m) {
            return typeof m === 'string' ? { id: m } : { id: m.id };
          });
          if (MT.ModelDiscovery && MT.ModelDiscovery.setModels) {
            MT.ModelDiscovery.setModels(modelList);
          }
          statusDiv.innerHTML = '<span class="badge ok">' + t('ui.connectionSuccess') + '</span>' +
            '<div class="mt-mt"><label class="mt-small">' + t('ui.visionModels') + '</label>' +
            '<select class="select" id="apiModelSelect">' +
            modelList.filter(function (m) { return /vision|ocr|vl|image/i.test(m.id); })
              .map(function (m) { return '<option>' + m.id + '</option>'; }).join('') +
            '</select></div>';
          const sel = document.getElementById('apiModelSelect');
          if (sel) {
            sel.onchange = function () {
              if (mode === 'custom') modelInput.value = sel.value;
            };
          }
        })
        .catch(function (err) {
          statusDiv.innerHTML = '<span class="badge err">' + MT.AIErrors.friendlyMessage(err) + '</span>';
        });
    }
    const testBtn = MT.Utils.el('button', { type: 'button', class: 'btn secondary sm' }, '🔌 ' + t('ui.testConnection'));
    testBtn.onclick = runTest;
    const discoverBtn = MT.Utils.el('button', { type: 'button', class: 'btn ghost sm' }, t('ui.modelList'));
    discoverBtn.onclick = runTest;
    const btnRow = MT.Utils.el('div', { class: 'ai-settings-actions' });
    btnRow.appendChild(testBtn);
    btnRow.appendChild(discoverBtn);
    body.appendChild(btnRow);

    const footer = function (close) {
      const wrap = MT.Utils.el('div', { style: { display: 'flex', justifyContent: 'flex-end', width: '100%' } });
      const saveBtn = MT.Utils.el('button', { type: 'button', class: 'btn' }, '💾 ' + t('ui.save'));
      saveBtn.onclick = function () {
        MT.BaiClient.setMode(mode);
        if (mode === 'custom') {
          MT.BaiClient.setApiKey(keyInput.value.trim());
          MT.BaiClient.setModel(modelInput.value.trim());
        }
        MT.Toast.success(t('ui.aiSettingsSaved'));
        close();
      };
      wrap.appendChild(saveBtn);
      return wrap;
    };

    MT.Modal.open({
      title: '🔑 ' + t('ui.aiSettings'),
      content: body,
      sheet: true,
      footer: footer,
      help: 'help.aiSettings',
      onBack: function () {
        if (MT.PaperUi && MT.PaperUi.openFabMenu) MT.PaperUi.openFabMenu();
      }
    });
  }

  /* ---------- Preview / render ---------- */
  function applyFont(font) {
    const map = {
      'padauk': "'Padauk', sans-serif",
      'pyidaungsu': "'Pyidaungsu', sans-serif",
      'myanmar': "'Myanmar Text', sans-serif",
      'serif': "Georgia, 'Times New Roman', serif"
    };
    const family = map[font] || map.padauk;
    const preview = document.getElementById('paperPreview');
    if (!preview) return;
    preview.querySelectorAll('.paper-preview').forEach(function (page) {
      page.style.fontFamily = family;
    });
  }

  function onStateChange(exam) {
    render();
  }

  function render() {
    try {
      const exam = MT.State.get();
      const settings = exam.settings;

      // page-spacing stepper
      const psFill = document.getElementById('pageSpacingFill');
      const psTrack = document.getElementById('pageSpacingValue');
      if (psFill) {
        const limits = MT.Constants.PADDING_LIMITS || { min: 20, max: 80, default: 57, unit: 'px' };
        const pad = settings.pagePadding != null ? settings.pagePadding : limits.default;
        const pct = Math.round(((pad - limits.min) / (limits.max - limits.min)) * 100);
        psFill.style.width = Math.min(100, Math.max(0, pct)) + '%';
        if (psTrack) psTrack.title = pad + (limits.unit || 'px');
      }

      MT.SectionManager.renderSectionList(document.getElementById('sectionList'));
      applyPaperScale(settings);
      applyQuestionFontSize(settings);
      applyPageSpacing(settings);
      MT.ExamRenderer.renderExam(exam);
      MT.Validation.Exam.updateStatusStrip(exam);
      MT.PaperUi.refreshPageSizeBar();
      applyFont(settings.font);

      // Live count / marks badges (localized)
      var bq = document.getElementById('badgeQuestionCount');
      if (bq) bq.textContent = MT.I18n.t('ui.sectionCount') + ' ' + digits(MT.ExamModel.questionCount(exam));
      var bm = document.getElementById('badgeTotalMarks');
      if (bm) bm.textContent = MT.I18n.t('section.marks') + ' ' + digits(MT.ExamModel.examTotalMarks(exam));
    } catch (e) {
      console.error('[render]', e);
    }
  }

  function applyPaperScale(settings) {
    const preview = document.getElementById('paperPreview');
    if (!preview) return;
    const ps = MT.Constants.PAGE_SIZES[settings.pageSize] || MT.Constants.PAGE_SIZES.A4;
    preview.style.setProperty('--paper-scale', (ps.w / 210).toString());
  }

  function applyQuestionFontSize(settings) {
    const preview = document.getElementById('paperPreview');
    if (!preview) return;
    const pt = settings.questionFontSize != null ? settings.questionFontSize : 6;
    preview.style.setProperty('--qfont-size', pt + 'pt');
  }

  // Applies the compact-spacing factor (from the "Reduce Padding" slider) to
  // the container so even un-paginated / empty states honor it.
  function applyPageSpacing(settings) {
    const preview = document.getElementById('paperPreview');
    if (!preview) return;
    try {
      const geo = MT.ExamRenderer.getPrintGeometry(settings.pageSize || 'A4', settings);
      preview.style.setProperty('--mt-spacing', geo.spacing.toString());
    } catch (e) {
      preview.style.setProperty('--mt-spacing', '1');
    }
  }

  let previewRenderTimer = null;
  function renderPreview() {
    try {
      MT.ExamRenderer.renderExam(MT.State.get());
    } catch (e) {
      console.error('[renderPreview]', e);
    }
  }

  function schedulePreviewRender() {
    if (previewRenderTimer) clearTimeout(previewRenderTimer);
    previewRenderTimer = setTimeout(function () {
      previewRenderTimer = null;
      renderPreview();
    }, 120);
  }

  return { init: init, render: render, openApiSettings: openApiSettings, renderPreview: renderPreview, schedulePreviewRender: schedulePreviewRender };
})();

document.addEventListener('DOMContentLoaded', function () {
  MT.App.init();
});