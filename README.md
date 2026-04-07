# PokéMaster AI — Server

Standalone REST API for VGC team analysis. Provides Poképaste parsing, Pikalytics tournament meta scraping, and Gemini AI strategy reports over a clean versioned HTTP interface.

---

## Tech Stack

- **Runtime**: Node.js + TypeScript (ES modules)
- **Framework**: Express.js
- **Scraping**: Puppeteer + puppeteer-extra-plugin-stealth
- **AI**: Google Gemini 2.5 Flash (`@google/genai`)

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | Server port (default: `5001`) |
| `GOOGLE_GENAI_API_KEY` | Yes* | Google Gemini API key |
| `ALLOWED_ORIGINS` | No | Comma-separated CORS origins or `*` (default: `*`) |
| `PIKALYTICS_REGULATION` | No | Pikalytics regulation slug (default: `gen9vgc2024regf`) |

*The Gemini API key can alternatively be passed per-request via the `apiKey` field in the request body.

### 3. Run

```bash
# Development (hot-reload)
npm run dev

# Production
npm run build
npm start
```

---

## Endpoints

### `GET /health`

Liveness check.

**Response**
```json
{ "status": "ok", "version": "1.0.0" }
```

---

### `POST /api/v1/parse`

Parse a raw Poképaste string into a structured team array. No scraping or AI involved.

**Request body**
```json
{
  "rawPaste": "Incineroar @ Assault Vest\nAbility: Intimidate\n..."
}
```

**Response** — `PokemonSet[]`
```json
[
  {
    "species": "Incineroar",
    "item": "Assault Vest",
    "ability": "Intimidate",
    "teraType": "Fire",
    "evs": "252 HP / 4 Atk / 252 SpD",
    "nature": "Careful",
    "moves": ["Fake Out", "Knock Off", "Flare Blitz", "Parting Shot"]
  }
]
```

---

### `POST /api/v1/scrape`

Scrape Pikalytics tournament meta data for an array of Pokémon species names.

**Request body**
```json
{
  "team": ["Incineroar", "Rillaboom", "Flutter Mane"]
}
```

**Response** — `PokemonMetaData[]`
```json
[
  {
    "pokemon": "Incineroar",
    "topTeammates": [{ "name": "Rillaboom", "usage": "42%" }],
    "topMoves": [{ "name": "Fake Out", "usage": "91%" }],
    "topItems": [{ "name": "Assault Vest", "usage": "55%" }]
  }
]
```

---

### `POST /api/v1/analyze`

Full pipeline: parse Poképaste → scrape meta → Gemini AI analysis. Response is streamed as **Server-Sent Events (SSE)**.

**Request body**
```json
{
  "rawPaste": "Incineroar @ Assault Vest\n...",
  "regulation": "Regulation H",
  "apiKey": "optional-override-key"
}
```

| Field | Required | Description |
|---|---|---|
| `rawPaste` | Yes | Poképaste formatted team string |
| `regulation` | No | VGC regulation name (default: `"Regulation H"`) |
| `apiKey` | No | Overrides `GOOGLE_GENAI_API_KEY` env var |

**SSE event stream**

Each event is a `data: <JSON>\n\n` line. Three event shapes are emitted:

```ts
// Progress logs
{ type: "log", msg: string, status: "analyzing" | "info" | "error" | "done" }

// Parsed team (emitted early in the stream)
{ type: "team", parsedTeam: PokemonSet[] }

// Final AI report (emitted at end of stream)
{ type: "result", report: VGCReport }
```

**`VGCReport` shape**
```json
{
  "legalityCheck": "Team is 100% legal under Regulation H.",
  "metaHoles": ["No speed control", "Weak to Fairy types"],
  "recommendations": [
    {
      "focus": "Rillaboom",
      "change": "Switch item to Choice Band",
      "rationale": "Grassy Glide priority is underutilized without raw power."
    }
  ],
  "summary": "Solid defensive core with offensive gaps in the lead matchup."
}
```

**Example (JavaScript)**
```js
const res = await fetch("http://localhost:5001/api/v1/analyze", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ rawPaste: "...", regulation: "Regulation H" }),
});

const reader = res.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  const lines = decoder.decode(value).split("\n");
  for (const line of lines) {
    if (line.startsWith("data: ")) {
      const event = JSON.parse(line.slice(6));
      console.log(event);
    }
  }
}
```

---

## Shared Types

All response shapes are defined in [`src/types.ts`](src/types.ts) and can be imported directly if consuming this server from a TypeScript project in the same workspace.

```ts
import type { PokemonSet, PokemonMetaData, VGCReport } from "./src/types.js";
```

---

## Updating the Active Regulation

Set `PIKALYTICS_REGULATION` in `.env` to the current regulation slug from Pikalytics URLs:

```
PIKALYTICS_REGULATION=gen9vgc2025regh
```

This controls which dataset is scraped for all meta requests. No code changes needed when the format rotates.
