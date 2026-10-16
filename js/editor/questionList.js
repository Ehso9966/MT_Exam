window.MT = window.MT || {};

/* MT.QuestionList — the in-page question list used by the responsive editor.
   It renders every section and its questions into a plain container (not a
   modal) so mobile can show a full-page list and desktop can park it in the
   left editing column. It reuses the existing MT.State mutators, number-style
   helpers, math rendering and dialogs — no separate data model. */
MT.QuestionList = (function () {
  var container = null;
  var unsubscribe = null;
  var expandedSection = null;
  var activeQuestionId = null;
  var dragSectionIndex = null;
  var dragQuestionIndex = null;
  var dragQuestionSectionId = null;
  var justDragged = false;
  var onOpenQuestion = null;
  var insertTargetEl = null;

  function t(key, fallback) { return MT.Utils.t(key, null, fallback); }
  function lang() { return MT.PaperLocale.getLanguage(MT.State.getMetadata().subject); }

  /* ---------- Public API ---------- */

  // Mount the list into `el`. opts.onOpenQuestion(sectionId, questionId) is
  // invoked when a question row is tapped (the workspace opens the full-page
  // editor). opts.initialSectionId expands one section on first render.
  function mount(el, opts) {
    opts = opts || {};
    container = el;
    onOpenQuestion = opts.onOpenQuestion || null;
    expandedSection = opts.initialSectionId || expandedSection;
    if (unsubscribe) unsubscribe();
    unsubscribe = MT.State.subscribe(function () { render(); });
    render();
  }

  function unmount() {
    if (unsubscribe) { unsubscribe(); unsubscribe = null; }
    container = null;
    onOpenQuestion = null;
  }

  function setActive(questionId) { activeQuestionId = questionId || null; }
  function setExpanded(sectionId) { expandedSection = sectionId || null; }

  // Expand + reveal a section/question after returning from the editor.
  function reveal(sectionId, questionId) {
    expandedSection = sectionId || expandedSection;
    activeQuestionId = questionId || activeQuestionId;
    render();
  }

  function refresh() { render(); }

  /* ---------- Rendering ---------- */

  function render() {
    if (!container || !document.body.contains(container)) return;
    // Preserve scroll across re-renders (reorder/delete shouldn't jump to top).
    var scroller = findScrollParent(container);
    var savedScroll = scroller ? scroller.scrollTop : 0;

    container.innerHTML = '';
    var wrap = MT.Utils.el('div', { class: 'qlist' });
    container.appendChild(wrap);

    var exam = MT.State.get();
    if (!exam.sections || exam.sections.length === 0) {
      var empty = MT.Utils.el('div', { class: 'qlist-empty' });
      empty.appendChild(MT.Utils.el('div', { class: 'empty-icon' }, '📂'));
      empty.appendChild(MT.Utils.el('div', {}, t('ui.emptyQuestionList', 'အပိုင်း မရှိသေးပါ — “မေးခွန်းခေါင်းစဉ် ထည့်မည်” ကို နှိပ်၍ စတင်ပါ။')));
      wrap.appendChild(empty);
      wrap.appendChild(renderAddSectionBar());
    } else {
      var sectionNum = 0;
      exam.sections.forEach(function (section, index) {
        var num = section.type === 'section_a' ? null : ++sectionNum;
        wrap.appendChild(renderSection(section, index, num, exam.sections.length));
      });
      wrap.appendChild(renderAddSectionBar());
    }

    if (scroller) scroller.scrollTop = savedScroll;
  }

  function renderAddSectionBar() {
    var bar = MT.Utils.el('div', { class: 'qlist-addbar' });
    var btn = MT.Utils.el('button', { type: 'button', class: 'btn secondary' },
      '+ ' + t('ui.addSectionTitle', 'မေးခွန်းခေါင်းစဉ် ထည့်မည်'));
    btn.addEventListener('click', function () {
      if (MT.PaperUi && MT.PaperUi.openAddSectionModal) {
        MT.PaperUi.openAddSectionModal(function (section) {
          // openAddSectionModal() leaves the modal open for callers that pass
          // onDone (they normally re-open their own popup) — close it here.
          MT.Modal.close();
          if (section) expandedSection = section.id;
          render();
        });
      }
    });
    bar.appendChild(btn);
    return bar;
  }

  function typeBadgeLabel(type) {
    var l = lang();
    if (type === 'section_a') return l === 'en' ? 'Section' : 'အပိုင်း';
    return MT.ExamModel.getSectionTypeLabel(type, l);
  }

  // Clickable number chip that opens the number-style dropdown (per scope).
  function makeNumberChip(num, styleId, scope, sectionObj) {
    var btn = MT.Utils.el('button', { type: 'button', class: scope === 'question' ? 'sp-num' : 'section-num' },
      MT.NumberStyles.display(num, styleId, lang()));
    MT.NumberStyles.bindDropdown(btn, styleId, function (id) {
      if (scope === 'question') sectionObj.questionNumberStyle = id;
      else sectionObj.numberStyle = id;
      MT.State.update(function () {});
    });
    return btn;
  }

  function renderSection(section, index, sectionNum, sectionTotal) {
    var isOpen = expandedSection === section.id;
    var sec = MT.Utils.el('div', {
      class: 'qlist-section st-' + section.type + (isOpen ? ' open' : '') + (section.hideTitle ? ' title-hidden' : ''),
      draggable: 'true'
    });

    var head = MT.Utils.el('div', { class: 'qlist-section-head' });
    head.appendChild(MT.Utils.el('span', { class: 'qlist-chevron' }, section.type === 'section_a' ? '' : '▸'));
    if (sectionNum != null) {
      var secStyle = section.numberStyle || MT.State.get().settings.sectionNumberStyle || 'arabic';
      head.appendChild(makeNumberChip(sectionNum, secStyle, 'section', section));
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

    // Reorder happens via drag-and-drop on the section row (HTML5 DnD on
    // desktop, touch handling on the row itself); the old ↑/↓ buttons are gone.

    var delBtn = MT.Utils.el('button', { type: 'button', class: 'btn sm ghost qlist-del', title: t('ui.delete', 'ဖျက်မည်') }, '✕');
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
      if (e.target.closest('input') || e.target.closest('button')) return;
      if (section.type === 'section_a') return;
      if (expandedSection === section.id) expandedSection = null;
      else expandedSection = section.id;
      render();
    });
    sec.appendChild(head);

    // Drag & drop reorder sections
    sec.addEventListener('dragstart', function (e) {
      justDragged = true;
      dragSectionIndex = index;
      sec.classList.add('sec-dragging');
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', String(index)); } catch (err) {}
    });
    sec.addEventListener('dragend', function () {
      setTimeout(function () { justDragged = false; }, 0);
      dragSectionIndex = null;
      sec.classList.remove('sec-dragging');
      clearInsertIndicator();
    });
    sec.addEventListener('dragover', function (e) {
      if (dragSectionIndex === null) return;   // a question row is being dragged
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      var rect = sec.getBoundingClientRect();
      var before = (e.clientY < rect.top + rect.height / 2);
      var cls = before ? 'sec-insert-before' : 'sec-insert-after';
      if (insertTargetEl && insertTargetEl !== sec) clearInsertIndicator();
      insertTargetEl = sec;
      sec.classList.remove('sec-insert-before', 'sec-insert-after');
      sec.classList.add(cls);
    });
    sec.addEventListener('dragleave', function (e) {
      if (e.relatedTarget && sec.contains(e.relatedTarget)) return;
      sec.classList.remove('sec-insert-before', 'sec-insert-after');
      if (insertTargetEl === sec) insertTargetEl = null;
    });
    sec.addEventListener('drop', function (e) {
      e.preventDefault();
      var rect = sec.getBoundingClientRect();
      var before = (e.clientY < rect.top + rect.height / 2);
      clearInsertIndicator();
      if (dragSectionIndex === null) return;
      var pos = before ? index : index + 1;
      var idx = (dragSectionIndex === pos || dragSectionIndex === pos - 1) ? null
        : (dragSectionIndex < pos ? pos - 1 : pos);
      if (idx === null || idx === dragSectionIndex) { dragSectionIndex = null; return; }
      MT.State.moveSection(dragSectionIndex, idx);
      dragSectionIndex = null;
    });

    if (isOpen && section.type !== 'section_a') {
      sec.appendChild(renderSectionBody(section));
    }
    return sec;
  }

  function renderSectionBody(section) {
    var body = MT.Utils.el('div', { class: 'qlist-section-body' });
    var listEl = MT.Utils.el('div', { class: 'qlist-questions' });
    body.appendChild(listEl);
    renderQuestions(listEl, section);

    var addWrap = MT.Utils.el('div', { class: 'exs-add-q' });
    var addBtn = MT.Utils.el('button', { type: 'button', class: 'btn btn-ok' },
      '+ ' + t('ui.addQuestion', 'မေးခွန်း ထည့်မည်'));
    addBtn.addEventListener('click', function () {
      if (MT.SectionPopup && MT.SectionPopup.openStructurePopup) {
        // Route the newly-added question to the full-page editor.
        MT.SectionPopup.openStructurePopup(section.id, function (sid, qid) {
          if (onOpenQuestion) onOpenQuestion(sid, qid);
        });
      }
    });
    addWrap.appendChild(addBtn);
    body.appendChild(addWrap);
    return body;
  }

  function renderQuestions(listEl, section) {
    listEl.innerHTML = '';
    if (!section.questions || section.questions.length === 0) {
      listEl.appendChild(MT.Utils.el('div', { class: 'sp-empty mt-muted mt-small' },
        t('ui.noQuestionsYet', 'မေးခွန်း မရှိသေးပါ — "မေးခွန်း ထည့်မည်" ကို နှိပ်ပါ။')));
      return;
    }
    section.questions.forEach(function (q, index) {
      listEl.appendChild(renderQuestionRow(listEl, section, q, index));
    });
  }

  function renderQuestionRow(listEl, section, q, index) {
    var row = MT.Utils.el('div', {
      class: 'qlist-qrow st-' + section.type + (activeQuestionId === q.id ? ' is-current' : ''),
      draggable: 'true'
    });

    var qStyle = (section.questionNumberStyle || MT.State.get().settings.questionNumberStyle || 'arabic');
    row.appendChild(makeNumberChip(q.number, qStyle, 'question', section));

    if (q.reviewStatus && q.reviewStatus !== 'approved' && q.reviewStatus !== 'none') {
      row.appendChild(MT.Utils.el('span', { class: 'review-badge ' + q.reviewStatus },
        MT.QuestionModel.getReviewLabel(q)));
    }

    var textContent = (q.text || '').replace(/\r?\n/g, ' ').slice(0, 80);
    var textHtml = MT.MathRenderer.renderTextWithMath(textContent);
    if (!textContent && q.subQuestions && q.subQuestions.length > 0) {
      var subStyleId = (section.subQuestionNumberStyle || MT.State.get().settings.subQuestionNumberStyle || 'parenthesizedLettersLower');
      textHtml = q.subQuestions.map(function (_, i) {
        return '<span class="sp-sub-letter">' + MT.NumberStyles.display(i + 1, subStyleId, lang()) + '</span>';
      }).join(' ');
    }
    textHtml = textHtml || MT.Utils.escapeHtml(t('ui.emptyQuestionShort', '(ဗလာ)'));
    row.appendChild(MT.Utils.el('div', { class: 'sp-text', html: textHtml }));
    row.appendChild(MT.Utils.el('span', { class: 'sp-marks' },
      '(' + MT.PaperLocale.formatMarks(lang(), q.marks) + ')'));

    // Delete control (reordering is handled by drag-and-drop on the row)
    var ctrl = MT.Utils.el('div', { class: 'qlist-ctrl' });
    var delBtn = MT.Utils.el('button', { type: 'button', class: 'btn sm ghost qlist-del', title: t('ui.delete', 'ဖျက်မည်') }, '✕');
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
    ctrl.appendChild(delBtn);
    row.appendChild(ctrl);

    // Tap the row → open the dedicated full-page editor
    row.addEventListener('click', function (e) {
      if (justDragged) return;
      if (e.target.closest('button')) return;
      activeQuestionId = q.id;
      if (onOpenQuestion) onOpenQuestion(section.id, q.id);
    });

    // Drag & drop reorder questions (same section only)
    row.addEventListener('dragstart', function (e) {
      justDragged = true;
      dragQuestionIndex = index;
      dragQuestionSectionId = section.id;
      row.classList.add('row-dragging');
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', String(index)); } catch (err) {}
    });
    row.addEventListener('dragend', function () {
      setTimeout(function () { justDragged = false; }, 0);
      dragQuestionIndex = null;
      dragQuestionSectionId = null;
      row.classList.remove('row-dragging');
      listEl.querySelectorAll('.row-dragover').forEach(function (el) { el.classList.remove('row-dragover'); });
    });
    row.addEventListener('dragover', function (e) {
      // Only accept a question drag that started in this same section —
      // MT.State.moveQuestion(sectionId, from, to) is section-scoped.
      if (dragQuestionIndex === null || dragQuestionSectionId !== section.id) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      row.classList.add('row-dragover');
    });
    row.addEventListener('dragleave', function () { row.classList.remove('row-dragover'); });
    row.addEventListener('drop', function (e) {
      e.preventDefault();
      row.classList.remove('row-dragover');
      if (dragQuestionIndex === null || dragQuestionSectionId !== section.id) return;
      if (dragQuestionIndex === index) return;
      MT.State.moveQuestion(section.id, dragQuestionIndex, index);
      dragQuestionIndex = null;
      dragQuestionSectionId = null;
    });

    return row;
  }

  /* ---------- Helpers ---------- */

  function clearInsertIndicator() {
    if (insertTargetEl) {
      insertTargetEl.classList.remove('sec-insert-before', 'sec-insert-after');
      insertTargetEl = null;
    }
  }

  function findScrollParent(node) {
    var el = node;
    while (el && el !== document.body) {
      var st = el.nodeType === 1 ? window.getComputedStyle(el) : null;
      if (st && /(auto|scroll|overlay)/.test(st.overflowY || '')) return el;
      el = el.parentNode;
    }
    return null;
  }

  return {
    mount: mount, unmount: unmount, refresh: refresh,
    setActive: setActive, setExpanded: setExpanded, reveal: reveal
  };
})();
