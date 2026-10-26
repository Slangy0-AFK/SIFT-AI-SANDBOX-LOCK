import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { analyzeScamText } from '../../shared/scamText.ts';
import { spendCredit } from '../../shared/creditGuard.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // Allow: scheduler secret header or authenticated user
    const schedulerSecret = Deno.env.get('SCHEDULER_SECRET');
    const providedSecret = req.headers.get('x-scheduler-secret') || req.headers.get('x-automation-secret');
    const isScheduler = schedulerSecret && providedSecret === schedulerSecret;

    let user = null;
    if (!isScheduler) {
      user = await base44.auth.me().catch(() => null);
      if (!user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const { text, phone_number } = await req.json();

    if (!text && !phone_number) {
      return Response.json({ 
        error: 'Provide either text (for SMS analysis) or phone_number (for lookup)' 
      }, { status: 400 });
    }

    // The analysis below costs an integration credit. A signed-in account is
    // counted against a daily ceiling; the scheduled run is not.
    if (!isScheduler && !(await spendCredit(base44, 'text_analysis', user.id))) {
      return Response.json({ error: 'Daily limit for message checks reached. Please try again tomorrow.' }, { status: 429 });
    }

    let analysis;

    // Analyze SMS text for scams
    if (text) {
      analysis = await analyzeScamText(base44.asServiceRole.integrations, text);

      // Log the analyzed text
      if (analysis.is_scam) {
        await base44.entities.TextThreat.create({
          user_id: user.id,
          phone_number: phone_number || 'unknown',
          message_content: text.substring(0, 500),
          scam_type: analysis.scam_type,
          confidence_score: analysis.confidence,
          red_flags: JSON.stringify(analysis.red_flags),
          recommendation: analysis.recommendation,
          status: 'analyzed',
          analyzed_date: new Date().toISOString()
        });
      }
    }

    // Check phone number against scam patterns
    if (phone_number) {
      const phoneCheckPrompt = `Analyze this phone number for scam likelihood based on patterns and common fraud indicators.
      
Phone Number: ${phone_number}

Consider:
- Number format and country code
- Known scam number patterns
- VoIP vs landline indicators

Return a JSON response with:
{
  "risk_level": "low" | "medium" | "high",
  "number_type": "voip" | "landline" | "mobile" | "toll_free" | "unknown",
  "country": string,
  "red_flags": string[],
  "recommendation": string
}`;

      const phoneRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: phoneCheckPrompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            risk_level: { type: "string" },
            number_type: { type: "string" },
            country: { type: "string" },
            red_flags: { type: "array", items: { type: "string" } },
            recommendation: { type: "string" }
          },
          required: ["risk_level", "number_type", "country", "red_flags", "recommendation"]
        }
      });

      analysis.phone_analysis = JSON.parse(phoneRes);
    }

    return Response.json(analysis);
  } catch (error) {
    console.error('Text threat analysis error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});