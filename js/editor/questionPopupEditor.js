window.MT = window.MT || {};

MT.QuestionPopupEditor = (function () {
  function t(key, vars) { return MT.Utils.t(key, vars); }
  function digits(n) { return MT.Utils.digits(n); }

  // Keep the focused field visible when the phone keyboard opens.
  function scrollToField(field) {
    if (!field) return;
    setTimeout(function () {
      try { field.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) { field.scrollIntoView(); }
    }, 60);
  }

  // Renders the question editor inline into `container`. onSaved is called
  // after a save/delete/close action so the caller can collapse the panel.
  function renderQuestionEditor(container, sectionId, questionId, onSaved, focusSubIndex) {
    const section = MT.State.getSection(sectionId);
    if (!section) return;
    const q = MT.State.getQuestion(sectionId, questionId);
    if (!q) return;

    // Always try extracting inline options from text (A. B. C. / က. ခ. ဂ.)
    // — but only for MCQ questions, so it never overrides a deliberate
    // calculation/short/long type.
    if (q.type === 'mcq' && (!q.options || q.options.length === 0)) {
      var extracted = MT.ResponseParser.extractInlineOptions(q.text);
      if (extracted && extracted.options.length >= 2) {
        q.text = extracted.stem;
        q.options = extracted.options;
        q.type = MT.Constants.QUESTION_TYPES.MCQ;
        MT.State.updateQuestion(sectionId, questionId, { text: q.text, options: q.options, type: q.type });
      }
    }

    const body = MT.Utils.el('div', { class: 'popup-editor' });

    // In (a)(b) mode (a question with sub-questions) the main question text is
    // hidden — each sub-question gets its own big section below instead.
    const isSubsMode = !!(q.subQuestions && q.subQuestions.length > 0);
    var textSection = null;
    var textarea = null;
    var syncTextSectionVisibility = null;

    // Question number + section label
    const headerInfo = MT.Utils.el('div', { class: 'popup-editor-info' },
      t('popup.questionInfo', {
        n: digits(q.number),
        section: MT.Utils.escapeHtml(MT.PaperLocale.getEditableTitle(section))
      }));

    // Read-only type badge (colored by type) so teachers know what they edit
    const editorLang = (MT.I18n && MT.I18n.getLang) ? MT.I18n.getLang() : 'my';
    const badgeLabel = section.type === 'section_a'
      ? (editorLang === 'en' ? 'Section' : 'အပိုင်း')
      : MT.ExamModel.getSectionTypeLabel(section.type, editorLang);
    const typeBadge = MT.Utils.el('span', { class: 'exs-type-badge' }, badgeLabel);
    typeBadge.classList.add('st-' + (section.type || 'short'));

    const headRow = MT.Utils.el('div', { class: 'popup-editor-head' });
    headRow.appendChild(headerInfo);
    headRow.appendChild(typeBadge);
    body.appendChild(headRow);

    // Question text section (math toolbar directly under textarea)
    // Hidden when in (a)(b) sub-question mode.
    if (!isSubsMode) {
      textSection = MT.Utils.el('div', { class: 'popup-editor-section' });
      textSection.appendChild(MT.Utils.el('div', { class: 'popup-editor-section-title' },
        t('popup.questionText')));
      textarea = MT.Utils.el('textarea', {
        class: 'popup-editor-textarea',
        placeholder: t('popup.textareaPlaceholder')
      });
      textarea.value = q.text || '';
      textarea.addEventListener('focus', function () { scrollToField(textarea); });
      textSection.appendChild(textarea);

      if (!q.text && !(q.subQuestions && q.subQuestions.length > 0)) {
        textSection.appendChild(MT.Utils.el('div', { class: 'popup-editor-empty-hint' },
          t('popup.textEmptyHint', 'မေးခွန်း စာသား ဗလာဖြစ်နေသည်')));
      }

      const qActions = MT.Utils.el('div', { class: 'qe-sub-actions' });
      const mathWrap = MT.Utils.el('div', { class: 'math-btn-wrap' });
      MT.MathToolbar.renderMathDropdown(mathWrap, textarea);
      qActions.appendChild(mathWrap);

      var mainImgLabel = (q.text && q.text.trim())
        ? t('ui.replaceImage') : t('popup.subAddImage');
      const mainImgBtn = MT.Utils.el('button', { class: 'btn sm secondary qe-sub-img' },
        mainImgLabel);
      mainImgBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        MT.CropFlow.open({
          sectionId: sectionId,
          title: t('popup.subAddImage'),
          onQuestions: function (questions) {
            if (!questions || questions.length === 0) return;
            const text = questions[0].text || questions[0].question || '';
            if (!text) return;
            const sec = MT.State.getSection(sectionId);
            const updates = { text: text };
            if (sec && sec.type === 'mcq' && questions[0].options && questions[0].options.length > 0) {
              updates.options = questions[0].options;
            }
            MT.State.updateQuestion(sectionId, questionId, updates);
            if (textarea) textarea.value = text;
            if (mainImgBtn) mainImgBtn.textContent = t('ui.replaceImage');
            renderTypeFields();
            MT.Toast.success(t('popup.subAdded'));
          }
        });
      });
      qActions.appendChild(mainImgBtn);
      textSection.appendChild(qActions);
      body.appendChild(textSection);

      syncTextSectionVisibility = function () {
        if (!textSection) return;
        var curQ = MT.State.getQuestion(sectionId, questionId);
        var hasSubs = curQ && curQ.subQuestions && curQ.subQuestions.length > 0;
        textSection.style.display = hasSubs ? 'none' : '';
      };
    }

    // Type-specific fields (options for MCQ)
    const typeFields = MT.Utils.el('div', {});
    body.appendChild(typeFields);

    function renderTypeFields() {
      typeFields.innerHTML = '';
      const cur = MT.State.getQuestion(sectionId, questionId);
      const curType = cur ? cur.type : q.type;
      if (curType === 'mcq') {
        typeFields.appendChild(renderOptions(sectionId, q));
      }
    }

    // Sub-questions editor — each part (a), (b)... gets its own big section
    // styled like the main question text (textarea + math toolbar).
    const subsSections = MT.Utils.el('div', { class: 'qe-subs' });
    body.appendChild(subsSections);

    function syncTextSection() {
      if (syncTextSectionVisibility) syncTextSectionVisibility();
    }

    (function renderSubsSections(focusIndex) {
      // Preserve the modal's scroll position across re-renders so adding or
      // removing a sub-question doesn't jump back to the top of the list.
      var scrollEl = null;
      var savedScroll = 0;
      (function findScrollParent(node) {
        var el = node;
        while (el && el !== document.body) {
          var st = el.nodeType === 1 ? window.getComputedStyle(el) : null;
          if (st && /(auto|scroll|overlay)/.test(st.overflowY || '')) { scrollEl = el; break; }
          el = el.parentNode;
        }
      })(subsSections);
      if (scrollEl) savedScroll = scrollEl.scrollTop;
      function restoreScroll() { if (scrollEl) scrollEl.scrollTop = savedScroll; }

      subsSections.innerHTML = '';
      const curQ = MT.State.getQuestion(sectionId, questionId) || q;
      const subs = (curQ && curQ.subQuestions) || [];
      if (subs.length === 0) {
        subsSections.style.display = 'none';
        restoreScroll();
        return;
      }
      subsSections.style.display = '';

      const subStyleId = (MT.State.get().settings && MT.State.get().settings.subQuestionNumberStyle) || 'parenthesizedLettersLower';
      const subLang = (MT.I18n && MT.I18n.getLang) ? MT.I18n.getLang() : 'my';

      subs.forEach(function (sub, si) {
        var sec = MT.Utils.el('div', { class: 'popup-editor-section' });
        var head = MT.Utils.el('div', { class: 'qe-part-head' });
        head.appendChild(MT.Utils.el('div', { class: 'popup-editor-section-title' },
          MT.NumberStyles.display(si + 1, subStyleId, subLang)));
        var rmBtn = MT.Utils.el('button', { class: 'btn sm ghost btn-remove-sub' }, '✕');
        rmBtn.setAttribute('title', t('ui.delete', 'ဖျက်မည်'));
        rmBtn.addEventListener('click', function () {
          var curQ3 = MT.State.getQuestion(sectionId, questionId);
          if (!curQ3) return;
          var next = (curQ3.subQuestions || []).filter(function (ss) {
            return !(ss === sub || ss.id === sub.id);
          });
          MT.State.updateQuestion(sectionId, questionId, { subQuestions: next });
          renderSubsSections();
          syncTextSection();
        });
        head.appendChild(rmBtn);
        sec.appendChild(head);

        var subInput = MT.Utils.el('textarea', {
          class: 'popup-editor-textarea',
          placeholder: t('popup.subTextareaPlaceholder', 'မေးခွန်းငယ် စာသား ရိုက်ပါ…')
        });
        subInput.value = sub.text || '';
        subInput.addEventListener('input', function () {
          var curQ2 = MT.State.getQuestion(sectionId, questionId);
          if (!curQ2) return;
          var next = (curQ2.subQuestions || []).map(function (ss) {
            if (ss === sub || ss.id === sub.id) return Object.assign({}, ss, { text: subInput.value });
            return ss;
          });
          MT.State.updateQuestion(sectionId, questionId, { subQuestions: next });
        });
        subInput.addEventListener('focus', function () { scrollToField(subInput); });
        sec.appendChild(subInput);

        const subActions = MT.Utils.el('div', { class: 'qe-sub-actions' });
        const mathWrap = MT.Utils.el('div', { class: 'math-btn-wrap' });
        MT.MathToolbar.renderMathDropdown(mathWrap, subInput);
        subActions.appendChild(mathWrap);

        var subImgLabel = (sub.text && sub.text.trim())
          ? t('ui.replaceImage') : t('popup.subAddImage');
        const subImgBtn = MT.Utils.el('button', { class: 'btn sm secondary qe-sub-img' },
          subImgLabel);
        subImgBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          MT.CropFlow.open({
            sectionId: sectionId,
            title: t('popup.subAddImage'),
            onQuestions: function (questions) {
              if (!questions || questions.length === 0) return;
              const text = questions[0].text || questions[0].question || '';
              if (!text) return;
              const curQ = MT.State.getQuestion(sectionId, questionId);
              if (!curQ) return;
              const next = (curQ.subQuestions || []).map(function (ss) {
                if (ss === sub || ss.id === sub.id) return Object.assign({}, ss, { text: text });
                return ss;
              });
              MT.State.updateQuestion(sectionId, questionId, { subQuestions: next });
              renderSubsSections();
              syncTextSection();
              MT.Toast.success(t('popup.subAdded'));
            }
          });
        });
        subActions.appendChild(subImgBtn);

        const subMeta = MT.Utils.el('div', { class: 'qe-sub-meta' });
        const subMarksField = MT.Utils.el('div', { class: 'field qe-sub-marks' });
        subMarksField.appendChild(MT.Utils.el('label', {}, t('popup.marks')));
        const subMarksInput = MT.Utils.el('input', {
          type: 'number', class: 'input', value: sub.marks != null ? sub.marks : 1, min: '0', step: '0.5', style: { width: '80px' }
        });
        subMarksInput.addEventListener('change', function () {
          var curQ5 = MT.State.getQuestion(sectionId, questionId);
          if (!curQ5) return;
          var next = (curQ5.subQuestions || []).map(function (ss) {
            if (ss === sub || ss.id === sub.id) return Object.assign({}, ss, { marks: Number(subMarksInput.value) || 0 });
            return ss;
          });
          MT.State.updateQuestion(sectionId, questionId, { subQuestions: next });
        });
        subMarksField.appendChild(subMarksInput);
        subMeta.appendChild(subMarksField);

        if (sub.reviewStatus && sub.reviewStatus !== 'approved') {
          const subReviewField = MT.Utils.el('div', { class: 'field qe-sub-review' });
          subReviewField.appendChild(MT.Utils.el('label', {}, t('popup.reviewStatus')));
          const subBadge = MT.Utils.el('span', { class: 'review-badge ' + sub.reviewStatus },
            MT.QuestionModel.getReviewLabel(sub));
          const subApproveBtn = MT.Utils.el('button', { class: 'btn sm mt-ml' }, t('popup.approve'));
          subApproveBtn.addEventListener('click', function () {
            var curQ6 = MT.State.getQuestion(sectionId, questionId);
            if (!curQ6) return;
            var next = (curQ6.subQuestions || []).map(function (ss) {
              if (ss === sub || ss.id === sub.id) return Object.assign({}, ss, { reviewStatus: MT.Constants.REVIEW_STATUS.APPROVED });
              return ss;
            });
            MT.State.updateQuestion(sectionId, questionId, { subQuestions: next });
            renderSubsSections();
          });
          subReviewField.appendChild(MT.Utils.el('div', { class: 'mt-row' }, [subBadge, subApproveBtn]));
          subMeta.appendChild(subReviewField);
        }

        subActions.appendChild(subMeta);
        sec.appendChild(subActions);

        subsSections.appendChild(sec);
        if (si === focusIndex) {
          setTimeout(function () {
            scrollToField(subInput);
            try { subInput.focus(); } catch (e) {}
          }, 80);
        }
      });
      var addBtn = MT.Utils.el('button', { class: 'btn sm ghost qe-add-sub' },
        '+ ' + t('popup.subAdd'));
      addBtn.addEventListener('click', function () {
        var curQ4 = MT.State.getQuestion(sectionId, questionId);
        if (!curQ4) return;
        var next = (curQ4.subQuestions || []).concat([{ id: MT.ids.questionId(), text: '', marks: 1 }]);
        MT.State.updateQuestion(sectionId, questionId, { subQuestions: next });
        renderSubsSections(next.length - 1);
        syncTextSection();
      });
      subsSections.appendChild(addBtn);
      restoreScroll();
    })(focusSubIndex);

    // Marks + review — only for single questions. Sub-question questions show
    // per-part marks & status inside each (a), (b)... box instead.
    var marksInput = null;
    var approveBtn = null;
    if (!isSubsMode) {
      const metaRow = MT.Utils.el('div', { class: 'popup-editor-meta' });

      const marksField = MT.Utils.el('div', { class: 'field' });
      marksField.appendChild(MT.Utils.el('label', {}, t('popup.marks')));
      marksInput = MT.Utils.el('input', {
        type: 'number', class: 'input', value: q.marks, min: '0', step: '0.5', style: { width: '90px' }
      });
      marksField.appendChild(marksInput);
      metaRow.appendChild(marksField);

      if (q.reviewStatus && q.reviewStatus !== 'approved') {
        const reviewField = MT.Utils.el('div', { class: 'field popup-editor-review' });
        reviewField.appendChild(MT.Utils.el('label', {}, t('popup.reviewStatus')));
        const badge = MT.Utils.el('span', { class: 'review-badge ' + q.reviewStatus },
          MT.QuestionModel.getReviewLabel(q));
        approveBtn = MT.Utils.el('button', { class: 'btn sm mt-ml' }, t('popup.approve'));
        approveBtn.addEventListener('click', function () {
          badge.textContent = t('model.review_approved');
          badge.className = 'review-badge approved';
          approveBtn.disabled = true;
        });
        reviewField.appendChild(MT.Utils.el('div', { class: 'mt-row' }, [badge, approveBtn]));
        metaRow.appendChild(reviewField);
      }

      const metaSection = MT.Utils.el('div', { class: 'popup-editor-section' });
      metaSection.appendChild(MT.Utils.el('div', { class: 'popup-editor-section-title' },
        t('popup.marksAndStatus')));
      metaSection.appendChild(metaRow);
      body.appendChild(metaSection);
    }

    // Inline actions: delete / replace-from-image / save / close
    const actions = MT.Utils.el('div', { class: 'popup-editor-actions' });

    const deleteBtn = MT.Utils.el('button', { class: 'btn danger' }, '🗑 ' + t('ui.delete'));
    deleteBtn.addEventListener('click', function () {
      var snippet = (q.text || '').replace(/\r?\n/g, ' ').slice(0, 40) || t('ui.emptyQuestionShort', '(ဗလာ)');
      MT.Dialogs.confirm({
        title: t('dialog.questionDeleteConfirm'),
        message: t('dialog.questionDeleteConfirm') + ' "' + snippet + '"',
        okText: t('ui.delete'),
        okClass: 'danger'
      }).then(function (ok) {
        if (!ok) return;
        MT.State.removeQuestion(sectionId, questionId);
        MT.Numbering.apply(MT.State.get());
        MT.Toast.success(t('ui.deleted', 'ဖျက်ပြီး'), {
          action: { label: t('ui.undo', '↩ ပြန်ပြင်မည်'), onClick: function () { MT.State.undo(); } }
        });
        if (onSaved) onSaved();
      });
    });
    actions.appendChild(deleteBtn);

    const saveBtn = MT.Utils.el('button', { class: 'btn' }, t('question.save'));
    saveBtn.addEventListener('click', function () {
      const updates = {};
      if (marksInput) updates.marks = Number(marksInput.value) || 0;
      if (approveBtn && approveBtn.disabled) updates.reviewStatus = MT.Constants.REVIEW_STATUS.APPROVED;
      if (textarea) updates.text = textarea.value;
      MT.State.updateQuestion(sectionId, questionId, updates);
      MT.Toast.success(t('popup.savedToast'));
      if (onSaved) onSaved();
    });
    actions.appendChild(saveBtn);

    body.appendChild(actions);

    container.appendChild(body);
    renderTypeFields();
    return body;
  }

  // Modal wrapper (kept for flows that still use a popup, e.g. crop editing).
  function openQuestionEditor(sectionId, questionId, options) {
    const wrap = document.createElement('div');
    const onSaved = function () {
      MT.Modal.close();
      if (options && options.onBack) options.onBack();
    };
    renderQuestionEditor(wrap, sectionId, questionId, onSaved, options && options.focusSubIndex);
    MT.Modal.open({
      title: t('popup.editTitle'),
      content: wrap,
      size: 'modal-lg',
      sheet: true,
      tone: 'warn',
      help: 'help.questionEditor',
      onClose: (options && options.onClose) || null,
      onBack: (options && options.onBack) || null
    });
  }

  function renderOptions(sectionId, q) {
    const section = MT.Utils.el('div', { class: 'popup-editor-section' });
    section.appendChild(MT.Utils.el('div', { class: 'popup-editor-section-title' }, t('popup.options')));
    const container = MT.Utils.el('div', { class: 'qe-options' });
    section.appendChild(container);

    function rebuild() {
      container.innerHTML = '';
      const opts = (q.options || []).slice();
      if (opts.length === 0) opts.push('', '');

      opts.forEach(function (opt, oi) {
        const optRow = MT.Utils.el('div', { class: 'qe-option' });
        const letter = MT.Utils.el('span', { class: 'opt-letter' }, String.fromCharCode(97 + oi) + ')');
        const optInput = MT.Utils.el('input', {
          type: 'text',
          value: opt,
          placeholder: t('popup.optionPlaceholder', { letter: String.fromCharCode(65 + oi) })
        });
        optInput.addEventListener('input', function () {
          const curQ = MT.State.getQuestion(sectionId, q.id);
          if (curQ) {
            curQ.options[oi] = optInput.value;
            MT.State.updateSilent(function () {});
          }
        });
        optInput.addEventListener('focus', function () { scrollToField(optInput); });
        optRow.appendChild(letter);
        optRow.appendChild(optInput);

        if (opts.length > 2) {
          const rmBtn = MT.Utils.el('button', { class: 'btn sm ghost btn-remove-opt' }, '✕');
          rmBtn.addEventListener('click', function () {
            const curQ = MT.State.getQuestion(sectionId, q.id);
            if (curQ) {
              curQ.options.splice(oi, 1);
              MT.State.updateQuestion(sectionId, q.id, { options: curQ.options });
              rebuild();
            }
          });
          optRow.appendChild(rmBtn);
        }
        container.appendChild(optRow);
      });

      const addBtn = MT.Utils.el('button', { class: 'btn sm ghost qe-add-opt' }, t('popup.addOption'));
      addBtn.addEventListener('click', function () {
        const curQ = MT.State.getQuestion(sectionId, q.id);
        if (curQ) {
          curQ.options.push('');
          MT.State.updateQuestion(sectionId, q.id, { options: curQ.options });
          rebuild();
        }
      });
      container.appendChild(addBtn);
    }

    rebuild();
    return section;
  }

  return { openQuestionEditor, renderQuestionEditor };
})();
