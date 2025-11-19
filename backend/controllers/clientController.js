const mongoose = require('mongoose');
const Client = require('../models/Client');
const User = require('../models/User');
const { encrypt, decrypt } = require('../utils/crypto');

// Criar novo cliente
exports.createClient = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { name, email, phone, whatsappNumber, company, address, city, state, zipCode, notes, aiProvider, aiApiKey, aiProviderEndpoint, aiProviderHeader, clientEmail, clientPassword, validDays } = req.body;

    if (!name || !phone) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'Nome e telefone são obrigatórios' });
    }

    // encrypt aiApiKey before storing
    const storedApiKey = aiApiKey ? encrypt(aiApiKey) : undefined;

    let accountUserId = undefined;

    // If client login credentials were provided, create a user account for the client within the transaction
    if (clientEmail && clientPassword) {
      const emailLower = clientEmail.toLowerCase();

      // Check if email already exists
      const existing = await User.findOne({ email: emailLower }).session(session);
      if (existing) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ success: false, message: 'Já existe um usuário com esse email para o cliente' });
      }

      const newUser = await User.create([{ name, email: emailLower, password: clientPassword, phone, company, isAdmin: false }], { session });
      accountUserId = newUser[0]._id;
    }

    const days = parseInt(validDays, 10) || 30;
    const validUntilDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    const [client] = await Client.create([
      {
        userId: req.user.id,
        name,
        email,
        phone,
        whatsappNumber,
        aiProvider,
        aiApiKey: storedApiKey,
        aiProviderEndpoint,
        aiProviderHeader,
        company,
        address,
        city,
        state,
        zipCode,
        notes,
        accountUserId,
        validUntil: validUntilDate,
        validDays: days,
        paymentHistory: [],
      }
    ], { session });

    await session.commitTransaction();
    session.endSession();

    const clientObj = client.toObject();
    clientObj.aiApiKey = client.aiApiKey ? decrypt(client.aiApiKey) : undefined;

    return res.status(201).json({ success: true, client: clientObj });
  } catch (error) {
    // Log full error for debugging
    console.error('createClient error:', error);
    try {
      await session.abortTransaction();
    } catch (e) {
      console.error('Error aborting transaction:', e);
    }
    session.endSession();

    // In development, return stack trace to help debugging in the frontend
    const responsePayload = { success: false, message: 'Erro ao criar cliente', error: error.message };
    if (process.env.NODE_ENV !== 'production') {
      responsePayload.stack = error.stack;
    }

    return res.status(500).json(responsePayload);
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

// Mark client as paid: extend validity by `days` (default 30) and add payment record
exports.markPaid = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ success: false, message: 'Cliente não encontrado' });
    if (client.userId.toString() !== req.user.id) return res.status(403).json({ success: false, message: 'Não autorizado' });

    const days = parseInt(req.body.days, 10) || 30;
    const now = new Date();
    const currentValid = client.validUntil && client.validUntil > now ? client.validUntil : now;
    const newValid = new Date(currentValid.getTime() + days * 24 * 60 * 60 * 1000);

    client.validUntil = newValid;
    client.validDays = days;
    client.isActive = true;
    client.paymentHistory = client.paymentHistory || [];
    client.paymentHistory.push({ amount: req.body.amount || 0, date: now, note: req.body.note || 'Pagamento manual' });

    await client.save();

    res.status(200).json({ success: true, client });
  } catch (error) {
    console.error('markPaid error:', error);
    res.status(500).json({ success: false, message: 'Erro ao marcar como pago', error: error.message });
  }
};

// Update client account credentials (change email/password) — will update associated User if exists
exports.updateCredentials = async (req, res) => {
  try {
    const { clientEmail, clientPassword } = req.body;
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ success: false, message: 'Cliente não encontrado' });
    if (client.userId.toString() !== req.user.id) return res.status(403).json({ success: false, message: 'Não autorizado' });

    if (client.accountUserId) {
      const user = await User.findById(client.accountUserId).select('+password');
      if (!user) return res.status(404).json({ success: false, message: 'Usuário vinculado não encontrado' });
      if (clientEmail) user.email = clientEmail.toLowerCase();
      if (clientPassword) user.password = clientPassword;
      await user.save();
    } else if (clientEmail && clientPassword) {
      // create user and link
      const existing = await User.findOne({ email: clientEmail.toLowerCase() });
      if (existing) return res.status(400).json({ success: false, message: 'Já existe um usuário com esse email' });
      const newUser = await User.create({ name: client.name, email: clientEmail.toLowerCase(), password: clientPassword, phone: client.phone, company: client.company, isAdmin: false });
      client.accountUserId = newUser._id;
      await client.save();
    }

    res.status(200).json({ success: true, client });
  } catch (error) {
    console.error('updateCredentials error:', error);
    res.status(500).json({ success: false, message: 'Erro ao atualizar credenciais', error: error.message });
  }
};

// Toggle active/inactive for a client
exports.toggleActive = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ success: false, message: 'Cliente não encontrado' });
    if (client.userId.toString() !== req.user.id) return res.status(403).json({ success: false, message: 'Não autorizado' });

    client.isActive = !client.isActive;
    await client.save();

    res.status(200).json({ success: true, client });
  } catch (error) {
    console.error('toggleActive error:', error);
    res.status(500).json({ success: false, message: 'Erro ao alternar estado', error: error.message });
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

    // If there's an associated user account for this client, remove it as well
    try {
      if (client.accountUserId) {
        await User.findByIdAndDelete(client.accountUserId);
        console.log(`Deleted linked user ${client.accountUserId} for client ${client._id}`);
      }
    } catch (err) {
      console.error('Error removing linked user for client deletion:', err.message);
      // continue to delete client even if user deletion fails
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
