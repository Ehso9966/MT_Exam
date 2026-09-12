# MT Exam Studio

**မြန်မာကျောင်းဆရာ/ဆရာမများအတွက် စာမေးပွဲ စာရွက် ဖန်တီးသည့် ကိရိယာ**

MT Exam Studio သည် လက်ရေးစာများ သို့မဟုတ် ဓာတ်ပုံမှ မေးခွန်းများကို ကောင်းမွန်သော ဖော်မတ်ရှိသည့်၊ ပြင်ဆင်နိုင်သော စာမေးပွဲစာရွက် အဖြစ် ပြောင်းလဲပေးသည့် **browser-based** ကိရိယာတစ်ခုဖြစ်သည်။

> **AI extracts. Teacher decides. Renderer formats.**
> (AI ဖတ်သည်။ ဆရာက ဆုံးဖြတ်သည်။ Renderer က ဖော်မတ်လုပ်သည်။)

## အဓိက အင်္ဂါရပ်များ

- 📝 **စာမေးပွဲ ပြင်ဆင်မှု** — ခေါင်းစဉ်၊ ဘာသာရပ်၊ အတန်း၊ အချိန်၊ အမှတ် သတ်မှတ်ခြင်း
- 📚 **အပိုင်းများစီမံခြင်း** — MCQ / မှန်/မှား / အတိုဖြေ / အသေးစိတ်ဖြေ / သင်္ချာ
- ✏️ **ကိုယ်တိုင်ပြင်ဆင်ခြင်း** — AI မလိုဘဲ ကိုယ်တိုင်ရိုက်ထည့်နိုင်သည်
- 🤖 **AI OCR** — MT AI (server-side key) ဖြင့် ပုံမှ မေးခွန်းများ ထုတ်ယူခြင်း
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
- **MT AI / Sargalay Backend** (`http://localhost:8000`) — server-side key, Python FastAPI
- Padauk / Pyidaungsu မြန်မာဖောင့်များ

## တပ်ဆင်အသုံးပြုခြင်း

1. ဤဖိုင်တွဲကို ကွန်ပျူတာသို့ ကူးယူပါ (သို့မဟုတ် download လုပ်ပါ)။
2. `index.html` ကို browser ဖြင့် ဖွင့်ပါ (double-click)။
3. **🔑 AI ဆက်တင်** ကိုနှိပ်၍ backend/.env တွင် SARGALAY_API_KEY ကို ထည့်ပါ။
4. စာမေးပွဲကို စတင်ရေးသားပါ။

> ⚠️ **သတိပြုရန်:** API သော့ကို server မှ တိုက်ရိုက်ပို့သည်။
> မျှဝေထားသော စက်တွင် အဖိုးတန်/မျှဝေသုံး key ကို မသုံးပါနှင့်။

## MT AI / Sargalay Backend

- Endpoint: `POST /api/chat` (proxy to Sargalay)
- Test connection: `GET /api/test`
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

- [x] Phase 0: MT AI / Sargalay backend စမ်းသပ်ချက်
- [x] Phase 1: Static UI skeleton
- [x] Phase 2: ကိုယ်တိုင်ပြင်ဆင်သည့် editor
- [x] Phase 3: KaTeX သင်္ချာစနစ်
- [x] Phase 4: Sargalay backend client
- [x] Phase 5: One-image OCR
- [x] Phase 6: Cropper + batch queue
- [x] Phase 7: AI review system
- [x] Phase 8: Validation engine
- [x] Phase 9: Save system
- [x] Phase 10: Print/PDF

## Backend Setup (Sargalay proxy)

The frontend now talks to a local **FastAPI** proxy instead of calling the
Sargalay backend API, so the project key never ships in the
browser bundle.

### 1. Get a Sargalay API key
Create one in your Sargalay dashboard. Treat it like a password.

### 2. Create `backend/.env`
```bash
cd backend
cp .env.example .env        # Windows: copy .env.example .env
```
Edit `backend/.env` and paste your real key:
```env
SARGALAY_API_KEY=sk-paste-your-real-key-here
```

> ⚠️ **Never commit this file.** `backend/.env` is in `.gitignore` already.
> Verify with: `git check-ignore backend/.env` (should print the path).

### 3. Install + run
```bash
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS / Linux:
source .venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 4. Verify
- `http://localhost:8000/api/health` → `{"status":"ok","server_key_configured":true,"model":"deepseek-v4-flash-vision-exp"}`
- Open `index.html` in the browser — AI features (OCR, batch crop) now flow through the local backend.

### Pointing the frontend at a deployed backend
Edit `index.html` (the `window.MT_API_BASE` line near the top of the
`<script>` block) or set `window.MT_API_BASE = 'https://your-backend.example.com'`
before `js/ai/baiClient.js` loads.

For full configuration options (timeouts, CORS, image-token cap,
mode), see [`backend/README.md`](backend/README.md).

## လိုင်စင်

MIT License — [docs/roadmap.md](docs/roadmap.md) တွင်ကြည့်ပါ။