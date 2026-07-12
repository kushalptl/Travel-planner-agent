# 🌍 TravelAI — IBM Watsonx.ai Travel Planner Agent

> An AI-powered travel planning web application built with **Python Flask** and **IBM Watsonx.ai (Granite models)**. Features a modern chat UI, itinerary builder, budget calculator, live weather, interactive maps, and group travel coordination.

---

## ✨ Features

| Feature | Details |
|---|---|
| 🤖 **AI Chat** | Conversational travel advisor powered by IBM Granite |
| 🗺️ **Itinerary Builder** | Day-by-day AI-generated travel plans |
| 💰 **Budget Calculator** | Smart cost breakdowns with live bar charts |
| 🌦️ **Live Weather** | Real-time weather via Open-Meteo (free, no key) |
| 🗺️ **Interactive Maps** | Leaflet.js + OpenStreetMap (free, no key) |
| 👨‍👩‍👧 **Group Travel** | Group planner with member management and cost splitter |
| 🌙 **Dark Mode** | Fully themed light/dark toggle |
| 📱 **Mobile Responsive** | Works on all screen sizes |
| 📋 **Trip Checklist** | Pre-trip checklist with persistent state |
| ⬇️ **Export** | Download itineraries and chat history |

---

## 🚀 Quick Start

### 1 — Clone / Download

```bash
cd "travel planner agent"
```

### 2 — Create Virtual Environment

```bash
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate
```

### 3 — Install Dependencies

```bash
pip install -r requirements.txt
```

### 4 — Configure Environment Variables

```bash
# Copy the template
copy .env.example .env        # Windows
cp .env.example .env          # macOS/Linux
```

Then open `.env` and fill in your IBM Cloud credentials:

```env
IBM_API_KEY=your_ibm_cloud_api_key_here
WATSONX_PROJECT_ID=your_watsonx_project_id_here
WATSONX_URL=https://us-south.ml.cloud.ibm.com
WATSONX_MODEL_ID=ibm/granite-3-3-8b-instruct
FLASK_SECRET_KEY=generate_a_random_32_char_string
```

### 5 — Run the Application

```bash
python app.py
```

Open your browser at **http://localhost:5000** 🎉

---

## 🔑 IBM Cloud Setup Guide

