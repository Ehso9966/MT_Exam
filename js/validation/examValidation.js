window.MT = window.MT || {};

MT.Validation = MT.Validation || {};

MT.Validation.Exam = (function () {
  let lastResults = [];

  function t(key, vars) { return MT.Utils.t(key, vars); }

  function sectionTitle(s) {
    if (!s) return '';
    var lang = MT.I18n && MT.I18n.getLang ? MT.I18n.getLang() : 'my';
    return (MT.PaperLocale && MT.PaperLocale.getSectionTitle) ? MT.PaperLocale.getSectionTitle(s, lang) : (s.title || '');
  }

  function validateAll(exam) {
    const results = [];
    if (!exam) {
      results.push({ type: 'error', field: 'exists', message: t('valid.noExam') });
      return results;
    }

    // Brand-new / empty paper: don't nag with metadata warnings.
    if (!Array.isArray(exam.sections) || exam.sections.length === 0) {
      results.push({ type: 'info', field: 'newExam', message: t('valid.newExam') });
      return results;
    }

    if (!exam.metadata || !exam.metadata.title) {
      results.push({ type: 'warning', field: 'title', message: t('valid.noTitle') });
    }

    if (!exam.metadata || !exam.metadata.subject) {
      results.push({ type: 'info', field: 'subject', message: t('valid.noSubject') });
    }

    if (!exam.metadata || !exam.metadata.duration || exam.metadata.duration < 1) {
      results.push({ type: 'warning', field: 'duration', message: t('valid.noDuration') });
    }

    if (!exam.metadata || !exam.metadata.totalMarks || exam.metadata.totalMarks < 1) {
      results.push({ type: 'warning', field: 'totalMarks', message: t('valid.noTotalMarks') });
    }

    if (!Array.isArray(exam.sections) || exam.sections.length === 0) {
      results.push({ type: 'warning', field: 'sections', message: t('valid.noSections') });
    } else {
      exam.sections.forEach(function (s, i) {
        if (s.type !== 'section_a' && (!Array.isArray(s.questions) || s.questions.length === 0)) {
          results.push({
            type: 'info',
            field: 'sectionEmpty',
            sectionId: s.id,
            message: t('valid.sectionEmpty', { title: sectionTitle(s) || (i + 1) })
          });
        }
      });
    }

    const markResults = MT.Validation.Marks.validateAll(exam);
    const questionResults = MT.Validation.Questions.validateQuestions(exam);

    return results.concat(markResults).concat(questionResults);
  }

  function getStatusLevel(results) {
    const types = results.map(function (r) { return r.type; });
    if (types.indexOf('error') >= 0) return 'error';
    if (types.indexOf('warning') >= 0) return 'warning';
    return 'ok';
  }

  function updateStatusStrip(exam) {
    const strip = document.getElementById('statusStrip');
    const text = document.getElementById('statusText');
    if (!strip || !text) return;

    lastResults = validateAll(exam);
    const results = lastResults;
    const level = getStatusLevel(results);

    strip.className = 'status-strip';
    if (level === 'error') strip.classList.add('has-errors');
    else if (level === 'warning') strip.classList.add('has-warnings');

    var statusMsg = t('valid.statusOk');
    if (results.length > 0) {
      var first = results[0];
      var icon = first.type === 'error' ? '❌' : first.type === 'warning' ? '⚠️' : '💡';
      var firstMsg = first.message;
      if (firstMsg.length > 48) firstMsg = firstMsg.slice(0, 48) + '…';
      statusMsg = icon + ' ' + firstMsg;
      if (results.length > 1) statusMsg += ' (+' + results.length + ')';
    }

    text.textContent = statusMsg;

    var fullList = '';
    if (results.length > 0) {
      fullList = results.map(function (r) {
        return (r.type === 'error' ? '❌' : r.type === 'warning' ? '⚠️' : '💡') + ' ' + r.message;
      }).join('\n');
    }
    text.title = fullList || '';
    text.setAttribute('data-tooltip', formatResultsList(results, '<br>'));

    let chev = document.getElementById('statusChevron');
    if (!chev) {
      chev = document.createElement('span');
      chev.id = 'statusChevron';
      chev.className = 'status-chevron';
      chev.setAttribute('aria-hidden', 'true');
      strip.appendChild(chev);
    }
    chev.textContent = results.length > 0 ? '▾' : '';
    strip.classList.toggle('has-details', results.length > 0);

    // Amber badge showing how many AI questions still need review.
    let reviewBadge = strip.querySelector('.status-review-badge');
    const reviewCount = countNeedsReview(exam);
    if (reviewCount > 0) {
      if (!reviewBadge) {
        reviewBadge = document.createElement('span');
        reviewBadge.className = 'status-review-badge';
        strip.appendChild(reviewBadge);
      }
      reviewBadge.textContent = '⚠️ ' + MT.Utils.toMyanmarDigits(reviewCount) + ' ' + t('valid.needsReview');
    } else if (reviewBadge) {
      reviewBadge.remove();
    }
  }

  function countNeedsReview(exam) {
    var n = 0;
    (exam.sections || []).forEach(function (s) {
      (s.questions || []).forEach(function (q) {
        if (q.reviewStatus === 'ai_extracted' || q.reviewStatus === 'needs_review' || q.reviewStatus === 'edited') n++;
      });
    });
    return n;
  }

  function formatResultsList(results, sep) {
    if (!results || results.length === 0) return '';
    return results.map(function (r) {
      return (r.type === 'error' ? '❌' : r.type === 'warning' ? '⚠️' : '💡') + ' ' + r.message;
    }).join(sep || '\n');
  }

  function openStatusDetails() {
    if (!lastResults || lastResults.length === 0) return;
    const body = document.createElement('div');
    const ul = document.createElement('ul');
    ul.className = 'status-detail-list';
    lastResults.forEach(function (r) {
      const li = document.createElement('li');
      li.className = 'status-detail-' + (r.type || 'info');
      const icon = r.type === 'error' ? '❌' : r.type === 'warning' ? '⚠️' : '💡';
      li.textContent = icon + ' ' + r.message;
      if (r.field) li.setAttribute('data-field', r.field);
      if (r.questionId && r.sectionId) {
        li.classList.add('navigable');
        li.addEventListener('click', function () {
          MT.Modal.close();
          if (MT.ExamSectionsPopup && MT.ExamSectionsPopup.open) {
            MT.ExamSectionsPopup.open(r.sectionId, r.questionId, function () {
              if (MT.Validation && MT.Validation.Exam) MT.Validation.Exam.openStatusDetails();
            });
          } else if (MT.QuestionPopupEditor && MT.QuestionPopupEditor.openQuestionEditor) {
            MT.QuestionPopupEditor.openQuestionEditor(r.sectionId, r.questionId);
          }
        });
      } else if (r.sectionId) {
        li.classList.add('navigable');
        li.addEventListener('click', function () {
          MT.Modal.close();
          if (MT.ExamSectionsPopup && MT.ExamSectionsPopup.open) {
            MT.ExamSectionsPopup.open(r.sectionId, null, function () {
              if (MT.Validation && MT.Validation.Exam) MT.Validation.Exam.openStatusDetails();
            });
          } else if (MT.SectionPopup && MT.SectionPopup.open) {
            MT.SectionPopup.open(r.sectionId);
          }
        });
      }
      ul.appendChild(li);
    });
    body.appendChild(ul);
    if (MT.Modal) {
      MT.Modal.open({
        title: t('valid.detailsTitle'),
        content: body,
        sheet: true,
        help: 'help.validation'
      });
    }
  }

  return { updateStatusStrip, openStatusDetails };
})();