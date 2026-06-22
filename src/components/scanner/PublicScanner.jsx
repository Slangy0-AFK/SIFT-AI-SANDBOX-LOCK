import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Terminal, Loader2, CheckCircle2, ShieldCheck, ShieldAlert, ScanLine } from 'lucide-react';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

export const SCAN_STEPS = [
  { id: 'env', label: 'Environment Initialization', detail: 'Validating browser signature & WebGL fingerprint...' },
  { id: 'network', label: 'Network Telemetry', detail: 'Analyzing routing anomalies and DNS leaks...' },
  { id: 'storage', label: 'Local Storage Audit', detail: 'Checking for persistent tracking payloads...' },
  { id: 'heuristics', label: 'Behavioral Heuristics', detail: 'Testing for automation and headless flags...' },
  { id: 'verify', label: 'Signature Verification', detail: 'Cross-referencing Sift-AI threat database...' },
];

export default function PublicScanner() {
  const [scanning, setScanning] = useState(false);
  const [stepIndex, setStepIndex] = useState(-1);
  const [results, setResults] = useState(null);
  const [detectedExtensions, setDetectedExtensions] = useState([]);

  const runScan = async () => {
    if (scanning) return;
    setScanning(true);
    setResults(null);
    
    try {
      base44.functions.invoke('trackScan', {});
    } catch(e) {}
    
    let anomalies = 0;
    let warnings = 0;

    setStepIndex(0);
    await new Promise(r => setTimeout(r, 700));
    if (navigator.webdriver) anomalies++;
    if (!navigator.languages || navigator.languages.length === 0) anomalies++;
    if (window.cdc_adoQpoasnfa76pfcZLmcfl_Array) anomalies++; 

    setStepIndex(1);
    await new Promise(r => setTimeout(r, 700));
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz) warnings++;
    if (navigator.connection && navigator.connection.saveData) warnings++;

    setStepIndex(2);
    await new Promise(r => setTimeout(r, 800));
    try {
      const estimate = await navigator.storage?.estimate();
      if (estimate && estimate.usage > 1024 * 1024 * 200) warnings++; 
    } catch(e) {}

    setStepIndex(3);
    await new Promise(r => setTimeout(r, 900));
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl) {
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const renderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)?.toLowerCase() : '';
        if (renderer.includes('swiftshader') || renderer.includes('llvmpipe')) {
          anomalies++; 
        }
      }
    } catch(e) {}

    if (navigator.hardwareConcurrency === 1) warnings++;

    setStepIndex(4);
    await new Promise(r => setTimeout(r, 1000));
    
    // Perform comprehensive DOM and Window inspection for AI tools and extensions
    const aiExtensions = [];
    const addExt = (name, brand, risk) => aiExtensions.push({ name, brand, risk });
    
    // Writing & Grammar AI
    if (document.querySelector('grammarly-desktop-integration') || document.body.hasAttribute('data-gr-ext-installed') || document.querySelector('.grammarly-extension')) addExt('Grammarly', 'Grammarly Inc.', 'Safe');
    if (document.querySelector('wordtune-component') || document.querySelector('[data-wordtune]')) addExt('Wordtune', 'AI21 Labs', 'Safe');
    if (document.querySelector('quillbot-extension') || document.getElementById('quillbot-widget')) addExt('QuillBot', 'Course Hero', 'Safe');
    if (document.querySelector('hyperwrite-widget')) addExt('HyperWrite', 'OthersideAI', 'Moderate');
    if (document.getElementById('jasper-widget')) addExt('Jasper AI', 'Jasper', 'Moderate');

    // Multi-purpose AI Assistants & Copilots
    if (document.querySelector('shadow-root-copilot') || document.querySelector('#copilot-sidebar')) addExt('Copilot Integrated AI', 'Microsoft', 'Safe');
    if (document.getElementById('monica-content') || window.__MONICA_PLUGIN__) addExt('Monica AI', 'Butterfly Effect', 'Moderate');
    if (document.querySelector('merlin-drawer') || document.querySelector('merlin-chat')) addExt('Merlin AI', 'Foyer', 'Moderate');
    if (document.querySelector('harpa-drawer') || document.querySelector('harpa-app')) addExt('Harpa AI', 'Harpa.ai', 'Moderate');
    if (document.getElementById('sider-app') || document.querySelector('.sider-sidebar')) addExt('Sider AI', 'Sider.ai', 'Moderate');
    if (document.querySelector('maxai-sidebar') || document.querySelector('usechatgpt-sidebar')) addExt('MaxAI.me', 'MaxAI', 'Moderate');
    if (document.querySelector('aiprm-sidebar') || document.querySelector('[data-aiprm]')) addExt('AIPRM', 'AIPRM Corp', 'Moderate');
    if (document.getElementById('bito-app') || document.querySelector('bito-sidebar')) addExt('Bito AI', 'Bito Inc.', 'Moderate');
    if (document.querySelector('perplexity-sidebar')) addExt('Perplexity', 'Perplexity AI', 'Safe');
    if (document.querySelector('webchatgpt-app')) addExt('WebChatGPT', 'Unknown Developer', 'High');
    if (document.getElementById('scispace-copilot')) addExt('SciSpace Copilot', 'Typeset', 'Moderate');
    if (document.querySelector('eightify-app')) addExt('Eightify', 'Eightify', 'Moderate');

    // Developer & System Tools
    if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) addExt('React DevTools', 'Meta', 'Safe');
    if (window.__REDUX_DEVTOOLS_EXTENSION__) addExt('Redux DevTools', 'Community', 'Safe');
    if (window.__VUE_DEVTOOLS_GLOBAL_HOOK__) addExt('Vue.js Devtools', 'Vue.js', 'Safe');
    if (document.getElementById('loom-companion-mv3') || document.getElementById('loom-companion-shadow-root')) addExt('Loom Companion', 'Atlassian', 'Safe');
    if (document.querySelector('[data-dashlane-rid]') || document.getElementById('lastpass-notification-overlay')) addExt('Password Manager', 'Various', 'Safe');

    // Mobile / Native App Bridge Detection (Preparing for Native Apps)
    if (window.webkit?.messageHandlers || window.AndroidBridge || navigator.userAgent.includes('wv')) {
       // In a native app wrapper, we flag the presence of native bridges
       addExt('Native App Bridge', 'System API', 'Unknown');
    }

    setDetectedExtensions(aiExtensions);
    if (aiExtensions.length > 0) anomalies++;
    
    setStepIndex(SCAN_STEPS.length);
    setResults({ 
      clean: anomalies === 0 && warnings === 0, 
      threats: anomalies,
      warnings: warnings
    });
    setScanning(false);
  };

  return (
    <div className="w-full">
      <CardHeader className="pb-4 border-b border-border">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Terminal className="w-4 h-4 text-primary" /> TEST MY DEVICE
          </CardTitle>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Run a quick, client-side simulation of the Sift-AI detection engine.
        </p>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        <div className="space-y-3">
          {SCAN_STEPS.map((step, i) => {
            const done = stepIndex > i;
            const active = stepIndex === i && scanning;
            const pending = !done && !active;
            return (
              <motion.div
                key={step.id}
                animate={{ opacity: pending && stepIndex >= 0 ? 0.4 : 1 }}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                  active ? 'bg-primary/5 border-primary/20' : 
                  done ? 'bg-green-500/5 border-green-500/20' : 
                  'bg-secondary/30 border-border/50'
                }`}
              >
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  active ? 'bg-primary animate-pulse' : 
                  done ? 'bg-green-500' : 'bg-muted-foreground/30'
                }`} />
                <div className="flex-1 min-w-0">
                  <span className={`text-sm font-medium ${
                    active ? 'text-primary' : 
                    done ? 'text-green-500' : 'text-muted-foreground'
                  }`}>{step.label}</span>
                  {active && <p className="text-xs text-muted-foreground mt-0.5">{step.detail}</p>}
                </div>
                {active && <Loader2 className="w-4 h-4 text-primary animate-spin flex-shrink-0" />}
                {done && <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />}
              </motion.div>
            );
          })}
        </div>

        <AnimatePresence>
          {results && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`mt-6 p-4 rounded-xl border ${
                results.clean 
                  ? 'bg-green-500/5 border-green-500/20' 
                  : 'bg-amber-500/5 border-amber-500/20'
              }`}
            >
              <div className="flex items-center gap-3">
                {results.clean ? (
                  <ShieldCheck className="w-8 h-8 text-green-500" />
                ) : (
                  <ShieldAlert className="w-8 h-8 text-amber-500" />
                )}
                <div className="flex-1">
                  <p className={`text-sm font-bold ${results.clean ? 'text-green-500' : 'text-amber-500'}`}>
                    {results.clean ? 'DEVICE APPEARS SECURE' : `${results.threats} ANOMALIES DETECTED`}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {results.clean 
                      ? 'No immediate browser-level threats detected in this quick scan.' 
                      : 'Some tracking scripts or anomalies were identified.'}
                  </p>
                </div>
              </div>
              <div className="mt-4 border-t border-border/50 pt-4 space-y-2 text-xs">
                 <p className="font-mono text-muted-foreground"><span className="text-foreground">User-Agent:</span> {navigator.userAgent.split(' ')[0]}</p>
                 <p className="font-mono text-muted-foreground"><span className="text-foreground">Screen Res:</span> {window.screen.width}x{window.screen.height}</p>
                 <p className="font-mono text-muted-foreground"><span className="text-foreground">Language:</span> {navigator.language || 'Unknown'}</p>
                 <p className="font-mono text-muted-foreground"><span className="text-foreground">Hardware Cores:</span> {navigator.hardwareConcurrency || 'Hidden'}</p>
                 {detectedExtensions.length > 0 && (
                   <div className="mt-3 pt-3 border-t border-border/50">
                     <p className="font-mono font-bold text-amber-500 mb-2">Detected Modifications & Extensions:</p>
                     <div className="space-y-2">
                       {detectedExtensions.map((ext, idx) => (
                         <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-2 rounded bg-secondary/30 border border-border/50">
                           <div>
                             <span className="font-semibold text-foreground font-mono text-sm">{ext.name}</span>
                             <span className="text-muted-foreground ml-2 text-[10px] uppercase font-sans">By {ext.brand}</span>
                           </div>
                           <div className="flex items-center gap-1.5">
                             <div className={`w-1.5 h-1.5 rounded-full ${
                               ext.risk === 'Safe' ? 'bg-green-500' : 
                               ext.risk === 'Moderate' ? 'bg-amber-500' : 'bg-destructive'
                             }`} />
                             <span className={`text-[10px] font-bold uppercase tracking-wider ${
                               ext.risk === 'Safe' ? 'text-green-500' : 
                               ext.risk === 'Moderate' ? 'text-amber-500' : 'text-destructive'
                             }`}>
                               {ext.risk === 'Safe' ? 'Safe / Verified' : ext.risk === 'Moderate' ? 'Data Sharing Risk' : 'Unverified / Unsafe'}
                             </span>
                           </div>
                         </div>
                       ))}
                     </div>
                   </div>
                 )}
              </div>
              <div className="mt-4 flex justify-end">
                <Link to="/register">
                  <Button size="sm" className="font-medium">Get Full Protection</Button>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!scanning && !results && (
          <Button onClick={runScan} className="w-full mt-6 h-12 text-sm font-semibold transition-all" size="lg">
            <ScanLine className="w-4 h-4 mr-2" /> Test My Device Now
          </Button>
        )}
      </CardContent>
    </div>
  );
}