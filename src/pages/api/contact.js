// src/pages/api/contact.js
export const prerender = false;

const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8' };
const reply = (status, payload) =>
  new Response(JSON.stringify(payload), { status, headers: JSON_HEADERS });

export async function POST({ request, locals }) {
  let formData;
  try {
    formData = await request.json();
  } catch {
    return reply(400, { success: false, message: 'Please submit a valid form.' });
  }

  if (!formData || typeof formData !== 'object' || Array.isArray(formData)) {
    return reply(400, { success: false, message: 'Please submit a valid form.' });
  }

  const name = typeof formData.name === 'string' ? formData.name.trim() : '';
  const email = typeof formData.email === 'string' ? formData.email.trim() : '';
  const subject = typeof formData.subject === 'string' ? formData.subject.trim() : '';
  const message = typeof formData.message === 'string' ? formData.message.trim() : '';

  if (!name || !email || !subject || !message) {
    return reply(400, { success: false, message: 'Please fill out all required fields.' });
  }
  if (name.length > 120 || email.length > 254 || subject.length > 100 || message.length > 5000) {
    return reply(400, { success: false, message: 'One or more fields are too long.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return reply(400, { success: false, message: 'Please enter a valid email address.' });
  }

  const env = locals?.runtime?.env ?? {};
  const apiKey = env.RESEND_API_KEY;
  const from = env.CONTACT_FROM_EMAIL;

  // Never tell visitors their message was delivered unless an email provider
  // confirms it. Configure a verified sender address in Cloudflare.
  if (!apiKey || !from) {
    console.error('Contact form is not configured: set RESEND_API_KEY and CONTACT_FROM_EMAIL.');
    return reply(503, {
      success: false,
      message: 'The contact form is temporarily unavailable. Please email secretary@tskvspartacus.nl directly.'
    });
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from,
        to: ['secretary@tskvspartacus.nl'],
        reply_to: email,
        subject: `Website contact: ${subject}`,
        text: `Name: ${name}\nEmail: ${email}\nSubject: ${subject}\n\n${message}`
      })
    });

    if (!response.ok) {
      const details = await response.text();
      console.error('Contact email provider returned an error:', response.status, details.slice(0, 500));
      return reply(502, {
        success: false,
        message: 'We could not send your message right now. Please try again later or email secretary@tskvspartacus.nl.'
      });
    }

    return reply(200, {
      success: true,
      message: "Message sent successfully! We'll get back to you soon."
    });
  } catch (error) {
    console.error('Error sending contact email:', error);
    return reply(502, {
      success: false,
      message: 'We could not send your message right now. Please try again later or email secretary@tskvspartacus.nl.'
    });
  }
}
