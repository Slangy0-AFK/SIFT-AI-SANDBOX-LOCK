import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Lock, Play, RotateCcw, AlertCircle, CheckCircle2, Zap } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function ParadoxSimulator() {
  const [testEmail, setTestEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [corridor, setCorridor] = useState('human');

  const runSimulation = async () => {
    if (!testEmail.trim()) {
      toast.error('Enter an email to test');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await base44.functions.invoke('theologicalMFA', {
        action: 'simulate',
        email: testEmail,
        corridor,
      });

      setResult(response.data);
      toast.success('Simulation completed');
    } catch (error) {
      toast.error(error.message || 'Simulation failed');
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setTestEmail('');
    setResult(null);
    setCorridor('human');
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Lock className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-mono font-bold text-foreground">Paradox Simulator</h1>
          </div>
          <p className="text-muted-foreground font-mono text-sm">Test the Theological MFA authentication engine in a controlled environment.</p>
        </div>

        {/* Simulation Controls */}
        <Card className="bg-card border-primary/30">
          <CardHeader>
            <CardTitle className="font-mono text-lg">Test Configuration</CardTitle>
            <CardDescription>Configure and run authentication simulations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Corridor Selection */}
            <div className="space-y-3">
              <Label className="font-mono text-sm">Authentication Corridor</Label>
              <div className="flex gap-4">
                <button
                  onClick={() => setCorridor('human')}
                  className={`flex-1 px-4 py-3 rounded-lg border-2 font-mono text-sm transition-all ${
                    corridor === 'human'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-card text-muted-foreground hover:border-primary/50'
                  }`}
                >
                  Human Corridor (TOTP)
                </button>
                <button
                  onClick={() => setCorridor('agent')}
                  className={`flex-1 px-4 py-3 rounded-lg border-2 font-mono text-sm transition-all ${
                    corridor === 'agent'
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-border bg-card text-muted-foreground hover:border-accent/50'
                  }`}
                >
                  Agent Corridor (ZKP)
                </button>
              </div>
            </div>

            {/* Email Input */}
            <div className="space-y-3">
              <Label htmlFor="email" className="font-mono text-sm">Test Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="bg-secondary/50 border-border font-mono"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={runSimulation}
                disabled={loading || !testEmail.trim()}
                className="flex-1 gap-2 bg-primary hover:bg-primary/90 font-mono"
              >
                <Play className="w-4 h-4" />
                {loading ? 'Running...' : 'Run Simulation'}
              </Button>
              <Button
                onClick={handleReset}
                variant="outline"
                className="gap-2 font-mono"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <Card className={result.error ? 'border-destructive/50 bg-destructive/5' : 'border-primary/50 bg-primary/5'}>
            <CardHeader>
              <div className="flex items-center gap-2">
                {result.error ? (
                  <>
                    <AlertCircle className="w-5 h-5 text-destructive" />
                    <CardTitle className="font-mono">Simulation Failed</CardTitle>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <CardTitle className="font-mono">Simulation Complete</CardTitle>
                  </>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {result.error ? (
                  <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 font-mono text-sm text-destructive">
                    {result.error}
                  </div>
                ) : (
                  <>
                    {/* Status */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-muted-foreground text-xs font-mono uppercase tracking-wider mb-1">Status</div>
                        <Badge className="font-mono">
                          {result.success ? 'Passed' : 'Failed'}
                        </Badge>
                      </div>
                      <div>
                        <div className="text-muted-foreground text-xs font-mono uppercase tracking-wider mb-1">Corridor</div>
                        <Badge variant="outline" className="font-mono">
                          {result.corridor}
                        </Badge>
                      </div>
                    </div>

                    {/* Strike Count */}
                    {result.strikes !== undefined && (
                      <div className="p-3 rounded-lg bg-secondary/50 border border-border">
                        <div className="text-muted-foreground text-xs font-mono uppercase tracking-wider mb-2">Strike Count</div>
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-accent" />
                          <span className="font-mono font-bold text-lg">{result.strikes}</span>
                          <span className="text-muted-foreground text-sm">/ 3</span>
                        </div>
                      </div>
                    )}

                    {/* Details */}
                    {result.details && (
                      <div className="p-3 rounded-lg bg-secondary/50 border border-border">
                        <div className="text-muted-foreground text-xs font-mono uppercase tracking-wider mb-2">Details</div>
                        <div className="font-mono text-xs text-foreground whitespace-pre-wrap break-words max-h-48 overflow-auto">
                          {typeof result.details === 'string' ? result.details : JSON.stringify(result.details, null, 2)}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info Panel */}
        <Card className="bg-secondary/20 border-border">
          <CardHeader>
            <CardTitle className="font-mono text-sm">Simulation Guide</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm font-mono text-muted-foreground">
            <div>
              <div className="text-foreground font-semibold mb-1">Human Corridor</div>
              <p>Tests TOTP-based authentication for human users. Simulates the challenge-response flow.</p>
            </div>
            <div>
              <div className="text-foreground font-semibold mb-1">Agent Corridor</div>
              <p>Tests Zero-Knowledge Proof (ZKP) authentication for autonomous agents. Validates oracle challenges.</p>
            </div>
            <div>
              <div className="text-foreground font-semibold mb-1">Strike System</div>
              <p>Failed attempts increment strike count. 3 strikes triggers lockout. Resets after successful authentication.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}