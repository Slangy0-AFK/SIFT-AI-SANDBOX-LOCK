import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Mail, MessageSquare, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

export default function Contact() {
  const handleSubmit = (e) => {
    e.preventDefault();
    toast.success('Your message has been sent to our security team.');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center p-6 pt-12">
      <div className="max-w-xl w-full mb-6">
        <Link to="/">
          <Button variant="ghost" className="gap-2 -ml-4">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Button>
        </Link>
      </div>
      <Card className="max-w-xl w-full border-border">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-foreground font-bold">
            <h1>Contact Us</h1>
          </CardTitle>
          <CardDescription className="text-sm mt-2">
            Reach out to the Sift-AI support and security operations team.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3 text-muted-foreground justify-center">
              <Mail className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium">support@sift-ai.security</span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm">Email Address</Label>
                <Input id="email" type="email" placeholder="you@example.com" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message" className="text-sm">Message</Label>
                <Textarea id="message" placeholder="How can we help you?" required className="min-h-[120px]" />
              </div>
              <Button type="submit" className="w-full font-semibold">
                <MessageSquare className="w-4 h-4 mr-2" /> Send Message
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}