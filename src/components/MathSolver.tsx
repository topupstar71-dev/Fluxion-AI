import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Calculator, Upload, X, Loader2, Sparkles, Bot, CheckCircle2 } from 'lucide-react';
import { chatWithAI } from '../services/gemini';
import { cn, compressImage } from '../lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { db, auth } from '../lib/firebase';
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  query, 
  where, 
  getDocs, 
  limit,
  setDoc,
  doc,
  updateDoc
} from 'firebase/firestore';
import { useAuth } from '../lib/AuthContext';

export default function MathSolver({ onBack, darkMode }: { onBack: () => void, darkMode?: boolean }) {
  const { user, updateUserStats } = useAuth();
  const [selectedImage, setSelectedImage] = useState<{ data: string, mimeType: string } | null>(null);
  const [solution, setSolution] = useState<string | null>(null);
  const [isSolving, setIsSolving] = useState(false);
  const [mathQuery, setMathQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      const data = base64.split(',')[1];
      setSelectedImage({ data, mimeType: file.type });
    };
    reader.readAsDataURL(file);
  };

  const solveProblem = async () => {
    setIsSolving(true);
    setSolution(null);
    try {
      const prompt = mathQuery.trim() 
        ? `Solve this math problem and answer the user's specific question: "${mathQuery}". 
           IMPORTANT: Explain the solution in Bengali like a very helpful teacher. 
           Make it so simple that a student can understand it instantly. 
           Break down every step clearly. 
           Use proper LaTeX notation for all mathematical symbols and equations (e.g., use $x^2$ for x squared, $\sqrt{y}$ for square root of y).`
        : "Solve this math problem step-by-step. Explain it in Bengali like a teacher. Use proper LaTeX notation for all mathematical symbols and equations (e.g., use $x^2$ for x squared, $\sqrt{y}$ for square root of y).";
      
      const response = await chatWithAI(prompt, [], false, selectedImage || undefined);
      setSolution(response);

      // Save to History
      if (user) {
        try {
          // Find or create "Math Solver History" chat
          const chatsRef = collection(db, 'chats');
          const q = query(
            chatsRef, 
            where('userId', '==', user.uid), 
            where('title', '==', 'Math Solver History'),
            limit(1)
          );
          const querySnapshot = await getDocs(q);
          
          let chatId;
          if (querySnapshot.empty) {
            const newChatRef = doc(collection(db, 'chats'));
            chatId = newChatRef.id;
            await setDoc(newChatRef, {
              userId: user.uid,
              title: 'Math Solver History',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
          } else {
            chatId = querySnapshot.docs[0].id;
            await updateDoc(doc(db, 'chats', chatId), {
              updatedAt: serverTimestamp()
            });
          }

          // Add user message
          await addDoc(collection(db, 'messages'), {
            chatId,
            userId: user.uid,
            role: 'user',
            content: selectedImage ? `[Math Problem Image] ${mathQuery}` : mathQuery,
            type: 'text',
            timestamp: serverTimestamp()
          });

          // Add assistant message
          await addDoc(collection(db, 'messages'), {
            chatId,
            userId: user.uid,
            role: 'assistant',
            content: response,
            type: 'text',
            timestamp: serverTimestamp()
          });

          await updateUserStats('message');
        } catch (saveError) {
          console.error("Failed to save math problem to history:", saveError);
        }
      }
    } catch (error) {
      console.error('Math solver error:', error);
      setSolution('Error: Failed to solve the problem. Please try again.');
    } finally {
      setIsSolving(false);
    }
  };

  return (
    <div className={cn("p-4 sm:p-8 pb-32 overflow-y-auto h-full transition-colors duration-300", darkMode ? "bg-[#050505] text-white" : "bg-zinc-50 text-zinc-900")}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={onBack} className={cn("p-2 rounded-full transition-colors", darkMode ? "hover:bg-zinc-800" : "hover:bg-zinc-200")}>
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Calculator className="text-indigo-500" /> Math Solver
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Upload Section */}
          <div className="space-y-6">
            <div 
              onClick={() => !selectedImage && fileInputRef.current?.click()}
              className={cn(
                "w-full aspect-video rounded-3xl border-2 border-dashed flex flex-col items-center justify-center p-8 transition-all relative overflow-hidden shadow-sm",
                selectedImage 
                  ? "border-indigo-500 bg-indigo-500/5" 
                  : darkMode 
                    ? "border-zinc-800 bg-zinc-900/30 hover:border-indigo-500/50 hover:bg-zinc-900/50 cursor-pointer"
                    : "border-zinc-200 bg-white hover:border-indigo-500/50 hover:bg-zinc-50 cursor-pointer"
              )}
            >
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleImageSelect}
                accept="image/*"
                className="hidden"
              />
              
              {selectedImage ? (
                <>
                  <img 
                    src={`data:${selectedImage.mimeType};base64,${selectedImage.data}`} 
                    className="absolute inset-0 w-full h-full object-contain"
                    alt="Problem"
                  />
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedImage(null);
                      setSolution(null);
                    }}
                    className="absolute top-4 right-4 bg-red-500 text-white p-2 rounded-full shadow-xl hover:scale-110 transition-transform"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </>
              ) : (
                <>
                  <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-4", darkMode ? "bg-zinc-800" : "bg-zinc-100")}>
                    <Upload className="w-6 h-6 text-indigo-500" />
                  </div>
                  <p className="font-bold text-lg mb-1">Upload Math Problem</p>
                  <p className="text-xs text-zinc-500 text-center">Take a photo or upload an image</p>
                </>
              )}
            </div>
          </div>

          {/* Solution Section */}
          <div className="space-y-6">
            <div className={cn("border rounded-3xl p-6 min-h-[250px] relative overflow-y-auto max-h-[400px] transition-all", darkMode ? "bg-zinc-900/30 border-zinc-800" : "bg-white border-zinc-200 shadow-sm")}>
              <div className="flex items-center gap-2 mb-4 text-xs font-bold uppercase tracking-widest text-zinc-500">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Teacher's Explanation (Bengali)
              </div>

              {isSolving ? (
                <div className="flex flex-col items-center justify-center h-48 text-center">
                  <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
                  <p className="text-zinc-400 font-medium">Fluxion AI is thinking like a teacher...</p>
                </div>
              ) : solution ? (
                <div className={cn("prose prose-sm max-w-none", darkMode ? "prose-invert" : "prose-zinc")}>
                  <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{solution}</ReactMarkdown>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-48 text-center opacity-50">
                  <Calculator className="w-10 h-10 text-zinc-700 mb-4" />
                  <p className="text-zinc-600 text-sm">Upload a problem and ask your question below.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Chat Input for Math */}
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4">
          <div className={cn("backdrop-blur-xl border p-2 rounded-2xl shadow-2xl flex items-center gap-2 transition-all", darkMode ? "bg-zinc-900/80 border-zinc-800" : "bg-white/90 border-zinc-200")}>
            <input 
              type="text"
              value={mathQuery}
              onChange={(e) => setMathQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && solveProblem()}
              placeholder="Ask how to solve it or explain in Bengali..."
              className={cn("flex-1 bg-transparent border-none focus:ring-0 px-4 py-2", darkMode ? "text-white" : "text-zinc-900")}
            />
            <button 
              onClick={solveProblem}
              disabled={isSolving || (!selectedImage && !mathQuery.trim())}
              className="bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-xl transition-all disabled:opacity-50"
            >
              {isSolving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
