export async function callGroq({ systemPrompt, userPrompt, temperature = 0.3 }) {
  const apiKey = process.env.GROQ_API_KEY;
  const groqModel = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
  const groqBaseUrl = process.env.GROQ_API_BASE_URL || 'https://api.groq.com/openai/v1';

  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured on the server');
  }

  const groqResponse = await fetch(`${groqBaseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: groqModel,
      temperature,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    })
  });

  if (!groqResponse.ok) {
    const errorText = await groqResponse.text();
    throw new Error(`Groq request failed: ${errorText}`);
  }

  const data = await groqResponse.json();
  return data?.choices?.[0]?.message?.content || '';
}
