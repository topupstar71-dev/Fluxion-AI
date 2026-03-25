import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Code, 
  Play, 
  Download, 
  Copy, 
  ArrowLeft, 
  Sparkles, 
  Loader2,
  Save,
  Monitor,
  Smartphone
} from 'lucide-react';
import { generateCode } from '../services/gemini';
import { useAuth } from '../lib/AuthContext';

import { cn } from '../lib/utils';

export default function AIBuilder({ onBack, darkMode, initialProject }: { onBack: () => void, darkMode?: boolean, initialProject?: any }) {
  const { useCredit, profile } = useAuth();
  const [prompt, setPrompt] = useState(initialProject?.prompt || '');
  const [files, setFiles] = useState<Record<string, string>>(initialProject?.files || {});
  const [activeFile, setActiveFile] = useState<string>(initialProject?.entryFile || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [view, setView] = useState<'preview' | 'code'>('preview');
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { saveProject } = useAuth();

  useEffect(() => {
    if (initialProject) {
      setPrompt(initialProject.prompt || '');
      setFiles(initialProject.files || {});
      setActiveFile(initialProject.entryFile || Object.keys(initialProject.files || {})[0] || '');
    }
  }, [initialProject]);

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;
    
    if (profile?.credits === 0) {
      alert("Upgrade your plan! You have 0 credits.");
      return;
    }

    setIsGenerating(true);
    try {
      const isGame = prompt.toLowerCase().includes('game');
      const { generateCode, generateGame } = await import('../services/gemini');
      const result = isGame ? await generateGame(prompt) : await generateCode(prompt);
      
      let generatedFiles: Record<string, string> = {};
      let mainFile = 'index.html';

      if (typeof result === 'object' && result.files) {
        generatedFiles = result.files;
        mainFile = result.mainFile || 'index.html';
      } else {
        // Fallback for single string response
        generatedFiles = { 'index.html': result };
      }

      // Calculate actual cost: 1 credit per 10 lines across all files (more fair for multi-file)
      const totalLines = Object.values(generatedFiles).reduce((acc, content) => acc + content.split('\n').length, 0);
      const actualCost = Math.max(1, Math.floor(totalLines / 10));
      
      const success = await useCredit(actualCost);
      if (!success) {
        setIsGenerating(false);
        return;
      }

      setFiles(generatedFiles);
      setActiveFile(mainFile);
      setView('preview');

      // Auto-save project to history
      try {
        const projectName = prompt.slice(0, 30) || 'New Project';
        await saveProject(projectName, generatedFiles, mainFile, prompt);
        console.log('Project auto-saved to history');
      } catch (saveError) {
        console.error('Auto-save failed:', saveError);
      }
    } catch (error: any) {
      console.error('Generation error:', error);
      alert(`Failed to generate code: ${error.message || 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const getBundledCode = () => {
    if (!files['index.html']) return '';
    
    let html = files['index.html'];
    
    // Inject CSS
    if (files['styles.css']) {
      const styleTag = `<style>\n${files['styles.css']}\n</style>`;
      if (html.includes('</head>')) {
        html = html.replace('</head>', `${styleTag}\n</head>`);
      } else {
        html = styleTag + html;
      }
    }

    // Inject JS
    if (files['script.js'] || files['game.js']) {
      const jsContent = files['script.js'] || files['game.js'];
      const scriptTag = `<script>\n${jsContent}\n</script>`;
      if (html.includes('</body>')) {
        html = html.replace('</body>', `${scriptTag}\n</body>`);
      } else {
        html = html + scriptTag;
      }
    }

    return html;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(files[activeFile] || '');
    alert('File content copied to clipboard!');
  };

  const handleDownload = () => {
    const zipContent = Object.entries(files).map(([name, content]) => `--- ${name} ---\n${content}`).join('\n\n');
    const blob = new Blob([zipContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'project-files.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSave = async () => {
    if (Object.keys(files).length === 0 || isSaving) return;
    setIsSaving(true);
    try {
      const projectName = prompt.slice(0, 30) || 'New Project';
      await saveProject(projectName, files, 'index.html', prompt);
      alert('Project saved successfully to your history!');
    } catch (error: any) {
      alert('Failed to save project: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={cn(
      "min-h-screen flex flex-col transition-colors duration-300", 
      darkMode ? "bg-[#050505] text-white" : "bg-zinc-50 text-zinc-900",
      isFullScreen && "fixed inset-0 z-[100]"
    )}>
      {/* Header */}
      <header className={cn("h-16 border-b flex items-center justify-between px-6 backdrop-blur-md transition-all", darkMode ? "bg-zinc-950/50 border-zinc-800" : "bg-white/80 border-zinc-200 shadow-sm")}>
        <div className="flex items-center gap-4">
          {!isFullScreen && (
            <button onClick={onBack} className={cn("p-2 rounded-full transition-colors", darkMode ? "hover:bg-zinc-800" : "hover:bg-zinc-200")}>
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            <h1 className="text-xl font-bold">AI Project Builder</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isFullScreen && (
            <div className={cn("px-3 py-1.5 rounded-full border text-xs font-bold transition-all", darkMode ? "bg-zinc-900 border-zinc-800 text-zinc-400" : "bg-zinc-100 border-zinc-200 text-zinc-600")}>
              Credits: <span className="text-indigo-400">{profile?.credits}</span>
            </div>
          )}
          <button 
            onClick={() => setIsFullScreen(!isFullScreen)}
            className={cn("p-2 rounded-lg transition-colors", darkMode ? "hover:bg-zinc-800" : "hover:bg-zinc-200")}
            title="Toggle Full Screen"
          >
            <Monitor className="w-5 h-5" />
          </button>
          <button 
            onClick={handleSave}
            disabled={Object.keys(files).length === 0 || isSaving}
            className={cn("p-2 rounded-lg disabled:opacity-50 transition-colors", darkMode ? "hover:bg-zinc-800" : "hover:bg-zinc-200")}
            title="Save Project to History"
          >
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          </button>
          <button 
            onClick={handleDownload}
            disabled={Object.keys(files).length === 0}
            className={cn("p-2 rounded-lg disabled:opacity-50 transition-colors", darkMode ? "hover:bg-zinc-800" : "hover:bg-zinc-200")}
            title="Download All Files"
          >
            <Download className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Panel: Prompt & File Explorer */}
        {!isFullScreen && (
          <div className={cn("w-full lg:w-1/3 border-b lg:border-b-0 lg:border-r flex flex-col p-4 lg:p-6 shrink-0 transition-all", darkMode ? "bg-zinc-950/30 border-zinc-800" : "bg-white border-zinc-200")}>
            <div className="mb-6">
              <label className="text-xs font-bold text-zinc-500 mb-2 uppercase tracking-widest block">Prompt</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the web app... (e.g., 'Modern todo list with local storage')"
                className={cn("w-full h-32 border rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all mb-4", darkMode ? "bg-zinc-900/50 border-zinc-800 text-white" : "bg-zinc-50 border-zinc-200 text-zinc-900")}
              />
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-indigo-600/20"
              >
                {isGenerating ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Building...</>
                ) : (
                  <><Sparkles className="w-5 h-5" /> Build Project</>
                )}
              </button>
            </div>

            {Object.keys(files).length > 0 && (
              <div className="flex-1 flex flex-col min-h-0">
                <label className="text-xs font-bold text-zinc-500 mb-2 uppercase tracking-widest block">Project Files</label>
                <div className="flex-1 overflow-y-auto space-y-1 pr-2">
                  {Object.keys(files).map((filename) => (
                    <button
                      key={filename}
                      onClick={() => {
                        setActiveFile(filename);
                        setView('code');
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all text-left",
                        activeFile === filename 
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20" 
                          : darkMode ? "hover:bg-zinc-900 text-zinc-400" : "hover:bg-zinc-100 text-zinc-600"
                      )}
                    >
                      <Code className="w-4 h-4 shrink-0" />
                      <span className="truncate">{filename}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Right Panel: Preview / Code */}
        <div className={cn("flex-1 flex flex-col relative min-h-0 transition-colors duration-300", darkMode ? "bg-black" : "bg-zinc-100")}>
          <div className={cn("absolute top-4 right-4 z-10 flex items-center gap-2 backdrop-blur-md p-1 rounded-xl border transition-all", darkMode ? "bg-zinc-900/80 border-zinc-800" : "bg-white/80 border-zinc-200 shadow-sm")}>
            <button 
              onClick={() => setView('preview')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${view === 'preview' ? 'bg-indigo-600 text-white' : 'text-zinc-500 hover:text-white'}`}
            >
              <Play className="w-4 h-4" /> Preview
            </button>
            <button 
              onClick={() => setView('code')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${view === 'code' ? 'bg-indigo-600 text-white' : 'text-zinc-500 hover:text-white'}`}
            >
              <Code className="w-4 h-4" /> Code
            </button>
          </div>

          {view === 'preview' && Object.keys(files).length > 0 && (
            <div className={cn("absolute top-4 left-4 z-10 flex items-center gap-1 backdrop-blur-md p-1 rounded-xl border transition-all", darkMode ? "bg-zinc-900/80 border-zinc-800" : "bg-white/80 border-zinc-200 shadow-sm")}>
              <button 
                onClick={() => setDevice('desktop')}
                className={`p-2 rounded-lg transition-all ${device === 'desktop' ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}
              >
                <Monitor className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setDevice('mobile')}
                className={`p-2 rounded-lg transition-all ${device === 'mobile' ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}
              >
                <Smartphone className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex-1 flex items-center justify-center p-4 lg:p-8 overflow-auto">
            {view === 'preview' ? (
              <div className={cn(
                "bg-white rounded-2xl overflow-hidden shadow-2xl transition-all duration-500 shrink-0",
                device === 'mobile' ? 'w-[375px] h-[667px]' : 'w-full h-full'
              )}>
                {Object.keys(files).length > 0 ? (
                  <iframe 
                    title="Preview"
                    className="w-full h-full border-none"
                    srcDoc={getBundledCode()}
                    sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
                  />
                ) : (
                  <div className={cn("w-full h-full flex flex-col items-center justify-center transition-colors duration-300", darkMode ? "text-zinc-400 bg-zinc-900" : "text-zinc-400 bg-zinc-50")}>
                    <Monitor className="w-12 h-12 mb-4 opacity-20" />
                    <p className="text-sm">Build a project to see the preview</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full h-full flex flex-col">
                <div className={cn("flex items-center justify-between px-6 py-3 border-b", darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200")}>
                  <span className="text-xs font-mono text-zinc-500">{activeFile}</span>
                  <button onClick={handleCopy} className="text-xs font-bold text-indigo-500 hover:text-indigo-400 flex items-center gap-1">
                    <Copy className="w-3 h-3" /> Copy
                  </button>
                </div>
                <textarea
                  value={files[activeFile] || ''}
                  onChange={(e) => setFiles(prev => ({ ...prev, [activeFile]: e.target.value }))}
                  className={cn("flex-1 w-full font-mono text-xs lg:text-sm p-6 focus:outline-none resize-none transition-all", darkMode ? "bg-zinc-950 text-emerald-500" : "bg-white text-zinc-900 shadow-inner")}
                  placeholder="Select a file to view code..."
                />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
