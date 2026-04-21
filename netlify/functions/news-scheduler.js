// DailyNoons scheduled news pre-warmer
// Runs every 2 hours to keep the news cache fresh

const https = require('https');

const handler = async function(event) {
  console.log('Running scheduled news cache pre-warmer...');

  return new Promise((resolve) => {
    const body = JSON.stringify({});

    const options = {
      hostname: 'dailynoons.com',
      path: '/.netlify/functions/news',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        console.log('Pre-warm status:', res.statusCode);
        console.log('Pre-warm response:', data.substring(0, 200));
        resolve({
          statusCode: 200,
          body: JSON.stringify({ success: true, status: res.statusCode })
        });
      });
    });

    req.on('error', (e) => {
      console.error('Pre-warm error:', e.message);
      resolve({
        statusCode: 500,
        body: JSON.stringify({ error: e.message })
      });
    });

    req.write(body);
    req.end();
  });
};

module.exports = { handler };
module.exports.config = { schedule: '0 */2 * * *' };
