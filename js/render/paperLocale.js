window.MT = window.MT || {};

MT.PaperLocale = (function () {
  // Subjects taught in Burmese-medium that keep a Burmese paper.
  const BURMESE_SUBJECT_RE = /မြန်မာ|ပထဝီ|သမိုင|myanmar|burmese|geography|history/i;

  const SUBJECT_EN = {
    'သင်္ချာ': 'Mathematics',
    'သခၤာ': 'Mathematics',
    'အဆင့်မြင့်သင်္ချာ': 'Higher Mathematics',
    'အသုံးချသင်္ချာ': 'Applied Mathematics',
    'အင်္ဂလိပ်': 'English',
    'အင်္ဂလိပ်စာ': 'English Language',
    'ရူပဗေဒ': 'Physics',
    'အဆင့်မြင့်ရူပဗေဒ': 'Higher Physics',
    'ဓာတုဗေဒ': 'Chemistry',
    'အဆင့်မြင့်ဓာတုဗေဒ': 'Higher Chemistry',
    'ဇီဝဗေဒ': 'Biology',
    'အဆင့်မြင့်ဇီဝဗေဒ': 'Higher Biology',
    'သိပ္ပံ': 'Science',
    'နည်းပညာ': 'Technology',
    'စာရင်းကိုင်': 'Accountancy',
    'စာရင်းအင်း': 'Statistics',
    'စီးပွားရေး': 'Economics',
    'စီးပွားရေးဘာသာ': 'Economics',
    'ဘောဂဗေဒ': 'Economics',
    'စီမံခန့်ခွဲမှု': 'Management',
    'ပြင်သစ်': 'French',
    'ဂျာမန်': 'German',
    'ဂျပန်': 'Japanese',
    'ကိုရီးယား': 'Korean',
    'တရုတ်': 'Chinese',
    'မြန်မာ': 'Myanmar',
    'မြန်မာစာ': 'Myanmar',
    'မြန်မာစာပေ': 'Myanmar Literature',
    'အင်္ဂလိပ်စာပေ': 'English Literature',
    'ပထဝီ': 'Geography',
    'ပထဝီဝင်': 'Geography',
    'သမိုင်း': 'History',
    'လူမှုရေးဘာသာ': 'Social Studies',
    'လူမှုဗေဒ': 'Sociology',
    'ဒေသဆိုင်ရာဘာသာရပ်': 'Regional Subject',
    'သင်ကြားရေး': 'Education',
    'ပညာရေး': 'Education',
    'ကွန်ပျူတာ': 'Computer Science',
    'ကွန်ပျူတာသိပ္ပံ': 'Computer Science',
    'သတင်းအချက်အလက်နည်းပညာ': 'Information Technology',
    'ဥပဒေ': 'Law',
    'နိုင်ငံရေးသိပ္ပံ': 'Political Science',
    'နိုင်ငံတကာဆက်ဆံရေး': 'International Relations',
    'စိတ်ပညာ': 'Psychology',
    'ဒဿနိကဗေဒ': 'Philosophy',
    'ဘာသာဗေဒ': 'Linguistics',
    'ဆေးပညာ': 'Medicine',
    'သူနာပြု': 'Nursing',
    'ဆေးဝါး': 'Pharmacy',
    'အင်ဂျင်နီယာ': 'Engineering',
    'စိုက်ပျိုးရေး': 'Agriculture',
    'သစ်တော': 'Forestry',
    'အဏ္ဏဝါသိပ္ပံ': 'Marine Science',
    'ဘူမိဗေဒ': 'Geology',
    'နက္ခတ္တဗေဒ': 'Astronomy',
    'ပတ်ဝန်းကျင်သိပ္ပံ': 'Environmental Science',
    'ဂီတ': 'Music',
    'ပန်းချီ': 'Art',
    'ကာယပညာ': 'Physical Education'
  };

  function isBurmeseSubject(subject) {
    if (!subject) return true;
    return BURMESE_SUBJECT_RE.test(String(subject));
  }

  function getLanguage(subject) {
    return isBurmeseSubject(subject) ? 'my' : 'en';
  }

  function translateSubject(subject) {
    const s = String(subject || '');
    if (!s) return '';
    const lower = s.toLowerCase();
    if (/[a-z]/.test(lower)) return s;
    const trimmed = s.trim();
    return SUBJECT_EN[trimmed] || SUBJECT_EN[Object.keys(SUBJECT_EN).find(function (k) { return trimmed.indexOf(k) >= 0; })] || s;
  }

  function fallbackTitle(subject, lang) {
    const s = String(subject || '');
    if (!s) return lang === 'en' ? 'Examination' : 'စာမေးပွဲ';
    return lang === 'en' ? translateSubject(s) || 'Examination' : s;
  }

  function labels(lang) {
    if (lang === 'en') {
      return {
        grade: 'Grade: ',
        subject: 'Subject: ',
        time: 'Time Allowed: ',
        minutes: ' minutes',
        hours: ' hours',
        marks: 'Total Marks: ',
        instruction: 'Answer ALL questions.',
        sectionMarks: 'Section Marks: '
      };
    }
    return {
      grade: 'အတန်း: ',
      subject: 'ဘာသာရပ်: ',
      time: 'အချိန်: ',
      minutes: ' မိနစ်',
      hours: ' နာရီ',
      marks: 'အမှတ်: ',
      instruction: 'မေးခွန်းအားလုံးကို ဖြေဆိုပါ။',
      sectionMarks: 'အပိုင်းအမှတ်: '
    };
  }

  function formatMarks(lang, marks) {
    const n = Number(marks) || 0;
    if (lang === 'en') {
      return n === 1 ? '1 mark' : n + ' marks';
    }
    return MT.Utils.toMyanmarDigits(n) + ' အမှတ်';
  }

  // Format a duration with singular/plural English units ("1 hour", "1.5 hours").
  function formatDuration(lang, minutes, unit) {
    const isHour = unit === 'hour';
    const val = isHour ? MT.Utils.formatDurationHours(minutes) : (Number(minutes) || 0);
    const suffix = isHour
      ? (lang === 'en' ? (val === '1' ? ' hour' : ' hours') : ' နာရီ')
      : (lang === 'en' ? (val === 1 ? ' minute' : ' minutes') : ' မိနစ်');
    return (lang === 'en' ? val : MT.Utils.toMyanmarDigits(val)) + suffix;
  }

  const SECTION_TITLES = {
    'my': {
      'mcq': 'ရွေးချယ်စရာ မေးခွန်းများ',
      'tf': 'မှန်/မှား မေးခွန်းများ',
      'short': 'အတိုဖြေ မေးခွန်းများ',
      'long': 'အသေးစိတ်ဖြေ မေးခွန်းများ',
      'math': 'တွက်ချက်မှုပုစ္ဆာ မေးခွန်းများ',
      'section_a': 'အပိုင်း (က)'
    },
    'en': {
      'mcq': 'Multiple Choice Questions',
      'tf': 'True / False Questions',
      'short': 'Short Answer Questions',
      'long': 'Long Answer Questions',
      'math': 'Mathematics Questions',
      'section_a': 'Section A'
    }
  };

  function getSectionTitle(section, lang) {
    if (section && section.type === 'section_a' && !section.title && section.letter) {
      if (lang === 'en') return 'Section ' + section.letter;
      var myLetter = (MT.ExamModel && MT.ExamModel.toMyanmarSectionLetter) ? MT.ExamModel.toMyanmarSectionLetter(section.letter) : '';
      return myLetter ? 'အပိုင်း (' + myLetter + ')' : 'အပိုင်း (က)';
    }
    if (lang !== 'en') return section.title || SECTION_TITLES.my[section.type] || section.type;
    // English mode: if the title contains Myanmar characters, use English default.
    if (section.title && /[\u1000-\u109f]/.test(section.title)) {
      return SECTION_TITLES.en[section.type] || section.type;
    }
    return section.title || SECTION_TITLES.en[section.type] || section.type;
  }

  // Title shown in editor inputs — mirrors the paper renderer so the edit box
  // matches what the exam paper displays.
  function getEditableTitle(section) {
    if (!section) return '';
    const lang = getLanguage((MT.State && MT.State.getMetadata && MT.State.getMetadata().subject) || '');
    return getSectionTitle(section, lang);
  }

  return { isBurmeseSubject, getLanguage, translateSubject, fallbackTitle, labels, formatMarks, formatDuration, getSectionTitle, getEditableTitle };
})();