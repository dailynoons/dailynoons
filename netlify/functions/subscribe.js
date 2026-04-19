exports.handler = async function (event) {
  console.log('Function invoked — method:', event.httpMethod);

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const CK_API_KEY = 'nPCgk1H25OzLoaiNe8waNQ';
  const CK_FORM_ID = '9345204';

  let email;
  try {
    console.log('Raw body:', event.body);
    const body = JSON.parse(event.body);
    email = body.email;
    console.log('Parsed email:', email);
  } catch (parseErr) {
    console.error('Body parse error:', parseErr.message);
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) };
  }

  if (!email || !email.includes('@')) {
    console.error('Invalid email:', email);
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid email address' }) };
  }

  try {
    console.log('Calling ConvertKit API for:', email);
    const response = await fetch(
      `https://api.convertkit.com/v3/forms/${CK_FORM_ID}/subscribe`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: CK_API_KEY, email })
      }
    );

    console.log('ConvertKit response status:', response.status);
    const data = await response.json();
    console.log('ConvertKit response body:', JSON.stringify(data));

    if (!response.ok || data.error) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: data.message || 'ConvertKit error' })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, subscriber: data.subscription })
    };

  } catch (err) {
    console.error('Fetch error:', err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server error: ' + err.message })
    };
  }
};
