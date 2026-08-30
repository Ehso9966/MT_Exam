window.MT = window.MT || {};

MT.Storage = MT.Storage || {};

MT.Storage.ExportJson = (function () {
  function sanitizePart(part) {
    return String(part || '')
      .replace(/[\\/:*?"<>|\s]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function buildBaseName(meta) {
    const parts = [meta.grade, meta.subject, meta.school]
      .map(sanitizePart)
      .filter(Boolean);
    return parts.length ? parts.join('-') : 'mt-exam';
  }

  function buildSaveName(meta, customName) {
    const custom = sanitizePart(customName);
    return custom || buildBaseName(meta);
  }

  function buildFilename(meta) {
    return buildBaseName(meta) + '.json';
  }

  // The exported project file is for sharing/re-importing; the bulky base64
  // sourceImage crops are not needed there (they bloat the file and look like
  // garbage in a text editor). Everything else is preserved.
  function stripSourceImages(exam) {
    var copy = JSON.parse(JSON.stringify(exam));
    (copy.sections || []).forEach(function (s) {
      (s.questions || []).forEach(function (q) {
        delete q.sourceImage;
      });
    });
    return copy;
  }

  function exportExam(exam, filename) {
    const json = JSON.stringify(stripSourceImages(exam), null, 2);
    const meta = (exam && exam.metadata) || {};
    const name = filename || buildFilename(meta);
    MT.Utils.download(name, json, 'application/json');
    return true;
  }

  return { exportExam, buildSaveName };
})();