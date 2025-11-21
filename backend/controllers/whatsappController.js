const Client = require('../models/Client');
const Prompt = require('../models/Prompt');
const { decrypt } = require('../utils/crypto');
const { generateForClient } = require('../services/aiService');
const axios = require('axios');

function normalizePhoneForSearch(raw) {
  if (!raw) return '';
  return String(raw).replace(/\D/g, '');
}

async function sendViaTwilio(to, body) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM; // e.g. 'whatsapp:+1415...'
  if (!accountSid || !authToken || !from) throw new Error('Twilio not configured');

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const params = new URLSearchParams();
  params.append('From', from);
  params.append('To', `whatsapp:${to}`);
  params.append('Body', body);

  const resp = await axios.post(url, params, {
    auth: { username: accountSid, password: authToken },
  });
  return resp.data;
}

async function sendViaWhatsAppCloud(to, body) {
  const token = process.env.WA_CLOUD_TOKEN;
  const phoneId = process.env.WA_PHONE_ID; // phone_number_id
  if (!token || !phoneId) throw new Error('WhatsApp Cloud API not configured');

  const url = `https://graph.facebook.com/v15.0/${phoneId}/messages`;
  const payload = {
    messaging_product: 'whatsapp',
    to: String(to),
    type: 'text',
    text: { body },
  };

  const resp = await axios.post(url, payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return resp.data;
}

// Generic webhook receiver: accepts Twilio, WhatsApp Cloud, or a simple JSON { from, body }
exports.webhook = async (req, res) => {
  try {
    // Extract message text and sender number from multiple possible webhook shapes
    let from;
    let body;

    // Twilio: form fields 'From' and 'Body'
    if (req.body?.From && req.body?.Body) {
      from = req.body.From; // e.g. 'whatsapp:+5511999999999'
      body = req.body.Body;
    }

    // Meta WhatsApp Cloud: nested structure
    else if (req.body?.entry && Array.isArray(req.body.entry)) {
      try {
        const changes = req.body.entry[0].changes[0];
        const messages = changes.value.messages[0];
        from = messages.from; // phone number
        body = messages.text?.body || messages?.message || '';
      } catch (e) {
        // ignore, fallback to generic
      }
    }

    // Generic JSON shape
    if (!from && req.body?.from) from = req.body.from;
    if (!body && req.body?.body) body = req.body.body;

    if (!from || !body) {
      return res.status(400).json({ success: false, message: 'Webhook payload missing `from` or `body`' });
    }

    // Check if message carries a client tag like [client:<id>] or [client:<id>|prompt:<promptId>] inserted by the QR
    let client = null;
    let selectedPromptId = null;
    const clientTagMatch = body.match(/^\[client:([0-9a-fA-F]{24})(?:\|prompt:([0-9a-fA-F]{24}))?\]\s*/);
    if (clientTagMatch) {
      const clientId = clientTagMatch[1];
      selectedPromptId = clientTagMatch[2] || null;
      client = await Client.findById(clientId);
      // strip tag from body
      body = body.replace(clientTagMatch[0], '').trim();
    }

    const phoneDigits = normalizePhoneForSearch(from);
    // If no client from tag, try to find client by phone ending with digits
    if (!client) {
      client = await Client.findOne({ phone: { $regex: phoneDigits + '$' } });
      if (!client) {
        // try exact match
        client = await Client.findOne({ phone: phoneDigits });
      }
    }

    if (!client) {
      console.warn('Incoming message from unknown number', from);
      return res.status(404).json({ success: false, message: 'Client not found for phone' });
    }

    if (!client.isActive) {
      console.warn('Message received for inactive client', client._id);
      return res.status(200).json({ success: false, message: 'Client inactive' });
    }

    // Determine which prompt/instruction to use: if a specific promptId was encoded in the QR, use it;
    // otherwise use the most recent Prompt for the client. If none exists, fall back to client.notes.
    let instruction = '';
    if (selectedPromptId) {
      const p = await Prompt.findById(selectedPromptId).lean();
      if (p) instruction = p.content || p.title || '';
    }
    if (!instruction) {
      const recent = await Prompt.findOne({ clientId: client._id }).sort({ createdAt: -1 }).lean();
      if (recent) instruction = recent.content || recent.title || '';
    }
    const promptPrefix = instruction ? `${instruction}\n` : (client.notes ? `${client.notes}\n` : '');
    const aiInput = `${promptPrefix}Usuário: ${body}\nResposta:`;

    const encryptedKey = client.aiApiKey;
    const apiKey = encryptedKey ? decrypt(encryptedKey) : null;
    if (!apiKey) {
      console.warn('Client has no AI API key configured', client._id);
      return res.status(400).json({ success: false, message: 'Client AI not configured' });
    }

    // Generate reply using client's provider settings
    const provider = client.aiProvider || 'chatgpt';
    const endpoint = client.aiProviderEndpoint;
    const header = client.aiProviderHeader;

    let reply;
    try {
      const options = { model: client.aiProviderModel };
      reply = await generateForClient({ provider, apiKey, endpoint, header }, aiInput, options);
    } catch (err) {
      console.error('AI generation error', err.message);
      return res.status(500).json({ success: false, message: 'AI generation failed' });
    }

    // Send reply using configured outbound provider (Twilio or WhatsApp Cloud)
    const toPhone = phoneDigits;
    try {
      if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
        await sendViaTwilio(toPhone, reply);
      } else if (process.env.WA_CLOUD_TOKEN && process.env.WA_PHONE_ID) {
        await sendViaWhatsAppCloud(toPhone, reply);
      } else {
        console.warn('No outbound WhatsApp provider configured');
        return res.status(500).json({ success: false, message: 'No outbound WhatsApp provider configured on server' });
      }
    } catch (err) {
      console.error('Error sending WhatsApp message', err.message);
      return res.status(500).json({ success: false, message: 'Failed sending WhatsApp reply' });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Webhook processing error', err);
    return res.status(500).json({ success: false, message: 'Internal error' });
  }
};

// Simulate AI reply for a client (no outbound sending) — useful for local testing
exports.simulate = async (req, res) => {
  try {
    const { clientId, message, promptId } = req.body;
    if (!clientId || !message) return res.status(400).json({ success: false, message: 'clientId and message required' });

    const client = await Client.findById(clientId);
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });

    if (!client.isActive) return res.status(400).json({ success: false, message: 'Client inactive' });

    // Prefer explicit promptId if provided, otherwise use latest prompt for client, otherwise client.notes
    let instruction = '';
    if (promptId) {
      const p = await Prompt.findById(promptId).lean();
      if (p) instruction = p.content || p.title || '';
    }
    if (!instruction) {
      const recent = await Prompt.findOne({ clientId: client._id }).sort({ createdAt: -1 }).lean();
      if (recent) instruction = recent.content || recent.title || '';
    }
    const promptPrefix = instruction ? `${instruction}\n` : (client.notes ? `${client.notes}\n` : '');
    const aiInput = `${promptPrefix}Usuário: ${message}\nResposta:`;

    const encryptedKey = client.aiApiKey;
    const apiKey = encryptedKey ? decrypt(encryptedKey) : null;
    if (!apiKey) return res.status(400).json({ success: false, message: 'Client AI not configured' });

    const provider = client.aiProvider || 'chatgpt';
    const endpoint = client.aiProviderEndpoint;
    const header = client.aiProviderHeader;

    let reply;
    try {
      const options = { model: client.aiProviderModel };
      reply = await generateForClient({ provider, apiKey, endpoint, header }, aiInput, options);
    } catch (err) {
      console.error('AI generation error (simulate)', err.message);
      return res.status(500).json({ success: false, message: 'AI generation failed' });
    }

    return res.status(200).json({ success: true, reply });
  } catch (err) {
    console.error('Simulation error', err);
    return res.status(500).json({ success: false, message: 'Internal error' });
  }
};

// For Meta verification (optional)
exports.verify = (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode && token) {
    if (mode === 'subscribe' && token === process.env.WA_VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.status(403).send('Forbidden');
  }
  res.status(400).send('Bad Request');
};
