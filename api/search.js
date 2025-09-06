export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Missing q' });

  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=10`;
  const r = await fetch(url);
  const json = await r.json();

  const items = (json.items || []).map(v => {
    const info = v.volumeInfo || {};
    return {
      id: v.id,
      googleId: v.id,
      title: info.title || 'Untitled',
      authors: info.authors || [],
      description: info.description || '',
      thumbnail: info.imageLinks?.thumbnail || '',
      fileUri: '',
      type: 'google'
    };
  });

  res.status(200).json({ results: items });
}
