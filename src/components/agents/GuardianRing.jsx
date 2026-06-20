import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const AGENTS = [
  { id: 1, name: 'SENTINEL', role: 'Perimeter Monitor', desc: 'Scans all ingress/egress points for anomalous traffic patterns', color: '#00e5ff', angle: 0 },
  { id: 2, name: 'CIPHER', role: 'Crypto Analyst', desc: 'Validates cryptographic signatures and detects tampering', color: '#7c3aed', angle: 30 },
  { id: 3, name: 'PHANTOM', role: 'Deception Engine', desc: 'Deploys honeypots and manages mirror environment lures', color: '#ec4899', angle: 60 },
  { id: 4, name: 'ORACLE', role: 'Predictive AI', desc: 'ML-based behavioral analysis and zero-day prediction', color: '#f59e0b', angle: 90 },
  { id: 5, name: 'WRAITH', role: 'Fileless Detector', desc: 'Detects in-memory and fileless malware execution chains', color: '#ef4444', angle: 120 },
  { id: 6, name: 'BASTION', role: 'Firewall Core', desc: 'Enforces dynamic rule sets and blocks lateral movement', color: '#10b981', angle: 150 },
  { id: 7, name: 'NEXUS', role: 'Network Mapper', desc: 'Real-time topology mapping and rogue device detection', color: '#3b82f6', angle: 180 },
  { id: 8, name: 'SPECTER', role: 'Supply Chain Guard', desc: 'Monitors third-party dependencies for compromise signals', color: '#8b5cf6', angle: 210 },
  { id: 9, name: 'FORGE', role: 'Firmware Auditor', desc: 'Deep scans firmware and BIOS layers for rootkit activity', color: '#f97316', angle: 240 },
  { id: 10, name: 'MIRAGE', role: 'AI Adversarial Shield', desc: 'Detects and counters AI-generated adversarial attack vectors', color: '#06b6d4', angle: 270 },
  { id: 11, name: 'VORTEX', role: 'Side-Channel Detector', desc: 'Monitors timing, power, and EM side-channel leakage', color: '#84cc16', angle: 300 },
  { id: 12, name: 'SIFT-AI-X', role: 'Command Override', desc: 'Master agent — coordinates all 11 agents and escalates critical events', color: '#ffffff', angle: 330 },
];

