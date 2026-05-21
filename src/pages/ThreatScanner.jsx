import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Mail, 
  MessageSquare, 
  Phone, 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Loader2,
  RefreshCw,
  Eye,
  Trash2,
  Code
} from 'lucide-react';
import { format } from 'date-fns';
import GmailConnection from '@/components/scanner/GmailConnection';
import EncodingDetector from '@/components/scanner/EncodingDetector';

export default function ThreatScanner() {
  const [smsText, setSmsText] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [activeTab, setActiveTab] = useState('email');
  const [isGmailConnected, setIsGmailConnected] = useState(false);

  const queryClient = useQueryClient();

  // Fetch email threats
  const { data: emailThreats, isLoading: loadingEmails } = useQuery({
    queryKey: ['emailThreats'],
    queryFn: () => base44.entities.EmailThreat.filter({}, '-scanned_date', 50)
  });

  // Fetch text threats
  const { data: textThreats, isLoading: loadingTexts } = useQuery({
    queryKey: ['textThreats'],
    queryFn: () => base44.entities.TextThreat.filter({}, '-analyzed_date', 50)
  });

  // Gmail scan mutation
  const scanGmailMutation = useMutation({
    mutationFn: () => base44.functions.invoke('scanGmail', {}),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['emailThreats'] });
      alert(`Scan complete! Found ${data.threats_found} threats in ${data.scanned} emails.`);
    },
    onError: (error) => {
      if (error.message?.includes('not connected')) {
        alert('Please connect your Gmail account first.');
        setActiveTab('email');
      }
    }
  });

  // Analyze text mutation
  const analyzeTextMutation = useMutation({
    mutationFn: (payload) => base44.functions.invoke('analyzeTextThreat', payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['textThreats'] });
      if (data.is_scam) {
        alert(`⚠️ SCAM DETECTED: ${data.scam_type} (${data.confidence}% confidence)`);
      } else {
        alert('✅ This message appears safe.');
      }
    }
  });

  const handleScanGmail = () => {
    scanGmailMutation.mutate();
  };

  const handleAnalyzeText = () => {
    if (!smsText.trim() && !phoneNumber.trim()) {
      alert('Please enter a text message or phone number');
      return;
    }
    analyzeTextMutation.mutate({
      text: smsText.trim() || undefined,
      phone_number: phoneNumber.trim() || undefined
    });
  };

  const threatTypeColors = {
    phishing: 'bg-red-500/20 text-red-400 border-red-500/30',
    scam: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    malware: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    spoofing: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
  };

  const scamTypeColors = {
    phishing: 'bg-red-500/20 text-red-400',
    lottery: 'bg-yellow-500/20 text-yellow-400',
    banking: 'bg-orange-500/20 text-orange-400',
    delivery: 'bg-blue-500/20 text-blue-400',
    romance: 'bg-pink-500/20 text-pink-400',
    tech_support: 'bg-purple-500/20 text-purple-400'
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Shield className="w-8 h-8 text-primary" />
              Threat Scanner
            </h1>
            <p className="text-muted-foreground mt-1">
              Scan emails, SMS messages, and phone numbers for scams and threats
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="email" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Email
            </TabsTrigger>
            <TabsTrigger value="sms" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              SMS/Phone
            </TabsTrigger>
            <TabsTrigger value="encoding" className="flex items-center gap-2">
              <Code className="w-4 h-4" />
              Encoding Detector
            </TabsTrigger>
          </TabsList>

          {/* Email Scanner Tab */}
          <TabsContent value="email" className="space-y-6">
            <GmailConnection onConnected={() => setIsGmailConnected(true)} />
            
            {isGmailConnected && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="w-5 h-5 text-primary" />
                    Gmail Threat Scan
                  </CardTitle>
                  <CardDescription>
                    Scan your Gmail inbox for phishing, scams, and malicious emails
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={handleScanGmail}
                    disabled={scanGmailMutation.isPending}
                    className="w-full"
                  >
                    {scanGmailMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Scanning...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Scan Gmail Inbox
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {emailThreats && emailThreats.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    Detected Email Threats ({emailThreats.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {emailThreats.map((threat) => (
                      <div
                        key={threat.id}
                        className="p-4 border border-border rounded-lg bg-card/50"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className={threatTypeColors[threat.threat_type]}>
                                {threat.threat_type}
                              </Badge>
                              <Badge variant="outline">
                                {threat.confidence_score}% confidence
                              </Badge>
                            </div>
                            <p className="font-medium text-foreground mb-1">
                              {threat.subject}
                            </p>
                            <p className="text-sm text-muted-foreground mb-2">
                              From: {threat.from_address}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {threat.analysis_reason}
                            </p>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(threat.scanned_date), 'MMM d, h:mm a')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* SMS & Phone Checker Tab */}
          <TabsContent value="sms" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  SMS Scam Analyzer
                </CardTitle>
                <CardDescription>
                  Paste a suspicious text message to check if it's a scam
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Paste the suspicious text message here..."
                  value={smsText}
                  onChange={(e) => setSmsText(e.target.value)}
                  className="min-h-[120px]"
                />
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or check a phone number</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter phone number to check"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="flex-1"
                  />
                </div>
                <Button
                  onClick={handleAnalyzeText}
                  disabled={analyzeTextMutation.isPending || (!smsText.trim() && !phoneNumber.trim())}
                  className="w-full"
                >
                  {analyzeTextMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4 mr-2" />
                      Analyze
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {textThreats && textThreats.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    Analyzed Text Threats ({textThreats.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {textThreats.map((threat) => (
                      <div
                        key={threat.id}
                        className="p-4 border border-border rounded-lg bg-card/50"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <Badge className={scamTypeColors[threat.scam_type]}>
                            {threat.scam_type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(threat.analyzed_date), 'MMM d, h:mm a')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {threat.phone_number}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {threat.message_content}
                        </p>
                        <div className="text-xs text-muted-foreground">
                          <strong>Red flags:</strong> {threat.red_flags}
                        </div>
                        <div className="text-xs text-primary mt-2">
                          <strong>Recommendation:</strong> {threat.recommendation}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Encoding Detector Tab */}
          <TabsContent value="encoding" className="space-y-6">
            <EncodingDetector />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}