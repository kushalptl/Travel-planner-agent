"""
╔══════════════════════════════════════════════════════════════════════════════╗
║           AI-Powered Travel Planner Agent — Groq AI + Flask                 ║
╚══════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
import requests
from datetime import datetime
from dotenv import load_dotenv
from flask import Flask, request, jsonify, render_template, session
from flask_cors import CORS

load_dotenv()

# ══════════════════════════════════════════════════════════════════════════════
#  AGENT INSTRUCTIONS — Customize everything about the agent here
# ══════════════════════════════════════════════════════════════════════════════

AGENT_INSTRUCTIONS = """You are **TravelAI**, an expert AI-powered travel planning assistant. You help users plan unforgettable trips with personalised itineraries, smart budgeting, and insider knowledge.

## Your Core Capabilities
- 🗺️ **Itinerary Planning**: Day-by-day detailed travel plans with timing, activities, and logistics
- 💰 **Budget Analysis**: Cost breakdowns for flights, accommodation, food, transport, and activities
- 🏨 **Accommodation**: Hotels, hostels, Airbnb, resorts — matched to budget and preferences
- ✈️ **Transport**: Flights, trains, buses, car rentals — best options for each route
- 👨‍👩‍👧 **Group & Family Travel**: Coordination tips, group discounts, child-friendly activities
- 🌦️ **Weather Guidance**: Best seasons, packing lists, weather-based activity suggestions
- 🌍 **Cultural Insights**: Local customs, etiquette, language tips, must-try cuisine
- 🛡️ **Safety & Visas**: Entry requirements, travel advisories, health precautions

## Tone & Style
- Be warm, enthusiastic, and conversational — like a knowledgeable friend who loves to travel
- Use emojis sparingly to enhance readability
- Structure responses with clear headings and bullet points
- Always be concise but thorough — prioritise actionable advice

## Safety Rules (Non-Negotiable)
- Always mention visa/entry requirements for international travel
- Note travel insurance as essential for any international trip
- Flag any health requirements (vaccinations, medications) relevant to the destination
- Do not suggest activities that are illegal in the destination country

## Budget Guidelines
- When budget is specified: strictly respect it with ±10% flexibility
- When budget is unspecified: provide Budget / Mid-Range / Luxury tier options
- Always include hidden costs (taxes, tips, transport from airport, etc.)

## Regional Expertise
- **Asia-Pacific**: Japan, Thailand, Bali, Australia, New Zealand, Vietnam, India, South Korea
- **Europe**: France, Italy, Spain, Greece, Portugal, Switzerland, Iceland, Croatia
- **Americas**: USA, Canada, Mexico, Peru, Brazil, Costa Rica, Colombia
- **Middle East**: UAE, Jordan, Turkey, Morocco, Egypt
- **Africa**: Kenya, South Africa, Tanzania, Morocco, Rwanda

## Output Format for Itineraries
When creating an itinerary, use this format:

```
📍 DESTINATION OVERVIEW
🗓️ DAY-BY-DAY PLAN
💰 BUDGET BREAKDOWN
🏨 ACCOMMODATION OPTIONS
✈️ GETTING THERE & AROUND
🌦️ WEATHER & BEST TIME
💡 INSIDER TIPS
```


