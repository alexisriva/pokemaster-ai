import { useState } from "react";
import type { VGCReport, PokemonSet, LogEntry } from "../types";

export function useAnalysis() {
  const [team, setTeam] = useState<PokemonSet[]>([]);
  const [report, setReport] = useState<VGCReport | null>(null);
  const [missionLogs, setMissionLogs] = useState<LogEntry[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const addLog = (msg: string, type: LogEntry["type"] = "info") => {
    setMissionLogs((prev) => [...prev, { msg, type }]);
  };

  const run = async (paste: string, apiKey: string, regulation: string) => {
    if (!paste) return;
    if (!apiKey) {
      alert("Please provide a Gemini API Key to run the analysis engine.");
      return;
    }

    setIsAnalyzing(true);
    setMissionLogs([]);
    setTeam([]);
    setReport(null);

    addLog("Agent initialized. Authenticating Gemini...", "analyzing");
    await new Promise((r) => setTimeout(r, 800));
    addLog("Sending raw text to backend analyzer module...", "analyzing");

    try {
      const res = await fetch(`/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawPaste: paste, apiKey, regulation }),
      });

      if (!res.ok) throw new Error("Analyze endpoint returned an error");

      const reader = res.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          let doubleNewlineIdx;
          while ((doubleNewlineIdx = buffer.indexOf("\n\n")) !== -1) {
            const rawMsg = buffer.substring(0, doubleNewlineIdx);
            buffer = buffer.substring(doubleNewlineIdx + 2);

            if (rawMsg.startsWith("data: ")) {
              try {
                const data = JSON.parse(rawMsg.substring(6));
                if (data.type === "log") addLog(data.msg, data.status);
                else if (data.type === "team") setTeam(data.parsedTeam);
                else if (data.type === "result") setReport(data.report);
              } catch {
                // ignore incomplete JSON chunks
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn("Backend scrape failed", e);
      addLog(
        "Backend sequence failed! Ensure your Gemini API key is valid and the server is running.",
        "error",
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  return { team, report, missionLogs, isAnalyzing, run };
}
