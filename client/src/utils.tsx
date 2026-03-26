import type { PokemonSet } from "./types";

export function exportToPokepaste(team: PokemonSet[]): string {
  return team
    .map((mon) => {
      let str = "";
      if (mon.item) str += `${mon.species} @ ${mon.item}\n`;
      else str += `${mon.species}\n`;
      if (mon.ability) str += `Ability: ${mon.ability}\n`;
      if (mon.teraType) str += `Tera Type: ${mon.teraType}\n`;
      if (mon.evs) str += `EVs: ${mon.evs}\n`;
      if (mon.ivs) str += `IVs: ${mon.ivs}\n`;
      if (mon.nature) str += `${mon.nature} Nature\n`;
      mon.moves.forEach((m) => (str += `- ${m}\n`));
      return str;
    })
    .join("\n\n");
}

export function formatMarkdown(text: string) {
  if (!text) return null;
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="text-zinc-100 font-bold font-sans">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}
