window.MT = window.MT || {};

/* MT.Workspace — responsive view controller for the editor.
 *
 * It owns three pieces of state:
 *   - currentTab : 'editor' | 'preview'   (mobile bottom tab bar)
 *   - view       : 'list'  | 'detail'     (question list vs full-page editor)
 *   - active     : the section/question currently open in the detail view
 *
 * The DOM itself lives in index.html (#editorArea > #questionListView /
 * #questionDetailView, #previewArea, #mtTabbar) and visibility is driven purely
 * through body classes (ws-editor-list / ws-editor-detail / ws-preview) so CSS
 * stays the single source of truth for layout.
 *
 * Nothing here is rendered for print — print.css hides all of this chrome.
 */
MT.Workspace = (function () {
  var TAB_EDITOR = 'editor';
  var TAB_PREVIEW = 'preview';

  var currentTab = TAB_EDITOR;
  var view = 'list';                 // 'list' | 'detail'
  var active = { sectionId: null, questionId: null, focusSubIndex: null };
  var highlightId = null;            // last opened question (list highlight)
  var listScroll = 0;                // saved list scroll position
  var previewScroll = 0;             // saved preview scroll position
  var detailBody = null;             // element returned by renderQuestionEditor
  var initialized = false;
  var stateUnsub = null;
  var langUnsub = null;

  var els = { area: null, list: null, detail: null, preview: null, tabbar: null };

  function t(key, vars, fallback) { return MT.Utils.t(key, vars, fallback); }

  /* ============================ lifecycle ============================ */

  function init() {
    if (initialized) return;
    els.area = document.getElementById('editorArea');
    els.list = document.getElementById('questionListView');
    els.detail = document.getElementById('questionDetailView');
    els.preview = document.getElementById('previewArea');
    els.tabbar = document.getElementById('mtTabbar');
    if (!els.area || !els.list || !els.detail) return;
    initialized = true;

    bindTabs();
    bindKeyboard();
    bindMedia();
    bindResize();

    var firstSection = (MT.State.get().sections || [])[0];
    MT.QuestionList.mount(els.list, {
      onOpenQuestion: openQuestion,
      initialSectionId: firstSection ? firstSection.id : null
    });

    stateUnsub = MT.State.subscribe(onStateChanged);
    if (MT.Events && MT.Events.on && MT.EVENTS) {
      langUnsub = MT.Events.on(MT.EVENTS.LANG_CHANGED, function () {
        if (view === 'detail') { flush(); renderDetail(); }
        else if (MT.QuestionList && MT.QuestionList.refresh) MT.QuestionList.refresh();
      });
    }

    showList(true);
    applyBody();
  }

  function destroy() {
    if (!initialized) return;
    if (stateUnsub) { try { stateUnsub(); } catch (e) {} stateUnsub = null; }
    if (langUnsub) { try { langUnsub(); } catch (e) {} langUnsub = null; }
    if (MT.QuestionList && MT.QuestionList.unmount) MT.QuestionList.unmount();
    document.body.classList.remove('ws-editor-list', 'ws-editor-detail', 'ws-preview', 'kb-open');
    initialized = false;
  }

  /* ============================ body state =========================== */

  function applyBody() {
    var b = document.body;
    b.classList.remove('ws-editor-list', 'ws-editor-detail', 'ws-preview');
    if (currentTab === TAB_PREVIEW) b.classList.add('ws-preview');
    else b.classList.add(view === 'detail' ? 'ws-editor-detail' : 'ws-editor-list');

    if (els.tabbar) {
      els.tabbar.querySelectorAll('[data-tab]').forEach(function (btn) {
        var on = btn.getAttribute('data-tab') === currentTab;
        btn.classList.toggle('active', on);
        if (on) btn.setAttribute('aria-current', 'page');
        else btn.removeAttribute('aria-current');
      });
    }
  }

  function bindTabs() {
    if (!els.tabbar) return;
    els.tabbar.querySelectorAll('[data-tab]').forEach(function (btn) {
      btn.addEventListener('click', function () { setTab(btn.getAttribute('data-tab')); });
    });
  }

  function setTab(tab) {
    if (tab !== TAB_EDITOR && tab !== TAB_PREVIEW) return;
    if (tab === currentTab) return;

    // Both tabs scroll the same container (.app-main on mobile), so remember
    // where each one was before hiding it.
    var scroller = scrollParentOf(els.list);
    if (currentTab === TAB_PREVIEW) previewScroll = scroller.scrollTop;
    else if (view === 'list') listScroll = scroller.scrollTop;

    // Leaving the editor: flush any in-flight text/marks so nothing is lost.
    if (tab === TAB_PREVIEW) flush();
    currentTab = tab;
    applyBody();

    requestAnimationFrame(function () {
      if (!els.list) return;
      var s = scrollParentOf(els.list);
      if (tab === TAB_PREVIEW) s.scrollTop = previewScroll;
      else s.scrollTop = (view === 'detail') ? 0 : listScroll;
    });

    // The paper is rendered while display:none (clientWidth === 0), so its
    // scale is wrong until it is re-rendered visible.
    if (tab === TAB_PREVIEW) refreshPreview();
  }

  function isDetail() { return view === 'detail'; }
  function isPreviewTab() { return currentTab === TAB_PREVIEW; }

  /* ============================ preview ============================== */

  function previewVisible() {
    return !!(els.preview && els.preview.clientWidth > 0);
  }

  // The paper is rendered into a singleton #paperPreview whose scale is derived
  // from container.clientWidth — which is 0 while it is display:none. Re-render
  // after it becomes visible so the pages fit the screen again.
  function refreshPreview() {
    requestAnimationFrame(function () {
      try {
        if (MT.App && MT.App.renderPreview) MT.App.renderPreview();
        else if (MT.App && MT.App.render) MT.App.render();
      } catch (e) { console.error('[workspace] refreshPreview', e); }
    });
  }

  var resizeTimer = null;
  function bindResize() {
    window.addEventListener('resize', function () {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        resizeTimer = null;
        if (previewVisible()) refreshPreview();
      }, 180);
    });
  }

  function bindMedia() {
    if (!window.matchMedia) return;
    var mq = window.matchMedia('(min-width: 1024px)');
    var handler = function (e) { if (e.matches && previewVisible()) refreshPreview(); };
    if (mq.addEventListener) mq.addEventListener('change', handler);
    else if (mq.addListener) mq.addListener(handler);
  }

  /* ============================ keyboard ============================= */

  // Slide the tab bar (and FAB) out of the way while the soft keyboard is up so
  // they can never cover a field, a button or the keyboard itself.
  function isEditable(node) {
    if (!node || !node.tagName) return false;
    var tag = node.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || node.isContentEditable === true;
  }

  function bindKeyboard() {
    document.addEventListener('focusin', function (e) {
      if (isEditable(e.target)) document.body.classList.add('kb-open');
    });
    document.addEventListener('focusout', function () {
      setTimeout(function () {
        if (!isEditable(document.activeElement)) document.body.classList.remove('kb-open');
      }, 80);
    });
    window.addEventListener('blur', function () {
      document.body.classList.remove('kb-open');
    });
  }

  /* ============================ scrolling ============================ */

  function scrollParentOf(el) {
    var node = el;
    while (node && node !== document.body) {
      if (node.nodeType === 1) {
        var ov = window.getComputedStyle(node).overflowY;
        if (ov === 'auto' || ov === 'scroll' || ov === 'overlay') return node;
      }
      node = node.parentNode;
    }
    return document.scrollingElement || document.documentElement;
  }

  function saveListScroll() {
    if (els.list) listScroll = scrollParentOf(els.list).scrollTop;
  }

  function restoreListScroll() {
    requestAnimationFrame(function () {
      if (!els.list) return;
      scrollParentOf(els.list).scrollTop = listScroll;
    });
  }

  /* ============================ detail view ========================== */

  function openQuestion(sectionId, questionId, focusSubIndex) {
    if (!initialized) return;
    var section = MT.State.getSection(sectionId);
    var q = section && MT.State.getQuestion(sectionId, questionId);
    if (!q) return;

    saveListScroll();
    active = { sectionId: sectionId, questionId: questionId, focusSubIndex: focusSubIndex || null };
    highlightId = questionId;
    view = 'detail';

    MT.QuestionList.setExpanded(sectionId);
    MT.QuestionList.setActive(questionId);

    renderDetail();
    applyBody();
    scrollToDetailTop();
  }

  function isDesktop() {
    return !!(window.matchMedia && window.matchMedia('(min-width: 1024px)').matches);
  }

  // Mobile: the editor is full-page, so simply scroll the column to the top.
  // Desktop: the editor sits underneath the list, so bring it into view.
  function scrollToDetailTop() {
    requestAnimationFrame(function () {
      if (!els.detail || view !== 'detail') return;
      var scroller = scrollParentOf(els.detail);
      if (isDesktop()) {
        var d = els.detail.getBoundingClientRect();
        var s = scroller.getBoundingClientRect();
        scroller.scrollTop += (d.top - s.top);
      } else {
        scroller.scrollTop = 0;
      }
    });
  }

  function renderDetail() {
    if (!els.detail) return;
    els.detail.innerHTML = '';
    detailBody = null;

    var section = MT.State.getSection(active.sectionId);
    var q = section && MT.State.getQuestion(active.sectionId, active.questionId);
    if (!q) { showList(true); return; }

    var header = MT.Utils.el('div', { class: 'mw-page-header' });
    var backBtn = MT.Utils.el('button', { type: 'button', class: 'btn secondary mw-back' },
      t('ui.backToList', null, '‹ Back to list'));
    backBtn.addEventListener('click', function () { backToList(); });
    header.appendChild(backBtn);
    header.appendChild(MT.Utils.el('div', { class: 'mw-page-title' },
      t('ui.editingQuestion', { n: MT.Utils.digits(q.number) })));
    els.detail.appendChild(header);

    var editorWrap = MT.Utils.el('div', { class: 'mw-detail' });
    els.detail.appendChild(editorWrap);

    // Reuse the exact same editor the modal uses — same fields, types, marks,
    // math toolbar, image/AI actions. liveCommit keeps the paper preview in
    // sync while the user types.
    detailBody = MT.QuestionPopupEditor.renderQuestionEditor(
      editorWrap,
      active.sectionId,
      active.questionId,
      function () { backToList(true); },   // Save / Delete → back to the list
      active.focusSubIndex,
      { liveCommit: true }
    );
  }

  function backToList(skipFlush) {
    if (!initialized || view !== 'detail') return;
    if (!skipFlush) flush();
    view = 'list';
    active = { sectionId: null, questionId: null, focusSubIndex: null };
    detailBody = null;
    if (els.detail) els.detail.innerHTML = '';
    applyBody();
    if (MT.QuestionList && MT.QuestionList.setActive) MT.QuestionList.setActive(highlightId);
    if (MT.QuestionList && MT.QuestionList.refresh) MT.QuestionList.refresh();
    restoreListScroll();
  }

  // Called by renderDetail when the target question vanished.
  function showList(skipFlush) {
    view = 'list';
    active = { sectionId: null, questionId: null, focusSubIndex: null };
    detailBody = null;
    if (els.detail) els.detail.innerHTML = '';
    if (!skipFlush) flush();
    applyBody();
    restoreListScroll();
  }

  // Commit pending field edits without any toast / navigation side effects.
  function flush() {
    if (detailBody && typeof detailBody._mtCommit === 'function') {
      try { detailBody._mtCommit(); } catch (e) { console.error('[workspace] flush', e); }
    }
  }

  /* ============================ state sync =========================== */

  // If the open question is deleted (or its section disappears), fall back to
  // the list instead of leaving a dead editor on screen.
  function onStateChanged() {
    if (view !== 'detail') return;
    var section = MT.State.getSection(active.sectionId);
    var q = section && MT.State.getQuestion(active.sectionId, active.questionId);
    if (!q) showList(true);
  }

  /* ============================ hardware back ======================== */

  // Returns true when the back gesture was consumed (detail → list).
  function handleBack() {
    if (view === 'detail') { backToList(); return true; }
    return false;
  }

  return {
    init: init,
    destroy: destroy,
    handleBack: handleBack,
    setTab: setTab,
    isDetail: isDetail,
    isPreviewTab: isPreviewTab,
    refreshPreview: refreshPreview,
    openQuestion: openQuestion
  };
})();
