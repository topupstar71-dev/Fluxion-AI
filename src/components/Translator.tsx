import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Languages, ArrowRightLeft, Loader2, Copy, Check, Search, Star } from 'lucide-react';
import { chatWithAI } from '../services/gemini';
import { cn } from '../lib/utils';

const LANGUAGES = [
  { code: 'bn', name: 'Bengali' },
  { code: 'en', name: 'English' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ru', name: 'Russian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'it', name: 'Italian' },
  { code: 'tr', name: 'Turkish' },
  { code: 'ur', name: 'Urdu' },
  { code: 'fa', name: 'Persian' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'th', name: 'Thai' },
  { code: 'id', name: 'Indonesian' },
  { code: 'ms', name: 'Malay' },
];

export default function Translator({ onBack, darkMode }: { onBack: () => void, darkMode?: boolean }) {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [sourceLang, setSourceLang] = useState('en');
  const [targetLang, setTargetLang] = useState('bn');
  const [copied, setCopied] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [frequentLangs, setFrequentLangs] = useState<string[]>(['en', 'bn']);
  const [isLangModalOpen, setIsLangModalOpen] = useState<'source' | 'target' | null>(null);

  const handleTranslate = async () => {
    if (!input.trim()) return;
    setIsTranslating(true);
    try {
      const sourceName = LANGUAGES.find(l => l.code === sourceLang)?.name;
      const targetName = LANGUAGES.find(l => l.code === targetLang)?.name;
      const prompt = `Translate the following ${sourceName} text to ${targetName}: "${input}"`;
      
      const response = await chatWithAI(prompt, [], false);
      setOutput(response);
      
      // Update frequent languages
      setFrequentLangs(prev => {
        const newFreq = [sourceLang, targetLang, ...prev.filter(l => l !== sourceLang && l !== targetLang)];
        return newFreq.slice(0, 5);
      });
    } catch (error) {
      console.error('Translation error:', error);
      setOutput('Error: Failed to translate. Please try again.');
    } finally {
      setIsTranslating(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (input.trim()) handleTranslate();
    }, 1000);
    return () => clearTimeout(timer);
  }, [input, sourceLang, targetLang]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredLanguages = LANGUAGES.filter(l => 
    l.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    l.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedLanguages = [
    ...LANGUAGES.filter(l => frequentLangs.includes(l.code)),
    ...LANGUAGES.filter(l => !frequentLangs.includes(l.code))
  ];

  const finalLanguages = searchTerm ? filteredLanguages : sortedLanguages;

  return (
    <div className={cn("p-4 sm:p-8 pb-24 lg:pb-8 h-full overflow-y-auto transition-colors duration-300", darkMode ? "bg-[#050505] text-white" : "bg-zinc-50 text-zinc-900")}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-12">
          <button onClick={onBack} className={cn("p-2 rounded-full transition-colors", darkMode ? "hover:bg-zinc-800" : "hover:bg-zinc-200")}>
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Languages className="text-indigo-500" /> AI Translator
          </h1>
        </div>

        <div className="flex flex-col gap-6">
          {/* Language Selectors */}
          <div className={cn("flex items-center justify-between border p-2 rounded-2xl transition-all", darkMode ? "bg-zinc-900/50 border-zinc-800" : "bg-white border-zinc-200 shadow-sm")}>
            <button 
              onClick={() => setIsLangModalOpen('source')}
              className={cn("flex-1 py-3 px-4 rounded-xl transition-all text-left flex items-center justify-between", darkMode ? "hover:bg-zinc-800" : "hover:bg-zinc-100")}
            >
              <span className="font-bold">{LANGUAGES.find(l => l.code === sourceLang)?.name}</span>
              <Star className={cn("w-4 h-4", frequentLangs.includes(sourceLang) ? "text-amber-500 fill-amber-500" : "text-zinc-600")} />
            </button>
            
            <button 
              onClick={() => {
                const temp = sourceLang;
                setSourceLang(targetLang);
                setTargetLang(temp);
                setInput(output);
                setOutput(input);
              }}
              className={cn("p-3 rounded-full transition-colors text-indigo-500", darkMode ? "hover:bg-zinc-800" : "hover:bg-zinc-100")}
            >
              <ArrowRightLeft className="w-5 h-5" />
            </button>

            <button 
              onClick={() => setIsLangModalOpen('target')}
              className={cn("flex-1 py-3 px-4 rounded-xl transition-all text-left flex items-center justify-between", darkMode ? "hover:bg-zinc-800" : "hover:bg-zinc-100")}
            >
              <span className="font-bold">{LANGUAGES.find(l => l.code === targetLang)?.name}</span>
              <Star className={cn("w-4 h-4", frequentLangs.includes(targetLang) ? "text-amber-500 fill-amber-500" : "text-zinc-600")} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Input Section */}
            <div className="space-y-4">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type text here..."
                className={cn("w-full h-64 border rounded-3xl p-6 text-lg focus:outline-none focus:border-indigo-500 transition-all resize-none", darkMode ? "bg-zinc-900/30 border-zinc-800 text-white" : "bg-white border-zinc-200 text-zinc-900 shadow-sm")}
              />
            </div>

            {/* Output Section */}
            <div className="space-y-4 relative">
              <div className={cn("w-full h-64 border rounded-3xl p-6 text-lg overflow-y-auto relative transition-all", darkMode ? "bg-zinc-900/30 border-zinc-800" : "bg-white border-zinc-200 shadow-sm")}>
                {isTranslating ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                  </div>
                ) : (
                  <p className={cn(!output && "text-zinc-600 italic")}>
                    {output || "Translation will appear here..."}
                  </p>
                )}
              </div>
              {output && (
                <button 
                  onClick={copyToClipboard} 
                  className={cn("absolute bottom-4 right-4 p-3 rounded-xl transition-all text-zinc-400 hover:text-white", darkMode ? "bg-zinc-800 hover:bg-zinc-700" : "bg-zinc-100 hover:bg-zinc-200")}
                >
                  {copied ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Language Selection Modal */}
        <AnimatePresence>
          {isLangModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsLangModalOpen(null)}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className={cn("relative w-full max-w-lg border rounded-3xl overflow-hidden shadow-2xl transition-all", darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200")}
              >
                <div className={cn("p-6 border-b", darkMode ? "border-zinc-800" : "border-zinc-100")}>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                    <input 
                      type="text"
                      autoFocus
                      placeholder="Search language..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className={cn("w-full border-none rounded-2xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-indigo-500 transition-all", darkMode ? "bg-zinc-800 text-white" : "bg-zinc-100 text-zinc-900")}
                    />
                  </div>
                </div>
                <div className="max-h-[60vh] overflow-y-auto p-2 grid grid-cols-2 gap-1">
                  {finalLanguages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        if (isLangModalOpen === 'source') setSourceLang(lang.code);
                        else setTargetLang(lang.code);
                        setIsLangModalOpen(null);
                        setSearchTerm('');
                      }}
                      className={cn(
                        "flex items-center justify-between px-4 py-3 rounded-xl transition-all text-left",
                        (isLangModalOpen === 'source' ? sourceLang === lang.code : targetLang === lang.code)
                          ? "bg-indigo-600 text-white"
                          : darkMode ? "hover:bg-zinc-800 text-zinc-400 hover:text-white" : "hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900"
                      )}
                    >
                      <span className="font-medium">{lang.name}</span>
                      {frequentLangs.includes(lang.code) && <Star className="w-3 h-3 text-amber-500 fill-amber-500" />}
                    </button>
                  ))}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
