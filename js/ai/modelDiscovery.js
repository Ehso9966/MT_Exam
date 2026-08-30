window.MT = window.MT || {};

MT.ModelDiscovery = (function () {
  let cachedModels = null;

  function setModels(models) {
    cachedModels = (models || []).map(function (m) {
      return typeof m === 'string' ? { id: m, name: m } : { id: m.id, name: m.id || m.name };
    });
    return cachedModels;
  }

  function getVisionModels() {
    if (!cachedModels) return null;
    return filterVisionModels(cachedModels).map(function (m) { return m.id; });
  }

  function filterVisionModels(models) {
    return models.filter(function (m) {
      return /vision|ocr|vl|image|multimodal/i.test(m.id);
    });
  }

  return { setModels, getVisionModels };
})();