export interface VGCReport {
  legalityCheck?: string;
  metaHoles: string[];
  recommendations: { focus: string; rationale: string; change: string }[];
  summary: string;
}

export interface PokemonMetaData {
  pokemon: string;
  topTeammates: { name: string; usage: string }[];
  topItems: { name: string; usage: string }[];
  topMoves: { name: string; usage: string }[];
}

export type PokemonSet = {
  species: string;
  item?: string;
  ability?: string;
  teraType?: string;
  evs?: string;
  ivs?: string;
  nature?: string;
  moves: string[];
};

export type LogEntry = {
  msg: string;
  type: "info" | "analyzing" | "done" | "error";
};
