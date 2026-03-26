import { useEffect, useRef } from "react";
import { BrainCircuit } from "lucide-react";
import type { LogEntry } from "../types";

interface AgentConsoleProps {
  logs: LogEntry[];
  isAnalyzing: boolean;
}

export default function AgentConsole({ logs, isAnalyzing }: AgentConsoleProps) {
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <section className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 flex-1 relative flex flex-col items-stretch max-h-[300px]">
      <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-4 flex items-center gap-2">
        <BrainCircuit size={16} className="text-indigo-400" /> Agent Console
      </h2>
      <div className="flex-1 overflow-y-auto font-mono text-xs text-zinc-400 bg-zinc-950/80 rounded-xl p-4 border border-zinc-800/50 shadow-inner shadow-black/50 pr-2 custom-scrollbar">
        {logs.length === 0 && !isAnalyzing ? (
          <div className="flex items-center justify-center h-full text-zinc-600">
            Awaiting directive...
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {logs.map((log, i) => (
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
  );
}
