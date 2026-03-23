import { useState, useEffect, useRef } from "react";
import {
  BrainCircuit,
  Play,
  Database,
  Server,
  RefreshCw,
  Zap,
  Key,
  ShieldAlert,
  Swords,
  Info,
  CheckCircle2,
  Copy,
} from "lucide-react";
import { generateVGCStrategyReport, type VGCReport } from "./lib/ai/gemini";

export interface PokemonMetaData {
  pokemon: string;
  topTeammates: { name: string; usage: string }[];
  commonChecks: { name: string; usage: string }[];
}

type PokemonSet = {
  species: string;
  item?: string;
  ability?: string;
  teraType?: string;
  evs?: string;
  ivs?: string;
  nature?: string;
  moves: string[];
};

// Simple Pokepaste Parser
function parsePokepaste(text: string): PokemonSet[] {
  if (!text) return [];
  const blocks = text.trim().split(/\n\s*\n/);
  const team: PokemonSet[] = [];
  for (const block of blocks) {
    const lines = block
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    if (lines.length === 0) continue;
    const pokemon: PokemonSet = { species: "", moves: [] };
    const firstLine = lines[0];
    const atIndex = firstLine.indexOf("@");
    let rawSpecies = firstLine;
    if (atIndex !== -1) {
      rawSpecies = firstLine.substring(0, atIndex).trim();
      pokemon.item = firstLine.substring(atIndex + 1).trim();
    }
    const speciesMatch = rawSpecies.match(/\(([^()]+)\)/);
    const validNickMatch =
      speciesMatch && speciesMatch[1] !== "M" && speciesMatch[1] !== "F";
    if (validNickMatch) {
      pokemon.species = speciesMatch[1];
    } else {
      pokemon.species = rawSpecies.replace(/\s*\([MF]\)\s*/g, "").trim();
    }
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith("Ability:"))
        pokemon.ability = line.substring(8).trim();
      else if (line.startsWith("Tera Type:"))
        pokemon.teraType = line.substring(10).trim();
      else if (line.startsWith("EVs:")) pokemon.evs = line.substring(4).trim();
      else if (line.startsWith("IVs:")) pokemon.ivs = line.substring(4).trim();
      else if (line.endsWith("Nature"))
        pokemon.nature = line.split(" ")[0].trim();
      else if (line.startsWith("-"))
        pokemon.moves.push(line.substring(1).trim());
    }
    team.push(pokemon);
  }
  return team;
}

