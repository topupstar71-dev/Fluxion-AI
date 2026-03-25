import React from 'react';
import { motion } from 'framer-motion';
import { Check, ArrowLeft, CreditCard, Sparkles, Zap, Shield } from 'lucide-react';

import { cn } from '../lib/utils';

const plans = [
  {
    id: 1,
    name: "Standard",
    price: "200",
    credits: "1000",
    desc: "Standard monthly usage",
    icon: <Sparkles className="text-indigo-500" />,
    features: [
      "1,000 credits per month",
      "1 AI message = 1 credit",
      "Coding: 1 credit per 2 lines",
      "Standard AI Web Builder access",
      "In-depth research for everyday tasks",
      "Early access to beta features"
    ]
  },
  {
    id: 2,
    name: "Customizable",
    price: "400",
    credits: "3000",
    desc: "Customizable monthly usage",
    icon: <Zap className="text-amber-500" />,
    features: [
      "3,000 credits per month",
      "1 AI message = 1 credit",
      "Coding: 1 credit per 2 lines",
      "Advanced AI Web Builder access",
      "Priority generation speed",
      "Early access to beta features"
    ]
  },
  {
    id: 3,
    name: "Extended",
    price: "600",
    credits: "6000",
    desc: "Extended usage for productivity",
    icon: <Shield className="text-emerald-500" />,
    features: [
      "6,000 credits per month",
      "1 AI message = 1 credit",
      "Coding: 1 credit per 2 lines",
      "Full AI Web Builder access",
      "Highest priority generation",
      "24/7 Premium support",
      "Early access to beta features"
    ]
  }
];

export default function Pricing({ onBack, onSelectPlan, darkMode }: { onBack: () => void, onSelectPlan: (plan: any) => void, darkMode?: boolean }) {
  return (
    <div className={cn("min-h-screen p-4 sm:p-8 pb-32 lg:pb-8 overflow-y-auto transition-colors duration-300", darkMode ? "bg-[#050505] text-white" : "bg-zinc-50 text-zinc-900")}>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-12">
          <button onClick={onBack} className={cn("p-2 rounded-full transition-colors", darkMode ? "hover:bg-zinc-800" : "hover:bg-zinc-200")}>
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-3xl font-bold">Upgrade Your Experience</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {/* Free Plan Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "relative border p-8 rounded-3xl backdrop-blur-xl flex flex-col transition-all",
              darkMode ? "bg-zinc-900/50 border-zinc-800" : "bg-white border-zinc-200 shadow-sm"
            )}
          >
            <div className="mb-8">
              <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-4", darkMode ? "bg-zinc-800" : "bg-zinc-100")}>
                <Zap className="text-indigo-400" />
              </div>
              <h3 className="text-2xl font-bold mb-1">Free Plan</h3>
              <p className="text-zinc-500 text-sm mb-4">Perfect for everyone</p>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">৳0</span>
                <span className="text-zinc-500">/ month</span>
              </div>
            </div>

            <div className="space-y-4 mb-8 flex-1">
              {[
                "100 credits daily",
                "1 AI message = 5 credits",
                "Fast AI Responses",
                "Image Generation",
                "Basic AI Builder"
              ].map((feature, i) => (
                <div key={i} className="flex items-start gap-3 text-sm text-zinc-400">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>

            <button 
              onClick={onBack}
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-4 rounded-2xl transition-all"
            >
              Current Plan
            </button>
          </motion.div>

          {plans.map((plan) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: plan.id * 0.1 }}
              className={cn(
                "relative border p-8 rounded-3xl backdrop-blur-xl flex flex-col transition-all",
                darkMode ? "bg-zinc-900/50 border-zinc-800" : "bg-white border-zinc-200 shadow-sm",
                plan.id === 2 && "ring-2 ring-indigo-500"
              )}
            >
              {plan.id === 2 && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-bold px-4 py-1 rounded-full uppercase tracking-widest">
                  Most Popular
                </div>
              )}
              <div className="mb-8">
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-4", darkMode ? "bg-zinc-800" : "bg-zinc-100")}>
                  {plan.icon}
                </div>
                <h3 className="text-2xl font-bold mb-1">{plan.name}</h3>
                <p className="text-zinc-500 text-sm mb-4">{plan.desc}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">৳{plan.price}</span>
                  <span className="text-zinc-500">/ month</span>
                </div>
              </div>

              <div className="space-y-4 mb-8 flex-1">
                {plan.features.map((feature, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm text-zinc-400">
                    <Check className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              <button 
                onClick={() => onSelectPlan(plan)}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2"
              >
                <CreditCard className="w-5 h-5" /> Upgrade Now
              </button>
            </motion.div>
          ))}
        </div>

        <div className={cn("border p-8 rounded-3xl text-center max-w-2xl mx-auto transition-all", darkMode ? "bg-zinc-900/80 border-zinc-800" : "bg-white border-zinc-200 shadow-sm")}>
          <h2 className="text-2xl font-bold mb-4">How to Pay?</h2>
          <p className="text-zinc-400 mb-6">
            To upgrade your plan, please send the amount to our bKash number below and contact us with your name.
          </p>
          <div className={cn("p-6 rounded-2xl border inline-block", darkMode ? "bg-zinc-950 border-zinc-800" : "bg-zinc-50 border-zinc-200")}>
            <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2 font-bold">bKash Personal</p>
            <p className="text-3xl font-bold text-indigo-500">01816735047</p>
          </div>
          <p className="mt-6 text-sm text-zinc-500 italic">
            * Your plan will be activated within 1 hour of payment confirmation.
          </p>
        </div>
      </div>
    </div>
  );
}
