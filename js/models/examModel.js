window.MT = window.MT || {};

MT.ExamModel = (function () {
  const C = MT.Constants;

  function createSection(data) {
    return {
      id: MT.ids.sectionId(),
      title: data.title || '',
      type: data.type || C.SECTION_TYPES.SHORT,
      marks: data.marks != null ? data.marks : 0,
      instruction: data.instruction || '',
      letter: data.letter || '',
      questions: [],
      order: data.order || 0,
      createdAt: new Date().toISOString()
    };
  }

  function sectionMarks(section) {
    return section.questions.reduce(function (sum, q) {
      return sum + (Number(q.marks) || 0);
    }, 0);
  }

  function examTotalMarks(exam) {
    return exam.sections.reduce(function (sum, s) {
      return sum + sectionMarks(s);
    }, 0);
  }

  function questionCount(exam) {
    return exam.sections.reduce(function (sum, s) { return sum + s.questions.length; }, 0);
  }

  function defaultSectionTitles() {
    return {
      'mcq': 'ရွေးချယ်စရာ မေးခွန်းများ',
      'tf': 'မှန်/မှား မေးခွန်းများ',
      'short': 'အတိုဖြေ မေးခွန်းများ',
      'long': 'အသေးစိတ်ဖြေ မေးခွန်းများ',
      'math': 'တွက်ချက်မှုပုစ္ဆာ မေးခွန်းများ',
      'blank': 'ကွက်လပ်ဖြည့် မေးခွန်းများ',
      'section_a': 'Section A'
    };
  }

  function getSectionTypeLabel(type, lang) {
    const map = {
      'mcq': { my: 'ရွေးချယ်စရာ', en: 'Multiple Choice' },
      'tf': { my: 'မှန်/မှား', en: 'True / False' },
      'short': { my: 'အတိုဖြေ', en: 'Short Answer' },
      'long': { my: 'အသေးစိတ်ဖြေ', en: 'Long Answer' },
      'math': { my: 'တွက်ချက်မှုပုစ္ဆာ', en: 'Mathematics' },
      'blank': { my: 'ကွက်လပ်ဖြည့်', en: 'Fill in the Blank' },
      'section_a': { my: 'အပိုင်း (က)', en: 'Section A' }
    };
    const entry = map[type];
    if (!entry) return type;
    return lang === 'en' ? entry.en : entry.my;
  }

  // Section letter sequences — internally always Latin A-Z, mapped to Myanmar
  // letters only for display in Burmese-subject papers.
  const SECTION_LETTERS_EN = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'];
  const SECTION_LETTERS_MY = ['က','ခ','ဂ','ဃ','င','စ','ဆ','ဇ','ဈ','ဉ','ည','ဋ','ဌ','ဍ','ဎ','ဏ','တ','ထ','ဒ','ဓ','န','ပ','ဖ','ဗ','ဘ','မ'];

  function toMyanmarSectionLetter(letter) {
    const idx = SECTION_LETTERS_EN.indexOf(String(letter || '').toUpperCase());
    return idx >= 0 ? (SECTION_LETTERS_MY[idx] || '') : '';
  }

  function nextAvailableSectionLetter(exam) {
    const used = {};
    (exam.sections || []).forEach(function (s) {
      if (s.type === 'section_a' && s.letter) used[String(s.letter).toUpperCase()] = true;
    });
    for (let i = 0; i < SECTION_LETTERS_EN.length; i++) {
      if (!used[SECTION_LETTERS_EN[i]]) return SECTION_LETTERS_EN[i];
    }
    return null;
  }

  return {
    createSection,
    sectionMarks, examTotalMarks, questionCount,
    defaultSectionTitles, getSectionTypeLabel,
    SECTION_LETTERS_EN, SECTION_LETTERS_MY, toMyanmarSectionLetter, nextAvailableSectionLetter
  };
})();