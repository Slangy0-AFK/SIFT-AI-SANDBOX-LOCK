import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Mail, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

export default function Contact() {
  const handleSubmit = (e) => {
    e.preventDefault();
    toast.success('Your message has been sent to our security team.');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <Card className="max-w-xl w-full border-primary/20">
        <CardHeader className="text-center">
          <CardTitle className="font-mono text-2xl text-primary">
            <h1>Contact Us</h1>
          </CardTitle>
          <CardDescription className="font-mono text-xs mt-2">
            Reach out to the Sift-AI support and security operations team.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3 text-muted-foreground justify-center">
              <Mail className="w-5 h-5 text-primary" />
              <span className="font-mono text-sm">support@sift-ai.security</span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="font-mono text-xs">Email Address</Label>
                <Input id="email" type="email" placeholder="you@example.com" required className="font-mono" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message" className="font-mono text-xs">Message</Label>
                <Textarea id="message" placeholder="How can we help you?" required className="font-mono min-h-[120px]" />
              </div>
              <Button type="submit" className="w-full font-mono">
                <MessageSquare className="w-4 h-4 mr-2" /> Send Message
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}