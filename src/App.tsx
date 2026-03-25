import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Mic, 
  MicOff, 
  Image as ImageIcon, 
  Plus, 
  History, 
  Settings, 
  LogOut, 
  Moon, 
  Sun, 
  Trash2,
  Menu,
  X,
  Sparkles,
  User as UserIcon,
  Bot,
  Shield,
  CreditCard,
  Zap,
  Layout,
  Volume2,
  FileText,
  Share2,
  Gift,
  Wand2,
  ArrowLeft,
  PlusCircle,
  Loader2,
  BookOpen,
  Calendar,
  Download,
  Globe,
  BarChart2
} from 'lucide-react';
import { 
  chatWithAI, 
  generateImage, 
  editImage,
  textToSpeech 
} from './services/gemini';
import { useAuth } from './lib/AuthContext';
import ChatMessage from './components/ChatMessage';
import Auth from './components/Auth';
import AdminPanel from './components/AdminPanel';
import Pricing from './components/Pricing';
import Dashboard from './components/Dashboard';
import Payment from './components/Payment';
import AIBuilder from './components/AIBuilder';
import ProjectHistory from './components/ProjectHistory';
import CommunityShowcase from './components/CommunityShowcase';
import SEOAnalyzer from './components/SEOAnalyzer';
import Translator from './components/Translator';
import MathSolver from './components/MathSolver';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  setDoc, 
  doc, 
  deleteDoc, 
  updateDoc,
  serverTimestamp,
  getDocs,
  getDocFromServer
} from 'firebase/firestore';
import { db, auth } from './lib/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, compressImage } from './lib/utils';
import confetti from 'canvas-confetti';

import { Modal, ConfirmModal, Toast, ToastType } from './components/UI';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  type: 'text' | 'image';
  timestamp: any;
}

declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

