# PokéMaster AI 🏆

PokéMaster AI is a cutting-edge VGC team analyzer and strategy builder. Powered by **React, Tailwind CSS v4, and Gemini**, this dashboard acts as a "Virtual World Champion Strategist," generating intelligent, data-driven modifications to your Competitive Pokémon teams.

## 🚀 Features

- **Instant Pokepaste Parsing**: Paste your Showdown text into the portal to immediately compile competitive attributes (Species, Sets, Tera Types, EVs/IVs) into standardized JSON architectures.
- **RAG-Powered Meta Data (LabMaus / Pikalytics)**: Utilizes a headless Puppeteer node-script to bypass restricted APIs, scraping the absolute latest Tournament Usage Stats (Top Teammates, Common Checks) and structuring them.
- **Gemini AI Diagnostics**: Feeds your customized JSON team framework alongside the live-scraped Meta Context into Gemini. The LLM identifies defensive "Meta Holes" and outputs 3-5 strategic recommendations on Item/Move changes.
- **Card-Driven Reports**: Outputs gorgeous, syntax-highlighted glassmorphic cards to map out the generated Report natively on the UI.
- **Export to Pokepaste**: One-click copies the optimized team arrays securely to your clipboard for instant importing into Pokémon Showdown.

---

## 🛠 Tech Stack

- **Frontend Core**: Vite, React 19, TypeScript
- **Styling**: Tailwind CSS v4 (Alpha/Latest Ecosystem) + Lucide Icons
- **Brain/LLM**: Google GenAI SDK (`@google/genai`), Gemini
- **Extraction Server**: Puppeteer (Headless Scraper)

---

## 🧠 How the RAG Agent Architecture Works

Competitive VGC metagames (like Regulation H/G) are highly turbulent. Standard LLMs hallucinate viable movesets or forget recent top-cut data because their training cutoffs precede the active Series rotation.

**PokéMaster AI solves this via Retrieval-Augmented Generation (RAG)**:

1. **Extraction (Puppeteer)**: The backend utility (`src/scripts/scrapeMeta.ts`) acts as the Data Loader for the RAG pipeline. It receives the list of species from your raw paste and systematically navigates to dynamic tournament trackers like **LabMaus** or **Pikalytics**. It evaluates the DOM to extract the active Meta percentages for "Top Teammates" and "Common Checks".
2. **Context Framing**: The fetched meta-usage JSON and your Team JSON are combined into an Augmented Context window.
3. **Prompt Injection**: Handed over to `Gemini`, who is strictly prompted to act as a "VGC World Champion" and diagnose the team _specifically using the live data as ground truth._
4. **Structured Output Construction**: The AI outputs its recommendations formatted into our rigid `VGCReport` TS Interface (ensuring the frontend renders beautifully without hallucinated markdown).

---

## 💻 Running the Project

### 1. Prerequisites

Ensure you have Node.js v19+ installed.

### 2. Installations

```bash
npm install
```

### 3. Run the Dashboard

Execute the Vite Development Server:

```bash
npm run dev
```

### 4. Provide your API Key

When the dashboard loads on `localhost`, input your **Google Gemini API Key** securely in the NavBar input. Paste a Showdown team into the Data box, and execute the analysis!

---

_Note: For complete end-to-end integration, run the `scrapeMeta` Puppeteer script natively inside an Express or Cloudflare worker layer in production since Browser/Vite environments cannot orchestrate headless Web-Scraping._
