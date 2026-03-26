import { Database, Play, RefreshCw } from "lucide-react";

interface TeamInputProps {
  paste: string;
  regulation: string;
  isAnalyzing: boolean;
  onPasteChange: (value: string) => void;
  onRegulationChange: (value: string) => void;
  onAnalyze: () => void;
}

export default function TeamInput({
  paste,
  regulation,
  isAnalyzing,
  onPasteChange,
  onRegulationChange,
  onAnalyze,
}: TeamInputProps) {
  return (
    <section className="bg-zinc-900/40 border border-zinc-800 backdrop-blur-xl rounded-2xl p-5 shadow-2xl relative overflow-hidden group">
      <div className="absolute inset-0 bg-linear-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
      <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-3 flex items-center gap-2">
        <Database size={16} className="text-blue-400" /> Original Team Input
      </h2>
      <textarea
        value={paste}
        onChange={(e) => onPasteChange(e.target.value)}
        className="w-full h-64 bg-zinc-950/80 border border-zinc-800 rounded-xl p-4 text-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-y transition-all placeholder-zinc-700 shadow-inner"
        placeholder="Incineroar @ Sitrus Berry...&#10;Ability: Intimidate..."
        spellCheck="false"
      />
      <div className="mt-4 flex items-center justify-between gap-4">
        <select
          value={regulation}
          onChange={(e) => onRegulationChange(e.target.value)}
          className="bg-zinc-900 border border-zinc-700 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 transition-all text-zinc-200 flex-1 shadow-inner"
        >
          <option value="Regulation F">Regulation F</option>
          <option value="Regulation G">Regulation G (1 Restricted)</option>
          <option value="Regulation H">
            Regulation H (No Legendaries/Paradox)
          </option>
        </select>
      </div>
      <button
        onClick={onAnalyze}
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
            <Play size={18} /> Run AI Diagnostics
          </>
        )}
      </button>
    </section>
  );
}
