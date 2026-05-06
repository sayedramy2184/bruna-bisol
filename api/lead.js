// /api/lead.js
// Vercel serverless function — capture les leads et envoie les emails via Resend
// Variables d'env requises :
//   RESEND_API_KEY    (depuis https://resend.com)
//   BRUNA_EMAIL       (l'email de Bruna pour recevoir les notifications)
//   FROM_EMAIL        (ex: hello@brunabisol.com — domaine verifie sur Resend)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { firstName, email, result } = req.body;

    if (!firstName || !email || !result) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }

    const resendKey = process.env.RESEND_API_KEY;
    const brunaEmail = process.env.BRUNA_EMAIL;
    const fromEmail = process.env.FROM_EMAIL || 'onboarding@resend.dev';

    // Si Resend n'est pas configure, on log juste (mode demo)
    if (!resendKey) {
      console.log('Lead captured (no email sent):', { firstName, email });
      return res.status(200).json({ ok: true, mode: 'log-only' });
    }

    // 1. Email au client avec son skin reading
    const clientHtml = buildClientEmail(firstName, result);
    const clientEmailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: `Bruna Bisol <${fromEmail}>`,
        to: [email],
        subject: `${firstName}, your Skin Reading by Bruna ✦`,
        html: clientHtml,
      }),
    });

    if (!clientEmailRes.ok) {
      console.error('Resend client email error:', await clientEmailRes.text());
    }

    // 2. Email a Bruna pour la notifier du nouveau lead
    if (brunaEmail) {
      const notifHtml = `
        <div style="font-family: Georgia, serif; max-width: 600px;">
          <h2 style="color: #c87856;">New Skin Reading completed ✦</h2>
          <p><strong>Name:</strong> ${escapeHtml(firstName)}</p>
          <p><strong>Email:</strong> <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>
          <p><strong>Date:</strong> ${new Date().toLocaleString('en-US', { timeZone: 'UTC' })} UTC</p>
          <hr style="border: none; border-top: 1px solid #e8d9bf; margin: 24px 0;">
          <h3>Reading summary</h3>
          <p style="font-style: italic; color: #5a4032;">${escapeHtml(result.intro || '')}</p>
          ${(result.analysis || [])
            .map(
              (a) => `
            <p><strong>${escapeHtml(a.category)}</strong> — ${escapeHtml(a.level)}<br>
            <span style="color: #5a4032;">${escapeHtml(a.observation)}</span></p>
          `
            )
            .join('')}
          <hr style="border: none; border-top: 1px solid #e8d9bf; margin: 24px 0;">
          <p style="font-size: 12px; color: #8a7563;">Sent automatically from brunabisol.com</p>
        </div>
      `;

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: `Skin Reading <${fromEmail}>`,
          to: [brunaEmail],
          subject: `New lead: ${firstName} (${email})`,
          html: notifHtml,
        }),
      });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Lead handler error:', error);
    return res.status(500).json({ error: 'Could not send your reading by email.' });
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildClientEmail(firstName, result) {
  const analysisHtml = (result.analysis || [])
    .map(
      (a) => `
    <div style="background: #f0e6d4; padding: 24px; margin-bottom: 16px; border-left: 3px solid #c87856; border-radius: 8px;">
      <div style="font-size: 11px; letter-spacing: 0.3em; text-transform: uppercase; color: #c87856; margin-bottom: 4px;">— ${escapeHtml(a.level)}</div>
      <h3 style="font-family: Georgia, serif; font-weight: 400; font-size: 20px; color: #3d2a1f; margin: 0 0 12px;">${escapeHtml(a.category)}</h3>
      <p style="font-family: Georgia, serif; font-style: italic; font-size: 16px; line-height: 1.6; color: #5a4032; margin: 0;">${escapeHtml(a.observation)}</p>
    </div>
  `
    )
    .join('');

  const recosHtml = (result.recommendations || [])
    .map(
      (r, i) => `
    <div style="display: flex; gap: 16px; padding: 16px 0; border-bottom: 1px solid rgba(216, 149, 119, 0.25);">
      <div style="font-family: Georgia, serif; font-style: italic; font-size: 22px; color: #d4a574;">${String(i + 1).padStart(2, '0')}</div>
      <div style="font-family: Georgia, serif; font-size: 17px; line-height: 1.6; color: #f0e6d4;">${escapeHtml(r)}</div>
    </div>
  `
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; background: #f7f0e4; font-family: Georgia, serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">

    <!-- Header -->
    <div style="text-align: center; padding: 32px 0;">
      <div style="font-size: 11px; letter-spacing: 0.3em; text-transform: uppercase; color: #c87856; margin-bottom: 8px;">— Skin Reading by Bruna</div>
      <h1 style="font-family: Georgia, serif; font-weight: 300; font-size: 36px; color: #3d2a1f; margin: 0; letter-spacing: -0.01em;">
        Hello ${escapeHtml(firstName)},<br>
        <em style="color: #c87856;">your reading.</em>
      </h1>
    </div>

    <!-- Intro -->
    <div style="background: #fff; padding: 32px; border-radius: 12px; margin-bottom: 24px;">
      <p style="font-family: Georgia, serif; font-style: italic; font-size: 18px; line-height: 1.7; color: #5a4032; margin: 0;">
        ${escapeHtml(result.intro || '')}
      </p>
    </div>

    <!-- Analysis cards -->
    ${analysisHtml}

    <!-- Recommendations -->
    <div style="background: #3d2a1f; color: #f7f0e4; padding: 32px; border-radius: 12px; margin: 24px 0;">
      <div style="font-size: 11px; letter-spacing: 0.3em; text-transform: uppercase; color: #d4a574; margin-bottom: 12px;">— Bruna's recommendations</div>
      <h3 style="font-family: Georgia, serif; font-weight: 300; font-size: 24px; color: #f7f0e4; margin: 0 0 16px;">
        Three gentle <em style="color: #e8c89a;">movements</em> to begin.
      </h3>
      ${recosHtml}
    </div>

    <!-- CTA -->
    <div style="background: linear-gradient(135deg, #c87856, #a8593c); color: #f7f0e4; padding: 32px; border-radius: 12px; text-align: center; margin: 24px 0;">
      <div style="font-size: 11px; letter-spacing: 0.3em; text-transform: uppercase; color: #e8c89a; margin-bottom: 12px;">— This is only the beginning</div>
      <h3 style="font-family: Georgia, serif; font-weight: 300; font-size: 24px; margin: 0 0 16px; color: #f7f0e4;">
        Ready to <em style="color: #e8c89a;">go further?</em>
      </h3>
      <p style="font-family: Georgia, serif; font-style: italic; font-size: 16px; line-height: 1.6; margin: 0 0 24px; color: #f0e6d4;">
        A photo can only tell us so much. For a true reading — touch, texture, the way your skin responds — book a private session with me in Dubai or Toronto.
      </p>
      <a href="https://brunabisol.com/#contact" style="display: inline-block; background: #f7f0e4; color: #3d2a1f; padding: 16px 32px; border-radius: 100px; text-decoration: none; font-size: 11px; letter-spacing: 0.3em; text-transform: uppercase; font-family: Arial, sans-serif;">
        Book a SKYRESET session
      </a>
    </div>

    <!-- Footer -->
    <div style="text-align: center; padding: 32px 0; color: #8a7563; font-size: 12px;">
      <p style="margin: 0 0 8px;">With care,</p>
      <p style="font-family: Georgia, serif; font-style: italic; font-size: 18px; color: #c87856; margin: 0 0 24px;">— Bruna ✦</p>
      <p style="font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase;">
        Cosmetic guidance only · Not a medical diagnosis<br>
        © Bruna Bisol — SKYRESET Method™
      </p>
    </div>

  </div>
</body>
</html>
  `;
}
