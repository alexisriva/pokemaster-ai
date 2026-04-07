import "dotenv/config";
import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./swagger.js";
import { parsePokepaste } from "./pokemonParser.js";
import { scrapeTournamentData, scrapePokemonMeta } from "./scrapeMeta.js";
import { generateVGCStrategyReport } from "./gemini.js";
const app = express();
// CORS — driven by ALLOWED_ORIGINS env var (comma-separated list or *)
const allowedOrigins = process.env.ALLOWED_ORIGINS ?? "*";
app.use(cors(allowedOrigins === "*"
    ? undefined
    : {
        origin: allowedOrigins.split(",").map((o) => o.trim()),
    }));
app.use(express.json());
// ---------------------------------------------------------------------------
// Swagger UI — /docs
// Dark mode via CSS variable overrides (Swagger UI does not ship dark mode
// natively; we remap its CSS custom properties at the :root level).
// ---------------------------------------------------------------------------
const darkCss = `
  :root {
    --bg: #0f1117;
    --bg-secondary: #1a1d27;
    --bg-tertiary: #242736;
    --border: #2e3147;
    --text: #e2e8f0;
    --text-muted: #94a3b8;
    --accent: #7c6af7;
    --accent-hover: #9d8fff;
    --get: #3b82f6;
    --post: #10b981;
    --delete: #ef4444;
    --put: #f59e0b;
  }
  body, .swagger-ui { background: var(--bg); color: var(--text); }
  .swagger-ui .topbar { background: var(--bg-secondary); border-bottom: 1px solid var(--border); }
  .swagger-ui .topbar .download-url-wrapper input { background: var(--bg-tertiary); color: var(--text); border: 1px solid var(--border); }
  .swagger-ui .info .title, .swagger-ui .info p, .swagger-ui .info li,
  .swagger-ui .info a, .swagger-ui label { color: var(--text); }
  .swagger-ui .info a { color: var(--accent-hover); }
  .swagger-ui .scheme-container { background: var(--bg-secondary); border-bottom: 1px solid var(--border); box-shadow: none; }
  .swagger-ui .opblock-tag { color: var(--text); border-bottom: 1px solid var(--border); }
  .swagger-ui .opblock-tag:hover { background: var(--bg-tertiary); }
  .swagger-ui .opblock { background: var(--bg-secondary); border: 1px solid var(--border); box-shadow: none; }
  .swagger-ui .opblock .opblock-summary { border-bottom: 1px solid var(--border); }
  .swagger-ui .opblock .opblock-summary-description { color: var(--text-muted); }
  .swagger-ui .opblock.opblock-get .opblock-summary-method { background: var(--get); }
  .swagger-ui .opblock.opblock-get { border-color: var(--get); background: rgba(59,130,246,.08); }
  .swagger-ui .opblock.opblock-post .opblock-summary-method { background: var(--post); }
  .swagger-ui .opblock.opblock-post { border-color: var(--post); background: rgba(16,185,129,.08); }
  .swagger-ui .opblock.opblock-delete .opblock-summary-method { background: var(--delete); }
  .swagger-ui .opblock.opblock-delete { border-color: var(--delete); background: rgba(239,68,68,.08); }
  .swagger-ui .opblock.opblock-put .opblock-summary-method { background: var(--put); }
  .swagger-ui .opblock.opblock-put { border-color: var(--put); background: rgba(245,158,11,.08); }
  .swagger-ui .opblock-body, .swagger-ui .opblock-section, .swagger-ui .opblock-section-header { background: var(--bg-secondary); }
  .swagger-ui .opblock-description-wrapper p,
  .swagger-ui .opblock-external-docs-wrapper p,
  .swagger-ui .opblock-title_normal p,
  .swagger-ui table thead tr th,
  .swagger-ui table thead tr td,
  .swagger-ui .parameters-col_description p,
  .swagger-ui .response-col_description p { color: var(--text-muted); }
  .swagger-ui .tab li, .swagger-ui .opblock-tag small { color: var(--text-muted); }
  .swagger-ui input[type=text], .swagger-ui textarea, .swagger-ui select {
    background: var(--bg-tertiary); color: var(--text); border: 1px solid var(--border);
  }
  .swagger-ui .btn { background: var(--bg-tertiary); color: var(--text); border-color: var(--border); }
  .swagger-ui .btn.execute { background: var(--accent); color: #fff; border-color: var(--accent); }
  .swagger-ui .btn.execute:hover { background: var(--accent-hover); border-color: var(--accent-hover); }
  .swagger-ui .btn.cancel { border-color: var(--delete); color: var(--delete); }
  .swagger-ui .model-box, .swagger-ui .model { background: var(--bg-tertiary); }
  .swagger-ui section.models { background: var(--bg-secondary); border: 1px solid var(--border); }
  .swagger-ui section.models h4 { color: var(--text); border-bottom: 1px solid var(--border); }
  .swagger-ui .model-title, .swagger-ui .model .property.primitive { color: var(--text); }
  .swagger-ui .model span, .swagger-ui .model .property span { color: var(--text-muted); }
  .swagger-ui .response-col_status { color: var(--text); }
  .swagger-ui .responses-inner h4, .swagger-ui .responses-inner h5 { color: var(--text); }
  .swagger-ui .highlight-code { background: var(--bg-tertiary) !important; }
  .swagger-ui .microlight { background: var(--bg-tertiary) !important; color: var(--text) !important; }
  .swagger-ui * { scrollbar-color: var(--border) var(--bg-secondary); }
`;
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: darkCss,
    customSiteTitle: "PokéMaster AI — API Docs",
    swaggerOptions: { defaultModelsExpandDepth: 1, defaultModelExpandDepth: 2 },
}));
// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------
app.get("/health", (_req, res) => {
    res.json({ status: "ok", version: "1.0.0" });
});
// ---------------------------------------------------------------------------
// POST /api/v1/parse
// Parse a raw Poképaste string into a structured team array.
// Body: { rawPaste: string }
// Response: PokemonSet[]
// ---------------------------------------------------------------------------
app.post("/api/v1/parse", (req, res) => {
    const { rawPaste } = req.body;
    if (!rawPaste || typeof rawPaste !== "string") {
        return res.status(400).json({ error: "Missing or invalid rawPaste string in request body" });
    }
    const parsedTeam = parsePokepaste(rawPaste);
    res.json(parsedTeam);
});
// ---------------------------------------------------------------------------
// POST /api/v1/scrape
// Scrape tournament meta data for an array of Pokémon species names.
// Body: { team: string[] }
// Response: PokemonMetaData[]
// ---------------------------------------------------------------------------
app.post("/api/v1/scrape", async (req, res) => {
    try {
        const { team } = req.body;
        if (!team || !Array.isArray(team) || team.length === 0) {
            return res.status(400).json({ error: "Missing or invalid team array in request body" });
        }
        const data = await scrapeTournamentData(team);
        res.json(data);
    }
    catch (error) {
        console.error("Error during scraping:", error);
        res.status(500).json({ error: "Scraping failed" });
    }
});
// ---------------------------------------------------------------------------
// POST /api/v1/analyze
// Full pipeline: parse → scrape → AI analysis, streamed via Server-Sent Events.
// Body: { rawPaste: string, regulation?: string, apiKey?: string }
//   apiKey is optional — server falls back to GOOGLE_GENAI_API_KEY env var.
// Response: SSE stream
//   { type: "log",  msg: string, status: "analyzing"|"info"|"error"|"done" }
//   { type: "team", parsedTeam: PokemonSet[] }
//   { type: "result", report: VGCReport }
// ---------------------------------------------------------------------------
app.post("/api/v1/analyze", async (req, res) => {
    try {
        const { rawPaste, regulation, apiKey: bodyApiKey } = req.body;
        if (!rawPaste || typeof rawPaste !== "string") {
            return res.status(400).json({ error: "Missing or invalid rawPaste string in request body" });
        }
        const resolvedApiKey = bodyApiKey || process.env.GOOGLE_GENAI_API_KEY;
        if (!resolvedApiKey) {
            return res.status(503).json({
                error: "No Gemini API key available. Set GOOGLE_GENAI_API_KEY on the server or pass apiKey in the request body.",
            });
        }
        // Server-Sent Events headers
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        const sendEvent = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);
        sendEvent({ type: "log", msg: "Parsing raw text to identify logical blocks.", status: "analyzing" });
        const parsedTeam = parsePokepaste(rawPaste);
        sendEvent({ type: "team", parsedTeam });
        sendEvent({ type: "log", msg: `Identified ${parsedTeam.length} Pokémon entries. Initializing data scrape...`, status: "info" });
        const allSpecies = parsedTeam.map((p) => p.species);
        const scrapedData = [];
        for (const mon of allSpecies) {
            sendEvent({ type: "log", msg: `Scraping context for ${mon}...`, status: "analyzing" });
            const data = await scrapePokemonMeta(mon).catch((e) => {
                console.error(e);
                return { pokemon: mon, topTeammates: [], topMoves: [], topItems: [] };
            });
            if (data.topTeammates.length > 0) {
                sendEvent({ type: "log", msg: `Successfully sourced tournament metadata (teammates, items, moves) for ${mon}.`, status: "info" });
            }
            else {
                sendEvent({ type: "log", msg: `Couldn't retrieve relevant information about ${mon}.`, status: "error" });
            }
            scrapedData.push(data);
        }
        sendEvent({ type: "log", msg: "Meta extraction complete. Requesting RAG analysis...", status: "analyzing" });
        try {
            const report = await generateVGCStrategyReport(parsedTeam, scrapedData, resolvedApiKey, regulation || "Regulation H");
            sendEvent({ type: "log", msg: "Analysis complete. Report dynamically rendered.", status: "done" });
            sendEvent({ type: "result", report });
        }
        catch (e) {
            sendEvent({ type: "log", msg: `AI generation failed: ${e.message}`, status: "error" });
        }
        res.end();
    }
    catch (error) {
        console.error("Error during analysis:", error);
        if (!res.headersSent) {
            res.status(500).json({ error: "Analysis failed" });
        }
        else {
            res.write(`data: ${JSON.stringify({ type: "log", msg: "Fatal error on server.", status: "error" })}\n\n`);
            res.end();
        }
    }
});
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
