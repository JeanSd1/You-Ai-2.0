const QRCode = require('qrcode');
const Prompt = require('../models/Prompt');
const Client = require('../models/Client');
const axios = require('axios');
const { decrypt } = require('../utils/crypto');
const { generateForClient } = require('../services/aiService');

// Gerar QR Code
exports.generateQRCode = async (req, res) => {
  try {
    const { clientId, title, content, useAI, aiInput, qrType } = req.body;

    if (!clientId || !title || !content) {
      return res.status(400).json({
        success: false,
        message: 'ClientID, título e conteúdo são obrigatórios',
      });
    }

    // Verificar se cliente existe e pertence ao usuário (owner) ou está vinculado ao usuário (account user)
    const client = await Client.findOne({
      _id: clientId,
      $or: [
        { userId: req.user.id },
        { accountUserId: req.user.id },
      ],
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Cliente não encontrado',
      });
    }

    // If requested, generate content using client's configured AI
    let finalContent = content;
    if (useAI) {
      const apiKeyEncrypted = client.aiApiKey;
      const apiKey = apiKeyEncrypted ? decrypt(apiKeyEncrypted) : null;
      if (!apiKey) {
        return res.status(400).json({ success: false, message: 'AI API key not configured for this client' });
      }

      // provider info
      const provider = client.aiProvider || 'chatgpt';
      const endpoint = client.aiProviderEndpoint;
      const header = client.aiProviderHeader;

      const inputForAI = aiInput || content || '';

      // Call aiService
      try {
        const generated = await generateForClient({ provider, apiKey, endpoint, header }, inputForAI);
        finalContent = generated;
      } catch (err) {
        return res.status(500).json({ success: false, message: 'AI generation failed', error: err.message });
      }
    }

    // Criar registro de Prompt primeiro (sem qrCode ainda). Depois geramos o link
    // e atualizamos o Prompt com `qrCodeData` e `qrCodeUrl`. Isso nos permite
    // incluir `promptId` no tag do QR para roteamento futuro.
    const prompt = await Prompt.create({
      userId: req.user.id,
      clientId,
      title,
      content: finalContent,
      sentVia: 'qrcode',
    });

    // Criar payload do QR Code. Se o cliente tiver telefone, gerar um link wa.me
    // para abrir o chat no WhatsApp com a mensagem pré-preenchida. Caso contrário,
    // salvar um JSON com os dados.
    let qrCodeDataURL;
    let qrCodeUrl = undefined;

    // Decide QR behavior based on qrType: 'auto' (default), 'whatsapp', or 'json'
    const type = qrType || 'auto';

    if (type === 'whatsapp') {
      if (!client.phone) {
        return res.status(400).json({ success: false, message: 'Cliente sem telefone — não é possível gerar QR que abra WhatsApp' });
      }
      // If a server WhatsApp number is configured, use it so incoming messages
      // go to the server number and webhooks can route the conversation to the correct client.
      const serverNumberRaw = process.env.WA_SERVER_NUMBER || (process.env.TWILIO_WHATSAPP_FROM ? process.env.TWILIO_WHATSAPP_FROM.replace('whatsapp:', '') : undefined);
      const targetNumber = serverNumberRaw ? String(serverNumberRaw).replace(/\D/g, '') : String(client.phone).replace(/\D/g, '');
      // Prefix message with client identifier and prompt id so the webhook knows which client/prompt to use
      const messageWithClientTag = `[client:${client._id}|prompt:${prompt._id}] ${finalContent}`;
      const waLink = `https://wa.me/${targetNumber}?text=${encodeURIComponent(messageWithClientTag)}`;
      qrCodeDataURL = await QRCode.toDataURL(waLink);
      qrCodeUrl = waLink;
    } else if (type === 'json') {
      const qrData = {
        clientName: client.name,
        clientPhone: client.phone,
        message: finalContent,
        timestamp: new Date().toISOString(),
      };
      qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData));
    } else {
      // auto: prefer WhatsApp when phone exists
      if (client.phone) {
        const serverNumberRaw = process.env.WA_SERVER_NUMBER || (process.env.TWILIO_WHATSAPP_FROM ? process.env.TWILIO_WHATSAPP_FROM.replace('whatsapp:', '') : undefined);
        const targetNumber = serverNumberRaw ? String(serverNumberRaw).replace(/\D/g, '') : String(client.phone).replace(/\D/g, '');
        const messageWithClientTag = `[client:${client._id}|prompt:${prompt._id}] ${finalContent}`;
        const waLink = `https://wa.me/${targetNumber}?text=${encodeURIComponent(messageWithClientTag)}`;
        qrCodeDataURL = await QRCode.toDataURL(waLink);
        qrCodeUrl = waLink;
      } else {
        const qrData = {
          clientName: client.name,
          clientPhone: client.phone,
          message: finalContent,
          timestamp: new Date().toISOString(),
        };
        qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData));
      }
    }
    // Update prompt with QR information
    prompt.qrCodeData = qrCodeDataURL;
    prompt.qrCodeUrl = qrCodeUrl;
    await prompt.save();

    res.status(201).json({
      success: true,
      qrCode: {
        id: prompt._id,
        title: prompt.title,
        qrCodeData: prompt.qrCodeData,
        createdAt: prompt.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao gerar QR Code',
      error: error.message,
    });
  }
};

