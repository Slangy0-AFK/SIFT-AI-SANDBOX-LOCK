import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { 
  Shield, CheckCircle2, AlertCircle, Loader2, Mail, 
  Smartphone, UserPlus, ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';

export default function AcceptInvitePage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [invitation, setInvitation] = useState(null);
  const [error, setError] = useState(null);
  const [userExists, setUserExists] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    device_name: '',
    device_type: 'android',
  });

  useEffect(() => {
    if (token) {
      validateInvitation(token);
    }
  }, [token]);

  const validateInvitation = async (token) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await base44.functions.invoke('acceptInvitation', {
        invitation_token: token,
      });
      
      const data = response.data;
      setInvitation(data.invitation);
      setUserExists(data.user_exists);
      
      if (data.existing_user_email) {
        setFormData(prev => ({ ...prev, email: data.existing_user_email }));
      }
    } catch (err) {
      setError(err.message || 'Invalid invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!formData.email || !formData.email.includes('@')) {
      toast.error('Please enter a valid email');
      return;
    }

    setValidating(true);
    
    try {
      const response = await base44.functions.invoke('acceptInvitation', {
        invitation_token: token,
        user_email: formData.email,
        user_full_name: formData.full_name,
      });

      if (response.data.user_exists) {
        // User exists, proceed to device enrollment
        setUserExists(true);
        toast.success('Email verified! Now enroll your device.');
      } else {
        // Show registration message
        toast.info('You\'ll need to create an account after enrolling your device.');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to validate invitation');
    } finally {
      setValidating(false);
    }
  };

  const handleEnroll = async () => {
    setEnrolling(true);
    
    try {
      const response = await base44.functions.invoke('completeInvitationEnrollment', {
        invitation_token: token,
        device_name: formData.device_name || `${formData.email}'s Device`,
        device_type: formData.device_type,
      });

      toast.success('Device enrolled successfully!');
      
      // If user doesn't exist, redirect to registration
      if (!userExists) {
        setTimeout(() => {
          navigate('/register', { 
            state: { 
              invite_accepted: true, 
              email: formData.email,
              message: 'Your device is enrolled. Now create your account.'
            } 
          });
        }, 1500);
      } else {
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to enroll device');
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-4" />
          <p className="font-mono text-sm text-muted-foreground">Validating invitation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-destructive/30">
          <CardHeader>
            <CardTitle className="font-mono text-sm flex items-center gap-2 text-destructive">
              <AlertCircle className="w-4 h-4" /> Invitation Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-xs text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => navigate('/')} className="w-full font-mono text-xs">
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl w-full"
      >
        <div className="text-center mb-6">
          <Shield className="w-12 h-12 text-primary mx-auto mb-3" />
          <h1 className="font-mono text-2xl font-bold text-white mb-2">
            SIFT AI
          </h1>
          <p className="font-mono text-xs text-muted-foreground">
            Device enrollment
          </p>
        </div>

        <Card className="border-primary/20 bg-card/80 backdrop-blur">
          <CardHeader>
            <CardTitle className="font-mono text-xs tracking-wider flex items-center gap-2">
              <Mail className="w-4 h-4 text-primary" /> INVITATION FROM {invitation?.subscriber_email?.toUpperCase()}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Invitation Details */}
            <div className="p-4 rounded-lg bg-secondary/30 border border-border/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-muted-foreground">Device Slots</span>
                <Badge className="font-mono text-xs bg-primary/10 text-primary border-primary/20">
                  {invitation?.device_slots} slot{invitation?.device_slots > 1 ? 's' : ''}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-muted-foreground">Expires</span>
                <span className="font-mono text-xs text-foreground">
                  {invitation?.expires_at ? new Date(invitation.expires_at).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>

            {/* Benefits */}
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <h3 className="font-mono text-xs font-semibold text-primary mb-3">INCLUDED FEATURES:</h3>
              <ul className="space-y-1.5">
                {[
                  'Checks a link, app, file hash or message in the browser',
                  'Your own allowlist and blocklist',
                  'Every check saved in your history',
                  'A device slot on the plan you were invited to',
                  'Tickets answered by the SIFT AI support team'
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3 text-green-400 flex-shrink-0" />
                    <span className="font-mono text-xs text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {!userExists ? (
              <>
                {/* Email Input */}
                <div className="space-y-2">
                  <label className="font-mono text-xs text-muted-foreground">Your Email</label>
                  <Input
                    placeholder="you@example.com"
                    className="font-mono text-xs"
                    value={formData.email}
                    onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
                    type="email"
                  />
                </div>

                <Button 
                  className="w-full font-mono text-xs"
                  onClick={handleAccept}
                  disabled={validating || !formData.email}
                >
                  {validating ? (
                    <><Loader2 className="w-3 h-3 mr-2 animate-spin" /> Validating...</>
                  ) : (
                    <><UserPlus className="w-3 h-3 mr-2" /> Accept Invitation</>
                  )}
                </Button>
              </>
            ) : (
              <>
                {/* Device Enrollment */}
                <div className="space-y-3">
                  <div className="space-y-2">
                    <label className="font-mono text-xs text-muted-foreground">Device Name</label>
                    <Input
                      placeholder="My Pixel 9"
                      className="font-mono text-xs"
                      value={formData.device_name}
                      onChange={(e) => setFormData(p => ({ ...p, device_name: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="font-mono text-xs text-muted-foreground">Device Type</label>
                    <select
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 font-mono text-xs text-foreground focus:outline-none focus:border-primary/50"
                      value={formData.device_type}
                      onChange={(e) => setFormData(p => ({ ...p, device_type: e.target.value }))}
                    >
                      <option value="android">Android</option>
                      <option value="ios">iOS</option>
                      <option value="desktop">Desktop</option>
                      <option value="tablet">Tablet</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <Button 
                  className="w-full font-mono text-xs"
                  onClick={handleEnroll}
                  disabled={enrolling}
                >
                  {enrolling ? (
                    <><Loader2 className="w-3 h-3 mr-2 animate-spin" /> Enrolling...</>
                  ) : (
                    <><Smartphone className="w-3 h-3 mr-2" /> Enroll Device <ArrowRight className="w-3 h-3 ml-2" /></>
                  )}
                </Button>

                {!formData.email && (
                  <p className="font-mono text-xs text-muted-foreground text-center">
                    You'll create your account after enrolling this device
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}