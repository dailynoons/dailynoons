// DailyNoons RSS feed proxy
const https = require('https');

const RSS_URL = 'https://news.google.com/rss/search?q=artificial+intelligence+technology&hl=en-US&gl=US&ceid=US:en';

function fetchRSS(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      // Handle redirects
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchRSS(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function parseRSS(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const item = match[1];
    const title   = (item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) ||
                     item.match(/<title>(.*?)<\/title>/) || [])[1] || '';
    const link    = (item.match(/<link>(.*?)<\/link>/) ||
                     item.match(/<link\s+href="(.*?)"/) || [])[1] || '';
    const pubDate = (item.match(/<pubDate>(.*?)<\/pubDate>/) || [])[1] || '';
    if (title) {
      items.push({ title: title.trim(), link: link.trim(), pubDate: pubDate.trim() });
    }
    if (items.length >= 6) break;
  }
  return items;
}

exports.handler = async function(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const xml   = await fetchRSS(RSS_URL);
    const items = parseRSS(xml);
    if (items.length === 0) {
      return { statusCode: 200, headers, body: JSON.stringify({ error: 'No items parsed', items: [] }) };
    }
    return { statusCode: 200, headers, body: JSON.stringify({ items }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
