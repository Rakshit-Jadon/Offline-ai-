# 🤖 God-Tier Offline AI Agent

![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)
![Copyright](https://img.shields.io/badge/Copyright-2026%20Raksh-blue)
![Made with Python](https://img.shields.io/badge/Made%20with-Python-yellow?logo=python)

> A fully **local**, **private**, and **uncensored** AI productivity suite — powered by [Ollama](https://ollama.com) and FastAPI. No cloud. No subscriptions. No data leaves your machine.

---

## ✨ Features

| Capability | Description |
|---|---|
| 💬 **Chat** | Conversational AI with full session memory |
| 👁️ **Vision** | Upload images and ask questions about them |
| 📄 **PDF Generator** | Ask the AI to write and export professional PDFs |
| 📝 **Word Docs** | Generate `.docx` reports from natural language |
| 📊 **Excel Sheets** | Create `.xlsx` spreadsheets from text prompts |
| 📊 **PowerPoint** | Generate full `.pptx` slide decks |
| 🌐 **Live Web Data** | Paste a URL — the AI reads and analyzes it |
| 📎 **File Upload** | Upload `.xlsx`, `.csv`, `.docx`, or `.txt` for AI analysis |
| 🔒 **M1 Security** | Token-based API auth — secure by default |

---

## 🖥️ Tech Stack

- **Backend:** Python + FastAPI + Uvicorn
- **AI Engine:** [Ollama](https://ollama.com) (runs 100% locally — uses `llava` multimodal model by default)
- **Frontend:** Vanilla HTML / CSS / JavaScript
- **Document Generation:** `fpdf2`, `python-docx`, `openpyxl`, `python-pptx`
- **Web Scraping:** `requests` + `beautifulsoup4`

---

## 🚀 Quick Start

### 1. Prerequisites

- **Python 3.10+** → [python.org](https://python.org)
- **Ollama** → [ollama.com/download](https://ollama.com/download)
- **Git** → [git-scm.com](https://git-scm.com)

### 2. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/offline-ai-agent.git
cd offline-ai-agent
```

### 3. Install Python dependencies

```bash
pip install -r requirements.txt
```

### 4. Pull the AI model

```bash
ollama pull llava
```

> 💡 `llava` is a multimodal model that supports both text and image inputs. It's ~4GB. You only need to pull it once.

### 5. Run the server

```bash
python ai.py
```

The app will start at **http://127.0.0.1:8000**

Your **M1 security token** will be printed in the terminal — keep it safe!

```
───────────────────────────────────────────────────────
  God-Tier AI Agent  v4.0  |  http://127.0.0.1:8000
───────────────────────────────────────────────────────
  M1 Token  : <your-random-token-here>
  Model     : llava
  Ollama    : ✅  Model ready
───────────────────────────────────────────────────────
```

### 6. Open the UI

Go to [http://127.0.0.1:8000](http://127.0.0.1:8000) in your browser. That's it! 🎉

---

## 🔐 Security

- All API endpoints require a **Bearer token** (`Authorization: Bearer <token>`)
- The token is randomly generated each startup (or set via the `M1_TOKEN` environment variable for persistent use)
- CORS is locked to `localhost` only — the agent **cannot** be accessed from other machines by default

To set a persistent token:

```bash
# Windows (PowerShell)
$env:M1_TOKEN = "your-secret-token"
python ai.py

# Linux / macOS
M1_TOKEN="your-secret-token" python ai.py
```

---

## 📁 Project Structure

```
offline-ai-agent/
├── ai.py               ← FastAPI backend + agentic tools
├── requirements.txt    ← Python dependencies
├── frontend/
│   ├── index.html      ← Chat UI
│   ├── style.css       ← Styling
│   └── app.js          ← Frontend logic
└── outputs/            ← Generated documents (auto-created, gitignored)
```

---

## 🛠️ Customization

### Change the AI Model

Edit line 33 in `ai.py`:

```python
OLLAMA_MODEL = "llava"   # Change to any Ollama model
```

Popular alternatives:
- `llama3` — fast, text-only
- `mistral` — great for coding
- `gemma3` — lightweight
- `llava` — multimodal (vision + text) ← **default**

Browse all models at [ollama.com/library](https://ollama.com/library)

### Change the AI Persona

Edit the `BMO_SYSTEM_PROMPT` in `ai.py` to give the AI any personality or role you want.

---

## 📦 Dependencies

| Package | Purpose |
|---|---|
| `fastapi` | Web framework |
| `uvicorn` | ASGI server |
| `ollama` | Local LLM interface |
| `fpdf2` | PDF generation |
| `python-docx` | Word document generation |
| `openpyxl` | Excel sheet generation |
| `python-pptx` | PowerPoint generation |
| `requests` + `beautifulsoup4` | Web scraping |
| `pydantic` | Request validation |

---

## 🤝 Contributing

Pull requests are welcome! Feel free to open an issue for bugs or feature requests.

---

## 📜 License

**MIT License** — Copyright © 2026 **Raksh**

You are free to use, copy, modify, merge, publish, distribute, and/or sell copies of this software.  
**You must include the original copyright notice** in all copies or substantial portions of the software.

See the full [LICENSE](./LICENSE) file for details.

---

> Built with ❤️ by **Raksh** — runs entirely on your machine. Your data never leaves.
