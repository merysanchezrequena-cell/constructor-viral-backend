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
    // Nota: el campo HOTMART_BASIC ya incluye el prefijo "Basic " tal como
    // lo genera Hotmart (ej. "Basic dXNlcjpwYXNz..."), no hay que añadirlo de nuevo
    const tokenRes = await fetch(
      `https://api-sec-vlc.hotmart.com/security/oauth/token?grant_type=client_credentials&client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': basic.startsWith('Basic ') ? basic : `Basic ${basic}`,
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

    // Paso 2: consultar historial de ventas
    // Obtenemos todas las ventas y filtramos localmente por email y producto
    const salesUrl = `https://developers.hotmart.com/payments/api/v1/sales/history`;

    const salesRes = await fetch(salesUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!salesRes.ok) {
      const errBody = await salesRes.json().catch(() => ({}));
      console.error('Hotmart sales error:', salesRes.status, JSON.stringify(errBody));
      return res.status(502).json({ error: 'Error al consultar ventas en Hotmart: ' + (errBody.message || errBody.error || salesRes.status) });
    }

    const salesData = await salesRes.json();
    const items = Array.isArray(salesData.items) ? salesData.items : [];

    // Filtramos localmente: email del comprador Y producto correcto
    const hasPurchase = items.some(item => {
      const buyerEmail = String(item.buyer?.email || '').toLowerCase();
      const productId = String(item.product?.id || '');
      return buyerEmail === normalizedEmail && productId === HOTMART_PRODUCT_ID;
    });

    return res.status(200).json({ allowed: hasPurchase });

  } catch (error) {
    console.error('Error comprobando acceso Hotmart:', error);
    return res.status(500).json({ error: error.message || 'Error interno del servidor.' });
  }
}
