window.MT = window.MT || {};

MT.ImageLoader = (function () {
  const HEIC_MIME = /^image\/(heic|heif|heic-sequence|heif-sequence)$/i;

  function t(key, vars) { return MT.Utils.t(key, vars); }

  function isHeic(file) {
    return !!(file && HEIC_MIME.test(file.type || ''));
  }

  function isImageFile(file) {
    if (!file) return false;
    const type = (file.type || '').toLowerCase();
    if (type.startsWith('image/')) return true;
    return /\.(jpe?g|png|webp|gif|bmp|heic|heif)$/i.test(file.name || '');
  }

  function loadFile(file) {
    return new Promise(function (resolve, reject) {
      if (!file) {
        reject(MT.AIErrors.errorWithCode(MT.AIErrors.ErrorCodes.FILE_READ, null, t('error.noFile')));
        return;
      }
      if (!isImageFile(file)) {
        reject(MT.AIErrors.errorWithCode(MT.AIErrors.ErrorCodes.FILE_READ, null, t('error.notImage')));
        return;
      }
      const reader = new FileReader();
      reader.onload = function () {
        resolve(reader.result);
      };
      reader.onerror = function (e) {
        console.error('[ImageLoader] FileReader error:', reader.error, 'for', file.name);
        reject(MT.AIErrors.errorWithCode(
          MT.AIErrors.ErrorCodes.FILE_READ,
          reader.error || e,
          t('error.fileRead')
        ));
      };
      reader.readAsDataURL(file);
    });
  }

  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      const img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () {
        reject(MT.AIErrors.errorWithCode(
          MT.AIErrors.ErrorCodes.IMAGE_DECODE,
          null,
          t('crop.cannotOpenImage')
        ));
      };
      img.src = src;
    });
  }

  function readAsArrayBuffer(file) {
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.onload = function () {
        resolve(reader.result);
      };
      reader.onerror = function (e) {
        console.error('[ImageLoader] FileReader arrayBuffer error:', reader.error, 'for', file.name);
        reject(MT.AIErrors.errorWithCode(
          MT.AIErrors.ErrorCodes.FILE_READ,
          reader.error || e,
          t('error.fileRead')
        ));
      };
      reader.readAsArrayBuffer(file);
    });
  }

  function loadFileRobust(file) {
    if (!file) {
      return Promise.reject(MT.AIErrors.errorWithCode(MT.AIErrors.ErrorCodes.FILE_READ, null, t('error.noFile')));
    }
    if (isHeic(file)) {
      return Promise.reject(MT.AIErrors.errorWithCode(
        MT.AIErrors.ErrorCodes.IMAGE_DECODE,
        null,
        t('error.heicNote')
      ));
    }
    return loadFile(file).catch(function (readErr) {
      // Fallback 1: bypass FileReader, decode the File blob directly.
      const directUrl = URL.createObjectURL(file);
      return loadImage(directUrl).then(function () {
        return directUrl;
      }).catch(function () {
        URL.revokeObjectURL(directUrl);
        // Fallback 2: read raw bytes via ArrayBuffer and rebuild a fresh Blob.
        return readAsArrayBuffer(file).then(function (buffer) {
          const blob = new Blob([buffer], { type: file.type || 'image/jpeg' });
          const url = URL.createObjectURL(blob);
          return loadImage(url).then(function () {
            return url;
          }).catch(function () {
            URL.revokeObjectURL(url);
            return Promise.reject(MT.AIErrors.errorWithCode(
              MT.AIErrors.ErrorCodes.IMAGE_DECODE,
              null,
              t('error.imageDecode')
            ));
          });
        }).catch(function () {
          return Promise.reject(MT.AIErrors.errorWithCode(
            MT.AIErrors.ErrorCodes.FILE_READ,
            readErr.cause || readErr,
            t('error.fileCorrupt')
          ));
        });
      });
    });
  }

  function validateFile(file, maxSizeMB) {
    if (!file) return t('error.noFile');
    if (!file.size) return t('error.emptyFile');
    const maxSize = (maxSizeMB || 10) * 1024 * 1024;
    if (file.size > maxSize) return t('ui.fileTooLarge', { max: maxSizeMB });
    return null;
  }

  return { loadFileRobust, validateFile };
})();