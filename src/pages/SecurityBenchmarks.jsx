import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Shield, TrendingUp, AlertTriangle, CheckCircle2, Target, BookOpen, BarChart3, Download } from 'lucide-react';
import { format } from 'date-fns';

const NIST_CATEGORIES = [
  { id: 'identify', label: 'IDENTIFY', description: 'Asset management, governance, risk assessment' },
  { id: 'protect', label: 'PROTECT', description: 'Access control, awareness training, data security' },
  { id: 'detect', label: 'DETECT', description: 'Anomalies, events, continuous monitoring' },
  { id: 'respond', label: 'RESPOND', description: 'Response planning, communications, mitigation' },
  { id: 'recover', label: 'RECOVER', description: 'Recovery planning, improvements, communications' }
];

const MATURITY_LEVELS = {
  1: { label: 'Partial', color: 'text-red-400' },
  2: { label: 'Risk Informed', color: 'text-orange-400' },
  3: { label: 'Repeatable', color: 'text-amber-400' },
  4: { label: 'Adaptive', color: 'text-blue-400' },
  5: { label: 'Optimized', color: 'text-green-400' }
};

const STATUS_COLORS = {
  not_implemented: 'text-destructive border-destructive/30 bg-destructive/10',
  partial: 'text-orange-400 border-orange-400/30 bg-orange-500/10',
  implemented: 'text-blue-400 border-blue-400/30 bg-blue-500/10',
  optimized: 'text-green-400 border-green-400/30 bg-green-500/10'
};

