import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Calendar, CreditCard, ArrowLeft, Search, Zap, Trash2, Copy, Check, History, BarChart3, TrendingUp, Users, DollarSign } from 'lucide-react';
import { useAuth, handleFirestoreError, OperationType } from '../lib/AuthContext';
import { db, auth } from '../lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc, addDoc, orderBy, setDoc, limit } from 'firebase/firestore';
import { cn } from '../lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell } from 'recharts';

interface UserProfile {
  uid: string;
  name: string;
  birthday: string;
  plan: string;
  credits: number;
  role: string;
  expire_date: string | null;
  createdAt?: string;
}

interface PaymentRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  planId: number;
  planName: string;
  price: number;
  method: string;
  transactionId: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

interface ButterflyChat {
  id: string;
  userId: string;
  title: string;
  createdAt: any;
  updatedAt: any;
  userName?: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  type: 'text' | 'image';
  timestamp: any;
}

export default function AdminPanel({ onBack, darkMode }: { onBack: () => void, darkMode?: boolean }) {
  console.log('AdminPanel: Initializing...');
  const { profile, resetSystem } = useAuth();
  console.log('AdminPanel: Profile:', profile?.name, profile?.role);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [butterflyChats, setButterflyChats] = useState<ButterflyChat[]>([]);
  const [selectedButterflyChat, setSelectedButterflyChat] = useState<string | null>(null);
  const [butterflyMessages, setButterflyMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isResetting, setIsResetting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'payments' | 'butterfly' | 'analytics' | 'logs' | 'settings'>('users');
  const [colabUrl, setColabUrl] = useState('');
  const [isSavingColab, setIsSavingColab] = useState(false);
  const [colabStatus, setColabStatus] = useState<{ configured: boolean, timestamp?: string } | null>(null);
  const [systemLogs, setSystemLogs] = useState<any[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);

  const theme = darkMode ? 'dark' : 'light';

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      console.log('Fetching admin data...', {
        email: auth.currentUser?.email,
        uid: auth.currentUser?.uid,
        role: profile?.role
      });
      
      // Fetch Users
      let usersList: UserProfile[] = [];
      try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        usersSnapshot.forEach((doc) => {
          usersList.push({ uid: doc.id, ...doc.data() } as UserProfile);
        });
        setUsers(usersList);
      } catch (err: any) {
        handleFirestoreError(err, OperationType.LIST, 'users');
        throw new Error(`Users fetch failed: ${err.message}`);
      }

      // Fetch Payment Requests
      try {
        const paymentsSnapshot = await getDocs(query(collection(db, 'payment_requests')));
        const paymentsList: PaymentRequest[] = [];
        paymentsSnapshot.forEach((doc) => {
          paymentsList.push({ id: doc.id, ...doc.data() } as PaymentRequest);
        });
        setPaymentRequests(paymentsList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      } catch (err: any) {
        handleFirestoreError(err, OperationType.LIST, 'payment_requests');
        throw new Error(`Payments fetch failed: ${err.message}`);
      }

        // Fetch Butterfly Chats
        try {
          const butterflySnapshot = await getDocs(query(collection(db, 'chats'), where('isButterflySession', '==', true)));
          const butterflyList: ButterflyChat[] = [];
          butterflySnapshot.forEach((doc) => {
            const data = doc.data();
            const user = usersList.find(u => u.uid === data.userId);
            butterflyList.push({ id: doc.id, ...data, userName: user?.name || 'Unknown User' } as ButterflyChat);
          });
          setButterflyChats(butterflyList.sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0)));
        } catch (err: any) {
          handleFirestoreError(err, OperationType.LIST, 'chats-butterfly');
        }

          // Fetch System Logs
          try {
            const allLogsSnapshot = await getDocs(query(collection(db, 'credit_logs'), orderBy('timestamp', 'desc'), limit(100)));
            const allLogs: any[] = [];
            allLogsSnapshot.forEach(doc => {
              const data = doc.data();
              const user = usersList.find(u => u.uid === data.userId);
              allLogs.push({ id: doc.id, ...data, userName: user?.name || 'Unknown User' });
            });
            setSystemLogs(allLogs);
          } catch (err: any) {
            handleFirestoreError(err, OperationType.LIST, 'credit_logs-all');
          }

          // Fetch Analytics Data
          try {
            const logsSnapshot = await getDocs(query(collection(db, 'credit_logs'), orderBy('timestamp', 'desc'), limit(1000)));
            const logs: any[] = [];
            logsSnapshot.forEach(doc => logs.push(doc.data()));

            const dailyUsage: any = {};
            const userGrowth: any = {};
            
            logs.filter(l => l.amount < 0).forEach(l => {
              const date = new Date(l.timestamp).toLocaleDateString();
              dailyUsage[date] = (dailyUsage[date] || 0) + Math.abs(l.amount);
            });

            // Calculate user growth over time
            const growthMap: any = {};
            usersList.forEach(u => {
              if (u.createdAt) {
                const date = new Date(u.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
                growthMap[date] = (growthMap[date] || 0) + 1;
              }
            });

            const growthDataList = Object.keys(growthMap).map(date => ({
              date,
              users: growthMap[date]
            })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            // Cumulative growth
            let cumulative = 0;
            const cumulativeGrowth = growthDataList.map(d => {
              cumulative += d.users;
              return { ...d, users: cumulative };
            });

            const chartData = Object.keys(dailyUsage).map(date => ({
              date,
              usage: dailyUsage[date]
            })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            const planDistribution = {
              free: usersList.filter(u => u.plan === 'free').length,
              standard: usersList.filter(u => u.plan === 'standard').length,
              customizable: usersList.filter(u => u.plan === 'customizable').length,
              extended: usersList.filter(u => u.plan === 'extended').length,
            };

            const pieData = Object.keys(planDistribution).map(key => ({
              name: key,
              value: planDistribution[key as keyof typeof planDistribution]
            }));

            const methodDistribution: any = {};
            paymentRequests.filter(r => r.status === 'approved').forEach(r => {
              methodDistribution[r.method] = (methodDistribution[r.method] || 0) + r.price;
            });

            const methodPieData = Object.keys(methodDistribution).map(key => ({
              name: key,
              value: methodDistribution[key]
            }));

            setAnalyticsData({
              chartData,
              pieData,
              methodPieData,
              growthData: cumulativeGrowth.length > 0 ? cumulativeGrowth : [
                { date: 'Jan', users: Math.floor(usersList.length * 0.2) },
                { date: 'Feb', users: Math.floor(usersList.length * 0.5) },
                { date: 'Mar', users: usersList.length },
              ],
              totalCreditsUsed: logs.filter(l => l.amount < 0).reduce((acc, l) => acc + Math.abs(l.amount), 0),
              totalRevenue: paymentRequests.filter(r => r.status === 'approved').reduce((acc, r) => acc + r.price, 0),
              totalUsers: usersList.length,
              pendingPayments: paymentRequests.filter(r => r.status === 'pending').length
            });
          } catch (err) {
            console.error('Error fetching analytics:', err);
          }

        console.log('Admin data fetched successfully');
    } catch (error: any) {
      console.error('Fetch data error:', error);
      alert('Failed to fetch data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('AdminPanel: useEffect mounting');
    const checkColabStatus = async () => {
      try {
        const res = await fetch('/api/health');
        const data = await res.json();
        setColabStatus({ configured: data.colabConfigured, timestamp: data.timestamp });
      } catch (e) {
        console.error("Failed to check Colab status:", e);
      }
    };
    fetchData();
    checkColabStatus();
  }, []);

  const handleSaveColabUrl = async () => {
    if (!colabUrl) return;
    setIsSavingColab(true);
    try {
      const res = await fetch('/api/admin/set-colab-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: colabUrl })
      });
      const data = await res.json();
      if (data.success) {
        setColabStatus({ configured: true, timestamp: new Date().toISOString() });
        alert("Colab URL updated successfully!");
      } else {
        alert("Failed to update Colab URL: " + data.error);
      }
    } catch (e: any) {
      console.error("Error saving Colab URL:", e);
      alert("Error saving Colab URL: " + e.message);
    } finally {
      setIsSavingColab(false);
    }
  };

  const handleApprovePayment = async (request: PaymentRequest) => {
    try {
      const plans = {
        1: { name: 'standard', credits: 1000 },
        2: { name: 'customizable', credits: 3000 },
        3: { name: 'extended', credits: 6000 }
      };
      
      const selectedPlan = plans[request.planId as keyof typeof plans];
      if (!selectedPlan) return;

      const expireDate = new Date();
      expireDate.setDate(expireDate.getDate() + 30);

      // 1. Update User Plan
      const userRef = doc(db, 'users', request.userId);
      await updateDoc(userRef, {
        plan: selectedPlan.name,
        credits: selectedPlan.credits,
        expire_date: expireDate.toISOString()
      });

      // 2. Update Request Status
      const requestRef = doc(db, 'payment_requests', request.id);
      await updateDoc(requestRef, { status: 'approved' });

      setPaymentRequests(paymentRequests.map(r => r.id === request.id ? { ...r, status: 'approved' } : r));
      setUsers(users.map(u => u.uid === request.userId ? { ...u, plan: selectedPlan.name, credits: selectedPlan.credits, expire_date: expireDate.toISOString() } : u));
      
      alert('Payment approved and plan activated!');
    } catch (error) {
      console.error('Approve payment error:', error);
      alert('Failed to approve payment');
    }
  };

  const handleRejectPayment = async (requestId: string) => {
    try {
      const requestRef = doc(db, 'payment_requests', requestId);
      await updateDoc(requestRef, { status: 'rejected' });
      setPaymentRequests(paymentRequests.map(r => r.id === requestId ? { ...r, status: 'rejected' } : r));
    } catch (error) {
      console.error('Reject payment error:', error);
      alert('Failed to reject payment');
    }
  };

  const fetchButterflyMessages = async (chatId: string) => {
    setSelectedButterflyChat(chatId);
    try {
      const q = query(collection(db, 'messages'), where('chatId', '==', chatId), orderBy('timestamp', 'asc'));
      const snapshot = await getDocs(q);
      const msgs: ChatMessage[] = [];
      snapshot.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() } as ChatMessage);
      });
      setButterflyMessages(msgs);
    } catch (error) {
      console.error('Fetch butterfly messages error:', error);
    }
  };

  const handleDeleteRequest = async (requestId: string) => {
    if (!confirm('Delete this request?')) return;
    try {
      await deleteDoc(doc(db, 'payment_requests', requestId));
      setPaymentRequests(paymentRequests.filter(r => r.id !== requestId));
    } catch (error) {
      console.error('Delete request error:', error);
    }
  };

  const handleUpdatePlan = async (uid: string, plan: string, credits: number) => {
    try {
      const userRef = doc(db, 'users', uid);
      const expireDate = new Date();
      expireDate.setDate(expireDate.getDate() + 30);
      
      await updateDoc(userRef, {
        plan,
        credits,
        expire_date: expireDate.toISOString()
      });
      
      setUsers(users.map(u => u.uid === uid ? { ...u, plan, credits, expire_date: expireDate.toISOString() } : u));
    } catch (error) {
      console.error('Update plan error:', error);
      alert('Failed to update plan');
    }
  };

  const handleDeleteUser = async (uid: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await deleteDoc(doc(db, 'users', uid));
      setUsers(users.filter(u => u.uid !== uid));
    } catch (error) {
      console.error('Delete user error:', error);
      alert('Failed to delete user');
    }
  };

  const handleClearAllChats = async () => {
    if (!confirm('Are you sure you want to delete ALL your chats? This cannot be undone.')) return;
    try {
      const q = query(collection(db, 'chats'), where('userId', '==', auth.currentUser?.uid));
      const snapshot = await getDocs(q);
      const deletePromises = snapshot.docs.map(d => deleteDoc(doc(db, 'chats', d.id)));
      await Promise.all(deletePromises);
      alert('All your chats have been deleted.');
      window.location.reload();
    } catch (error: any) {
      alert('Failed to delete chats: ' + error.message);
    }
  };

  const handleSystemReset = async () => {
    const confirm1 = confirm('⚠️ CRITICAL WARNING: This will delete ALL users, ALL chats, ALL messages, and ALL payment requests. Only your admin account will remain. Continue?');
    if (!confirm1) return;
    
    const confirm2 = confirm('ARE YOU ABSOLUTELY SURE? This action is irreversible and will wipe the entire system history.');
    if (!confirm2) return;

    setIsResetting(true);
    try {
      await resetSystem();
      alert('System Reset Complete! All history has been wiped.');
      fetchData();
    } catch (error: any) {
      alert('Reset failed: ' + error.message);
    } finally {
      setIsResetting(false);
    }
  };

  const handleFixPermissions = async () => {
    if (!auth.currentUser) return;
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await setDoc(userRef, { role: 'admin' }, { merge: true });
      alert('SUCCESS: Your role has been updated to "admin". Please refresh the page or click "Refresh Data".');
      fetchData();
    } catch (err: any) {
      console.error('Fix Permissions Error:', err);
      alert('Fix Permissions Error: ' + err.message);
    }
  };

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.uid?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  console.log('AdminPanel: Rendering...', { loading, activeTab, usersCount: users.length });
  
  return (
    <div className={cn("min-h-screen p-4 sm:p-8 overflow-y-auto transition-colors duration-300", darkMode ? "bg-[#050505] text-white" : "bg-zinc-50 text-zinc-900")}>
      <div className="max-w-6xl mx-auto">
        <div className={cn("mb-8 p-4 border rounded-2xl", darkMode ? "bg-indigo-600/10 border-indigo-500/30" : "bg-indigo-50 border-indigo-200")}>
          <h1 className={cn("text-xl font-bold", darkMode ? "text-indigo-400" : "text-indigo-600")}>Admin Panel Debug Mode</h1>
          <p className={cn("text-sm", darkMode ? "text-zinc-400" : "text-zinc-600")}>If you see this, the component is rendering. Logged in as: {auth.currentUser?.email}</p>
        </div>
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className={cn("p-2 rounded-full transition-colors", darkMode ? "hover:bg-zinc-800" : "hover:bg-zinc-200")}>
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Shield className="text-indigo-500" /> Admin Panel
            </h1>
            <div className="flex flex-wrap items-center gap-3 ml-4">
              <button 
                onClick={handleFixPermissions}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 rounded-lg transition-all text-[10px] font-bold shadow-lg flex items-center gap-2 text-white"
              >
                <Shield className="w-3 h-3" /> Fix Permissions
              </button>
              <button 
                onClick={handleClearAllChats}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded-lg transition-all text-[10px] font-bold shadow-lg flex items-center gap-2 text-white"
              >
                <Trash2 className="w-3 h-3" /> Clear My Chats
              </button>
              <button 
                onClick={handleSystemReset}
                disabled={isResetting}
                className="px-3 py-1.5 bg-red-900 hover:bg-red-800 rounded-lg transition-all text-[10px] font-bold shadow-lg flex items-center gap-2 border border-red-500/50 text-white"
              >
                <Trash2 className="w-3 h-3" /> {isResetting ? 'Resetting...' : 'SYSTEM RESET'}
              </button>
              <button 
                onClick={fetchData}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-all text-[10px] font-bold shadow-lg flex items-center gap-2 text-white"
              >
                <History className="w-3 h-3" /> Refresh Data
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className={cn("flex p-1 rounded-xl border", darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200 shadow-sm")}>
              <button 
                onClick={() => setActiveTab('users')}
                className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-all", activeTab === 'users' ? "bg-indigo-600 text-white" : "text-zinc-500 hover:text-zinc-300")}
              >
                Users
              </button>
              <button 
                onClick={() => setActiveTab('payments')}
                className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2", activeTab === 'payments' ? "bg-indigo-600 text-white" : "text-zinc-500 hover:text-zinc-300")}
              >
                Payments
                {paymentRequests.filter(r => r.status === 'pending').length > 0 && (
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                )}
              </button>
              <button 
                onClick={() => setActiveTab('butterfly')}
                className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2", activeTab === 'butterfly' ? "bg-indigo-600 text-white" : "text-zinc-500 hover:text-zinc-300")}
              >
                Butterfly Logs
                {butterflyChats.length > 0 && (
                  <span className="w-2 h-2 bg-pink-500 rounded-full" />
                )}
              </button>
              <button 
                onClick={() => setActiveTab('logs')}
                className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2", activeTab === 'logs' ? "bg-indigo-600 text-white" : "text-zinc-500 hover:text-zinc-300")}
              >
                System Logs
                <History className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setActiveTab('analytics')}
                className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2", activeTab === 'analytics' ? "bg-indigo-600 text-white" : "text-zinc-500 hover:text-zinc-300")}
              >
                Analytics
                <BarChart3 className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setActiveTab('settings')}
                className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2", activeTab === 'settings' ? "bg-indigo-600 text-white" : "text-zinc-500 hover:text-zinc-300")}
              >
                Settings
                <Zap className="w-4 h-4" />
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input 
                type="text" 
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={cn(
                  "border rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64 transition-all",
                  darkMode ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-zinc-200 text-zinc-900 shadow-sm"
                )}
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        ) : activeTab === 'users' ? (
          <div className="grid gap-4">
            {filteredUsers.map((u) => (
              <motion.div 
                key={u.uid}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "border p-6 rounded-3xl flex flex-col lg:flex-row lg:items-center justify-between gap-6 backdrop-blur-xl transition-all",
                  darkMode ? "bg-zinc-900/50 border-zinc-800" : "bg-white border-zinc-200 shadow-sm"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center font-bold text-2xl shadow-lg shadow-indigo-600/20 text-white">
                    {u.name?.[0] || 'U'}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      {u.name}
                      {u.role === 'admin' && <Shield className="w-4 h-4 text-indigo-500" />}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500 mt-1">
                      <span className={cn("flex items-center gap-1 uppercase tracking-widest font-bold", darkMode ? "text-indigo-400" : "text-indigo-600")}>{u.plan} Plan</span>
                      <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> {u.credits} Credits</span>
                      <span className="flex items-center gap-1 text-zinc-400 font-medium">🎂 {u.birthday || 'N/A'}</span>
                      <span className="text-[10px] text-zinc-600 truncate max-w-[150px]">{u.uid}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleUpdatePlan(u.uid, 'free', 100)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-bold transition-all",
                      u.plan === 'free' ? "bg-zinc-800 text-white" : (darkMode ? "bg-zinc-900 text-zinc-500 hover:bg-zinc-800" : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200")
                    )}
                  >
                    Free
                  </button>
                  <button
                    onClick={() => handleUpdatePlan(u.uid, 'standard', 1000)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-bold transition-all",
                      u.plan === 'standard' ? "bg-indigo-600 text-white" : (darkMode ? "bg-zinc-900 text-zinc-500 hover:bg-zinc-800" : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200")
                    )}
                  >
                    Standard
                  </button>
                  <button
                    onClick={() => handleUpdatePlan(u.uid, 'customizable', 3000)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-bold transition-all",
                      u.plan === 'customizable' ? "bg-amber-600 text-white" : (darkMode ? "bg-zinc-900 text-zinc-500 hover:bg-zinc-800" : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200")
                    )}
                  >
                    Customizable
                  </button>
                  <button
                    onClick={() => handleUpdatePlan(u.uid, 'extended', 6000)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-bold transition-all",
                      u.plan === 'extended' ? "bg-emerald-600 text-white" : (darkMode ? "bg-zinc-900 text-zinc-500 hover:bg-zinc-800" : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200")
                    )}
                  >
                    Extended
                  </button>
                  <button 
                    onClick={() => handleDeleteUser(u.uid)}
                    className="p-2.5 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all ml-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-2 mt-4 lg:mt-0">
                  <input 
                    type="number" 
                    placeholder="Custom Credits"
                    className={cn(
                      "border rounded-xl py-2 px-3 text-xs w-32 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all",
                      darkMode ? "bg-zinc-800 border-zinc-700 text-white" : "bg-white border-zinc-200 text-zinc-900 shadow-sm"
                    )}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const val = parseInt((e.target as HTMLInputElement).value);
                        if (!isNaN(val)) {
                          handleUpdatePlan(u.uid, u.plan, val);
                          (e.target as HTMLInputElement).value = '';
                        }
                      }
                    }}
                  />
                  <p className="text-[10px] text-zinc-500 italic">Press Enter</p>
                </div>
              </motion.div>
            ))}
          </div>
        ) : activeTab === 'payments' ? (
          <div className="grid gap-4">
            {paymentRequests.length === 0 ? (
              <div className={cn("border p-12 rounded-3xl text-center", darkMode ? "bg-zinc-900/50 border-zinc-800" : "bg-white border-zinc-200 shadow-sm")}>
                <CreditCard className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                <p className="text-zinc-500">No payment requests found.</p>
              </div>
            ) : (
              paymentRequests.map((req) => (
                <motion.div 
                  key={req.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "border p-6 rounded-3xl flex flex-col lg:flex-row lg:items-center justify-between gap-6 backdrop-blur-xl transition-all",
                    darkMode ? "bg-zinc-900/50 border-zinc-800" : "bg-white border-zinc-200 shadow-sm"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-2xl shadow-lg text-white",
                      req.method === 'bkash' ? "bg-pink-600 shadow-pink-600/20" : "bg-orange-600 shadow-orange-600/20"
                    )}>
                      {req.method[0].toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg flex items-center gap-2">
                        {req.userName}
                        <span className={cn(
                          "text-[10px] px-2 py-0.5 rounded-full uppercase font-bold",
                          req.status === 'pending' ? "bg-amber-500/10 text-amber-500" : 
                          req.status === 'approved' ? "bg-emerald-500/10 text-emerald-500" : 
                          "bg-red-500/10 text-red-500"
                        )}>
                          {req.status}
                        </span>
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500 mt-1">
                        <span className={cn("font-bold", darkMode ? "text-white" : "text-zinc-900")}>৳{req.price}</span>
                        <span className={cn("uppercase tracking-widest font-bold", darkMode ? "text-indigo-400" : "text-indigo-600")}>{req.planName} Plan</span>
                        <span className="text-zinc-400 flex items-center gap-2">
                          TXID: <span className={cn("font-mono", darkMode ? "text-white" : "text-zinc-900")}>{req.transactionId}</span>
                          <button 
                            onClick={() => copyToClipboard(req.transactionId, req.id)}
                            className="p-1 hover:bg-zinc-800 rounded transition-colors text-indigo-400"
                            title="Copy Transaction ID"
                          >
                            {copiedId === req.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {req.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleApprovePayment(req)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleRejectPayment(req.id)}
                          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    <button 
                      onClick={() => handleDeleteRequest(req.id)}
                      className={cn(
                        "p-2.5 rounded-xl transition-all",
                        darkMode ? "bg-zinc-800 text-zinc-500 hover:bg-red-500 hover:text-white" : "bg-zinc-100 text-zinc-500 hover:bg-red-500 hover:text-white"
                      )}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        ) : activeTab === 'analytics' ? (
          <div className="space-y-8">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className={cn("border p-6 rounded-3xl transition-all", darkMode ? "bg-zinc-900/50 border-zinc-800" : "bg-white border-zinc-200 shadow-sm")}>
                <div className="flex items-center gap-3 text-zinc-500 mb-2">
                  <Users className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-widest">Total Users</span>
                </div>
                <p className="text-3xl font-bold">{analyticsData?.totalUsers || 0}</p>
              </div>
              <div className={cn("border p-6 rounded-3xl transition-all", darkMode ? "bg-zinc-900/50 border-zinc-800" : "bg-white border-zinc-200 shadow-sm")}>
                <div className="flex items-center gap-3 text-emerald-500 mb-2">
                  <DollarSign className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">Total Revenue</span>
                </div>
                <p className="text-3xl font-bold text-emerald-500">৳{analyticsData?.totalRevenue || 0}</p>
              </div>
              <div className={cn("border p-6 rounded-3xl transition-all", darkMode ? "bg-zinc-900/50 border-zinc-800" : "bg-white border-zinc-200 shadow-sm")}>
                <div className="flex items-center gap-3 text-indigo-500 mb-2">
                  <Zap className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">Credits Used</span>
                </div>
                <p className="text-3xl font-bold text-indigo-500">{analyticsData?.totalCreditsUsed || 0}</p>
              </div>
              <div className={cn("border p-6 rounded-3xl transition-all", darkMode ? "bg-zinc-900/50 border-zinc-800" : "bg-white border-zinc-200 shadow-sm")}>
                <div className="flex items-center gap-3 text-amber-500 mb-2">
                  <CreditCard className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">Pending Payments</span>
                </div>
                <p className="text-3xl font-bold text-amber-500">{analyticsData?.pendingPayments || 0}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Credit Usage Chart */}
              <div className={cn("border p-8 rounded-3xl transition-all", darkMode ? "bg-zinc-900/50 border-zinc-800" : "bg-white border-zinc-200 shadow-sm")}>
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-500" /> Credit Usage Over Time
                </h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analyticsData?.chartData}>
                      <defs>
                        <linearGradient id="colorUsage" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#1f2937" : "#e5e7eb"} vertical={false} />
                      <XAxis dataKey="date" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: darkMode ? '#111827' : '#ffffff', border: darkMode ? '1px solid #374151' : '1px solid #e5e7eb', borderRadius: '12px' }}
                        itemStyle={{ color: '#6366f1' }}
                      />
                      <Area type="monotone" dataKey="usage" stroke="#6366f1" fillOpacity={1} fill="url(#colorUsage)" strokeWidth={3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* User Growth Chart */}
              <div className={cn("border p-8 rounded-3xl transition-all", darkMode ? "bg-zinc-900/50 border-zinc-800" : "bg-white border-zinc-200 shadow-sm")}>
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-indigo-500" /> User Growth
                </h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analyticsData?.growthData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#1f2937" : "#e5e7eb"} vertical={false} />
                      <XAxis dataKey="date" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: darkMode ? '#111827' : '#ffffff', border: darkMode ? '1px solid #374151' : '1px solid #e5e7eb', borderRadius: '12px' }}
                      />
                      <Line type="monotone" dataKey="users" stroke="#6366f1" strokeWidth={3} dot={{ fill: '#6366f1', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Plan Distribution Chart */}
              <div className={cn("border p-8 rounded-3xl transition-all", darkMode ? "bg-zinc-900/50 border-zinc-800" : "bg-white border-zinc-200 shadow-sm")}>
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-500" /> Plan Distribution
                </h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analyticsData?.pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {analyticsData?.pieData?.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={['#6366f1', '#10b981', '#f59e0b', '#ef4444'][index % 4]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: darkMode ? '#111827' : '#ffffff', border: darkMode ? '1px solid #374151' : '1px solid #e5e7eb', borderRadius: '12px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-4 mt-4">
                  {analyticsData?.pieData?.map((entry: any, index: number) => (
                    <div key={entry.name} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#ef4444'][index % 4] }} />
                      <span className="text-[10px] uppercase font-bold text-zinc-500">{entry.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Revenue by Method Chart */}
              <div className={cn("border p-8 rounded-3xl transition-all", darkMode ? "bg-zinc-900/50 border-zinc-800" : "bg-white border-zinc-200 shadow-sm")}>
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-pink-500" /> Revenue by Method
                </h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analyticsData?.methodPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {analyticsData?.methodPieData?.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={['#db2777', '#f97316', '#6366f1', '#10b981'][index % 4]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: darkMode ? '#111827' : '#ffffff', border: darkMode ? '1px solid #374151' : '1px solid #e5e7eb', borderRadius: '12px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-4 mt-4">
                  {analyticsData?.methodPieData?.map((entry: any, index: number) => (
                    <div key={entry.name} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ['#db2777', '#f97316', '#6366f1', '#10b981'][index % 4] }} />
                      <span className="text-[10px] uppercase font-bold text-zinc-500">{entry.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'logs' ? (
          <div className={cn("border rounded-3xl overflow-hidden", darkMode ? "bg-zinc-900/50 border-zinc-800" : "bg-white border-zinc-200 shadow-sm")}>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className={cn("border-b", darkMode ? "border-zinc-800 bg-zinc-900/80" : "border-zinc-100 bg-zinc-50")}>
                    <th className="p-4 text-xs font-bold uppercase tracking-widest text-zinc-500">User</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-widest text-zinc-500">Amount</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-widest text-zinc-500">Reason</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-widest text-zinc-500">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {systemLogs.map((log) => (
                    <tr key={log.id} className={cn("border-b transition-colors", darkMode ? "border-zinc-800/50 hover:bg-zinc-800/30" : "border-zinc-50 hover:bg-zinc-50/50")}>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-sm">{log.userName}</span>
                          <span className="text-[10px] text-zinc-600 font-mono">{log.userId}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={cn(
                          "font-bold text-sm px-2 py-1 rounded-lg",
                          log.amount > 0 ? "text-emerald-500 bg-emerald-500/10" : "text-red-500 bg-red-500/10"
                        )}>
                          {log.amount > 0 ? '+' : ''}{log.amount}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-zinc-400">{log.reason}</span>
                      </td>
                      <td className="p-4">
                        <span className="text-xs text-zinc-500">{new Date(log.timestamp).toLocaleString()}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {systemLogs.length === 0 && (
              <div className="p-12 text-center text-zinc-500">No logs found.</div>
            )}
          </div>
        ) : activeTab === 'settings' ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn("p-8 rounded-3xl border", darkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200 shadow-xl")}
          >
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center gap-4 mb-8">
                <div className={cn("p-4 rounded-2xl", darkMode ? "bg-indigo-600/20" : "bg-indigo-50")}>
                  <Zap className="w-8 h-8 text-indigo-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">AI Image Generator Settings</h2>
                  <p className={cn("text-sm", darkMode ? "text-zinc-400" : "text-zinc-500")}>Configure your Google Colab Stable Diffusion backend</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className={cn("p-6 rounded-2xl border", darkMode ? "bg-zinc-800/50 border-zinc-700" : "bg-zinc-50 border-zinc-200")}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold">Colab Connection Status</h3>
                    <div className="flex items-center gap-2">
                      <div className={cn("w-3 h-3 rounded-full", colabStatus?.configured ? "bg-emerald-500 animate-pulse" : "bg-red-500")} />
                      <span className="text-sm font-medium">{colabStatus?.configured ? "Connected" : "Disconnected"}</span>
                    </div>
                  </div>
                  {colabStatus?.timestamp && (
                    <p className="text-xs text-zinc-500">Last Checked: {new Date(colabStatus.timestamp).toLocaleString()}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-500 ml-1">Colab Public URL (Gradio/LocalTunnel)</label>
                  <div className="flex gap-3">
                    <input 
                      type="text"
                      value={colabUrl}
                      onChange={(e) => setColabUrl(e.target.value)}
                      placeholder="https://xxxx-xxxx-xxxx.gradio.live"
                      className={cn("flex-1 px-4 py-3 rounded-xl border outline-none transition-all", 
                        darkMode ? "bg-zinc-800 border-zinc-700 focus:border-indigo-500" : "bg-white border-zinc-200 focus:border-indigo-500")}
                    />
                    <button 
                      onClick={handleSaveColabUrl}
                      disabled={isSavingColab || !colabUrl}
                      className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-lg"
                    >
                      {isSavingColab ? "Saving..." : "Connect"}
                    </button>
                  </div>
                  <p className="text-xs text-zinc-500 mt-2">
                    Note: Colab URLs expire every 3-6 hours. You must update this URL whenever you restart your Colab session.
                  </p>
                </div>

                <div className={cn("p-6 rounded-2xl border border-dashed", darkMode ? "border-zinc-700" : "border-zinc-300")}>
                  <h4 className="font-bold mb-2 text-sm">How to setup:</h4>
                  <ol className="text-xs space-y-2 text-zinc-500 list-decimal ml-4">
                    <li>Open your Stable Diffusion Colab Notebook.</li>
                    <li>Ensure the <code className="bg-zinc-800 px-1 rounded">--api</code> flag is enabled in the launch command.</li>
                    <li>Start the web UI and wait for the public Gradio URL.</li>
                    <li>Copy the URL and paste it above.</li>
                    <li>Click "Connect" to enable AI Image Generation for all users.</li>
                  </ol>
                </div>
              </div>
            </div>
          </motion.div>
        ) : activeTab === 'butterfly' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-pink-500 flex items-center gap-2">
                  <History className="w-5 h-5" /> Butterfly Sessions
                </h2>
                <button 
                  onClick={fetchData}
                  className={cn("p-2 rounded-lg transition-colors", darkMode ? "hover:bg-zinc-800 text-zinc-500 hover:text-pink-500" : "hover:bg-zinc-200 text-zinc-500 hover:text-pink-600")}
                  title="Refresh Sessions"
                >
                  <History className="w-4 h-4" />
                </button>
              </div>
              {butterflyChats.length === 0 ? (
                <p className="text-zinc-500 text-center py-8">No Butterfly sessions logged.</p>
              ) : (
                butterflyChats.map(chat => (
                  <button
                    key={chat.id}
                    onClick={() => fetchButterflyMessages(chat.id)}
                    className={cn(
                      "w-full text-left p-4 rounded-2xl border transition-all",
                      selectedButterflyChat === chat.id 
                        ? "bg-pink-500/10 border-pink-500/50 ring-1 ring-pink-500/50" 
                        : (darkMode ? "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700" : "bg-white border-zinc-200 hover:border-zinc-300 shadow-sm")
                    )}
                  >
                    <p className={cn("font-bold text-sm truncate", darkMode ? "text-white" : "text-zinc-900")}>{chat.title}</p>
                    <p className="text-[10px] text-zinc-500 mt-1">User: {chat.userName}</p>
                    <p className="text-[10px] text-zinc-600 mt-0.5">
                      {chat.updatedAt?.seconds 
                        ? new Date(chat.updatedAt.seconds * 1000).toLocaleString() 
                        : chat.createdAt?.seconds 
                          ? new Date(chat.createdAt.seconds * 1000).toLocaleString()
                          : 'Unknown Date'}
                    </p>
                  </button>
                ))
              )}
            </div>
            
            <div className={cn(
              "lg:col-span-2 border rounded-3xl p-6 min-h-[50vh] flex flex-col transition-all",
              darkMode ? "bg-zinc-900/30 border-zinc-800" : "bg-white border-zinc-200 shadow-sm"
            )}>
              {selectedButterflyChat ? (
                <>
                  <div className={cn("flex items-center justify-between mb-6 border-b pb-4", darkMode ? "border-zinc-800" : "border-zinc-100")}>
                    <h3 className={cn("font-bold text-lg", darkMode ? "text-white" : "text-zinc-900")}>Chat History</h3>
                    <span className="text-[10px] text-zinc-500 font-mono">{selectedButterflyChat}</span>
                  </div>
                  <div className="flex-1 space-y-6 overflow-y-auto max-h-[60vh] pr-2">
                    {butterflyMessages.map(msg => (
                      <div key={msg.id} className={cn("flex flex-col", msg.role === 'user' ? "items-end" : "items-start")}>
                        <div className={cn(
                          "max-w-[85%] p-4 rounded-2xl text-sm shadow-sm",
                          msg.role === 'user' 
                            ? "bg-indigo-600 text-white rounded-tr-none" 
                            : (darkMode ? "bg-zinc-800 text-zinc-300 rounded-tl-none" : "bg-zinc-100 text-zinc-800 rounded-tl-none")
                        )}>
                          {msg.type === 'image' ? (
                            <img src={msg.content} alt="Butterfly Image" className="rounded-lg max-w-full h-auto" />
                          ) : (
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                          )}
                        </div>
                        <span className="text-[10px] text-zinc-600 mt-1 px-1">
                          {msg.timestamp?.seconds ? new Date(msg.timestamp.seconds * 1000).toLocaleTimeString() : '...'}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-zinc-600">
                  <History className="w-12 h-12 mb-4 opacity-20" />
                  <p>Select a session to view history</p>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
