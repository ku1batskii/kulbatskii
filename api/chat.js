export default async function handler(req, res) {
res.setHeader(“Access-Control-Allow-Origin”, “*”);
res.setHeader(“Access-Control-Allow-Headers”, “Content-Type”);
if (req.method === “OPTIONS”) { res.status(200).end(); return; }

const { messages, system } = req.body;

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
max_tokens: 300,
stream: true,
system,
messages,
}),
});

```
res.setHeader("Content-Type", "text/event-stream");
res.setHeader("Cache-Control", "no-cache");

const reader = upstream.body.getReader();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  res.write(value);
}
res.end();
```

} catch (e) {
res.status(500).json({ error: e.message });
}
}