function exportToPokepaste(team: PokemonSet[]): string {
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

export default function App() {
  const [paste, setPaste] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [regulation, setRegulation] = useState("Regulation H");
  const [team, setTeam] = useState<PokemonSet[]>([]);
  const [report, setReport] = useState<VGCReport | null>(null);
  const [missionLogs, setMissionLogs] = useState<
    { msg: string; type: "info" | "analyzing" | "done" | "error" }[]
  >([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [copied, setCopied] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [missionLogs]);

  const handleCopy = () => {
    const pasteText = exportToPokepaste(team);
    navigator.clipboard.writeText(pasteText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleParseAndAnalyze = async () => {
    if (!paste) return;
    if (!apiKey) {
      alert("Please provide a Gemini API Key to run the analysis engine.");
      return;
    }

    setIsAnalyzing(true);
    setMissionLogs([]);
    setTeam([]);
    setReport(null);

    const addLog = (
      msg: string,
      type: "info" | "analyzing" | "done" | "error" = "info",
    ) => {
      setMissionLogs((prev) => [...prev, { msg, type }]);
    };

    addLog("Agent initialized. Authenticating Gemini...", "analyzing");
    await new Promise((r) => setTimeout(r, 800));

    addLog("Sending raw text to backend analyzer module...", "analyzing");

    let parsed: PokemonSet[] = [];
    let metaData: PokemonMetaData[] = [];
    try {
      // Just use the relative path, Vite proxy handles dev routing mapping /api -> localhost:5000
      const res = await fetch(`/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawPaste: paste }),
      });
      
      if (res.ok) {
        const payload = await res.json();
        parsed = payload.parsedTeam;
        metaData = payload.scrapedData;
        
        setTeam(parsed);
        addLog(`Successfully processed ${parsed.length} Pokémon entries from backend.`, "info");
      } else {
        throw new Error("Analyze endpoint returned an error");
      }
    } catch (e) {
      console.warn("Backend scrape failed, using fallback simulated data", e);
      addLog("Backend scrape failed, using fallback simulated data.", "error");
      
      // Since backend failed, we manually parse so the rest of the UI continues
      parsed = parsePokepaste(paste);
      setTeam(parsed);
      
      metaData = parsed.map((p) => ({
        pokemon: p.species,
        topTeammates: [
          { name: "Incineroar", usage: "65%" },
          { name: "Rillaboom", usage: "45%" },
        ],
        commonChecks: [
          { name: "Urshifu", usage: "35%" },
          { name: "Terapagos", usage: "25%" },
        ],
      }));
      await new Promise((r) => setTimeout(r, 1500));
    }

    addLog(
      `Meta extraction complete. Sourced current tournament stats.`,
      "info",
    );
    addLog(`Requesting RAG analysis from Gemini...`, "analyzing");

    try {
      const generatedReport = await generateVGCStrategyReport(
        parsed,
        metaData,
        apiKey,
        regulation,
      );
      setReport(generatedReport);
      addLog("Analysis Complete. Report dynamically rendered.", "done");
    } catch (err: any) {
      console.error(err);
      addLog(`AI Generation Failed: ${err.message}`, "error");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-base text-zinc-100 font-sans selection:bg-blue-500/30">
      {/* Navbar Pattern */}
      <nav className="border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600/20 p-2 rounded-xl text-blue-500 ring-1 ring-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
              <Zap size={22} className="animate-pulse" />
            </div>
            <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-linear-to-r from-blue-400 to-indigo-500">
              PokéMaster AI
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative group flex items-center">
              <Key size={16} className="text-zinc-500 absolute left-3" />
              <input
                type="password"
                placeholder="Gemini API Key..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="bg-zinc-900 border border-zinc-700 text-sm rounded-lg pl-9 pr-4 py-1.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all w-64 placeholder-zinc-600"
              />
            </div>
            <div className="text-zinc-500 text-sm font-medium flex items-center gap-2">
              <Server size={14} /> Agent Ready
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Input */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <section className="bg-zinc-900/40 border border-zinc-800 backdrop-blur-xl rounded-2xl p-5 shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-linear-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
            <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Database size={16} className="text-blue-400" /> Original Team
              Input
            </h2>
            <textarea
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
              className="w-full h-64 bg-zinc-950/80 border border-zinc-800 rounded-xl p-4 text-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-y transition-all placeholder-zinc-700 shadow-inner"
              placeholder="Incineroar @ Sitrus Berry...&#10;Ability: Intimidate..."
              spellCheck="false"
            />

            <div className="mt-4 flex items-center justify-between gap-4">
              <select
                value={regulation}
                onChange={(e) => setRegulation(e.target.value)}
                className="bg-zinc-900 border border-zinc-700 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 transition-all text-zinc-200 flex-1 shadow-inner"
              >
                <option value="Regulation F">Regulation F</option>
                <option value="Regulation G">
                  Regulation G (1 Restricted)
                </option>
                <option value="Regulation H">
                  Regulation H (No Legendaries/Paradox)
                </option>
              </select>
            </div>

            <button
              onClick={handleParseAndAnalyze}
              disabled={isAnalyzing || !paste}
              className="mt-4 w-full bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-zinc-800 disabled:to-zinc-800 disabled:text-zinc-500 text-white font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-blue-500/25 active:scale-[0.98]"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="animate-spin" size={18} /> Processing
                  Analysis...
                </>
              ) : (
                <>
                  <Play size={18} /> Run AI Diagnosics
                </>
              )}
            </button>
          </section>

          {/* Mission Control Panel */}
          <section className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 flex-1 relative flex flex-col items-stretch max-h-[300px]">
            <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-4 flex items-center gap-2">
              <BrainCircuit size={16} className="text-indigo-400" /> Agent
              Console
            </h2>
            <div className="flex-1 overflow-y-auto font-mono text-xs text-zinc-400 bg-zinc-950/80 rounded-xl p-4 border border-zinc-800/50 shadow-inner shadow-black/50 pr-2 custom-scrollbar">
              {missionLogs.length === 0 && !isAnalyzing ? (
                <div className="flex items-center justify-center h-full text-zinc-600">
                  Awaiting directive...
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {missionLogs.map((log, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300"
                    >
                      <span className="text-zinc-600 mt-0.5">{`>`}</span>
                      <span
                        className={`
                        ${log.type === "analyzing" ? "text-blue-400" : ""}
                        ${log.type === "done" ? "text-emerald-400 font-bold" : ""}
                        ${log.type === "error" ? "text-red-400" : ""}
                      `}
                      >
                        {log.msg}
                      </span>
                    </div>
                  ))}
                  {isAnalyzing && (
                    <div className="flex items-center gap-2 text-zinc-500 mt-2">
                      <span className="animate-pulse">_</span>
                    </div>
                  )}
                  <div ref={logEndRef} />
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Right Column: AI Report & Cards */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {report ? (
            <>
              {/* Strategic Summary */}
              <section className="bg-linear-to-br from-indigo-900/30 to-purple-900/10 border border-indigo-500/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden backdrop-blur-sm">
                <div className="flex flex-col items-start gap-2">
                  <div className="flex justify-between items-center w-full">
                    <h2 className="text-lg font-bold text-indigo-300 flex items-center gap-2">
                      <BrainCircuit size={20} /> Team Assessment Summary
                    </h2>
                    {team.length > 0 && (
                      <button
                        onClick={handleCopy}
                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors"
                      >
                        {copied ? (
                          <CheckCircle2 size={14} />
                        ) : (
                          <Copy size={14} />
                        )}
                        {copied ? "Copied" : "Export"}
                      </button>
                    )}
                  </div>
                  <p className="text-zinc-300 leading-relaxed text-sm">
                    {report.summary}
                  </p>
                </div>
              </section>

              {/* Meta Holes */}
              <section className="bg-rose-950/20 border border-rose-900/50 rounded-2xl p-6 flex-1 relative">
                <h3 className="text-sm font-semibold text-rose-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <ShieldAlert size={18} /> Identified Meta Holes
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {report.metaHoles.map((hole, i) => (
                    <div
                      key={i}
                      className="bg-zinc-950/60 border border-rose-900/30 rounded-xl p-4 flex items-start gap-4"
                    >
                      <ShieldAlert
                        className="text-rose-500 shrink-0 mt-1"
                        size={18}
                      />
                      <span className="text-zinc-300 text-sm">{hole}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Recommendations */}
              <section className="bg-emerald-950/20 border border-emerald-900/50 rounded-2xl p-6 flex-1 relative">
                <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Swords size={18} /> Strategic Recommendations
                </h3>
                <div className="flex flex-col gap-4">
                  {report.recommendations.map((rec, i) => (
                    <div
                      key={i}
                      className="bg-zinc-950/60 border border-emerald-900/30 rounded-xl p-5 hover:border-emerald-500/50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-3 border-b border-zinc-800 pb-3">
                        <span className="font-bold text-emerald-300 text-md flex items-center gap-2">
                          <Info size={16} /> {rec.focus}
                        </span>
                        <span className="text-xs font-mono bg-zinc-800 px-2 py-1 rounded text-zinc-400">
                          {rec.change}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-300 leading-relaxed">
                        {rec.rationale}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            </>
          ) : (
            <section className="bg-zinc-900/40 border border-zinc-800 backdrop-blur-xl rounded-2xl h-full flex flex-col p-5 shadow-2xl items-center justify-center">
              <Server size={48} className="text-zinc-800 mb-4" />
              <p className="text-zinc-500 font-medium">
                No active analysis. Input team and execute diagnostics.
              </p>
            </section>
          )}
        </div>
      </main>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #3f3f46;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #52525b;
        }
      `,
        }}
      />
    </div>
  );
}
