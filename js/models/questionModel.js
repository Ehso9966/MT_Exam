window.MT = window.MT || {};

MT.QuestionModel = (function () {
  function t(key) { return MT.Utils.t(key); }

  function create(data) {
    const q = {
      id: MT.ids.questionId(),
      number: 0,
      type: data.type || MT.Constants.QUESTION_TYPES.SHORT,
      text: data.text || '',
      options: data.options || [],
      answer: data.answer || '',
      marks: data.marks != null ? data.marks : 1,
      latex: data.latex || [],
      subQuestions: Array.isArray(data.subQuestions) ? data.subQuestions : [],
      sourceImage: data.sourceImage || null,
      aiStatus: data.aiStatus || MT.Constants.AI_STATUS.NONE,
      reviewStatus: data.reviewStatus || MT.Constants.REVIEW_STATUS.APPROVED,
      confidence: data.confidence != null ? data.confidence : null,
      aiHint: data.aiHint || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    return q;
  }

  function getReviewLabel(q) {
    const map = {
      'ai_extracted': '🟡 ' + t('ui.reviewNeeded', 'ပြန်စစ်ရန်'),
      'needs_review': '🟡 ' + t('ui.reviewNeeded', 'ပြန်စစ်ရန်'),
      'edited': '🟡 ' + t('ui.reviewNeeded', 'ပြန်စစ်ရန်'),
      'approved': '🟢 ' + t('ui.reviewApproved', 'အတည်ပြုပြီး'),
      'error': '🔴 ' + t('ui.reviewError', 'အမှား')
    };
    return map[q.reviewStatus] || '—';
  }

  function fromAI(aiQuestion, sectionId, imageData) {
    return create({
      type: aiQuestion.type || MT.Constants.QUESTION_TYPES.SHORT,
      text: aiQuestion.text || aiQuestion.question || '',
      options: Array.isArray(aiQuestion.options) ? aiQuestion.options : [],
      answer: aiQuestion.answer || aiQuestion.correctAnswer || '',
      marks: aiQuestion.marks != null ? aiQuestion.marks : 1,
      latex: Array.isArray(aiQuestion.latex) ? aiQuestion.latex : [],
      sourceImage: imageData || null,
      aiStatus: MT.Constants.AI_STATUS.DONE,
      reviewStatus: MT.Constants.REVIEW_STATUS.NEEDS_REVIEW,
      confidence: aiQuestion.confidence != null ? aiQuestion.confidence : null,
      aiHint: aiQuestion.hint || null
    });
  }

  return { create, getReviewLabel, fromAI };
})();