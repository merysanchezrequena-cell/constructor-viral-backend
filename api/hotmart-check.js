// api/hotmart-check.js
// ════════════════════════════════════════════════════════════
// Control de acceso vía compra en Hotmart
// Constructor de Productos Digitales Virales
// ════════════════════════════════════════════════════════════
//
// Comprueba si un email tiene una compra APROBADA del producto
// configurado en Hotmart. Solo si la tiene, se permite el acceso
// al Constructor Viral.
//
// VARIABLES DE ENTORNO NECESARIAS EN VERCEL:
// - HOTMART_CLIENT_ID
// - HOTMART_CLIENT_SECRET
// - HOTMART_BASIC
//
// ID DE PRODUCTO: configurado abajo en HOTMART_PRODUCT_ID

const HOTMART_PRODUCT_ID = '7399028';

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

  const clientId = process.env.HOTMART_CLIENT_ID;
  const clientSecret = process.env.HOTMART_CLIENT_SECRET;
  const basic = process.env.HOTMART_BASIC;

  if (!clientId || !clientSecret || !basic) {
    return res.status(500).json({
      error: 'Credenciales de Hotmart no configuradas en Vercel.'
    });
  }

  try {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Email inválido o no proporcionado.' });
    }
    const normalizedEmail = email.trim().toLowerCase();

    // Paso 1: obtener access token de Hotmart (OAuth2 client_credentials)
    const tokenRes = await fetch(
      `https://api-sec-vlc.hotmart.com/security/oauth/token?grant_type=client_credentials&client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${basic}`,
        },
      }
    );

    if (!tokenRes.ok) {
      const errBody = await tokenRes.json().catch(() => ({}));
      return res.status(502).json({ error: 'Error al autenticar con Hotmart: ' + (errBody.error_description || tokenRes.status) });
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return res.status(502).json({ error: 'Hotmart no devolvió un token de acceso válido.' });
    }

    // Paso 2: consultar historial de ventas filtrado por email y producto
    // Sin el filtro transaction_status, Hotmart devuelve por defecto
    // los estados APPROVED (pago confirmado) y COMPLETE (garantía ya vencida),
    // que son exactamente los dos estados que cuentan como "acceso válido".
    const salesUrl = `https://developers.hotmart.com/payments/api/v1/sales/history?product_id=${HOTMART_PRODUCT_ID}&buyer_email=${encodeURIComponent(normalizedEmail)}`;

    const salesRes = await fetch(salesUrl, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!salesRes.ok) {
      const errBody = await salesRes.json().catch(() => ({}));
      return res.status(502).json({ error: 'Error al consultar ventas en Hotmart: ' + (errBody.message || salesRes.status) });
    }

    const salesData = await salesRes.json();
    const hasPurchase = Array.isArray(salesData.items) && salesData.items.length > 0;

    return res.status(200).json({ allowed: hasPurchase });

  } catch (error) {
    console.error('Error comprobando acceso Hotmart:', error);
    return res.status(500).json({ error: error.message || 'Error interno del servidor.' });
  }
}
