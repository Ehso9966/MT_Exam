window.MT = window.MT || {};

MT.BaiClient = (function () {
  const DEFAULT_BASE_URL = 'https://api.b.ai/v1';
  const DEFAULT_MODEL = 'deepseek-v4-flash-vision-exp';
  const MAX_TOKEN_CAP = 16384;
  const DEFAULT_TIMEOUT_MS = 120000;

  // Free public demo keys ("MT AI"). Stored base64 so they are not plaintext in
  // the source, never logged, and never written to localStorage. They are
  // assembled only when a request is actually sent.
  const MT_AI_KEYS = {
    main: atob('c2stMTc3ZTMxYTAxczc2bnQ3MHBpM3Z5cmF5eDM1eHlqMGI='),
    secondary: atob('c2stMTcxNHQ2MG95cWd6czVlbWRraGs0Y2pzaG1xcDZxdTA=')
  };

  const MODE_KEYS = {
    mtai: 'mtai',
    custom: 'custom'
  };

  function t(key) { return MT.Utils.t(key); }

  function getCustomKey() {
    return localStorage.getItem(MT.Constants.STORAGE_KEYS.apiKey) || '';
  }

  function getMode() {
    const m = localStorage.getItem(MT.Constants.STORAGE_KEYS.aiMode);
    if (m === MODE_KEYS.mtai || m === MODE_KEYS.custom) return m;
    // Default: MT AI for new users; keep BYOK if a key was already saved.
    return getCustomKey() ? MODE_KEYS.custom : MODE_KEYS.mtai;
  }

  function setMode(mode) {
    localStorage.setItem(MT.Constants.STORAGE_KEYS.aiMode, mode === MODE_KEYS.custom ? MODE_KEYS.custom : MODE_KEYS.mtai);
  }

  function getApiKey() {
    return getMode() === MODE_KEYS.mtai ? MT_AI_KEYS.main : getCustomKey();
  }

  // Key used for the retry-on-fallback-model attempt (secondary MT AI key).
  function getFallbackKey() {
    return getMode() === MODE_KEYS.mtai ? MT_AI_KEYS.secondary : getCustomKey();
  }

  function getApiKeyByMode(mode) {
    return mode === MODE_KEYS.mtai ? MT_AI_KEYS.main : getCustomKey();
  }

  function setApiKey(key) {
    if (key) localStorage.setItem(MT.Constants.STORAGE_KEYS.apiKey, key.trim());
    else localStorage.removeItem(MT.Constants.STORAGE_KEYS.apiKey);
  }

  function getModel() {
    if (getMode() === MODE_KEYS.mtai) return DEFAULT_MODEL; // locked in MT AI mode
    return localStorage.getItem(MT.Constants.STORAGE_KEYS.model) || DEFAULT_MODEL;
  }

  function setModel(model) {
    if (model) localStorage.setItem(MT.Constants.STORAGE_KEYS.model, model.trim());
    else localStorage.removeItem(MT.Constants.STORAGE_KEYS.model);
  }

  function testConnection(apiKey, baseUrl) {
    return fetch(baseUrl + '/models', {
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + apiKey }
    }).then(function (res) {
      if (!res.ok) throw MT.AIErrors.fromHttp(res.status, null);
      return res.json();
    });
  }

  function chatCompletion(params) {
    const apiKey = params.apiKey || getApiKey();
    if (!apiKey) throw MT.AIErrors.AIError(MT.AIErrors.ErrorCodes.NO_KEY, t('error.noKey'));

    const baseUrl = params.baseUrl || DEFAULT_BASE_URL;
    const primaryModel = params.model || getModel();
    const timeoutMs = params.timeoutMs || DEFAULT_TIMEOUT_MS;
    const maxTokens = Math.min(params.maxTokens || MAX_TOKEN_CAP, MAX_TOKEN_CAP);
    const temperature = params.temperature != null ? params.temperature : 0.1;
    const responseFormat = params.responseFormat || { type: 'json_object' };

    function attempt(model, key) {
      const authKey = key || apiKey;
      const controller = new AbortController();
      const timer = setTimeout(function () { controller.abort(); }, timeoutMs);

      return fetch(baseUrl + '/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + authKey
        },
        body: JSON.stringify({
          model: model,
          messages: params.messages,
          max_tokens: maxTokens,
          temperature: temperature,
          response_format: responseFormat
        }),
        signal: controller.signal
      }).then(function (res) {
        clearTimeout(timer);
        if (!res.ok) {
          return res.json().catch(function () { return null; }).then(function (body) {
            throw MT.AIErrors.fromHttp(res.status, body);
          });
        }
        return res.json();
      }).catch(function (err) {
        clearTimeout(timer);
        if (err.name === 'AbortError') {
          throw MT.AIErrors.AIError(MT.AIErrors.ErrorCodes.TIMEOUT, t('error.timeout'), 'timeout ' + timeoutMs + 'ms');
        }
        if (err instanceof TypeError) {
          throw MT.AIErrors.AIError(MT.AIErrors.ErrorCodes.NETWORK, t('error.network'), err.message);
        }
        throw err;
      });
    }

    return attempt(primaryModel, apiKey).catch(function (err) {
      if (!MT.AIErrors.isTransient(err)) throw err;
      const fallback = getFallbackModel(primaryModel);
      if (!fallback || fallback === primaryModel) throw err;
      return new Promise(function (resolve) { setTimeout(resolve, 600); }).then(function () {
        return attempt(fallback, getFallbackKey());
      });
    });
  }

  function getFallbackModel(primaryModel) {
    const models = (MT.ModelDiscovery && MT.ModelDiscovery.getVisionModels) ? MT.ModelDiscovery.getVisionModels() : null;
    if (models && models.length > 0) {
      const alt = models.filter(function (m) { return m !== primaryModel; })[0];
      if (alt) return alt;
    }
    if (primaryModel !== DEFAULT_MODEL) return DEFAULT_MODEL;
    return null;
  }

  return { getApiKey, setApiKey, getMode, setMode, getCustomKey, getModel, setModel, testConnection, chatCompletion, DEFAULT_BASE_URL };
})();