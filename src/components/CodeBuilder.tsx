import React, { useState, useMemo } from 'react';
import { ArrowLeft, Code2, Sparkles, Loader2, Download, FileCode, Eye, Code, Smartphone, Monitor, Plus } from 'lucide-react';
import { generateCode } from '../services/gemini';
import { cn } from '../lib/utils';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodeBuilderProps {
  onBack: () => void;
  darkMode: boolean;
}

interface GeneratedApp {
  files: Record<string, string>;
  mainFile: string;
  description: string;
}

export default function CodeBuilder({ onBack, darkMode }: CodeBuilderProps) {
  const [input, setInput] = useState('');
  const [appData, setAppData] = useState<GeneratedApp | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');

  const handleGenerate = async () => {
    if (!input.trim() || isGenerating) return;

    setIsGenerating(true);
    try {
      const data = await generateCode(input);
      if (!data || !data.files) throw new Error("Invalid response from AI");
      setAppData(data);
      setSelectedFile(data.mainFile || Object.keys(data.files)[0]);
    } catch (error: any) {
      console.error("Code Builder Error:", error);
      alert("Failed to build app: " + (error.message || "Please check your network."));
    } finally {
      setIsGenerating(false);
    }
  };

  const previewContent = useMemo(() => {
    if (!appData) return '';
    
    const html = appData.files['index.html'] || '<html><body><h1>No index.html found</h1></body></html>';
    const css = appData.files['styles.css'] || '';
    const js = appData.files['script.js'] || '';

    // Inject CSS and JS into HTML
    let content = html;
    if (css) {
      content = content.replace('</head>', `<style>${css}</style></head>`);
    }
    if (js) {
      content = content.replace('</body>', `<script>${js}</script></body>`);
    }

    // Add Tailwind CDN if not present and structural fixes
    if (!content.includes('tailwindcss')) {
      content = content.replace('<head>', '<head><script src="https://cdn.tailwindcss.com"></script>');
    }

    return content;
  }, [appData]);

  const downloadFile = (name: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={cn(
      "h-screen flex flex-col",
      darkMode ? "bg-zinc-950 text-white" : "bg-zinc-50 text-zinc-900"
    )}>
      {/* Header */}
      <header className={cn(
        "h-16 flex items-center justify-between px-6 border-b shrink-0 z-20",
        darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"
      )}>
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-zinc-800 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-zinc-400 hover:text-white" />
          </button>
          <div className="flex items-center gap-2">
            <Code2 className="w-6 h-6 text-amber-500" />
            <h1 className="text-lg font-bold">Fluxion Builder</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {appData && (
            <div className="flex items-center bg-zinc-800/50 rounded-xl p-1 border border-zinc-700/50">
              <button
                onClick={() => setPreviewMode('desktop')}
                className={cn(
                  "p-1.5 rounded-lg transition-all",
                  previewMode === 'desktop' ? "bg-amber-500 text-black shadow-lg" : "text-zinc-500 hover:text-white"
                )}
                title="Desktop View"
              >
                <Monitor className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPreviewMode('mobile')}
                className={cn(
                  "p-1.5 rounded-lg transition-all",
                  previewMode === 'mobile' ? "bg-amber-500 text-black shadow-lg" : "text-zinc-500 hover:text-white"
                )}
                title="Mobile View"
              >
                <Smartphone className="w-4 h-4" />
              </button>
            </div>
          )}
          <button 
            onClick={() => { setAppData(null); setInput(''); }}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-xs font-bold transition-all border border-zinc-700/50"
          >
            <Plus className="w-3.5 h-3.5" /> NEW
          </button>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 overflow-hidden relative">
        {!appData ? (
          <div className="absolute inset-0 flex items-center justify-center p-6 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.05),transparent)]">
            <div className={cn(
              "w-full max-w-2xl p-10 rounded-[3rem] border border-zinc-800 shadow-2xl relative overflow-hidden group",
              darkMode ? "bg-zinc-900/50" : "bg-white"
            )}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-[64px] rounded-full -mr-16 -mt-16 group-hover:bg-amber-500/20 transition-all duration-500" />
              
              <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-amber-500/10 rounded-2xl">
                  <Sparkles className="w-8 h-8 text-amber-500" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold tracking-tighter">Fluxion Builder</h2>
                  <p className="text-zinc-500 text-sm">Build full-stack web apps in seconds</p>
                </div>
              </div>

              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Describe your app vision... (e.g., A sleek crypto dashboard with live market updates)"
                className="w-full bg-transparent border-none focus:ring-0 text-xl resize-none min-h-[160px] mb-8 placeholder:text-zinc-700 font-medium"
              />

              <button
                onClick={handleGenerate}
                disabled={!input.trim() || isGenerating}
                className={cn(
                  "w-full py-5 rounded-2xl font-black flex items-center justify-center gap-3 transition-all text-lg uppercase tracking-widest",
                  input.trim() && !isGenerating 
                    ? "bg-amber-500 text-black shadow-xl shadow-amber-500/20 hover:shadow-amber-500/40 hover:scale-[1.01] active:scale-95" 
                    : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                )}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Assembling codebase...
                  </>
                ) : (
                  <>
                    <Code2 className="w-6 h-6" />
                    Generate Application
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col lg:flex-row divide-x divide-zinc-800 transition-all">
            {/* Sidebar */}
            <div className="w-full lg:w-64 bg-zinc-950 flex flex-col shrink-0">
              <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-black/20">
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2">
                  <FileCode className="w-3.5 h-3.5" /> Project Files
                </span>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {Object.keys(appData.files).map(fileName => (
                  <button
                    key={fileName}
                    onClick={() => setSelectedFile(fileName)}
                    className={cn(
                      "w-full flex items-center gap-2 p-3 rounded-xl transition-all text-xs group text-left",
                      selectedFile === fileName 
                        ? "bg-amber-500/10 text-amber-500 font-bold" 
                        : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200"
                    )}
                  >
                    <FileCode className={cn("w-3.5 h-3.5 shrink-0", selectedFile === fileName ? "text-amber-500" : "text-zinc-700")} />
                    <span className="truncate flex-1">{fileName}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 flex flex-col bg-[#0d1117] min-h-0 border-r border-zinc-800 overflow-hidden">
               <div className="h-10 px-4 flex items-center justify-between border-b border-zinc-800 bg-black/30 backdrop-blur-md">
                 <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                   <span className="text-amber-500/40">src /</span> {selectedFile}
                 </div>
                 <button 
                  onClick={() => selectedFile && downloadFile(selectedFile, appData.files[selectedFile])}
                  className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-white transition-all active:scale-90"
                 >
                   <Download className="w-3.5 h-3.5" />
                 </button>
               </div>
               <div className="flex-1 overflow-auto custom-scrollbar bg-transparent">
                  {selectedFile && (
                    <SyntaxHighlighter
                      language={selectedFile.split('.').pop() || 'html'}
                      style={atomDark}
                      customStyle={{
                        margin: 0,
                        padding: '2rem',
                        fontSize: '13px',
                        backgroundColor: 'transparent',
                        fontFamily: '"JetBrains Mono", monospace'
                      }}
                    >
                      {appData.files[selectedFile] || ''}
                    </SyntaxHighlighter>
                  )}
               </div>
            </div>

            {/* Preview Panel */}
            <div className={cn(
              "flex flex-col bg-zinc-900 relative transition-all duration-500",
              previewMode === 'mobile' ? "w-full lg:w-[380px]" : "w-full lg:w-1/2"
            )}>
              <div className="h-10 px-4 flex items-center justify-between border-b border-zinc-800 bg-black/30 backdrop-blur-md z-10">
                <div className="flex items-center gap-2 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                  <Eye className="w-3.5 h-3.5" /> Deployment Live
                </div>
                <div className="flex items-center gap-2">
                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                   <span className="text-[10px] text-zinc-600 font-mono">200 OK</span>
                </div>
              </div>
              <div className={cn(
                "flex-1 bg-white relative overflow-hidden transition-all duration-300",
                previewMode === 'mobile' ? "mx-auto w-[360px] h-[640px] my-auto rounded-[3rem] border-[12px] border-zinc-950 shadow-2xl" : "w-full h-full"
              )}>
                <iframe
                  srcDoc={previewContent}
                  className="w-full h-full border-none"
                  title="App Preview"
                  sandbox="allow-scripts"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
