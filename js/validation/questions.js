window.MT = window.MT || {};

MT.Validation = MT.Validation || {};

MT.Validation.Questions = (function () {
  function t(key, vars) { return MT.Utils.t(key, vars); }
  function digits(n) { return MT.Utils.digits(n); }
  function sectionTitle(s) {
    if (!s) return '';
    var lang = MT.I18n && MT.I18n.getLang ? MT.I18n.getLang() : 'my';
    return (MT.PaperLocale && MT.PaperLocale.getSectionTitle) ? MT.PaperLocale.getSectionTitle(s, lang) : (s.title || '');
  }

  function validateMissingOptions(exam) {
    const results = [];
    if (!exam || !exam.sections) return results;
    exam.sections.forEach(function (s) {
      s.questions.forEach(function (q) {
        if (q.type === 'mcq') {
          const options = (q.options || []).filter(function (o) { return o && o.trim() !== ''; });
          if (options.length < 2) {
            results.push({
              type: 'error',
              field: 'missingOptions',
              sectionId: s.id,
              questionId: q.id,
              message: t('valid.missingOptions', { n: digits(q.number) })
            });
          }
        }
      });
    });
    return results;
  }

  function validateDuplicateNumbers(exam) {
    const results = [];
    if (!exam || !exam.sections) return results;
    // With per-section numbering, numbers restart at 1 in each section, so
    // duplicates across sections are expected — not a problem.
    if (exam.settings && exam.settings.numbering === 'section') return results;
    const seen = {};
    exam.sections.forEach(function (s) {
      s.questions.forEach(function (q) {
        if (q.number != null) {
          if (seen[q.number]) {
            results.push({
              type: 'warning',
              field: 'duplicateNumber',
              sectionId: s.id,
              questionId: q.id,
              message: t('valid.duplicateNumber', { n: digits(q.number) })
            });
          } else {
            seen[q.number] = true;
          }
        }
      });
    });
    return results;
  }

  function validateReviewStatus(exam) {
    const results = [];
    if (!exam || !exam.sections) return results;
    exam.sections.forEach(function (s) {
      s.questions.forEach(function (q) {
        if (q.reviewStatus && q.reviewStatus !== 'approved') {
          results.push({
            type: 'warning',
            field: 'reviewStatus',
            sectionId: s.id,
            questionId: q.id,
            message: t('valid.notReviewed', { n: digits(q.number), section: sectionTitle(s) })
          });
        }
      });
    });
    return results;
  }

  function validateQuestions(exam) {
    return []
      .concat(validateMissingOptions(exam))
      .concat(validateDuplicateNumbers(exam))
      .concat(validateReviewStatus(exam));
  }

  return { validateQuestions };
})();