export default function SecurityBenchmarks() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showAssessmentForm, setShowAssessmentForm] = useState(false);
  const [assessmentData, setAssessmentData] = useState({
    assessment_name: '',
    framework: 'nist_csf',
    category: '',
    subcategory: '',
    control_description: '',
    implementation_status: 'not_implemented',
    maturity_level: 1,
    findings: '',
    remediation_plan: '',
    next_review_date: ''
  });

  const queryClient = useQueryClient();

  const { data: benchmarks = [] } = useQuery({
    queryKey: ['security-benchmarks'],
    queryFn: () => base44.entities.SecurityBenchmark.list('-created_date', 100),
    initialData: [],
  });

  const createBenchmarkMutation = useMutation({
    mutationFn: (data) => base44.entities.SecurityBenchmark.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-benchmarks'] });
      setShowAssessmentForm(false);
      setAssessmentData({
        assessment_name: '',
        framework: 'nist_csf',
        category: '',
        subcategory: '',
        control_description: '',
        implementation_status: 'not_implemented',
        maturity_level: 1,
        findings: '',
        remediation_plan: '',
        next_review_date: ''
      });
    }
  });

  const updateBenchmarkMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SecurityBenchmark.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-benchmarks'] });
    }
  });

  const filteredBenchmarks = selectedCategory === 'all' 
    ? benchmarks 
    : benchmarks.filter(b => b.category === selectedCategory);

  const categoryScores = NIST_CATEGORIES.map(cat => {
    const catBenchmarks = benchmarks.filter(b => b.category === cat.id);
    if (catBenchmarks.length === 0) return { ...cat, score: 0, count: 0 };
    const avgMaturity = catBenchmarks.reduce((sum, b) => sum + (b.maturity_level || 0), 0) / catBenchmarks.length;
    return {
      ...cat,
      score: Math.round((avgMaturity / 5) * 100),
      count: catBenchmarks.length
    };
  });

  const overallScore = categoryScores.reduce((sum, cat) => sum + cat.score, 0) / categoryScores.length;

  const handleSubmit = () => {
    createBenchmarkMutation.mutate(assessmentData);
  };

  const exportReport = () => {
    const report = {
      generated: new Date().toISOString(),
      overallScore: Math.round(overallScore),
      categoryScores: categoryScores,
      totalAssessments: benchmarks.length,
      assessments: benchmarks
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nist-csf-assessment-${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
  };

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-mono text-xl font-bold tracking-wider text-foreground">SECURITY BENCHMARKS</h1>
          <p className="font-mono text-[10px] text-muted-foreground tracking-widest mt-1">
            NIST CSF COMPLIANCE & MATURITY ASSESSMENT
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={exportReport} className="font-mono text-xs">
          <Download className="w-3 h-3 mr-2" /> Export Report
        </Button>
      </div>

      {/* Overall Score Card */}
      <Card>
        <CardHeader>
          <CardTitle className="font-mono text-xs tracking-wider flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" /> OVERALL SECURITY POSTURE
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[9px] text-muted-foreground uppercase">Overall Score</span>
                <span className="font-mono text-2xl font-bold text-primary">{Math.round(overallScore)}/100</span>
              </div>
              <Progress value={overallScore} className="h-2" />
              <div className="grid grid-cols-5 gap-2 mt-4">
                {categoryScores.map((cat) => (
                  <div key={cat.id} className="text-center">
                    <div className="font-mono text-[8px] text-muted-foreground uppercase">{cat.label}</div>
                    <div className={`font-mono text-sm font-bold ${cat.score >= 80 ? 'text-green-400' : cat.score >= 60 ? 'text-amber-400' : 'text-destructive'}`}>
                      {cat.score}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                <span className="font-mono text-[9px] text-muted-foreground">Total Assessments</span>
                <Badge variant="outline" className="font-mono text-[9px] ml-auto">{benchmarks.length}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <span className="font-mono text-[9px] text-muted-foreground">Optimized</span>
                <Badge variant="outline" className="font-mono text-[9px] ml-auto">
                  {benchmarks.filter(b => b.implementation_status === 'optimized').length}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                <span className="font-mono text-[9px] text-muted-foreground">Not Implemented</span>
                <Badge variant="outline" className="font-mono text-[9px] ml-auto">
                  {benchmarks.filter(b => b.implementation_status === 'not_implemented').length}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="font-mono text-xs tracking-wider flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" /> CATEGORY BREAKDOWN
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {categoryScores.map((cat) => (
              <div key={cat.id} className="bg-secondary/30 rounded-lg p-4 border border-border/50">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-2 h-2 rounded-full ${cat.score >= 80 ? 'bg-green-400' : cat.score >= 60 ? 'bg-amber-400' : 'bg-destructive'}`} />
                  <span className="font-mono text-[8px] font-bold text-foreground">{cat.label}</span>
                </div>
                <p className="font-mono text-[7px] text-muted-foreground mb-3">{cat.description}</p>
                <div className="text-center">
                  <div className={`font-mono text-2xl font-bold ${cat.score >= 80 ? 'text-green-400' : cat.score >= 60 ? 'text-amber-400' : 'text-destructive'}`}>
                    {cat.score}
                  </div>
                  <p className="font-mono text-[8px] text-muted-foreground mt-1">{cat.count} controls</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Assessment Form */}
      <Card>
        <CardHeader>
          <CardTitle className="font-mono text-xs tracking-wider flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" /> ADD ASSESSMENT
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!showAssessmentForm ? (
            <Button onClick={() => setShowAssessmentForm(true)} className="font-mono text-xs">
              <TrendingUp className="w-3 h-3 mr-2" /> New Assessment
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="font-mono text-[9px]">Assessment Name</Label>
                  <Select value={assessmentData.assessment_name} onValueChange={(v) => setAssessmentData({...assessmentData, assessment_name: v})}>
                    <SelectTrigger className="font-mono text-xs">
                      <SelectValue placeholder="Select control" />
                    </SelectTrigger>
                    <SelectContent>
                      {NIST_CATEGORIES.flatMap(cat => [
                        { value: `${cat.id}-1`, label: `${cat.label} - Asset Management` },
                        { value: `${cat.id}-2`, label: `${cat.label} - Risk Assessment` },
                        { value: `${cat.id}-3`, label: `${cat.label} - Governance` },
                        { value: `${cat.id}-4`, label: `${cat.label} - Supply Chain Risk` }
                      ]).map(opt => (
                        <SelectItem key={opt.value} value={opt.value} className="font-mono text-xs">{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="font-mono text-[9px]">Category</Label>
                  <Select value={assessmentData.category} onValueChange={(v) => setAssessmentData({...assessmentData, category: v})}>
                    <SelectTrigger className="font-mono text-xs">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {NIST_CATEGORIES.map(cat => (
                        <SelectItem key={cat.id} value={cat.id} className="font-mono text-xs">{cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="font-mono text-[9px]">Control Description</Label>
                <Textarea 
                  value={assessmentData.control_description}
                  onChange={(e) => setAssessmentData({...assessmentData, control_description: e.target.value})}
                  className="font-mono text-xs h-20"
                  placeholder="Describe the security control being assessed..."
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="font-mono text-[9px]">Implementation Status</Label>
                  <Select value={assessmentData.implementation_status} onValueChange={(v) => setAssessmentData({...assessmentData, implementation_status: v})}>
                    <SelectTrigger className="font-mono text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not_implemented" className="font-mono text-xs">Not Implemented</SelectItem>
                      <SelectItem value="partial" className="font-mono text-xs">Partial</SelectItem>
                      <SelectItem value="implemented" className="font-mono text-xs">Implemented</SelectItem>
                      <SelectItem value="optimized" className="font-mono text-xs">Optimized</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="font-mono text-[9px]">Maturity Level (1-5)</Label>
                  <Select value={String(assessmentData.maturity_level)} onValueChange={(v) => setAssessmentData({...assessmentData, maturity_level: Number(v)})}>
                    <SelectTrigger className="font-mono text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1,2,3,4,5].map(level => (
                        <SelectItem key={level} value={String(level)} className="font-mono text-xs">
                          Level {level} - {MATURITY_LEVELS[level].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="font-mono text-[9px]">Findings</Label>
                <Textarea 
                  value={assessmentData.findings}
                  onChange={(e) => setAssessmentData({...assessmentData, findings: e.target.value})}
                  className="font-mono text-xs h-20"
                  placeholder="Assessment findings and observations..."
                />
              </div>
              <div>
                <Label className="font-mono text-[9px]">Remediation Plan</Label>
                <Textarea 
                  value={assessmentData.remediation_plan}
                  onChange={(e) => setAssessmentData({...assessmentData, remediation_plan: e.target.value})}
                  className="font-mono text-xs h-20"
                  placeholder="Actions needed to improve maturity..."
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSubmit} disabled={createBenchmarkMutation.isPending} className="font-mono text-xs">
                  {createBenchmarkMutation.isPending ? 'Saving...' : 'Save Assessment'}
                </Button>
                <Button variant="outline" onClick={() => setShowAssessmentForm(false)} className="font-mono text-xs">
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assessments List */}
      <Card>
        <CardHeader>
          <CardTitle className="font-mono text-xs tracking-wider flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" /> ASSESSMENTS
          </CardTitle>
          <div className="flex gap-2 mt-2">
            <Button 
              variant={selectedCategory === 'all' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setSelectedCategory('all')}
              className="font-mono text-[9px]"
            >
              All
            </Button>
            {NIST_CATEGORIES.map(cat => (
              <Button 
                key={cat.id}
                variant={selectedCategory === cat.id ? 'default' : 'outline'} 
                size="sm" 
                onClick={() => setSelectedCategory(cat.id)}
                className="font-mono text-[9px]"
              >
                {cat.label}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {filteredBenchmarks.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="font-mono text-xs text-muted-foreground">No assessments recorded yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredBenchmarks.map((benchmark) => (
                <div key={benchmark.id} className="bg-secondary/30 rounded-lg p-4 border border-border/50">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`font-mono text-[8px] ${STATUS_COLORS[benchmark.implementation_status]}`}>
                          {benchmark.implementation_status.toUpperCase().replace('_', ' ')}
                        </Badge>
                        <span className="font-mono text-[9px] text-muted-foreground">
                          {benchmark.category?.toUpperCase()}
                        </span>
                      </div>
                      <p className="font-mono text-[10px] text-foreground mt-1">{benchmark.control_description}</p>
                    </div>
                    <div className="text-right">
                      <div className={`font-mono text-lg font-bold ${MATURITY_LEVELS[benchmark.maturity_level]?.color}`}>
                        Level {benchmark.maturity_level}
                      </div>
                      <p className="font-mono text-[8px] text-muted-foreground">
                        {MATURITY_LEVELS[benchmark.maturity_level]?.label}
                      </p>
                    </div>
                  </div>
                  {benchmark.findings && (
                    <p className="font-mono text-[9px] text-muted-foreground mt-2">{benchmark.findings}</p>
                  )}
                  {benchmark.remediation_plan && (
                    <div className="mt-2 p-2 bg-destructive/5 rounded border border-destructive/20">
                      <p className="font-mono text-[8px] text-destructive font-semibold">REMEDIATION:</p>
                      <p className="font-mono text-[9px] text-muted-foreground">{benchmark.remediation_plan}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}