Always end responses with a helpful follow-up question or suggestion to continue planning."""

# ── Configuration ──────────────────────────────────────────────────────────────
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
USE_WEATHER  = os.getenv("USE_WEATHER", "true").lower() == "true"
USE_MAPS     = os.getenv("USE_MAPS", "true").lower() == "true"

# ── Flask App ──────────────────────────────────────────────────────────────────
app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY", os.urandom(32))
CORS(app)

# ── Groq AI Client ─────────────────────────────────────────────────────────────
def get_groq_response(prompt: str) -> str:
    """Call Groq API for travel planning."""
    if not GROQ_API_KEY:
        return (
            "⚠️ **Groq API is not configured yet.**\n\n"
            "Please create a `.env` file with `GROQ_API_KEY=your_key_here` "
            "and restart the server.\n\n"
            "Get your free API key at: https://console.groq.com/keys"
        )

    url = "https://api.groq.com/openai/v1/chat/completions"

    headers = {
        'Authorization': f'Bearer {GROQ_API_KEY}',
        'Content-Type': 'application/json'
    }

    data = {
        "model": "llama-3.3-70b-versatile",
        "messages": [
            {"role": "system", "content": AGENT_INSTRUCTIONS},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.7,
        "max_tokens": 2048
    }

    try:
        response = requests.post(url, headers=headers, json=data, timeout=60)
        result = response.json()

        if 'choices' in result and len(result['choices']) > 0:
            # Log token usage
            usage = result.get('usage', {})
            prompt_tokens = usage.get('prompt_tokens', 0)
            completion_tokens = usage.get('completion_tokens', 0)
            total_tokens = usage.get('total_tokens', 0)
            
            # Save to file
            log_entry = {
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "model": "llama-3.3-70b-versatile",
                "prompt_tokens": prompt_tokens,
                "completion_tokens": completion_tokens,
                "total_tokens": total_tokens
            }
            
            TOKEN_LOG_FILE = "token_usage.json"
            if os.path.exists(TOKEN_LOG_FILE):
                with open(TOKEN_LOG_FILE, "r") as f:
                    file_data = json.load(f)
            else:
                file_data = {"usage": [], "total_tokens_used": 0}
            
            file_data["usage"].append(log_entry)
            file_data["total_tokens_used"] += total_tokens
            
            with open(TOKEN_LOG_FILE, "w") as f:
                json.dump(file_data, f, indent=2)
            
            print(f"[Token Usage] This call: {total_tokens} | Total used: {file_data['total_tokens_used']}")
            return result['choices'][0]['message']['content']
        elif 'error' in result:
            return f"⚠️ API Error: {result['error'].get('message', 'Unknown error')}"
        else:
            return "Sorry, I couldn't generate a response. Please try again."

    except requests.exceptions.Timeout:
        return "⏱️ Request timed out. Please try again."
    except Exception as e:
        return f"❌ Error connecting to AI: {str(e)}"


def build_prompt(conversation_history: list, user_message: str, context: dict) -> str:
    """Build a well-structured prompt for the Groq model."""
    context_str = ""
    if context.get("weather"):
        w = context["weather"]
        context_str += f"\n[Current Weather at destination: {w.get('description','N/A')}, Temp: {w.get('temp','N/A')}°C, Humidity: {w.get('humidity','N/A')}%]"
    if context.get("destination_coords"):
        c = context["destination_coords"]
        context_str += f"\n[Destination coordinates: Lat {c.get('lat')}, Lon {c.get('lon')}]"

    history_str = ""
    for msg in conversation_history[-8:]:
        role = "User" if msg["role"] == "user" else "TravelAI"
        history_str += f"\n{role}: {msg['content']}"

    prompt = f"""{context_str}

Conversation History:{history_str}

