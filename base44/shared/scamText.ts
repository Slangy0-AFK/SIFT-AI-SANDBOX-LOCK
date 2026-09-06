// LLM-based scam/phishing analysis of a text message, shared by analyzeTextThreat and scanApi.
export async function analyzeScamText(integrations, text) {
  const prompt = `Analyze this text message for scam, phishing, or fraudulent content.

Message: ${text}

Return a JSON response with:
{
  "is_scam": boolean,
  "scam_type": "phishing" | "lottery" | "banking" | "delivery" | "romance" | "tech_support" | "safe" | null,
  "confidence": number (0-100),
  "red_flags": string[] (list of suspicious elements),
  "recommendation": string (what the user should do)
}`;

  const res = await integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: {
      type: 'object',
      properties: {
        is_scam: { type: 'boolean' },
        scam_type: { type: ['string', 'null'] },
        confidence: { type: 'number' },
        red_flags: { type: 'array', items: { type: 'string' } },
        recommendation: { type: 'string' },
      },
      required: ['is_scam', 'scam_type', 'confidence', 'red_flags', 'recommendation'],
    },
  });

  return typeof res === 'string' ? JSON.parse(res) : res;
}