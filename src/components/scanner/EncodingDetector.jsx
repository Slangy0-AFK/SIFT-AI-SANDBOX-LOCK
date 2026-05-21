import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, Scan, AlertTriangle, CheckCircle, Lock, Unlock, 
  Code, Eye, EyeOff, FileText, Layers, Binary, Activity
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function EncodingDetector({ onDetectionComplete }) {
  const [inputContent, setInputContent] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [results, setResults] = useState(null);
  const [showDecoded, setShowDecoded] = useState(false);

  const handleScan = async () => {
    if (!inputContent.trim()) {
      toast.error('Please enter content to analyze');
      return;
    }

    setIsScanning(true);
    setResults(null);

    try {
      const response = await base44.functions.invoke('detectEncoding', {
        content: inputContent,
        source: 'manual_scan'
      });

      setResults(response.data);
      
      if (onDetectionComplete) {
        onDetectionComplete(response.data);
      }

      if (response.data.obfuscation_level >= 7) {
        toast.warning(`High obfuscation detected: ${response.data.obfuscation_level}/10`);
      } else if (response.data.encoding_detected !== 'none') {
        toast.success(`Encoding detected: ${response.data.encoding_detected.toUpperCase()}`);
      } else {
        toast.info('No encoding detected - content appears plain text');
      }
    } catch (error) {
      toast.error(`Scan failed: ${error.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  const getEncodingIcon = (encoding) => {
    switch (encoding) {
      case 'base64': return Binary;
      case 'base60': return Code;
      case 'base32': return Binary;
      case 'hex': return Code;
      case 'unicode': return Layers;
      case 'mixed': return Layers;
      default: return Shield;
    }
  };

  const getSeverityColor = (level) => {
    if (level >= 8) return 'bg-red-500';
    if (level >= 6) return 'bg-orange-500';
    if (level >= 4) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getEncodingColor = (encoding) => {
    switch (encoding) {
      case 'base64': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'base60': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'base32': return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
      case 'hex': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'unicode': return 'bg-pink-500/20 text-pink-400 border-pink-500/30';
      case 'mixed': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-green-500/20 text-green-400 border-green-500/30';
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Scan className="w-6 h-6 text-primary" />
            <div>
              <CardTitle className="font-mono text-sm">Encoding & Obfuscation Detector</CardTitle>
              <CardDescription className="font-mono text-xs">
                Detect Base64, Base60, and other encoding-based threats
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <label className="font-mono text-xs text-muted-foreground mb-2 block">
                Content to Analyze
              </label>
              <textarea
                value={inputContent}
                onChange={(e) => setInputContent(e.target.value)}
                placeholder="Paste suspicious content, code, or payload here..."
                className="w-full h-32 p-3 bg-secondary/30 border border-border rounded-lg font-mono text-xs resize-none focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <Button
              onClick={handleScan}
              disabled={isScanning || !inputContent.trim()}
              className="w-full font-mono text-xs gap-2"
            >
              {isScanning ? (
                <>
                  <Activity className="w-4 h-4 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <Scan className="w-4 h-4" />
                  Analyze Encoding
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <AnimatePresence>
        {results && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className={`border-2 ${
              results.obfuscation_level >= 7 ? 'border-red-500/50' :
              results.obfuscation_level >= 5 ? 'border-orange-500/50' :
              'border-primary/30'
            }`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {React.createElement(getEncodingIcon(results.encoding_detected), {
                      className: `w-6 h-6 ${
                        results.encoding_detected !== 'none' ? 'text-primary' : 'text-green-400'
                      }`}
                    )}
                    <div>
                      <CardTitle className="font-mono text-sm">
                        {results.encoding_detected !== 'none' 
                          ? `${results.encoding_detected.toUpperCase()} Encoding Detected`
                          : 'No Encoding Detected'
                        }
                      </CardTitle>
                      <CardDescription className="font-mono text-xs">
                        Confidence: {results.confidence}% | Obfuscation: {results.obfuscation_level}/10
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className={getEncodingColor(results.encoding_detected)}>
                    {results.encoding_detected !== 'none' ? 'THREAT' : 'SAFE'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Obfuscation Level */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs text-muted-foreground">Obfuscation Level</span>
                    <span className={`font-mono text-xs font-bold ${
                      results.obfuscation_level >= 8 ? 'text-red-400' :
                      results.obfuscation_level >= 6 ? 'text-orange-400' :
                      results.obfuscation_level >= 4 ? 'text-yellow-400' :
                      'text-green-400'
                    }`}>
                      {results.obfuscation_level}/10
                    </span>
                  </div>
                  <Progress 
                    value={results.obfuscation_level * 10} 
                    className={`h-2 ${getSeverityColor(results.obfuscation_level)}`}
                  />
                </div>

                {/* Indicators */}
                {results.indicators.length > 0 && (
                  <div>
                    <h4 className="font-mono text-xs font-bold mb-2">Detection Indicators:</h4>
                    <div className="space-y-1">
                      {results.indicators.map((indicator, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <CheckCircle className="w-3 h-3 text-green-400 flex-shrink-0 mt-0.5" />
                          <span className="font-mono text-[10px] text-muted-foreground">{indicator}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Threat Indicators */}
                {results.threat_indicators.length > 0 && (
                  <Alert className="bg-red-500/10 border-red-500/30">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <AlertDescription className="font-mono text-[10px]">
                      <div className="space-y-1">
                        {results.threat_indicators.map((indicator, idx) => (
                          <div key={idx} className="flex items-start gap-2">
                            <span className="text-red-400">•</span>
                            <span className="text-red-300">{indicator}</span>
                          </div>
                        ))}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Decoded Content */}
                {results.decoded_content && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-mono text-xs font-bold">Decoded Content:</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowDecoded(!showDecoded)}
                        className="h-6 text-[10px] gap-1"
                      >
                        {showDecoded ? (
                          <>
                            <EyeOff className="w-3 h-3" />
                            Hide
                          </>
                        ) : (
                          <>
                            <Eye className="w-3 h-3" />
                            Show
                          </>
                        )}
                      </Button>
                    </div>
                    {showDecoded && (
                      <pre className="p-3 bg-secondary/30 border border-border rounded-lg font-mono text-[9px] overflow-auto max-h-48 whitespace-pre-wrap">
                        {results.decoded_content}
                      </pre>
                    )}
                  </div>
                )}

                {/* Confidence Score */}
                <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                  <span className="font-mono text-xs text-muted-foreground">Detection Confidence</span>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {results.confidence}%
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}