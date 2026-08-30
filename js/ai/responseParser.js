window.MT = window.MT || {};

MT.ResponseParser = (function () {
  function t(key) { return MT.Utils.t(key); }

  function parseAIResponse(data) {
    if (!data) return { questions: [], raw: null, error: t('error.noAIResponse'), truncated: false, finishReason: null };

    if (data.questions && Array.isArray(data.questions)) {
      return { questions: data.questions, raw: data, error: null, truncated: false, finishReason: 'stop' };
    }

    if (data.question) {
      return { questions: [data.question], raw: data, error: null, truncated: false, finishReason: 'stop' };
    }

    if (data.choices && data.choices.length > 0) {
      const choice = data.choices[0];
      const finishReason = choice.finish_reason || null;
      const content = choice.message ? choice.message.content : (choice.text || '');

      if (finishReason === 'length' && (!content || content.trim() === '')) {
        return {
          questions: [],
          raw: data,
          error: t('error.truncated'),
          truncated: true,
          finishReason: finishReason
        };
      }

      if (!content || content.trim() === '') {
        return {
          questions: [],
          raw: data,
          error: t('error.emptyContent') + ' (finish_reason: ' + (finishReason || 'unknown') + ')',
          truncated: finishReason === 'length',
          finishReason: finishReason
        };
      }

      const result = parseJSONContent(content, data);
      result.truncated = finishReason === 'length';
      result.finishReason = finishReason;
      return result;
    }

    if (data.content) {
      const result = parseJSONContent(data.content, data);
      result.finishReason = null;
      return result;
    }

    return { questions: [], raw: data, error: t('error.parse'), truncated: false, finishReason: null };
  }

  function parseJSONContent(content, rawData) {
    const cleaned = stripFences(String(content || '').trim());

    try {
      const parsed = JSON.parse(cleaned);
      return { questions: extractQuestionList(parsed), raw: rawData, error: null };
    } catch (e) {
      // Structured fallback: extract the outermost balanced {...} or [...] block.
      // NOT naive regex cleanup — we locate the real JSON substring via brace counting.
      const extracted = extractFirstJsonBlock(cleaned);
      if (extracted !== null) {
        try {
          const parsed = JSON.parse(extracted);
          return { questions: extractQuestionList(parsed), raw: rawData, error: null };
        } catch (e2) {
          return { questions: [], raw: rawData, error: t('error.parse') + ': ' + e2.message };
        }
      }
      return { questions: [], raw: rawData, error: t('error.parse') + ': ' + e.message };
    }
  }

  function stripFences(str) {
    let s = str.trim();
    const fenceMatch = s.match(/^```(?:json)?[\s\n]*([\s\S]*?)[\s\n]*```$/);
    if (fenceMatch) return fenceMatch[1].trim();
    if (s.startsWith('```json')) s = s.slice(7).trim();
    else if (s.startsWith('```')) s = s.slice(3).trim();
    if (s.endsWith('```')) s = s.slice(0, -3).trim();
    return s;
  }

  function extractFirstJsonBlock(str) {
    const firstBrace = str.indexOf('{');
    const firstBracket = str.indexOf('[');
    let start = -1;
    let openChar, closeChar;
    if (firstBrace === -1 && firstBracket === -1) return null;
    if (firstBrace === -1) { start = firstBracket; openChar = '['; closeChar = ']'; }
    else if (firstBracket === -1) { start = firstBrace; openChar = '{'; closeChar = '}'; }
    else if (firstBrace < firstBracket) { start = firstBrace; openChar = '{'; closeChar = '}'; }
    else { start = firstBracket; openChar = '['; closeChar = ']'; }

    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let i = start; i < str.length; i++) {
      const c = str[i];
      if (inString) {
        if (escaped) { escaped = false; }
        else if (c === '\\') { escaped = true; }
        else if (c === '"') { inString = false; }
        continue;
      }
      if (c === '"') { inString = true; continue; }
      if (c === openChar) depth++;
      else if (c === closeChar) {
        depth--;
        if (depth === 0) return str.slice(start, i + 1);
      }
    }
    return null;
  }

  function extractQuestionList(parsed) {
    if (parsed && Array.isArray(parsed.questions)) return parsed.questions;
    if (parsed && parsed.question) return [parsed.question];
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === 'object') return [parsed];
    return [];
  }

  function extractQuestions(parsed, sectionId) {
    const questions = [];
    (parsed.questions || []).forEach(function (aiQ, i) {
      if (!aiQ.text && !aiQ.question) return;
      let clean = cleanQuestionText(aiQ.text || aiQ.question);
      let options = Array.isArray(aiQ.options) ? aiQ.options.slice() : [];
      let type = aiQ.type || MT.Constants.QUESTION_TYPES.SHORT;

      // Always try to split inline option markers out of the text (A. B. C. / က. ခ. ဂ.),
      // regardless of the type the AI guessed. If found, treat the question as MCQ.
      const extracted = extractInlineOptions(clean);
      if (extracted && extracted.options.length >= 2) {
        clean = extracted.stem;
        if (options.length === 0) options = extracted.options;
        type = MT.Constants.QUESTION_TYPES.MCQ;
      }

      const q = MT.QuestionModel.fromAI(aiQ, sectionId, null);
      q.text = clean;
      q.type = type;
      if (options.length > 0) q.options = options;
      q.number = i + 1;
      q.reviewStatus = MT.Constants.REVIEW_STATUS.NEEDS_REVIEW;
      questions.push(q);
    });
    return questions;
  }

  function cleanQuestionText(text) {
    let t = String(text || '').trim();
    // Remove leading original numbering: "1.", "1)", "၁.", "1)", "A.", etc.
    t = t.replace(/^\s*[0-9၀-၉]+[\.\)]\s*/, '');
    t = t.replace(/^\s*[A-Za-z][\.\)]\s*/, '');
    return t.trim();
  }

  // Detect and split inline choice markers from MCQ text, e.g.
  // "Which is correct? A. foo B. bar C. baz" → { stem: "Which is correct?", options: ["foo","bar","baz"] }
  // Supports English (A., A), (A)) and Myanmar (က., ခ., ဂ.) letters.
  // Rejects numbered parts like "(i)", "(ii)", "(iii)" that are not choices.
  function extractInlineOptions(text) {
    const t = String(text || '').trim();
    if (!t) return null;

    // Marker: a single letter followed by ". " or ") ", preceded by line start
    // or whitespace (NOT an opening paren, so "(i)" is not mistaken for a choice).
    const markerRe = /(?:^|\s)([A-Za-zက-အ])\s*[.)]\s+/g;
    const markers = [];
    let m;
    while ((m = markerRe.exec(t)) !== null) {
      const letter = m[1];
      markers.push({ index: m.index + m[0].indexOf(letter), letter: letter });
    }

    if (markers.length < 2) return null;

    // Only accept a consecutive ascending sequence starting at A / a / က
    // (rejects roman-numeral style i, ii, iii).
    function nextLetter(ch) { return String.fromCharCode(ch.charCodeAt(0) + 1); }
    const start = markers[0].letter;
    if (start !== 'A' && start !== 'a' && start !== 'က') return null;
    for (let i = 1; i < markers.length; i++) {
      if (markers[i].letter !== nextLetter(markers[i - 1].letter)) return null;
    }

    var stem = t.slice(0, markers[0].index).trim();
    var parts = [];
    for (var i = 0; i < markers.length; i++) {
      var from = markers[i].index;
      var to = i + 1 < markers.length ? markers[i + 1].index : t.length;
      var opt = t.slice(from, to).replace(/^[\s(]*[A-Za-zက-အ]\s*[.)]\s*/, '').trim();
      if (opt) parts.push(opt);
    }
    if (parts.length < 2) return null;
    return { stem: stem, options: parts };
  }

  return { parseAIResponse, extractQuestions, extractInlineOptions };
})();