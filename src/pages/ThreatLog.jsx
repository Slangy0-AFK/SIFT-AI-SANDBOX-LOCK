import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Shield, AlertTriangle, Lock, Skull, CheckCircle, Filter } from 'lucide-react';
import { format } from 'date-fns';

const statusConfig = {
  detected: { color: 'text-blue-400 bg-blue-400/10 border-blue-400/20', icon: Shield },
  challenged: { color: 'text-amber-400 bg-amber-400/10 border-amber-400/20', icon: AlertTriangle },
  cycle_1: { color: 'text-orange-400 bg-orange-400/10 border-orange-400/20', icon: AlertTriangle },
  cycle_2: { color: 'text-red-400 bg-red-400/10 border-red-400/20', icon: AlertTriangle },
  cycle_3: { color: 'text-red-500 bg-red-500/10 border-red-500/20', icon: AlertTriangle },
  locked: { color: 'text-amber-400 bg-amber-400/10 border-amber-400/20', icon: Lock },
  destroyed: { color: 'text-destructive bg-destructive/10 border-destructive/20', icon: Skull },
  cleared: { color: 'text-green-400 bg-green-400/10 border-green-400/20', icon: CheckCircle },
};

export default function ThreatLog() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: threats = [] } = useQuery({
    queryKey: ['threats-log'],
    queryFn: () => base44.entities.Threat.list('-created_date', 100),
    initialData: [],
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events-log'],
    queryFn: () => base44.entities.SecurityEvent.list('-created_date', 100),
    initialData: [],
  });

  const filteredThreats = threats.filter(t => {
    const matchSearch = !searchTerm || t.source_ip?.includes(searchTerm) || t.notes?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-mono text-xl font-bold tracking-wider text-foreground">THREAT LOG</h1>
        <p className="font-mono text-[10px] text-muted-foreground tracking-widest mt-1">
          COMPLETE THREAT REGISTRY & EVENT TIMELINE
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search IP or notes..."
            className="pl-10 font-mono text-xs"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48 font-mono text-xs">
            <Filter className="w-3 h-3 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="font-mono text-xs">All Statuses</SelectItem>
            <SelectItem value="detected" className="font-mono text-xs">Detected</SelectItem>
            <SelectItem value="challenged" className="font-mono text-xs">Challenged</SelectItem>
            <SelectItem value="locked" className="font-mono text-xs">Locked</SelectItem>
            <SelectItem value="destroyed" className="font-mono text-xs">Destroyed</SelectItem>
            <SelectItem value="cleared" className="font-mono text-xs">Cleared</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Threats Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="font-mono text-xs tracking-wider">THREAT REGISTRY</CardTitle>
            <span className="font-mono text-[10px] text-muted-foreground">{filteredThreats.length} threats</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/50">
                <TableHead className="font-mono text-[10px]">IP ADDRESS</TableHead>
                <TableHead className="font-mono text-[10px]">AGENT TYPE</TableHead>
                <TableHead className="font-mono text-[10px]">STATUS</TableHead>
                <TableHead className="font-mono text-[10px]">THREAT LEVEL</TableHead>
                <TableHead className="font-mono text-[10px]">QRNG CYCLE</TableHead>
                <TableHead className="font-mono text-[10px]">ENVIRONMENT</TableHead>
                <TableHead className="font-mono text-[10px]">TIMESTAMP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredThreats.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <Shield className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="font-mono text-xs text-muted-foreground">No threats found</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredThreats.map((threat) => {
                  const config = statusConfig[threat.status] || statusConfig.detected;
                  return (
                    <TableRow key={threat.id} className="hover:bg-secondary/30 transition-colors">
                      <TableCell className="font-mono text-[11px] font-medium">{threat.source_ip}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`font-mono text-[8px] ${
                          threat.agent_type === 'human' ? 'text-green-400 border-green-400/30' : 'text-accent border-accent/30'
                        }`}>
                          {threat.agent_type?.toUpperCase() || 'UNKNOWN'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={`font-mono text-[8px] border ${config.color}`}>
                          {threat.status?.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`font-mono text-[8px] ${
                          threat.threat_level === 'critical' ? 'text-destructive border-destructive/30' :
                          threat.threat_level === 'high' ? 'text-accent border-accent/30' :
                          threat.threat_level === 'medium' ? 'text-amber-400 border-amber-400/30' :
                          'text-green-400 border-green-400/30'
                        }`}>
                          {threat.threat_level?.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-[10px] text-muted-foreground">
                        {threat.qrng_cycle || 0} / 3
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-[9px] text-muted-foreground">
                          {threat.environment?.toUpperCase() || 'PRODUCTION'}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-[9px] text-muted-foreground">
                        {threat.created_date ? format(new Date(threat.created_date), 'MMM d, HH:mm:ss') : '--'}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Events Timeline */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="font-mono text-xs tracking-wider">EVENT TIMELINE</CardTitle>
            <span className="font-mono text-[10px] text-muted-foreground">{events.length} events</span>
          </div>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="font-mono text-xs text-muted-foreground">No security events recorded</p>
            </div>
          ) : (
            <div className="space-y-1">
              {events.slice(0, 30).map((event) => (
                <div key={event.id} className="flex items-start gap-3 p-2 rounded hover:bg-secondary/30 transition-colors">
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 ${
                    event.severity === 'fatal' ? 'bg-destructive' :
                    event.severity === 'critical' ? 'bg-accent' :
                    event.severity === 'warning' ? 'bg-amber-400' :
                    'bg-blue-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <span className="font-mono text-[10px] font-semibold text-foreground">
                      {event.event_type?.replace(/_/g, ' ').toUpperCase()}
                    </span>
                    <p className="font-mono text-[9px] text-muted-foreground mt-0.5 truncate">{event.details}</p>
                  </div>
                  <span className="font-mono text-[9px] text-muted-foreground whitespace-nowrap">
                    {event.created_date ? format(new Date(event.created_date), 'HH:mm:ss') : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}