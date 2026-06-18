# TripSynth

AI trip planner with a two-agent architecture — plan a trip in chat, watch the itinerary build live, refine with follow-ups, and download as PDF.

## Architecture

TripSynth uses **two agents** orchestrated with LangGraph:

1. **Planner** — Reads the user's request and conversation history, then outputs a structured task list (research attractions, find budget options, etc.).
2. **Worker** — Runs tools (Tavily web search, Google Places lookup), then builds a complete day-by-day itinerary JSON.

The frontend streams two distinct loading stages so you can see each agent working: **"Planning..."** then **"Searching and building your itinerary..."**

### Full re-plan on follow-up

On any follow-up message, the Worker **re-plans the entire itinerary** using full conversation context rather than patching individual days. This is intentional — partial edits can conflict (e.g. budget changes affecting multiple days). See `backend/app/agents/graph.py`.

## Stack

Frontend -> React, Vite, TypeScript, Tailwind CSS, Leaflet
Backend -> FastAPI, LangGraph, Groq
Tools -> Tavily (web search), Google Places
Memory -> Redis (session conversation + itinerary) 

No auth, no persistent database — trips live in browser session storage (UI) and Redis (backend) for the demo.

## Prerequisites

- Node.js 18+
- Python 3.11+
- Redis running locally
- API keys: [Groq](https://console.groq.com/), [Tavily](https://tavily.com/), [Google Places](https://developers.google.com/maps/documentation/places/web-service)

## Setup

### 1. Redis

```bash
# Docker
docker run -d -p 6379:6379 redis:7-alpine

# Or install Redis locally and start the server
```

### 2. Backend

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
# Edit .env with your API keys

uvicorn app.main:app --reload --port 8000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Environment variables

| Variable | Description |
|----------|-------------|
| `GROQ_API_KEY` | Groq LLM API key (required for real planning) |
| `TAVILY_API_KEY` | Tavily search API key |
| `GOOGLE_PLACES_API_KEY` | Google Places Text Search API key |
| `REDIS_URL` | Redis connection URL (default `redis://localhost:6379/0`) |
| `CORS_ORIGINS` | Allowed frontend origin (default `http://localhost:5173`) |

Without Tavily/Google keys, tools run in demo mode with placeholder results; Groq is still required for LLM responses.

## Usage

1. Type a trip request or use a quick-start chip (e.g. "Weekend trip to Goa").
2. Watch **Planning...** then **Searching and building your itinerary...**
3. Expand **Show agent reasoning** on any assistant message to see the Planner's task list.
4. Review the day-by-day timeline, map pins, and budget bar in the right panel.
5. Send follow-ups ("Make day 2 more relaxed", "Add beach time") — changed days flash briefly.
6. **Download PDF** or **Start new trip** from the itinerary header.

## Project structure

```
tripsynth/
├── backend/
│   ├── app/
│   │   ├── agents/graph.py    # LangGraph Planner + Worker
│   │   ├── tools/             # Tavily + Google Places
│   │   ├── main.py            # FastAPI + SSE chat stream
│   │   └── redis_client.py
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── components/        # Chat, Itinerary, Map, TopBar
│       └── hooks/             # Sessions, theme, toast
└── README.md
```

## License

MIT
