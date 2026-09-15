window.MT = window.MT || {};

MT.BaiClient = (function () {
  // Local FastAPI backend base URL. Overridable via window.MT_API_BASE in
  // index.html. All AI traffic is proxied through this server so the Sargalay
  // default key never ships in the frontend bundle.
  const LOCAL_API_BASE =
    (typeof window !== 'undefined' && window.MT_API_BASE) ||
    'http://localhost:8000';

  const MAX_TOKEN_CAP = 16384;
  const DEFAULT_TIMEOUT_MS = 120000;

  function t(key) { return MT.Utils.t(key); }

  function safeJson(res) {
    var ct = res.headers.get('content-type') || '';
    if (ct.indexOf('application/json') !== -1) {
      return res.json();
    }
    return res.text().then(function (text) {
      throw new Error(text || 'Non-JSON response from server');
    });
  }

  function getCustomKey() {
    return localStorage.getItem(MT.Constants.STORAGE_KEYS.apiKey) || '';
  }

  function setApiKey(key) {
    if (key) localStorage.setItem(MT.Constants.STORAGE_KEYS.apiKey, key.trim());
    else localStorage.removeItem(MT.Constants.STORAGE_KEYS.apiKey);
  }

  function getModel() {
    return localStorage.getItem(MT.Constants.STORAGE_KEYS.model) || '';
  }

  function setModel(model) {
    if (model) localStorage.setItem(MT.Constants.STORAGE_KEYS.model, model.trim());
    else localStorage.removeItem(MT.Constants.STORAGE_KEYS.model);
  }

  function getMode() {
    return localStorage.getItem(MT.Constants.STORAGE_KEYS.aiMode) || 'mtai';
  }

  function setMode(mode) {
    if (mode) localStorage.setItem(MT.Constants.STORAGE_KEYS.aiMode, mode);
    else localStorage.removeItem(MT.Constants.STORAGE_KEYS.aiMode);
  }

  function testConnection() {
    var mode = getMode();
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, DEFAULT_TIMEOUT_MS);

    if (mode === 'custom') {
      var customBase = LOCAL_API_BASE.replace(/\/+$/, '');
      var customKey = (getCustomKey() || '').trim();
      var url = customBase + '/models';
      var headers = { 'Content-Type': 'application/json' };
      if (customKey) headers['Authorization'] = 'Bearer ' + customKey;
      return fetch(url, { method: 'GET', headers: headers, signal: controller.signal })
        .then(function (res) {
          clearTimeout(timer);
          return safeJson(res).then(function (body) {
            if (!res.ok) throw new Error('HTTP ' + res.status);
            var modelName = '';
            if (body && body.data && body.data.length > 0) modelName = body.data[0].id || '';
            return { ok: true, model: modelName };
          });
        })
        .catch(function (err) {
          clearTimeout(timer);
          if (err.name === 'AbortError') throw MT.AIErrors.AIError(MT.AIErrors.ErrorCodes.TIMEOUT, t('error.timeout'), 'timeout');
          if (err instanceof TypeError) throw MT.AIErrors.AIError(MT.AIErrors.ErrorCodes.NETWORK, t('error.network'), err.message);
          throw err;
        });
    }

    var url = LOCAL_API_BASE.replace(/\/+$/, '') + '/api/test';
    return fetch(url, { method: 'GET', signal: controller.signal })
      .then(function (res) {
        clearTimeout(timer);
        return safeJson(res).then(function (body) {
          if (!res.ok) {
            if (body && body.code && MT.AIErrors && MT.AIErrors.ErrorCodes) {
              throw MT.AIErrors.AIError(body.code, body.message || t('error.generic'), body.detail || null);
            }
            throw MT.AIErrors.fromHttp(res.status, body);
          }
          return body;
        });
      })
      .catch(function (err) {
        clearTimeout(timer);
        if (err && err.code) throw err;
        if (err.name === 'AbortError') {
          throw MT.AIErrors.AIError(MT.AIErrors.ErrorCodes.TIMEOUT, t('error.timeout'), 'timeout');
        }
        if (err instanceof TypeError) {
          throw MT.AIErrors.AIError(MT.AIErrors.ErrorCodes.NETWORK, t('error.network'), err.message);
        }
        throw err;
      });
  }

  function chatCompletion(params) {
    var mode = getMode();
    var body = {
      messages: params.messages,
      model: params.model || getModel() || undefined,
      max_tokens: Math.min(params.maxTokens || MAX_TOKEN_CAP, MAX_TOKEN_CAP),
      temperature: params.temperature != null ? params.temperature : 0.1,
      response_format: params.responseFormat || { type: 'json_object' }
    };

    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, params.timeoutMs || DEFAULT_TIMEOUT_MS);

    if (mode === 'custom') {
      var customBase = LOCAL_API_BASE.replace(/\/+$/, '');
      var customKey = (getCustomKey() || '').trim();
      var url = customBase + '/chat/completions';
      var headers = { 'Content-Type': 'application/json' };
      if (customKey) headers['Authorization'] = 'Bearer ' + customKey;
      return fetch(url, { method: 'POST', headers: headers, body: JSON.stringify(body), signal: controller.signal })
        .then(function (res) {
          clearTimeout(timer);
          return safeJson(res).then(function (data) {
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return data;
          });
        })
        .catch(function (err) {
          clearTimeout(timer);
          if (err.name === 'AbortError') throw MT.AIErrors.AIError(MT.AIErrors.ErrorCodes.TIMEOUT, t('error.timeout'), 'timeout');
          if (err instanceof TypeError) throw MT.AIErrors.AIError(MT.AIErrors.ErrorCodes.NETWORK, t('error.network'), err.message);
          throw err;
        });
    }

    var url = LOCAL_API_BASE.replace(/\/+$/, '') + '/api/chat';
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal
    })
      .then(function (res) {
        clearTimeout(timer);
        return safeJson(res).then(function (data) {
          if (!res.ok) {
            if (data && data.code && MT.AIErrors && MT.AIErrors.ErrorCodes) {
              throw MT.AIErrors.AIError(data.code, data.message || t('error.generic'), data.detail || null);
            }
            throw MT.AIErrors.fromHttp(res.status, data);
          }
          return data;
        });
      })
      .catch(function (err) {
        clearTimeout(timer);
        if (err && err.code) throw err;
        if (err.name === 'AbortError') {
          throw MT.AIErrors.AIError(MT.AIErrors.ErrorCodes.TIMEOUT, t('error.timeout'), 'timeout');
        }
        if (err instanceof TypeError) {
          throw MT.AIErrors.AIError(MT.AIErrors.ErrorCodes.NETWORK, t('error.network'), err.message);
        }
        throw err;
      });
  }

  return {
    LOCAL_API_BASE,
    getModel, setModel,
    getMode, setMode,
    getCustomKey, setApiKey,
    testConnection, chatCompletion
  };
})();