// Listar QR Codes do usuário
exports.getQRCodes = async (req, res) => {
  try {
    // Allow both the owner (who created prompts) and account users linked to clients
    // to see prompts. We fetch client IDs where the current user is owner or accountUser,
    // then return prompts that either belong to the user or to those clients.
    const clients = await Client.find({
      $or: [
        { userId: req.user.id },
        { accountUserId: req.user.id },
      ],
    }).select('_id');

    const clientIds = clients.map(c => c._id);

    const prompts = await Prompt.find({
      $or: [
        { userId: req.user.id },
        { clientId: { $in: clientIds } },
      ],
    })
      .populate('clientId', 'name phone')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, qrCodes: prompts });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar QR Codes',
      error: error.message,
    });
  }
};

// Obter um QR Code específico
exports.getQRCodeById = async (req, res) => {
  try {
    const prompt = await Prompt.findById(req.params.id).populate('clientId');

    if (!prompt) {
      return res.status(404).json({
        success: false,
        message: 'QR Code não encontrado',
      });
    }

    // Verificar se pertence ao usuário (owner) ou se o usuário é o accountUser do client
    const client = prompt.clientId;
    const isOwner = prompt.userId.toString() === req.user.id;
    const isAccountUser = client && client.accountUserId && client.accountUserId.toString() === req.user.id;
    if (!isOwner && !isAccountUser) {
      return res.status(403).json({ success: false, message: 'Não autorizado' });
    }

    res.status(200).json({
      success: true,
      qrCode: prompt,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar QR Code',
      error: error.message,
    });
  }
};

// Enviar QR Code via WhatsApp
exports.sendViaWhatsApp = async (req, res) => {
  try {
    const { qrCodeId } = req.body;

    const prompt = await Prompt.findById(qrCodeId).populate('clientId');

    if (!prompt) {
      return res.status(404).json({
        success: false,
        message: 'QR Code não encontrado',
      });
    }

    // Verificar se pertence ao usuário
    if (prompt.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Não autorizado',
      });
    }

    // Aqui você integraria com a API real do WhatsApp
    // Por enquanto, apenas marcamos como enviado
    prompt.isSent = true;
    prompt.sentAt = new Date();
    prompt.sentVia = 'whatsapp';
    await prompt.save();

    res.status(200).json({
      success: true,
      message: 'QR Code enviado via WhatsApp com sucesso',
      qrCode: prompt,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao enviar QR Code',
      error: error.message,
    });
  }
};

