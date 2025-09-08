export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Use POST" });

  const { text, n = 4 } = req.body || {};
  if (!text) return res.status(400).json({ error: "Missing text" });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey)
    return res
      .status(500)
      .json({ error: "Server missing OPENAI_API_KEY" });

  const messages = [
    {
      role: "system",
      content:
        "You are a tutor. Generate MCQs from the supplied text. Reply ONLY in JSON with { \"questions\":[...] }.",
    },
    {
      role: "user",
      content: `
Create ${n} MCQs. Each:
{
 "question": "...",
 "choices": ["A","B","C","D"],
 "answerIndex": 0,
 "explanation": "..."
}
Text:
${text}`,
    },
  ];

  try {
    const openAIRes = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0.2,
          messages,
          response_format: { type: "json_object" },
        }),
      }
    );
    const openAIJson = await openAIRes.json();
    let parsed = {};
    try {
      parsed =
        typeof openAIJson.choices?.[0]?.message?.content ===
        "string"
          ? JSON.parse(openAIJson.choices[0].message.content)
          : openAIJson.choices?.[0]?.message?.content;
    } catch (e) {
      return res.status(500).json({
        error: "Parse error",
        raw: openAIJson,
      });
    }
    res.status(200).json({
      questions: parsed.questions || [],
    });
  } catch (err) {
    console.error("Quiz API error:", err);
    res.status(500).json({ error: err.message });
  }
}
