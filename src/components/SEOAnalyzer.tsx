import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Search, 
  Globe, 
  BarChart2, 
  CheckCircle2, 
  AlertCircle, 
  Zap, 
  Shield, 
  Layout, 
  Smartphone,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { analyzeUrl } from '../services/gemini';
import { cn } from '../lib/utils';
import ReactMarkdown from 'react-markdown';

export default function SEOAnalyzer({ onBack, darkMode }: { onBack: () => void, darkMode?: boolean }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!url) return;
    setLoading(true);
    try {
      const seoPrompt = `Analyze the following website for SEO, performance, and accessibility. Provide a detailed report with scores (out of 100) for:
      1. SEO Optimization
      2. Performance & Speed
      3. Mobile Responsiveness
      4. Accessibility
      5. Security
      
      Also provide specific actionable recommendations for improvement. Format the output as a professional SEO audit report in Markdown.`;
      
      const result = await analyzeUrl(url, seoPrompt);
      setReport(result);
    } catch (error) {
      console.error("SEO Analysis failed:", error);
      alert("Failed to analyze website. Please check the URL and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("min-h-screen p-4 sm:p-8 pb-32 lg:pb-8 overflow-y-auto transition-colors duration-300", darkMode ? "bg-[#050505] text-white" : "bg-zinc-50 text-zinc-900")}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-12">
          <button onClick={onBack} className={cn("p-2 rounded-full transition-colors", darkMode ? "hover:bg-zinc-800" : "hover:bg-zinc-200")}>
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <BarChart2 className="w-8 h-8 text-emerald-500" />
              SEO & Website Analyzer
            </h1>
            <p className="text-zinc-500 text-sm">Get a professional audit of any website in seconds</p>
          </div>
        </div>

        <div className={cn("p-8 rounded-[2.5rem] border mb-8", darkMode ? "bg-zinc-900/50 border-zinc-800" : "bg-white border-zinc-200 shadow-sm")}>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input 
                type="url"
                placeholder="https://example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className={cn(
                  "w-full pl-12 pr-4 py-4 rounded-2xl border transition-all outline-none text-lg",
                  darkMode ? "bg-zinc-950 border-zinc-800 focus:border-emerald-500" : "bg-zinc-50 border-zinc-200 focus:border-emerald-500"
                )}
              />
            </div>
            <button 
              onClick={handleAnalyze}
              disabled={loading || !url}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold px-8 py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
              {loading ? "Analyzing..." : "Analyze Now"}
            </button>
          </div>
        </div>

        {report ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn("p-8 rounded-[2.5rem] border", darkMode ? "bg-zinc-900/50 border-zinc-800" : "bg-white border-zinc-200 shadow-sm")}
          >
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                Audit Report for {url}
              </h2>
              <button 
                onClick={() => window.open(url, '_blank')}
                className="text-zinc-500 hover:text-emerald-500 transition-colors flex items-center gap-1 text-sm"
              >
                Visit Site <ExternalLink className="w-3 h-3" />
              </button>
            </div>
            
            <div className="prose prose-invert max-w-none">
              <ReactMarkdown>{report}</ReactMarkdown>
            </div>
          </motion.div>
        ) : !loading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: <Zap className="text-amber-500" />, title: "Speed Audit", desc: "Analyze loading times and core web vitals" },
              { icon: <Shield className="text-blue-500" />, title: "Security Check", desc: "Verify SSL, headers, and security best practices" },
              { icon: <Smartphone className="text-purple-500" />, title: "Mobile Ready", desc: "Check responsiveness across all devices" }
            ].map((feature, i) => (
              <div key={i} className={cn("p-6 rounded-3xl border", darkMode ? "bg-zinc-900/30 border-zinc-800" : "bg-white border-zinc-100 shadow-sm")}>
                <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
                  {feature.icon}
                </div>
                <h3 className="font-bold mb-1">{feature.title}</h3>
                <p className="text-zinc-500 text-xs">{feature.desc}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
