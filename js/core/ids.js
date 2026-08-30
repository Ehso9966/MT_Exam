window.MT = window.MT || {};

MT.ids = (function () {
  let counter = 0;

  function uid(prefix) {
    counter += 1;
    return (prefix || 'id') + '_' + Date.now().toString(36) + '_' + counter.toString(36) + '_' + Math.random().toString(36).slice(2, 7);
  }

  function sectionId() { return uid('sec'); }
  function questionId() { return uid('q'); }

  return {
    sectionId, questionId
  };
})();
