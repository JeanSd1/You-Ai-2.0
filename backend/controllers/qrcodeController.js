const QRCode = require('qrcode');
const Prompt = require('../models/Prompt');
const Client = require('../models/Client');
const axios = require('axios');

// Gerar QR Code
exports.generateQRCode = async (req, res) => {
  try {
    const { clientId, title, content } = req.body;

    if (!clientId || !title || !content) {
      return res.status(400).json({
        success: false,
        message: 'ClientID, título e conteúdo são obrigatórios',
      });
    }

    // Verificar se cliente existe e pertence ao usuário
    const client = await Client.findOne({
      _id: clientId,
      userId: req.user.id,
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Cliente não encontrado',
      });
    }

    // Criar dados para QR Code
    const qrData = {
      clientName: client.name,
      clientPhone: client.phone,
      message: content,
      timestamp: new Date().toISOString(),
    };

    // Gerar QR Code em PNG (data URL)
    const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData));

    // Salvar no banco de dados
    const prompt = await Prompt.create({
      userId: req.user.id,
      clientId,
      title,
      content,
      qrCodeData: qrCodeDataURL,
      sentVia: 'qrcode',
    });

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
    const prompts = await Prompt.find({ userId: req.user.id })
      .populate('clientId', 'name phone')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      qrCodes: prompts,
    });
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

    // Verificar se pertence ao usuário
    if (prompt.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Não autorizado',
      });
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
