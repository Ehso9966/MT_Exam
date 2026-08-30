window.MT = window.MT || {};

MT.State = (function () {
  let _exam = null;
  let _listeners = [];
  let _draftTimer = null;
  let _undoStack = [];
  const AUTOSAVE_DELAY = 2000;
  const UNDO_LIMIT = 15;

  function get() {
    if (!_exam) _init();
    return _exam;
  }

  // Snapshot the current exam for undo (deep copy via JSON).
  function _snapshot() {
    try { return JSON.parse(JSON.stringify(_exam)); } catch (e) { return null; }
  }

  function pushUndo() {
    const snap = _snapshot();
    if (snap) {
      _undoStack.push(snap);
      if (_undoStack.length > UNDO_LIMIT) _undoStack.shift();
    }
  }

  function undo() {
    if (_undoStack.length === 0) return false;
    const snap = _undoStack.pop();
    if (!snap) return false;
    _exam = MT.Schema.sanitizeExam(snap);
    _exam.updatedAt = new Date().toISOString();
    _notify();
    _scheduleAutoSave();
    return true;
  }

  function _init() {
    _exam = MT.Schema.sanitizeExam(MT.Constants.DEFAULT_EXAM);
    _exam.createdAt = new Date().toISOString();
    _exam.updatedAt = _exam.createdAt;
  }

  function update(fn) {
    if (!_exam) _init();
    fn(_exam);
    _exam.updatedAt = new Date().toISOString();
    _notify();
    _scheduleAutoSave();
  }

  function updateSilent(fn) {
    if (!_exam) _init();
    fn(_exam);
    _exam.updatedAt = new Date().toISOString();
    _scheduleAutoSave();
    MT.Events.emit(MT.EVENTS.EXAM_CHANGED, _exam);
  }

  function getMetadata() { return get().metadata; }

  function setMetadata(data) {
    update(function (e) { Object.assign(e.metadata, data); });
  }

  function getSection(sectionId) {
    return get().sections.find(function (s) { return s.id === sectionId; });
  }

  function getQuestion(sectionId, questionId) {
    var sec = getSection(sectionId);
    if (!sec) return null;
    return sec.questions.find(function (q) { return q.id === questionId; });
  }

  function addSection(section) {
    update(function (e) { e.sections.push(section); });
    return section;
  }

  function removeSection(sectionId) {
    pushUndo();
    update(function (e) { e.sections = e.sections.filter(function (s) { return s.id !== sectionId; }); });
  }

  function moveSection(fromIndex, toIndex) {
    pushUndo();
    update(function (e) {
      var secs = e.sections;
      if (fromIndex < 0 || fromIndex >= secs.length || toIndex < 0 || toIndex >= secs.length) return;
      var moved = secs.splice(fromIndex, 1)[0];
      secs.splice(toIndex, 0, moved);
    });
  }

  function addQuestion(sectionId, question) {
    var sec = getSection(sectionId);
    if (!sec) return;
    update(function () { sec.questions.push(question); });
  }

  function removeQuestion(sectionId, questionId) {
    pushUndo();
    var sec = getSection(sectionId);
    if (!sec) return;
    update(function () { sec.questions = sec.questions.filter(function (q) { return q.id !== questionId; }); });
  }

  function updateQuestion(sectionId, questionId, data) {
    var q = getQuestion(sectionId, questionId);
    if (!q) return;
    update(function () { Object.assign(q, data); });
  }

  function moveQuestion(sectionId, fromIndex, toIndex) {
    pushUndo();
    var sec = getSection(sectionId);
    if (!sec) return;
    update(function () {
      var qs = sec.questions;
      if (fromIndex < 0 || fromIndex >= qs.length || toIndex < 0 || toIndex >= qs.length) return;
      var moved = qs.splice(fromIndex, 1)[0];
      qs.splice(toIndex, 0, moved);
    });
  }

  function insertQuestions(sectionId, questions, startIndex) {
    var sec = getSection(sectionId);
    if (!sec) return;
    update(function () {
      var idx = typeof startIndex === 'number' ? startIndex : sec.questions.length;
      // The section type is authoritative — every inserted question adopts it
      // so a section always contains matching question types.
      (questions || []).forEach(function (q) {
        q.type = sec.type;
        if (sec.type !== 'mcq') q.options = [];
      });
      sec.questions.splice.apply(sec.questions, [idx, 0].concat(questions));
    });
  }

  function subscribe(fn) {
    _listeners.push(fn);
    return function () { _listeners = _listeners.filter(function (s) { return s !== fn; }); };
  }

  function _notify() {
    _listeners.slice().forEach(function (fn) {
      try { fn(_exam); } catch (e) { console.error('[State] subscriber error', e); }
    });
    MT.Events.emit(MT.EVENTS.EXAM_CHANGED, _exam);
  }

  function _scheduleAutoSave() {
    if (_draftTimer) clearTimeout(_draftTimer);
    _draftTimer = setTimeout(function () {
      if (MT.Storage && MT.Storage.LocalDraft) {
        MT.Storage.LocalDraft.save(_exam);
      }
    }, AUTOSAVE_DELAY);
  }

  function load(examData) {
    _exam = MT.Schema.sanitizeExam(examData);
    _notify();
    MT.Events.emit(MT.EVENTS.STATE_LOADED, _exam);
  }

  function reset() {
    pushUndo();
    _init();
    _notify();
    _scheduleAutoSave();
  }

  function clearContent() {
    pushUndo();
    update(function (e) { e.sections = []; });
  }

  return {
    get: get, update: update,
    getMetadata: getMetadata,
    setMetadata: setMetadata,
    getSection: getSection, getQuestion: getQuestion,
    addSection: addSection, removeSection: removeSection, moveSection: moveSection,
    addQuestion: addQuestion, removeQuestion: removeQuestion,
    updateQuestion: updateQuestion, moveQuestion: moveQuestion,
    insertQuestions: insertQuestions,
    subscribe: subscribe, load: load, reset: reset, clearContent: clearContent,
    updateSilent: updateSilent,
    undo: undo
  };
})();