window.MT = window.MT || {};

/* MT.ExamSectionsPopup — the single "one popup" sections editor.
   Sections expand inline (accordion); a question opens its editor as a
   separate popup. */
MT.ExamSectionsPopup = (function () {
  var container = null;
  var unsubscribe = null;
  var expandedSection = null;
  var expandedQuestion = {};
  var dragSectionIndex = null;
  var dragQuestionIndex = null;
  var justDragged = false;
  var backTo = null;

  function t(key, fallback) { return MT.Utils.t(key, null, fallback); }
  function lang() {
    return MT.PaperLocale.getLanguage(MT.State.getMetadata().subject);
  }

  function open(expandSectionId, expandQuestionId, backToFn) {
    if (typeof backToFn === 'function') backTo = backToFn;
    expandedSection = expandSectionId || null;
    if (!expandedSection) expandedQuestion = {};

    // Opening a specific question: if it has sub-questions show its rows as a
    // dropdown; otherwise fall back to its editor popup.
    if (expandSectionId && expandQuestionId) {
      var q = MT.State.getQuestion(expandSectionId, expandQuestionId);
      if (q && q.subQuestions && q.subQuestions.length > 0) {
        expandedQuestion[expandQuestionId] = true;
      } else {
        MT.QuestionPopupEditor.openQuestionEditor(expandSectionId, expandQuestionId, {
          onBack: function () { open(expandSectionId); }
        });
        return;
      }
    }

    var body = MT.Utils.el('div', { class: 'exs-popup' });
    var localContainer = MT.Utils.el('div', { class: 'exs-list' });
    body.appendChild(localContainer);

    var addBar = MT.Utils.el('div', { class: 'sections-add-bar' });
    var addBtn = MT.Utils.el('button', { type: 'button', class: 'btn btn-ok' }, t('ui.addSectionTitle', 'မေးခွန်းခေါင်းစဉ် ထည့်မည်'));
    addBtn.addEventListener('click', function () {
      if (MT.PaperUi && MT.PaperUi.openAddSectionModal) {
        var backTarget = backTo;
        MT.PaperUi.openAddSectionModal(function (section) {
          open(section ? section.id : expandedSection, null, backTarget);
        }, function () {
          open(expandedSection, null, backTarget);
        });
      }
    });
    addBar.appendChild(addBtn);
    body.appendChild(addBar);

    MT.Modal.open({
      title: '📚 ' + t('ui.sections', 'အပိုင်းများ'),
      content: body,
      sheet: true,
      tone: 'primary',
      boxClass: 'exs-modal',
      help: 'help.sections',
      onClose: cleanup,
      onBack: function () {
        var target = backTo; backTo = null;
        cleanup();
        MT.Modal.close();
        if (target) target();
      }
    });

    if (unsubscribe) unsubscribe();
    container = localContainer;
    unsubscribe = MT.State.subscribe(function () {
      if (container && document.body.contains(container)) render();
    });
    render();

    // Bring the expanded section into view (e.g. a freshly added one).
    if (expandedSection) {
      setTimeout(function () {
        if (!container) return;
        var el = container.querySelector('.exs-section.open');
        if (el) { try { el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) { el.scrollIntoView(); } }
      }, 80);
    }

    // Any add-question sub-popup returns to this popup instead of a modal chain.
    if (MT.SectionPopup && MT.SectionPopup.setReturnHandler) {
      MT.SectionPopup.setReturnHandler(function (sid, qid) { open(sid, qid); });
    }
  }

  function cleanup() {
    backTo = null;
    if (unsubscribe) { unsubscribe(); unsubscribe = null; }
    container = null;
  }

  function render() {
    if (!container || !document.body.contains(container)) return;
    container.innerHTML = '';
    var exam = MT.State.get();
    if (!exam.sections || exam.sections.length === 0) {
      var empty = MT.Utils.el('div', { class: 'empty-state sections-empty' });
      empty.appendChild(MT.Utils.el('div', { class: 'empty-icon' }, '📂'));
      empty.appendChild(MT.Utils.el('p', {}, t('ui.emptySections')));
      empty.appendChild(MT.Utils.el('div', { class: 'mt-small mt-muted' }, t('ui.emptySectionsDesc')));
      container.appendChild(empty);
      return;
    }
    var sectionNum = 0;
    exam.sections.forEach(function (section, index) {
      container.appendChild(renderSection(section, index, sectionNum));
      if (section.type !== 'section_a') sectionNum++;
    });
  }

  function toggleSection(sectionId) {
    if (expandedSection === sectionId) {
      expandedSection = null;
      expandedQuestion = {};
    } else {
      expandedSection = sectionId;
    }
    render();
  }

  function typeBadgeLabel(type) {
    if (type === 'section_a') return lang() === 'en' ? 'Section' : 'အပိုင်း';
    return MT.ExamModel.getSectionTypeLabel(type, lang());
  }

  // Clickable number chip that opens the number-style dropdown. Changing the
  // style applies to every title/question in the exam (global per scope).
  function makeNumberChip(num, styleId, scope) {
    var btn = MT.Utils.el('button', { type: 'button', class: scope === 'question' ? 'sp-num' : 'section-num' },
      MT.NumberStyles.display(num, styleId, lang()));
    MT.NumberStyles.bindDropdown(btn, styleId, function (id) {
      if (scope === 'question') MT.State.get().settings.questionNumberStyle = id;
      else MT.State.get().settings.sectionNumberStyle = id;
      MT.State.update(function () {});
    });
    return btn;
  }

  /* ---------- Section card (accordion header + optional body) ---------- */
  function renderSection(section, index, sectionNum) {
    var isOpen = expandedSection === section.id;
    var sec = MT.Utils.el('div', { class: 'exs-section' + (isOpen ? ' open' : '') + ' st-' + section.type, draggable: 'true' });

    var head = MT.Utils.el('div', { class: 'exs-header' });
    if (section.type !== 'section_a') {
      head.appendChild(makeNumberChip(sectionNum + 1, MT.State.get().settings.sectionNumberStyle || 'arabic', 'section'));
    }
    var titleInput = MT.Utils.el('input', {
      class: 'input exs-title',
      value: MT.PaperLocale.getEditableTitle(section),
      placeholder: t('ui.sectionTitlePlaceholder', 'အပိုင်း ခေါင်းစဉ်')
    });
    titleInput.addEventListener('input', function () {
      var s = MT.State.getSection(section.id);
      if (s) { s.title = titleInput.value; MT.State.updateSilent(function () {}); }
    });
    head.appendChild(titleInput);
    head.appendChild(MT.Utils.el('span', { class: 'exs-type-badge' }, typeBadgeLabel(section.type)));
    if (section.type !== 'section_a') {
      head.appendChild(MT.Utils.el('span', { class: 'exs-count' },
        MT.Utils.toMyanmarDigits(section.questions.length) + ' 📝'));
    }
    var delBtn = MT.Utils.el('button', { type: 'button', class: 'btn sm ghost section-del exs-del', title: t('ui.delete', 'ဖျက်မည်') }, '✕');
    delBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      var title = section.title || MT.ExamModel.getSectionTypeLabel(section.type, lang());
      MT.Dialogs.confirm({
        message: t('dialog.sectionDeleteConfirm', 'ဤအပိုင်းကို ဖျက်မည်လား?') + ' "' + title + '"',
        okText: t('ui.delete', 'ဖျက်မည်'),
        okClass: 'danger'
      }).then(function (ok) {
        if (ok) {
          if (expandedSection === section.id) expandedSection = null;
          MT.State.removeSection(section.id);
          MT.Toast.success(t('ui.deleted', 'ဖျက်ပြီး'), {
            action: { label: t('ui.undo', '↩ ပြန်ပြင်မည်'), onClick: function () { MT.State.undo(); } }
          });
        }
      });
    });
    head.appendChild(delBtn);

    head.addEventListener('click', function (e) {
      if (justDragged) return;
      if (section.type === 'section_a') return;
      if (e.target.closest('input') || e.target.closest('.exs-del')) return;
      toggleSection(section.id);
    });
    sec.appendChild(head);

    // Drag & drop reorder sections
    sec.addEventListener('dragstart', function (e) {
      justDragged = true;
      dragSectionIndex = index;
      sec.classList.add('section-card-dragging');
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', String(index)); } catch (err) {}
    });
    sec.addEventListener('dragend', function () {
      setTimeout(function () { justDragged = false; }, 0);
      dragSectionIndex = null;
      sec.classList.remove('section-card-dragging');
      if (container) {
        container.querySelectorAll('.section-card-dragover').forEach(function (el) {
          el.classList.remove('section-card-dragover');
        });
      }
    });
    sec.addEventListener('dragover', function (e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      sec.classList.add('section-card-dragover');
    });
    sec.addEventListener('dragleave', function () {
      sec.classList.remove('section-card-dragover');
    });
    sec.addEventListener('drop', function (e) {
      e.preventDefault();
      sec.classList.remove('section-card-dragover');
      if (dragSectionIndex === null || dragSectionIndex === index) return;
      MT.State.moveSection(dragSectionIndex, index);
      dragSectionIndex = null;
    });

    if (isOpen) {
      var bodyEl = MT.Utils.el('div', { class: 'exs-body' });
      renderSectionBody(bodyEl, section);
      sec.appendChild(bodyEl);
    }
    return sec;
  }

  /* ---------- Section body (questions, add) ---------- */
  function renderSectionBody(bodyEl, section) {
    var isHeading = section.type === 'section_a';
    if (isHeading) return;

    var listEl = MT.Utils.el('div', { class: 'section-popup-list' });
    bodyEl.appendChild(listEl);
    renderQuestions(listEl, section);

    var addWrap = MT.Utils.el('div', { class: 'exs-add-q' });
    var addQBtn = MT.Utils.el('button', { type: 'button', class: 'btn btn-ok' }, t('ui.addQuestion', 'မေးခွန်းထည့်မည်'));
    addQBtn.addEventListener('click', function () {
      if (MT.SectionPopup && MT.SectionPopup.openStructurePopup) MT.SectionPopup.openStructurePopup(section.id);
    });
    addWrap.appendChild(addQBtn);
    bodyEl.appendChild(addWrap);
  }

  function renderQuestions(listEl, section) {
    listEl.innerHTML = '';
    if (!section.questions || section.questions.length === 0) {
      listEl.appendChild(MT.Utils.el('div', { class: 'empty-state sp-empty' },
        t('ui.noQuestionsYet', 'မေးခွန်း မရှိသေးပါ — အောက်က "မေးခွန်း ထည့်မည်" ကို နှိပ်ပါ။')));
      return;
    }
    section.questions.forEach(function (q, index) {
      renderQuestionRow(listEl, section, q, index);
    });
  }

  /* ---------- Question row (toggles sub-part dropdown) + sub-parts ---------- */
  function renderQuestionRow(listEl, section, q, index) {
    var isExpanded = !!expandedQuestion[q.id];
    var hasSubs = q.subQuestions && q.subQuestions.length > 0;
    var row = MT.Utils.el('div', { class: 'exs-qrow' + (isExpanded ? ' open' : '') + (hasSubs ? ' has-subs' : ''), draggable: 'true' });

    row.appendChild(MT.Utils.el('span', { class: 'exs-qrow-chevron' },
      (hasSubs ? (isExpanded ? '▾' : '▸') : '')));

    row.appendChild(makeNumberChip(q.number, MT.State.get().settings.questionNumberStyle || 'arabic', 'question'));

    if (q.reviewStatus && q.reviewStatus !== 'approved' && q.reviewStatus !== 'none') {
      row.appendChild(MT.Utils.el('span', { class: 'review-badge ' + q.reviewStatus },
        MT.QuestionModel.getReviewLabel(q)));
    }

    var textContent = (q.text || '').replace(/\r?\n/g, ' ').slice(0, 80);
    var textHtml = MT.MathRenderer.renderTextWithMath(textContent);
    if (!textContent && q.subQuestions && q.subQuestions.length > 0) {
      var subStyleId = (MT.State.get().settings && MT.State.get().settings.subQuestionNumberStyle) || 'parenthesizedLettersLower';
      textHtml = q.subQuestions.map(function (_, i) {
        return '<span class="sp-sub-letter">' + MT.NumberStyles.display(i + 1, subStyleId, lang()) + '</span>';
      }).join('');
    }
    textHtml = textHtml || MT.Utils.escapeHtml(t('ui.emptyQuestionShort', '(ဗလာ)'));
    row.appendChild(MT.Utils.el('div', { class: 'sp-text', html: textHtml }));
    row.appendChild(MT.Utils.el('span', { class: 'sp-marks' },
      '(' + MT.PaperLocale.formatMarks(lang(), q.marks) + ')'));

    var delBtn = MT.Utils.el('button', { type: 'button', class: 'btn sm ghost sp-del', title: t('ui.delete', 'ဖျက်မည်') }, '✕');
    delBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      var snippet = (q.text || '').replace(/\r?\n/g, ' ').slice(0, 40) || t('ui.emptyQuestionShort', '(ဗလာ)');
      MT.Dialogs.confirm({
        message: t('ui.deleteQuestionQ', 'မေးခွန်း ဖျက်မည်လား?') + ' "' + snippet + '"',
        okText: t('ui.delete', 'ဖျက်မည်')
      }).then(function (ok) {
        if (ok) {
          MT.State.removeQuestion(section.id, q.id);
          MT.Numbering.apply(MT.State.get());
          MT.Toast.success(t('ui.deleted', 'ဖျက်ပြီး'), {
            action: { label: t('ui.undo', '↩ ပြန်ပြင်မည်'), onClick: function () { MT.State.undo(); } }
          });
        }
      });
    });
    row.appendChild(delBtn);

    // Clicking a question toggles its sub-part dropdown (no editor popup).
    row.addEventListener('click', function (e) {
      if (justDragged) return;
      if (e.target.closest('button')) return;
      if (!hasSubs) {
        MT.QuestionPopupEditor.openQuestionEditor(section.id, q.id, {
          onBack: function () { open(section.id); }
        });
        return;
      }
      if (expandedQuestion[q.id]) delete expandedQuestion[q.id];
      else expandedQuestion[q.id] = true;
      render();
    });

    // Drag & drop reorder questions
    row.addEventListener('dragstart', function (e) {
      justDragged = true;
      dragQuestionIndex = index;
      row.classList.add('section-popup-row-dragging');
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', String(index)); } catch (err) {}
    });
    row.addEventListener('dragend', function () {
      setTimeout(function () { justDragged = false; }, 0);
      dragQuestionIndex = null;
      row.classList.remove('section-popup-row-dragging');
      listEl.querySelectorAll('.section-popup-row-dragover').forEach(function (el) {
        el.classList.remove('section-popup-row-dragover');
      });
    });
    row.addEventListener('dragover', function (e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      row.classList.add('section-popup-row-dragover');
    });
    row.addEventListener('dragleave', function () {
      row.classList.remove('section-popup-row-dragover');
    });
    row.addEventListener('drop', function (e) {
      e.preventDefault();
      row.classList.remove('section-popup-row-dragover');
      if (dragQuestionIndex === null || dragQuestionIndex === index) return;
      MT.State.moveQuestion(section.id, dragQuestionIndex, index);
      dragQuestionIndex = null;
    });

    listEl.appendChild(row);

    if (isExpanded && q.subQuestions && q.subQuestions.length > 0) {
      q.subQuestions.forEach(function (sub, i) { renderSubRow(listEl, section, q, sub, i); });
    }
  }

  // Sub-question part rows (a), (b)... — read-only preview, tap to edit in place.
  function renderSubRow(listEl, section, q, sub, i) {
    var row = MT.Utils.el('div', { class: 'sp-sub-row', role: 'button', tabindex: '0' });
    var subStyleId = (MT.State.get().settings && MT.State.get().settings.subQuestionNumberStyle) || 'parenthesizedLettersLower';
    var subLang = lang();
    var letterBtn = MT.Utils.el('button', { type: 'button', class: 'sp-sub-letter' },
      MT.NumberStyles.display(i + 1, subStyleId, subLang));
    MT.NumberStyles.bindDropdown(letterBtn, subStyleId, function (id) {
      MT.State.get().settings.subQuestionNumberStyle = id;
      MT.State.update(function () {});
    });
    row.appendChild(letterBtn);

    var text = sub.text && sub.text.trim()
      ? MT.MathRenderer.renderTextWithMath(sub.text)
      : t('ui.emptyQuestionShort', '(ဗလာ)');
    row.appendChild(MT.Utils.el('div', { class: 'sp-sub-text', html: text }));
    row.appendChild(MT.Utils.el('span', { class: 'sp-sub-edit' }, '✎'));

    row.addEventListener('click', function (e) {
      e.stopPropagation();
      MT.QuestionPopupEditor.openQuestionEditor(section.id, q.id, {
        focusSubIndex: i,
        onBack: function () { open(section.id); }
      });
    });
    row.addEventListener('keydown', function (e) {
      if (e.target !== row) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        row.click();
      }
    });

    listEl.appendChild(row);
  }

  return { open: open };
})();
