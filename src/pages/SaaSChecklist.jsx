import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Shield, 
  Lock, 
  Mail, 
  CreditCard, 
  BarChart3, 
  Users, 
  FileText, 
  Server, 
  Headphones, 
  Megaphone,
  AlertTriangle,
  Check,
  X
} from 'lucide-react';

const CATEGORIES = [
  {
    icon: CreditCard,
    name: 'Payment & Billing',
    priority: 'CRITICAL',
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
    borderColor: 'border-destructive/50',
    features: [
      { name: 'Stripe/Base44 Payments', done: false },
      { name: 'Subscription webhooks', done: false },
      { name: 'Google Play billing', done: false },
      { name: 'Invoice generation', done: false },
      { name: 'Payment failure handling', done: false },
      { name: 'Dunning management', done: false },
    ],
  },
  {
    icon: Mail,
    name: 'Email Infrastructure',
    priority: 'HIGH',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/50',
    features: [
      { name: 'Email verification', done: false },
      { name: 'Welcome automation', done: false },
      { name: 'Password reset UI', done: false },
      { name: 'Email templates', done: false },
      { name: 'Delivery tracking', done: false },
      { name: 'SPF/DKIM config', done: false },
    ],
  },
  {
    icon: BarChart3,
    name: 'Monitoring & Analytics',
    priority: 'HIGH',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/50',
    features: [
      { name: 'Error tracking (Sentry)', done: false },
      { name: 'Performance monitoring', done: false },
      { name: 'User behavior analytics', done: false },
      { name: 'Conversion tracking', done: false },
      { name: 'Churn analytics', done: false },
      { name: 'Metrics dashboard', done: false },
    ],
  },
  {
    icon: Users,
    name: 'User Management',
    priority: 'MEDIUM',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/50',
    features: [
      { name: 'User invitation', done: false },
      { name: 'RBAC UI', done: false },
      { name: 'Team management', done: false },
      { name: 'Activity audit logs', done: false },
      { name: 'Session management', done: false },
      { name: 'Auto account deletion', done: false },
    ],
  },
  {
    icon: FileText,
    name: 'Compliance & Legal',
    priority: 'MEDIUM',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/50',
    features: [
      { name: 'GDPR data export', done: false },
      { name: 'GDPR data deletion', done: false },
      { name: 'Cookie consent', done: false },
      { name: 'Privacy policy tracking', done: false },
      { name: 'ToS versioning', done: false },
      { name: 'Data processing agreements', done: false },
    ],
  },
  {
    icon: Server,
    name: 'Infrastructure',
    priority: 'MEDIUM',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/50',
    features: [
      { name: 'Automated backups', done: false },
      { name: 'Disaster recovery', done: false },
      { name: 'Rate limiting', done: false },
      { name: 'API versioning', done: false },
      { name: 'Health checks', done: false },
      { name: 'Status page', done: false },
    ],
  },
  {
    icon: Headphones,
    name: 'Customer Support',
    priority: 'LOW',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/50',
    features: [
      { name: 'Support ticket system', done: false },
      { name: 'Live chat', done: false },
      { name: 'Knowledge base', done: false },
      { name: 'In-app messaging', done: false },
      { name: 'Feedback collection', done: false },
      { name: 'NPS surveys', done: false },
    ],
  },
  {
    icon: Megaphone,
    name: 'Marketing & Growth',
    priority: 'LOW',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/50',
    features: [
      { name: 'Landing page optimization', done: false },
      { name: 'A/B testing', done: false },
      { name: 'Referral system', done: false },
      { name: 'Email marketing', done: false },
      { name: 'Social sharing', done: false },
      { name: 'Affiliate tracking', done: false },
    ],
  },
];

const COMPLETED = [
  { category: 'Backend Functions', count: 10 },
  { category: 'Security Entities', count: 9 },
  { category: 'Encryption Tools', count: 4 },
  { category: 'Email System', count: 3 },
];

export default function SaaSChecklist() {
  const totalFeatures = CATEGORIES.reduce((sum, cat) => sum + cat.features.length, 0);
  const doneFeatures = CATEGORIES.reduce((sum, cat) => sum + cat.features.filter(f => f.done).length, 0);
  const progress = Math.round((doneFeatures / totalFeatures) * 100);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-mono text-xl font-bold text-foreground">SaaS COMPLETENESS AUDIT</h1>
          <p className="font-mono text-xs text-muted-foreground mt-1">
            Comprehensive feature checklist for production-ready SaaS
          </p>
        </div>
        <div className="text-right">
          <div className="font-mono text-2xl font-bold text-primary">{progress}%</div>
          <div className="font-mono text-xs text-muted-foreground">Complete</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <div 
          className="h-full bg-primary transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Completed Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {COMPLETED.map((item, idx) => (
          <Card key={idx}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                <div>
                  <div className="font-mono text-xs font-semibold">{item.category}</div>
                  <div className="font-mono text-[10px] text-muted-foreground">{item.count} features</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Missing Features by Category */}
      <div className="space-y-4">
        <h2 className="font-mono text-lg font-bold text-foreground">Missing Features by Priority</h2>
        
        {CATEGORIES.map((category, idx) => {
          const Icon = category.icon;
          const categoryDone = category.features.filter(f => f.done).length;
          const categoryTotal = category.features.length;
          
          return (
            <Card key={idx} className={`${category.borderColor} border-2`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${category.bgColor}`}>
                      <Icon className={`w-5 h-5 ${category.color}`} />
                    </div>
                    <div>
                      <CardTitle className="text-base">{category.name}</CardTitle>
                      <div className="font-mono text-xs text-muted-foreground">
                        {categoryDone}/{categoryTotal} complete
                      </div>
                    </div>
                  </div>
                  <Badge 
                    variant={category.priority === 'CRITICAL' ? 'destructive' : 'outline'}
                    className={category.priority === 'HIGH' ? 'border-amber-500 text-amber-500' : ''}
                  >
                    {category.priority}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {category.features.map((feature, i) => (
                    <div 
                      key={i}
                      className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50"
                    >
                      {feature.done ? (
                        <Check className="w-3 h-3 text-green-500 flex-shrink-0" />
                      ) : (
                        <AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0" />
                      )}
                      <span className="font-mono text-xs text-muted-foreground">
                        {feature.name}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Alert>
        <AlertTitle>Recommended Next Steps</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>Priority implementation order:</p>
          <ol className="list-decimal list-inside space-y-1 font-mono text-xs">
            <li><strong>Payment Integration</strong> - Enable Stripe/Base44 Payments for subscription billing</li>
            <li><strong>Email Verification</strong> - Implement signup verification flow</li>
            <li><strong>Error Tracking</strong> - Add Sentry for production monitoring</li>
            <li><strong>GDPR Compliance</strong> - Automated data export/deletion</li>
            <li><strong>Infrastructure</strong> - Backups, rate limiting, health checks</li>
          </ol>
        </AlertDescription>
      </Alert>
    </div>
  );
}