import { useState } from "react";
import { BrainCircuit, AlertCircle, Copy, CheckCircle2 } from "lucide-react";
import { formatMarkdown, exportToPokepaste } from "../utils";
import type { VGCReport, PokemonSet } from "../types";

interface StrategicSummaryProps {
  report: VGCReport;
  team: PokemonSet[];
}

export default function StrategicSummary({ report, team }: StrategicSummaryProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(exportToPokepaste(team));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
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
              {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
              {copied ? "Copied" : "Export"}
            </button>
          )}
        </div>
        <p className="text-zinc-300 leading-relaxed text-sm">
          {formatMarkdown(report.summary)}
        </p>
        {report.legalityCheck && (
          <div className="mt-4 bg-amber-950/30 border border-amber-900/50 rounded-lg p-4">
            <h4 className="text-xs font-semibold text-amber-500 uppercase tracking-wider mb-2 flex items-center gap-2">
              <AlertCircle size={14} /> Legality & Format Verification
            </h4>
            <p className="text-zinc-300 text-sm italic leading-relaxed">
              {formatMarkdown(report.legalityCheck)}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
