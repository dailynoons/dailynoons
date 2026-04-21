
const https = require('https');

exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const postData = JSON.stringify({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    tools: [{ type: 'web_search_20250305', name: 'web_search' }],
    system: `You are a tech news curator for DailyNoons, a Technology & AI Trends channel.
Your job is to find and summarize the 6 most recent and important tech and AI news stories from today or this week.
Return ONLY a valid JSON array with NO markdown, no backticks, no preamble. Just the raw JSON array.
Each item must have: title (string), summary (string, 1-2 sentences), category (one of: AI, Machine Learning, Cybersecurity, Hardware, Startups, Cloud), source (string), time (string like "2 hours ago"), url (string or null).`,
    messages: [{
      role: 'user',
      content: 'Search for the 6 most important AI and tech news stories from today or this week. Return as a JSON array only.'
    }]
  });

  return new Promise((resolve) => {
    const options = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const textContent = (parsed.content || [])
            .filter(b => b.type === 'text')
            .map(b => b.text)
            .join('');
          const clean = textContent.replace(/```json|```/g, '').trim();
          const articles = JSON.parse(clean);
          resolve({
            statusCode: 200,
            headers,
            body: JSON.stringify({ articles })
          });
        } catch (e) {
          resolve({
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Failed to parse response', raw: data.substring(0, 200) })
          });
        }
      });
    });

    req.on('error', (e) => {
      resolve({
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: e.message })
      });
    });

    req.write(postData);
    req.end();
  });
};
