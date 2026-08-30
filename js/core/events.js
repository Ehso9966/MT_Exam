window.MT = window.MT || {};

MT.Events = (function () {
  const listeners = {};

  function on(event, handler) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(handler);
    return function unsubscribe() {
      var ev = listeners[event];
      if (ev) {
        listeners[event] = ev.filter(function (h) { return h !== handler; });
      }
    };
  }

  function off(event, handler) {
    if (!listeners[event]) return;
    listeners[event] = listeners[event].filter(h => h !== handler);
  }

  function emit(event, payload) {
    if (!listeners[event]) return;
    listeners[event].slice().forEach(h => {
      try { h(payload); } catch (e) { console.error('[Events] handler error on', event, e); }
    });
  }

  function clear(event) {
    if (event) { listeners[event] = []; } else { Object.keys(listeners).forEach(k => { listeners[k] = []; }); }
  }

  return { on, off, emit, clear };
})();

MT.EVENTS = {
  EXAM_CHANGED: 'exam:changed',
  STATE_LOADED: 'state:loaded',
  LANG_CHANGED: 'i18n:lang-changed'
};