export default function App() {
  const { user, loading, profile, signOut, useCredit, claimDailyCredits, getCreditLogs, updateUserStats } = useAuth();
  const [view, setView] = useState<'chat' | 'admin' | 'pricing' | 'dashboard' | 'payment' | 'builder' | 'translator' | 'math' | 'image-editor' | 'history' | 'projects' | 'community' | 'seo'>('chat');
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);
  const [darkMode] = useState(true); // Forced dark mode
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [chats, setChats] = useState<any[]>([]);
  const [selectedImage, setSelectedImage] = useState<{ data: string, mimeType: string } | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [chatMode, setChatMode] = useState<'general' | 'image'>('general');
  const [highQuality, setHighQuality] = useState(false);
  const [colabConfigured, setColabConfigured] = useState(false);

  const [currentProject, setCurrentProject] = useState<any>(null);

  const handleOpenProject = (project: any) => {
    setCurrentProject(project);
    setView('builder');
  };

  useEffect(() => {
    // Check Colab status
    fetch('/api/health')
      .then(res => res.json())
      .then(data => setColabConfigured(data.colabConfigured))
      .catch(e => console.error("Colab health check failed:", e));
  }, []);
  const [isSpeaking, setIsSpeaking] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState<boolean>(true);
  const [verifiedIdentity, setVerifiedIdentity] = useState<'none' | 'mr-flower' | 'ms-butterfly'>('none');
  const [showPasswordPrompt, setShowPasswordPrompt] = useState<'none' | 'mr-flower' | 'ms-butterfly'>('none');
  const [passwordInput, setPasswordInput] = useState('');
  const [creditLogs, setCreditLogs] = useState<any[]>([]);

  const handleVerifyIdentity = (identity: 'mr-flower' | 'ms-butterfly') => {
    // Passwords can be set via env vars or defaults
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
      
      // Flag current chat as Butterfly session if it exists
      if (activeChatId) {
        updateDoc(doc(db, 'chats', activeChatId), { isButterflySession: true }).catch(console.error);
      }
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

  const handleFirestoreError = (error: any, operationType: OperationType, path: string | null) => {
    const errInfo: FirestoreErrorInfo = {
      error: error instanceof Error ? error.message : String(error),
      authInfo: {
        userId: auth.currentUser?.uid,
        email: auth.currentUser?.email,
        emailVerified: auth.currentUser?.emailVerified,
        isAnonymous: auth.currentUser?.isAnonymous,
        tenantId: auth.currentUser?.tenantId,
        providerInfo: auth.currentUser?.providerData.map(provider => ({
          providerId: provider.providerId,
          displayName: provider.displayName,
          email: provider.email,
          photoUrl: provider.photoURL
        })) || []
      },
      operationType,
      path
    };
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    
    if (error.code === 'permission-denied') {
      showToast("Permission Denied: You don't have access to this data.", "error");
    } else {
      showToast("An error occurred with the database.", "error");
    }
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void, variant: 'danger' | 'primary' = 'primary') => {
    setConfirmModal({ isOpen: true, title, message, onConfirm, variant });
  };

  useEffect(() => {
    const autoAdmin = async () => {
      if (user && profile && profile.role !== 'admin') {
        const adminEmails = ["topupstar71@gmail.com", "saifulislam.20100409@fluxion.ai"];
        const adminUids = ["uehxsf7qmyewebqydddjpb", "QWGuFU4ulMVjCWNMUUOHqmKImsF3", "MSuyXdJTneZThzj3CP5wWTQbVzm1"];
        
        if (adminEmails.includes(user.email || '') || adminUids.includes(user.uid)) {
          try {
            await updateDoc(doc(db, 'users', user.uid), { role: 'admin' });
            console.log("Auto-assigned admin role to", user.email);
          } catch (err) {
            console.error("Failed to auto-assign admin role:", err);
          }
        }
      }
    };
    autoAdmin();
  }, [user, profile]);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio?.hasSelectedApiKey) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(hasKey);
      }
    };
    checkKey();
  }, []);

  useEffect(() => {
    if (view === 'history') {
      setView('chat'); // Redirect from history
    }
  }, [view]);

  // Connection test
  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error: any) {
        if (error.message?.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
          showToast("Database is offline. Check your connection.", "error");
        }
      }
    };
    testConnection();
  }, []);

  const ensureApiKey = async () => {
    if (window.aistudio?.openSelectKey) {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey) {
        await window.aistudio.openSelectKey();
        setHasApiKey(true);
        return true;
      }
    }
    return true;
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

  const [selectedFileContent, setSelectedFileContent] = useState<{ name: string, content: string } | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const rawBase64 = ev.target?.result as string;
        try {
          const compressedDataUrl = await compressImage(rawBase64, 1024, 1024, 0.6);
          setSelectedImage({
            data: compressedDataUrl.split(',')[1],
            mimeType: compressedDataUrl.split(';')[0].split(':')[1]
          });
        } catch (err) {
          setSelectedImage({
            data: rawBase64.split(',')[1],
            mimeType: file.type
          });
        }
      };
      reader.readAsDataURL(file);
    } else if (file.type === 'text/plain' || file.name.endsWith('.md') || file.name.endsWith('.txt')) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const content = ev.target?.result as string;
        setSelectedFileContent({ name: file.name, content });
        showToast(`File "${file.name}" uploaded! AI will analyze it in your next message.`, "success");
      };
      reader.readAsText(file);
    } else if (file.type === 'application/pdf') {
      showToast("PDF analysis is coming soon! For now, please use .txt or .md files.", "warning");
    }
  };

  const handleClaimDaily = async () => {
    const success = await claimDailyCredits();
    if (success) {
      showToast("Congratulations! You've claimed 10 daily credits.", "success");
    } else {
      showToast("You've already claimed your daily credits today.", "warning");
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
    const handleStripeSuccess = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const sessionId = urlParams.get('session_id');
      const userId = urlParams.get('userId');
      const planId = urlParams.get('planId');

      if (sessionId && userId && planId) {
        try {
          const response = await fetch('/api/verify-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, userId, planId }),
          });
          const result = await response.json();
          if (result.success) {
            // Clear URL params
            window.history.replaceState({}, document.title, window.location.pathname);
            showToast("Payment Successful! Your plan has been upgraded.", "success");
            setView('dashboard');
            confetti({
              particleCount: 150,
              spread: 100,
              origin: { y: 0.6 },
              colors: ['#6366f1', '#10b981', '#f59e0b', '#ec4899']
            });
          }
        } catch (error) {
          console.error("Stripe verification failed:", error);
        }
      }
    };
    handleStripeSuccess();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (profile && profile.credits <= 0 && profile.role !== 'admin' && view !== 'pricing' && view !== 'payment' && !loading) {
      setView('pricing');
    }
  }, [profile, view, loading]);

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

  useEffect(() => {
    if (!user || view !== 'chat') return;

    const q = query(
      collection(db, 'chats'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a: any, b: any) => {
        const timeA = a.updatedAt?.seconds || 0;
        const timeB = b.updatedAt?.seconds || 0;
        return timeB - timeA;
      });
      setChats(chatsList);
      setDbError(null);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'chats');
    });

    return () => unsubscribe();
  }, [user, view]);

  useEffect(() => {
    if (!activeChatId || !user || view !== 'chat') {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, 'messages'),
      where('chatId', '==', activeChatId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messagesList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a: any, b: any) => {
        const timeA = a.timestamp?.seconds || 0;
        const timeB = b.timestamp?.seconds || 0;
        return timeA - timeB;
      }) as Message[];
      setMessages(messagesList);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'messages');
    });

    return () => unsubscribe();
  }, [activeChatId, user, view]);

  const startNewChat = async () => {
    if (!user) return null;
    const chatId = Math.random().toString(36).substring(2, 15);
    try {
      await setDoc(doc(db, 'chats', chatId), {
        userId: user.uid,
        title: 'New Chat',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isButterflySession: verifiedIdentity === 'ms-butterfly'
      });
      setActiveChatId(chatId);
      setMessages([]);
      setChatMode('general');
      setInput('');
      return chatId;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'chats');
      return null;
    }
  };

  const [isRefining, setIsRefining] = useState(false);

  const handleSend = async (type: 'text' | 'image' = 'text', overridePrompt?: string, overrideChatId?: string) => {
    const userMsg = (overridePrompt || input).trim();
    if ((!userMsg && !selectedImage) || isGenerating || !user || !profile) return;

    // Set generating state immediately to prevent double clicks/rapid sends
    setIsGenerating(true);

    // Admin command
    if (userMsg.toLowerCase() === 'admin 4347') {
      setView('admin');
      setInput('');
      return;
    }

    // Owner command flow
    if (userMsg.toLowerCase() === 'ami tomar malik') {
      let chatId = overrideChatId || activeChatId;
      try {
        if (!chatId) {
          chatId = Math.random().toString(36).substring(2, 15);
          await setDoc(doc(db, 'chats', chatId), {
            userId: user.uid,
            title: 'Owner Verification',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          setActiveChatId(chatId);
        }
        await addDoc(collection(db, 'messages'), {
          chatId,
          userId: user.uid,
          role: 'user',
          content: userMsg,
          type: 'text',
          timestamp: serverTimestamp()
        });
        await addDoc(collection(db, 'messages'), {
          chatId,
          userId: user.uid,
          role: 'assistant',
          content: "Please provide the owner password:",
          type: 'text',
          timestamp: serverTimestamp()
        });
        setInput('');
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'owner-flow');
      }
      return;
    }

    // Owner password check
    if (userMsg.toLowerCase() === 'ami jani na') {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        await updateDoc(userDocRef, { role: 'admin' });
        showToast("Success! Owner verified. You are now an Admin.", "success");
        setInput('');
        return;
      } catch (error) {
        console.error("Failed to promote to admin:", error);
        showToast("Failed to verify owner.", "error");
        return;
      }
    }

    // Owner picture command
    if (userMsg.toLowerCase().includes('tomar maliker pic dao') || userMsg.toLowerCase().includes('tomar malik er pic dao')) {
      let chatId = overrideChatId || activeChatId;
      try {
        if (!chatId) {
          chatId = Math.random().toString(36).substring(2, 15);
          await setDoc(doc(db, 'chats', chatId), {
            userId: user.uid,
            title: 'Owner Pictures',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          setActiveChatId(chatId);
        }
        
        await addDoc(collection(db, 'messages'), {
          chatId,
          userId: user.uid,
          role: 'user',
          content: userMsg,
          type: 'text',
          timestamp: serverTimestamp()
        });

        const ownerPics = [
          "https://ais-dev-uehxsf7qmyewebqydddjpb-512794774807.asia-southeast1.run.app/api/placeholder/800/1200", // Placeholder for first image
          "https://ais-dev-uehxsf7qmyewebqydddjpb-512794774807.asia-southeast1.run.app/api/placeholder/800/1200"  // Placeholder for second image
        ];

        await addDoc(collection(db, 'messages'), {
          chatId,
          userId: user.uid,
          role: 'assistant',
          content: "Ei nin, amar maliker chobi:",
          type: 'text',
          timestamp: serverTimestamp()
        });

        // Sending the images as separate messages
        await addDoc(collection(db, 'messages'), {
          chatId,
          userId: user.uid,
          role: 'assistant',
          content: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=1000", // Representative image 1
          type: 'image',
          timestamp: serverTimestamp()
        });

        await addDoc(collection(db, 'messages'), {
          chatId,
          userId: user.uid,
          role: 'assistant',
          content: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=1000", // Representative image 2
          type: 'image',
          timestamp: serverTimestamp()
        });

        setInput('');
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'owner-pics');
      }
      setIsGenerating(false);
      return;
    }

    // Secret command to become admin (legacy)
    if (userMsg.toLowerCase() === 'fluxion admin access') {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        await updateDoc(userDocRef, { role: 'admin' });
        showToast("Success! You are now an Admin.", "success");
        setInput('');
        return;
      } catch (error) {
        console.error("Failed to promote to admin:", error);
        showToast("Failed to promote to admin. Check your Firestore rules.", "error");
        return;
      }
    }

    // Calculate credits to deduct
    let creditCost = 5;
    if (type === 'image' || chatMode === 'image') {
      creditCost = 20;
    } else if (view === 'builder') {
      // User requested: 1 credit per 2 lines. 
      // We'll use a minimum check of 5 before generation, 
      // and calculate actual cost after generation.
      creditCost = 5; 
    } else if (view === 'translator') {
      // User requested: 1 credit per 2 words
      const wordCount = userMsg.trim().split(/\s+/).length;
      creditCost = Math.max(1, Math.ceil(wordCount / 2));
    } else if (view === 'math') {
      // User requested: More credits for larger math
      creditCost = Math.max(10, Math.floor(userMsg.length / 15));
    } else {
      creditCost = Math.max(5, 5 + Math.floor(userMsg.length / 50));
    }

    // Check usage limit (Credits) - Immediate block if zero or insufficient
    if (profile) {
      if (profile.credits <= 0) {
        setIsGenerating(false);
        setView('pricing');
        showToast("আপনার ক্রেডিট শেষ হয়ে গেছে। দয়া করে রিচার্জ করুন।", "warning");
        return;
      }
      if (profile.credits < creditCost) {
        setIsGenerating(false);
        setView('pricing');
        showToast(`এই রিকোয়েস্টের জন্য ${creditCost} ক্রেডিট প্রয়োজন। আপনার কাছে আছে ${profile.credits} ক্রেডিট।`, "warning");
        return;
      }
    }

    let chatId = overrideChatId || activeChatId;
    
    const currentSelectedImage = selectedImage;
    setInput('');
    setSelectedImage(null);
    // isGenerating is already set to true at the beginning of handleSend

    try {
      if (!chatId) {
        chatId = Math.random().toString(36).substring(2, 15);
        await setDoc(doc(db, 'chats', chatId), {
          userId: user.uid,
          title: userMsg.slice(0, 30) + (userMsg.length > 30 ? '...' : ''),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          isButterflySession: verifiedIdentity === 'ms-butterfly'
        });
        setActiveChatId(chatId);
      }

      await addDoc(collection(db, 'messages'), {
        chatId,
        userId: user.uid,
        role: 'user',
        content: currentSelectedImage ? `data:${currentSelectedImage.mimeType};base64,${currentSelectedImage.data}` : userMsg,
        type: currentSelectedImage ? 'image' : 'text',
        timestamp: serverTimestamp()
      });

      if (type === 'image' || chatMode === 'image') {
        // Deduct credits BEFORE generating image
        const success = await useCredit(creditCost);
        if (!success) {
          setIsGenerating(false);
          setView('pricing');
          showToast("ক্রেডিট কাটতে সমস্যা হয়েছে। দয়া করে আবার চেষ্টা করুন।", "error");
          return;
        }

        let rawImageUrl;
        setIsRefining(true);
        const { refineImagePrompt } = await import('./services/gemini');
        const refinedPrompt = await refineImagePrompt(userMsg);
        setIsRefining(false);

        if (currentSelectedImage) {
          rawImageUrl = await editImage(refinedPrompt, currentSelectedImage);
        } else {
          rawImageUrl = await generateImage(refinedPrompt, "1:1", highQuality);
        }
        
        // Compress image only if it's a data URL to ensure it fits in Firestore (1MB limit)
        // For direct URLs (like Pollinations.ai), we store the URL directly to avoid CORS issues
        const imageUrl = rawImageUrl.startsWith('data:') ? await compressImage(rawImageUrl) : rawImageUrl;
        
        await addDoc(collection(db, 'messages'), {
          chatId,
          userId: user.uid,
          role: 'assistant',
          content: imageUrl,
          type: 'image',
          timestamp: serverTimestamp()
        });
        confetti({
          particleCount: 150,
          spread: 100,
          origin: { y: 0.6 },
          colors: ['#6366f1', '#10b981', '#f59e0b', '#ec4899']
        });
        setChatMode('general'); // Reset mode after generation
      } else {
        // Deduct base credits BEFORE generating text
        const success = await useCredit(creditCost);
        if (!success) {
          setIsGenerating(false);
          setView('pricing');
          showToast("ক্রেডিট কাটতে সমস্যা হয়েছে। দয়া করে আবার চেষ্টা করুন।", "error");
          return;
        }

        let aiResponse = "";
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const urls = userMsg.match(urlRegex);

        // Prepare context with file content if available
        let finalPrompt = userMsg;
        if (selectedFileContent) {
          finalPrompt = `[File: ${selectedFileContent.name}]\n${selectedFileContent.content}\n\nUser Question: ${userMsg}`;
          setSelectedFileContent(null); // Clear after use
        }

        if (urls && urls.length > 0) {
          const { analyzeUrl } = await import('./services/gemini');
          aiResponse = await analyzeUrl(urls[0], finalPrompt);
        } else if (view === 'builder') {
          const isGame = userMsg.toLowerCase().includes('game');
          const { generateCode, generateGame } = await import('./services/gemini');
          const result = isGame ? await generateGame(finalPrompt) : await generateCode(finalPrompt);
          aiResponse = typeof result === 'object' ? JSON.stringify(result, null, 2) : result;
        } else {
          aiResponse = await chatWithAI(
            finalPrompt, 
            messages, 
            verifiedIdentity === 'ms-butterfly',
            currentSelectedImage ? { data: currentSelectedImage.data, mimeType: currentSelectedImage.mimeType } : undefined,
            verifiedIdentity === 'mr-flower'
          );
        }
        
        // Update user stats
        await updateUserStats('message');

        await addDoc(collection(db, 'messages'), {
          chatId,
          userId: user.uid,
          role: 'assistant',
          content: aiResponse,
          type: 'text',
          timestamp: serverTimestamp()
        });

        // Calculate extra credit cost for coding if in builder view
        if (view === 'builder') {
          const lineCount = aiResponse.split('\n').length;
          const extraCost = Math.floor(lineCount / 2) - creditCost;
          if (extraCost > 0) {
            await useCredit(extraCost);
          }
        }
      }
      
      // Update chat timestamp
      await setDoc(doc(db, 'chats', chatId), { updatedAt: serverTimestamp() }, { merge: true });
      
      setSelectedImage(null);
    } catch (error: any) {
      console.error("Chat error details:", error);
      setIsGenerating(false); // Ensure it's reset on error
      
      if (error.code === 'permission-denied' || error.name === 'FirebaseError') {
        handleFirestoreError(error, OperationType.WRITE, 'messages');
      } else {
        console.error("AI Service Error:", error);
        let errorMsg = error.message || "An error occurred with the AI service.";
        let bengaliMsg = "";
        
        const msg = error.message?.toLowerCase() || "";
        
        if (msg.includes("403") || msg.includes("permission_denied")) {
          errorMsg = "AI Permission Denied: This model might be restricted or your API key lacks permissions.";
          bengaliMsg = "দুঃখিত, এই কাজটি করার অনুমতি নেই। আপনার API Key টি চেক করুন অথবা অন্য মডেল ব্যবহার করুন।";
        } else if (msg.includes("429") || msg.includes("resource_exhausted") || msg.includes("quota")) {
          errorMsg = "Quota Exceeded: You have reached the limit for the AI service. Please wait a moment.";
          bengaliMsg = "আপনার ফ্রি লিমিট শেষ হয়ে গেছে। দয়া করে কিছুক্ষণ অপেক্ষা করুন।";
        } else if (msg.includes("api key") || msg.includes("invalid_key")) {
          errorMsg = "API Key is missing or invalid. Please check your settings.";
          bengaliMsg = "আপনার API Key টি সঠিক নয়। দয়া করে সেটিংস চেক করুন।";
        } else if (msg.includes("pollinations") || msg.includes("500") || msg.includes("internal server error")) {
          errorMsg = "The AI service is currently busy or overloaded. Please try again in a few seconds.";
          bengaliMsg = "AI সার্ভিসটি এই মুহূর্তে খুব ব্যস্ত। দয়া করে কিছুক্ষণ পর আবার চেষ্টা করুন।";
        } else if (msg.includes("timeout") || msg.includes("aborted")) {
          errorMsg = "The connection timed out. Please check your internet and try again.";
          bengaliMsg = "কানেকশন টাইম আউট হয়েছে। আপনার ইন্টারনেট চেক করে আবার চেষ্টা করুন।";
        } else if (msg.includes("prompt is required")) {
          errorMsg = "Please enter a prompt to generate an image.";
          bengaliMsg = "ছবি তৈরি করার জন্য দয়া করে কিছু লিখুন।";
        }
        
        showToast(bengaliMsg || errorMsg, "error");

        if (chatId) {
          try {
            await addDoc(collection(db, 'messages'), {
              chatId,
              userId: user.uid,
              role: 'assistant',
              content: `❌ **AI Error:** ${bengaliMsg || errorMsg}\n\n*(Technical Details: ${error.message || "Unknown Error"})*`,
              type: 'text',
              timestamp: serverTimestamp()
            });
          } catch (innerError) {
            console.error("Failed to add error message to chat:", innerError);
          }
        }
      }
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
      
      // Convert URL to base64 if it's not already
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
      
      if (activeChatId) {
        await addDoc(collection(db, 'messages'), {
          chatId: activeChatId,
          userId: user.uid,
          role: 'assistant',
          content: upscaled,
          type: 'image',
          timestamp: serverTimestamp()
        });
        
        // Update stats
        await updateUserStats('image');
        showToast("Image upscaled successfully!", "success");
      }
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

  const playVoice = async (text: string) => {
    try {
      const audioData = await textToSpeech(text);
      if (audioData) {
        const audio = new Audio(`data:audio/wav;base64,${audioData}`);
        audio.play();
      }
    } catch (error) {
      console.error('TTS Error:', error);
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingImage(true);
    const reader = new FileReader();
    
    reader.onload = async () => {
      const rawBase64 = reader.result as string;
      try {
        // Compress the image before storing/sending
        const compressedDataUrl = await compressImage(rawBase64, 1024, 1024, 0.6);
        const base64String = compressedDataUrl.split(',')[1];
        const mimeType = compressedDataUrl.split(';')[0].split(':')[1];

        setSelectedImage({
          data: base64String,
          mimeType: mimeType
        });
      } catch (err) {
        console.error("Compression error:", err);
        // Fallback to raw if compression fails
        const base64String = rawBase64.split(',')[1];
        setSelectedImage({
          data: base64String,
          mimeType: file.type
        });
      } finally {
        setIsProcessingImage(false);
      }
    };

    reader.onerror = () => {
      console.error("FileReader error");
      setIsProcessingImage(false);
      showToast("Failed to read the image file. Please try again.", "error");
    };

    reader.readAsDataURL(file);
    // Reset input so the same file can be selected again
    e.target.value = '';
  };

  const deleteChat = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    showConfirm(
      'Delete Chat',
      'Are you sure you want to delete this chat? This action cannot be undone.',
      async () => {
        try {
          // Delete chat document
          await deleteDoc(doc(db, 'chats', id));
          
          // Messages cleanup
          const q = query(collection(db, 'messages'), where('chatId', '==', id));
          const snapshot = await getDocs(q);
          const deletePromises = snapshot.docs.map(mDoc => deleteDoc(doc(db, 'messages', mDoc.id)));
          await Promise.all(deletePromises);

          if (activeChatId === id) {
            setActiveChatId(null);
            setMessages([]);
          }
          
          // Force update chats list locally
          setChats(prev => prev.filter(c => c.id !== id));
          showToast("Chat deleted successfully", "success");
        } catch (error: any) {
          handleFirestoreError(error, OperationType.DELETE, `chats/${id}`);
        }
      },
      'danger'
    );
  };

  const deleteMessage = async (id: string) => {
    showConfirm(
      'Delete Message',
      'Delete this message?',
      async () => {
        try {
          await deleteDoc(doc(db, 'messages', id));
          setMessages(prev => prev.filter(m => m.id !== id));
          showToast("Message deleted", "success");
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `messages/${id}`);
        }
      },
      'danger'
    );
  };

  if (loading) return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-zinc-500 font-medium">Loading your profile...</p>
      </div>
    </div>
  );

  if (!user) return <Auth />;

  if (dbError || (!profile && user)) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 p-8 rounded-3xl text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-white mb-4">Database Connection Error</h2>
          <p className="text-zinc-400 mb-8 text-sm leading-relaxed">
            {dbError || "Your profile could not be loaded. This is usually caused by missing Firestore Security Rules."}
          </p>
          <div className="bg-black/50 p-4 rounded-2xl text-left mb-8">
            <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-2">How to fix:</p>
            <ol className="text-xs text-zinc-500 space-y-2 list-decimal pl-4">
              <li>Open Firebase Console</li>
              <li>Go to Firestore Database &gt; Rules</li>
              <li>Paste the rules provided by the assistant</li>
              <li>Click Publish</li>
            </ol>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all"
          >
            Retry Connection
          </button>
          <button 
            onClick={() => signOut()}
            className="w-full mt-4 text-zinc-500 hover:text-white text-sm font-medium"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  const renderView = () => {
    console.log('App: renderView, view:', view);
    switch (view) {
      case 'admin': return <AdminPanel onBack={() => setView('chat')} darkMode={darkMode} />;
      case 'pricing': return <Pricing onBack={() => setView('chat')} darkMode={darkMode} onSelectPlan={(plan) => { setSelectedPlan(plan); setView('payment'); }} />;
      case 'dashboard': return <Dashboard onBack={() => setView('chat')} darkMode={darkMode} onUpgrade={() => setView('pricing')} onBuilder={() => setView('builder')} onProjects={() => setView('projects')} />;
      case 'projects': return <ProjectHistory onBack={() => setView('dashboard')} darkMode={darkMode} onOpenProject={handleOpenProject} />;
      case 'community': return <CommunityShowcase onBack={() => setView('chat')} darkMode={darkMode} onOpenProject={handleOpenProject} />;
      case 'seo': return <SEOAnalyzer onBack={() => setView('chat')} darkMode={darkMode} />;
      case 'payment': return <Payment plan={selectedPlan} darkMode={darkMode} onBack={() => setView('pricing')} onSuccess={() => setView('dashboard')} />;
      case 'builder': return <AIBuilder onBack={() => setView('chat')} darkMode={darkMode} initialProject={currentProject} />;
      case 'translator': return <Translator onBack={() => setView('chat')} darkMode={darkMode} />;
      case 'math': return <MathSolver onBack={() => setView('chat')} darkMode={darkMode} />;
      case 'image-editor': return (
        <div className={cn("min-h-screen p-4 sm:p-8 overflow-y-auto w-full pb-32", darkMode ? "bg-[#050505] text-white" : "bg-zinc-50 text-zinc-900")}>
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
              <button onClick={() => setView('chat')} className={cn("p-2 rounded-full transition-colors", darkMode ? "hover:bg-zinc-800" : "hover:bg-zinc-200")}>
                <ArrowLeft className="w-6 h-6" />
              </button>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Wand2 className="text-purple-500" /> AI Image Editor
              </h1>
            </div>

            {!colabConfigured && !hasApiKey && (
              <div className="mb-8 p-4 bg-indigo-600/10 border border-indigo-500/20 rounded-2xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Zap className="w-5 h-5 text-indigo-500" />
                  <div>
                    <p className="text-sm font-bold">High Quality Mode</p>
                    <p className="text-xs text-zinc-400">Select a Gemini API key or configure Colab to enable high-quality image generation.</p>
                  </div>
                </div>
                <button 
                  onClick={() => ensureApiKey()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all"
                >
                  Select Key
                </button>
              </div>
            )}
            
            {colabConfigured && (
              <div className="mb-8 p-4 bg-emerald-600/10 border border-emerald-500/20 rounded-2xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Zap className="w-5 h-5 text-emerald-500" />
                  <div>
                    <p className="text-sm font-bold text-emerald-400">Colab AI Engine Connected</p>
                    <p className="text-xs text-zinc-400">Unlimited high-quality image generation is active.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">HQ Mode</span>
                  <button 
                    onClick={() => setHighQuality(!highQuality)}
                    className={cn(
                      "w-12 h-6 rounded-full transition-all relative",
                      highQuality ? "bg-emerald-600" : "bg-zinc-800"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                      highQuality ? "right-1" : "left-1"
                    )} />
                  </button>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div 
                onClick={() => !selectedImage && document.getElementById('editor-upload')?.click()}
                className={cn(
                  "aspect-square bg-zinc-900/50 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center p-8 backdrop-blur-xl relative overflow-hidden transition-all",
                  selectedImage ? "border-purple-500" : "border-zinc-800 hover:border-purple-500/50 cursor-pointer"
                )}
              >
                {selectedImage ? (
                  <>
                    <img 
                      src={`data:${selectedImage.mimeType};base64,${selectedImage.data}`} 
                      className="absolute inset-0 w-full h-full object-contain"
                      alt="To edit"
                    />
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedImage(null);
                      }}
                      className="absolute top-4 right-4 bg-red-500 text-white p-2 rounded-full shadow-xl hover:scale-110 transition-transform"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-16 h-16 text-zinc-700 mb-6" />
                    <h2 className="text-xl font-bold mb-2">Upload Image</h2>
                    <p className="text-zinc-500 text-sm">Select a photo to start editing</p>
                  </>
                )}
                <input 
                  type="file" 
                  id="editor-upload" 
                  className="hidden" 
                  onChange={handleFileUpload}
                  accept="image/*"
                />
              </div>

              <div className="bg-zinc-900/30 border border-zinc-800 rounded-3xl p-6 flex flex-col">
                <div className="flex items-center gap-2 mb-4 text-xs font-bold uppercase tracking-widest text-zinc-500">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  Instructions
                </div>
                <div className="flex-1 space-y-4 text-sm text-zinc-400">
                  <p>Tell the AI what you want to do with the image:</p>
                  <ul className="list-disc list-inside space-y-2">
                    <li>"Remove the background"</li>
                    <li>"Change the font of the text to a modern style"</li>
                    <li>"Make this a logo size (512x512)"</li>
                    <li>"Remove the text from this image"</li>
                    <li>"Add a sunset in the background"</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Chat Input for Image Editor */}
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4">
              <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 p-2 rounded-2xl shadow-2xl flex items-center gap-2">
                <input 
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Describe what to edit in the image..."
                  className="flex-1 bg-transparent border-none focus:ring-0 text-white px-4 py-2"
                />
                <button 
                  onClick={() => {
                    setChatMode('image');
                    handleSend();
                  }}
                  disabled={isGenerating || !selectedImage || !input.trim()}
                  className="bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-xl transition-all disabled:opacity-50"
                >
                  {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      );
      default: return (
        <>
          {/* Header */}
          <header className={cn("h-16 flex items-center justify-between px-6 border-b z-10", darkMode ? "bg-zinc-950/80 border-zinc-800" : "bg-white/80 border-zinc-200", "backdrop-blur-md")}>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 hover:bg-zinc-800/50 rounded-lg transition-colors"
              >
                {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
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
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold">
                <Zap className="w-3 h-3" />
                {profile?.credits} CREDITS
              </div>
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

            {/* Suggested Quick Actions */}

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
                    { icon: <Layout className="text-emerald-400" />, title: "Make Web / App", desc: "Build a professional website or app", action: () => setView('builder') },
                    { icon: <ImageIcon className="text-emerald-500" />, title: "Generate an image", desc: "Describe what you want to see", action: () => { setActiveChatId(null); setMessages([]); setChatMode('image'); setView('chat'); setInput(''); } },
                    { icon: <Wand2 className="text-purple-500" />, title: "AI Image Editor", desc: "Edit or modify your existing images", action: () => setView('image-editor') },
                    { icon: <History className="text-amber-500" />, title: "Math Solution", desc: "Step-by-step calculus solution", action: () => setView('math') },
                    { icon: <UserIcon className="text-rose-500" />, title: "Translator", desc: "English to Bengali translation", action: () => setView('translator') },
                    { icon: <Gift className="text-indigo-500" />, title: "Daily Credits", desc: "Claim your 10 daily free credits", action: handleClaimDaily }
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
                    onPlayVoice={(text) => speakText(text, msg.id)}
                    onDelete={deleteMessage}
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
            "absolute bottom-16 lg:bottom-0 left-0 right-0 p-4 z-20",
            darkMode ? "bg-gradient-to-t from-[#050505] via-[#050505] to-transparent" : "bg-gradient-to-t from-zinc-50 via-zinc-50 to-transparent"
          )}>
            <div className="max-w-4xl mx-auto">
              {isProcessingImage && (
                <div className="mb-2 p-2 bg-zinc-900/80 rounded-xl border border-zinc-800 flex items-center gap-2 text-xs text-zinc-400 animate-pulse">
                  <Sparkles className="w-3 h-3 text-indigo-500" />
                  Processing Image...
                </div>
              )}
              {selectedImage && (
                <div className="mb-2 relative inline-block">
                  <img 
                    src={`data:${selectedImage.mimeType};base64,${selectedImage.data}`} 
                    className="h-16 w-16 object-cover rounded-xl border-2 border-indigo-500" 
                    alt="Selected" 
                  />
                  <button 
                    onClick={() => setSelectedImage(null)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg"
                  >
                    <X className="w-3 h-3" />
                  </button>
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
                          Upload File (PDF/Img)
                          <input 
                            id="plus-menu-file-upload"
                            type="file" 
                            accept="image/*,.pdf,.txt" 
                            className="hidden" 
                            onChange={(e) => {
                              handleFileUpload(e);
                              setIsPlusMenuOpen(false);
                            }}
                          />
                        </label>
                        <button 
                          onClick={() => {
                            setView('image-editor');
                            setIsPlusMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-3 p-3 hover:bg-zinc-800 rounded-xl transition-colors text-sm font-medium"
                        >
                          <Wand2 className="w-4 h-4 text-purple-500" />
                          AI Image Editor
                        </button>
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
                  <label 
                    htmlFor="direct-image-upload"
                    className="p-2 hover:bg-zinc-800 rounded-xl transition-colors text-zinc-400 hover:text-indigo-500 cursor-pointer lg:hidden"
                  >
                    <ImageIcon className="w-5 h-5" />
                    <input 
                      id="direct-image-upload"
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleImageSelect}
                    />
                  </label>
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
                    disabled={(!input.trim() && !selectedImage) || isGenerating}
                    className={cn(
                      "p-2.5 rounded-xl transition-all flex items-center gap-2",
                      (input.trim() || selectedImage) && !isGenerating 
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30" 
                        : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                    )}
                  >
                    {isGenerating ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        {isRefining && <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:inline">Refining...</span>}
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
    }
  };

  return (
    <div className={cn("flex h-screen overflow-hidden transition-colors duration-300 relative", darkMode ? "bg-[#050505] text-white" : "bg-zinc-50 text-zinc-900")}>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isSidebarOpen && window.innerWidth < 1024 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm" 
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {isSidebarOpen && (
          <motion.aside
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            className={cn(
              "fixed lg:relative w-72 h-full flex flex-col border-r transition-colors z-50",
              darkMode ? "bg-zinc-950 border-zinc-800" : "bg-white border-zinc-200"
            )}
          >
            <div className="p-4 flex items-center justify-between">
              <button
                onClick={() => {
                  startNewChat();
                  if (window.innerWidth < 1024) setIsSidebarOpen(false);
                }}
                className="flex-1 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-xl transition-all font-medium shadow-lg shadow-indigo-500/20"
              >
                <Plus className="w-5 h-5" /> New Chat
              </button>
              <button 
                onClick={() => setIsSidebarOpen(false)}
                className="lg:hidden p-2 ml-2 hover:bg-zinc-800 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">

              {(profile?.role === 'admin' || user?.email === 'topupstar71@gmail.com' || user?.email === 'saifulislam.20100409@fluxion.ai' || user?.uid === 'QWGuFU4ulMVjCWNMUUOHqmKImsF3') && (
                <button
                  onClick={() => {
                    setView('admin');
                    setIsSidebarOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all group mb-2",
                    view === 'admin' && "bg-zinc-800 text-white"
                  )}
                >
                  <Shield className="w-5 h-5 group-hover:text-indigo-500 transition-colors" />
                  <span className="font-medium">Admin Panel</span>
                </button>
              )}
              {chats.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => {
                    setActiveChatId(chat.id);
                    if (window.innerWidth < 1024) setIsSidebarOpen(false);
                  }}
                  className={cn(
                    "group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all",
                    activeChatId === chat.id 
                      ? (darkMode ? "bg-zinc-800" : "bg-zinc-100") 
                      : (darkMode ? "hover:bg-zinc-900" : "hover:bg-zinc-50")
                  )}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <History className="w-4 h-4 text-zinc-500 shrink-0" />
                    <span className="truncate text-sm font-medium">{chat.title}</span>
                  </div>
                  <button 
                    onClick={(e) => deleteChat(chat.id, e)}
                    className="lg:opacity-0 lg:group-hover:opacity-100 p-2 hover:text-red-500 transition-all text-zinc-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className={cn("p-4 border-t space-y-2", darkMode ? "border-zinc-800" : "border-zinc-200")}>
              <div className="flex items-center gap-3 p-2 rounded-xl bg-zinc-900/50">
                <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center font-bold">
                  {profile?.name?.[0]}
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-bold truncate">{profile?.name}</p>
                  <p className="text-xs text-zinc-500 capitalize">{profile?.plan} Plan • {profile?.credits} credits</p>
                </div>
              </div>
              <div className="flex gap-2 mb-2">
                <button 
                  onClick={async () => {
                    const success = await claimDailyCredits();
                    if (success) {
                      alert('100 credits claimed successfully!');
                    } else {
                      alert('You have already claimed your daily credits or an error occurred.');
                    }
                  }}
                  className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl transition-all text-sm"
                >
                  <Gift className="w-4 h-4" /> Daily
                </button>
                <button 
                  onClick={() => setView('pricing')}
                  className="flex-1 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-black font-bold py-2 rounded-xl transition-all text-sm"
                >
                  <Zap className="w-4 h-4" /> Credits
                </button>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={signOut}
                  className={cn("flex-1 p-2 rounded-lg flex items-center justify-center text-red-500 transition-colors hover:bg-zinc-800")}
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-zinc-950/90 backdrop-blur-xl border-t border-zinc-800 z-40 flex items-center justify-around p-2 pb-safe">
        <button 
          onClick={() => {
            setActiveChatId(null);
            setMessages([]);
            setView('chat');
            setChatMode('general');
            setInput('');
          }}
          className={cn(
            "flex flex-col items-center gap-1 p-2 transition-colors",
            view === 'chat' ? "text-indigo-500" : "text-zinc-500"
          )}
        >
          <Plus className="w-5 h-5" />
          <span className="text-[10px] font-medium">New Chat</span>
        </button>
        <button 
          onClick={() => setView('dashboard')}
          className={cn(
            "flex flex-col items-center gap-1 p-2 transition-colors",
            view === 'dashboard' ? "text-indigo-500" : "text-zinc-500"
          )}
        >
          <Layout className="w-5 h-5" />
          <span className="text-[10px] font-medium">Dashboard</span>
        </button>
        <button 
          onClick={() => setView('pricing')}
          className={cn(
            "flex flex-col items-center gap-1 p-2 transition-colors",
            view === 'pricing' ? "text-indigo-500" : "text-zinc-500"
          )}
        >
          <CreditCard className="w-5 h-5" />
          <span className="text-[10px] font-medium">Pricing</span>
        </button>
      </div>

      {/* Main Content */}
      <main className={cn(
        "flex-1 flex flex-col relative pb-16 lg:pb-0",
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