// Regenerate an existing Prompt's QR explicitly as WhatsApp link
exports.regenerateQRCodeAsWhatsApp = async (req, res) => {
  try {
    const promptId = req.params.id;

    const prompt = await Prompt.findById(promptId).populate('clientId');
    if (!prompt) {
      return res.status(404).json({ success: false, message: 'QR Code não encontrado' });
    }

    // allow owner or account user to regenerate
    const client = prompt.clientId;
    if (!client) {
      return res.status(404).json({ success: false, message: 'Cliente associado não encontrado' });
    }

    const isOwner = String(client.userId) === req.user.id;
    const isAccountUser = String(client.accountUserId) === req.user.id;
    if (!isOwner && !isAccountUser) {
      return res.status(403).json({ success: false, message: 'Não autorizado' });
    }

    // Ensure client has phone
    if (!client.phone) {
      return res.status(400).json({ success: false, message: 'Cliente sem telefone — não é possível gerar QR que abra WhatsApp' });
    }

    // Generate wa.me link and data URL
    const finalContent = prompt.content || prompt.title || '';
    // If a server WhatsApp number is configured, use it so incoming messages
    // go to the server number and webhooks can route the conversation to the correct client.
    const serverNumberRaw = process.env.WA_SERVER_NUMBER || (process.env.TWILIO_WHATSAPP_FROM ? process.env.TWILIO_WHATSAPP_FROM.replace('whatsapp:', '') : undefined);
    const targetNumber = serverNumberRaw ? String(serverNumberRaw).replace(/\D/g, '') : String(client.phone).replace(/\D/g, '');
    // Prefix message with client identifier and prompt id so the webhook knows which client/prompt to use
    const messageWithClientTag = `[client:${client._id}|prompt:${prompt._id}] ${finalContent}`;
    const waLink = `https://wa.me/${targetNumber}?text=${encodeURIComponent(messageWithClientTag)}`;
    const qrCodeDataURL = await QRCode.toDataURL(waLink);

    // Update prompt
    prompt.qrCodeData = qrCodeDataURL;
    prompt.qrCodeUrl = waLink;
    await prompt.save();

    res.status(200).json({ success: true, qrCode: prompt });
  } catch (error) {
    console.error('Erro ao regenerar QR Code:', error);
    res.status(500).json({ success: false, message: 'Erro ao regenerar QR Code', error: error.message });
  }
};

// Regenerate all prompts for a client as WhatsApp links (batch)
exports.regenerateAllForClientAsWhatsApp = async (req, res) => {
  try {
    const clientId = req.params.id;

    const client = await Client.findById(clientId);
    if (!client) return res.status(404).json({ success: false, message: 'Cliente não encontrado' });

    const isOwner = String(client.userId) === req.user.id;
    const isAccountUser = String(client.accountUserId) === req.user.id;
    if (!isOwner && !isAccountUser) return res.status(403).json({ success: false, message: 'Não autorizado' });

    if (!client.phone) return res.status(400).json({ success: false, message: 'Cliente sem telefone — impossível gerar WhatsApp QR' });

    const prompts = await Prompt.find({ clientId: client._id });
    let updated = 0;
    let skipped = 0;
    const serverNumberRaw = process.env.WA_SERVER_NUMBER || (process.env.TWILIO_WHATSAPP_FROM ? process.env.TWILIO_WHATSAPP_FROM.replace('whatsapp:', '') : undefined);
    const targetNumber = serverNumberRaw ? String(serverNumberRaw).replace(/\D/g, '') : String(client.phone).replace(/\D/g, '');

    for (const p of prompts) {
      try {
        const finalContent = p.content || p.title || '';
        const messageWithClientTag = `[client:${client._id}|prompt:${p._id}] ${finalContent}`;
        const waLink = `https://wa.me/${targetNumber}?text=${encodeURIComponent(messageWithClientTag)}`;
        const qrCodeDataURL = await QRCode.toDataURL(waLink);
        p.qrCodeData = qrCodeDataURL;
        p.qrCodeUrl = waLink;
        await p.save();
        updated++;
      } catch (err) {
        console.error('Erro ao regenerar prompt', p._id, err.message);
        skipped++;
      }
    }

    res.status(200).json({ success: true, updated, skipped, total: prompts.length });
  } catch (error) {
    console.error('Erro na regeneração em lote:', error);
    res.status(500).json({ success: false, message: 'Erro ao regenerar QR em lote', error: error.message });
  }
};

// Deletar QR Code
exports.deleteQRCode = async (req, res) => {
  try {
    const prompt = await Prompt.findById(req.params.id);

    if (!prompt) {
      return res.status(404).json({
        success: false,
        message: 'QR Code não encontrado',
      });
    }

    // Verificar se pertence ao usuário
    if (prompt.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Não autorizado',
      });
    }

    await Prompt.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'QR Code deletado com sucesso',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao deletar QR Code',
      error: error.message,
    });
  }
};
