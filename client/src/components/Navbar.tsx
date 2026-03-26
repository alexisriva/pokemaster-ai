import { Key, Server } from "lucide-react";

interface NavbarProps {
  apiKey: string;
  onApiKeyChange: (key: string) => void;
}

export default function Navbar({ apiKey, onApiKeyChange }: NavbarProps) {
  return (
    <nav className="border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img
            src="/pokemaster-ai-logo.png"
            alt="PokéMaster AI logo"
            className="h-10 w-12 rounded-xl"
          />
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
              onChange={(e) => onApiKeyChange(e.target.value)}
              className="bg-zinc-900 border border-zinc-700 text-sm rounded-lg pl-9 pr-4 py-1.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all w-64 placeholder-zinc-600"
            />
          </div>
          <div className="text-zinc-500 text-sm font-medium flex items-center gap-2">
            <Server size={14} /> Agent Ready
          </div>
        </div>
      </div>
    </nav>
  );
}
