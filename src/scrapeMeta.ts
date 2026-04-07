import puppeteerExtra from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import type { PokemonMetaData } from "./types.js";

const puppeteer = puppeteerExtra as any;
puppeteer.use(StealthPlugin());

/**
 * Headless scraper for VGC Meta Data via Pikalytics.
 * Employs Puppeteer to circumvent private API restrictions and scrape direct usage stat DOM elements.
 * @param pokemonName The name of the Pokemon (e.g. "Incineroar")
 */
export async function scrapePokemonMeta(
  pokemonName: string,
): Promise<PokemonMetaData> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

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
    const regulation = process.env.PIKALYTICS_REGULATION || "gen9vgc2024regf";
    const formatName = pokemonName.toLowerCase().replace(/[^a-z0-9- ]/g, "").replace(/ /g, "%20");
    const url = `https://pikalytics.com/pokedex/${regulation}/${formatName}`;
    console.log(`[Scraper] Navigating to: ${url}`);

    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

    await page.waitForSelector("a.teammate_entry", { timeout: 10000 })
      .catch(() => console.log(`Timeout waiting for teammate_entry on ${pokemonName}`));

    const teammates = await page.evaluate(() => {
      const nodes = Array.from(document.querySelectorAll("a.teammate_entry"));
      return nodes.slice(0, 5).map((node: any) => {
        const nameAttr = node.getAttribute("data-name") || "";
        const name = nameAttr.replace(/%20/g, " ");
        const pctNode = node.querySelector("div[style*='float:right']");
        const usage = pctNode ? (pctNode.textContent?.trim() || "0%") : "0%";
        return { name, usage };
      });
    });

    const moves = await page.evaluate(() => {
      const nodes = Array.from(document.querySelectorAll("#moves_wrapper .pokedex-move-entry-new"));
      return nodes.slice(0, 5).map((node: any) => {
        const pctNode = node.querySelector("div[style*='float:right']");
        const usage = pctNode ? (pctNode.textContent?.trim() || "0%") : "0%";
        const nameNode = node.children[0];
        const name = nameNode ? nameNode.textContent?.trim() || "" : "";
        return { name, usage };
      }).filter((m: any) => m.name !== "Other" && m.name !== "");
    });

    const items = await page.evaluate(() => {
      const nodes = Array.from(document.querySelectorAll("#items_wrapper .pokedex-move-entry-new"));
      return nodes.slice(0, 5).map((node: any) => {
        const pctNode = node.querySelector("div[style*='float:right']");
        const usage = pctNode ? (pctNode.textContent?.trim() || "0%") : "0%";
        const nameNode = node.children.length > 1 ? node.children[1] : node.children[0];
        const name = nameNode ? nameNode.textContent?.trim() || "" : "";
        return { name, usage };
      }).filter((i: any) => i.name !== "Other" && i.name !== "");
    });

    result.topTeammates = teammates.filter((t: any) => t.name !== "");
    result.topMoves = moves;
    result.topItems = items;

    console.log(`[Scraper] Scraping complete for ${pokemonName}:`);
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error(`[Scraper] Failed to scrape usage stats for ${pokemonName}:`, err);
  } finally {
    await browser.close();
  }

  return result;
}

/**
 * Batch scraper for an entire team. Runs all species scrapes in parallel.
 * @param team Array of Pokemon species names.
 */
export async function scrapeTournamentData(
  team: string[],
): Promise<PokemonMetaData[]> {
  const settled = await Promise.allSettled(team.map((mon) => scrapePokemonMeta(mon)));
  return settled.map((result, i) => {
    if (result.status === "fulfilled") return result.value;
    console.error(`[Scraper] Failed for ${team[i]}:`, result.reason);
    return { pokemon: team[i], topTeammates: [], topMoves: [], topItems: [] };
  });
}

// Allow CLI execution: tsx src/scrapeMeta.ts
if (
  typeof process !== "undefined" &&
  process.argv[1] &&
  process.argv[1].endsWith("scrapeMeta.ts")
) {
  const testTeam = ["incineroar", "rillaboom", "flutter-mane"];
  console.log(`[Scraper] Initializing batch scrape for test team: ${testTeam.join(", ")}`);
  scrapeTournamentData(testTeam).then((res) => {
    console.log(`\n[Scraper] JSON RESULTS:`);
    console.log(JSON.stringify(res, null, 2));
  });
}
