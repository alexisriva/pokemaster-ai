import { Server } from "lucide-react";

export default function EmptyState() {
  return (
    <section className="bg-zinc-900/40 border border-zinc-800 backdrop-blur-xl rounded-2xl h-full flex flex-col p-5 shadow-2xl items-center justify-center">
      <Server size={48} className="text-zinc-800 mb-4" />
      <p className="text-zinc-500 font-medium">
        No active analysis. Input team and execute diagnostics.
      </p>
    </section>
  );
}
