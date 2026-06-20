import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, CheckCircle, Loader2, AlertTriangle } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const GMAIL_CONNECTOR_ID = '6a0f21a2f39d9bf2ebd374e6';

export default function GmailConnection({ onConnected }) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is connected to Gmail
  const checkConnection = async () => {
    try {
      // Try to invoke scanGmail - if it succeeds, user is connected
      await base44.functions.invoke('scanGmail', { test_connection: true });
      setIsConnected(true);
      setError(null);
    } catch (err) {
      if (err.message?.includes('not connected') || err.message?.includes('Gmail')) {
        setIsConnected(false);
      }
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkConnection();
  }, []);

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      setError(null);
      
      // Get OAuth URL for app user connector
      const url = await base44.connectors.connectAppUser(GMAIL_CONNECTOR_ID);
      
      // Open in popup and poll for completion
      const popup = window.open(url, '_blank', 'width=600,height=700');
      
      const checkInterval = setInterval(() => {
        if (!popup || popup.closed) {
          clearInterval(checkInterval);
          // User finished OAuth flow, check connection status
          setTimeout(() => {
            checkConnection();
            if (onConnected) onConnected();
          }, 1000);
        }
      }, 500);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await base44.connectors.disconnectAppUser(GMAIL_CONNECTOR_ID);
      setIsConnected(false);
      if (onConnected) onConnected();
    } catch (err) {
      setError(err.message);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Checking connection...</span>
        </CardContent>
      </Card>
    );
  }

  if (isConnected) {
    return (
      <Card className="border-green-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-500">
            <CheckCircle className="w-5 h-5" />
            Gmail Connected
          </CardTitle>
          <CardDescription>
            Your Gmail account is connected and ready for scanning
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="bg-green-500/10 border-green-500/30">
            <AlertDescription className="text-sm">
              <strong>Privacy Note:</strong> Only you can access your Gmail data. 
              Each user connects their own account - your emails are never shared.
            </AlertDescription>
          </Alert>
          <Button
            onClick={handleDisconnect}
            variant="outline"
            className="w-full mt-4"
          >
            Disconnect Gmail
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-yellow-500/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-yellow-500">
          <AlertTriangle className="w-5 h-5" />
          Gmail Connection Required
        </CardTitle>
        <CardDescription>
          Connect your Gmail account to scan for email threats
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="bg-blue-500/10 border-blue-500/30">
          <Mail className="w-4 h-4 text-blue-500" />
          <AlertDescription className="text-sm">
            You'll be asked to grant SIFT-AI permission to read and manage your Gmail labels.
            This allows us to scan for threats and mark suspicious emails.
          </AlertDescription>
        </Alert>
        
        {error && (
          <Alert className="bg-red-500/10 border-red-500/30">
            <AlertDescription className="text-sm text-red-500">
              {error}
            </AlertDescription>
          </Alert>
        )}

        <Button
          onClick={handleConnect}
          disabled={isConnecting}
          className="w-full"
          size="lg"
        >
          {isConnecting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <Mail className="w-4 h-4 mr-2" />
              Connect Gmail
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          By connecting, you agree to let SIFT-AI scan your Gmail for security threats.
          You can disconnect at any time.
        </p>
      </CardContent>
    </Card>
  );
}