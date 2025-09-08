export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );
  if (req.method === "OPTIONS") return res.status(200).end();

  const { q } = req.query;
  if (!q)
    return res.status(400).json({ error: "Missing search query (?q=)" });

  const apiKey = process.env.GOOGLE_BOOKS_KEY;
  if (!apiKey)
    return res
      .status(500)
      .json({ error: "Google Books API key not configured" });

  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
    q
  )}&maxResults=10&key=${apiKey}`;

  try {
    const response = await fetch(url);
    if (!response.ok)
      throw new Error(
        `Google Books API error: ${response.statusText}`
      );
    const data = await response.json();
    const books = (data.items || []).map((item) => ({
      id: item.id,
      googleId: item.id,
      title: item.volumeInfo.title || "Untitled",
      authors: item.volumeInfo.authors || [],
      description: item.volumeInfo.description || "",
      thumbnail:
        item.volumeInfo.imageLinks?.thumbnail || null,
      previewLink: item.volumeInfo.previewLink || null,
    }));
    res.status(200).json({ results: books });
  } catch (err) {
    console.error("Search API error:", err);
    res.status(500).json({ error: err.message });
  }
}
