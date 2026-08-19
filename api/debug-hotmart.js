// api/debug-hotmart.js
// ARCHIVO TEMPORAL DE DIAGNÓSTICO - BORRAR DESPUÉS DE DEPURAR

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const clientId = process.env.HOTMART_CLIENT_ID;
  const clientSecret = process.env.HOTMART_CLIENT_SECRET;
  const basic = process.env.HOTMART_BASIC;

  const debug = {
    vars: {
      has_client_id: !!clientId,
      has_client_secret: !!clientSecret,
      has_basic: !!basic,
      basic_starts_with: basic ? basic.substring(0, 10) + '...' : 'EMPTY',
    }
  };

  // Paso 1: obtener token
  try {
    const tokenUrl = `https://api-sec-vlc.hotmart.com/security/oauth/token?grant_type=client_credentials&client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}`;
    const tokenRes = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': basic,
      },
    });
    const tokenBody = await tokenRes.text();
    debug.token_step = {
      status: tokenRes.status,
      body: tokenBody.substring(0, 500)
    };

    if (tokenRes.ok) {
      const tokenData = JSON.parse(tokenBody);
      const accessToken = tokenData.access_token;

      // Paso 2: llamar al endpoint de ventas sin parámetros
      const salesRes = await fetch('https://developers.hotmart.com/payments/api/v1/sales/history', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      const salesBody = await salesRes.text();
      debug.sales_step = {
        status: salesRes.status,
        body: salesBody.substring(0, 1000)
      };
    }
  } catch(e) {
    debug.error = e.message;
  }

  return res.status(200).json(debug);
}
