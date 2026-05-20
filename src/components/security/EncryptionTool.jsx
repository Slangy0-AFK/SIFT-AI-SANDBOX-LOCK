import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, Unlock, Key, Shield, Copy, Check, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export default function EncryptionTool() {
  const [action, setAction] = useState('encrypt');
  const [inputData, setInputData] = useState('');
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const encryptMutation = useMutation({
    mutationFn: async (data) => {
      const response = await base44.functions.invoke('encryptData', {
        action: 'encrypt',
        data: typeof data === 'object' ? data : JSON.parse(data),
      });
      return response.data;
    },
    onSuccess: (data) => {
      setResult(data);
      toast.success('Data encrypted successfully');
    },
    onError: (error) => {
      toast.error(`Encryption failed: ${error.message}`);
    },
  });

  const decryptMutation = useMutation({
    mutationFn: async (encryptedData) => {
      const response = await base44.functions.invoke('encryptData', {
        action: 'decrypt',
        data: encryptedData,
      });
      return response.data;
    },
    onSuccess: (data) => {
      setResult(data);
      toast.success('Data decrypted successfully');
    },
    onError: (error) => {
      toast.error(`Decryption failed: ${error.message}`);
    },
  });

  const hashMutation = useMutation({
    mutationFn: async (data) => {
      const response = await base44.functions.invoke('encryptData', {
        action: 'hash',
        data,
      });
      return response.data;
    },
    onSuccess: (data) => {
      setResult(data);
      toast.success('Hash generated successfully');
    },
    onError: (error) => {
      toast.error(`Hashing failed: ${error.message}`);
    },
  });

  const generateKeyMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('encryptData', {
        action: 'generate_key',
      });
      return response.data;
    },
    onSuccess: (data) => {
      setResult(data);
      toast.success('Encryption key generated');
    },
  });

  const handleSubmit = () => {
    if (!inputData) {
      toast.error('Please enter data');
      return;
    }

    if (action === 'encrypt') {
      encryptMutation.mutate(inputData);
    } else if (action === 'decrypt') {
      decryptMutation.mutate(inputData);
    } else if (action === 'hash') {
      hashMutation.mutate(inputData);
    }
  };

  const handleCopy = () => {
    if (result?.encrypted || result?.decrypted || result?.hash || result?.key) {
      const textToCopy = result.encrypted || result.decrypted || result.hash || result.key;
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Copied to clipboard');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="w-5 h-5 text-primary" />
          Data Encryption
        </CardTitle>
        <CardDescription>Encrypt, decrypt, or hash sensitive data using AES-256</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={action === 'encrypt' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAction('encrypt')}
          >
            <Lock className="w-4 h-4 mr-1" /> Encrypt
          </Button>
          <Button
            variant={action === 'decrypt' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAction('decrypt')}
          >
            <Unlock className="w-4 h-4 mr-1" /> Decrypt
          </Button>
          <Button
            variant={action === 'hash' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAction('hash')}
          >
            <Shield className="w-4 h-4 mr-1" /> Hash
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={generateKeyMutation.mutate}
            disabled={generateKeyMutation.isPending}
          >
            <Key className="w-4 h-4 mr-1" /> Generate Key
          </Button>
        </div>

        <div className="space-y-2">
          <Label>Input Data</Label>
          <Textarea
            value={inputData}
            onChange={(e) => setInputData(e.target.value)}
            placeholder={action === 'encrypt' ? 'Enter data to encrypt...' : action === 'decrypt' ? 'Enter encrypted data...' : 'Enter data to hash...'}
            className="min-h-[100px] font-mono text-xs"
          />
        </div>

        <Button onClick={handleSubmit} disabled={encryptMutation.isPending || decryptMutation.isPending || hashMutation.isPending}>
          {action === 'encrypt' && <Lock className="w-4 h-4 mr-2" />}
          {action === 'decrypt' && <Unlock className="w-4 h-4 mr-2" />}
          {action === 'hash' && <Shield className="w-4 h-4 mr-2" />}
          {action === 'encrypt' ? 'Encrypt' : action === 'decrypt' ? 'Decrypt' : 'Hash'}
        </Button>

        {result && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Result</Label>
              <Button variant="ghost" size="sm" onClick={handleCopy}>
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            <Alert>
              <AlertDescription className="font-mono text-xs break-all">
                {result.encrypted && <pre>{result.encrypted}</pre>}
                {result.decrypted && <pre>{JSON.stringify(result.decrypted, null, 2)}</pre>}
                {result.hash && <pre>{result.hash}</pre>}
                {result.key && (
                  <div>
                    <p className="mb-2">Save this key securely in your ENCRYPTION_KEY secret:</p>
                    <pre className="bg-destructive/10 p-2 rounded">{result.key}</pre>
                  </div>
                )}
              </AlertDescription>
            </Alert>
            {result.algorithm && (
              <Badge variant="outline">{result.algorithm}</Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}