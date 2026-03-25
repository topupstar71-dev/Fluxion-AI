import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  CreditCard, 
  CheckCircle2, 
  Loader2,
  ShieldCheck,
  Smartphone
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { loadStripe } from '@stripe/stripe-js';

import { cn } from '../lib/utils';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

export default function Payment({ plan, onBack, onSuccess, darkMode }: { plan: any, onBack: () => void, onSuccess: () => void, darkMode?: boolean }) {
  const { user, submitPaymentRequest, upgradePlan } = useAuth();
  const [method, setMethod] = useState<'bkash'>('bkash');
  const [transactionId, setTransactionId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handlePayment = async () => {
    if (!transactionId.trim()) {
      alert('Please enter your Transaction ID');
      return;
    }

    setIsProcessing(true);
    
    try {
      // bKash manual verification
      await submitPaymentRequest(plan.id, method, transactionId);
      setIsSuccess(true);
    } catch (error: any) {
      console.error('Payment error:', error);
      alert(error.message || 'Something went wrong. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isSuccess) {
    return (
      <div className={cn("min-h-screen flex items-center justify-center p-4 transition-colors duration-300", darkMode ? "bg-[#050505]" : "bg-zinc-50")}>
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center max-w-md"
        >
          <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-emerald-500/20">
            <CheckCircle2 className="w-10 h-10 text-white" />
          </div>
          <h2 className={cn("text-3xl font-bold mb-2", darkMode ? "text-white" : "text-zinc-900")}>
            Request Pending!
          </h2>
          <p className="text-zinc-500 mb-8">
            Amar malik (Admin) apnar Transaction ID vaild kina seta check korbe. Sothik hole 1 ghontar moddhe apnar plan active hoye jabe. Dhonnyobad!
          </p>
          <button 
            onClick={onSuccess}
            className={cn("w-full font-bold py-3 rounded-xl transition-all", darkMode ? "bg-zinc-800 hover:bg-zinc-700 text-white" : "bg-zinc-200 hover:bg-zinc-300 text-zinc-900")}
          >
            Back to Dashboard
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={cn("min-h-screen p-4 sm:p-8 overflow-y-auto transition-colors duration-300", darkMode ? "bg-[#050505] text-white" : "bg-zinc-50 text-zinc-900")}>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-12">
          <button onClick={onBack} className={cn("p-2 rounded-full transition-colors", darkMode ? "hover:bg-zinc-800" : "hover:bg-zinc-200")}>
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-3xl font-bold">Checkout</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {/* Order Summary */}
          <div className={cn("border p-8 rounded-3xl backdrop-blur-xl transition-all", darkMode ? "bg-zinc-900/50 border-zinc-800" : "bg-white border-zinc-200 shadow-sm")}>
            <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-6">Order Summary</h3>
            <div className={cn("flex items-center justify-between mb-4 pb-4 border-b", darkMode ? "border-zinc-800" : "border-zinc-100")}>
              <div>
                <p className="font-bold">{plan.name} Plan</p>
                <p className="text-xs text-zinc-500">{plan.credits} Credits / Month</p>
              </div>
              <p className="font-bold">৳{plan.price}</p>
            </div>
            <div className="flex items-center justify-between text-xl font-bold">
              <p>Total</p>
              <p className="text-indigo-500">৳{plan.price}</p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-2">Payment Method</h3>
            
            <div className="w-full flex items-center justify-between p-4 rounded-2xl border bg-pink-600/10 border-pink-500 text-pink-500">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-pink-600 rounded-xl flex items-center justify-center text-white font-bold">b</div>
                <span className="font-bold">bKash</span>
              </div>
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className={cn("border p-8 rounded-3xl mb-8 transition-all", darkMode ? "bg-zinc-900/80 border-zinc-800" : "bg-white border-zinc-200 shadow-sm")}>
          <div className="mb-8 p-6 bg-pink-600/5 border border-pink-500/20 rounded-2xl text-center">
            <p className="text-xs text-pink-500 uppercase tracking-widest font-bold mb-2">Send Money to bKash Personal</p>
            <p className={cn("text-3xl font-bold mb-2", darkMode ? "text-white" : "text-zinc-900")}>01816735047</p>
            <p className="text-sm text-zinc-400 mb-4">Please send ৳{plan.price} and click the button below.</p>
            <div className="bg-pink-600/10 p-3 rounded-xl border border-pink-500/20 text-xs text-pink-400">
              <strong>Note:</strong> Eta personal account, tai automatic active hobe na. Admin manual check korar por active hobe.
            </div>
          </div>

          <div className="mb-8 p-6 bg-indigo-600/5 border border-indigo-500/20 rounded-2xl text-center">
            <p className="text-xs text-indigo-500 uppercase tracking-widest font-bold mb-2">Bank Transfer (Manual)</p>
            <p className={cn("text-xl font-bold mb-2", darkMode ? "text-white" : "text-zinc-900")}>City Bank PLC</p>
            <p className="text-sm text-zinc-400">Acc: 1234-5678-9012 (Fluxion AI)</p>
            <p className="text-xs text-zinc-500 mt-2 italic">Bank transfer korle reference number Transaction ID field-e din.</p>
          </div>

          <div className="mb-8">
            <label className="block text-sm font-bold text-zinc-500 uppercase tracking-widest mb-2">Transaction ID</label>
            <input 
              type="text"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              placeholder="Enter Transaction ID"
              className={cn("w-full border rounded-2xl p-4 focus:outline-none focus:border-indigo-500 transition-all", darkMode ? "bg-zinc-950 border-zinc-800 text-white" : "bg-zinc-50 border-zinc-200 text-zinc-900")}
            />
            <p className="mt-2 text-xs text-zinc-500">
              Enter the transaction ID you received after sending the money.
            </p>
          </div>

          <div className="flex items-center gap-4 mb-6">
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", darkMode ? "bg-zinc-950" : "bg-zinc-100")}>
              <ShieldCheck className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <p className="font-bold">Secure Payment</p>
              <p className="text-xs text-zinc-500">Your transaction is encrypted and secure.</p>
            </div>
          </div>
          
          <button 
            onClick={handlePayment}
            disabled={isProcessing}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isProcessing ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
            ) : (
              <>Submit Payment Request</>
            )}
          </button>
        </div>

        <p className="text-center text-zinc-500 text-xs">
          By clicking pay, you agree to our subscription terms.
        </p>
      </div>
    </div>
  );
}