### Step 1: Create an IBM Cloud Account
1. Go to [https://cloud.ibm.com](https://cloud.ibm.com)
2. Sign up for a free account (no credit card required for Lite tier)

### Step 2: Generate an API Key
1. Log in → click your name (top right) → **Manage** → **Access (IAM)**
2. Left menu → **API keys** → **Create an IBM Cloud API key**
3. Give it a name (e.g., `TravelAI-Key`) → **Create**
4. **Copy the key immediately** — it won't be shown again
5. Paste it as `IBM_API_KEY` in your `.env` file

### Step 3: Create a Watsonx.ai Project
1. Go to [https://dataplatform.cloud.ibm.com](https://dataplatform.cloud.ibm.com)
2. Click **New Project** → **Create an empty project**
3. Name it (e.g., `TravelAI`) → **Create**
4. Go to **Manage** tab → **General** → copy the **Project ID**
5. Paste it as `WATSONX_PROJECT_ID` in your `.env` file

### Step 4: Associate a Watsonx.ai Instance
1. In your project → **Manage** → **Services & Integrations**
2. Click **Associate service** → select or create a **Watson Machine Learning** instance
3. The free Lite plan includes sufficient tokens for development

### Step 5: Choose Your Model
Available Granite models for travel planning:

| Model ID | Context | Speed | Best For |
|---|---|---|---|
| `ibm/granite-3-3-8b-instruct` | 128K | ⚡⚡⚡ | **Recommended** |
| `ibm/granite-3-8b-instruct` | 4K | ⚡⚡ | Balanced |
| `ibm/granite-13b-chat-v2` | 8K | ⚡ | Extended conversations |

---

## 🧠 Customizing the Agent (AGENT_INSTRUCTIONS)

The agent's behavior is fully configurable via the `AGENT_INSTRUCTIONS` block near the top of [`app.py`](app.py).

```python
# ══════════════════════════════════════════════════════════════════
#  AGENT INSTRUCTIONS — Customize everything about the agent here
#  ─────────────────────────────────────────────────────────────────
#  TONE              : Change personality (formal, casual, adventurous...)
#  SPECIALIZATION    : Focus on specific travel types
#  SAFETY RULES      : Add/remove safety reminders
#  REGIONAL PREFS    : Emphasize specific destination regions
#  RESPONSE FORMAT   : Change output structure
# ══════════════════════════════════════════════════════════════════
```

### Examples of Customization

**Change the agent's name and persona:**
```python
AGENT_INSTRUCTIONS = """You are **Nomad**, a budget travel specialist..."""
```

**Add a regional focus (e.g., South America specialist):**
```python
## Regional Expertise
- **Primary Focus**: Colombia, Peru, Brazil, Argentina, Chile, Bolivia
- Fluent in Spanish and Portuguese travel culture
```

**Change the tone:**
```python
## Tone & Style
- Be adventurous, bold, and inspire travelers to step outside their comfort zone
- Use travel metaphors and vivid destination descriptions
```

**Add custom safety rules:**
```python
## Safety Rules
- Always recommend travel insurance from reputable providers
- For solo female travelers: include specific safety tips for each destination
```

---

## 📁 Project Structure

```
travel planner agent/
├── app.py                  # Flask backend + AGENT_INSTRUCTIONS
├── requirements.txt        # Python dependencies
├── .env                    # Your secrets (never commit!)
├── .env.example            # Template for .env
├── README.md               # This file
├── templates/
│   └── index.html          # Main HTML (Bootstrap 5, Leaflet, marked.js)
└── static/
    ├── css/
    │   └── style.css       # Full responsive CSS with dark mode
    └── js/
        └── app.js          # Frontend logic, chat, maps, weather
```

---

## 🌐 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Main web application |
| `POST` | `/api/chat` | Send a chat message |
| `POST` | `/api/itinerary` | Generate a full itinerary |
| `POST` | `/api/budget` | Calculate trip budget |
| `GET` | `/api/weather/<city>` | Live weather data |
| `GET` | `/api/geocode/<location>` | Geocode a location |
| `POST` | `/api/clear` | Clear chat session |
| `GET` | `/api/health` | Health check |

### Example Chat Request

```bash
curl -X POST http://localhost:5000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Plan a 7-day trip to Japan for 2 people",
    "destination": "Tokyo",
    "trip_context": { "budget": 4000, "travelers": 2, "style": "mixed" }
  }'
```

### Example Itinerary Request

```bash
curl -X POST http://localhost:5000/api/itinerary \
  -H "Content-Type: application/json" \
  -d '{
    "destination": "Bali, Indonesia",
    "duration": 10,
    "travelers": 2,
    "budget": 3000,
    "travel_style": "comfort",
    "interests": ["food", "nature", "wellness"],
    "group_type": "couple"
  }'
```

---

## ☁️ Deployment

### Deploy to IBM Code Engine (Recommended)

```bash
# 1. Install IBM Cloud CLI
# https://cloud.ibm.com/docs/cli

# 2. Login
ibmcloud login --sso

# 3. Target Code Engine project
ibmcloud ce project create --name travelai
ibmcloud ce project select --name travelai

# 4. Create secrets from .env
ibmcloud ce secret create --name travelai-secrets \
  --from-env-file .env

# 5. Deploy
ibmcloud ce app create \
  --name travelai \
  --image icr.io/your-namespace/travelai:latest \
  --env-from-secret travelai-secrets \
  --port 5000
```

### Deploy to Docker

```dockerfile
# Dockerfile (create in project root)
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 5000
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2", "app:app"]
```

```bash
docker build -t travelai .
docker run -p 5000:5000 --env-file .env travelai
```

### Deploy to Railway / Render

1. Push code to GitHub (ensure `.env` is in `.gitignore`)
2. Connect repo in Railway/Render dashboard
3. Set environment variables in the platform UI
4. Set start command: `gunicorn app:app --bind 0.0.0.0:$PORT`

---

## 🔒 Security Notes

- **Never commit `.env`** — it's already in `.gitignore`
- Rotate your IBM API key regularly
- In production, set `FLASK_DEBUG=False`
- Use a strong random `FLASK_SECRET_KEY`
- Consider rate limiting for production (`flask-limiter`)

---

## 🛠️ Troubleshooting

| Problem | Solution |
|---|---|
| `Model not configured` status | Check `IBM_API_KEY` and `WATSONX_PROJECT_ID` in `.env` |
| `401 Unauthorized` | API key expired or incorrect — regenerate it |
| `404 Project not found` | Verify `WATSONX_PROJECT_ID` matches your project |
| Weather not loading | Open-Meteo API is free — check internet connectivity |
| Map not showing | Check browser console; Leaflet CDN must load |
| Port already in use | Change `PORT=5001` in `.env` |

---

## 📦 Dependencies

| Package | Version | Purpose |
|---|---|---|
| `flask` | ≥3.0 | Web framework |
| `flask-cors` | ≥4.0 | Cross-origin requests |
| `python-dotenv` | ≥1.0 | `.env` file loading |
| `ibm-watsonx-ai` | ≥1.1.2 | IBM Watsonx.ai SDK |
| `requests` | ≥2.31 | HTTP calls (weather/maps) |
| `gunicorn` | ≥21.2 | Production WSGI server |

**Frontend CDN Libraries:**
- Bootstrap 5.3.3 + Icons
- Leaflet.js 1.9.4 (interactive maps)
- marked.js (Markdown rendering)
- Google Fonts (Inter)

---

## 📄 License

MIT License — Free to use, modify, and distribute.

---

*Built with ❤️ using IBM Watsonx.ai · IBM Granite Models · Open-Meteo · OpenStreetMap*
