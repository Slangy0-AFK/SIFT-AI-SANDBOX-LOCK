import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, ShieldAlert, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import GmailConnection from '@/components/scanner/GmailConnection';
import OutlookConnection from '@/components/scanner/OutlookConnection';

export default function EmailScanner() {
  const [activeTab, setActiveTab] = useState('gmail');

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-mono text-xl font-bold tracking-wider text-foreground">EMAIL SCANNER</h1>
          <p className="font-mono text-xs text-muted-foreground tracking-widest mt-1">
            THREAT DETECTION & LABELS
          </p>
        </div>
      </div>

      <div className="flex gap-4 border-b border-border pb-2">
        <button 
          onClick={() => setActiveTab('gmail')}
          className={`font-mono text-xs pb-2 border-b-2 transition-colors ${activeTab === 'gmail' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}
        >
          GMAIL
        </button>
        <button 
          onClick={() => setActiveTab('outlook')}
          className={`font-mono text-xs pb-2 border-b-2 transition-colors ${activeTab === 'outlook' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}
        >
          OUTLOOK
        </button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-mono text-xs tracking-wider flex items-center gap-2">
            <Mail className="w-4 h-4 text-primary" /> {activeTab === 'gmail' ? 'GMAIL INBOX SCANNER' : 'OUTLOOK INBOX SCANNER'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              {activeTab === 'gmail' ? (
                <GmailConnection onConnected={() => toast.success('Gmail Connected! Scanning...')} />
              ) : (
                <OutlookConnection onConnected={() => toast.success('Outlook Connected! Scanning...')} />
              )}
            </div>
            
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-border bg-card">
                <p className="font-mono text-[11px] font-bold text-foreground mb-4">RECENT EMAIL THREATS</p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 rounded-lg border border-destructive/20 bg-destructive/5">
                    <ShieldAlert className="w-5 h-5 text-destructive flex-shrink-0" />
                    <div>
                      <p className="font-mono text-xs font-bold text-destructive">Suspicious Login Attempt</p>
                      <p className="font-mono text-xs text-muted-foreground mt-1">From: no-reply@security-alert-verify.com</p>
                      <p className="font-mono text-xs text-destructive mt-1">Labeled as: PHISHING</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-3 rounded-lg border border-green-500/20 bg-green-500/5">
                    <ShieldCheck className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <div>
                      <p className="font-mono text-xs font-bold text-green-500">Weekly Report</p>
                      <p className="font-mono text-xs text-muted-foreground mt-1">From: team@company.com</p>
                      <p className="font-mono text-xs text-green-500 mt-1">Labeled as: SAFE</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}