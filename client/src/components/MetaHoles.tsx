import { ShieldAlert } from "lucide-react";
import { formatMarkdown } from "../utils";

interface MetaHolesProps {
  holes: string[];
}

export default function MetaHoles({ holes }: MetaHolesProps) {
  return (
    <section className="bg-rose-950/20 border border-rose-900/50 rounded-2xl p-6 flex-1 relative">
      <h3 className="text-sm font-semibold text-rose-400 uppercase tracking-wider mb-4 flex items-center gap-2">
        <ShieldAlert size={18} /> Identified Meta Holes
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {holes.map((hole, i) => (
          <div
            key={i}
            className="bg-zinc-950/60 border border-rose-900/30 rounded-xl p-4 flex items-start gap-4"
          >
            <ShieldAlert className="text-rose-500 shrink-0 mt-1" size={18} />
            <span className="text-zinc-300 text-sm">{formatMarkdown(hole)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
