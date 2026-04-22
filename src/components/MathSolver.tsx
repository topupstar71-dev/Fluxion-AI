import React, { useState, useRef } from 'react';
import { ArrowLeft, Calculator, Sparkles, Send, Loader2, Trash2, Image as ImageIcon, X } from 'lucide-react';
import { chatWithAI } from '../services/gemini';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { cn, compressImage } from '../lib/utils';

interface MathSolverProps {
  onBack: () => void;
  darkMode: boolean;
}

export default function MathSolver({ onBack, darkMode }: MathSolverProps) {
  const [input, setInput] = useState('');
  const [images, setImages] = useState<{ data: string, mimeType: string }[]>([]);
  const [solution, setSolution] = useState('');
  const [isSolving, setIsSolving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = async (ev) => {
          const rawBase64 = ev.target?.result as string;
          try {
            const compressedDataUrl = await compressImage(rawBase64, 1024, 1024, 0.6);
            setImages(prev => [...prev, {
              data: compressedDataUrl.split(',')[1],
              mimeType: compressedDataUrl.split(';')[0].split(':')[1]
            }]);
          } catch (err) {
            setImages(prev => [...prev, {
              data: rawBase64.split(',')[1],
              mimeType: file.type
            }]);
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleSolve = async () => {
    if ((!input.trim() && images.length === 0) || isSolving) return;

    setIsSolving(true);
    try {
      const prompt = images.length > 0 
        ? `Analyze the uploaded math problem image(s). Solve it step-by-step. Use LaTeX for all mathematical expressions. ${input ? `Additional context: ${input}` : ''}`
        : `Solve this math problem step-by-step. Use LaTeX for all mathematical expressions. Ensure the final answer is clear. Problem: ${input}`;
      
      const response = await chatWithAI(prompt, [], false, images.length > 0 ? images : undefined);
      setSolution(response);
    } catch (error) {
      console.error("Math Solver Error:", error);
    } finally {
      setIsSolving(false);
    }
  };

  return (
    <div className={cn(
      "min-h-screen p-4 sm:p-8 flex flex-col items-center",
      darkMode ? "bg-[#050505] text-white" : "bg-zinc-50 text-zinc-900"
    )}>
      <div className="max-w-4xl w-full">
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={onBack}
            className={cn(
              "p-2 rounded-full transition-colors",
              darkMode ? "hover:bg-zinc-800" : "hover:bg-zinc-200"
            )}
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Calculator className="text-indigo-500" /> Math Solver
          </h1>
        </div>

        <div className={cn(
          "p-6 rounded-3xl border mb-8",
          darkMode ? "bg-zinc-900/50 border-zinc-800" : "bg-white border-zinc-200"
        )}>
          <div className="flex items-center gap-2 mb-4 text-xs font-bold uppercase tracking-widest text-zinc-500">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            Enter your problem or upload a photo
          </div>
          
          {images.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {images.map((img, idx) => (
                <div key={idx} className="relative group">
                  <img 
                    src={`data:${img.mimeType};base64,${img.data}`} 
                    className="h-20 w-20 object-cover rounded-xl border border-zinc-700" 
                    alt="Problem" 
                  />
                  <button 
                    onClick={() => setImages(prev => prev.filter((_, i) => i !== idx))}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g., Solve for x: 2x + 5 = 15 or upload a photo of the problem"
            className="w-full bg-transparent border-none focus:ring-0 text-lg resize-none min-h-[100px]"
          />
          
          <div className="flex justify-between items-center mt-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "p-3 rounded-xl transition-all",
                darkMode ? "bg-zinc-800 text-zinc-400 hover:text-indigo-500" : "bg-zinc-100 text-zinc-500 hover:text-indigo-600"
              )}
            >
              <ImageIcon className="w-6 h-6" />
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                accept="image/*" 
                multiple 
                className="hidden" 
              />
            </button>

            <button
              onClick={handleSolve}
              disabled={(!input.trim() && images.length === 0) || isSolving}
              className={cn(
                "px-8 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all",
                (input.trim() || images.length > 0) && !isSolving 
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" 
                  : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
              )}
            >
              {isSolving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Solving...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Solve Problem
                </>
              )}
            </button>
          </div>
        </div>

        {solution && (
          <div className={cn(
            "p-8 rounded-3xl border animate-in fade-in slide-in-from-bottom-4 duration-500",
            darkMode ? "bg-zinc-900/30 border-zinc-800" : "bg-white border-zinc-200"
          )}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-500">
                <CheckCircle className="w-4 h-4" />
                Step-by-Step Solution
              </div>
              <button 
                onClick={() => setSolution('')}
                className="text-zinc-500 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
            <div className="prose prose-invert max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeKatex]}
              >
                {solution}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CheckCircle({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
