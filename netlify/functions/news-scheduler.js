// DailyNoons scheduled news pre-warmer
// Runs every 2 hours to keep the cache fresh so visitors never wait

const https = require('https');

function fetchNews() {
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    const options = {
      hostname: 'dailynoons.com',
      path: '/.netlify/functions/news',
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
        console.log('Cache pre-warm response status:', res.statusCode);
        console.log('Cache pre-warm response:', data.substring(0, 200));
        resolve({ statusCode: res.statusCode });
      });
    });

    req.on('error', (e) => {
      console.error('Cache pre-warm error:', e.message);
      resolve({ error: e.message });
    });

    req.write(postData);
    req.end();
  });
}

exports.handler = async function(event) {
  console.log('Running scheduled news cache pre-warmer...');
  const result = await fetchNews();
  console.log('Pre-warm complete:', JSON.stringify(result));
  return { statusCode: 200, body: JSON.stringify({ success: true, result }) };
};

// Schedule: run every 2 hours
module.exports.config = {
  schedule: '0 */2 * * *'
};
