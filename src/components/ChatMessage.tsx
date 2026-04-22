import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { motion } from 'framer-motion';
import { User, Bot, Image as ImageIcon, Volume2, Trash2, Copy, Check } from 'lucide-react';
import { cn } from '../lib/utils';

interface MessageProps {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  type?: 'text' | 'image';
  images?: string[];
  onPlayVoice?: (text: string) => void;
  onDelete?: (id: string) => void;
  onImageClick?: (url: string) => void;
  onUpscale?: (url: string, factor: number) => void;
}

export default function ChatMessage({ id, role, content, type = 'text', images, onPlayVoice, onDelete, onImageClick, onUpscale }: MessageProps) {
  const isUser = role === 'user';

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      // If it's a base64 data URL, download it directly without fetch
      if (content.startsWith('data:')) {
        const a = document.createElement('a');
        a.href = content;
        a.download = `fluxion-ai-${id}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
      }

      // For remote URLs, attempt to fetch as blob for proper naming
      // This might fail due to CORS, which is handled in the catch block
      const response = await fetch(content, { mode: 'cors' });
      if (!response.ok) throw new Error('Network response was not ok');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fluxion-ai-${id}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.warn("Download via fetch failed, falling back to direct link:", error);
      // Fallback: try to trigger a direct download/open in new tab
      const a = document.createElement('a');
      a.href = content;
      a.download = `fluxion-ai-${id}.png`;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex w-full gap-4 p-6 group",
        isUser ? "bg-transparent" : "bg-zinc-900/50 backdrop-blur-sm"
      )}
    >
      <div className={cn(
        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
        isUser ? "bg-indigo-600" : "bg-emerald-600"
      )}>
        {isUser ? <User className="w-6 h-6 text-white" /> : <Bot className="w-6 h-6 text-white" />}
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-zinc-400">
            {isUser ? 'You' : 'Fluxion AI'}
          </span>
          <div className="flex items-center gap-1">
            {!isUser && type === 'text' && (
              <button 
                onClick={() => onPlayVoice?.(content)}
                className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-500 hover:text-white"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            )}
            <button 
              onClick={() => onDelete?.(id)}
              className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-500 hover:text-red-500 opacity-0 group-hover:opacity-100"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="prose prose-invert max-w-none">
          {images && images.length > 0 && (
            <div className={cn(
              "mt-2 grid gap-2",
              images.length === 1 ? "grid-cols-1" : "grid-cols-2"
            )}>
              {images.map((imgUrl, idx) => (
                <div 
                  key={idx}
                  className="rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900 cursor-pointer group/img relative"
                  onClick={() => onImageClick?.(imgUrl)}
                >
                  <img 
                    src={imgUrl} 
                    alt={isUser ? "Uploaded" : "AI Generated"} 
                    className="w-full h-auto max-h-[512px] object-contain transition-transform duration-500 group-hover/img:scale-[1.02]"
                    referrerPolicy="no-referrer"
                    crossOrigin="anonymous"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex flex-col items-center justify-center gap-4">
                    <div className="flex gap-2">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDownload(e); }}
                        className="bg-white/10 backdrop-blur-md hover:bg-white/20 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border border-white/20"
                      >
                        <ImageIcon className="w-4 h-4" /> Save
                      </button>
                      {!isUser && onUpscale && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); onUpscale(imgUrl, 2); }}
                          className="bg-indigo-600/80 backdrop-blur-md hover:bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border border-indigo-500/20"
                        >
                          <ImageIcon className="w-4 h-4" /> 2x Upscale
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {content && (
            <ReactMarkdown
              remarkPlugins={[remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={{
                code(props: any) {
                  const { children, className, node, ...rest } = props;
                  const match = /language-(\w+)/.exec(className || '');
                  const isInline = node?.position?.start.line === node?.position?.end.line && !match;
                  
                  const [copied, setCopied] = React.useState(false);
                  const codeString = String(children).replace(/\n$/, '');

                  const handleCopy = () => {
                    navigator.clipboard.writeText(codeString);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  };

                  return !isInline && match ? (
                    <div className="relative group/code">
                      <button
                        onClick={handleCopy}
                        className="absolute right-2 top-2 p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-all opacity-0 group-hover/code:opacity-100 z-10"
                        title="Copy code"
                      >
                        {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                      <SyntaxHighlighter
                        style={atomDark}
                        language={match[1]}
                        PreTag="div"
                        className="rounded-xl !bg-zinc-950 !p-4 my-4"
                        {...rest}
                      >
                        {codeString}
                      </SyntaxHighlighter>
                    </div>
                  ) : (
                    <code className={cn("bg-zinc-800 px-1.5 py-0.5 rounded text-indigo-300", className)} {...rest}>
                      {children}
                    </code>
                  );
                }
              }}
            >
              {content}
            </ReactMarkdown>
          )}
        </div>
      </div>
    </motion.div>
  );
}
