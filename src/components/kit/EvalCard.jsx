import React from 'react';
import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function EvalCard({ item, paid }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-base">{item.title}</CardTitle>
        <p className="text-xs text-muted-foreground">{item.repo}</p>
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">What it tests</p>
          <p className="mt-1 text-sm">{item.tests}</p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">What the lab run found</p>
          <p className="mt-1 text-sm">{item.found}</p>
        </div>

        <div className="rounded-lg border border-border bg-secondary/20 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Limits</p>
          <p className="mt-1 text-sm text-muted-foreground">{item.limits}</p>
        </div>

        {paid ? (
          <Accordion type="single" collapsible>
            <AccordionItem value="report" className="border-border">
              <AccordionTrigger className="text-sm font-medium hover:no-underline">Full report</AccordionTrigger>
              <AccordionContent className="space-y-3">
                {item.report.map((section) => (
                  <div key={section.heading}>
                    <p className="text-sm font-medium">{section.heading}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{section.text}</p>
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        ) : (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-secondary/20 p-3 text-sm text-muted-foreground">
            <Lock className="h-4 w-4" />
            <span>Full report comes with the Full Kit.</span>
            <Link to="/pricing" className="text-primary hover:underline">
              See what is in it
            </Link>
          </div>
        )}

      </CardContent>
    </Card>
  );
}