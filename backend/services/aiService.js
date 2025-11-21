const axios = require('axios');

async function generateWithChatGPT(apiKey, input, options = {}) {
  const model = options.model || process.env.OPENAI_MODEL || 'gpt-3.5-turbo';

  const resp = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model,
      messages: [{ role: 'user', content: input }],
      max_tokens: options.max_tokens || 512,
      temperature: options.temperature ?? 0.7,
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const choice = resp.data?.choices?.[0];
  if (!choice) throw new Error('No response from ChatGPT');
  return choice.message?.content || choice.text || '';
}

async function generateWithOther(providerConfig, apiKey, input, options = {}) {
  // providerConfig: { endpoint, header }
  if (!providerConfig?.endpoint) throw new Error('Provider endpoint not configured');

  const headers = {
    'Content-Type': 'application/json',
  };
  // If a custom header key provided, use it as header name and set apiKey
  if (providerConfig.header) {
    headers[providerConfig.header] = apiKey;
  } else {
    // fallback to Authorization: Bearer
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  // If endpoint looks like a chat/completions endpoint (PublicAI style), send model + messages
  const isChatCompletions = /\/chat\/completions$/i.test(providerConfig.endpoint) || /chat\/completions/i.test(providerConfig.endpoint);
  if (isChatCompletions) {
    const model = options.model || providerConfig.model || process.env.PUBLICAI_DEFAULT_MODEL;
    if (!model) throw new Error('Model not configured for provider (set client.aiProviderModel or PUBLICAI_DEFAULT_MODEL)');
    const body = { model, messages: [{ role: 'user', content: input }] };
    const resp = await axios.post(providerConfig.endpoint, body, { headers });

    // Try common response shapes
    if (resp.data?.choices?.[0]?.message?.content) return resp.data.choices[0].message.content;
    if (resp.data?.choices?.[0]?.text) return resp.data.choices[0].text;
    if (typeof resp.data === 'string') return resp.data;
    return JSON.stringify(resp.data);
  }

  const resp = await axios.post(providerConfig.endpoint, { input }, { headers });

  // Try common response shapes
  if (typeof resp.data === 'string') return resp.data;
  if (resp.data?.output) return resp.data.output;
  if (resp.data?.result) return resp.data.result;
  if (resp.data?.choices?.[0]?.text) return resp.data.choices[0].text;
  if (resp.data?.choices?.[0]?.message?.content) return resp.data.choices[0].message.content;

  return JSON.stringify(resp.data);
}

async function generateForClient({ provider, apiKey, endpoint, header }, input, options = {}) {
  if (!provider) throw new Error('No provider specified');

  switch (provider) {
    case 'chatgpt':
      return await generateWithChatGPT(apiKey, input, options);
    case 'other':
      return await generateWithOther({ endpoint, header }, apiKey, input, options);
    // For now, other providers are treated as 'other' and require endpoint/header
    default:
      // Treat unknown providers as 'other'
      return await generateWithOther({ endpoint, header }, apiKey, input, options);
  }
}

module.exports = { generateForClient };
