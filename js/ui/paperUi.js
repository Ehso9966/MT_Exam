window.MT = window.MT || {};

MT.PaperUi = (function () {
  function t(key, vars) { return MT.Utils.t(key, vars); }
  function digits(n) { return MT.Utils.digits(n); }

  function init() {
    const preview = document.getElementById('paperPreview');
    if (preview) preview.addEventListener('click', handlePaperClick);
    bindPageSizeBar();
    bindPageSpacing();
    const fab = document.getElementById('btnFab');
    if (fab) fab.addEventListener('click', openFabMenu);
  }

  function handlePaperClick(e) {
    const emptyAction = e.target.closest('[data-empty-action]');
    if (emptyAction) {
      const action = emptyAction.getAttribute('data-empty-action');
      if (action === 'scan') {
        const sections = MT.State.get().sections;
        if (!sections || sections.length === 0) {
          // One-tap start: create the first section, then scan straight into it.
          openAddSectionModal(function (section) {
            onFabOcr(section ? section.id : null);
          });
        } else {
          onFabOcr();
        }
      } else if (action === 'add') {
        openAddSectionModal();
      }
      return;
    }

    const addSlot = e.target.closest('[data-add-section]');
    if (addSlot) { openAddSectionModal(); return; }

    const titleEl = e.target.closest('[data-section-title]');
    if (titleEl) {
      const sid = titleEl.getAttribute('data-section-title');
      if (sid) {
        if (MT.ExamSectionsPopup && MT.ExamSectionsPopup.open) MT.ExamSectionsPopup.open(sid);
        else if (MT.SectionPopup && MT.SectionPopup.open) MT.SectionPopup.open(sid);
      }
      return;
    }

    const editEl = e.target.closest('[data-edit]');
    if (editEl) { startInlineEdit(editEl); return; }

    const qDiv = e.target.closest('.preview-question');
    if (qDiv) {
      const qid = qDiv.getAttribute('data-qid');
      const sectionId = qDiv.getAttribute('data-section-id');
      if (qid && sectionId) {
        if (MT.ExamSectionsPopup && MT.ExamSectionsPopup.open) MT.ExamSectionsPopup.open(sectionId, qid);
        else if (MT.QuestionPopupEditor && MT.QuestionPopupEditor.openQuestionEditor) MT.QuestionPopupEditor.openQuestionEditor(sectionId, qid);
      }
    }
  }

  /* ---------- Inline edit of header fields ---------- */
  function startInlineEdit(el) {
    if (el.querySelector('input')) return;
    const attr = el.getAttribute('data-edit');
    const meta = MT.State.getMetadata();
    let current = (meta[attr] != null ? meta[attr] : '').toString();
    // Duration is stored in minutes; show the value in the active unit.
    if (attr === 'duration' && meta.durationUnit === 'hour') {
      current = MT.Utils.formatDurationHours(meta.duration);
    }
    // Subjects are stored in Burmese but displayed translated; show the same
    // text the paper shows when editing inline.
    if (attr === 'subject') {
      const lang = MT.PaperLocale.getLanguage(meta.subject || '');
      if (lang === 'en') current = MT.PaperLocale.translateSubject(current);
    }
    const input = document.createElement('input');
    input.className = 'inline-edit-input';
    input.value = current;
    if (attr === 'duration' || attr === 'totalMarks') input.type = 'number';
    input.placeholder = t('ui.typeHere', 'ရိုက်ပါ…');
    if (attr === 'grade') { input.style.textAlign = 'left'; input.style.fontWeight = '600'; input.style.fontSize = '.78rem'; }
    if (attr === 'duration') { input.style.textAlign = 'right'; input.style.fontWeight = '600'; input.style.fontSize = '.78rem'; }
    if (attr === 'school') { input.style.textAlign = 'center'; input.style.fontWeight = '700'; input.style.fontSize = '.92rem'; }
    if (attr === 'title') { input.style.textAlign = 'center'; input.style.fontWeight = '700'; input.style.fontSize = '1rem'; }
    el.replaceWith(input);
    input.focus();
    input.select();

    let done = false;
    function commit() {
      if (done) return;
      done = true;
      const data = {};
      const val = input.value.trim();
      if (attr === 'duration') {
        data[attr] = meta.durationUnit === 'hour' ? Math.round((Number(val) || 0) * 60) : (Number(val) || 0);
      } else if (attr === 'totalMarks') {
        data[attr] = Number(val) || 0;
      } else {
        data[attr] = val;
      }
      MT.State.setMetadata(data);
      MT.Toast.success(t('ui.saved', 'သိမ်းပြီ'));
    }
    function cancel() {
      if (done) return;
      done = true;
      MT.State.update(function () {});
    }
    input.addEventListener('blur', commit);
    input.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter') commit();
      if (ev.key === 'Escape') cancel();
    });
  }

  /* ---------- Add-section placeholder → type picker ---------- */
  function openAddSectionModal(onDone, onClose) {
    if (!ensureExamInfoConfirmed()) return;
    const body = document.createElement('div');

    function done(section) {
      if (onDone) onDone(section || null);
      else MT.Modal.close();
    }

    const label = document.createElement('p');
    label.className = 'mt-muted mt-small mt-mt-0';
    label.textContent = t('ui.chooseSectionType', 'အပိုင်း အမျိုးအစား ရွေးပါ — သို့မဟုတ် ကိုယ်ပိုင် ခေါင်းစဉ် ရိုက်ပါ။');
    body.appendChild(label);

    const chips = document.createElement('div');
    chips.className = 'add-section-chips';
    const chipLang = MT.PaperLocale.getLanguage(MT.State.getMetadata().subject);
    const SECTION_TYPE_KEYS = ['mcq', 'tf', 'short', 'long', 'math', 'blank'];
    SECTION_TYPE_KEYS.forEach(function (key) {
      const chip = MT.Utils.el('button', { type: 'button', class: 'add-section-chip' },
        MT.ExamModel.getSectionTypeLabel(key, chipLang));
      chip.addEventListener('click', function () {
        const section = MT.SectionManager.addSection(key);
        MT.Toast.success(t('ui.sectionAdded', { title: section.title }));
        done(section);
      });
      chips.appendChild(chip);
    });

    // Section heading chip — shows the next available letter (A/B/C… or က/ခ/ဂ…)
    var nextLetter = MT.ExamModel.nextAvailableSectionLetter(MT.State.get());
    if (nextLetter) {
      var sectionALabel = chipLang === 'en'
        ? 'Section ' + nextLetter
        : 'အပိုင်း (' + MT.ExamModel.toMyanmarSectionLetter(nextLetter) + ')';
      var sectionAChip = MT.Utils.el('button', { type: 'button', class: 'add-section-chip' }, sectionALabel);
      sectionAChip.addEventListener('click', function () {
        var section = MT.ExamModel.createSection({ type: 'section_a', letter: nextLetter, title: '' });
        MT.State.addSection(section);
        MT.Toast.success(t('ui.sectionAdded', { title: section.title }));
        done(section);
      });
      chips.appendChild(sectionAChip);
    }
    body.appendChild(chips);

    const otherLabel = MT.Utils.el('label', { class: 'mt-muted mt-small add-section-other' },
      t('ui.customTitle', 'အခြား — ကိုယ်ပိုင် ခေါင်းစဉ် ရိုက်ပါ'));
    body.appendChild(otherLabel);

    const customWrap = MT.Utils.el('div', { class: 'mt-row mt-mt' });
    const customInput = MT.Utils.el('input', {
      type: 'text',
      class: 'input mt-grow',
      placeholder: t('ui.sectionTitlePlaceholder', 'အပိုင်း ခေါင်းစဉ်')
    });
    customWrap.appendChild(customInput);
    const okBtn = MT.Utils.el('button', { class: 'btn' }, '✓ ' + t('ui.confirm', 'အတည်ပြုမည်'));
    okBtn.addEventListener('click', function () {
      const title = customInput.value.trim();
      if (!title) {
        MT.Toast.warning(t('ui.enterTitleFirst', 'ခေါင်းစဉ် ဦးစွာ ရိုက်ပါ'));
        return;
      }
      const section = MT.SectionManager.addSection('short');
      section.title = title;
      MT.State.update(function () {});
      MT.Toast.success(t('ui.sectionAdded', { title: section.title }));
      done(section);
    });
    customWrap.appendChild(okBtn);
    body.appendChild(customWrap);

    MT.Modal.open({
      title: '📋 ' + t('ui.addSectionTitle', 'မေးခွန်းခေါင်းစဉ် ထည့်မည်'),
      content: body,
      sheet: true,
      tone: 'info',
      help: 'help.addSection',
      onClose: onClose || null
    });
  }

  /* ---------- Sections popup (single accordion popup) ---------- */
  function openSectionsPopup() {
    if (MT.ExamSectionsPopup && MT.ExamSectionsPopup.open) {
      MT.ExamSectionsPopup.open(null, null, function () {
        if (MT.PaperUi && MT.PaperUi.openFabMenu) MT.PaperUi.openFabMenu();
      });
      return;
    }
    // Fallback (module not loaded): original modal chain
    const body = MT.Utils.el('div', { class: 'sections-popup' });

    const container = MT.Utils.el('div', { class: 'sections-popup-list' });
    body.appendChild(container);

    const addBar = MT.Utils.el('div', { class: 'sections-add-bar' });
    const addBtn = MT.Utils.el('button', { type: 'button', class: 'btn' }, t('ui.addSectionTitle', 'မေးခွန်းခေါင်းစဉ် ထည့်မည်'));
    addBtn.addEventListener('click', function () {
      openAddSectionModal(openSectionsPopup, openSectionsPopup);
    });
    addBar.appendChild(addBtn);
    body.appendChild(addBar);

    const unsubscribe = MT.State.subscribe(function () {
      if (document.body.contains(container)) {
        MT.SectionManager.renderSectionList(container);
      }
    });

    MT.SectionManager.renderSectionList(container);

    MT.Modal.open({
      title: '📚 ' + t('ui.sections', 'အပိုင်းများ'),
      content: body,
      sheet: true,
      help: 'help.sections',
      onBack: openFabMenu,
      onClose: function () { unsubscribe(); }
    });
  }

  /* ---------- Floating Action Button ---------- */
  // Shared sheet modal with a list of icon+label action rows.
  function openMenuModal(items, titleKey, fallbackTitle, helpKey) {
    const body = document.createElement('div');
    body.className = 'fab-menu';
    items.forEach(function (item) {
      const row = MT.Utils.el('button', { type: 'button', class: 'fab-option' }, item.icon + '  ' + item.label);
      row.addEventListener('click', function () {
        MT.Modal.close();
        item.fn();
      });
      body.appendChild(row);
    });
    MT.Modal.open({
      title: t(titleKey, fallbackTitle),
      content: body,
      sheet: true,
      help: helpKey
    });
  }

  function openFabMenu() {
    openMenuModal([
      { icon: '📝', label: t('ui.examInfo', 'စာမေးပွဲ အချက်အလက်'), fn: function () { openExamInfoPopup(openFabMenu); } },
      { icon: '📚', label: t('ui.sections', 'အပိုင်းများ'), fn: openSectionsPopup },
      { icon: '🤖', label: t('ui.aiSettings', 'AI ဆက်တင်'), fn: function () { if (MT.App && MT.App.openApiSettings) MT.App.openApiSettings(); } },
      { icon: '⚙️', label: t('ui.settings', 'ဆက်တင်များ'), fn: function () { openSettingsPopup(openFabMenu); } }
    ], 'ui.quickActions', 'လျှင်မြန်သည့် လုပ်ဆောင်ချက်များ', 'help.fab');
  }

  /* ---------- Exam Information popup ---------- */
  function openExamInfoPopup(onBack) {
    const body = document.createElement('div');

    function makeHideRow(fieldKey, labelText, fieldDiv) {
      const row = MT.Utils.el('div', { class: 'field-label-row' });
      row.appendChild(MT.Utils.el('label', {}, labelText));
      const hideBtn = MT.Utils.el('button', { type: 'button', class: 'btn-hide-field', 'data-hide-field': fieldKey }, t('ui.dontInclude'));
      hideBtn.addEventListener('click', function () {
        const hide = MT.State.get().settings.hideExamInfo;
        hide[fieldKey] = !hide[fieldKey];
        const hidden = hide[fieldKey] === true;
        hideBtn.classList.toggle('hidden', hidden);
        hideBtn.textContent = hidden ? t('ui.include') : t('ui.dontInclude');
        if (fieldDiv) fieldDiv.classList.toggle('field-hidden', hidden);
        MT.State.update(function () {});
      });
      row.appendChild(hideBtn);
      if (fieldDiv) {
        const hidden = MT.State.get().settings.hideExamInfo[fieldKey] === true;
        hideBtn.classList.toggle('hidden', hidden);
        hideBtn.textContent = hidden ? t('ui.include') : t('ui.dontInclude');
        fieldDiv.classList.toggle('field-hidden', hidden);
      }
      return row;
    }

    function fieldWithHide(fieldKey, labelText, inputEl) {
      const f = MT.Utils.el('div', { class: 'field' });
      f.appendChild(makeHideRow(fieldKey, labelText, f));
      f.appendChild(inputEl);
      return f;
    }

    const meta = MT.State.getMetadata();

    const titleInput = MT.Utils.el('input', {
      type: 'text', class: 'input', value: meta.title || '',
      placeholder: t('ui.titlePlaceholder', 'စာမေးပွဲ ခေါင်းစဉ် ရိုက်ပါ…')
    });
    titleInput.addEventListener('input', function () { MT.State.setMetadata({ title: titleInput.value }); });
    body.appendChild(fieldWithHide('title', t('ui.title', 'ခေါင်းစဉ်'), titleInput));

    const schoolInput = MT.Utils.el('input', {
      type: 'text', class: 'input', value: meta.school || '',
      placeholder: t('ui.schoolPlaceholder', 'ကျောင်းအမည် ရိုက်ပါ')
    });
    schoolInput.addEventListener('input', function () { MT.State.setMetadata({ school: schoolInput.value }); });
    body.appendChild(fieldWithHide('school', t('ui.school', 'ကျောင်းအမည်'), schoolInput));

    const row1 = MT.Utils.el('div', { class: 'mt-row' });
    const subjectWrap = MT.Utils.el('div', { class: 'field mt-grow' });
    const subjectSelect = MT.Utils.el('select', { class: 'input' });
    subjectSelect.innerHTML = '<option value="">' + t('ui.other', 'အခြား') + '</option>';
    MT.Constants.SUBJECTS.forEach(function (s) {
      const opt = document.createElement('option');
      opt.value = s.my;
      opt.textContent = (s.my === 'မြန်မာ' || s.my === 'မြန်မာစာ') ? s.my : (s.en || s.my);
      subjectSelect.appendChild(opt);
    });
    const subjectCustom = MT.Utils.el('input', { type: 'text', class: 'input', style: { marginTop: '6px' }, placeholder: t('ui.subjectPlaceholder', 'ဘာသာရပ်') });
    function syncSubject() {
      const cur = MT.State.getMetadata().subject || '';
      const inList = MT.Constants.SUBJECTS.some(function (s) { return s.my === cur; });
      if (inList) {
        subjectSelect.value = cur;
        subjectCustom.classList.add('mt-hidden');
      } else if (cur) {
        subjectSelect.value = '';
        subjectCustom.classList.remove('mt-hidden');
        subjectCustom.value = cur;
      } else {
        subjectSelect.value = '';
        subjectCustom.classList.remove('mt-hidden');
        subjectCustom.value = '';
      }
    }
    subjectSelect.addEventListener('change', function () {
      const v = subjectSelect.value;
      if (v) {
        MT.State.setMetadata({ subject: v });
        subjectCustom.classList.add('mt-hidden');
      } else {
        subjectCustom.classList.remove('mt-hidden');
        subjectCustom.value = MT.State.getMetadata().subject || '';
        subjectCustom.focus();
      }
    });
    subjectCustom.addEventListener('input', function () { MT.State.setMetadata({ subject: subjectCustom.value }); });
    subjectWrap.appendChild(makeHideRow('subject', t('ui.subject', 'ဘာသာရပ်'), subjectWrap));
    subjectWrap.appendChild(subjectSelect);
    subjectWrap.appendChild(subjectCustom);
    row1.appendChild(subjectWrap);

    const gradeWrap = MT.Utils.el('div', { class: 'field', style: { flex: '1' } });
    const gradeInput = MT.Utils.el('input', { type: 'text', class: 'input', value: meta.grade || '', placeholder: t('ui.gradePlaceholder', 'အတန်း ၉') });
    gradeInput.addEventListener('input', function () { MT.State.setMetadata({ grade: gradeInput.value }); });
    gradeWrap.appendChild(makeHideRow('grade', t('ui.grade', 'အတန်း'), gradeWrap));
    gradeWrap.appendChild(gradeInput);
    row1.appendChild(gradeWrap);
    body.appendChild(row1);

    const row2 = MT.Utils.el('div', { class: 'mt-row' });
    const durationWrap = MT.Utils.el('div', { class: 'field', style: { flex: '1' } });
    var durationUnit = meta.durationUnit === 'hour' ? 'hour' : 'min';
    function durationUnitLabel() { return durationUnit === 'min' ? t('ui.durationMin', 'မိနစ်') : t('ui.durationHour', 'နာရီ'); }
    function durationLabelText() { return t('ui.duration', 'အချိန်') + ' (' + durationUnitLabel() + ')'; }
    var initialDuration = durationUnit === 'hour' ? MT.Utils.formatDurationHours(meta.duration) : (meta.duration || 0);
    const durationInput = MT.Utils.el('input', { type: 'number', class: 'input', value: initialDuration, min: '5', step: '5' });
    if (durationUnit === 'hour') { durationInput.step = '0.1'; durationInput.min = '0.1'; }
    durationInput.addEventListener('input', function () {
      const v = Number(durationInput.value) || 0;
      MT.State.setMetadata({ duration: durationUnit === 'hour' ? Math.round(v * 60) : v });
    });
    var durationLabelRow = makeHideRow('duration', durationLabelText(), durationWrap);
    durationWrap.appendChild(durationLabelRow);
    var durationUnitBtn = MT.Utils.el('button', { type: 'button', class: 'btn-hide-field' }, durationUnit === 'hour' ? t('ui.durationHour', 'နာရီ') : t('ui.durationMin', 'မိနစ်'));
    durationUnitBtn.addEventListener('click', function () {
      if (durationUnit === 'min') {
        durationUnit = 'hour';
        durationInput.value = MT.Utils.formatDurationHours(meta.duration);
        durationInput.step = '0.1';
        durationInput.min = '0.1';
        durationUnitBtn.textContent = t('ui.durationHour', 'နာရီ');
        MT.State.setMetadata({ durationUnit: 'hour' });
      } else {
        durationUnit = 'min';
        durationInput.value = Number(meta.duration) || 0;
        durationInput.step = '5';
        durationInput.min = '5';
        durationUnitBtn.textContent = t('ui.durationMin', 'မိနစ်');
        MT.State.setMetadata({ durationUnit: 'min' });
      }
      durationLabelRow.querySelector('label').textContent = durationLabelText();
    });
    var durationInputRow = MT.Utils.el('div', { style: { display: 'flex', alignItems: 'stretch' } });
    durationInput.style.borderRadius = 'var(--radius-sm) 0 0 var(--radius-sm)';
    durationInput.style.borderRight = 'none';
    durationUnitBtn.style.borderRadius = '0 var(--radius-sm) var(--radius-sm) 0';
    durationUnitBtn.style.borderLeft = 'none';
    durationUnitBtn.style.borderColor = 'var(--color-border)';
    durationUnitBtn.style.background = '#fff';
    durationUnitBtn.style.color = 'var(--color-text)';
    durationUnitBtn.style.borderWidth = '1px';
    durationUnitBtn.style.fontSize = '.82rem';
    durationUnitBtn.style.padding = '0 10px';
    durationUnitBtn.style.flexShrink = '0';
    durationInputRow.appendChild(durationInput);
    durationInputRow.appendChild(durationUnitBtn);
    durationWrap.appendChild(durationInputRow);
    row2.appendChild(durationWrap);

    const marksWrap = MT.Utils.el('div', { class: 'field', style: { flex: '1' } });
    const marksInput = MT.Utils.el('input', { type: 'number', class: 'input', value: meta.totalMarks || 0, min: '1' });
    marksInput.addEventListener('input', function () { MT.State.setMetadata({ totalMarks: Number(marksInput.value) || 0 }); });
    marksWrap.appendChild(makeHideRow('totalMarks', t('ui.totalMarks', 'အမှတ်စုစုပေါင်း'), marksWrap));
    marksWrap.appendChild(marksInput);
    row2.appendChild(marksWrap);
    body.appendChild(row2);

    syncSubject();

    const footer = function (close) {
      const wrap = MT.Utils.el('div', { style: { display: 'flex', gap: '8px', width: '100%', justifyContent: 'flex-end' } });
      const doneBtn = MT.Utils.el('button', { class: 'btn' }, '✓ ' + t('ui.confirm', 'အတည်ပြုမည်'));
      doneBtn.addEventListener('click', function () {
        MT.State.get().settings.examInfoConfirmed = true;
        MT.State.update(function () {});
        close();
      });
      wrap.appendChild(doneBtn);
      return wrap;
    };

    MT.Modal.open({
      title: '📝 ' + t('ui.examInfo', 'စာမေးပွဲ အချက်အလက်'),
      content: body,
      sheet: true,
      help: 'help.examInfo',
      footer: footer,
      onBack: onBack || null
    });
  }

  /* ---------- Exam info confirmation guard ---------- */
  function ensureExamInfoConfirmed() {
    if (MT.State.get().settings.examInfoConfirmed === true) return true;
    MT.Toast.warning(t('ui.confirmExamInfoFirst', 'အရင် စာမေးပွဲ အချက်အလက်ကို အတည်ပြုပါ'), { duration: 6000 });
    openExamInfoPopup();
    return false;
  }

  /* ---------- Settings popup (paper settings + tools) ---------- */
  function openSettingsPopup(onBack) {
    const body = MT.Utils.el('div', { class: 'settings-popup' });
    const settings = MT.State.get().settings;

    function group(title) {
      const g = MT.Utils.el('div', { class: 'settings-group' });
      g.appendChild(MT.Utils.el('div', { class: 'settings-group-title' }, title));
      return g;
    }
    function row(labelText, inputEl) {
      const r = MT.Utils.el('div', { class: 'settings-row' });
      r.appendChild(MT.Utils.el('label', {}, labelText));
      const ctrl = MT.Utils.el('div', { class: 'settings-control' });
      ctrl.appendChild(inputEl);
      r.appendChild(ctrl);
      return r;
    }

    const paperGroup = group(t('settings.paperGroup', 'စာရွက် ဆက်တင်'));

    const fontInput = MT.Utils.el('select', { class: 'input' });
    [
      { v: 'padauk', l: t('settings.fontPadauk', 'Padauk (မြန်မာ)') },
      { v: 'pyidaungsu', l: t('settings.fontPyidaungsu', 'Pyidaungsu (မြန်မာ)') },
      { v: 'myanmar', l: t('settings.fontMyanmar', 'Myanmar Text') },
      { v: 'serif', l: t('settings.fontSerif', 'Serif (အင်္ဂလိပ်)') }
    ].forEach(function (f) {
      const opt = document.createElement('option');
      opt.value = f.v;
      opt.textContent = f.l;
      fontInput.appendChild(opt);
    });
    fontInput.value = settings.font || 'padauk';
    fontInput.addEventListener('change', function () {
      MT.State.get().settings.font = fontInput.value;
      MT.State.update(function () {});
    });
    paperGroup.appendChild(row(t('settings.font', 'စာလုံးဖောင့်'), fontInput));

    const pageSizeInput = MT.Utils.el('select', { class: 'input' });
    Object.keys(MT.Constants.PAGE_SIZES).forEach(function (key) {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = MT.Constants.PAGE_SIZES[key].label;
      pageSizeInput.appendChild(opt);
    });
    pageSizeInput.value = settings.pageSize || 'A4';
    pageSizeInput.addEventListener('change', function () {
      MT.State.get().settings.pageSize = pageSizeInput.value;
      MT.State.update(function () {});
    });
    paperGroup.appendChild(row(t('settings.pageSize', 'စာရွက်အရွယ်အစား'), pageSizeInput));

    const qfontInput = MT.Utils.el('select', { class: 'input' });
    [2, 4, 5, 6, 7, 8, 10, 11, 12].forEach(function (pt) {
      const opt = document.createElement('option');
      opt.value = pt;
      opt.textContent = pt + 'pt';
      qfontInput.appendChild(opt);
    });
    qfontInput.value = settings.questionFontSize != null ? settings.questionFontSize : 6;
    qfontInput.addEventListener('change', function () {
      MT.State.get().settings.questionFontSize = Number(qfontInput.value) || 6;
      MT.State.update(function () {});
    });
    paperGroup.appendChild(row(t('settings.questionFontSize', 'မေးခွန်း စာလုံးအရွယ်'), qfontInput));

    const numberingInput = MT.Utils.el('select', { class: 'input' });
    [
      { v: 'global', l: t('settings.numberingGlobal', 'စာရွက်တစ်ခုလုံး') },
      { v: 'section', l: t('settings.numberingSection', 'အပိုင်းတစ်ခုစီ') }
    ].forEach(function (o) {
      const opt = document.createElement('option');
      opt.value = o.v;
      opt.textContent = o.l;
      numberingInput.appendChild(opt);
    });
    numberingInput.value = settings.numbering === 'section' ? 'section' : 'global';
    numberingInput.addEventListener('change', function () {
      MT.State.get().settings.numbering = numberingInput.value;
      MT.Numbering.apply(MT.State.get());
      MT.State.update(function () {});
    });
    paperGroup.appendChild(row(t('settings.numbering', 'မေးခွန်း နံပါတ်စနစ်'), numberingInput));

    function checkbox(labelText, checked, onToggle) {
      const lab = MT.Utils.el('label', { class: 'settings-check' });
      const cb = MT.Utils.el('input', { type: 'checkbox', checked: checked });
      cb.addEventListener('change', onToggle);
      lab.appendChild(cb);
      lab.appendChild(MT.Utils.el('span', {}, labelText));
      return lab;
    }

    const checks = MT.Utils.el('div', { class: 'settings-checks' });
    checks.appendChild(checkbox(t('settings.showMarks', 'အမှတ်များ ပြမည်'), settings.showMarks !== false, function (e) {
      MT.State.get().settings.showMarks = e.target.checked;
      MT.State.update(function () {});
    }));
    checks.appendChild(checkbox(t('settings.showAnswerLines', 'အဖြေနေရာ မျဉ်းများ ထည့်မည်'), settings.showAnswerLines !== false, function (e) {
      MT.State.get().settings.showAnswerLines = e.target.checked;
      MT.State.update(function () {});
    }));
    paperGroup.appendChild(checks);
    body.appendChild(paperGroup);

    const toolsGroup = group(t('ui.tools', 'ကိရိယာများ'));

    const langBtn = MT.Utils.el('button', { type: 'button', class: 'btn secondary' }, t('ui.langToggle', 'EN / မြန်မာ'));
    langBtn.addEventListener('click', function () {
      MT.I18n.toggle();
      if (MT.App && MT.App.render) MT.App.render();
      MT.Modal.close();
      openSettingsPopup(onBack);
    });
    toolsGroup.appendChild(row(t('ui.lang', 'ဘာသာစကား'), langBtn));

    const toolsRow = MT.Utils.el('div', { class: 'settings-tools-row' });
    const renumberBtn = MT.Utils.el('button', { type: 'button', class: 'btn secondary sm' }, t('ui.renumber', '🔢 မေးခွန်း နံပါတ်ပြန်တပ်'));
    renumberBtn.addEventListener('click', function () {
      MT.Numbering.apply(MT.State.get());
      MT.State.update(function () {});
      MT.Toast.info(t('ui.saved', 'သိမ်းပြီ'));
    });
    toolsRow.appendChild(renumberBtn);

    const clearAllBtn = MT.Utils.el('button', { type: 'button', class: 'btn danger sm' }, t('ui.clearAll', '🗑️ အားလုံး ရှင်းမည်'));
    clearAllBtn.addEventListener('click', function () {
      MT.Dialogs.confirm({
        title: t('ui.clearAll', 'အားလုံး ရှင်းမည်'),
        message: t('dialog.clearAllConfirm', 'အပိုင်းများနှင့် မေးခွန်းများအားလုံး ဖျက်မည်လား?'),
        okText: t('ui.confirm', 'အတည်ပြုမည်'),
        okClass: 'danger'
      }).then(function (ok) {
        if (ok) {
          MT.State.clearContent();
          MT.Toast.success(t('ui.cleared', 'ရှင်းလင်းပြီး'), {
            action: { label: t('ui.undo', '↩ ပြန်ပြင်မည်'), onClick: function () { MT.State.undo(); } }
          });
        }
      });
    });
    toolsRow.appendChild(clearAllBtn);
    toolsGroup.appendChild(toolsRow);
    body.appendChild(toolsGroup);

    MT.Modal.open({
      title: '⚙️ ' + t('ui.settings', 'ဆက်တင်များ'),
      content: body,
      sheet: true,
      help: 'help.settings',
      onBack: onBack || null
    });
  }

  /* ---------- OCR scan (used by paper empty state) ---------- */
  function onFabOcr(sectionId) {
    MT.CropFlow.open({
      sectionId: sectionId || undefined,
      openEditor: true,
      onQuestions: function (questions, sectionId2) {
        if (!sectionId2 || !questions || questions.length === 0) return;
        MT.State.insertQuestions(sectionId2, questions);
        MT.Numbering.apply(MT.State.get());
        MT.State.update(function () {});
        MT.Toast.success(t('ui.questionsImported', { count: digits(questions.length) }));
      }
    });
  }

  /* ---------- Page size chips ---------- */
  function bindPageSizeBar() {
    const bar = document.getElementById('pageSizeBar');
    if (!bar) return;
    const chips = document.getElementById('pageSizeChips');
    if (!chips) return;
    chips.innerHTML = '';
    Object.keys(MT.Constants.PAGE_SIZES).forEach(function (key) {
      const btn = MT.Utils.el('button', { type: 'button', class: 'chip', 'data-page-size': key },
        MT.Constants.PAGE_SIZES[key].label);
      chips.appendChild(btn);
    });
    refreshPageSizeBar(bar);
    bar.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-page-size]');
      if (!btn) return;
      MT.State.get().settings.pageSize = btn.getAttribute('data-page-size');
      MT.State.update(function () {});
      refreshPageSizeBar(bar);
    });
  }

  function refreshPageSizeBar(bar) {
    if (!bar) bar = document.getElementById('pageSizeBar');
    if (!bar) return;
    const cur = MT.State.get().settings.pageSize || 'A4';
    bar.querySelectorAll('[data-page-size]').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-page-size') === cur);
    });
  }

  /* ---------- Page spacing (Content density) stepper ---------- */
  function bindPageSpacing() {
    const minus = document.getElementById('btnPadMinus');
    const plus = document.getElementById('btnPadPlus');
    const track = document.getElementById('pageSpacingValue');
    const fill = document.getElementById('pageSpacingFill');
    if (!minus || !plus || !fill) return;
    const limits = MT.Constants.PADDING_LIMITS || { min: 20, max: 80, step: 2, default: 57, unit: 'px' };

    function currentValue() {
      const v = MT.State.get().settings.pagePadding;
      return (v != null && isFinite(v)) ? Number(v) : limits.default;
    }
    function clamp(v) {
      return Math.min(limits.max, Math.max(limits.min, v));
    }
    function render(v) {
      const pct = Math.round(((v - limits.min) / (limits.max - limits.min)) * 100);
      fill.style.width = Math.min(100, Math.max(0, pct)) + '%';
      if (track) track.title = v + (limits.unit || 'px');
      minus.disabled = v <= limits.min;
      plus.disabled = v >= limits.max;
    }
    function commit(v) {
      MT.State.get().settings.pagePadding = v;
      MT.State.update(function () {});
    }

    minus.addEventListener('click', function () { commit(clamp(currentValue() - limits.step)); });
    plus.addEventListener('click', function () { commit(clamp(currentValue() + limits.step)); });
    render(currentValue());
  }

  /* ---------- Download menu (PDF / Image / DOCX) ---------- */
  function getSaveName() {
    const input = document.getElementById('inpDocTitle');
    const custom = input ? input.value.trim() : '';
    return MT.Storage.ExportJson.buildSaveName(MT.State.getMetadata(), custom);
  }

  function openDownloadMenu() {
    openMenuModal([
      { icon: '📄', label: t('ui.downloadPdf', 'PDF (ပုံနှိပ်)'), fn: downloadPdf },
      { icon: '🖼️', label: t('ui.downloadImage', 'ပုံ (Image)'), fn: downloadImage },
      { icon: '🗂️', label: t('ui.downloadJson', 'JSON'), fn: downloadJson }
    ], 'ui.download', 'ဒေါင်းလုဒ်', 'help.download');
  }

  // Render every on-screen preview page to a canvas at its true physical size
  // (the phone-fit transform is temporarily removed, then restored).
  // Calls onCanvas(canvas) for each page and resolves when all are done.
  function capturePages(onCanvas) {
    const pages = document.querySelectorAll('#paperPreview .paper-preview');
    return new Promise(function (resolve) {
      if (!pages.length) { resolve(false); return; }
      if (typeof html2canvas === 'undefined') { resolve('nohtml2canvas'); return; }
      var i = 0;
      function next() {
        if (i >= pages.length) { resolve(true); return; }
        var el = pages[i];
        var wrap = el.closest('.preview-page-wrap');
        var orig = {
          t: el.style.transform,
          w: wrap ? wrap.style.width : '',
          h: wrap ? wrap.style.height : '',
          o: wrap ? wrap.style.overflow : ''
        };
        el.style.transform = 'none';
        if (wrap) { wrap.style.width = ''; wrap.style.height = ''; wrap.style.overflow = 'visible'; }
        void el.offsetWidth;
        function restore() {
          el.style.transform = orig.t;
          if (wrap) { wrap.style.width = orig.w; wrap.style.height = orig.h; wrap.style.overflow = orig.o; }
        }
        html2canvas(el, { scale: 2, backgroundColor: '#fff', useCORS: true }).then(function (c) {
          restore();
          onCanvas(c, i);
          i++;
          next();
        }).catch(function () {
          restore();
          i++;
          next();
        });
      }
      next();
    });
  }

  function downloadPdf() {
    if (typeof html2canvas === 'undefined') {
      MT.Toast.error(t('ui.noHtml2canvas'));
      return;
    }
    const hideLoading = MT.Loading.show(t('ui.pdfPreparing', 'PDF ပြင်ဆင်နေသည်…'));
    var imgs = [];
    capturePages(function (c) { imgs.push(c.toDataURL('image/jpeg', 0.92)); }).then(function (ok) {
      hideLoading();
      if (ok === 'nohtml2canvas') { MT.Toast.error(t('ui.noHtml2canvas')); return; }
      if (!ok || imgs.length === 0) { MT.Toast.warning(t('ui.noQuestionsYet', 'မေးခွန်း မရှိသေးပါ')); return; }
      openPreview(imgs);
    });

    function openPreview(imgs) {
      var title = getSaveName();
      var printLabel = t('ui.print', '🖨 ပုံနှိပ်မည်');
      // Print each captured page at exactly one physical sheet: force the
      // chosen page size with zero margin so a full-bleed page image can never
      // overflow onto a second (blank) sheet.
      var exam = (MT.State && MT.State.get) ? MT.State.get() : null;
      var settings = (exam && exam.settings) || {};
      var pageSize = settings.pageSize || 'A4';
      var geo = (MT.ExamRenderer && MT.ExamRenderer.getPrintGeometry) ? MT.ExamRenderer.getPrintGeometry(pageSize, settings) : null;
      var pxW = (geo && geo.pxW) || 794;
      var pxH = (geo && geo.pxH) || 1123;
      var html = '<!DOCTYPE html><html><head><meta charset="UTF-8">' +
        '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
        '<title>' + title + '</title>' +
        '<style>' +
        'body{margin:0;background:#e5e7eb;font-family:sans-serif}' +
        '.bar{position:sticky;top:0;z-index:10;display:flex;align-items:center;gap:12px;padding:10px 16px;background:#1a5f8e;color:#fff}' +
        '.bar b{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
        '.bar button{padding:8px 18px;border:0;border-radius:8px;background:#fff;color:#1a5f8e;font-weight:700;font-size:14px;cursor:pointer}' +
        '.page{background:#fff;box-shadow:0 2px 10px rgba(0,0,0,.2);margin:16px auto;width:' + pxW + 'px;max-width:94vw}' +
        '.page img{display:block;width:100%;height:auto}' +
        '@media print{@page{size:' + pageSize + ';margin:0}html,body{background:#fff;margin:0}.bar{display:none}' +
        '.page{box-shadow:none;margin:0;max-width:none;width:' + pxW + 'px;height:' + pxH + 'px;overflow:hidden;page-break-after:always}' +
        '.page img{width:100%;height:100%;object-fit:fill}' +
        '.page:last-child{page-break-after:auto}}' +
        '</style></head><body>' +
        '<div class="bar"><b>' + title + '</b><button onclick="window.print()">' + printLabel + '</button></div>';
      imgs.forEach(function (src) {
        html += '<div class="page"><img src="' + src + '"></div>';
      });
      html += '</body></html>';
      var win = window.open('', '_blank');
      if (!win) {
        MT.Toast.error(t('ui.pdfOpenFailed', 'ပုံနှိပ်ပြတင်းပေါက် ဖွင့်၍ မရပါ'));
        return;
      }
      win.document.write(html);
      win.document.close();
      win.focus();
    }
  }

  function downloadJson() {
    if (!MT.Storage || !MT.Storage.ExportJson) return;
    const exam = MT.State.get();
    const name = getSaveName() + '.json';
    MT.Storage.ExportJson.exportExam(exam, name);
    MT.Toast.success(t('ui.exportedToast', { name: name }));
  }

  function downloadImage() {
    if (typeof html2canvas === 'undefined') {
      MT.Toast.error(t('ui.noHtml2canvas'));
      return;
    }
    const hideLoading = MT.Loading.show(t('ui.creatingImage'));
    var canvases = [];
    capturePages(function (c) { canvases.push(c); }).then(function (ok) {
      hideLoading();
      if (ok === 'nohtml2canvas') { MT.Toast.error(t('ui.noHtml2canvas')); return; }
      if (!ok || canvases.length === 0) { MT.Toast.warning(t('ui.noQuestionsYet', 'မေးခွန်း မရှိသေးပါ')); return; }
      // Export one PNG per page instead of a single very tall image.
      var base = getSaveName();
      var names = [];
      // Stagger the downloads so mobile browsers don't block the 2nd+ ones.
      var chain = Promise.resolve();
      canvases.forEach(function (c, i) {
        var name = base + (canvases.length > 1 ? '-' + (i + 1) : '') + '.png';
        names.push(name);
        chain = chain.then(function () {
          return new Promise(function (res) {
            setTimeout(function () {
              c.toBlob(function (blob) { MT.Utils.download(name, blob, 'image/png'); res(); }, 'image/png');
            }, i === 0 ? 0 : 400);
          });
        });
      });
      chain.then(function () {
        MT.Toast.success(t('ui.exportedToast', { name: names.join(', ') }));
      });
    });
  }

  return { init: init, refreshPageSizeBar: refreshPageSizeBar, openDownloadMenu: openDownloadMenu, ensureExamInfoConfirmed: ensureExamInfoConfirmed, openFabMenu: openFabMenu, openAddSectionModal: openAddSectionModal, openSectionsPopup: openSectionsPopup };
})();