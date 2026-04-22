// netlify/functions/ai-news.js
// Fetches the Google News RSS feed for AI topics, parses the XML,
// and returns a clean JSON payload the DailyNoons frontend can render.
//
// The endpoint is called from index.html as /.netlify/functions/ai-news
// Results are cached on Netlify's CDN for 15 minutes to keep the page snappy
// and stay well under any reasonable rate limits.

// ── CONFIG ────────────────────────────────────────────────────────────────
// Adjust this query to tune what appears in the AI Pulse section.
// Examples:
//   - Broader tech:   '"artificial intelligence" OR "machine learning" OR "generative AI"'
//   - Only OpenAI:    '"OpenAI" OR "ChatGPT"'
//   - Last 24h only:  append ' when:1d' to the query
const SEARCH_QUERY = '"artificial intelligence" OR "generative AI" OR "large language model"';
const MAX_ITEMS    = 12;
const CACHE_SECONDS = 900; // 15 minutes
// ──────────────────────────────────────────────────────────────────────────

exports.handler = async () => {
  const url =
    'https://news.google.com/rss/search?q=' +
    encodeURIComponent(SEARCH_QUERY) +
    '&hl=en-US&gl=US&ceid=US:en';

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DailyNoons/1.0)' }
    });

    if (!response.ok) {
      throw new Error(`Upstream RSS fetch failed: ${response.status}`);
    }

    const xml = await response.text();
    const items = parseRSS(xml).slice(0, MAX_ITEMS);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': `public, max-age=${CACHE_SECONDS}, s-maxage=${CACHE_SECONDS}`,
        'Netlify-CDN-Cache-Control': `public, max-age=${CACHE_SECONDS}`
      },
      body: JSON.stringify({ items, fetchedAt: new Date().toISOString() })
    };
  } catch (err) {
    console.error('ai-news function error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to fetch news', message: err.message })
    };
  }
};

// ── RSS PARSER ────────────────────────────────────────────────────────────
// Simple regex-based parser. Google News RSS is well-formed and predictable,
// so this avoids pulling in an XML-parser dependency.

function parseRSS(xml) {
  const items = [];
  const itemRegex = /<item\b[^>]*>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];

    const rawTitle  = extractTag(block, 'title');
    const rawLink   = extractTag(block, 'link');
    const rawDate   = extractTag(block, 'pubDate');
    const rawSource = extractTag(block, 'source');

    const title  = decodeEntities(stripCDATA(rawTitle));
    const source = decodeEntities(stripCDATA(rawSource));

    // Google News titles are formatted: "Headline - Source Name".
    // Strip the trailing source so we don't show it twice in the UI.
    const cleanedTitle = source
      ? title.replace(new RegExp('\\s[-–—]\\s' + escapeRegex(source) + '\\s*$'), '').trim()
      : title;

    items.push({
      title: cleanedTitle,
      link: stripCDATA(rawLink).trim(),
      pubDate: stripCDATA(rawDate).trim(),
      source: source || null
    });
  }

  return items;
}

function extractTag(xml, tag) {
  const re = new RegExp('<' + tag + '\\b[^>]*>([\\s\\S]*?)<\\/' + tag + '>', 'i');
  const m = xml.match(re);
  return m ? m[1] : '';
}

function stripCDATA(str) {
  return str.replace(/^\s*<!\[CDATA\[/, '').replace(/\]\]>\s*$/, '').trim();
}

function decodeEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
