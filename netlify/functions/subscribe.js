const https = require('https');

exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const CK_API_KEY = 'nPCgk1H25OzLoaiNe8waNQ';
  const CK_FORM_ID = '9345204';

  let email;
  try {
    const body = JSON.parse(event.body);
    email = body.email;
  } catch (e) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  if (!email || !email.includes('@')) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid email' }) };
  }

  return new Promise((resolve) => {
    const postData = JSON.stringify({ api_key: CK_API_KEY, email });

    const options = {
      hostname: 'api.convertkit.com',
      path: `/v3/forms/${CK_FORM_ID}/subscribe`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) {
            resolve({ statusCode: 400, headers, body: JSON.stringify({ error: parsed.message }) });
          } else {
            resolve({ statusCode: 200, headers, body: JSON.stringify({ success: true }) });
          }
        } catch (e) {
          resolve({ statusCode: 500, headers, body: JSON.stringify({ error: 'Invalid response from ConvertKit' }) });
        }
      });
    });

    req.on('error', (e) => {
      resolve({ statusCode: 500, headers, body: JSON.stringify({ error: e.message }) });
    });

    req.write(postData);
    req.end();
  });
};
