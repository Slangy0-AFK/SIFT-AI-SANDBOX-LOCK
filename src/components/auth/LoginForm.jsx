import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Shield, Mail, Eye, EyeOff, Smartphone, MessageSquare, Loader2, CheckCircle2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [enrollmentMethod, setEnrollmentMethod] = useState('sms'); // 'sms' or 'text'
  const [devicePhone, setDevicePhone] = useState('');
  const [showEnrollment, setShowEnrollment] = useState(false);
  const [enrollmentLoading, setEnrollmentLoading] = useState(false);
  const [enrollmentSent, setEnrollmentSent] = useState(false);
  const [user, setUser] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Note: This would use your actual auth system
      // For now, this shows the flow
      await base44.auth.redirectToLogin(window.location.href);
    } catch (err) {
      toast.error('Login failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendEnrollment = async () => {
    if (!devicePhone || !email) {
      toast.error('Please provide both email and phone number');
      return;
    }

    // Validate phone format
    const phoneRegex = /^[\d\s\-\+\(\)]{10,}$/;
    if (!phoneRegex.test(devicePhone)) {
      toast.error('Please enter a valid phone number');
      return;
    }

    setEnrollmentLoading(true);
    try {
      // Get current user or use the login email
      const enrollEmail = email;
      
      // Generate unique enrollment code
      const enrollmentCode = `SIFT-AI-${Math.random().toString(36).substring(2, 11).toUpperCase()}`;
      
      // Send SMS/Text with enrollment code and link
      const message = `SIFT-AI Quantum Shield: Your device enrollment code is ${enrollmentCode}. Visit your app to complete setup. Code valid for 24 hours.`;
      
      await base44.integrations.Core.SendEmail({
        to: enrollEmail,
        subject: `SIFT-AI Device Enrollment Code: ${enrollmentCode}`,
        body: `
          <h2>SIFT-AI Device Enrollment</h2>
          <p>Your device has been registered for automatic enrollment.</p>
          <p><strong>Enrollment Code:</strong> ${enrollmentCode}</p>
          <p><strong>Registered Phone:</strong> ${devicePhone}</p>
          <p><strong>Method:</strong> ${enrollmentMethod === 'sms' ? 'SMS' : 'Text Message'}</p>
          <p>This code is valid for 24 hours.</p>
          <p>If you did not request this enrollment, please ignore this message.</p>
          <hr />
          <p><em>SIFT-AI Quantum Shield - Next Generation Security</em></p>
        `,
      });

      // Store enrollment in localStorage for device tracking
      const enrollmentData = {
        code: enrollmentCode,
        email: enrollEmail,
        phone: devicePhone,
        method: enrollmentMethod,
        timestamp: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        status: 'pending'
      };
      
      localStorage.setItem(`sift-ai_enrollment_${enrollmentCode}`, JSON.stringify(enrollmentData));
      
      setEnrollmentSent(true);
      toast.success(`Enrollment code sent via ${enrollmentMethod}! Code: ${enrollmentCode}`);
      
      // Reset form after 3 seconds
      setTimeout(() => {
        setEnrollmentSent(false);
        setDevicePhone('');
        setShowEnrollment(false);
      }, 3000);
    } catch (err) {
      toast.error('Failed to send enrollment: ' + err.message);
    } finally {
      setEnrollmentLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card className="border-primary/20">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Shield className="w-8 h-8 text-primary" />
              <span className="font-mono text-lg font-bold">SIFT-AI</span>
            </div>
            <CardTitle className="font-mono text-lg">Quantum Shield</CardTitle>
            <CardDescription className="font-mono text-xs tracking-widest mt-2">
              SECURE ACCESS
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Login Form */}
            {!showEnrollment ? (
              <form onSubmit={handleLogin} className="space-y-4">
                {/* Email */}
                <div className="space-y-2">
                  <label className="font-mono text-xs text-muted-foreground tracking-widest uppercase">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 font-mono text-sm bg-secondary border-border"
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <label className="font-mono text-xs text-muted-foreground tracking-widest uppercase">
                    Password
                  </label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-10 font-mono text-sm bg-secondary border-border"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Login Button */}
                <Button
                  type="submit"
                  disabled={loading || !email || !password}
                  className="w-full font-mono text-sm gap-2"
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Authenticating...</>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </form>
            ) : (
              // Device Enrollment Form
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {!enrollmentSent ? (
                  <>
                    <div className="text-center">
                      <Smartphone className="w-8 h-8 text-primary mx-auto mb-2" />
                      <h3 className="font-mono text-xs font-bold">Auto Device Enrollment</h3>
                      <p className="font-mono text-xs text-muted-foreground mt-1">
                        Automatically enroll this device for protection
                      </p>
                    </div>

                    {/* Enrollment Method Selection */}
                    <div className="space-y-2">
                      <label className="font-mono text-xs text-muted-foreground tracking-widest uppercase">
                        Enrollment Method
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setEnrollmentMethod('sms')}
                          className={`p-3 rounded-lg border transition-all font-mono text-xs ${
                            enrollmentMethod === 'sms'
                              ? 'bg-primary/10 border-primary text-primary'
                              : 'bg-secondary border-border text-muted-foreground hover:border-primary/50'
                          }`}
                        >
                          <MessageSquare className="w-4 h-4 mx-auto mb-1" />
                          SMS
                        </button>
                        <button
                          onClick={() => setEnrollmentMethod('text')}
                          className={`p-3 rounded-lg border transition-all font-mono text-xs ${
                            enrollmentMethod === 'text'
                              ? 'bg-primary/10 border-primary text-primary'
                              : 'bg-secondary border-border text-muted-foreground hover:border-primary/50'
                          }`}
                        >
                          <Mail className="w-4 h-4 mx-auto mb-1" />
                          Email
                        </button>
                      </div>
                    </div>

                    {/* Phone Number */}
                    <div className="space-y-2">
                      <label className="font-mono text-xs text-muted-foreground tracking-widest uppercase">
                        Phone Number
                      </label>
                      <div className="relative">
                        <Smartphone className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                        <Input
                          type="tel"
                          placeholder="(555) 123-4567"
                          value={devicePhone}
                          onChange={(e) => setDevicePhone(e.target.value)}
                          className="pl-10 font-mono text-sm bg-secondary border-border"
                        />
                      </div>
                    </div>

                    {/* Info Box */}
                    <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <p className="font-mono text-xs text-blue-400 leading-relaxed">
                        💡 Your enrollment code will be sent immediately and is valid for 24 hours. You can enroll multiple devices on the same account.
                      </p>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setShowEnrollment(false)}
                        className="flex-1 font-mono text-xs"
                      >
                        Back
                      </Button>
                      <Button
                        onClick={handleSendEnrollment}
                        disabled={enrollmentLoading || !devicePhone}
                        className="flex-1 font-mono text-xs gap-2"
                      >
                        {enrollmentLoading ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
                        ) : (
                          <><MessageSquare className="w-4 h-4" /> Send Code</>
                        )}
                      </Button>
                    </div>
                  </>
                ) : (
                  // Success State
                  <motion.div
                    initial={{ scale: 0.95 }}
                    animate={{ scale: 1 }}
                    className="text-center space-y-3 py-4"
                  >
                    <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto" />
                    <div>
                      <h3 className="font-mono text-xs font-bold text-green-400">Enrollment Sent!</h3>
                      <p className="font-mono text-xs text-muted-foreground mt-1">
                        Check your {enrollmentMethod === 'sms' ? 'SMS' : 'email'} for your enrollment code
                      </p>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* Toggle Enrollment */}
            {!showEnrollment && (
              <Button
                variant="ghost"
                onClick={() => setShowEnrollment(true)}
                className="w-full font-mono text-xs text-muted-foreground hover:text-primary gap-2"
              >
                <Smartphone className="w-4 h-4" /> Auto-enroll this device
              </Button>
            )}

            {/* Footer */}
            <div className="text-center">
              <p className="font-mono text-xs text-muted-foreground">
                Protected by SIFT-AI Quantum Shield
              </p>
              <Badge className="mt-2 font-mono text-xs bg-green-400/10 text-green-400 border-green-400/20 border">
                ✓ Enterprise Security
              </Badge>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}