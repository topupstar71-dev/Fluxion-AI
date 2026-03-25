import React from 'react';
import { motion } from 'framer-motion';
import { 
  CreditCard, 
  Zap, 
  Calendar, 
  ArrowRight, 
  Sparkles, 
  Shield, 
  History,
  Layout,
  ArrowLeft,
  Gift,
  Share2,
  Copy,
  Check,
  Trophy,
  Star,
  MessageSquare,
  Image as ImageIcon,
  Code
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';

import { cn } from '../lib/utils';

export default function Dashboard({ onBack, onUpgrade, onBuilder, onProjects, darkMode }: { onBack: () => void, onUpgrade: () => void, onBuilder: () => void, onProjects: () => void, darkMode?: boolean }) {
  const { profile, claimDailyCredits } = useAuth();
  const [copied, setCopied] = React.useState(false);

  const copyReferral = () => {
    if (profile?.referral_code) {
      navigator.clipboard.writeText(profile.referral_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClaim = async () => {
    const success = await claimDailyCredits();
    if (success) {
      alert("Success! 100 credits added to your account.");
    } else {
      alert("You have already claimed your daily credits today.");
    }
  };

  const getPlanIcon = () => {
    switch (profile?.plan) {
      case 'standard': return <Zap className="text-indigo-500" />;
      case 'customizable': return <Sparkles className="text-amber-500" />;
      case 'extended': return <Shield className="text-emerald-500" />;
      default: return <CreditCard className="text-zinc-500" />;
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className={cn("min-h-screen p-4 sm:p-8 pb-32 lg:pb-8 overflow-y-auto transition-colors duration-300", darkMode ? "bg-[#050505] text-white" : "bg-zinc-50 text-zinc-900")}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className={cn("p-2 rounded-full transition-colors", darkMode ? "hover:bg-zinc-800" : "hover:bg-zinc-200")}>
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-3xl font-bold">User Dashboard</h1>
          </div>
          <div className={cn("flex items-center gap-2 px-4 py-2 rounded-2xl border transition-all", darkMode ? "bg-zinc-900/50 border-zinc-800" : "bg-white border-zinc-200 shadow-sm")}>
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Active Session</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {/* Level & XP Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn("border p-8 rounded-3xl backdrop-blur-xl transition-all relative overflow-hidden", darkMode ? "bg-indigo-600/10 border-indigo-500/20" : "bg-indigo-50 border-indigo-200 shadow-sm")}
          >
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Trophy className="w-24 h-24" />
            </div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
                  <Star className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest leading-none mb-1">Level</p>
                  <p className="text-2xl font-black">{profile?.level || 1}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest leading-none mb-1">Experience</p>
                <p className="text-sm font-bold">{profile?.xp || 0} XP</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                <span>Progress to Level {(profile?.level || 1) + 1}</span>
                <span>{(profile?.xp || 0) % 100}%</span>
              </div>
              <div className={cn("w-full h-3 rounded-full overflow-hidden", darkMode ? "bg-zinc-800" : "bg-white border border-zinc-200")}>
                <div 
                  className="bg-indigo-600 h-full transition-all duration-1000" 
                  style={{ width: `${(profile?.xp || 0) % 100}%` }} 
                />
              </div>
            </div>
          </motion.div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Messages', val: profile?.messagesSent || 0, icon: <MessageSquare className="w-4 h-4" />, color: 'text-emerald-500' },
              { label: 'Images', val: profile?.imagesGenerated || 0, icon: <ImageIcon className="w-4 h-4" />, color: 'text-purple-500' },
              { label: 'Projects', val: profile?.projectsCreated || 0, icon: <Code className="w-4 h-4" />, color: 'text-amber-500' },
              { label: 'Credits', val: profile?.credits || 0, icon: <Zap className="w-4 h-4" />, color: 'text-indigo-500' }
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 * i }}
                className={cn("p-4 rounded-2xl border flex flex-col justify-between transition-all", darkMode ? "bg-zinc-900/50 border-zinc-800" : "bg-white border-zinc-200 shadow-sm")}
              >
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-2", darkMode ? "bg-zinc-800" : "bg-zinc-100", stat.color)}>
                  {stat.icon}
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{stat.label}</p>
                  <p className="text-lg font-bold">{stat.val}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {/* Plan Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn("border p-8 rounded-3xl backdrop-blur-xl transition-all", darkMode ? "bg-zinc-900/50 border-zinc-800" : "bg-white border-zinc-200 shadow-sm")}
          >
            <div className="flex items-center justify-between mb-6">
              <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", darkMode ? "bg-zinc-800" : "bg-zinc-100")}>
                {getPlanIcon()}
              </div>
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Current Plan</span>
            </div>
            <h3 className="text-3xl font-bold capitalize mb-2">{profile?.plan}</h3>
            <p className="text-zinc-500 text-sm mb-6">Your active subscription plan</p>
            <button 
              onClick={onUpgrade}
              className={cn("w-full font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2", darkMode ? "bg-white text-black hover:bg-zinc-200" : "bg-indigo-600 text-white hover:bg-indigo-700")}
            >
              Upgrade Plan <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>

          {/* Credits Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={cn("border p-8 rounded-3xl backdrop-blur-xl transition-all", darkMode ? "bg-zinc-900/50 border-zinc-800" : "bg-white border-zinc-200 shadow-sm")}
          >
            <div className="flex items-center justify-between mb-6">
              <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", darkMode ? "bg-zinc-800" : "bg-zinc-100")}>
                <Zap className="text-indigo-500" />
              </div>
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Usage</span>
            </div>
            <h3 className="text-3xl font-bold mb-2">{profile?.credits}</h3>
            <p className="text-zinc-500 text-sm mb-6">Credits remaining in your account</p>
            <div className={cn("w-full h-2 rounded-full overflow-hidden", darkMode ? "bg-zinc-800" : "bg-zinc-100")}>
              <div 
                className="bg-indigo-600 h-full transition-all duration-1000" 
                style={{ width: `${Math.min(100, (profile?.credits || 0) / 60)}%` }} 
              />
            </div>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* My Projects */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 }}
            onClick={onProjects}
            className={cn("border p-6 rounded-3xl flex items-center gap-4 cursor-pointer transition-all group", darkMode ? "bg-indigo-600/10 border-indigo-500/20 hover:bg-indigo-600/20" : "bg-indigo-50 border-indigo-200 hover:bg-indigo-100 shadow-sm")}
          >
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Layout className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">AI Builder</p>
              <p className="text-sm font-bold">My Projects History</p>
            </div>
          </motion.div>

          {/* Daily Credits */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            onClick={handleClaim}
            className={cn("border p-6 rounded-3xl flex items-center gap-4 cursor-pointer transition-all group", darkMode ? "bg-emerald-600/10 border-emerald-500/20 hover:bg-emerald-600/20" : "bg-emerald-50 border-emerald-200 hover:bg-emerald-100 shadow-sm")}
          >
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Gift className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Daily Reward</p>
              <p className="text-sm font-bold">Claim 100 Credits</p>
            </div>
          </motion.div>

          {/* Referral Code */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            onClick={copyReferral}
            className={cn("border p-6 rounded-3xl flex items-center gap-4 cursor-pointer transition-all group", darkMode ? "bg-amber-600/10 border-amber-500/20 hover:bg-amber-600/20" : "bg-amber-50 border-amber-200 hover:bg-amber-100 shadow-sm")}
          >
            <div className="w-10 h-10 bg-amber-600 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              {copied ? <Check className="w-5 h-5 text-white" /> : <Share2 className="w-5 h-5 text-white" />}
            </div>
            <div>
              <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Referral Code</p>
              <p className="text-sm font-bold">{profile?.referral_code || '---'}</p>
            </div>
          </motion.div>

          {/* Expire Date */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className={cn("border p-6 rounded-3xl flex items-center gap-4 transition-all", darkMode ? "bg-zinc-900/50 border-zinc-800" : "bg-white border-zinc-200 shadow-sm")}
          >
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", darkMode ? "bg-zinc-800" : "bg-zinc-100")}>
              <Calendar className="w-5 h-5 text-zinc-400" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Expires On</p>
              <p className="text-sm font-bold">{formatDate(profile?.expire_date || null)}</p>
            </div>
          </motion.div>
        </div>

        <div className={cn("border p-8 rounded-3xl text-center transition-all", darkMode ? "bg-zinc-900/30 border-zinc-800" : "bg-white border-zinc-200 shadow-sm")}>
          <h4 className="text-xl font-bold mb-2">Need more credits?</h4>
          <p className="text-zinc-500 mb-6 max-w-md mx-auto">
            Upgrade to a higher plan to get more credits and unlock advanced AI features.
          </p>
          <button 
            onClick={onUpgrade}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 py-3 rounded-xl transition-all"
          >
            View Pricing
          </button>
        </div>
      </div>
    </div>
  );
}
