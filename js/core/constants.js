window.MT = window.MT || {};

MT.Constants = (function () {
  const APP_NAME = 'MT Exam Studio';
  const APP_VERSION = '0.1.0';
  const APP_TITLE = 'MT Exam Studio — စာမေးပွဲ ရေးသားသည့် ကိရိယာ';

  const STORAGE_KEYS = {
    draft: 'mt-exam:draft',
    apiKey: 'mt-exam:apikey',
    model: 'mt-exam:model',
    settings: 'mt-exam:settings',
    i18nLang: 'mt-i18n-lang',
    tourSeen: 'mt-exam:tour-seen',
    aiMode: 'mt-exam:ai-mode'
  };

  const QUESTION_TYPES = {
    SHORT: 'short',
    MCQ: 'mcq',
    TRUE_FALSE: 'tf',
    LONG: 'long',
    MATH: 'math'
  };

  const SECTION_TYPES = {
    MCQ: 'mcq',
    TRUE_FALSE: 'tf',
    SHORT: 'short',
    LONG: 'long',
    MATH: 'math',
    SECTION_A: 'section_a'
  };

  const REVIEW_STATUS = {
    AI_EXTRACTED: 'ai_extracted',
    NEEDS_REVIEW: 'needs_review',
    EDITED: 'edited',
    APPROVED: 'approved'
  };

  const AI_STATUS = {
    NONE: 'none',
    EXTRACTING: 'extracting',
    DONE: 'done',
    FAILED: 'failed'
  };

  const DEFAULT_EXAM = {
    metadata: {
      title: '',
      subject: '',
      grade: '',
      duration: 30,
      durationUnit: 'min',
      totalMarks: 50,
      school: ''
    },
    sections: [],
    settings: {
      language: 'my',
      pageSize: 'A4',
      numbering: 'section',
      showMarks: true,
      showAnswerLines: false,
      font: 'padauk',
      questionFontSize: 12,
      pagePadding: 57,
      hideExamInfo: { title: false, school: false, subject: false, grade: false, duration: false, totalMarks: false }
    },
    version: APP_VERSION,
    createdAt: '',
    updatedAt: ''
  };

  const KA = 'KaTeX';
  const KATEX_VERSION = '0.16.11';

  const KATEX_CDN = {
    css: 'https://cdn.jsdelivr.net/npm/katex@' + KATEX_VERSION + '/dist/katex.min.css',
    js: 'https://cdn.jsdelivr.net/npm/katex@' + KATEX_VERSION + '/dist/katex.min.js',
    autoRender: 'https://cdn.jsdelivr.net/npm/katex@' + KATEX_VERSION + '/dist/contrib/auto-render.min.js'
  };

  const MATH_SYMBOLS = [
    { label: 'x²', latex: 'x^{2}', key: 'power', hint: 'ထပ်ညွှန်း' },
    { label: '√x', latex: '\\sqrt{}', key: 'sqrt', hint: 'နှစ်ထပ်ကိန်းရင်း' },
    { label: 'a/b', latex: '\\frac{}{}', key: 'frac', hint: 'အပိုင်းကိန်း' },
    { label: 'π', latex: '\\pi', key: 'pi', hint: 'ပိုင်' },
    { label: '°', latex: '^{\\circ}', key: 'degree', hint: 'ဒီဂရီ' },
    { label: '≤', latex: '\\leq', key: 'leq', hint: 'သေးသည် သို့မဟုတ် ညီ' },
    { label: '≥', latex: '\\geq', key: 'geq', hint: 'ကြီးသည် သို့မဟုတ် ညီ' },
    { label: 'Σ', latex: '\\sum_{}^{}', key: 'sum', hint: 'စုစုပေါင်း' },
    { label: '∫', latex: '\\int_{}^{}', key: 'int', hint: 'အင်တီဂရိတ်' },
    { label: '≈', latex: '\\approx', key: 'approx', hint: 'ခန့်မှန်းညီ' },
    { label: '≠', latex: '\\neq', key: 'neq', hint: 'မညီ' },
    { label: '∞', latex: '\\infty', key: 'inf', hint: 'အဆုံးမရှိ' },
    { label: '±', latex: '\\pm', key: 'pm', hint: 'ပေါင်း/နုတ်' },
    { label: '×', latex: '\\times', key: 'times', hint: 'မြှောက်' },
    { label: '÷', latex: '\\div', key: 'div', hint: 'စား' },
    { label: 'θ', latex: '\\theta', key: 'theta', hint: 'သီတာ' },
    { label: 'α', latex: '\\alpha', key: 'alpha', hint: 'အလ်ဖာ' },
    { label: 'Δ', latex: '\\Delta', key: 'delta', hint: 'ဒယ်လ်တာ' }
  ];

  const DEFAULT_SETTINGS = {
    language: 'my',
    pageSize: 'A4',
    numbering: 'section',
    sectionNumberStyle: 'arabic',
    questionNumberStyle: 'arabic',
    subQuestionNumberStyle: 'parenthesizedLettersLower',
    showMarks: true,
    showAnswerLines: false,
    font: 'padauk',
    questionFontSize: 12,
    pagePadding: 57,
    examInfoConfirmed: false,
    hideExamInfo: { title: false, school: false, subject: false, grade: false, duration: false, totalMarks: false }
  };

  const PAGE_SIZES = {
    A4: { label: 'A4', w: 210, h: 297, ratio: 210 / 297, scale: 210 / 210 },
    A5: { label: 'A5', w: 148, h: 210, ratio: 148 / 210, scale: 148 / 210 },
    Letter: { label: 'Letter', w: 215.9, h: 279.4, ratio: 215.9 / 279.4, scale: 215.9 / 210 },
    Legal: { label: 'Legal', w: 215.9, h: 355.6, ratio: 215.9 / 355.6, scale: 215.9 / 210 }
  };

  // Page padding (px) limits for the "Page Spacing" stepper on the control bar.
  // Minus = tighter, Plus = looser; the value maps 1:1 to page margins in px.
  const PADDING_LIMITS = { min: 20, max: 80, step: 2, default: 57, unit: 'px' };

  // Subjects dropdown: { my, en } pairs (value stored = my for paperLocale logic)
  const SUBJECTS = [
    { my: 'မြန်မာ', en: 'Myanmar' },
    { my: 'မြန်မာစာ', en: 'Myanmar Language' },
    { my: 'အင်္ဂလိပ်', en: 'English' },
    { my: 'အင်္ဂလိပ်စာ', en: 'English Language' },
    { my: 'သင်္ချာ', en: 'Mathematics' },
    { my: 'အဆင့်မြင့်သင်္ချာ', en: 'Higher Mathematics' },
    { my: 'အသုံးချသင်္ချာ', en: 'Applied Mathematics' },
    { my: 'ရူပဗေဒ', en: 'Physics' },
    { my: 'အဆင့်မြင့်ရူပဗေဒ', en: 'Higher Physics' },
    { my: 'ဓာတုဗေဒ', en: 'Chemistry' },
    { my: 'အဆင့်မြင့်ဓာတုဗေဒ', en: 'Higher Chemistry' },
    { my: 'ဇီဝဗေဒ', en: 'Biology' },
    { my: 'အဆင့်မြင့်ဇီဝဗေဒ', en: 'Higher Biology' },
    { my: 'သိပ္ပံ', en: 'Science' },
    { my: 'ပထဝီ', en: 'Geography' },
    { my: 'ပထဝီဝင်', en: 'Geography' },
    { my: 'သမိုင်း', en: 'History' },
    { my: 'လူမှုရေးဘာသာ', en: 'Social Studies' },
    { my: 'ဒေသဆိုင်ရာဘာသာရပ်', en: 'Regional Subject' },
    { my: 'စီးပွားရေးဘာသာ', en: 'Economics' },
    { my: 'ဘောဂဗေဒ', en: 'Economics' },
    { my: 'စာရင်းကိုင်', en: 'Accountancy' },
    { my: 'စာရင်းအင်း', en: 'Statistics' },
    { my: 'စီမံခန့်ခွဲမှု', en: 'Management' },
    { my: 'ပြင်သစ်', en: 'French' },
    { my: 'ဂျာမန်', en: 'German' },
    { my: 'ဂျပန်', en: 'Japanese' },
    { my: 'ကိုရီးယား', en: 'Korean' },
    { my: 'တရုတ်', en: 'Chinese' },
    { my: 'သင်ကြားရေး', en: 'Education' },
    { my: 'ပညာရေး', en: 'Education' },
    { my: 'ကွန်ပျူတာ', en: 'Computer Science' },
    { my: 'ကွန်ပျူတာသိပ္ပံ', en: 'Computer Science' },
    { my: 'သတင်းအချက်အလက်နည်းပညာ', en: 'Information Technology' },
    { my: 'ဥပဒေ', en: 'Law' },
    { my: 'နိုင်ငံရေးသိပ္ပံ', en: 'Political Science' },
    { my: 'နိုင်ငံတကာဆက်ဆံရေး', en: 'International Relations' },
    { my: 'စိတ်ပညာ', en: 'Psychology' },
    { my: 'လူမှုဗေဒ', en: 'Sociology' },
    { my: 'ဒဿနိကဗေဒ', en: 'Philosophy' },
    { my: 'ဘာသာဗေဒ', en: 'Linguistics' },
    { my: 'မြန်မာစာပေ', en: 'Myanmar Literature' },
    { my: 'အင်္ဂလိပ်စာပေ', en: 'English Literature' },
    { my: 'ဆေးပညာ', en: 'Medicine' },
    { my: 'သူနာပြု', en: 'Nursing' },
    { my: 'ဆေးဝါး', en: 'Pharmacy' },
    { my: 'အင်ဂျင်နီယာ', en: 'Engineering' },
    { my: 'စိုက်ပျိုးရေး', en: 'Agriculture' },
    { my: 'သစ်တော', en: 'Forestry' },
    { my: 'အဏ္ဏဝါသိပ္ပံ', en: 'Marine Science' },
    { my: 'ဘူမိဗေဒ', en: 'Geology' },
    { my: 'နက္ခတ္တဗေဒ', en: 'Astronomy' },
    { my: 'ပတ်ဝန်းကျင်သိပ္ပံ', en: 'Environmental Science' },
    { my: 'ဂီတ', en: 'Music' },
    { my: 'ပန်းချီ', en: 'Art' },
    { my: 'ကာယပညာ', en: 'Physical Education' },
    { my: 'နည်းပညာ', en: 'Technology' }
  ];

  return {
    APP_NAME, APP_VERSION, APP_TITLE,
    STORAGE_KEYS,
    QUESTION_TYPES, SECTION_TYPES,
    REVIEW_STATUS, AI_STATUS,
    DEFAULT_EXAM, DEFAULT_SETTINGS,
    PAGE_SIZES, PADDING_LIMITS,
    KATEX_CDN, KATEX_VERSION,
    MATH_SYMBOLS,
    SUBJECTS
  };
})();