export default function GuardianRing({ anomalies = [] }) {
  const [activeAgent, setActiveAgent] = useState(null);
  const [pulseIds, setPulseIds] = useState([]);

  // Removed fake data pulse simulation
  useEffect(() => {
    if (anomalies.length > 0) {
      // Pulse agents that recently caught anomalies (simulated routing by anomaly id)
      const ids = anomalies.slice(0, 3).map(a => (a.agent_id ? parseInt(a.agent_id, 10) : 12)).filter(id => !isNaN(id) && id >= 1 && id <= 12);
      setPulseIds(ids);
    } else {
      setPulseIds([]);
    }
  }, [anomalies]);

  const cx = 100, cy = 100, radius = 75;

  return (
    <div className="relative w-full">
      <div className="flex flex-col md:flex-row gap-4 items-start">
        {/* SVG Ring */}
        <div className="relative flex-shrink-0 mx-auto">
          <svg width="200" height="200" className="overflow-hidden">
            {/* Orbit rings */}
            <circle cx={cx} cy={cy} r={radius} fill="none" stroke="hsl(215 25% 18%)" strokeWidth="1" strokeDasharray="4 4" />
            <circle cx={cx} cy={cy} r={radius - 30} fill="none" stroke="hsl(215 25% 14%)" strokeWidth="0.5" />

            {/* Scan line */}
            <motion.line
              x1={cx} y1={cy}
              x2={cx} y2={cy - radius}
              stroke="hsl(187 100% 50% / 0.3)"
              strokeWidth="1.5"
              animate={{ rotate: 360 }}
              transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
              style={{ transformOrigin: `${cx}px ${cy}px` }}
            />

            {/* Connection lines to center */}
            {AGENTS.map((agent) => {
              const rad = (agent.angle - 90) * (Math.PI / 180);
              const x = cx + radius * Math.cos(rad);
              const y = cy + radius * Math.sin(rad);
              const isActive = activeAgent?.id === agent.id;
              return (
                <line key={agent.id}
                  x1={cx} y1={cy} x2={x} y2={y}
                  stroke={isActive ? agent.color : 'hsl(215 25% 20%)'}
                  strokeWidth={isActive ? 1.5 : 0.5}
                  strokeOpacity={isActive ? 0.8 : 0.3}
                />
              );
            })}

            {/* Center Core */}
            <circle cx={cx} cy={cy} r={18} fill="hsl(187 100% 50% / 0.08)" stroke="hsl(187 100% 50% / 0.4)" strokeWidth="1.5" />
            <circle cx={cx} cy={cy} r={12} fill="hsl(222 47% 8%)" stroke="hsl(187 100% 50% / 0.6)" strokeWidth="1" />
            <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle" fill="hsl(187 100% 50%)" fontSize="6" fontFamily="monospace" fontWeight="bold">CORE</text>

            {/* Agent Nodes */}
            {AGENTS.map((agent) => {
              const rad = (agent.angle - 90) * (Math.PI / 180);
              const x = cx + radius * Math.cos(rad);
              const y = cy + radius * Math.sin(rad);
              const isPulsing = pulseIds.includes(agent.id);
              const isSelected = activeAgent?.id === agent.id;

              return (
                <g key={agent.id} onClick={() => setActiveAgent(isSelected ? null : agent)} style={{ cursor: 'pointer' }}>
                  {isPulsing && (
                    <motion.circle cx={x} cy={y} r={14}
                      fill="none" stroke={agent.color} strokeWidth="1.5"
                      initial={{ r: 10, opacity: 0.8 }}
                      animate={{ r: 22, opacity: 0 }}
                      transition={{ duration: 1.2, ease: 'easeOut' }}
                    />
                  )}
                  <motion.circle cx={x} cy={y} r={isSelected ? 11 : 9}
                    fill={isSelected ? `${agent.color}22` : 'hsl(222 47% 8%)'}
                    stroke={agent.color}
                    strokeWidth={isSelected ? 2 : 1.5}
                    animate={{ opacity: [0.7, 1, 0.7] }}
                    transition={{ duration: 2 + agent.id * 0.1, repeat: Infinity }}
                  />
                  <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="middle"
                    fill={agent.color} fontSize="5.5" fontFamily="monospace" fontWeight="bold">
                    {agent.id}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Agent Info Panel */}
        <div className="flex-1 w-full md:w-auto space-y-2">
          <AnimatePresence mode="wait">
            {activeAgent ? (
              <motion.div key={activeAgent.id}
                initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                className="p-3 rounded-xl border bg-card/80"
                style={{ borderColor: `${activeAgent.color}40` }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center font-mono text-[10px] font-bold flex-shrink-0"
                    style={{ background: `${activeAgent.color}15`, color: activeAgent.color, border: `1px solid ${activeAgent.color}40` }}>
                    {activeAgent.id}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-xs font-bold truncate" style={{ color: activeAgent.color }}>{activeAgent.name}</div>
                    <div className="font-mono text-[8px] text-muted-foreground truncate">{activeAgent.role}</div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <div className="w-1 h-1 rounded-full bg-green-400 animate-pulse" />
                    <span className="font-mono text-[8px] text-green-400">ACTIVE</span>
                  </div>
                </div>
                <p className="font-mono text-[9px] text-muted-foreground leading-relaxed">{activeAgent.desc}</p>
              </motion.div>
            ) : (
              <motion.div key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="p-3 rounded-xl border border-border bg-secondary/30">
                <p className="font-mono text-[9px] text-muted-foreground text-center">
                  Click any agent node to view details
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Agent list */}
          <div className="grid grid-cols-2 md:grid-cols-1 gap-1 max-h-40 overflow-y-auto pr-1">
            {AGENTS.map(agent => (
              <button key={agent.id} onClick={() => setActiveAgent(activeAgent?.id === agent.id ? null : agent)}
                className={`text-left px-2 py-1.5 rounded-lg border transition-all ${activeAgent?.id === agent.id ? 'bg-card border-opacity-60' : 'border-border hover:border-opacity-50 hover:bg-secondary/30'}`}
                style={{ borderColor: activeAgent?.id === agent.id ? `${agent.color}50` : undefined }}>
                <div className="flex items-center gap-1.5">
                  <div className="w-3.5 h-3.5 rounded flex items-center justify-center font-mono text-[7px] font-bold flex-shrink-0"
                    style={{ background: `${agent.color}15`, color: agent.color }}>
                    {agent.id}
                  </div>
                  <span className="font-mono text-[8px] font-semibold" style={{ color: agent.color }}>{agent.name}</span>
                </div>
                <div className="font-mono text-[7px] text-muted-foreground mt-0.5 ml-5">{agent.role}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}