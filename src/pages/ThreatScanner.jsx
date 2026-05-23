import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import GmailConnection from '@/components/scanner/GmailConnection';
import { Shield, ShieldAlert, ShieldCheck, Search, Loader2, Mail, MessageSquare, Zap, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

const EMAIL_LISTS_KEY = 'aegis_email_lists';

export default function ThreatScanner() {
  const [activeTab, setActiveTab] = useState('email');
  const [emailContent, setEmailContent] = useState('');
  const [smsContent, setSmsContent] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [session, setSession] = useState(null);
  const [emailLists, setEmailLists] = useState({ blacklist: [], whitelist: [] });
  const [blacklistInput, setBlacklistInput] = useState('');
  const [whitelistInput, setWhitelistInput] = useState('');
  const [selectedThreat, setSelectedThreat] = useState(null);
  const [gmailScanLoading, setGmailScanLoading] = useState(false);
  const [gmailScanResult, setGmailScanResult] = useState(null);
  const unsubscribeRef = useRef(null);

  const { data: emailThreats = [], refetch: refetchEmailThreats, isFetching: loadingEmailThreats } = useQuery({
    queryKey: ['email-threats'],
    queryFn: () => base44.entities.EmailThreat.list('-scanned_date', 50),
    initialData: [],
    refetchInterval: 15000,
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem(EMAIL_LISTS_KEY);
      if (stored) setEmailLists(JSON.parse(stored));
    } catch {
      setEmailLists({ blacklist: [], whitelist: [] });
    }
  }, []);

  const persistLists = (lists) => {
    setEmailLists(lists);
    try {
      localStorage.setItem(EMAIL_LISTS_KEY, JSON.stringify(lists));
    } catch {
      // ignore storage errors
    }
  };

  const normalizeAddress = (value) => value.trim().toLowerCase();

  const addToList = (type, value) => {
    const normalized = normalizeAddress(value);
    if (!normalized) return;
    if (emailLists[type].includes(normalized)) {
      toast.info(`${type === 'blacklist' ? 'Blacklist' : 'Whitelist'} already contains ${normalized}`);
      return;
    }
    const opposite = type === 'blacklist' ? 'whitelist' : 'blacklist';
    persistLists({
      ...emailLists,
      [type]: [...emailLists[type], normalized],
      [opposite]: emailLists[opposite].filter((item) => item !== normalized),
    });
    toast.success(`${normalized} added to ${type}`);
    if (type === 'blacklist') setBlacklistInput('');
    else setWhitelistInput('');
  };

  const removeFromList = (type, value) => {
    const normalized = normalizeAddress(value);
    persistLists({
      ...emailLists,
      [type]: emailLists[type].filter((item) => item !== normalized),
    });
    toast.success(`${normalized} removed from ${type}`);
  };

  const applyThreatStatus = async (threat, status, blockSender = false) => {
    try {
      await base44.entities.EmailThreat.update(threat.id, { status });
      if (blockSender && threat.from_address) {
        addToList('blacklist', threat.from_address);
      }
      toast.success(`Email threat marked ${status}`);
      if (status === 'reviewed') setSelectedThreat(null);
      refetchEmailThreats();
    } catch (err) {
      toast.error('Unable to update threat record: ' + err.message);
    }
  };

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

      const newSession = await base44.entities.ScanSession.create({
        user_id: user.id,
        scan_type: activeTab,
        status: 'scanning',
        input_value: inputValue.substring(0, 500),
      });
      setSession(newSession);

      let res;
      if (activeTab === 'email') {
        res = await base44.functions.invoke('phishingAnalyzer', {
          action: 'analyze_email',
          subject: '',
          sender: '',
          body: emailContent,
        });
      } else {
        res = await base44.functions.invoke('analyzeTextThreat', {
          text: smsContent,
          phone_number: phoneNumber,
        });
      }

      const data = res.data;
      const isThreat = data?.is_threat || (data?.confidence_score || data?.confidence || 0) > 60;

      await base44.entities.ScanSession.update(newSession.id, {
        status: 'complete',
        result: JSON.stringify(data),
        is_threat: !!isThreat,
        threat_level: isThreat ? (data?.threat_type || 'unknown') : 'safe',
      });

      await base44.entities.SecurityEvent.create({
        event_type: 'threat_scan',
        severity: isThreat ? 'critical' : 'info',
        details: `${activeTab === 'email' ? 'Email' : 'SMS'} scan completed. Threat detected: ${isThreat ? 'yes' : 'no'}.`,
        environment: 'production',
      }).catch(() => {});
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

  const scanGmailInbox = async () => {
    setGmailScanLoading(true);
    setGmailScanResult(null);

    try {
      const res = await base44.functions.invoke('scanGmail', {});
      setGmailScanResult(res.data);
      toast.success(`Gmail scan finished: ${res.data.threats_found || 0} threat(s) found`);
      refetchEmailThreats();
      await base44.entities.SecurityEvent.create({
        event_type: 'gmail_scan',
        severity: (res.data.threats_found || 0) > 0 ? 'critical' : 'info',
        details: `Gmail inbox scan completed. ${res.data.threats_found || 0} threats found.`,
        environment: 'production',
      }).catch(() => {});
    } catch (err) {
      toast.error('Gmail scan failed: ' + err.message);
    } finally {
      setGmailScanLoading(false);
    }
  };

  const resetScan = () => {
    setResult(null);
    setSession(null);
  };

  const activeThreatCount = emailThreats.filter((item) => item.status === 'detected').length;
  const isThreat = result?.data?.is_threat || (result?.data?.confidence_score || result?.data?.confidence || 0) > 60;

  return (
    <div className="min-h-screen bg-background p-4 pb-24 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            <h1 className="font-mono text-lg font-bold tracking-wider text-foreground">EMAIL PROTECTION</h1>
          </div>
          <p className="font-mono text-[9px] text-muted-foreground tracking-wide mt-1">
            Scan email content, review threats in a sandbox view, and manage trusted or blocked senders.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 w-full sm:w-auto">
          <div className="rounded-2xl border border-border bg-card p-3">
            <p className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest">Inbox threats</p>
            <p className="font-mono text-2xl font-bold text-foreground mt-2">{activeThreatCount}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-3">
            <p className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest">Gmail scan status</p>
            <p className="font-mono text-2xl font-bold text-foreground mt-2">{gmailScanResult ? 'Updated' : 'Idle'}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-4">
          <GmailConnection />

          <div className="rounded-3xl border border-border bg-card p-4 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">Gmail Inbox Scan</p>
                <p className="font-mono text-[11px] text-foreground mt-1">Scan the latest Gmail messages for phishing, malware, and spoofing.</p>
              </div>
              <Button onClick={scanGmailInbox} disabled={gmailScanLoading}>
                {gmailScanLoading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Scanning...</>
                ) : (
                  <><Zap className="w-4 h-4 mr-2" />Scan Inbox</>
                )}
              </Button>
            </div>
            {gmailScanResult && (
              <div className="rounded-2xl border border-border/50 bg-secondary/10 p-3">
                <p className="font-mono text-[10px] text-muted-foreground">Last Gmail scan</p>
                <p className="font-mono text-sm text-foreground mt-1">
                  Scanned {gmailScanResult.scanned || 0} messages · Found {gmailScanResult.threats_found || 0} threats.
                </p>
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-border bg-card p-4 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">Detected email threats</p>
                <p className="font-mono text-[11px] text-foreground mt-1">Review suspicious messages and quarantine senders.</p>
              </div>
              <Badge className="font-mono text-[9px] rounded-full border border-border bg-secondary text-foreground">
                {emailThreats.length} tracked
              </Badge>
            </div>

            <div className="space-y-3">
              {loadingEmailThreats ? (
                <div className="rounded-2xl border border-border/50 bg-secondary/10 p-4 text-center font-mono text-[10px] text-muted-foreground">
                  Loading inbox threats...
                </div>
              ) : emailThreats.length === 0 ? (
                <div className="rounded-2xl border border-border/50 bg-secondary/10 p-4 text-center font-mono text-[10px] text-muted-foreground">
                  No email threats detected yet. Run the inbox scan or paste suspicious content below.
                </div>
              ) : (
                <div className="space-y-3">
                  {emailThreats.slice(0, 8).map((threat) => (
                    <button
                      key={threat.id}
                      onClick={() => setSelectedThreat(threat)}
                      className="w-full text-left rounded-2xl border border-border/50 bg-secondary/10 p-3 hover:border-primary/30 transition"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-mono text-[11px] font-semibold text-foreground truncate">{threat.subject || 'Untitled email threat'}</p>
                          <p className="font-mono text-[9px] text-muted-foreground mt-1 truncate">{threat.from_address || 'unknown sender'}</p>
                        </div>
                        <Badge className={`font-mono text-[8px] rounded-full border px-2 py-1 ${threat.status === 'blocked' ? 'bg-destructive/10 border-destructive/20 text-destructive' : threat.status === 'reviewed' ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-amber-400/10 border-amber-400/20 text-amber-400'}`}>
                          {threat.status?.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-[9px] text-muted-foreground">
                        <span>{threat.threat_type || 'unknown'}</span>
                        <span>confidence {threat.confidence_score ?? 'n/a'}%</span>
                        <span>{new Date(threat.scanned_date).toLocaleString()}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-border bg-card p-4 space-y-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-primary" />
              <p className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground">Review sandbox</p>
            </div>
            {selectedThreat ? (
              <div className="space-y-3">
                <div className="rounded-2xl border border-border/50 bg-secondary/10 p-4">
                  <p className="font-mono text-[10px] text-muted-foreground">From</p>
                  <p className="font-mono text-sm text-foreground break-words">{selectedThreat.from_address}</p>
                  <p className="font-mono text-[10px] text-muted-foreground mt-3">Subject</p>
                  <p className="font-mono text-sm text-foreground break-words">{selectedThreat.subject}</p>
                </div>
                <div className="rounded-2xl border border-border/50 bg-secondary/10 p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] text-muted-foreground">Threat type</span>
                    <span className="font-mono text-[10px] text-foreground">{selectedThreat.threat_type || 'unknown'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] text-muted-foreground">Confidence</span>
                    <span className="font-mono text-[10px] text-foreground">{selectedThreat.confidence_score ?? 'n/a'}%</span>
                  </div>
                  <pre className="whitespace-pre-wrap break-words rounded-xl bg-background px-3 py-3 text-[10px] text-muted-foreground border border-border/50 max-h-52 overflow-auto">
                    {selectedThreat.analysis_reason || 'No additional details available.'}
                  </pre>
                </div>
                <div className="grid gap-2">
                  <Button onClick={() => applyThreatStatus(selectedThreat, 'reviewed')}>Mark Reviewed</Button>
                  <Button variant="outline" onClick={() => applyThreatStatus(selectedThreat, 'blocked', true)}>Blacklist Sender</Button>
                  <Button variant="secondary" onClick={() => setSelectedThreat(null)}>Close Review</Button>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-border/50 bg-secondary/10 p-4 text-center font-mono text-[10px] text-muted-foreground">
                Select a detected email from the inbox list to review it in a sandbox-style panel.
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-border bg-card p-4 space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-green-500" />
              <p className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground">Sender policies</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Whitelist trusted senders</p>
                <div className="flex gap-2">
                  <Input
                    placeholder="trusted@example.com"
                    value={whitelistInput}
                    onChange={(e) => setWhitelistInput(e.target.value)}
                    className="font-mono text-xs"
                  />
                  <Button onClick={() => addToList('whitelist', whitelistInput)}>Add</Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {emailLists.whitelist.map((sender) => (
                    <button
                      key={sender}
                      onClick={() => removeFromList('whitelist', sender)}
                      className="rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 text-[10px] font-mono text-green-500"
                    >
                      {sender} ×
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Blacklist malicious senders</p>
                <div className="flex gap-2">
                  <Input
                    placeholder="bad@actor.com"
                    value={blacklistInput}
                    onChange={(e) => setBlacklistInput(e.target.value)}
                    className="font-mono text-xs"
                  />
                  <Button variant="destructive" onClick={() => addToList('blacklist', blacklistInput)}>Blacklist</Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {emailLists.blacklist.map((sender) => (
                    <button
                      key={sender}
                      onClick={() => removeFromList('blacklist', sender)}
                      className="rounded-full border border-destructive/20 bg-destructive/10 px-3 py-1 text-[10px] font-mono text-destructive"
                    >
                      {sender} ×
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-card p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          <p className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground">Manual content scanner</p>
        </div>

        <div className="flex gap-2 rounded-2xl border border-border/50 bg-secondary/10 p-4 flex-col">
          <div className="flex gap-2 flex-col sm:flex-row">
            <button
              onClick={() => { setActiveTab('email'); setResult(null); }}
              className={`flex-1 rounded-2xl border px-4 py-3 font-mono text-[10px] uppercase tracking-widest ${activeTab === 'email' ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground'}`}
            >
              Email
            </button>
            <button
              onClick={() => { setActiveTab('sms'); setResult(null); }}
              className={`flex-1 rounded-2xl border px-4 py-3 font-mono text-[10px] uppercase tracking-widest ${activeTab === 'sms' ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground'}`}
            >
              SMS
            </button>
          </div>

          {activeTab === 'sms' && (
            <Input
              placeholder="Enter phone number to inspect"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="font-mono text-xs"
            />
          )}

          <textarea
            className="w-full min-h-[180px] rounded-2xl border border-border bg-background px-4 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
            placeholder={activeTab === 'email' ? 'Paste email content here...' : 'Paste SMS message here...'}
            rows={8}
            value={activeTab === 'email' ? emailContent : smsContent}
            onChange={(e) => activeTab === 'email' ? setEmailContent(e.target.value) : setSmsContent(e.target.value)}
            disabled={scanning}
          />

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <Button onClick={handleScan} disabled={scanning}>
              {scanning ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Scanning...</>
              ) : (
                <><Search className="w-4 h-4 mr-2" />Scan for Threats</>
              )}
            </Button>
            <Button variant="outline" onClick={resetScan} disabled={scanning}>
              Reset
            </Button>
          </div>
        </div>

        {scanning && (
          <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4 font-mono text-[10px] text-primary">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyzing content — this may take a moment.
            </div>
          </div>
        )}

        {result && (
          <div className={`rounded-2xl border p-4 ${isThreat ? 'border-red-500/30 bg-red-500/10' : 'border-green-400/30 bg-green-400/10'}`}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {isThreat ? <AlertTriangle className="w-4 h-4 text-destructive" /> : <CheckCircle className="w-4 h-4 text-green-500" />}
                <div>
                  <p className="font-mono text-sm font-bold uppercase">{isThreat ? 'Threat Detected' : 'Clean Content'}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">{result.data?.threat_type ? result.data.threat_type.toUpperCase() : 'analysis result'}</p>
                </div>
              </div>
              {result.data?.confidence_score != null && (
                <Badge className="font-mono text-[9px] border border-border bg-background text-foreground">
                  {result.data.confidence_score}% confidence
                </Badge>
              )}
            </div>
            <div className="mt-3 space-y-2">
              {result.data?.analysis_reason && (
                <p className="font-mono text-[10px] text-muted-foreground">{result.data.analysis_reason}</p>
              )}
              {result.data?.red_flags && Array.isArray(result.data.red_flags) && result.data.red_flags.length > 0 && (
                <div className="rounded-2xl border border-border/50 bg-secondary/10 p-3">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Red Flags</p>
                  <ul className="mt-2 space-y-1 text-[10px] text-destructive">
                    {result.data.red_flags.slice(0, 5).map((flag, index) => (
                      <li key={index}>• {flag}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="rounded-2xl border border-border/50 bg-background p-3 font-mono text-[10px] text-muted-foreground whitespace-pre-wrap">
                {activeTab === 'email' ? emailContent : smsContent}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
