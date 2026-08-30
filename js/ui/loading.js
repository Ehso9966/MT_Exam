window.MT = window.MT || {};

MT.Loading = (function () {
  let overlayEl = null;
  let counter = 0;

  function t(key) {
    return MT.Utils.t(key);
  }

  const STAGES = [
    { e: '📷', labelKey: 'loading.uploading' },
    { e: '🤖', labelKey: 'loading.aiReading' },
    { e: '📝', labelKey: 'loading.creatingQuestion' }
  ];

  function show(message) {
    counter++;
    if (!overlayEl) {
      overlayEl = document.createElement('div');
      overlayEl.className = 'loading-overlay';
      overlayEl.innerHTML =
        '<div class="loading-card">' +
          '<div class="loading-emoji" id="loadingEmoji">📷</div>' +
          '<div class="loading-text" id="loadingText"></div>' +
          '<div class="loading-progress"><div class="loading-progress-bar" id="loadingBar"></div></div>' +
          '<div class="loading-steps" id="loadingSteps"></div>' +
        '</div>';
      document.body.appendChild(overlayEl);
    }
    const text = overlayEl.querySelector('#loadingText');
    if (text && message) text.textContent = message;
    setStage(0);
    return function hide() {
      counter = Math.max(0, counter - 1);
      if (counter === 0 && overlayEl) {
        if (overlayEl.parentNode) overlayEl.parentNode.removeChild(overlayEl);
        overlayEl = null;
      }
    };
  }

  function setStage(stage) {
    if (!overlayEl) return;
    const emoji = overlayEl.querySelector('#loadingEmoji');
    const steps = overlayEl.querySelector('#loadingSteps');
    const idx = Math.max(0, Math.min(stage, STAGES.length - 1));
    const s = STAGES[idx];
    if (emoji) emoji.textContent = s.e;
    if (steps) {
      steps.innerHTML = '';
      STAGES.forEach(function (st, i) {
        const seg = document.createElement('span');
        seg.className = 'loading-step' + (i <= idx ? ' active' : '');
        seg.textContent = st.e;
        steps.appendChild(seg);
      });
    }
  }

  function hide() {
    counter = 0;
    if (overlayEl) {
      if (overlayEl.parentNode) overlayEl.parentNode.removeChild(overlayEl);
      overlayEl = null;
    }
  }

  return { show, setStage };
})();