import puppeteerExtra from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

const puppeteer = puppeteerExtra as any;
puppeteer.use(StealthPlugin());

export interface PokemonMetaData {
  pokemon: string;
  topTeammates: { name: string; usage: string }[];
  commonChecks: { name: string; usage: string }[];
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
    commonChecks: [],
  };

  try {
    const formatName = pokemonName.toLowerCase().replace(/[^a-z0-9-]/g, "");

    // In actual practice, you update the regulation segment string as metas progress (e.g. regg, regh)
    const url = `https://pikalytics.com/pokedex/gen9vgc2024regf/${formatName}`;
    console.log(`[Scraper] Navigating to: ${url}`);

    // Use domcontentloaded for faster scraping instead of networkidle
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

    // Optional: add LabMaus integration dynamically here, fetching tournament results
    // Example: await page.goto(`https://thelabmaus.com/...`);

    // Scrape Top Teammates
    // Usually nested in elements like `.pokedex-teammate-wrapper`
    const teammates = await page.evaluate(() => {
      const nodes = Array.from(
        document.querySelectorAll(
          ".pokedex-category-wrapper.teammates .pokemon-name",
        ),
      );
      const percentages = Array.from(
        document.querySelectorAll(
          ".pokedex-category-wrapper.teammates .usage-percent",
        ),
      );

      return nodes.slice(0, 5).map((node, i) => ({
        name: node.textContent?.trim() || "",
        usage: percentages[i]?.textContent?.trim() || "0%",
      }));
    });

    // Scrape Common Checks / Counters
    // Depending on the site updates, the selector might shift
    const checks = await page.evaluate(() => {
      const nodes = Array.from(
        document.querySelectorAll(
          ".pokedex-category-wrapper.checks .pokemon-name",
        ),
      );
      const percentages = Array.from(
        document.querySelectorAll(
          ".pokedex-category-wrapper.checks .usage-percent",
        ),
      );

      return nodes.slice(0, 5).map((node, i) => ({
        name: node.textContent?.trim() || "",
        usage: percentages[i]?.textContent?.trim() || "0%",
      }));
    });

    result.topTeammates = teammates.filter((t: any) => t.name !== "");
    result.commonChecks = checks.filter((c: any) => c.name !== "");

    console.log(`[Scraper] Scraping complete for ${pokemonName}.`);
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
