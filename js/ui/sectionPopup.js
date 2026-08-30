window.MT = window.MT || {};

MT.SectionPopup = (function () {
  var dragIndex = null;
  var justDragged = false;
  var returnHandler = null;

  function t(key, fallback) { return MT.Utils.t(key, null, fallback); }

  // When the accordion popup is open it registers a handler here so any
  // add-question sub-popup returns to the accordion instead of a modal chain.
  function setReturnHandler(fn) {
    returnHandler = fn || null;
  }

  function returnTo(sectionId, questionId) {
    if (returnHandler) { returnHandler(sectionId, questionId); return; }
    if (questionId) {
      MT.QuestionPopupEditor.openQuestionEditor(sectionId, questionId, {
        onBack: function () { MT.SectionPopup.open(sectionId); }
      });
    } else {
      MT.SectionPopup.open(sectionId);
    }
  }

  function optionHtml(icon, title, desc) {
    return '<span class="aq-icon">' + icon + '</span>' +
      '<span class="aq-text"><b>' + MT.Utils.escapeHtml(title) + '</b>' +
      '<span class="aq-desc">' + MT.Utils.escapeHtml(desc) + '</span></span>';
  }

  function openStructurePopup(sectionId) {
    var sec = MT.State.getSection(sectionId);
    if (!sec) return;
    // For tf and mcq sections, skip the structure chooser — sub-parts don't
    // apply to true/false or multiple-choice questions.
    if (sec.type === 'tf' || sec.type === 'mcq') {
      openSourcePopup(sectionId);
      return;
    }

    var body = MT.Utils.el('div', { class: 'add-question-popup' });
    body.appendChild(MT.Utils.el('div', { class: 'add-question-popup-title' },
      t('ui.chooseQuestionType', 'မေးခွန်း ပုံစံ ရွေးပါ')));

    var singleBtn = MT.Utils.el('button', {
      type: 'button',
      class: 'add-question-option',
      html: optionHtml('1.', t('ui.questionTypeSingle', 'မေးခွန်း တစ်ခုတည်း'), t('ui.questionTypeSingleDesc', '1. မေးခွန်း စာသား'))
    });
    singleBtn.addEventListener('click', function () {
      MT.Modal.close();
      openSourcePopup(sectionId);
    });
    body.appendChild(singleBtn);

    var partsBtn = MT.Utils.el('button', {
      type: 'button',
      class: 'add-question-option',
      html: optionHtml('1.', t('ui.questionTypeParts', 'မေးခွန်းငယ်များပါ'), t('ui.questionTypePartsDesc', '1. (a) (b)'))
    });
    partsBtn.addEventListener('click', function () {
      MT.Modal.close();
      addPartsQuestion(sectionId);
    });
    body.appendChild(partsBtn);

    MT.Modal.open({
      title: t('ui.addQuestion', 'မေးခွန်းထည့်မည်'),
      content: body,
      sheet: true,
      tone: 'warn',
      help: 'help.addQuestionStructure',
      onClose: function () { returnTo(sectionId); }
    });
  }

  function addPartsQuestion(sectionId) {
    var sec = MT.State.getSection(sectionId);
    if (!sec) return;
    var q = MT.QuestionModel.create({
      type: sec.type,
      text: '',
      subQuestions: [
        { id: MT.ids.questionId(), text: '', marks: 1 },
        { id: MT.ids.questionId(), text: '', marks: 1 }
      ]
    });
    MT.State.addQuestion(sectionId, q);
    MT.Numbering.apply(MT.State.get());
    MT.State.update(function () {});
    MT.Toast.success(t('ui.questionAdded', 'မေးခွန်း ထည့်ပြီ — စာသား ရိုက်ထည့်ပါ'));
    returnTo(sectionId, q.id);
  }

  function openSourcePopup(sectionId) {
    var body = MT.Utils.el('div', { class: 'add-question-popup' });
    body.appendChild(MT.Utils.el('div', { class: 'add-question-popup-title' },
      t('ui.chooseQuestionSource', 'မေးခွန်း ထည့်ရန် နည်းလမ်း ရွေးပါ')));

    var manualBtn = MT.Utils.el('button', {
      type: 'button',
      class: 'add-question-option',
      html: optionHtml('✏️', t('ui.manualWrite', 'ကိုယ်တိုင်ရေးမည်'), t('ui.manualWriteDesc', 'စာသား ကိုယ်တိုင် ရိုက်ထည့်မည်'))
    });
    manualBtn.addEventListener('click', function () {
      MT.Modal.close();
      var sec = MT.State.getSection(sectionId);
      if (!sec) return;
      var q = MT.QuestionModel.create({ type: sec.type, text: '' });
      MT.State.addQuestion(sectionId, q);
      MT.Numbering.apply(MT.State.get());
      MT.State.update(function () {});
      MT.Toast.success(t('ui.questionAdded', 'မေးခွန်း ထည့်ပြီ — စာသား ရိုက်ထည့်ပါ'));
      returnTo(sectionId, q.id);
    });
    body.appendChild(manualBtn);

    var imageBtn = MT.Utils.el('button', {
      type: 'button',
      class: 'add-question-option',
      html: optionHtml('📷', t('ui.addQuestionImage', 'မေးခွန်း ထည့်မည် (ပုံဖြင့်)'), t('ui.addQuestionImageDesc', 'ပုံမှ AI ဖြင့် ဖတ်၍ ထည့်မည်'))
    });
    imageBtn.addEventListener('click', function () {
      MT.Modal.close();
      MT.CropFlow.open({
        sectionId: sectionId,
        title: t('crop.addTitle', '✂️ ပုံ ချုံ့ဖြတ်ပြီး မေးခွန်း ထည့်မည်'),
        openEditor: true,
        onBack: function () { returnTo(sectionId); },
        onQuestions: function (questions) {
          MT.State.insertQuestions(sectionId, questions);
          MT.Numbering.apply(MT.State.get());
          MT.State.update(function () {});
        }
      });
    });
    body.appendChild(imageBtn);

    MT.Modal.open({
      title: t('ui.addQuestion', 'မေးခွန်းထည့်မည်'),
      content: body,
      sheet: true,
      tone: 'warn',
      help: 'help.addQuestionSource',
      onClose: function () { returnTo(sectionId); }
    });
  }

  function open(sectionId) {
    var section = MT.State.getSection(sectionId);
    if (!section) return;

    var body = document.createElement('div');
    body.className = 'section-popup-body';

    var head = document.createElement('div');
    head.className = 'section-popup-head';

    var titleInput = MT.Utils.el('input', {
      type: 'text',
      class: 'input section-popup-title',
      value: MT.PaperLocale.getEditableTitle(section),
      placeholder: t('ui.sectionTitlePlaceholder', 'အပိုင်း ခေါင်းစဉ်')
    });
    titleInput.addEventListener('input', function () {
      var s = MT.State.getSection(sectionId);
      if (s) { s.title = titleInput.value; MT.State.updateSilent(function () {}); }
      if (MT.App && MT.App.schedulePreviewRender) MT.App.schedulePreviewRender();
    });
    head.appendChild(titleInput);
    body.appendChild(head);

    var isHeading = section.type === 'section_a';

    if (!isHeading) {
      var listWrap = document.createElement('div');
      listWrap.className = 'section-popup-list';
      body.appendChild(listWrap);
    }

    var footer = isHeading ? null : function (close) {
      var wrap = MT.Utils.el('div', { style: { display: 'flex', gap: '8px', width: '100%', justifyContent: 'flex-end' } });

      var addBtn = MT.Utils.el('button', { type: 'button', class: 'btn footer-add-btn' }, t('ui.addQuestion', 'မေးခွန်းထည့်မည်'));
      addBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        openStructurePopup(sectionId);
      });
      wrap.appendChild(addBtn);
      return wrap;
    };

    MT.Modal.open({
      title: '📋 ' + (MT.PaperLocale.getEditableTitle(section) || MT.ExamModel.getSectionTypeLabel(section.type, (MT.I18n && MT.I18n.getLang) ? MT.I18n.getLang() : 'my')),
      content: body,
      size: 'modal-lg',
      sheet: true,
      help: 'help.section',
      footer: footer
    });

    if (isHeading) return;

    function renderList() {
      var s = MT.State.getSection(sectionId);
      if (!s) { MT.Modal.close(); return; }
      listWrap.innerHTML = '';
      if (!s.questions || s.questions.length === 0) {
        listWrap.appendChild(MT.Utils.el('div', { class: 'empty-state sp-empty' },
          t('ui.noQuestionsYet', 'မေးခွန်း မရှိသေးပါ — အောက်က "မေးခွန်း ထည့်မည်" ကို နှိပ်ပါ။')));
        return;
      }
      s.questions.forEach(function (q, index) {
        listWrap.appendChild(renderRow(s, q, index));
        if (q.subQuestions && q.subQuestions.length > 0) {
          q.subQuestions.forEach(function (sub, i) {
            listWrap.appendChild(renderSubRow(s, q, sub, i));
          });
        }
      });
    }

    function finalize() {
      MT.Numbering.apply(MT.State.get());
      MT.State.update(function () {});
      renderList();
    }

    function renderRow(s, q, index) {
      var row = MT.Utils.el('div', { class: 'section-popup-row', draggable: 'true' });

      var num = MT.Utils.el('span', { class: 'sp-num' }, MT.Utils.toMyanmarDigits(q.number) + '.');
      row.appendChild(num);

      if (q.reviewStatus && q.reviewStatus !== 'none') {
        var chip = MT.Utils.el('span', { class: 'review-badge ' + q.reviewStatus }, MT.QuestionModel.getReviewLabel(q));
        row.appendChild(chip);
      }

      var lang = MT.PaperLocale.getLanguage(MT.State.getMetadata().subject);
      var textContent = (q.text || '').replace(/\r?\n/g, ' ').slice(0, 80);
      if (!textContent && q.subQuestions && q.subQuestions.length > 0) {
        var subStyleId = (MT.State.get().settings && MT.State.get().settings.subQuestionNumberStyle) || 'parenthesizedLettersLower';
        textContent = q.subQuestions.map(function (_, i) { return MT.NumberStyles.display(i + 1, subStyleId, lang); }).join(' ');
      }
      textContent = textContent || t('ui.emptyQuestionShort', '(ဗလာ)');
      var text = MT.Utils.el('div', { class: 'sp-text', html: MT.MathRenderer.renderTextWithMath(textContent) });
      row.appendChild(text);

      var marks = MT.Utils.el('span', { class: 'sp-marks' },
        '(' + MT.PaperLocale.formatMarks(lang, q.marks) + ')');
      row.appendChild(marks);

      var delBtn = MT.Utils.el('button', { type: 'button', class: 'btn sm ghost sp-del', title: t('ui.delete', 'ဖျက်မည်') }, '✕');
      delBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        var snippet = (q.text || '').replace(/\r?\n/g, ' ').slice(0, 40) || t('ui.emptyQuestionShort', '(ဗလာ)');
        MT.Dialogs.confirm({
          message: t('ui.deleteQuestionQ', 'မေးခွန်း ဖျက်မည်လား?') + ' "' + snippet + '"',
          okText: t('ui.delete', 'ဖျက်မည်')
        }).then(function (ok) {
          if (ok) { MT.State.removeQuestion(s.id, q.id); finalize(); }
        });
      });
      row.appendChild(delBtn);

      row.addEventListener('click', function () {
        if (justDragged) return;
        MT.QuestionPopupEditor.openQuestionEditor(s.id, q.id, {
          onBack: function () { MT.SectionPopup.open(s.id); }
        });
      });

      // Drag & drop reordering
      row.addEventListener('dragstart', function (e) {
        justDragged = true;
        dragIndex = index;
        row.classList.add('section-popup-row-dragging');
        e.dataTransfer.effectAllowed = 'move';
        try { e.dataTransfer.setData('text/plain', String(index)); } catch (err) {}
      });
      row.addEventListener('dragend', function () {
        setTimeout(function () { justDragged = false; }, 0);
        dragIndex = null;
        row.classList.remove('section-popup-row-dragging');
        listWrap.querySelectorAll('.section-popup-row-dragover').forEach(function (el) {
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
        if (dragIndex === null || dragIndex === index) return;
        MT.State.moveQuestion(s.id, dragIndex, index);
        dragIndex = null;
        finalize();
      });

      return row;
    }

    // Sub-question part rows (a), (b)... — editable text + ∑ math + 📷 image
    function renderSubRow(s, q, sub, i) {
      var row = MT.Utils.el('div', { class: 'sp-sub-row' });
      var subStyleId = (MT.State.get().settings && MT.State.get().settings.subQuestionNumberStyle) || 'parenthesizedLettersLower';
      var subLang = (MT.I18n && MT.I18n.getLang) ? MT.I18n.getLang() : 'my';
      var letterBtn = MT.Utils.el('button', { type: 'button', class: 'sp-sub-letter' },
        MT.NumberStyles.display(i + 1, subStyleId, subLang));
      MT.NumberStyles.bindDropdown(letterBtn, subStyleId, function (id) {
        MT.State.get().settings.subQuestionNumberStyle = id;
        MT.State.update(function () {});
        finalize();
      });
      row.appendChild(letterBtn);

      var input = MT.Utils.el('input', {
        type: 'text',
        class: 'input sp-sub-input',
        value: sub.text || '',
        placeholder: t('popup.subTextareaPlaceholder', 'မေးခွန်းငယ် စာသား ရိုက်ပါ…')
      });
      input.addEventListener('input', function () {
        var qq = MT.State.getQuestion(s.id, q.id);
        if (!qq) return;
        var next = (qq.subQuestions || []).map(function (ss) {
          if (ss === sub || ss.id === sub.id) return Object.assign({}, ss, { text: input.value });
          return ss;
        });
        MT.State.updateQuestion(s.id, q.id, { subQuestions: next });
      });
      row.appendChild(input);

      var mathWrap = MT.Utils.el('div', { class: 'sp-sub-action' });
      MT.MathToolbar.renderMathDropdown(mathWrap, input);
      row.appendChild(mathWrap);

      var imgBtn = MT.Utils.el('button', {
        type: 'button',
        class: 'btn sm secondary sp-sub-img',
        title: t('popup.subAddImage', '📷 မေးခွန်းထည့်မည်')
      }, '📷');
      imgBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        MT.CropFlow.open({
          sectionId: s.id,
          title: t('popup.subAddImage', '📷 မေးခွန်းထည့်မည်'),
          onQuestions: function (questions) {
            if (!questions || questions.length === 0) return;
            var text = questions[0].text || questions[0].question || '';
            if (!text) return;
            var qq = MT.State.getQuestion(s.id, q.id);
            if (!qq) return;
            var next = (qq.subQuestions || []).map(function (ss) {
              if (ss === sub || ss.id === sub.id) return Object.assign({}, ss, { text: text });
              return ss;
            });
            MT.State.updateQuestion(s.id, q.id, { subQuestions: next });
            renderList();
            MT.Toast.success(t('popup.subAdded', 'မေးခွန်းငယ် ထည့်ပြီး'));
          }
        });
      });
      row.appendChild(imgBtn);

      return row;
    }

    renderList();
  }

  return { open: open, setReturnHandler: setReturnHandler, openStructurePopup: openStructurePopup };
})();