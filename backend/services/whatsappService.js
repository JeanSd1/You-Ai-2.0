// WhatsApp Service using Baileys Library
// Handles WhatsApp Web connection, message receiving, and routing to AI

const makeWASocket = require('@whiskeysockets/baileys').default;
const { useMultiFileAuthState } = require('@whiskeysockets/baileys');
const path = require('path');
const fs = require('fs');
const Client = require('../models/Client');
const Prompt = require('../models/Prompt');
const { decrypt } = require('../utils/crypto');
const { generateForClient } = require('./aiService');

let sock = null;
let qrCode = null;
let isConnected = false;

// Path to store WhatsApp authentication files
const AUTH_FOLDER = path.join(__dirname, '../tmp', 'whatsapp_auth');

// Ensure auth folder exists
if (!fs.existsSync(AUTH_FOLDER)) {
  fs.mkdirSync(AUTH_FOLDER, { recursive: true });
}

/**
 * Initialize WhatsApp connection using Baileys
 */
async function initializeWhatsApp() {
  try {
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);

    sock = makeWASocket({
      auth: state,
      printQRInTerminal: false, // We'll display QR via API endpoint
      syncFullHistory: false,
      logger: undefined, // Disable verbose logging
    });

    // Handle QR Code generation
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        qrCode = qr; // Store QR for retrieval via API
        console.log('[WhatsApp] QR Code generated, available at /api/whatsapp/qr');
      }

      if (connection === 'connecting') {
        console.log('[WhatsApp] Connecting...');
        isConnected = false;
      }

      if (connection === 'open') {
        console.log('[WhatsApp] Connected successfully');
        isConnected = true;
        qrCode = null; // Clear QR once connected
      }

      if (connection === 'close') {
        isConnected = false;
        const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== 401;
        console.log(
          `[WhatsApp] Connection closed due to ${lastDisconnect?.error}. Reconnecting: ${shouldReconnect}`
        );
        if (shouldReconnect) {
          await initializeWhatsApp();
        }
      }
    });

    // Handle incoming messages
    sock.ev.on('messages.upsert', async (m) => {
      try {
        await handleIncomingMessage(m);
      } catch (err) {
        console.error('[WhatsApp] Error handling message:', err);
      }
    });

    // Save credentials whenever they change
    sock.ev.on('creds.update', saveCreds);

    return sock;
  } catch (err) {
    console.error('[WhatsApp] Initialization error:', err);
    setTimeout(() => initializeWhatsApp(), 5000); // Retry after 5 seconds
  }
}

/**
 * Handle incoming WhatsApp messages
 */
async function handleIncomingMessage(m) {
  const message = m.messages[0];
  if (!message.message) return; // Ignore empty messages

  const messageText =
    message.message.conversation ||
    message.message.extendedTextMessage?.text ||
    '';

  if (!messageText) return;

  const fromNumber = message.key.remoteJid.replace('@s.whatsapp.net', '');
  const isGroup = message.key.remoteJid.includes('@g.us');

  // Ignore group messages for now
  if (isGroup) return;

  console.log(`[WhatsApp] Message from ${fromNumber}: ${messageText}`);

  try {
    // Extract client tag from message: [client:ID|prompt:ID]
    let clientId = null;
    let promptId = null;
    let userMessage = messageText;

    const tagMatch = messageText.match(/^\[client:([0-9a-fA-F]{24})(?:\|prompt:([0-9a-fA-F]{24}))?\]\s*(.*)$/);
    if (tagMatch) {
      clientId = tagMatch[1];
      promptId = tagMatch[2] || null;
      userMessage = tagMatch[3]; // Remove tag from message
    }

    // If no tag found, try to find client by phone
    let client = null;
    if (clientId) {
      client = await Client.findById(clientId);
    } else {
      client = await Client.findOne({
        phone: { $regex: fromNumber + '$' },
      });
      if (!client) {
        client = await Client.findOne({ phone: fromNumber });
      }
    }

    if (!client) {
      console.warn(`[WhatsApp] No client found for number ${fromNumber}`);
      await sock.sendMessage(message.key.remoteJid, {
        text: 'Desculpe, não encontrei sua conta. Por favor, escaneie um novo QR code.',
      });
      return;
    }

    if (!client.isActive) {
      console.warn(`[WhatsApp] Client ${client._id} is inactive`);
      await sock.sendMessage(message.key.remoteJid, {
        text: 'Sua conta foi desativada. Entre em contato com suporte.',
      });
      return;
    }

    // Get prompt/instruction
    let instruction = '';
    if (promptId) {
      const p = await Prompt.findById(promptId).lean();
      if (p) instruction = p.content || p.title || '';
    }
    if (!instruction) {
      const recent = await Prompt.findOne({ clientId: client._id })
        .sort({ createdAt: -1 })
        .lean();
      if (recent) instruction = recent.content || recent.title || '';
    }

    const promptPrefix = instruction ? `${instruction}\n` : (client.notes ? `${client.notes}\n` : '');
    const aiInput = `${promptPrefix}Usuário: ${userMessage}\nResposta:`;

    // Get AI API key
    const encryptedKey = client.aiApiKey;
    const apiKey = encryptedKey ? decrypt(encryptedKey) : null;

    if (!apiKey) {
      console.warn(`[WhatsApp] Client ${client._id} has no AI API key`);
      await sock.sendMessage(message.key.remoteJid, {
        text: 'IA não configurada. Por favor, configure sua API key.',
      });
      return;
    }

    // Generate AI response
    const provider = client.aiProvider || 'chatgpt';
    const endpoint = client.aiProviderEndpoint;
    const header = client.aiProviderHeader;
    const options = { model: client.aiProviderModel };

    let reply;
    try {
      reply = await generateForClient({ provider, apiKey, endpoint, header }, aiInput, options);
    } catch (err) {
      console.error(`[WhatsApp] AI generation error for client ${client._id}:`, err.message);
      await sock.sendMessage(message.key.remoteJid, {
        text: 'Erro ao gerar resposta. Tente novamente.',
      });
      return;
    }

    // Send reply
    await sock.sendMessage(message.key.remoteJid, {
      text: reply,
    });

    console.log(`[WhatsApp] Reply sent to ${fromNumber}`);
  } catch (err) {
    console.error('[WhatsApp] Message handling error:', err);
    try {
      await sock.sendMessage(message.key.remoteJid, {
        text: 'Desculpe, ocorreu um erro. Tente novamente.',
      });
    } catch (sendErr) {
      console.error('[WhatsApp] Failed to send error message:', sendErr);
    }
  }
}

/**
 * Get current QR code
 */
function getQRCode() {
  return qrCode;
}

/**
 * Check connection status
 */
function isWhatsAppConnected() {
  return isConnected;
}

/**
 * Send message to a WhatsApp number (for testing or admin notifications)
 */
async function sendMessage(phoneNumber, message) {
  if (!sock || !isConnected) {
    throw new Error('WhatsApp not connected');
  }

  const jid = phoneNumber.includes('@') ? phoneNumber : `${phoneNumber}@s.whatsapp.net`;
  return await sock.sendMessage(jid, { text: message });
}

/**
 * Disconnect WhatsApp
 */
async function disconnectWhatsApp() {
  if (sock) {
    await sock.end();
    sock = null;
    isConnected = false;
    console.log('[WhatsApp] Disconnected');
  }
}

module.exports = {
  initializeWhatsApp,
  getQRCode,
  isWhatsAppConnected,
  sendMessage,
  disconnectWhatsApp,
};
