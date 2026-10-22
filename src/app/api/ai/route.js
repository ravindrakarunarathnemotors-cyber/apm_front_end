export async function POST(req) {
  const { message } = await req.json()
  const apiKey = process.env.OPENROUTER_API_KEY

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      // Optional OpenRouter-specific headers for ranking:
      // "HTTP-Referer": "http://localhost:3000", // change if deployed
      // "X-Title": "MyAppName",
    },
    body: JSON.stringify({
      model: 'anthropic/claude-3-haiku', // or the above alternatives
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: message },
      ],
      max_tokens: 150,
      temperature: 0.7,
    }),
  })

  const data = await response.json()
  console.log('OpenAI raw response:', data) // Add this line for debugging
  const aiReply = data.choices?.[0]?.message?.content?.trim() || 'No reply from AI.'
  return Response.json({ reply: aiReply })
}
