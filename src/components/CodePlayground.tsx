import React, { useState, useEffect } from 'react';
import { apiRequest } from '../services/apiClient.ts';
import {
  Terminal,
  Play,
  RefreshCw,
  Clock,
  Cpu,
  Code2,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';

interface LanguageOption {
  key: string;
  name: string;
  extension: string;
  sampleCode: string;
}

export const CodePlayground: React.FC = () => {
  const [languages, setLanguages] = useState<LanguageOption[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('python');
  const [code, setCode] = useState<string>('');
  const [stdin, setStdin] = useState<string>('');
  const [running, setRunning] = useState<boolean>(false);
  const [result, setResult] = useState<any>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [compilerConfigured, setCompilerConfigured] = useState<boolean>(true);

  useEffect(() => {
    const fetchLanguages = async () => {
      try {
        const data = await apiRequest<{ configured: boolean; languages: LanguageOption[] }>('/api/compiler/languages');
        setLanguages(data.languages || []);
        setCompilerConfigured(data.configured);

        const defaultLang = data.languages?.find(l => l.key === 'python') || data.languages?.[0];
        if (defaultLang) {
          setSelectedLanguage(defaultLang.key);
          setCode(defaultLang.sampleCode);
        }
      } catch (err) {
        console.error('Failed to load compiler languages:', err);
      }
    };

    fetchLanguages();
  }, []);

  const handleLanguageChange = (langKey: string) => {
    setSelectedLanguage(langKey);
    const lang = languages.find(l => l.key === langKey);
    if (lang) {
      setCode(lang.sampleCode);
    }
    setResult(null);
    setErrorNotice(null);
  };

  const handleResetCode = () => {
    const lang = languages.find(l => l.key === selectedLanguage);
    if (lang) {
      setCode(lang.sampleCode);
    }
  };

  const handleExecute = async () => {
    setRunning(true);
    setResult(null);
    setErrorNotice(null);

    try {
      const data = await apiRequest('/api/compiler/execute', {
        method: 'POST',
        body: JSON.stringify({
          language: selectedLanguage,
          source_code: code,
          stdin,
        }),
      });
      setResult(data);
    } catch (err: any) {
      setErrorNotice(err.message || 'Execution failed');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Terminal className="h-5 w-5 text-[#a78bfa]" />
            <h1 className="text-xl font-bold text-white">Online Compiler Sandbox</h1>
          </div>
          <p className="mt-1 text-xs text-[#a1a1aa]">
            Execute Python, JavaScript, C, C++, and Java in an isolated Judge0 sandbox.
          </p>
        </div>

        {/* Language selector & Actions */}
        <div className="flex items-center gap-2">
          <select
            value={selectedLanguage}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="rounded-lg border border-[#27272a] bg-[#18181b] px-3 py-1.5 text-xs font-mono text-white focus:border-[#a78bfa] focus:outline-none"
          >
            {languages.map((l) => (
              <option key={l.key} value={l.key}>
                {l.name}
              </option>
            ))}
          </select>

          <button
            onClick={handleResetCode}
            title="Reset code template"
            className="rounded-lg border border-[#27272a] bg-[#18181b] p-2 text-[#a1a1aa] hover:text-white"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={handleExecute}
            disabled={running}
            className="flex items-center gap-1.5 rounded-lg bg-[#6d28d9] px-4 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-[#8b5cf6] transition-colors disabled:opacity-50"
          >
            {running ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                Executing...
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 fill-current" />
                Run Code
              </>
            )}
          </button>
        </div>
      </div>

      {!compilerConfigured && (
        <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-300 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-200">Judge0 Sandboxed Compiler Not Configured</p>
            <p className="mt-1 text-[11px] text-amber-200/80 leading-relaxed">
              Code execution requests are safely handled server-side through Judge0. To execute live user code, configure <code>JUDGE0_API_URL</code> and <code>JUDGE0_API_KEY</code> in your <code>.env</code> file.
            </p>
          </div>
        </div>
      )}

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Code Editor */}
        <div className="rounded-xl border border-[#27272a] bg-[#111114] flex flex-col h-[520px] overflow-hidden">
          <div className="flex h-9 items-center justify-between border-b border-[#27272a] bg-[#18181b] px-4 text-xs font-mono text-[#a1a1aa]">
            <span className="flex items-center gap-1.5">
              <Code2 className="h-3.5 w-3.5 text-[#a78bfa]" />
              main.{selectedLanguage === 'python' ? 'py' : selectedLanguage === 'javascript' ? 'js' : selectedLanguage === 'c' ? 'c' : selectedLanguage === 'cpp' ? 'cpp' : 'java'}
            </span>
            <span className="text-[11px] text-[#71717a]">Max 64KB</span>
          </div>

          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck={false}
            className="flex-1 resize-none bg-[#09090b] p-4 font-mono text-xs text-white focus:outline-none leading-relaxed"
          />

          {/* Stdin Drawer */}
          <div className="border-t border-[#27272a] bg-[#111114] p-3">
            <label className="block text-[11px] font-mono text-[#71717a] mb-1">
              Standard Input (stdin):
            </label>
            <input
              type="text"
              value={stdin}
              onChange={(e) => setStdin(e.target.value)}
              placeholder="Arguments or lines passed to stdin..."
              className="w-full rounded border border-[#27272a] bg-[#18181b] px-2.5 py-1 text-xs font-mono text-white focus:border-[#a78bfa] focus:outline-none"
            />
          </div>
        </div>

        {/* Terminal Output */}
        <div className="rounded-xl border border-[#27272a] bg-[#111114] flex flex-col h-[520px] overflow-hidden">
          <div className="flex h-9 items-center justify-between border-b border-[#27272a] bg-[#18181b] px-4 text-xs font-mono text-[#71717a]">
            <span>OUTPUT TERMINAL</span>
            {result && (
              <div className="flex items-center gap-3 text-[11px]">
                {result.time && (
                  <span className="flex items-center gap-1 text-[#a1a1aa]">
                    <Clock className="h-3 w-3" />
                    {result.time}s
                  </span>
                )}
                {result.memory && (
                  <span className="flex items-center gap-1 text-[#a1a1aa]">
                    <Cpu className="h-3 w-3" />
                    {result.memory} KB
                  </span>
                )}
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                    result.execution_status === 'success'
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-red-500/10 text-red-400'
                  }`}
                >
                  {result.status?.description || result.execution_status}
                </span>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto bg-[#09090b] p-4 font-mono text-xs">
            {errorNotice && (
              <div className="text-amber-400 space-y-1">
                <p className="font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4" />
                  Notice:
                </p>
                <p className="text-[11px] text-[#a1a1aa]">{errorNotice}</p>
              </div>
            )}

            {result ? (
              <div className="space-y-2">
                {result.stdout && (
                  <div>
                    <span className="text-[10px] text-[#71717a] block mb-1">STDOUT:</span>
                    <pre className="text-emerald-400 whitespace-pre-wrap">{result.stdout}</pre>
                  </div>
                )}
                {result.stderr && (
                  <div>
                    <span className="text-[10px] text-red-400 block mb-1">STDERR:</span>
                    <pre className="text-red-400 whitespace-pre-wrap">{result.stderr}</pre>
                  </div>
                )}
                {result.compile_output && (
                  <div>
                    <span className="text-[10px] text-amber-400 block mb-1">COMPILATION OUTPUT:</span>
                    <pre className="text-amber-400 whitespace-pre-wrap">{result.compile_output}</pre>
                  </div>
                )}
                {!result.stdout && !result.stderr && !result.compile_output && (
                  <p className="text-[#71717a] italic">Program executed with 0 exit code and no output.</p>
                )}
              </div>
            ) : !errorNotice && (
              <p className="text-[#71717a] italic">
                Press "Run Code" to compile and execute your program.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
