import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, Search, Mail, MessageSquare, Loader2, CheckCircle, AlertTriangle, Zap } from 'lucide-react';
import { toast } from 'sonner';

const TABS = [
  { id: 'email', label: 'EMAIL', icon: Mail },
  { id: 'sms', label: 'SMS', icon: MessageSquare },
];

export default function ThreatScanner() {
  const [activeTab, setActiveTab] = useState('email');
  const [emailContent, setEmailContent] = useState('');
  const [smsContent, setSmsContent] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [session, setSession] = useState(null);
  const unsubscribeRef = useRef(null);

  // Subscribe to ScanSession for real-time result delivery
  useEffect(() => {
    if (!session?.id) return;

    if (unsubscribeRef.current) unsubscribeRef.current();

    const unsubscribe = base44.entities.ScanSession.subscribe((event) => {
      if (event.id !== session.id) return;
      const updated = event.data;

      if (updated.status === 'complete') {
        const parsed = updated.result ? JSON.parse(updated.result) : null;
        setResult({ type: activeTab, data: parsed });
        setScanning(false);
        toast.success('Scan complete');
      } else if (updated.status === 'error') {
        setScanning(false);
        toast.error('Scan failed: ' + (updated.error_message || 'Unknown error'));
      }
    });

    unsubscribeRef.current = unsubscribe;
    return () => unsubscribe();
  }, [session?.id]);

  // Cleanup subscription on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) unsubscribeRef.current();
    };
  }, []);

  const handleScan = async () => {
    if (activeTab === 'email' && !emailContent.trim()) {
      toast.error('Please paste email content to scan');
      return;
    }
    if (activeTab === 'sms' && (!smsContent.trim() || !phoneNumber.trim())) {
      toast.error('Please enter phone number and message content');
      return;
    }

    setScanning(true);
    setResult(null);

    try {
      const user = await base44.auth.me();
      const inputValue = activeTab === 'email' ? emailContent.trim() : smsContent.trim();

      // Create ScanSession in DB — frontend subscribes to this for live updates
      const newSession = await base44.entities.ScanSession.create({
        user_id: user.id,
        scan_type: activeTab,
        status: 'scanning',
        input_value: inputValue.substring(0, 500),
      });
      setSession(newSession);

      // Invoke the backend function
      let res;
      if (activeTab === 'email') {
        res = await base44.functions.invoke('phishingAnalyzer', {
          action: 'analyze_email',
          body: emailContent,
        });
      } else {
        res = await base44.functions.invoke('analyzeTextThreat', {
          text: smsContent,
          phone_number: phoneNumber,
        });
      }

      const data = res.data;
      const isThreat = data?.is_threat || (data?.confidence_score || 0) > 60;

      // Write result back to ScanSession — subscription fires immediately
      await base44.entities.ScanSession.update(newSession.id, {
        status: 'complete',
        result: JSON.stringify(data),
        is_threat: !!isThreat,
        threat_level: isThreat ? (data?.threat_type || 'unknown') : 'safe',
      });

    } catch (err) {
      if (session?.id) {
        await base44.entities.ScanSession.update(session.id, {
          status: 'error',
          error_message: err.message,
        }).catch(() => {});
      }
      setScanning(false);
      toast.error('Scan failed: ' + err.message);
    }
  };

  const isThreat = result?.data?.is_threat || (result?.data?.confidence_score || 0) > 60;

  return (
    <div className="min-h-screen bg-background p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Search className="w-5 h-5 text-primary" />
        <h1 className="font-mono text-lg font-bold text-foreground tracking-wider">THREAT SCANNER</h1>
        {scanning && (
          <span className="ml-auto flex items-center gap-1 text-primary font-mono text-[9px]">
            <Zap className="w-3 h-3 animate-pulse" /> LIVE
          </span>
        )}
      </div>

      {/* Tab Pill Bar */}
      <div className="flex gap-2 p-1 bg-secondary rounded-xl">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setResult(null); }}
            disabled={scanning}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-mono text-xs font-semibold transition-all ${
              activeTab === tab.id
                ? 'bg-primary text-primary-foreground shadow'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Input Area */}
      <div className="space-y-3">
        {activeTab === 'sms' && (
          <input
            className="w-full bg-card border border-border rounded-lg px-4 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary disabled:opacity-50"
            placeholder="Phone number (e.g. +1234567890)"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            disabled={scanning}
          />
        )}
        <textarea
          className="w-full bg-card border border-border rounded-lg px-4 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-none disabled:opacity-50"
          placeholder={activeTab === 'email' ? 'Paste email content here...' : 'Paste SMS message here...'}
          rows={8}
          value={activeTab === 'email' ? emailContent : smsContent}
          onChange={(e) => activeTab === 'email' ? setEmailContent(e.target.value) : setSmsContent(e.target.value)}
          disabled={scanning}
        />
      </div>

      {/* Scan Button — immediately shows loading state */}
      <Button
        className={`w-full font-mono text-sm transition-all ${scanning ? 'bg-primary/80' : ''}`}
        onClick={handleScan}
        disabled={scanning}
      >
        {scanning ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            SCANNING — LIVE RESULTS INCOMING...
          </>
        ) : (
          <>
            <Shield className="w-4 h-4 mr-2" />
            SCAN FOR THREATS
          </>
        )}
      </Button>

      {/* Live scanning pulse */}
      {scanning && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-primary/10 border border-primary/20">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
          <span className="font-mono text-[10px] text-primary">
            Analyzing content — dashboard will update the instant results arrive...
          </span>
        </div>
      )}

      {/* Result — rendered as soon as subscription fires */}
      {result && (
        <div className={`rounded-xl border p-4 space-y-3 animate-in fade-in-0 slide-in-from-bottom-2 duration-300 ${
          isThreat ? 'border-red-500/30 bg-red-500/5' : 'border-green-400/30 bg-green-400/5'
        }`}>
          <div className="flex items-center gap-2">
            {isThreat
              ? <AlertTriangle className="w-5 h-5 text-red-500" />
              : <CheckCircle className="w-5 h-5 text-green-400" />}
            <span className={`font-mono text-sm font-bold ${isThreat ? 'text-red-400' : 'text-green-400'}`}>
              {isThreat ? 'THREAT DETECTED' : 'CLEAN — NO THREAT'}
            </span>
            {(result.data?.confidence_score ?? result.data?.confidence) != null && (
              <Badge className={`ml-auto font-mono text-[9px] border ${
                isThreat ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-green-400/10 text-green-400 border-green-400/20'
              }`}>
                {result.data.confidence_score ?? result.data.confidence}% confidence
              </Badge>
            )}
          </div>
          {(result.data?.threat_type || result.data?.scam_type) && (
            <div className="flex justify-between">
              <span className="font-mono text-[10px] text-muted-foreground">Threat Type</span>
              <span className="font-mono text-[10px] text-foreground">
                {result.data.threat_type || result.data.scam_type}
              </span>
            </div>
          )}
          {(result.data?.analysis_reason || result.data?.reason) && (
            <p className="font-mono text-[10px] text-muted-foreground">
              {result.data.analysis_reason || result.data.reason}
            </p>
          )}
          {result.data?.recommendation && (
            <p className="font-mono text-[10px] text-primary">{result.data.recommendation}</p>
          )}
          {result.data?.red_flags && Array.isArray(result.data.red_flags) && result.data.red_flags.length > 0 && (
            <div className="space-y-1">
              <span className="font-mono text-[10px] text-muted-foreground">Red Flags</span>
              {result.data.red_flags.slice(0, 5).map((flag, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <div className="w-1 h-1 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                  <span className="font-mono text-[9px] text-red-400">{flag}</span>
                </div>
              ))}
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            className="w-full font-mono text-xs mt-2"
            onClick={() => { setResult(null); setSession(null); }}
          >
            Scan Again
          </Button>
        </div>
      )}
    </div>
  );
}