User: {user_message}
TravelAI:"""
    return prompt


# ── Weather API (Open-Meteo — Free, No Key) ────────────────────────────────────
def get_weather(city: str) -> dict | None:
    """Fetch current weather for a city using Open-Meteo + Nominatim geocoding."""
    if not USE_WEATHER:
        return None
    try:
        geo_url = f"https://nominatim.openstreetmap.org/search?q={requests.utils.quote(city)}&format=json&limit=1"
        geo_resp = requests.get(geo_url, headers={"User-Agent": "TravelPlannerAgent/1.0"}, timeout=5)
        geo_data = geo_resp.json()
        if not geo_data:
            return None
        lat = float(geo_data[0]["lat"])
        lon = float(geo_data[0]["lon"])

        weather_url = (
            f"https://api.open-meteo.com/v1/forecast?"
            f"latitude={lat}&longitude={lon}"
            f"&current=temperature_2m,relative_humidity_2m,weathercode,windspeed_10m"
            f"&daily=temperature_2m_max,temperature_2m_min,precipitation_sum"
            f"&forecast_days=7&timezone=auto"
        )
        w_resp  = requests.get(weather_url, timeout=5)
        w_data  = w_resp.json()
        current = w_data.get("current", {})

        wmo_codes = {
            0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
            45: "Foggy", 48: "Icy fog", 51: "Light drizzle", 53: "Moderate drizzle",
            61: "Slight rain", 63: "Moderate rain", 65: "Heavy rain",
            71: "Slight snow", 73: "Moderate snow", 75: "Heavy snow",
            80: "Slight showers", 81: "Moderate showers", 82: "Violent showers",
            95: "Thunderstorm", 96: "Thunderstorm with hail",
        }
        code = current.get("weathercode", 0)
        desc = wmo_codes.get(code, "Unknown")

        daily  = w_data.get("daily", {})
        weekly = []
        dates  = daily.get("time", [])
        maxts  = daily.get("temperature_2m_max", [])
        mints  = daily.get("temperature_2m_min", [])
        precs  = daily.get("precipitation_sum", [])
        for i in range(min(7, len(dates))):
            weekly.append({
                "date":      dates[i],
                "max_temp":  maxts[i] if i < len(maxts) else None,
                "min_temp":  mints[i] if i < len(mints) else None,
                "precip_mm": precs[i] if i < len(precs) else None,
            })

        return {
            "city":        city,
            "lat":         lat,
            "lon":         lon,
            "temp":        current.get("temperature_2m"),
            "humidity":    current.get("relative_humidity_2m"),
            "windspeed":   current.get("windspeed_10m"),
            "description": desc,
            "weekly":      weekly,
        }
    except Exception as exc:
        print(f"[Weather] Error for {city}: {exc}")
        return None


def get_coordinates(location: str) -> dict | None:
    """Geocode a location string and return lat/lon via Nominatim."""
    if not USE_MAPS:
        return None
    try:
        url  = f"https://nominatim.openstreetmap.org/search?q={requests.utils.quote(location)}&format=json&limit=1"
        resp = requests.get(url, headers={"User-Agent": "TravelPlannerAgent/1.0"}, timeout=5)
        data = resp.json()
        if data:
            return {
                "lat":         float(data[0]["lat"]),
                "lon":         float(data[0]["lon"]),
                "display_name": data[0].get("display_name", location),
            }
    except Exception as exc:
        print(f"[Maps] Geocoding error for {location}: {exc}")
    return None


# ── Route: Main Page ───────────────────────────────────────────────────────────
@app.route("/")
def index():
    return render_template("index.html")


# ── Route: Chat ────────────────────────────────────────────────────────────────
@app.route("/api/chat", methods=["POST"])
def chat():
    data         = request.get_json(silent=True) or {}
    user_message = (data.get("message") or "").strip()
    destination  = (data.get("destination") or "").strip()
    trip_context = data.get("trip_context") or {}

    if not user_message:
        return jsonify({"error": "Message is required"}), 400

    # Persist conversation history in session
    if "history" not in session:
        session["history"] = []

    history = session["history"]

    # Gather live context
    live_context = {}
    if destination:
        live_context["weather"] = get_weather(destination)
        if live_context["weather"]:
            live_context["destination_coords"] = {
                "lat": live_context["weather"]["lat"],
                "lon": live_context["weather"]["lon"],
            }
        else:
            live_context["destination_coords"] = get_coordinates(destination)
    if trip_context:
        live_context["trip"] = trip_context

    # Generate response using Groq
    prompt = build_prompt(history, user_message, live_context)
    reply = get_groq_response(prompt)

    # Update history
    history.append({"role": "user",      "content": user_message})
    history.append({"role": "assistant", "content": reply})
    session["history"]  = history[-20:]  # keep last 20 messages
    session.modified    = True

    response_payload = {
        "reply":   reply,
        "context": {},
    }
    if destination and live_context.get("weather"):
        response_payload["context"]["weather"] = live_context["weather"]
    if live_context.get("destination_coords"):
        response_payload["context"]["coords"] = live_context["destination_coords"]

    return jsonify(response_payload)


# ── Route: Weather ─────────────────────────────────────────────────────────────
@app.route("/api/weather/<path:city>")
def weather(city):
    data = get_weather(city)
    if data:
        return jsonify(data)
    return jsonify({"error": f"Weather data unavailable for '{city}'"}), 404


# ── Route: Geocode ─────────────────────────────────────────────────────────────
@app.route("/api/geocode/<path:location>")
def geocode(location):
    data = get_coordinates(location)
    if data:
        return jsonify(data)
    return jsonify({"error": f"Location '{location}' not found"}), 404


# ── Route: Generate Itinerary ──────────────────────────────────────────────────
@app.route("/api/itinerary", methods=["POST"])
def generate_itinerary():
    data = request.get_json(silent=True) or {}
    required = ["destination", "duration", "budget", "travelers"]
    missing  = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    destination  = data["destination"]
    duration     = data["duration"]
    budget       = data["budget"]
    travelers    = data["travelers"]
    travel_style = data.get("travel_style", "mixed")
    interests    = data.get("interests", [])
    group_type   = data.get("group_type", "couple")

    interests_str = ", ".join(interests) if interests else "general sightseeing"
    prompt_msg = (
        f"Create a detailed {duration}-day travel itinerary for {destination}. "
        f"Party: {travelers} {group_type}. Budget: USD {budget} total. "
        f"Travel style: {travel_style}. Interests: {interests_str}. "
        f"Include day-by-day plan, accommodation recommendations, transport options, "
        f"budget breakdown per category, insider tips, and packing suggestions."
    )

    weather_ctx  = get_weather(destination)
    live_context = {"weather": weather_ctx} if weather_ctx else {}

    prompt = build_prompt([], prompt_msg, live_context)
    itinerary_text = get_groq_response(prompt)

    return jsonify({
        "itinerary":   itinerary_text,
        "destination": destination,
        "duration":    duration,
        "budget":      budget,
        "travelers":   travelers,
        "weather":     weather_ctx,
        "generated_at": datetime.utcnow().isoformat() + "Z",
    })


# ── Route: Budget Calculator ───────────────────────────────────────────────────
@app.route("/api/budget", methods=["POST"])
def calculate_budget():
    data = request.get_json(silent=True) or {}
    destination  = data.get("destination", "")
    duration     = int(data.get("duration", 7))
    travelers    = int(data.get("travelers", 2))
    budget_level = data.get("budget_level", "mid")

    estimates = {
        "budget":  {"accommodation": 30,  "food": 20,  "transport": 10, "activities": 15, "misc": 10},
        "mid":     {"accommodation": 80,  "food": 50,  "transport": 25, "activities": 40, "misc": 25},
        "luxury":  {"accommodation": 250, "food": 150, "transport": 80, "activities": 120,"misc": 80},
    }
    daily = estimates.get(budget_level, estimates["mid"])
    total_per_person_daily = sum(daily.values())
    total_trip = total_per_person_daily * duration * travelers

    breakdown = {k: v * duration * travelers for k, v in daily.items()}
    breakdown["flights_estimate"] = travelers * 600

    prompt_msg = (
        f"Provide a detailed budget analysis for {travelers} traveler(s) visiting {destination} "
        f"for {duration} days on a {budget_level} budget. "
        f"Include cost-saving tips, best value accommodation areas, cheap vs splurge meal options, "
        f"and a realistic daily spending breakdown in USD."
    )

    ai_analysis = get_groq_response(build_prompt([], prompt_msg, {}))

    return jsonify({
        "destination":        destination,
        "duration":           duration,
        "travelers":          travelers,
        "budget_level":       budget_level,
        "daily_per_person":   total_per_person_daily,
        "total_estimate_usd": total_trip + breakdown["flights_estimate"],
        "breakdown":          breakdown,
        "ai_analysis":        ai_analysis,
    })


# ── Route: Clear History ───────────────────────────────────────────────────────
@app.route("/api/clear", methods=["POST"])
def clear_history():
    session.pop("history", None)
    return jsonify({"status": "cleared"})


# ── Route: Health Check ────────────────────────────────────────────────────────
@app.route("/api/health")
def health():
    groq_ready = bool(GROQ_API_KEY)
    return jsonify({
        "status":      "ok",
        "ai_service":  "Groq (Llama 3)",
        "ai_ready":    groq_ready,
        "weather_api": USE_WEATHER,
        "maps_api":    USE_MAPS,
        "timestamp":   datetime.utcnow().isoformat() + "Z",
    })


# ── Entry Point ────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    port  = int(os.getenv("PORT", 5000))
    debug = os.getenv("FLASK_DEBUG", "True").lower() == "true"
    print("═" * 60)
    print("  🌍 TravelAI — Groq Llama 3 Travel Planner Agent")
    print(f"  🚀 Starting on http://localhost:{port}")
    print(f"  🤖 AI Service: Groq (Llama 3-70B)")
    print(f"  🌦️  Weather: {'enabled' if USE_WEATHER else 'disabled'}")
    print(f"  🗺️  Maps   : {'enabled' if USE_MAPS else 'disabled'}")
    print("═" * 60)
    app.run(host="0.0.0.0", port=port, debug=debug)