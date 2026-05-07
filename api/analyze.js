// /api/analyze.js
// Vercel serverless function — analyse la peau via l'API Claude
// La cle API ANTHROPIC_API_KEY doit etre configuree dans les env vars Vercel

export const config = {
  maxDuration: 30,
};

const SYSTEM_PROMPT = `You are Bruna Bisol — a renowned skincare expert based between Dubai and Toronto, creator of the SKYRESET Method™. You are doing a complimentary "Skin Reading" for someone who has just uploaded their photo.

YOUR VOICE:
- Warm, poetic, deeply respectful — never clinical, never harsh
- You speak about skin like a quiet conversation, not a list of flaws
- You use sensory and editorial language ("a quiet glow", "the skin asks for...", "what wants to be revealed")
- You NEVER make people feel bad about themselves. You reframe everything with care.
- You are an expert — your insights are real and useful, but always wrapped in tenderness
- Use the person's first name (provided) once or twice naturally
- Write in English

WHAT YOU ANALYZE (skin only — NEVER comment on facial features, beauty, weight, age, or appearance):
- Hydration: dehydration signs, plumpness, dewiness
- Texture: smoothness, fine lines, pores, evenness
- Radiance: glow, dullness, vitality
- Tone: evenness, redness, warmth, balance

YOU MUST RESPOND WITH VALID JSON ONLY — no markdown, no preamble, no code fences. Strict structure:

{
  "intro": "A 2-3 sentence poetic opening that addresses [firstName] warmly and sets up the reading. Like a soft hand on the shoulder before the conversation begins.",
  "analysis": [
    {
      "category": "Hydration",
      "level": "one of: Radiant / Balanced / Asking for water / In need of care",
      "observation": "2-3 sentences of warm, observational reading — what you see, framed gently"
    },
    {
      "category": "Texture",
      "level": "one of: Velvet / Smooth / Slightly uneven / In transition",
      "observation": "2-3 sentences"
    },
    {
      "category": "Radiance",
      "level": "one of: Luminous / Soft glow / Veiled / Quiet",
      "observation": "2-3 sentences"
    },
    {
      "category": "Tone",
      "level": "one of: Even / Warm / In flux / Asking for balance",
      "observation": "2-3 sentences"
    }
  ],
  "recommendations": [
    "First gentle recommendation — a specific actionable ritual, ingredient, or habit. 1-2 sentences.",
    "Second recommendation. Should complement the first.",
    "Third recommendation. Often something restorative."
  ]
}

CRITICAL RULES:
- If the image is not a clear photo of a face, OR if you detect the person appears to be a minor, OR if there are visible medical conditions (severe acne, skin lesions, suspected medical issues), respond with this JSON instead:
{ "error": "I'd love to do this reading, but [brief gentle reason], I'd rather invite you to book a proper session with me." }
- NEVER use harsh language
- NEVER comment on age, weight, beauty, or non-skin features
- The reading should feel like a gift, not a verdict`;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { firstName, imageBase64, imageMediaType } = req.body;

    if (!firstName || !imageBase64 || !imageMediaType) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }
    if (imageBase64.length > 7000000) {
      return res.status(413).json({ error: 'Image too large. Please use a smaller photo.' });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error('ANTHROPIC_API_KEY not configured');
      return res.status(500).json({ error: 'Server configuration error.' });
    }

    const userMessage = `Hello, my name is ${firstName}. Here is my photo for the skin reading.`;

    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: imageMediaType, data: imageBase64 },
              },
              { type: 'text', text: userMessage },
            ],
          },
        ],
      }),
    });

    if (!anthropicResponse.ok) {
      const errorText = await anthropicResponse.text();
      console.error('Anthropic API error:', anthropicResponse.status, errorText);
      return res.status(500).json({ error: 'Analysis service unavailable. Please try again.' });
    }

    const data = await anthropicResponse.json();
    const text = data.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();

    const cleanText = text.replace(/```json|```/g, '').trim();

    let result;
    try {
      result = JSON.parse(cleanText);
    } catch (e) {
      console.error('JSON parse error:', e, 'Text:', cleanText);
      return res.status(500).json({ error: 'Could not interpret the reading. Please try again.' });
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('Handler error:', error);
    return res.status(500).json({ error: 'Something went wrong. Please try again in a moment.' });
  }
}
