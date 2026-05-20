import React from 'react';
import { motion } from 'framer-motion';

export default function ThreatCounter({ label, value, color = 'text-primary', icon: Icon }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono text-[10px] text-muted-foreground tracking-widest uppercase">{label}</span>
        {Icon && <Icon className={`w-4 h-4 ${color}`} />}
      </div>
      <motion.div
        key={value}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`font-mono text-3xl font-bold ${color}`}
      >
        {value}
      </motion.div>
    </div>
  );
}