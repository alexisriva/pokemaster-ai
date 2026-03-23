import express, { Request, Response } from "express";
import cors from "cors";
import { parsePokepaste } from "./pokemonParser.js";
import { scrapeTournamentData } from "./scrapeMeta.js";

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
    const { rawPaste } = req.body;
    if (!rawPaste || typeof rawPaste !== "string") {
      return res
        .status(400)
        .json({ error: "Missing or invalid rawPaste string in request body" });
    }

    const parsedTeam = parsePokepaste(rawPaste);
    const top3Species = parsedTeam.slice(0, 3).map((p) => p.species);

    // Trigger Puppeteer scraper for the Top 3 Pokemon
    const scrapedData = await scrapeTournamentData(top3Species);

    res.json({
      parsedTeam,
      scrapedData,
    });
  } catch (error) {
    console.error("Error during analysis:", error);
    res.status(500).json({ error: "Analysis failed" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
