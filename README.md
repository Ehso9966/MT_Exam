# MT Exam Studio

**မြန်မာကျောင်းဆရာ/ဆရာမများအတွက် စာမေးပွဲ စာရွက် ဖန်တီးသည့် ကိရိယာ**

MT Exam Studio သည် လက်ရေးစာများ သို့မဟုတ် ဓာတ်ပုံမှ မေးခွန်းများကို ကောင်းမွန်သော ဖော်မတ်ရှိသည့်၊ ပြင်ဆင်နိုင်သော စာမေးပွဲစာရွက် အဖြစ် ပြောင်းလဲပေးသည့် **browser-based** ကိရိယာတစ်ခုဖြစ်သည်။

> **AI extracts. Teacher decides. Renderer formats.**
> (AI ဖတ်သည်။ ဆရာက ဆုံးဖြတ်သည်။ Renderer က ဖော်မတ်လုပ်သည်။)

## အဓိက အင်္ဂါရပ်များ

- 📝 **စာမေးပွဲ ပြင်ဆင်မှု** — ခေါင်းစဉ်၊ ဘာသာရပ်၊ အတန်း၊ အချိန်၊ အမှတ် သတ်မှတ်ခြင်း
- 📚 **အပိုင်းများစီမံခြင်း** — MCQ / မှန်/မှား / အတိုဖြေ / အသေးစိတ်ဖြေ / သင်္ချာ
- ✏️ **ကိုယ်တိုင်ပြင်ဆင်ခြင်း** — AI မလိုဘဲ ကိုယ်တိုင်ရိုက်ထည့်နိုင်သည်
- 🤖 **AI OCR** — B.AI API (BYOK) ဖြင့် ပုံမှ မေးခွန်းများ ထုတ်ယူခြင်း
- ✂️ **ပုံချုံ့ဖြတ် (Batch Crop)** — စာမျက်နှာတစ်ခုလုံးမှ မေးခွန်းများစွာ ခွဲထုတ်ခြင်း
- 🧮 **KaTeX သင်္ချာ** — LaTeX ပုံသေနည်းများ လှပစွာ render
- ⚠️ **ပြန်လည်စစ်ဆေးရန်** — AI ရလဒ်များကို ဆရာက အတည်ပြုရသည်
- ✅ **စစ်ဆေးမှု** — အမှတ်၊ နံပါတ်စဉ်၊ မေးခွန်းများ စစ်ဆေးခြင်း
- 💾 **သိမ်းဆည်းခြင်း** — localStorage draft + JSON export/import
- 🖨️ **ပုံနှိပ်/PDF** — A4 print stylesheet (မြန်မာစာဖောင့် ပါဝင်)

## နည်းပညာ (Tech Stack)

- HTML5 / CSS3 / Vanilla JavaScript (framework မသုံး)
- [KaTeX](https://katex.org) — သင်္ချာ rendering
- [Cropper.js](https://fengyuanchen.github.io/cropperjs/) — ပုံချုံ့ဖြတ်ခြင်း
- **B.AI API** (`https://api.b.ai/v1`) — DeepSeek vision model, BYOK
- Padauk / Pyidaungsu မြန်မာဖောင့်များ

## တပ်ဆင်အသုံးပြုခြင်း

1. ဤဖိုင်တွဲကို ကွန်ပျူတာသို့ ကူးယူပါ (သို့မဟုတ် download လုပ်ပါ)။
2. `index.html` ကို browser ဖြင့် ဖွင့်ပါ (double-click)။
3. **🔑 AI ဆက်တင်** ကိုနှိပ်၍ B.AI API သော့ကို ထည့်ပါ (BYOK)။
4. စာမေးပွဲကို စတင်ရေးသားပါ။

> ⚠️ **သတိပြုရန်:** API သော့ကို browser မှ တိုက်ရိုက်ပို့သည်။
> မျှဝေထားသော စက်တွင် အဖိုးတန်/မျှဝေသုံး key ကို မသုံးပါနှင့်။

## B.AI API အကြောင်း

- Endpoint: `POST https://api.b.ai/v1/chat/completions`
- Model list: `GET https://api.b.ai/v1/models`
- Authentication: `Authorization: Bearer <key>`
- DeepSeek vision model: `deepseek-v4-flash-vision-exp` (model list တွင် စစ်ဆေးပါ)

## ဖိုင်ဖွဲ့စည်းပုံ

```
MT-Exam-Studio/
├── index.html          # အဓိကဝဘ်စာမျက်နှာ
├── css/                # စတိုင်စာရွက်များ (app, layout, components, editor, preview, print)
├── js/                 # JavaScript module များ
│   ├── core/           # state, events, constants, ids, utils, i18n, numberStyles
│   ├── models/         # examModel, questionModel, schema
│   ├── ai/             # baiClient, prompts, responseParser, modelDiscovery, errors
│   ├── image/          # imageLoader, cropFlow
│   ├── editor/         # sectionManager, questionPopupEditor, mathToolbar, numbering
│   ├── render/         # examRenderer, mathRenderer, paperLocale
│   ├── validation/     # marks, questions, examValidation
│   ├── storage/        # localDraft, exportJson, importJson
│   └── ui/             # modal, toast, loading, dialogs, tour, paperUi, section popups
└── assets/             # အိုင်ကွန်များ၊ QR ပုံများ၊ လမ်းညွှန် gif
```

## Roadmap

- [x] Phase 0: B.AI API စမ်းသပ်ချက်
- [x] Phase 1: Static UI skeleton
- [x] Phase 2: ကိုယ်တိုင်ပြင်ဆင်သည့် editor
- [x] Phase 3: KaTeX သင်္ချာစနစ်
- [x] Phase 4: B.AI client
- [x] Phase 5: One-image OCR
- [x] Phase 6: Cropper + batch queue
- [x] Phase 7: AI review system
- [x] Phase 8: Validation engine
- [x] Phase 9: Save system
- [x] Phase 10: Print/PDF

## လိုင်စင်

MIT License — [docs/roadmap.md](docs/roadmap.md) တွင်ကြည့်ပါ။