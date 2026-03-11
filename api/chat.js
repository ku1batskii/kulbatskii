// pages/api/chat.js
// Next.js SSE proxy для Anthropic API
// Поддерживает: streaming, system prompt, conversation history

export const config = {
api: {
// Отключаем встроенный body parser — читаем поток напрямую
responseLimit: false,
},
};

export default async function handler(req, res) {
// CORS (нужен для Telegram Mini App при разработке)
res.setHeader(“Access-Control-Allow-Origin”, “*”);
res.setHeader(“Access-Control-Allow-Headers”, “Content-Type”);
res.setHeader(“Access-Control-Allow-Methods”, “POST, OPTIONS”);

if (req.method === “OPTIONS”) {
res.status(200).end();
return;
}

if (req.method !== “POST”) {
res.status(405).json({ error: “Method not allowed” });
return;
}

const { messages, system } = req.body;

if (!messages || !Array.isArray(messages)) {
res.status(400).json({ error: “messages array required” });
return;
}

if (!process.env.ANTHROPIC_API_KEY) {
res.status(500).json({ error: “ANTHROPIC_API_KEY not set” });
return;
}

try {
const upstream = await fetch(“https://api.anthropic.com/v1/messages”, {
method: “POST”,
headers: {
“Content-Type”: “application/json”,
“x-api-key”: process.env.ANTHROPIC_API_KEY,
“anthropic-version”: “2023-06-01”,
},
body: JSON.stringify({
model: “claude-sonnet-4-20250514”,
max_tokens: 350,
stream: true,
…(system ? { system } : {}),
messages,
}),
});

```
if (!upstream.ok) {
  const err = await upstream.json().catch(() => ({}));
  res.status(upstream.status).json({
    error: err?.error?.message || `Anthropic API error ${upstream.status}`,
  });
  return;
}

// Pipe SSE stream напрямую клиенту
res.setHeader("Content-Type", "text/event-stream");
res.setHeader("Cache-Control", "no-cache, no-transform");
res.setHeader("X-Accel-Buffering", "no"); // отключаем буферизацию nginx

const reader = upstream.body.getReader();

// Закрываем upstream если клиент отключился
req.on("close", () => {
  reader.cancel().catch(() => {});
});

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  // Пишем chunk как есть — Anthropic уже отдаёт SSE формат
  res.write(value);
}

res.end();
```

} catch (e) {
// Если заголовки уже отправлены — тихо завершаем
if (!res.headersSent) {
res.status(500).json({ error: e.message });
} else {
res.end();
}
}
}