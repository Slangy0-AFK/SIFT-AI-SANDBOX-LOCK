export function getSlackWebhookUrl() {
  return import.meta.env.VITE_SLACK_WEBHOOK_URL || localStorage.getItem('slackWebhookUrl') || '';
}

export async function sendSlackNotification({ text, blocks }) {
  const url = getSlackWebhookUrl();
  if (!url) {
    console.warn('[Slack] webhook URL not configured');
    return false;
  }

  try {
    const body = { text };
    if (blocks) body.blocks = blocks;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.warn('[Slack] notification failed', response.status, await response.text());
      return false;
    }

    return true;
  } catch (error) {
    console.warn('[Slack] notification error', error);
    return false;
  }
}
