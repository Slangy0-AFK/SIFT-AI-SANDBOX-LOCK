/**
 * Send a Slack notification through a secure backend function.
 * The webhook URL is kept secure on the backend and never exposed to the client.
 *
 * @param {Object} params - The notification parameters
 * @param {string} params.text - The notification text
 * @param {Array} params.blocks - Optional Slack block elements
 * @returns {Promise<boolean>} True if sent successfully, false otherwise
 */
export async function sendSlackNotification({ text, blocks }) {
  if (!text && !blocks) {
    console.warn('[Slack] either text or blocks must be provided');
    return false;
  }

  try {
    // Call the secure backend function instead of directly using the webhook
    const response = await fetch('/.base44/functions/sendSlackNotification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, blocks }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.warn(
        '[Slack] notification failed',
        response.status,
        errorData.error || 'unknown error'
      );
      return false;
    }

    return true;
  } catch (error) {
    console.warn('[Slack] notification error', error);
    return false;
  }
}
