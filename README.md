# TripSynth

An AI-powered travel planner and itinerary synthesis platform. TripSynth translates unstructured, natural language travel preferences into organized, logical, and conflict-free travel schedules. The system is designed with a service-oriented Python backend and a type-safe, reactive frontend client.

---

## What It Does

Traditional travel planning tools depend heavily on restrictive spreadsheet configurations and repetitive form fields. TripSynth replaces that workflow with an interactive, natural conversational interface.

The system relies on a multi-agent orchestration architecture to handle timeline structures. As users describe general locations, dates, and activity preferences, the planning agents parse the raw contextual intent, validate it against real-world logistics (such as geographical feasibility, flight arrival times, and check-in windows), and dynamically update a clean, linear itinerary.

---

## Tech Stack

* **Backend:** Python, structured multi-agent engine.
* **Frontend:** Vite, TypeScript, Tailwind CSS, PostCSS.
* **Architecture:** Decoupled monorepo containing dedicated frontend and backend runtimes.

---

## Architecture Blueprint

```text
tripsynth/
├── backend/                  # Python Backend Workspace
│   ├── app/                  # Application core, routing layer, and agent services
│   ├── .env.example          # Environment variable template
│   ├── .gitignore            # Git exclusions for backend runtimes
│   ├── README.md             # Backend specific documentation
│   └── requirements.txt      # Python package dependencies
│
├── frontend/                 # Vite Frontend Client
│   ├── public/               # Static web assets
│   ├── src/                  # Client source code (components, hooks, state)
│   ├── .gitignore            # Git exclusions for Node modules and builds
│   ├── index.html            # Vite ecosystem mount point
│   ├── package-lock.json     # Locked dependency graph
│   ├── package.json          # Node scripts and dependencies
│   ├── postcss.config.js     # CSS compilation config
│   ├── tailwind.config.js    # Utility design tokens
│   ├── tsconfig.json         # TypeScript compiler options
│   └── vite.config.ts        # Vite build optimization options
│
└── README.md                 # Root repository documentation

Local Development Setup
To run the full-stack architecture locally, execute the following configuration steps in separate terminal windows.

1. Backend Service Configuration

Navigate into the backend workspace and initialize the Python runtime environment:
cd backend
# Install necessary system dependencies
pip install -r requirements.txt
# Replicate environmental configurations
cp .env.example .env
# Execute the backend application server
python -m app.main

2. Frontend Client Configuration

Navigate into the frontend workspace and initialize the local dev server:
cd frontend
# Install client packages
npm install
# Start the reactive development bundle
npm run dev

The application interface will default to hosting natively at http://localhost:5173.
---

Author
Kokil Agarwal
