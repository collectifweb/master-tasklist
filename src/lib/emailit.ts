interface EmailItMessage {
  from: string;
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

const EMAILIT_ENDPOINT = 'https://api.emailit.com/v1/emails';

export async function sendFeedbackNotificationEmail({
  from,
  to,
  subject,
  html,
  replyTo,
}: EmailItMessage) {
  const apiKey = process.env.EMAILIT_API_KEY;

  if (!apiKey) {
    console.warn('EMAILIT_API_KEY is not set; skipping feedback notification email.');
    return;
  }

  const payload: Record<string, string> = {
    from,
    to,
    subject,
    html,
  };

  if (replyTo) {
    payload.reply_to = replyTo;
  }

  try {
    const response = await fetch(EMAILIT_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('EmailIt API returned an error:', response.status, errorText);
    }
  } catch (error) {
    console.error('Failed to send feedback notification email:', error);
  }
}
