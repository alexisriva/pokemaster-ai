import "dotenv/config";
import express from "express";
import cors from "cors";
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
