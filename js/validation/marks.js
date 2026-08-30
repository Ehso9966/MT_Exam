window.MT = window.MT || {};

MT.Validation = MT.Validation || {};

MT.Validation.Marks = (function () {
  function t(key, vars) { return MT.Utils.t(key, vars); }
  function digits(n) { return MT.Utils.digits(n); }
  function sectionTitle(s) {
    if (!s) return '';
    var lang = MT.Utils.t && MT.I18n && MT.I18n.getLang ? MT.I18n.getLang() : 'my';
    return (MT.PaperLocale && MT.PaperLocale.getSectionTitle) ? MT.PaperLocale.getSectionTitle(s, lang) : (s.title || '');
  }

  function validateTotalMarks(exam) {
    const results = [];
    if (!exam || !exam.metadata) return results;
    const target = Number(exam.metadata.totalMarks) || 0;
    if (target <= 0) return results;

    // Empty paper: nothing to compare against yet — avoid "50 vs 0" noise.
    if (!Array.isArray(exam.sections) || exam.sections.length === 0 ||
        MT.ExamModel.questionCount(exam) === 0) {
      return results;
    }

    const actual = MT.ExamModel.examTotalMarks(exam);
    const diff = target - actual;

    if (diff !== 0) {
      const sectionDetails = exam.sections.map(function (s) {
        var sm = MT.ExamModel.sectionMarks(s);
        return sectionTitle(s) + ': ' + sm;
      }).join(', ');

      var msg;
      if (diff > 0) {
        msg = t('valid.totalMarksShort', { target: digits(target), actual: digits(actual), diff: digits(diff) });
      } else {
        msg = t('valid.totalMarksOver', { target: digits(target), actual: digits(actual), diff: digits(-diff) });
      }

      results.push({
        type: diff > 0 ? 'warning' : 'error',
        field: 'totalMarks',
        message: msg,
        details: sectionDetails,
        diff: diff
      });
    }
    return results;
  }

  function validateSectionMarks(exam) {
    const results = [];
    if (!exam || !exam.sections) return results;
    exam.sections.forEach(function (s) {
      const actual = MT.ExamModel.sectionMarks(s);
      if (s.marks > 0 && actual !== s.marks) {
        results.push({
          type: 'warning',
          field: 'sectionMarks',
          sectionId: s.id,
          message: t('valid.sectionMarks', { title: sectionTitle(s), target: digits(s.marks), actual: digits(actual) })
        });
      }
    });
    return results;
  }

  function validateQuestionMarks(exam) {
    const results = [];
    if (!exam || !exam.sections) return results;
    exam.sections.forEach(function (s) {
      s.questions.forEach(function (q) {
        const m = Number(q.marks);
        if (isNaN(m) || m < 0) {
          results.push({
            type: 'error',
            field: 'questionMarks',
            sectionId: s.id,
            questionId: q.id,
            message: t('valid.badQuestionMarks', { n: digits(q.number) })
          });
        }
      });
    });
    return results;
  }

  function validateAll(exam) {
    return []
      .concat(validateTotalMarks(exam))
      .concat(validateSectionMarks(exam))
      .concat(validateQuestionMarks(exam));
  }

  return { validateAll };
})();