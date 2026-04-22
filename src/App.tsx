import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Mic, 
  MicOff, 
  Image as ImageIcon, 
  Plus, 
  X,
  Sparkles,
  Bot,
  FileText,
  Loader2,
  Download,
  Shield,
  Zap,
  Calculator,
  Code2,
  Languages,
  Newspaper
} from 'lucide-react';
import { 
  chatWithAI, 
  generateImage, 
  editImage
} from './services/gemini';
import ChatMessage from './components/ChatMessage';
import MathSolver from './components/MathSolver';
import CodeBuilder from './components/CodeBuilder';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, compressImage } from './lib/utils';

import { ConfirmModal, Toast, ToastType } from './components/UI';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  type: 'text' | 'image';
  images?: string[];
  timestamp: Date;
}

export default function App() {
  const [view, setView] = useState<'chat' | 'math' | 'code'>('chat');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [darkMode] = useState(true); // Forced dark mode
  const [selectedImages, setSelectedImages] = useState<{ data: string, mimeType: string }[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
  const [chatMode, setChatMode] = useState<'general' | 'image'>('general');
  const [highQuality, setHighQuality] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState<string | null>(null);
  const [verifiedIdentity, setVerifiedIdentity] = useState<'none' | 'mr-flower' | 'ms-butterfly'>('none');
  const [showPasswordPrompt, setShowPasswordPrompt] = useState<'none' | 'mr-flower' | 'ms-butterfly'>('none');
  const [passwordInput, setPasswordInput] = useState('');

  const handleVerifyIdentity = (identity: 'mr-flower' | 'ms-butterfly') => {
    const mrFlowerPass = import.meta.env.VITE_MR_FLOWER_PASSWORD || 'saiful123';
    const msButterflyPass = import.meta.env.VITE_MS_BUTTERFLY_PASSWORD || 'rimi123';

    if (identity === 'mr-flower' && passwordInput === mrFlowerPass) {
      setVerifiedIdentity('mr-flower');
      setShowPasswordPrompt('none');
      setPasswordInput('');
      showToast('Identity Verified: Welcome, Mr. Flower.', 'success');
    } else if (identity === 'ms-butterfly' && passwordInput === msButterflyPass) {
      setVerifiedIdentity('ms-butterfly');
      setShowPasswordPrompt('none');
      setPasswordInput('');
      showToast('Identity Verified: Welcome, Ms. Butterfly.', 'success');
    } else {
      showToast('Incorrect Password!', 'error');
    }
  };

  // UI States
  const [toast, setToast] = useState<{ message: string, type: ToastType } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ 
    isOpen: boolean, 
    title: string, 
    message: string, 
    onConfirm: () => void,
    variant?: 'danger' | 'primary'
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const showToast = (message: string, type: ToastType = 'info') => {
    setToast({ message, type });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void, variant: 'danger' | 'primary' = 'primary') => {
    setConfirmModal({ isOpen: true, title, message, onConfirm, variant });
  };

  const speakText = async (text: string, messageId: string) => {
    if (isSpeaking === messageId) {
      window.speechSynthesis.cancel();
      setIsSpeaking(null);
      return;
    }

    try {
      setIsSpeaking(messageId);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = () => setIsSpeaking(null);
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error("TTS Error:", error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    for (const file of files) {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = async (ev) => {
          const rawBase64 = ev.target?.result as string;
          try {
            const compressedDataUrl = await compressImage(rawBase64, 1024, 1024, 0.6);
            setSelectedImages(prev => [...prev, {
              data: compressedDataUrl.split(',')[1],
              mimeType: compressedDataUrl.split(';')[0].split(':')[1]
            }]);
          } catch (err) {
            setSelectedImages(prev => [...prev, {
              data: rawBase64.split(',')[1],
              mimeType: file.type
            }]);
          }
        };
        reader.readAsDataURL(file);
      } else if (file.type === 'text/plain' || file.name.endsWith('.md') || file.name.endsWith('.txt')) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const content = ev.target?.result as string;
          showToast(`File "${file.name}" uploaded! AI will analyze it in your next message.`, "success");
        };
        reader.readAsText(file);
      } else if (file.type === 'application/pdf') {
        showToast("PDF analysis is coming soon! For now, please use .txt or .md files.", "warning");
      }
    }
  };

  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const plusMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (plusMenuRef.current && !plusMenuRef.current.contains(event.target as Node)) {
        setIsPlusMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const isNearBottom = scrollHeight - scrollTop <= clientHeight + 150;
      const lastMessageIsUser = messages.length > 0 && messages[messages.length - 1].role === 'user';

      if (isNearBottom || lastMessageIsUser) {
        scrollRef.current.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: lastMessageIsUser ? 'smooth' : 'auto'
        });
      }
    }
  }, [messages, view]);

  const startNewChat = () => {
    setMessages([]);
    setChatMode('general');
    setInput('');
  };

  const [isRefining, setIsRefining] = useState(false);

  const handleSend = async (type: 'text' | 'image' = 'text', overridePrompt?: string) => {
    const userMsg = (overridePrompt || input).trim();
    if ((!userMsg && selectedImages.length === 0) || isGenerating) return;

    setIsGenerating(true);

    const currentSelectedImages = [...selectedImages];
    setInput('');
    setSelectedImages([]);

    const newUserMessage: Message = {
      id: Math.random().toString(36).substring(7),
      role: 'user',
      content: userMsg || (currentSelectedImages.length > 0 ? "Analyze these images" : ""),
      type: currentSelectedImages.length > 0 ? 'image' : 'text',
      images: currentSelectedImages.map(img => `data:${img.mimeType};base64,${img.data}`),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newUserMessage]);

    try {
      if (type === 'image' || chatMode === 'image') {
        let rawImageUrl;
        const { refineImagePrompt } = await import('./services/gemini');
        const refinedPrompt = await refineImagePrompt(userMsg);

        if (currentSelectedImages.length > 0) {
          rawImageUrl = await editImage(refinedPrompt, currentSelectedImages);
        } else {
          rawImageUrl = await generateImage(refinedPrompt, "1:1", highQuality);
        }
        
        const imageUrl = rawImageUrl.startsWith('data:') ? await compressImage(rawImageUrl) : rawImageUrl;
        
        const newAssistantMessage: Message = {
          id: Math.random().toString(36).substring(7),
          role: 'assistant',
          content: imageUrl,
          type: 'image',
          images: [imageUrl],
          timestamp: new Date()
        };
        setMessages(prev => [...prev, newAssistantMessage]);
        setChatMode('general');
      } else {
        const response = await chatWithAI(
          userMsg, 
          messages, 
          verifiedIdentity === 'ms-butterfly', 
          currentSelectedImages.length > 0 ? currentSelectedImages : undefined, 
          verifiedIdentity === 'mr-flower'
        );
        const newAssistantMessage: Message = {
          id: Math.random().toString(36).substring(7),
          role: 'assistant',
          content: response,
          type: 'text',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, newAssistantMessage]);
      }
    } catch (error: any) {
      console.error("AI Error:", error);
      showToast("Something went wrong. Please try again.", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpscale = async (imageUrl: string, factor: number) => {
    if (isGenerating) return;
    setIsGenerating(true);
    showToast(`Upscaling image ${factor}x... Please wait.`, "info");
    
    try {
      const { upscaleImage } = await import('./services/gemini');
      
      let base64Data = imageUrl;
      let mimeType = 'image/png';
      
      if (imageUrl.startsWith('http')) {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        mimeType = blob.type;
        const reader = new FileReader();
        base64Data = await new Promise((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      }
      
      const dataOnly = base64Data.split(',')[1] || base64Data;
      const upscaled = await upscaleImage({ data: dataOnly, mimeType });
      
      const newAssistantMessage: Message = {
        id: Math.random().toString(36).substring(7),
        role: 'assistant',
        content: upscaled,
        type: 'image',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, newAssistantMessage]);
      showToast("Image upscaled successfully!", "success");
    } catch (error: any) {
      console.error("Upscale failed:", error);
      showToast("Upscale failed: " + error.message, "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleVoice = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) return showToast('Speech recognition not supported', 'error');
      
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsRecording(false);
      };

      recognition.onerror = () => setIsRecording(false);
      recognition.onend = () => setIsRecording(false);

      recognitionRef.current = recognition;
      recognition.start();
      setIsRecording(true);
    }
  };

  const renderView = () => {
    if (view === 'math') {
      return <MathSolver onBack={() => setView('chat')} darkMode={darkMode} />;
    }
    if (view === 'code') {
      return <CodeBuilder onBack={() => setView('chat')} darkMode={darkMode} />;
    }

    return (
      <>
        {/* Header */}
        <header className={cn("h-16 flex items-center justify-between px-6 border-b z-10", darkMode ? "bg-zinc-950/80 border-zinc-800" : "bg-white/80 border-zinc-200", "backdrop-blur-md")}>
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-indigo-500" />
              Fluxion AI
            </h2>
            <button 
              onClick={startNewChat}
              className="hidden md:flex items-center gap-2 px-4 py-2 bg-zinc-800/50 hover:bg-zinc-800 rounded-xl transition-all text-sm font-medium border border-zinc-700/50 ml-4"
            >
              <Plus className="w-4 h-4" /> New Chat
            </button>
            {isGenerating && (
              <button 
                onClick={() => setIsGenerating(false)}
                className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg text-[10px] font-bold border border-red-500/20 ml-2 animate-pulse"
              >
                <X className="w-3 h-3" /> STOP AI
              </button>
            )}
          </div>
        </header>

        {/* Chat Window */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto scroll-smooth"
        >
          {/* Identity Verification Buttons (Subtle) */}
          <div className="flex justify-center gap-4 py-4">
            {verifiedIdentity === 'none' ? (
              <>
                <button 
                  onClick={() => setShowPasswordPrompt('mr-flower')}
                  className="text-[10px] text-zinc-800 hover:text-zinc-600 transition-colors uppercase tracking-widest font-bold"
                >
                  Verify Mr. Flower
                </button>
                <button 
                  onClick={() => setShowPasswordPrompt('ms-butterfly')}
                  className="text-[10px] text-zinc-800 hover:text-zinc-600 transition-colors uppercase tracking-widest font-bold"
                >
                  Verify Ms. Butterfly
                </button>
              </>
            ) : (
              <div className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
                Verified as: {verifiedIdentity === 'mr-flower' ? 'Mr. Flower' : 'Ms. Butterfly'}
              </div>
            )}
          </div>

          {/* Password Prompt Modal */}
          {showPasswordPrompt !== 'none' && (
            <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2rem] w-full max-w-sm shadow-2xl"
              >
                <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mb-6 mx-auto shadow-xl shadow-indigo-600/20">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-2 text-white text-center">
                  Identity Verification
                </h3>
                <p className="text-zinc-500 text-center mb-6 text-sm">
                  Enter the secret password for {showPasswordPrompt === 'mr-flower' ? 'Mr. Flower' : 'Ms. Butterfly'}
                </p>
                <input 
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Secret Password"
                  className="w-full bg-black border border-zinc-800 rounded-2xl px-6 py-4 text-white mb-6 focus:ring-2 focus:ring-indigo-500 outline-none text-center text-lg tracking-widest"
                  onKeyDown={(e) => e.key === 'Enter' && handleVerifyIdentity(showPasswordPrompt)}
                  autoFocus
                />
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => handleVerifyIdentity(showPasswordPrompt)}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
                  >
                    Verify Now
                  </button>
                  <button 
                    onClick={() => {
                      setShowPasswordPrompt('none');
                      setPasswordInput('');
                    }}
                    className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-4 rounded-2xl transition-all active:scale-95"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {messages.length === 0 ? (
            <div className="min-h-full flex flex-col items-center justify-start sm:justify-center p-4 sm:p-8 text-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-16 h-16 sm:w-20 sm:h-20 bg-indigo-600 rounded-3xl flex items-center justify-center mb-6 shadow-2xl shadow-indigo-600/40 shrink-0"
              >
                <Sparkles className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              </motion.div>
              <h1 className="text-3xl sm:text-4xl font-bold mb-4">How can I help you today?</h1>
              <p className="text-zinc-500 max-w-md mb-8 text-sm sm:text-base">
                Fluxion AI can help you with coding, creative writing, image generation, and more.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-6xl px-4">
                {[
                  { icon: <ImageIcon className="text-emerald-500" />, title: "Generate an image", desc: "Describe what you want to see", action: () => { setMessages([]); setChatMode('image'); setView('chat'); setInput(''); } },
                  { icon: <Calculator className="text-indigo-500" />, title: "Math Solution", desc: "Solve problems from text or images", action: () => setView('math') },
                  { icon: <Code2 className="text-amber-500" />, title: "Web/App Builder", desc: "Build complete web apps from scratch", action: () => setView('code') },
                  { icon: <Languages className="text-purple-500" />, title: "AI Translator", desc: "Translate naturally between any languages", action: () => { setInput('Translate this to English: '); setView('chat'); } },
                  { icon: <Newspaper className="text-blue-500" />, title: "Real-time News", desc: "Get the latest news and web search results", action: () => { setInput('What is the latest news today?'); setView('chat'); } },
                ].map((item, i) => (
                <button
                  key={i}
                  onClick={item.action}
                  className={cn(
                    "p-6 rounded-3xl border text-left transition-all hover:scale-[1.02] shadow-xl",
                    "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700"
                  )}
                >
                    <div className="w-12 h-12 rounded-2xl bg-zinc-800/50 flex items-center justify-center mb-4">{item.icon}</div>
                    <p className="font-bold text-lg mb-1">{item.title}</p>
                    <p className="text-sm text-zinc-500 leading-relaxed">{item.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto w-full pb-40">
              {messages.map((msg) => (
                <ChatMessage 
                  key={msg.id} 
                  id={msg.id}
                  role={msg.role} 
                  content={msg.content} 
                  type={msg.type}
                  images={msg.images}
                  onPlayVoice={(text) => speakText(text, msg.id)}
                  onDelete={(id) => setMessages(prev => prev.filter(m => m.id !== id))}
                  onImageClick={(url) => setPreviewImage(url)}
                  onUpscale={handleUpscale}
                />
              ))}
              {isGenerating && (
                <div className="flex gap-4 p-6 bg-zinc-900/30">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shrink-0">
                    <Bot className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className={cn(
          "absolute bottom-0 left-0 right-0 p-4 z-20",
          darkMode ? "bg-gradient-to-t from-[#050505] via-[#050505] to-transparent" : "bg-gradient-to-t from-zinc-50 via-zinc-50 to-transparent"
        )}>
          <div className="max-w-4xl mx-auto">
            {selectedImages.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {selectedImages.map((img, idx) => (
                  <div key={idx} className="relative inline-block group">
                    <img 
                      src={`data:${img.mimeType};base64,${img.data}`} 
                      className="h-16 w-16 object-cover rounded-xl border-2 border-indigo-500" 
                      alt={`Selected ${idx}`} 
                    />
                    <button 
                      onClick={() => setSelectedImages(prev => prev.filter((_, i) => i !== idx))}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className={cn(
              "relative flex items-center gap-1 p-1.5 rounded-2xl border transition-all focus-within:ring-2 focus-within:ring-indigo-500/50",
              darkMode ? "bg-zinc-900/90 border-zinc-800" : "bg-white border-zinc-200",
              "backdrop-blur-xl shadow-2xl"
            )}>
              {chatMode === 'image' && (
                <div className="absolute -top-12 left-0 flex items-center gap-2">
                  <div className="bg-indigo-600 text-white px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-2 shadow-lg animate-bounce">
                    <ImageIcon className="w-3 h-3" /> IMAGE MODE ACTIVE
                  </div>
                  <button 
                    onClick={() => setHighQuality(!highQuality)}
                    className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-2 shadow-lg transition-all",
                      highQuality ? "bg-amber-500 text-white" : "bg-zinc-800 text-zinc-400"
                    )}
                  >
                    <Zap className="w-3 h-3" /> {highQuality ? "HQ ENABLED" : "HQ DISABLED"}
                  </button>
                </div>
              )}
              {/* Plus Menu */}
              <div className="relative" ref={plusMenuRef}>
                <button 
                  onClick={() => setIsPlusMenuOpen(!isPlusMenuOpen)}
                  className={cn(
                    "p-2 rounded-xl transition-all",
                    isPlusMenuOpen ? "bg-indigo-600 text-white rotate-45" : "hover:bg-zinc-800 text-zinc-400"
                  )}
                >
                  <Plus className="w-5 h-5" />
                </button>
                
                <AnimatePresence>
                  {isPlusMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: -10, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className={cn(
                        "absolute bottom-full left-0 mb-2 w-48 rounded-2xl border p-2 shadow-2xl z-50",
                        darkMode ? "bg-zinc-950 border-zinc-800" : "bg-white border-zinc-200"
                      )}
                    >
                      <label 
                        htmlFor="plus-menu-file-upload"
                        className="w-full flex items-center gap-3 p-3 hover:bg-zinc-800 rounded-xl transition-colors text-sm font-medium cursor-pointer"
                      >
                        <FileText className="w-4 h-4 text-emerald-500" />
                        Upload Files (Img/PDF)
                        <input 
                          id="plus-menu-file-upload"
                          type="file" 
                          accept="image/*,.pdf,.txt" 
                          multiple
                          className="hidden" 
                          onChange={(e) => {
                            handleFileUpload(e);
                            setIsPlusMenuOpen(false);
                          }}
                        />
                      </label>
                      <button 
                        onClick={() => {
                          if (!input.trim()) {
                            alert("Please type a description of the image you want to generate first!");
                            return;
                          }
                          handleSend('image');
                          setIsPlusMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-3 p-3 hover:bg-zinc-800 rounded-xl transition-colors text-sm font-medium"
                      >
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        AI Image Gen
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Message Fluxion AI..."
                className="flex-1 bg-transparent border-none focus:ring-0 text-white resize-none py-2 px-2 max-h-40 min-h-[40px] text-sm"
                rows={1}
              />

              <div className="flex items-center gap-1">
                <button 
                  onClick={toggleVoice}
                  className={cn(
                    "p-2 rounded-xl transition-colors",
                    isRecording ? "bg-red-500 text-white animate-pulse" : "hover:bg-zinc-800 text-zinc-400 hover:text-indigo-500"
                  )}
                >
                  {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
                <button
                  onClick={() => handleSend()}
                  disabled={(!input.trim() && selectedImages.length === 0) || isGenerating}
                  className={cn(
                    "p-2.5 rounded-xl transition-all flex items-center gap-2",
                    (input.trim() || selectedImages.length > 0) && !isGenerating 
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30" 
                      : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                  )}
                >
                  {isGenerating ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                    </div>
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className={cn("flex h-screen overflow-hidden transition-colors duration-300 relative", darkMode ? "bg-[#050505] text-white" : "bg-zinc-50 text-zinc-900")}>
      {/* Main Content */}
      <main className={cn(
        "flex-1 flex flex-col relative",
        view === 'chat' ? "overflow-hidden" : "overflow-y-auto"
      )}>
        {renderView()}
      </main>

      {/* UI Components */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
      />

      <AnimatePresence>
        {previewImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4 sm:p-8"
            onClick={() => setPreviewImage(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-5xl w-full max-h-full flex flex-col items-center"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={() => setPreviewImage(null)}
                className="absolute -top-12 right-0 text-white hover:text-red-500 transition-colors p-2"
              >
                <X className="w-8 h-8" />
              </button>
              
              <img 
                src={previewImage} 
                className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl border border-white/10" 
                alt="Preview" 
                referrerPolicy="no-referrer"
              />

              <div className="mt-6 flex gap-4">
                <button 
                  onClick={async () => {
                    try {
                      const response = await fetch(previewImage);
                      const blob = await response.blob();
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `fluxion-ai-${Date.now()}.png`;
                      document.body.appendChild(a);
                      a.click();
                      window.URL.revokeObjectURL(url);
                      document.body.removeChild(a);
                    } catch (error) {
                      console.error("Download failed:", error);
                    }
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-2xl font-bold flex items-center gap-3 shadow-xl shadow-indigo-600/20 transition-all active:scale-95"
                >
                  <Download className="w-5 h-5" /> Save to Gallery
                </button>
                <button 
                  onClick={() => setPreviewImage(null)}
                  className="bg-zinc-800 hover:bg-zinc-700 text-white px-8 py-3 rounded-2xl font-bold transition-all active:scale-95"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
