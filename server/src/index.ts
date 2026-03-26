import express, { Request, Response } from "express";
import cors from "cors";
import { parsePokepaste } from "./pokemonParser.js";
import { scrapeTournamentData, scrapePokemonMeta } from "./scrapeMeta.js";
import { generateVGCStrategyReport } from "./gemini.js";

const app = express();
app.use(cors());
app.use(express.json());

app.post("/api/scrape", async (req: Request, res: Response): Promise<any> => {
  try {
    const { team } = req.body;
    if (!team || !Array.isArray(team)) {
      return res
        .status(400)
        .json({ error: "Missing or invalid team array in request body" });
    }

    const data = await scrapeTournamentData(team);
    res.json(data);
  } catch (error) {
    console.error("Error during scraping:", error);
    res.status(500).json({ error: "Scraping failed" });
  }
});

app.post("/api/analyze", async (req: Request, res: Response): Promise<any> => {
  try {
    const { rawPaste, apiKey, regulation } = req.body;
    if (!rawPaste || typeof rawPaste !== "string") {
      return res.status(400).json({ error: "Missing or invalid rawPaste string in request body" });
    }

    // Server-Sent Events headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const sendEvent = (data: any) => res.write(`data: ${JSON.stringify(data)}\n\n`);

    sendEvent({ type: "log", msg: "Parsing raw text to identify logical blocks.", status: "analyzing" });
    const parsedTeam = parsePokepaste(rawPaste);
    
    sendEvent({ type: "team", parsedTeam });
    sendEvent({ type: "log", msg: `Identified ${parsedTeam.length} Pokémon entries. Initializing data scrape...`, status: "info" });

    const allSpecies = parsedTeam.map((p) => p.species);
    const scrapedData = [];
    
    for (const mon of allSpecies) {
      sendEvent({ type: "log", msg: `Scraping context for ${mon}...`, status: "analyzing" });
      const data = await scrapePokemonMeta(mon).catch((e: any) => {
        console.error(e);
        return { pokemon: mon, topTeammates: [], topMoves: [], topItems: [] };
      });
      
      if (data.topTeammates.length > 0) {
        sendEvent({ type: "log", msg: `Successfully sourced tournament metadata (teammates, items, moves) for ${mon}.`, status: "info" });
      } else {
        sendEvent({ type: "log", msg: `Couldn't retrieve relevant information about ${mon}.`, status: "error" });
      }
      scrapedData.push(data);
    }
    
    sendEvent({ type: "log", msg: `Meta extraction complete. Requesting RAG analysis...`, status: "analyzing" });

    if (apiKey) {
      try {
        const report = await generateVGCStrategyReport(parsedTeam, scrapedData, apiKey, regulation || "Regulation H");
        sendEvent({ type: "log", msg: "Analysis Complete. Report dynamically rendered.", status: "done" });
        sendEvent({ type: "result", report });
      } catch(e: any) {
         sendEvent({ type: "log", msg: `AI Generation Failed: ${e.message}`, status: "error" });
      }
    } else {
       sendEvent({ type: "log", msg: "No API Key provided. Returning parsed data only.", status: "error" });
    }
    
    res.end();
  } catch (error) {
    console.error("Error during analysis:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Analysis failed" });
    } else {
      res.write(`data: ${JSON.stringify({ type: "log", msg: "Fatal error on server.", status: "error" })}\n\n`);
      res.end();
    }
  }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
