window.MT = window.MT || {};

MT.CropFlow = (function () {
  const CROP_MAX_TOKENS = 8192;
  let cropperInstance = null;
  let cropperImageUrl = null;

  function t(key, vars) { return MT.Utils.t(key, vars); }

  function open(options) {
    const opts = Object.assign({}, options || {});

    // BYOK mode without a saved key → ask the user to configure the API first
    // so they don't get a confusing failure mid-crop. MT AI mode always works
    // because the free demo key is built in.
    if (MT.BaiClient && MT.BaiClient.getMode && MT.BaiClient.getMode() === 'custom' &&
        !(MT.BaiClient.getCustomKey ? MT.BaiClient.getCustomKey() : '')) {
      MT.Toast.warning(t('crop.noKeyPrompt', '🔑 API သော့ မထည့်ရသေးပါ — သော့ ထည့်ပြီးမှ ပုံမှ ဖတ်နိုင်မည်'));
      if (MT.App && MT.App.openApiSettings) MT.App.openApiSettings();
      return;
    }

    // Launch the native file picker with the chosen source (camera vs gallery).
    function launchFilePicker(captureAttr) {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      if (captureAttr) fileInput.setAttribute('capture', captureAttr);
      fileInput.style.display = 'none';
      document.body.appendChild(fileInput);

      function cleanupInput() {
        if (fileInput.parentNode) fileInput.parentNode.removeChild(fileInput);
      }

      fileInput.onchange = function () {
        const file = fileInput.files[0];
        if (!file) {
          cleanupInput();
          return;
        }
        // Android WebView revokes the picker's content-URI read permission shortly
        // after the File reference is handed out (NotReadableError). Read the bytes
        // immediately while the grant is fresh and re-wrap them in an in-memory File
        // that no longer depends on the original URI.
        if (file.arrayBuffer) {
          file.arrayBuffer().then(function (buf) {
            const stable = new File([buf], file.name || 'image', {
              type: file.type || 'image/jpeg',
              lastModified: file.lastModified
            });
            cleanupInput();
            proceedWithFile(stable);
          }).catch(function (e) {
            console.error('[CropFlow] eager read failed, using original file:', e);
            cleanupInput();
            proceedWithFile(file);
          });
        } else {
          cleanupInput();
          proceedWithFile(file);
        }
      };
      fileInput.click();
    }

    // Source chooser: open the camera or browse the phone.
    function makeOption(icon, label, desc, fn) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'add-question-option';
      btn.innerHTML = '<span class="aq-icon">' + icon + '</span>' +
        '<span class="aq-text"><b>' + label + '</b><span class="aq-desc">' + desc + '</span></span>';
      btn.addEventListener('click', function () {
        MT.Modal.close();
        fn();
      });
      return btn;
    }

    const body = document.createElement('div');
    body.className = 'add-question-popup';
    body.appendChild(makeOption('📷', t('crop.camera'), t('crop.cameraDesc'), function () {
      launchFilePicker('environment');
    }));
    body.appendChild(makeOption('🖼️', t('crop.gallery'), t('crop.galleryDesc'), function () {
      launchFilePicker('');
    }));

    MT.Modal.open({
      title: t('crop.sourceTitle'),
      content: body,
      help: 'help.cropSource'
    });

    function proceedWithFile(file) {
      console.log('[CropFlow] file', { name: file && file.name, type: file && file.type, size: file && file.size });
      if (MT.ImageLoader && MT.ImageLoader.validateFile) {
        const err = MT.ImageLoader.validateFile(file, 10);
        if (err) { MT.Toast.error(err); return; }
      }
      isProbablyHeic(file).then(function (heic) {
        if (!heic) { setupCropper(file, opts); return; }
        var hideLoading = MT.Loading.show(t('crop.convertingHeic'));
        ensureHeic2anyLoaded().then(function () {
          if (typeof heic2any === 'undefined') {
            hideLoading();
            MT.Toast.error(t('crop.noHeicConverter'));
            return;
          }
          return convertHeicToJpeg(file).then(function (jpg) {
            hideLoading();
            setupCropper(jpg, opts);
          }).catch(function (err) {
            hideLoading();
            MT.Toast.error((err && err.message) || t('crop.cannotOpenImage'));
          });
        });
      }).catch(function (err) {
        console.error('[CropFlow] proceedWithFile error:', err);
        MT.Toast.error((err && err.message) || t('crop.cannotOpenImage'));
      });
    }
  }

  /* ---------- HEIC/HEIF -> JPEG conversion ---------- */
  function convertHeicToJpeg(file) {
    if (typeof heic2any === 'undefined') {
      return Promise.reject(new Error(t('crop.noHeicConverter')));
    }
    return heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 }).then(function (out) {
      const blob = Array.isArray(out) ? out[0] : out;
      return new Blob([blob], { type: 'image/jpeg' });
    });
  }

  /* ---------- HEIC detection (MIME or magic bytes) ---------- */
  function isProbablyHeic(file) {
    if (/^image\/(heic|heif|heic-sequence|heif-sequence)$/i.test(file.type || '')) {
      return Promise.resolve(true);
    }
    return new Promise(function (resolve) {
      if (!file || !file.slice) { resolve(false); return; }
      const reader = new FileReader();
      reader.onloadend = function () {
        try {
          const arr = new Uint8Array(reader.result);
          if (arr.length < 12) { resolve(false); return; }
          if (String.fromCharCode(arr[4], arr[5], arr[6], arr[7]) !== 'ftyp') { resolve(false); return; }
          const brand = String.fromCharCode(arr[8], arr[9], arr[10], arr[11]);
          resolve(/^(heic|heix|hevc|hevx|mif1|msf1)$/.test(brand));
        } catch (e) { resolve(false); }
      };
      reader.onerror = function () { resolve(false); };
      reader.readAsArrayBuffer(file.slice(0, 16));
    });
  }

  /* ---------- Lazy CDN loaders ---------- */
  let heic2anyPromise = null;
  function ensureHeic2anyLoaded() {
    if (typeof heic2any !== 'undefined') return Promise.resolve();
    if (heic2anyPromise) return heic2anyPromise;
    heic2anyPromise = new Promise(function (resolve) {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js';
      s.onload = function () { resolve(); };
      s.onerror = function () { resolve(); };
      document.head.appendChild(s);
    });
    return heic2anyPromise;
  }

  let cropperPromise = null;
  function ensureCropperLoaded() {
    if (typeof Cropper !== 'undefined') return Promise.resolve();
    if (cropperPromise) return cropperPromise;
    cropperPromise = new Promise(function (resolve) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/cropperjs@1.6.2/dist/cropper.min.css';
      document.head.appendChild(link);
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/cropperjs@1.6.2/dist/cropper.min.js';
      s.onload = function () { resolve(); };
      s.onerror = function () { resolve(); };
      document.head.appendChild(s);
    });
    return cropperPromise;
  }

  function setupCropper(file, opts) {
    const body = document.createElement('div');

    // ---- Step 1: crop tutorial guide (shown before the cropper) ----
    const guide = document.createElement('div');
    guide.className = 'crop-guide';
    guide.appendChild(MT.Utils.el('p', { class: 'crop-guide-title' }, t('crop.defaultTitle')));

    const status = document.createElement('div');
    status.className = 'crop-guide-status';
    const spinner = document.createElement('span');
    spinner.className = 'spinner';
    status.appendChild(spinner);
    status.appendChild(document.createTextNode(' ' + t('crop.guideLoading')));
    guide.appendChild(status);

    const gif = document.createElement('img');
    gif.className = 'crop-guide-gif';
    gif.src = 'assets/toul/image_crop_tour.gif';
    gif.alt = 'crop guide';
    guide.appendChild(gif);

    const actions = document.createElement('div');
    actions.className = 'crop-guide-actions';
    const startBtn = MT.Utils.el('button', { type: 'button', class: 'btn' }, t('crop.guideStart'));
    actions.appendChild(startBtn);
    guide.appendChild(actions);
    body.appendChild(guide);

    gif.onload = function () {
      status.innerHTML = '';
      status.style.display = 'none';
    };
    gif.onerror = function () {
      status.innerHTML = '';
      status.appendChild(document.createTextNode(t('crop.guideLoadFail')));
    };

    // ---- Step 2: cropper content (hidden until Start) ----
    const cropWrap = document.createElement('div');
    cropWrap.style.display = 'none';

    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:12px;flex-wrap:wrap';

    const left = document.createElement('div');
    left.style.cssText = 'flex:1;min-width:280px';
    const imgEl = document.createElement('img');
    imgEl.id = 'cropImg';
    imgEl.style.cssText = 'max-width:100%;display:block';
    imgEl.alt = 'crop';
    left.appendChild(imgEl);

    const right = document.createElement('div');
    right.style.cssText = 'width:200px;display:flex;flex-direction:column;gap:8px';

    let sectionSelect = null;
    if (!opts.sectionId) {
      const sectionLabel = document.createElement('label');
      sectionLabel.textContent = t('crop.section');
      right.appendChild(sectionLabel);
      sectionSelect = document.createElement('select');
      sectionSelect.className = 'select';
      MT.State.get().sections.forEach(function (s, i) {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = (i + 1) + '. ' + (s.title || s.type);
        sectionSelect.appendChild(opt);
      });
      right.appendChild(sectionSelect);
    }

    const hint = document.createElement('p');
    hint.className = 'mt-muted mt-small mt-mt-0';
    hint.textContent = t('crop.drawHint');
    right.appendChild(hint);

    row.appendChild(left);
    row.appendChild(right);
    cropWrap.appendChild(row);
    body.appendChild(cropWrap);

    const footerContent = document.createElement('div');
    footerContent.style.cssText = 'display:flex;gap:8px;justify-content:space-between;width:100%';

    const leftBtns = document.createElement('div');
    leftBtns.style.cssText = 'display:flex;gap:6px';
    const rotateBtn = document.createElement('button');
    rotateBtn.className = 'btn secondary sm';
    rotateBtn.textContent = t('crop.rotate');
    rotateBtn.onclick = function () { if (cropperInstance) cropperInstance.rotate(90); };
    leftBtns.appendChild(rotateBtn);
    const resetBtn = document.createElement('button');
    resetBtn.className = 'btn secondary sm';
    resetBtn.textContent = t('crop.reset');
    resetBtn.onclick = function () { if (cropperInstance) cropperInstance.reset(); };
    leftBtns.appendChild(resetBtn);
    footerContent.appendChild(leftBtns);

    const rightBtns = document.createElement('div');
    rightBtns.style.cssText = 'display:flex;gap:6px';
    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'btn';
    confirmBtn.textContent = '✓ ' + (MT.I18n ? MT.I18n.t('ui.confirm') : 'အတည်ပြုမည်');
    rightBtns.appendChild(confirmBtn);
    footerContent.appendChild(rightBtns);

    confirmBtn.onclick = function () {
      const sid = opts.sectionId || (sectionSelect ? sectionSelect.value : null);
      if (!sid) {
        MT.Toast.warning(t('ui.createSectionFirst'));
        return;
      }
      confirmCrop(sid, opts.onQuestions, opts.openEditor === true, opts.onBack);
    };

    MT.Modal.open({
      title: opts.title || t('crop.defaultTitle'),
      content: body,
      size: 'modal-lg',
      sheet: true,
      help: 'help.crop',
      footer: footerContent,
      onClose: function () {
        destroyCropper();
        if (opts.onClose) opts.onClose();
      },
      onBack: function () {
        destroyCropper();
        if (opts.onBack) opts.onBack();
      }
    });

    cropperImageUrl = null;
    var triedBlob = false;
    var imgReady = false;
    var started = false;
    function tryBlob() {
      if (triedBlob || typeof file === 'string') return false;
      triedBlob = true;
      try {
        var url = URL.createObjectURL(file);
        cropperImageUrl = url;
        imgEl.src = url;
        return true;
      } catch (e) { return false; }
    }
    // Show the cropper (with no auto selection) once the user taps Start.
    // Cropper is initialized only after the image has loaded so it measures
    // the canvas at its real size.
    function startCropper() {
      started = true;
      guide.style.display = 'none';
      cropWrap.style.display = 'block';
      if (!imgReady) { MT.Toast.warning(t('crop.openImageFirst')); return; }
      ensureCropperLoaded().then(function () {
        try {
          if (typeof Cropper === 'undefined') throw new Error('CROPPER_NOT_LOADED');
          cropperInstance = new Cropper(imgEl, {
            viewMode: 1,
            aspectRatio: NaN,
            autoCrop: false,
            background: true,
            guides: true
          });
        } catch (err) {
          console.error('[CropFlow] Cropper init failed:', err);
          MT.Toast.error(t('crop.noCropper'));
        }
      });
    }
    startBtn.onclick = startCropper;
    imgEl.onload = function () {
      imgReady = true;
      if (started) startCropper();
    };
    imgEl.onerror = function () {
      if (tryBlob()) return;
      console.error('[CropFlow] IMAGE_DECODE_ERROR for', file && file.name);
      MT.Toast.error(t('crop.decodeFailed'));
    };
    if (typeof file === 'string') {
      imgEl.src = file;
    } else if (MT.ImageLoader && MT.ImageLoader.loadFileRobust) {
      MT.ImageLoader.loadFileRobust(file)
        .then(function (src) {
          if (typeof src === 'string' && src.indexOf('blob:') === 0) {
            cropperImageUrl = src;
          }
          imgEl.src = src;
        })
        .catch(function (err) {
          console.error('[CropFlow] loadFileRobust failed:', err && err.message);
          MT.Toast.error((err && err.message) || t('crop.cannotOpenImage'));
        });
    } else {
      tryBlob();
    }
  }

  function confirmCrop(sectionId, onQuestions, openEditor, onBack) {
    if (!cropperInstance) {
      MT.Toast.warning(t('crop.openImageFirst'));
      return;
    }
    const canvas = cropperInstance.getCroppedCanvas({
      maxWidth: 1024,
      maxHeight: 1024,
      minWidth: 100,
      minHeight: 100,
      fillColor: '#fff',
      imageSmoothingQuality: 'high'
    });
    if (!canvas) {
      MT.Toast.warning(t('crop.drawSelectionFirst'));
      return;
    }
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    MT.Modal.close();
    const hideLoading = MT.Loading.show(t('ui.aiLoading'));
    MT.Loading.setStage(1);

    const prompt = MT.Prompts.buildSingleQuestionPrompt({ language: 'my', myanmarEmphasis: true });
    MT.BaiClient.chatCompletion({
      messages: [
        { role: 'user', content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: dataUrl } }
        ]}
      ],
      maxTokens: CROP_MAX_TOKENS
    }).then(function (data) {
      MT.Loading.setStage(2);
      const parsed = MT.ResponseParser.parseAIResponse(data);
      if (parsed.error) throw new Error(parsed.error);
      const questions = MT.ResponseParser.extractQuestions(parsed, sectionId);
      if (questions.length === 0) throw new Error(t('error.emptyQuestion'));
      if (onQuestions) onQuestions(questions, sectionId);
      if (openEditor && sectionId && questions.length > 0) {
        MT.QuestionPopupEditor.openQuestionEditor(sectionId, questions[0].id, onBack ? { onBack: onBack } : undefined);
      }
    }).catch(function (err) {
      MT.Toast.error(MT.AIErrors.friendlyMessage(err));
    }).finally(function () {
      hideLoading();
    });
  }

  function destroyCropper() {
    if (cropperInstance) {
      cropperInstance.destroy();
      cropperInstance = null;
    }
    if (cropperImageUrl) {
      URL.revokeObjectURL(cropperImageUrl);
      cropperImageUrl = null;
    }
  }

  return { open: open };
})();