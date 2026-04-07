export function parsePokepaste(text) {
    if (!text)
        return [];
    const blocks = text.trim().split(/\n\s*\n/);
    const team = [];
    for (const block of blocks) {
        const lines = block
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line.length > 0);
        if (lines.length === 0)
            continue;
        const pokemon = {
            species: "",
            moves: [],
        };
        // Parse the first line for Species and Item
        // E.g., "Terapagos @ Leftovers" or "Terapagos (M) @ Leftovers" or "Incineroar"
        const firstLine = lines[0];
        const atIndex = firstLine.indexOf("@");
        if (atIndex !== -1) {
            pokemon.species = firstLine.substring(0, atIndex).trim();
            pokemon.item = firstLine.substring(atIndex + 1).trim();
        }
        else {
            pokemon.species = firstLine.trim();
        }
        // Strip gender and nick if present: "Nick (Species) (M) @ Item" -> "Species"
        const speciesMatch = pokemon.species.match(/\(([^()]+)\)/);
        const validNickMatch = speciesMatch && speciesMatch[1] !== "M" && speciesMatch[1] !== "F";
        if (validNickMatch) {
            pokemon.species = speciesMatch[1];
        }
        else {
            pokemon.species = pokemon.species.replace(/\s*\([MF]\)\s*/g, "").trim();
        }
        // Parse remaining lines
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            if (line.startsWith("Ability:")) {
                pokemon.ability = line.substring(8).trim();
            }
            else if (line.startsWith("Tera Type:")) {
                pokemon.teraType = line.substring(10).trim();
            }
            else if (line.startsWith("EVs:")) {
                pokemon.evs = line.substring(4).trim();
            }
            else if (line.startsWith("IVs:")) {
                pokemon.ivs = line.substring(4).trim();
            }
            else if (line.endsWith("Nature")) {
                pokemon.nature = line.split(" ")[0].trim();
            }
            else if (line.startsWith("-")) {
                pokemon.moves.push(line.substring(1).trim());
            }
        }
        team.push(pokemon);
    }
    return team;
}
