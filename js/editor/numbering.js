window.MT = window.MT || {};

MT.Numbering = (function () {
  function renumber(exam) {
    let counter = 0;
    (exam.sections || []).forEach(function (s) {
      (s.questions || []).forEach(function (q) {
        counter += 1;
        q.number = counter;
      });
    });
    return exam;
  }

  function renumberSection(section, startAt) {
    let counter = startAt || 1;
    (section.questions || []).forEach(function (q) {
      q.number = counter;
      counter += 1;
    });
    return counter;
  }

  function apply(exam) {
    if (exam && exam.settings && exam.settings.numbering === 'section') {
      (exam.sections || []).forEach(function (s) {
        renumberSection(s, 1);
      });
    } else {
      renumber(exam);
    }
    return exam;
  }

  return { renumber, renumberSection, apply };
})();