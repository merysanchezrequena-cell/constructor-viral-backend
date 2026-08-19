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

  // Paso 1: obtener token
  const tokenUrl = `https://api-sec-vlc.hotmart.com/security/oauth/token?grant_type=client_credentials&client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}`;
  const tokenRes = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': basic },
  });
  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;

  if (!accessToken) {
    return res.status(200).json({ error: 'No token', tokenData });
  }

  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` };
  const base = 'https://developers.hotmart.com/payments/api/v1/sales/history';

  // Probar 4 variantes del endpoint
  const tests = [
    { name: 'sin_params', url: base },
    { name: 'solo_transaction_status', url: `${base}?transaction_status=APPROVED` },
    { name: 'buyer_email_approved', url: `${base}?transaction_status=APPROVED&buyer_email=info%40rosemediaagency.com` },
    { name: 'buyer_name', url: `${base}?buyer_name=andres` },
  ];

  const results = {};
  for (const test of tests) {
    const r = await fetch(test.url, { method: 'GET', headers });
    const body = await r.text();
    results[test.name] = { status: r.status, body: body.substring(0, 300) };
  }

  return res.status(200).json(results);
}
