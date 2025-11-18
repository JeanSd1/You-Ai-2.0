const Client = require('../models/Client');
const { encrypt, decrypt } = require('../utils/crypto');

// Criar novo cliente
exports.createClient = async (req, res) => {
  try {
    const { name, email, phone, whatsappNumber, company, address, city, state, zipCode, notes, aiProvider, aiApiKey } = req.body;

    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Nome e telefone são obrigatórios',
      });
    }

    // encrypt aiApiKey before storing
    const storedApiKey = aiApiKey ? encrypt(aiApiKey) : undefined;

    const client = await Client.create({
      userId: req.user.id,
      name,
      email,
      phone,
      whatsappNumber,
      aiProvider,
      aiApiKey: storedApiKey,
      company,
      address,
      city,
      state,
      zipCode,
      notes,
    });

    res.status(201).json({
      success: true,
      client,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao criar cliente',
      error: error.message,
    });
  }
};

// Listar clientes do usuário
exports.getClients = async (req, res) => {
  try {
    const clients = await Client.find({ userId: req.user.id });

    // decrypt aiApiKey before returning (only for the owner)
    const clientsSafe = clients.map(c => {
      const obj = c.toObject();
      obj.aiApiKey = c.aiApiKey ? decrypt(c.aiApiKey) : undefined;
      return obj;
    });

    res.status(200).json({
      success: true,
      clients: clientsSafe,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar clientes',
      error: error.message,
    });
  }
};

// Obter um cliente específico
exports.getClientById = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Cliente não encontrado',
      });
    }

    // Verificar se o cliente pertence ao usuário
    if (client.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Não autorizado',
      });
    }

    const clientObj = client.toObject();
    clientObj.aiApiKey = client.aiApiKey ? decrypt(client.aiApiKey) : undefined;

    res.status(200).json({
      success: true,
      client: clientObj,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar cliente',
      error: error.message,
    });
  }
};

// Atualizar cliente
exports.updateClient = async (req, res) => {
  try {
    let client = await Client.findById(req.params.id);

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Cliente não encontrado',
      });
    }

    // Verificar se o cliente pertence ao usuário
    if (client.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Não autorizado',
      });
    }

    // Only allow certain fields to be updated
    const updatableRaw = (({ name, email, phone, whatsappNumber, company, address, city, state, zipCode, notes, aiProvider, aiApiKey }) => ({ name, email, phone, whatsappNumber, company, address, city, state, zipCode, notes, aiProvider, aiApiKey }))(req.body);

    // If aiApiKey provided, encrypt it before saving
    if (updatableRaw.aiApiKey) {
      updatableRaw.aiApiKey = encrypt(updatableRaw.aiApiKey);
    }

    client = await Client.findByIdAndUpdate(req.params.id, updatableRaw, {
      new: true,
      runValidators: true,
    });

    const clientUpdated = client.toObject();
    clientUpdated.aiApiKey = client.aiApiKey ? decrypt(client.aiApiKey) : undefined;

    res.status(200).json({
      success: true,
      client: clientUpdated,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar cliente',
      error: error.message,
    });
  }
};

// Deletar cliente
exports.deleteClient = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Cliente não encontrado',
      });
    }

    // Verificar se o cliente pertence ao usuário
    if (client.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Não autorizado',
      });
    }

    await Client.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Cliente deletado com sucesso',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao deletar cliente',
      error: error.message,
    });
  }
};
