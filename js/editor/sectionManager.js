window.MT = window.MT || {};

MT.SectionManager = (function () {
  let dragIndex = null;
  let justDragged = false;

  function t(key, vars) { return MT.Utils.t(key, vars); }
  function digits(n) { return MT.Utils.digits(n); }

  function renderSectionList(container) {
    const exam = MT.State.get();
    container.innerHTML = '';

    if (!exam.sections || exam.sections.length === 0) {
      container.innerHTML = '<div class="empty-state sections-empty">' +
        '<div class="empty-icon">📂</div>' +
        '<p>' + t('ui.emptySections') + '</p>' +
        '<div class="mt-small mt-muted">' + t('ui.emptySectionsDesc') + '</div>' +
        '</div>';
      return;
    }

    let sectionNum = 0;
    exam.sections.forEach(function (section, index) {
      const card = MT.Utils.el('div', { class: 'card mt-mb section-card', draggable: 'true' });

      // Row 1: number chip + title input + delete (single compact row)
      const row1 = MT.Utils.el('div', { class: 'section-card-row1' });
      if (section.type !== 'section_a') {
        const styleId = (MT.State.get().settings.sectionNumberStyle) || 'arabic';
        const lang = (MT.I18n && MT.I18n.getLang) ? MT.I18n.getLang() : 'my';
        const num = MT.Utils.el('span', { class: 'section-num' }, MT.NumberStyles.display(++sectionNum, styleId, lang));
        row1.appendChild(num);
      }

      const titleInput = MT.Utils.el('input', {
        class: 'input',
        value: MT.PaperLocale.getEditableTitle(section),
        placeholder: t('ui.sectionTitlePlaceholder'),
        'data-section': section.id
      });
      titleInput.addEventListener('input', function () {
        section.title = titleInput.value;
        MT.State.updateSilent(function () {});
      });
      row1.appendChild(titleInput);

      function commitTitle() {
        section.title = titleInput.value;
        MT.State.update(function () {});
        MT.Toast.success(t('ui.sectionTitleSaved'));
      }

      titleInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); commitTitle(); }
      });
      titleInput.addEventListener('blur', function () {
        if (section.title !== titleInput.value) commitTitle();
      });

      const delBtn = MT.Utils.el('button', { class: 'btn sm ghost section-del', title: t('ui.delete') }, '✕');
      delBtn.addEventListener('click', function () {
        var wasModalOpen = MT.Modal && MT.Modal.isOpen && MT.Modal.isOpen();
        MT.Dialogs.confirm({
          message: t('dialog.sectionDeleteConfirm') + ' "' + (section.title || '') + '"',
          okText: t('ui.delete'),
          okClass: 'danger'
        }).then(function (ok) {
          if (ok) {
            MT.State.removeSection(section.id);
            MT.Toast.success(t('ui.deleted', 'ဖျက်ပြီး'), {
              action: { label: t('ui.undo', '↩ ပြန်ပြင်မည်'), onClick: function () { MT.State.undo(); } }
            });
            if (wasModalOpen && MT.PaperUi && MT.PaperUi.openSectionsPopup) {
              MT.PaperUi.openSectionsPopup();
            }
          }
        });
      });
      row1.appendChild(delBtn);

      card.appendChild(row1);

      if (section.type !== 'section_a') {
        const count = MT.Utils.el('div', { class: 'section-card-count' },
          '📝 ' + t('ui.sectionCount') + ' ' + digits(section.questions.length) +
          '   ·   ⭐ ' + t('section.marks') + ' ' + digits(MT.ExamModel.sectionMarks(section)));
        card.appendChild(count);
      }

      // Click card → open that section's question popup (skip input / delete)
      card.addEventListener('click', function (e) {
        if (justDragged) return;
        if (e.target.closest('input') || e.target.closest('.section-del')) return;
        if (MT.ExamSectionsPopup && MT.ExamSectionsPopup.open) MT.ExamSectionsPopup.open(section.id);
        else if (MT.SectionPopup && MT.SectionPopup.open) MT.SectionPopup.open(section.id);
      });

      // Drag & drop reordering
      card.addEventListener('dragstart', function (e) {
        justDragged = true;
        dragIndex = index;
        card.classList.add('section-card-dragging');
        e.dataTransfer.effectAllowed = 'move';
        try { e.dataTransfer.setData('text/plain', String(index)); } catch (err) {}
      });
      card.addEventListener('dragend', function () {
        setTimeout(function () { justDragged = false; }, 0);
        dragIndex = null;
        card.classList.remove('section-card-dragging');
        container.querySelectorAll('.section-card-dragover').forEach(function (el) {
          el.classList.remove('section-card-dragover');
        });
      });
      card.addEventListener('dragover', function (e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        card.classList.add('section-card-dragover');
      });
      card.addEventListener('dragleave', function () {
        card.classList.remove('section-card-dragover');
      });
      card.addEventListener('drop', function (e) {
        e.preventDefault();
        card.classList.remove('section-card-dragover');
        if (dragIndex === null || dragIndex === index) return;
        MT.State.moveSection(dragIndex, index);
        dragIndex = null;
      });

      container.appendChild(card);
    });
  }

  function addSection(type) {
    const titleMap = MT.ExamModel.defaultSectionTitles();
    const section = MT.ExamModel.createSection({
      type: type || MT.Constants.SECTION_TYPES.SHORT,
      title: titleMap[type] || titleMap.short
    });
    MT.State.addSection(section);
    return section;
  }

  return { renderSectionList, addSection };
})();