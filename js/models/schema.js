window.MT = window.MT || {};

MT.Schema = (function () {
  function t(key) { return MT.Utils.t(key); }

  function validateQuestion(q) {
    const errors = [];
    if (!q) errors.push(t('valid.schemaNoQuestion'));
    else {
      if (!q.id) errors.push(t('valid.schemaNoQuestionId'));
      if (!q.text) errors.push(t('valid.schemaQuestionNoText'));
      if (q.type === 'mcq' && (!Array.isArray(q.options) || q.options.length < 2)) {
        errors.push(t('valid.schemaQuestionBadOptions'));
      }
      if (q.marks == null || q.marks < 0) errors.push(t('valid.schemaQuestionBadMarks'));
    }
    return errors;
  }

  function validateSection(s) {
    const errors = [];
    if (!s) errors.push(t('valid.schemaNoSection'));
    else {
      if (!s.id) errors.push(t('valid.schemaNoSectionId'));
      if (!Array.isArray(s.questions)) errors.push(t('valid.schemaNoQuestionsArray'));
      else {
        s.questions.forEach(function (q, i) {
          const qe = validateQuestion(q);
          qe.forEach(function (e) { errors.push('Question ' + (i + 1) + ': ' + e); });
        });
      }
    }
    return errors;
  }

  function validateExam(exam) {
    const errors = [];
    if (!exam) { errors.push(t('valid.schemaNoExam')); return errors; }
    if (!exam.version) errors.push(t('valid.schemaNoVersion'));
    if (!exam.metadata || typeof exam.metadata !== 'object') errors.push(t('valid.schemaNoMetadata'));
    if (!Array.isArray(exam.sections)) errors.push(t('valid.schemaNoSectionsArray'));
    else {
      exam.sections.forEach(function (s, i) {
        const se = validateSection(s);
        se.forEach(function (e) { errors.push('Section ' + (i + 1) + ': ' + e); });
      });
    }
    if (!exam.settings || typeof exam.settings !== 'object') errors.push(t('valid.schemaNoSettings'));
    return errors;
  }

  function sanitizeExam(exam) {
    const copy = JSON.parse(JSON.stringify(exam || MT.Constants.DEFAULT_EXAM));
    copy.metadata = copy.metadata || {};
    copy.metadata.title = String(copy.metadata.title || '');
    copy.metadata.subject = String(copy.metadata.subject || '');
    copy.metadata.grade = String(copy.metadata.grade || '');
    copy.metadata.school = String(copy.metadata.school || '');
    copy.metadata.duration = Number(copy.metadata.duration) || 0;
    copy.metadata.durationUnit = copy.metadata.durationUnit === 'hour' ? 'hour' : 'min';
    copy.metadata.totalMarks = Number(copy.metadata.totalMarks) || 0;

    copy.sections = (Array.isArray(copy.sections) ? copy.sections : []).map(function (s) {
      s.title = String(s.title || '');
      s.type = String(s.type || 'short');
      s.marks = Number(s.marks) || 0;
      s.instruction = String(s.instruction || '');
      s.letter = String(s.letter || '');
      s.questions = (Array.isArray(s.questions) ? s.questions : []).map(function (q) {
        q.number = Number(q.number) || 0;
        q.marks = Number(q.marks) || 0;
        q.text = String(q.text || '');
        q.type = String(q.type || 'short');
        q.options = Array.isArray(q.options) ? q.options : [];
        q.answer = String(q.answer || '');
        q.latex = Array.isArray(q.latex) ? q.latex : [];
        q.subQuestions = (Array.isArray(q.subQuestions) ? q.subQuestions : []).map(function (sub) {
          return {
            id: sub && sub.id ? sub.id : MT.ids.questionId(),
            text: String((sub && sub.text) || ''),
            marks: Number((sub && sub.marks != null) ? sub.marks : 1) || 0,
            reviewStatus: (sub && sub.reviewStatus) || MT.Constants.REVIEW_STATUS.APPROVED
          };
        });
        q.reviewStatus = q.reviewStatus || MT.Constants.REVIEW_STATUS.APPROVED;
        q.aiStatus = q.aiStatus || MT.Constants.AI_STATUS.NONE;
        if (!q.id) q.id = MT.ids.questionId();
        return q;
      });
      return s;
    });

    copy.settings = Object.assign({}, MT.Constants.DEFAULT_SETTINGS, copy.settings || {});
    copy.version = copy.version || '0.1.0';
    copy.updatedAt = new Date().toISOString();
    if (!copy.createdAt) copy.createdAt = copy.updatedAt;
    return copy;
  }

  return { validateExam, sanitizeExam };
})();