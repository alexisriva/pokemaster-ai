import { useState } from "react";
import Navbar from "./components/Navbar";
import TeamInput from "./components/TeamInput";
import AgentConsole from "./components/AgentConsole";
import StrategicSummary from "./components/StrategicSummary";
import MetaHoles from "./components/MetaHoles";
import Recommendations from "./components/Recommendations";
import EmptyState from "./components/EmptyState";
import { useAnalysis } from "./hooks/useAnalysis";

export default function App() {
  const [paste, setPaste] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [regulation, setRegulation] = useState("Regulation H");

  const { team, report, missionLogs, isAnalyzing, run } = useAnalysis();

  return (
    <div className="min-h-screen bg-bg-base text-zinc-100 font-sans selection:bg-blue-500/30">
      <Navbar apiKey={apiKey} onApiKeyChange={setApiKey} />

      <main className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Input */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <TeamInput
            paste={paste}
            regulation={regulation}
            isAnalyzing={isAnalyzing}
            onPasteChange={setPaste}
            onRegulationChange={setRegulation}
            onAnalyze={() => run(paste, apiKey, regulation)}
          />
          <AgentConsole logs={missionLogs} isAnalyzing={isAnalyzing} />
        </div>

        {/* Right Column: AI Report */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {report ? (
            <>
              <StrategicSummary report={report} team={team} />
              <MetaHoles holes={report.metaHoles} />
              <Recommendations recommendations={report.recommendations} />
            </>
          ) : (
            <EmptyState />
          )}
        </div>
      </main>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #52525b; }
      `,
        }}
      />
    </div>
  );
}
