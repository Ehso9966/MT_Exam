window.MT = window.MT || {};

MT.Storage = MT.Storage || {};

MT.Storage.LocalDraft = (function () {
  const KEY = MT.Constants.STORAGE_KEYS.draft;

  function save(exam) {
    try {
      localStorage.setItem(KEY, JSON.stringify(exam));
      return true;
    } catch (e) {
      console.error('[LocalDraft] save failed', e);
      return false;
    }
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const exam = JSON.parse(raw);
      if (!exam || !exam.metadata) return null;
      return MT.Schema.sanitizeExam(exam);
    } catch (e) {
      console.error('[LocalDraft] load failed', e);
      return null;
    }
  }

  function clear() {
    try {
      localStorage.removeItem(KEY);
      return true;
    } catch (e) {
      return false;
    }
  }

  function hasDraft() {
    try {
      return !!localStorage.getItem(KEY);
    } catch (e) {
      return false;
    }
  }

  return { save, load, clear, hasDraft };
})();