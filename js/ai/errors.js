window.MT = window.MT || {};

MT.AIErrors = (function () {
  function t(key, vars) { return MT.Utils.t(key, vars); }

  const ErrorCodes = {
    NO_KEY: 'NO_KEY',
    HTTP_ERROR: 'HTTP_ERROR',
    NETWORK: 'NETWORK',
    PARSE: 'PARSE',
    SCHEMA: 'SCHEMA',
    RATE_LIMIT: 'RATE_LIMIT',
    AUTH: 'AUTH',
    TIMEOUT: 'TIMEOUT',
    EMPTY_CONTENT: 'EMPTY_CONTENT',
    MAX_TOKENS: 'MAX_TOKENS',
    TRUNCATED: 'TRUNCATED',
    FILE_READ: 'FILE_READ',
    IMAGE_DECODE: 'IMAGE_DECODE'
  };

  function AIError(code, message, detail) {
    const err = new Error(message);
    err.code = code;
    err.detail = detail || null;
    return err;
  }

  function errorWithCode(code, cause, fallbackMessage) {
    const msg = (cause && cause.message) || fallbackMessage || t('error.generic');
    const err = new Error(msg);
    err.code = code;
    err.detail = (cause && (cause.name || cause.message)) || null;
    err.cause = cause || null;
    return err;
  }

  function fromHttp(status, body) {
    if (status === 401 || status === 403) {
      return AIError(ErrorCodes.AUTH, t('error.auth'), status + ' ' + (body && body.message ? body.message : ''));
    }
    if (status === 429) {
      return AIError(ErrorCodes.RATE_LIMIT, t('error.rateLimit'), String(status));
    }
    if (status === 400) {
      return AIError(ErrorCodes.HTTP_ERROR, t('error.badRequest'), body && body.message ? body.message : '');
    }
    return AIError(ErrorCodes.HTTP_ERROR, t('error.serverError', { code: status }), body && body.message ? body.message : '');
  }

  function friendlyMessage(err) {
    if (!err) return t('error.generic');
    if (err.code === ErrorCodes.NO_KEY) return t('error.noKey');
    if (err.code === ErrorCodes.AUTH) return t('error.auth');
    if (err.code === ErrorCodes.RATE_LIMIT) return t('error.rateLimit');
    if (err.code === ErrorCodes.NETWORK) return t('error.network');
    if (err.code === ErrorCodes.TIMEOUT) return t('error.timeout');
    if (err.code === ErrorCodes.MAX_TOKENS) return t('error.maxTokens');
    if (err.code === ErrorCodes.TRUNCATED) return t('error.truncated');
    if (err.code === ErrorCodes.FILE_READ) return t('error.fileRead');
    if (err.code === ErrorCodes.IMAGE_DECODE) return t('error.imageDecode');
    if (err.code === ErrorCodes.PARSE || err.code === ErrorCodes.SCHEMA) {
      return t('error.parse');
    }
    if (err.code === ErrorCodes.EMPTY_CONTENT) return t('error.emptyContent');
    return err.message || t('error.generic');
  }

  function isTransient(err) {
    if (!err || !err.code) return false;
    return err.code === ErrorCodes.TIMEOUT ||
      err.code === ErrorCodes.RATE_LIMIT ||
      err.code === ErrorCodes.TRUNCATED ||
      err.code === ErrorCodes.MAX_TOKENS ||
      err.code === ErrorCodes.NETWORK;
  }

  return { ErrorCodes, AIError, errorWithCode, fromHttp, friendlyMessage, isTransient };
})();
