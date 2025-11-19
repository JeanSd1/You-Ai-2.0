const mongoose = require('mongoose');
const Client = require('../models/Client');
const User = require('../models/User');
const { encrypt, decrypt } = require('../utils/crypto');
const qrcodeController = require('./qrcodeController');

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
        // If this existing user is already linked to another client, prevent reuse
        const linkedClient = await Client.findOne({ accountUserId: existing._id }).session(session);
        if (linkedClient) {
          await session.abortTransaction();
          session.endSession();
          return res.status(400).json({ success: false, message: 'Este email já está vinculado a outro cliente' });
        }

        // Reuse the existing user for this client. Update some fields if missing.
        accountUserId = existing._id;
        const updateFields = {};
        if (!existing.name && name) updateFields.name = name;
        if (!existing.phone && phone) updateFields.phone = phone;
        if (!existing.company && company) updateFields.company = company;
        if (Object.keys(updateFields).length > 0) {
          await User.findByIdAndUpdate(existing._id, { $set: updateFields }, { session });
        }

        // If admin provided a password for the client creation flow, set it on the existing user
        // so the client can log in with the provided credentials. Use the session to keep the
        // operation transactional and trigger the User model's pre-save hashing by loading and saving.
        if (clientPassword) {
          const userToUpdate = await User.findById(existing._id).select('+password').session(session);
          if (userToUpdate) {
            userToUpdate.password = clientPassword;
            await userToUpdate.save({ session });
          }
        }
      } else {
        const newUser = await User.create([{ name, email: emailLower, password: clientPassword, phone, company, isAdmin: false }], { session });
        accountUserId = newUser[0]._id;
      }
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

// Trigger batch regeneration of all QR codes for this client as WhatsApp links
exports.regenerateQRs = async (req, res) => {
  // Delegate to qrcodeController's batch function
  return qrcodeController.regenerateAllForClientAsWhatsApp(req, res);
};

// Listar clientes do usuário
exports.getClients = async (req, res) => {
  try {
    // Allow owners to get their clients and allow client-account users to get their own client
    const clients = await Client.find({ $or: [{ userId: req.user.id }, { accountUserId: req.user.id }] });

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

    // Verificar se o cliente pertence ao usuário (owner) ou ao usuário de conta do cliente
    const isOwner = client.userId && client.userId.toString() === req.user.id;
    const isAccountUser = client.accountUserId && client.accountUserId.toString() === req.user.id;
    if (!isOwner && !isAccountUser) {
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

    const isOwnerUpdate = client.userId && client.userId.toString() === req.user.id;
    const isAccountUserUpdate = client.accountUserId && client.accountUserId.toString() === req.user.id;
    if (!isOwnerUpdate && !isAccountUserUpdate) {
      return res.status(403).json({ success: false, message: 'Não autorizado' });
    }
    // If requester is the owner, allow full set of updates similar to before
    if (isOwnerUpdate) {
      const updatableRaw = (({ name, email, phone, whatsappNumber, company, address, city, state, zipCode, notes, aiProvider, aiApiKey }) => ({ name, email, phone, whatsappNumber, company, address, city, state, zipCode, notes, aiProvider, aiApiKey }))(req.body);
      if (updatableRaw.aiApiKey) updatableRaw.aiApiKey = encrypt(updatableRaw.aiApiKey);
      client = await Client.findByIdAndUpdate(req.params.id, updatableRaw, { new: true, runValidators: true });
    } else {
      // If requester is the client account user, allow only limited fields (chatbot/profile fields)
      const allowed = ['aiProvider', 'aiApiKey', 'aiProviderEndpoint', 'aiProviderHeader', 'notes', 'phone', 'whatsappNumber'];
      const payload = {};
      for (const k of allowed) {
        if (req.body[k] !== undefined) payload[k] = req.body[k];
      }
      if (payload.aiApiKey) payload.aiApiKey = encrypt(payload.aiApiKey);
      client = await Client.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
    }

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
