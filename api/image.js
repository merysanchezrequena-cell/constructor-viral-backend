// api/image.js
// ════════════════════════════════════════════════════════════
// Backend proxy para generación de imágenes — OpenAI GPT Image
// Constructor de Productos Digitales Virales
// ════════════════════════════════════════════════════════════
//
// Este endpoint recibe un prompt de texto y devuelve una imagen
// generada, sin exponer tu clave de OpenAI en el navegador.
//
// CONFIGURACIÓN EN VERCEL:
// 1. Sube este archivo a la carpeta /api de tu mismo proyecto
//    (junto a claude.js)
// 2. En Vercel: Settings → Environment Variables
//    Añade: OPENAI_API_KEY = sk-tu-clave-de-openai-aqui
// 3. Redeploy el proyecto
// 4. Tu endpoint quedará en: https://tu-proyecto.vercel.app/api/image

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

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'OPENAI_API_KEY no configurada en las variables de entorno de Vercel.'
    });
  }

  try {
    const { prompt, size } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Falta el parámetro "prompt".' });
    }

    const openaiRes = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt,
        size: size || '1024x1536', // formato retrato, ideal para una portada de producto
        quality: 'medium',
        n: 1,
      }),
    });

    if (!openaiRes.ok) {
      const errBody = await openaiRes.json().catch(() => ({}));
      return res.status(openaiRes.status).json({
        error: errBody.error?.message || `Error de la API de OpenAI (${openaiRes.status})`
      });
    }

    const data = await openaiRes.json();
    // OpenAI devuelve la imagen en base64 dentro de data.data[0].b64_json
    const b64 = data.data?.[0]?.b64_json;

    if (!b64) {
      return res.status(500).json({ error: 'La API de OpenAI no devolvió una imagen válida.' });
    }

    return res.status(200).json({ image: `data:image/png;base64,${b64}` });

  } catch (error) {
    console.error('Error en el proxy de imágenes:', error);
    return res.status(500).json({ error: error.message || 'Error interno del servidor.' });
  }
}
