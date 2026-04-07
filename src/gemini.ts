import { GoogleGenAI } from "@google/genai";
import type { PokemonSet, PokemonMetaData, VGCReport } from "./types.js";

export async function generateVGCStrategyReport(
  team: PokemonSet[],
  metaData: PokemonMetaData[],
  apiKey: string,
  currentRegulation: string = "Regulation H",
): Promise<VGCReport> {
  const ai = new GoogleGenAI({ apiKey });

  const promptText = `
    You are a VGC World Champion Strategist.

    Team Setup:
    ${JSON.stringify(team, null, 2)}

    Current Meta Data Context (Top Teammates, Items & Moves per Pokemon):
    ${JSON.stringify(metaData, null, 2)}

    Analyze the uploaded team against the provided Top 10 usage stats.

    CRITICAL RULES - LEGALITY CONSTRAINTS:
    1. The currently active format is ${currentRegulation}. (Hint: If Regulation H, remember that ALL restricted legendaries, minor legendaries like the Ruinous quartet, Ogerpon, and ALL Paradox Pokemon are strictly BANNED!)
    2. IF the provided team contains any Pokémon that are officially banned or illegal to use in ${currentRegulation}, your VERY FIRST recommendation MUST be to remove them and suggest a legal "mini-version" or functional equivalent that fills the same strategic niche.
    3. You MUST ensure that every single Pokémon, item, and move you recommend is 100% legal under ${currentRegulation}.
    4. DO NOT recommend restricted legendaries, mythicals, or banned Pokémon if they are not permitted in ${currentRegulation}.

    Tasks:
    1. Chain-of-Thought Legality Check: Start by writing out the "legalityCheck". Are there ANY restricted legendaries, minor legendaries (Ruinous strings, Ogerpon, Urshifu), or Paradox Pokémon (Flutter Mane, Raging Bolt, Iron Crown, etc.)? If the format bans them (e.g. Regulation H), explicitly state they are illegal and note that you MUST REPLACE THEM.
    2. Identify 'Meta Holes': e.g. Does this team lack speed-control or redirection?
    3. Suggest 3-5 specific actionable recommendations (Your VERY FIRST recommendations MUST BE replacing any illegal Pokémon you just found! Then you may suggest Moves or Items.)
    4. Include a rationale explaining the "Why" using recent tournament context and basic Pokemon strategy.

    Return your response strictly as valid JSON in this exact structure:
    {
      "legalityCheck": "State explicitly whether the input team is 100% legal, or list the banned/illegal pokemon that you are going to replace.",
      "metaHoles": ["string", "string"],
      "recommendations": [
        { "focus": "Pokemon Name", "change": "Suggested Change", "rationale": "Reason" }
      ],
      "summary": "Brief overall team assessment"
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: promptText,
      config: {
        responseMimeType: "application/json",
        temperature: 0.7,
      },
    });

    if (response.text) {
      return JSON.parse(response.text) as VGCReport;
    }

    throw new Error("No valid content structure returned from Gemini.");
  } catch (error) {
    console.error("Failed to generate VGC Report:", error);
    throw error;
  }
}
