import puppeteerExtra from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

const puppeteer = puppeteerExtra as any;
puppeteer.use(StealthPlugin());

export interface PokemonMetaData {
  pokemon: string;
  topTeammates: { name: string; usage: string }[];
  topItems: { name: string; usage: string }[];
  topMoves: { name: string; usage: string }[];
}

/**
 * Headless scraper for VGC Meta Data via Pikalytics & The LabMaus
 * Employs Puppeteer to circumvent private API restrictions and scrape direct usage stat DOM elements.
 * @param pokemonName The name of the Pokemon (e.g. "Incineroar")
 */
export async function scrapePokemonMeta(
  pokemonName: string,
): Promise<PokemonMetaData> {
  // Launch Puppeteer securely
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  // Set a realistic user agent to evade basic bot-blocking
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
  );

  const result: PokemonMetaData = {
    pokemon: pokemonName,
    topTeammates: [],
    topItems: [],
    topMoves: [],
  };

  try {
    // Keep internal dashes, and encode spaces for names like "Raging Bolt" -> "raging%20bolt"
    const formatName = pokemonName.toLowerCase().replace(/[^a-z0-9- ]/g, "").replace(/ /g, "%20");

    // In actual practice, you update the regulation segment string as metas progress (e.g. regg, regh)
    const url = `https://pikalytics.com/pokedex/gen9vgc2024regf/${formatName}`;
    console.log(`[Scraper] Navigating to: ${url}`);

    // Use networkidle2 so that any async Javascript API requests for Pikalytics stats complete
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
    
    // Pikalytics changed their layout: they now use a.teammate_entry 
    await page.waitForSelector("a.teammate_entry", { timeout: 10000 })
      .catch(() => console.log('Timeout waiting for teammate_entry on ' + pokemonName));

    // Scrape Top Teammates 
    const teammates = await page.evaluate(() => {
      const nodes = Array.from(document.querySelectorAll("a.teammate_entry"));
      return nodes.slice(0, 5).map((node) => {
        const nameAttr = node.getAttribute("data-name") || "";
        const name = nameAttr.replace(/%20/g, " "); // Fix encoding for spaces
        const pctNode = node.querySelector("div[style*='float:right']");
        const usage = pctNode ? (pctNode.textContent?.trim() || "0%") : "0%";
        return { name, usage };
      });
    });

    // Scrape Top Moves
    const moves = await page.evaluate(() => {
      const nodes = Array.from(document.querySelectorAll("#moves_wrapper .pokedex-move-entry-new"));
      return nodes.slice(0, 5).map((node) => {
        const pctNode = node.querySelector("div[style*='float:right']");
        const usage = pctNode ? (pctNode.textContent?.trim() || "0%") : "0%";
        const nameNode = node.children[0];
        const name = nameNode ? nameNode.textContent?.trim() || "" : "";
        return { name, usage };
      }).filter(m => m.name !== "Other" && m.name !== "");
    });

    // Scrape Top Items
    const items = await page.evaluate(() => {
      const nodes = Array.from(document.querySelectorAll("#items_wrapper .pokedex-move-entry-new"));
      return nodes.slice(0, 5).map((node) => {
        const pctNode = node.querySelector("div[style*='float:right']");
        const usage = pctNode ? (pctNode.textContent?.trim() || "0%") : "0%";
        const nameNode = node.children.length > 1 ? node.children[1] : node.children[0];
        const name = nameNode ? nameNode.textContent?.trim() || "" : "";
        return { name, usage };
      }).filter(i => i.name !== "Other" && i.name !== "");
    });

    result.topTeammates = teammates.filter((t: any) => t.name !== "");
    result.topMoves = moves;
    result.topItems = items;

    console.log(`[Scraper] Scraping complete for ${pokemonName}:`);
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error(
      `[Scraper] Failed to scrape usage stats for ${pokemonName}:`,
      err,
    );
  } finally {
    await browser.close();
  }

  return result;
}

/**
 * Batch scraper for an entire team.
 * @param team Array of Pokemon species names.
 */
export async function scrapeTournamentData(
  team: string[],
): Promise<PokemonMetaData[]> {
  const results: PokemonMetaData[] = [];
  for (const mon of team) {
    const data = await scrapePokemonMeta(mon);
    results.push(data);
  }
  return results;
}

// Allow CLI execution
if (
  typeof process !== "undefined" &&
  process.argv[1] &&
  process.argv[1].endsWith("scrapeMeta.ts")
) {
  const testTeam = ["incineroar", "rillaboom", "flutter-mane"];
  console.log(
    `[Scraper] Initializing batch scrape for test team: ${testTeam.join(", ")}`,
  );
  scrapeTournamentData(testTeam).then((res) => {
    console.log(`\n[Scraper] JSON RESULTS:`);
    console.log(JSON.stringify(res, null, 2));
  });
}
