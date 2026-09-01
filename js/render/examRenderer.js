window.MT = window.MT || {};

function hasInlineMath(text) {
  const t = String(text || '');
  return t.indexOf('$') >= 0 || t.indexOf('\\(') >= 0 || t.indexOf('\\[') >= 0;
}

// Wrap bare LaTeX commands (e.g. \vec{a}, \frac{a}{b}, \tan \phi, \sum_{i=1}^{n})
// in $...$ so KaTeX displays them, even when the AI did not add delimiters.
function ensureMathDelimiters(text) {
  var t = String(text || '');
  if (!t || /\$|\\\(|\\\[/.test(t)) return t;
  var MATH_CMDS = 'vec|overrightarrow|frac|dfrac|tfrac|sqrt|cbrt|pi|theta|alpha|beta|gamma|delta|' +
    'epsilon|varepsilon|zeta|eta|iota|kappa|lambda|mu|nu|xi|rho|sigma|tau|upsilon|phi|varphi|chi|psi|omega|' +
    'Gamma|Delta|Theta|Lambda|Xi|Pi|Sigma|Upsilon|Phi|Psi|Omega|sum|prod|int|iint|iiint|oint|' +
    'sin|cos|tan|cot|sec|csc|arcsin|arccos|arctan|sinh|cosh|tanh|log|ln|lg|exp|lim|min|max|det|gcd|arg|' +
    'leq|geq|neq|ne|le|ge|ll|gg|pm|mp|times|div|cdot|cdotp|propto|sim|simeq|approx|cong|equiv|notin|in|ni|' +
    'subset|supset|subseteq|supseteq|cup|cap|emptyset|varnothing|forall|exists|neg|lnot|' +
    'to|rightarrow|leftarrow|Rightarrow|Leftarrow|mapsto|longrightarrow|longleftarrow|uparrow|downarrow|' +
    'infty|partial|nabla|circ|degree|angle|triangle|parallel|perp|prime|ldots|cdots|vdots|ddots|bigcup|bigcap|' +
    'mathbf|mathbb|mathcal|mathrm|mathit|overline|underline|overbrace|underbrace|hat|bar|vec|dot|ddot|tilde|' +
    'left|right|big|Big|bigg|Bigg|begin|end|array|matrix|pmatrix|bmatrix|cases|text|mbox|operatorname|binom|stackrel';
  var COMMAND = new RegExp('\\\\(' + MATH_CMDS + ')(?![a-zA-Z])');
  var out = '';
  var i = 0;
  while (i < t.length) {
    var rel = COMMAND.exec(t.slice(i));
    if (!rel) { out += t.slice(i); break; }
    out += t.slice(i, i + rel.index);
    var start = i + rel.index;
    var k = start + rel[0].length;
    // consume consecutive {..} argument groups
    while (k < t.length && t[k] === '{') {
      var d = 1; k++;
      while (k < t.length && d > 0) {
        if (t[k] === '{') d++;
        else if (t[k] === '}') d--;
        k++;
      }
    }
    // consume adjacent sub/superscripts: ^... or _... (brace group or single char)
    while (k < t.length && (t[k] === '^' || t[k] === '_')) {
      k++;
      if (t[k] === '{') {
        var d2 = 1; k++;
        while (k < t.length && d2 > 0) {
          if (t[k] === '{') d2++;
          else if (t[k] === '}') d2--;
          k++;
        }
      } else if (k < t.length) {
        k++;
      }
    }
    out += '$' + t.slice(start, k) + '$';
    i = k;
  }
  return out;
}

MT.ExamRenderer = (function () {
  function t(key) { return MT.Utils.t(key); }

  function editableSpan(attr, value) {
    const cls = 'editable' + (value ? '' : ' editable-empty');
    return '<span class="' + cls + '" data-edit="' + attr + '" title="' + t('render.clickToEdit') + '">' +
      (value ? MT.Utils.escapeHtml(value) : '—') + '</span>';
  }

  function renderExam(exam) {
    const container = document.getElementById('paperPreview');
    if (!container) return;

    const settings = (exam && exam.settings) || MT.Constants.DEFAULT_SETTINGS;
    const pageSize = settings.pageSize || 'A4';
    const ps = MT.Constants.PAGE_SIZES[pageSize] || MT.Constants.PAGE_SIZES.A4;
    const ratio = ps.ratio;
    container.dataset.pageSize = pageSize;

    if (!exam || !exam.metadata) {
      container.innerHTML = wrapPage(ratio, '<div class="paper-empty">' + t('ui.noExamData') + '</div>');
      return;
    }

    const meta = exam.metadata;
    const lang = MT.PaperLocale.getLanguage(meta.subject);
    const L = MT.PaperLocale.labels(lang);

    if (!exam.sections || exam.sections.length === 0) {
      container.innerHTML = wrapPage(ratio,
        '<div class="paper-empty-state">' +
        '<div class="empty-emoji">📄</div>' +
        '<div class="empty-title">' + t('ui.noQuestionsTitle') + '</div>' +
        '<div class="empty-desc">' + t('ui.scanHint') + '</div>' +
        '<div class="empty-actions">' +
        '<button type="button" class="btn secondary" data-empty-action="add">➕ ' + t('ui.addSectionTitle') + '</button>' +
        '</div>' +
        '</div>');
      return;
    }

    try {
      const headerHtml = renderHeader(exam, lang, L);

      const units = buildUnits(exam, settings, lang, L);

      const pages = paginate(pageSize, headerHtml, units, null, settings);

      // Render each page at its true physical size and scale it down to fit
      // the phone screen with transform:scale (reset to none when printing).
      const geo = getPrintGeometry(pageSize, settings);
      const availW = container.clientWidth || geo.pxW;
      let scale = Math.min(1, availW / geo.pxW);
      if (!(scale > 0)) scale = 1;

      let html = pages.map(function (p) {
        return '<div class="preview-page-wrap" style="width:' + Math.round(geo.pxW * scale) + 'px;height:' + Math.round(geo.pxH * scale) + 'px">' +
          '<div class="paper-preview" style="width:' + geo.pxW + 'px;height:' + geo.pxH + 'px;padding:' + geo.pad + 'px;box-sizing:border-box;font-size:' + geo.fontSize + 'pt;--paper-scale:1;--qfont-size:' + geo.fontSize + 'pt;--mt-spacing:' + geo.spacing + ';transform:scale(' + scale + ');transform-origin:top left;max-width:none">' + p + '</div>' +
          '</div>';
      }).join('');
      html += '<button type="button" class="add-section-slot" data-add-section>' +
        '<span class="plus">+</span><span>' + t('ui.addSectionTitle') + '</span></button>';

      container.innerHTML = html;
      MT.MathRenderer.renderAllInElement(container);
    } catch (e) {
      console.error('[renderExam]', e);
      // Fallback: render all content on one un-paginated page
      try {
        const headerHtml = renderHeader(exam, lang, L);
        let fb = '<div class="paper-preview">' + headerHtml;
        exam.sections.forEach(function (section) {
          fb += '<div class="section-block">';
          fb += '<div class="section-title-row"><span class="section-title">' +
            MT.Utils.escapeHtml(MT.PaperLocale.getSectionTitle(section, lang)) + '</span></div>';
          (section.questions || []).forEach(function (q) {
            fb += renderQuestion(q, section.id, settings, lang);
          });
          fb += '</div>';
        });
        fb += '</div>';
        container.innerHTML = fb;
      } catch (e2) {
        container.innerHTML = wrapPage(ratio, '<div class="paper-empty">' + t('ui.renderFailed') + '</div>');
      }
    }
  }

  function wrapPage(ratio, innerHtml) {
    return '<div class="paper-preview">' + innerHtml + '</div>';
  }

  function renderHeader(exam, lang, L) {
    const meta = exam.metadata;
    const hide = (exam.settings && exam.settings.hideExamInfo) || {};
    let html = '';
    html += '<div class="paper-header">';
    html += '<div class="school-line">';
    if (!hide.grade) {
      html += '<span class="sch-item sch-left editable' + (meta.grade ? '' : ' editable-empty') + '" data-edit="grade" title="' + t('render.clickToEdit') + '">' +
        (meta.grade ? L.grade + (lang === 'en' ? meta.grade : MT.Utils.toMyanmarDigits(meta.grade)) : '—') + '</span>';
    }
    if (!hide.school) html += '<span class="school-name">' + editableSpan('school', meta.school) + '</span>';
    if (!hide.duration) {
      if (meta.duration) {
        const isHour = meta.durationUnit === 'hour';
        html += '<span class="sch-item sch-right editable" data-edit="duration" title="' + t('render.clickToEdit') + '">' +
          MT.PaperLocale.formatDuration(lang, meta.duration, isHour ? 'hour' : 'min') + '</span>';
      } else {
        html += '<span class="sch-item sch-right editable editable-empty" data-edit="duration" title="' + t('render.clickToEdit') + '">—</span>';
      }
    }
    html += '</div>';
    if (!hide.title) {
      html += '<div class="exam-title editable" data-edit="title" title="' + t('render.clickToEdit') + '">' +
        MT.Utils.escapeHtml(meta.title || MT.PaperLocale.fallbackTitle(meta.subject, lang)) + '</div>';
    }
    html += '<div class="exam-meta">';
    if (!hide.subject && meta.subject) {
      html += '<span>' + L.subject + '<span class="editable" data-edit="subject" title="' + t('render.clickToEdit') + '">' +
        MT.Utils.escapeHtml(lang === 'en' ? MT.PaperLocale.translateSubject(meta.subject) : meta.subject) + '</span></span>';
    }
    if (!hide.totalMarks && meta.totalMarks) {
      html += '<span>' + L.marks + '<span class="editable" data-edit="totalMarks" title="' + t('render.clickToEdit') + '">' +
        (lang === 'en' ? meta.totalMarks : MT.Utils.toMyanmarDigits(meta.totalMarks)) + '</span></span>';
    }
    html += '</div>';
    html += '</div>';
    return html;
  }

  function renderSectionTitleRow(section, settings, lang, L, index) {
    const title = sectionTitleWithIndex(section, lang, index, settings);
    if (section.type === 'section_a') {
      return '<div class="section-title-row section-a-row">' +
        '<span class="section-title section-a-title" data-section-title="' + section.id + '" title="' + t('render.clickToManage') + '">' +
        MT.Utils.escapeHtml(title) + '</span></div>';
    }
    let html = '<div class="section-title-row">';
    html += '<span class="section-title section-title-editable" data-section-title="' + section.id + '" title="' + t('render.clickToManage') + '">' +
      MT.Utils.escapeHtml(title) + '</span>';
    if (settings.showMarks !== false && section.marks) {
html += '<span class="section-title-marks">' +
        MT.PaperLocale.formatMarks(lang, MT.ExamModel.sectionMarks(section)) + '</span>';
    }
    html += '</div>';
    return html;
  }

  // Section headings get a number prefix in the chosen style
  // ("1.", "I.", "(1)", …) in every numbering mode. section_a headings keep
  // their letter label and are never numbered.
  function sectionTitleWithIndex(section, lang, index, settings) {
    const title = MT.PaperLocale.getSectionTitle(section, lang);
    if (section.type !== 'section_a' && index != null) {
      const styleId = (settings && settings.sectionNumberStyle) || 'arabic';
      return MT.NumberStyles.display(index + 1, styleId, lang) + ' ' + title;
    }
    return title;
  }

  function renderSectionInstruction(section, lang) {
    return '<div class="section-instruction">' + MT.MathRenderer.renderTextWithMath(ensureMathDelimiters(section.instruction)) + '</div>';
  }

  // Flat list of page units (section heading, instruction, question) in order.
  // Used by both the on-screen renderer and the standalone print renderer so
  // they paginate identically.
  function buildUnits(exam, settings, lang, L) {
    const units = [];
    let sectionNum = 0;
    exam.sections.forEach(function (section) {
      const numIndex = section.type === 'section_a' ? null : sectionNum++;
      units.push({ html: renderSectionTitleRow(section, settings, lang, L, numIndex), type: 'section' });
      if (section.instruction) {
        units.push({ html: renderSectionInstruction(section, lang), type: 'instruction' });
      }
      section.questions.forEach(function (q) {
        units.push({ html: renderQuestion(q, section.id, settings, lang), type: 'question' });
      });
    });
    return units;
  }

  function renderQuestion(q, sectionId, settings, lang) {
    const L = MT.PaperLocale.labels(lang || 'my');
    const hasSubs = q.subQuestions && q.subQuestions.length > 0;
    const qStyleId = (settings && settings.questionNumberStyle) || 'arabic';
    const numText = MT.NumberStyles.display(q.number, qStyleId, lang);
    let html = '';
    html += '<div class="preview-question' + (q.type === 'tf' ? ' tf' : '') + '" data-qid="' + q.id + '" data-section-id="' + sectionId + '" title="' + t('render.clickToEdit') + '">';
    html += '<span class="pq-number">' + numText + '</span>';
    html += '<div class="pq-body">';
    // When a question has sub-questions it is just a numbered container —
    // the main question text is hidden and only (a), (b), (c)... are shown.
    if (hasSubs) {
      html += renderSubQuestions(q.subQuestions, settings && settings.subQuestionNumberStyle, lang, settings);
    } else {
    // If text contains inline option markers (A. B. C. / က. ခ. ဂ.), split them for display.
    var extractedOptions = null;
    var extractedStem = null;
    if (q.type === 'mcq' && (!q.options || q.options.length === 0)) {
      var extracted = MT.ResponseParser.extractInlineOptions(q.text);
      if (extracted && extracted.options.length >= 2) {
        extractedOptions = extracted.options;
        extractedStem = extracted.stem;
      }
    }
    var displayText = ensureMathDelimiters(extractedStem || q.text);
    html += '<span class="pq-text">' + MT.MathRenderer.renderTextWithMath(displayText) + '</span>';

    if (q.latex && q.latex.length > 0 && !hasInlineMath(displayText)) {
      q.latex.forEach(function (l) {
        html += MT.MathRenderer.renderBlock(l);
      });
    }

    // Options are only shown for MCQ questions (never for math/calculation etc.).
    var displayOptions = q.type === 'mcq' ? ((q.options && q.options.length > 0) ? q.options : extractedOptions) : null;
    if (displayOptions && displayOptions.length > 0) {
      var myLang = lang === 'my';
      var myLetters = MT.ExamModel && MT.ExamModel.SECTION_LETTERS_MY;
      html += '<ul class="pq-options' + (myLang ? ' my' : '') + '">';
      displayOptions.forEach(function (opt, oi) {
        html += '<li>' +
          (myLang && myLetters[oi] ? '<span class="pq-opt-letter">' + myLetters[oi] + '.</span>' : '') +
          MT.MathRenderer.renderTextWithMath(ensureMathDelimiters(opt)) + '</li>';
      });
      html += '</ul>';
    }

    if (settings.showAnswerLines !== false && (q.type === 'long' || q.type === 'short' || q.type === 'math' || q.type === 'blank')) {
      html += '<div class="answer-lines"><div class="line"></div>';
      if (q.type === 'long') html += '<div class="line"></div>';
      html += '</div>';
    }
    }

    html += '</div>';
    if (!hasSubs && settings.showMarks !== false && q.marks != null) {
      html += '<span class="pq-marks">(' + MT.PaperLocale.formatMarks(lang, q.marks) + ')</span>';
    }
    html += '</div>';
    return html;
  }

  // Sub-questions (a), (b), (c)... rendered under the numbered container.
  function renderSubQuestions(subs, styleId, lang, settings) {
    const sId = styleId || 'parenthesizedLettersLower';
    const l = lang || 'my';
    const showMarks = !settings || settings.showMarks !== false;
    let html = '<ol class="pq-subs">';
    (subs || []).forEach(function (sub, i) {
      html += '<li class="pq-sub"><span class="pq-sub-letter">' + MT.NumberStyles.display(i + 1, sId, l) + '</span>' +
        '<span class="pq-sub-text">' + MT.MathRenderer.renderTextWithMath(ensureMathDelimiters(sub.text)) + '</span>';
      if (showMarks && sub.marks != null) {
        html += '<span class="pq-sub-marks">(' + MT.PaperLocale.formatMarks(l, sub.marks) + ')</span>';
      }
      html += '</li>';
    });
    html += '</ol>';
    return html;
  }

  /* ---------- Pagination: pack content into fixed physical-size pages ---------- */
  // Convert a page size (mm) to CSS pixels at 96 DPI and derive the print
  // margins, so measurement matches what print.css renders (210mm A4 etc.).
  // pagePadding is driven by the "Page Spacing" stepper (px; minus = tighter).
  function getPrintGeometry(pageSize, settings) {
    const ps = MT.Constants.PAGE_SIZES[pageSize] || MT.Constants.PAGE_SIZES.A4;
    const DPI = 96;
    const MM = 25.4;
    const pxW = Math.round((ps.w / MM) * DPI);
    const pxH = Math.round((ps.h / MM) * DPI);
    const sp = settings || {};
    const limits = MT.Constants.PADDING_LIMITS || { min: 20, max: 80, default: 57 };
    const raw = sp.pagePadding != null ? Number(sp.pagePadding) : limits.default;
    const pad = Math.min(limits.max, Math.max(limits.min, (isFinite(raw) ? raw : limits.default)));
    // Element margins scale proportionally with the page padding so the whole
    // paper tightens/loosens together (1.0 == default 57px look).
    const spacing = Math.min(1.4, Math.max(0.35, pad / limits.default));
    return { ps: ps, pxW: pxW, pxH: pxH, pad: Math.round(pad), fontSize: 12, spacing: spacing };
  }

  function paginate(pageSize, header, units, parent, settings) {
    const allUnits = units.map(function (u) { return u.html; }).join('');
    const fallback = [header + allUnits];
    const container = parent || document.getElementById('paperPreview');
    if (!container) return fallback;

    const geo = getPrintGeometry(pageSize, settings);
    const contentTop = geo.pad;
    const contentBottom = geo.pxH - geo.pad;

    const measurer = document.createElement('div');
    measurer.style.cssText = 'position:fixed;left:-99999px;top:0;width:' + geo.pxW + 'px;visibility:hidden;pointer-events:none;';
    try {
      const sheet = document.createElement('div');
      sheet.className = 'paper-preview';
      sheet.style.cssText = 'width:' + geo.pxW + 'px;height:' + geo.pxH + 'px;padding:' + geo.pad + 'px;box-sizing:border-box;font-size:' + geo.fontSize + 'pt;--paper-scale:1;--qfont-size:' + geo.fontSize + 'pt;--mt-spacing:' + geo.spacing + ';max-width:none;';
      sheet.innerHTML = header + allUnits;
      measurer.appendChild(sheet);
      document.body.appendChild(measurer);
      MT.MathRenderer.renderAllInElement(sheet);

      // Measure at the same fixed geometry the print output uses. offsetTop/
      // offsetHeight are layout coordinates (unaffected by any ancestor
      // transform), so scale can never be applied twice.
      const els = sheet.querySelectorAll('.section-title-row, .section-instruction, .preview-question');
      const tops = [];
      const heights = [];
      for (let i = 0; i < els.length; i++) {
        tops.push(els[i].offsetTop);
        heights.push(els[i].offsetHeight);
      }

      const headerEl = sheet.querySelector('.paper-header');
      const headerBottom = headerEl ? (headerEl.offsetTop + headerEl.offsetHeight) : contentTop;

      const gaps = [];
      for (let i = 0; i < units.length; i++) {
        gaps.push(i === 0 ? (tops[0] - headerBottom) : (tops[i] - (tops[i - 1] + heights[i - 1])));
      }

      const pages = [];
      let cur = [header];
      let used = headerBottom;

      for (let i = 0; i < units.length; i++) {
        const gap = gaps[i] != null ? gaps[i] : 0;
        const h = heights[i] != null ? heights[i] : 0;
        // A section heading always stays with the unit that follows it, so a
        // heading is never stranded at the bottom of a page.
        const groupNeed = (units[i].type === 'section' && i + 1 < units.length)
          ? gap + h + (gaps[i + 1] || 0) + (heights[i + 1] || 0)
          : gap + h;

        const fitsAlone = (used + gap + h) <= contentBottom;
        const fitsGroup = (used + groupNeed) <= contentBottom;

        if (!fitsAlone || !fitsGroup) {
          pages.push(cur.join(''));
          cur = [];
          used = contentTop + h;
        } else {
          used += gap + h;
        }
        cur.push(units[i].html);
      }
      pages.push(cur.join(''));
      return pages;
    } catch (e) {
      console.error('[paginate]', e);
      return fallback;
    } finally {
      if (measurer.parentNode) measurer.parentNode.removeChild(measurer);
    }
  }

  return { renderExam, renderQuestion, renderHeader, renderSectionTitleRow, renderSectionInstruction, buildUnits, hasInlineMath, ensureMathDelimiters, editableSpan, getPrintGeometry, paginate };
})();
