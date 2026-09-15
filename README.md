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

## စတင်အသုံးပြုခြင်း / Getting Started

ဤဖိုင်တွဲကို ကွန်ပျူတာသို့ ကူးယူပါ (Clone သို့မဟုတ် download)။ ထို့နောက် နည်းလမ်း နှစ်မျိုးဖြင့် စတင်နိုင်သည် —

### ၁။ Frontend ချည်းသာ (Quick preview — AI မလို)

ကိုယ်တိုင် မေးခွန်းရိုက်ပြီး စာရွက်ထုတ်ရန် အတွက် backend မလိုပါ။ static server နှင့် ဖွင့်ပေးရုံဖြစ်သည်။

```bash
# Windows (python အလုပ်မလုပ်ပါက py သုံးပါ):
python serve.py 8080
# သို့မဟုတ်:
py serve.py 8080

# macOS / Linux:
python3 serve.py 8080
```

ထို့နောက် browser ဖွင့်၍ **http://localhost:8080** သို့ သွားပါ။

> ⚠️ **`index.html` ကို double-click မဖွင့်ပါနှင့်။** `file://` ဖြင့် ဖွင့်ချိန်တွင် `index.html` က API လိပ်စာကို မှန်ကန်စွာ မှတ်သား၍ မရသောကြောင့် AI အင်္ဂါရပ်များ ရပ်တန့်မည်။ HTTP server မှတစ်ဆင့် ဖွင့်ကာ `localhost`/`127.0.0.1` ဖြင့်သုံးရန် လိုအပ်သည်။

### ၂။ Backend ပါထည့် (Full setup — AI OCR / Batch Crop အပါအဝင်)

AI အင်္ဂါရပ်များကို သုံးလိုပါက **FastAPI backend** ကို port `8000` တွင် ဦးစွာ run ရသည်။

**PowerShell (Windows) အတွက် တစ်ခါတည်း အကုန်လုပ်နည်း:**
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env          # .env တွင် SARGALAY_API_KEY ထည့်ပြီး save လုပ်ပါ
uvicorn app.main:app --reload --port 8000
```

**Command Prompt (Windows):** `.\.venv\Scripts\Activate.ps1` အစား `.\.venv\Scripts\activate` သုံးပါ။

**macOS / Linux:**
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env            # .env တွင် SARGALAY_API_KEY ထည့်ပြီး save လုပ်ပါ
uvicorn app.main:app --reload --port 8000
```

**`.env` ဖိုင်တွင် ထည့်ရမည့် အရေးကြီးသော ကုဒ်:**
```env
SARGALAY_API_KEY=sk-paste-your-real-key-here
```
> ⚠️ **`.env` ကို commit ဘယ်တော့မှ မလုပ်ပါနှင့်။** ဤဖိုင်ကို `.gitignore` ထဲတွင် ထည့်ထားပြီးဖြစ်သည်။ Docker/backup ဖြင့် မျှဝေမည်ဆိုလျှင် key ပါသွားမည်ကို သတိပြုပါ။

**အတည်ပြုရန်:** browser တွင် **http://localhost:8000/api/health** ဖွင့်ပါ —
```json
{"status":"ok","server_key_configured":true,"model":"deepseek-v4-flash-vision-exp"}
```
ထို့နောက် frontend **http://localhost:8080** ကို refresh လုပ်၍ AI OCR / Batch Crop ကို သုံးနိုင်သည်။

> ⚠️ **Port အသုံးပြုမှု:** Backend သည် port `8000` ကို အသုံးပြုသောကြောင့် frontend ကို port `8080` (သို့မဟုတ် `8000` မဟုတ်သော အခြား port) ဖြင့် ဖွင့်ရသည်။ `serve.py` ၏ default port မှာ `8000` ဖြစ်၍ backend နှင့် ဆင်မည့်အတွက် ကွဲပြားသော port ပေးရန် လိုအပ်သည်။

### ဘာကြောင့် backend လိုအပ်သလဲ (Why a backend?)

AI အင်္ဂါရပ်များသည် Sargalay API သို့ တိုက်ရိုက်မသွားဘဲ ဒေသခံ **FastAPI proxy** မှတစ်ဆင့် သွားသည်။ သို့ဖြင့် ပုဂ္ဂလိက API key သည် browser bundle တွင် ပို့စရာ မလိုတော့ဘဲ **server ထဲတွင်သာ** ရှိနေသည်။

- Backend endpoint: `POST /api/chat` (proxy to Sargalay), `GET /api/health`, `GET /api/test`
- Authentication: `Authorization: Bearer <key>`
- DeepSeek vision model: `deepseek-v4-flash-vision-exp`

ပိုမိုသော ကွန်ဖစ်ဂျူရေးရှင်း (timeouts, CORS, image-token cap, mode) အတွက် [`backend/README.md`](backend/README.md) ကိုဖတ်ပါ။

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

## Deployed backend သုံးရန် / Pointing to a deployed backend

Edit `index.html` (the `window.MT_API_BASE` line near the top of the
`<script>` block) or set `window.MT_API_BASE = 'https://your-backend.example.com'`
before `js/ai/baiClient.js` loads.

For full configuration options (timeouts, CORS, image-token cap,
mode), see [`backend/README.md`](backend/README.md).

## လိုင်စင်

MIT License — [docs/roadmap.md](docs/roadmap.md) တွင်ကြည့်ပါ။