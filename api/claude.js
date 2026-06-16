// api/claude.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido. Usa POST.' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'ANTHROPIC_API_KEY no configurada en las variables de entorno de Vercel.'
    });
  }

  try {
    const { prompt, system, stream, max_tokens } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Falta el parámetro "prompt".' });
    }

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: max_tokens || 2000,
        stream: !!stream,
        system: system || 'Eres una asistente experta y útil. Responde en español.',
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!anthropicRes.ok) {
      const errBody = await anthropicRes.json().catch(() => ({}));
      return res.status(anthropicRes.status).json({
        error: errBody.error?.message || `Error de la API de Anthropic (${anthropicRes.status})`
      });
    }

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const reader = anthropicRes.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(decoder.decode(value, { stream: true }));
      }
      return res.end();
    }

    const data = await anthropicRes.json();
    return res.status(200).json(data);

  } catch (error) {
    console.error('Error en el proxy de Claude:', error);
    return res.status(500).json({ error: error.message || 'Error interno del servidor.' });
  }
}
