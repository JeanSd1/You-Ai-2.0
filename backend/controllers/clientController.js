const Client = require('../models/Client');

// Criar novo cliente
exports.createClient = async (req, res) => {
  try {
    const { name, email, phone, whatsappNumber, company, address, city, state, zipCode, notes } = req.body;

    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Nome e telefone são obrigatórios',
      });
    }

    const client = await Client.create({
      userId: req.user.id,
      name,
      email,
      phone,
      whatsappNumber,
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

    res.status(200).json({
      success: true,
      clients,
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

    res.status(200).json({
      success: true,
      client,
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

    client = await Client.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      client,
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
