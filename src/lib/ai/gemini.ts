import { GoogleGenAI } from "@google/genai";
import type { PokemonMetaData } from "../../scripts/scrapeMeta";
import type { PokemonSet } from "../pokemonParser";

export interface VGCReport {
  metaHoles: string[];
  recommendations: { focus: string; rationale: string; change: string }[];
  summary: string;
}

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
    
    Current Meta Data Context (Top Teammates & Common Checks per Pokemon):
    ${JSON.stringify(metaData, null, 2)}
    
    Analyze the uploaded team against the provided Top 10 usage stats.
    
    CRITICAL RULES - LEGALITY CONSTRAINTS:
    1. The currently active format is ${currentRegulation}. 
    2. You MUST ensure that every single Pokémon, item, and move you recommend is 100% legal under ${currentRegulation}. 
    3. DO NOT recommend restricted legendaries, mythicals, or banned Pokémon if they are not permitted in ${currentRegulation}.
    
    Tasks:
    1. Identify 'Meta Holes': e.g. Does this team lack speed-control, redirection, or an answer to Choice Specs Terapagos? 
    2. Suggest 3-5 specific actionable recommendations for Moves or Items.
    3. Include a rationale explaining the "Why" using recent tournament context and basic Pokemon strategy.
    
    Return your response strictly as valid JSON in this exact structure:
    {
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
