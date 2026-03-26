import { Swords, Info } from "lucide-react";
import { formatMarkdown } from "../utils";

interface Recommendation {
  focus: string;
  rationale: string;
  change: string;
}

interface RecommendationsProps {
  recommendations: Recommendation[];
}

export default function Recommendations({ recommendations }: RecommendationsProps) {
  return (
    <section className="bg-emerald-950/20 border border-emerald-900/50 rounded-2xl p-6 flex-1 relative">
      <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider mb-4 flex items-center gap-2">
        <Swords size={18} /> Strategic Recommendations
      </h3>
      <div className="flex flex-col gap-4">
        {recommendations.map((rec, i) => (
          <div
            key={i}
            className="bg-zinc-950/60 border border-emerald-900/30 rounded-xl p-5 hover:border-emerald-500/50 transition-colors"
          >
            <div className="flex items-center justify-between mb-3 border-b border-zinc-800 pb-3">
              <span className="font-bold text-emerald-300 text-md flex items-center gap-2">
                <Info size={16} /> {rec.focus}
              </span>
              <span className="text-xs font-mono bg-zinc-800 px-2 py-1 rounded text-zinc-300">
                {formatMarkdown(rec.change)}
              </span>
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed">
              {formatMarkdown(rec.rationale)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
