// api/limit.js
// ════════════════════════════════════════════════════════════
// Control de límite de productos digitales por email
// Constructor de Productos Digitales Virales
// ════════════════════════════════════════════════════════════
//
// Usa la base de datos Redis (Upstash) ya conectada a este proyecto
// en Vercel (Storage → Upstash for Redis).
//
// ACCIONES (parámetro "action" en el body):
// - "check"     → devuelve cuántos productos ha usado este email y si puede crear más
// - "increment" → suma 1 al contador de este email (se llama al completar un producto)
//
// LÍMITE: configurable abajo en LIMITE_PRODUCTOS

const LIMITE_PRODUCTOS = 10;

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

  const redisUrl = process.env.KV_REST_API_URL;
  const redisToken = process.env.KV_REST_API_TOKEN;

  if (!redisUrl || !redisToken) {
    return res.status(500).json({
      error: 'Base de datos no configurada (KV_REST_API_URL / KV_REST_API_TOKEN faltantes).'
    });
  }

  try {
    const { action, email } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Email inválido o no proporcionado.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const key = `productos:${normalizedEmail}`;

    // Helper para hablar con Upstash vía su API REST
    async function redisCommand(command) {
      const r = await fetch(`${redisUrl}/${command.join('/')}`, {
        headers: { Authorization: `Bearer ${redisToken}` },
      });
      if (!r.ok) throw new Error(`Redis error ${r.status}`);
      const data = await r.json();
      return data.result;
    }

    if (action === 'check') {
      const current = await redisCommand(['get', key]);
      const count = current ? parseInt(current, 10) : 0;
      return res.status(200).json({
        count,
        limit: LIMITE_PRODUCTOS,
        allowed: count < LIMITE_PRODUCTOS,
      });
    }

    if (action === 'increment') {
      const newCount = await redisCommand(['incr', key]);
      return res.status(200).json({
        count: newCount,
        limit: LIMITE_PRODUCTOS,
        allowed: newCount <= LIMITE_PRODUCTOS,
      });
    }

    return res.status(400).json({ error: 'Acción no reconocida. Usa "check" o "increment".' });

  } catch (error) {
    console.error('Error en el control de límite:', error);
    return res.status(500).json({ error: error.message || 'Error interno del servidor.' });
  }
}
