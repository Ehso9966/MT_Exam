window.MT = window.MT || {};

MT.Storage = MT.Storage || {};

MT.Storage.ImportJson = (function () {
  function t(key) { return MT.Utils.t(key); }

  function importFile() {
    return new Promise(function (resolve, reject) {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';
      input.onchange = function () {
        const file = input.files[0];
        input.remove();
        if (!file) { reject(new Error(t('error.noFile'))); return; }
        const reader = new FileReader();
        reader.onload = function () {
          try {
            const parsed = JSON.parse(reader.result);
            const errors = MT.Schema.validateExam(parsed);
            if (errors.length > 0) {
              reject(new Error(t('error.parse') + ': ' + errors.join('; ')));
              return;
            }
            const sanitized = MT.Schema.sanitizeExam(parsed);
            resolve(sanitized);
          } catch (e) {
            reject(new Error(t('error.parse') + ': ' + e.message));
          }
        };
        reader.onerror = function () { reject(new Error(t('error.fileRead'))); };
        reader.readAsText(file);
      };
      input.click();
    });
  }

  return { importFile };
})();