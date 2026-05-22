import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, Search, Mail, MessageSquare, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
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
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleScan = async () => {
    if (activeTab === 'email' && !emailContent.trim()) {
      toast.error('Please paste email content to scan');
      return;
    }
    if (activeTab === 'sms' && (!smsContent.trim() || !phoneNumber.trim())) {
      toast.error('Please enter phone number and message content');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      if (activeTab === 'email') {
        const res = await base44.functions.invoke('phishingAnalyzer', { content: emailContent });
        setResult({ type: 'email', data: res.data });
      } else {
        const res = await base44.functions.invoke('analyzeTextThreat', {
          phone_number: phoneNumber,
          message_content: smsContent,
        });
        setResult({ type: 'sms', data: res.data });
      }
      toast.success('Scan complete');
    } catch (err) {
      toast.error('Scan failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const isThreat = result?.data?.is_threat || result?.data?.confidence_score > 60;

  return (
    <div className="min-h-screen bg-background p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Search className="w-5 h-5 text-primary" />
        <h1 className="font-mono text-lg font-bold text-foreground tracking-wider">THREAT SCANNER</h1>
      </div>

      {/* Tab Pill Bar */}
      <div className="flex gap-2 p-1 bg-secondary rounded-xl">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setResult(null); }}
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
            className="w-full bg-card border border-border rounded-lg px-4 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
            placeholder="Phone number (e.g. +1234567890)"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
          />
        )}
        <textarea
          className="w-full bg-card border border-border rounded-lg px-4 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-none"
          placeholder={activeTab === 'email' ? 'Paste email content here...' : 'Paste SMS message here...'}
          rows={8}
          value={activeTab === 'email' ? emailContent : smsContent}
          onChange={(e) => activeTab === 'email' ? setEmailContent(e.target.value) : setSmsContent(e.target.value)}
        />
      </div>

      <Button className="w-full font-mono text-sm" onClick={handleScan} disabled={loading}>
        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Shield className="w-4 h-4 mr-2" />}
        {loading ? 'SCANNING...' : 'SCAN FOR THREATS'}
      </Button>

      {/* Result */}
      {result && (
        <div className={`rounded-xl border p-4 space-y-3 ${isThreat ? 'border-red-500/30 bg-red-500/5' : 'border-green-400/30 bg-green-400/5'}`}>
          <div className="flex items-center gap-2">
            {isThreat
              ? <AlertTriangle className="w-5 h-5 text-red-500" />
              : <CheckCircle className="w-5 h-5 text-green-400" />}
            <span className={`font-mono text-sm font-bold ${isThreat ? 'text-red-400' : 'text-green-400'}`}>
              {isThreat ? 'THREAT DETECTED' : 'CLEAN — NO THREAT'}
            </span>
            {result.data?.confidence_score != null && (
              <Badge className={`ml-auto font-mono text-[9px] border ${isThreat ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-green-400/10 text-green-400 border-green-400/20'}`}>
                {result.data.confidence_score}% confidence
              </Badge>
            )}
          </div>
          {result.data?.threat_type && (
            <div className="flex justify-between">
              <span className="font-mono text-[10px] text-muted-foreground">Threat Type</span>
              <span className="font-mono text-[10px] text-foreground">{result.data.threat_type}</span>
            </div>
          )}
          {result.data?.analysis_reason && (
            <p className="font-mono text-[10px] text-muted-foreground">{result.data.analysis_reason}</p>
          )}
          {result.data?.recommendation && (
            <p className="font-mono text-[10px] text-primary">{result.data.recommendation}</p>
          )}
        </div>
      )}
    </div>
  );
}