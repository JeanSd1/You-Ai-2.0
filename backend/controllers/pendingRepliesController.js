const PendingReply = require('../models/PendingReply');
const Client = require('../models/Client');

// List pending replies for clients owned or linked to current user
exports.listPending = async (req, res) => {
  try {
    // find clients where user is owner or accountUser
    const clients = await Client.find({ $or: [{ userId: req.user.id }, { accountUserId: req.user.id }] }).select('_id');
    const clientIds = clients.map(c => c._id);

    const replies = await PendingReply.find({ clientId: { $in: clientIds }, sent: false }).populate('clientId', 'name phone').sort({ createdAt: -1 });
    res.status(200).json({ success: true, replies });
  } catch (err) {
    console.error('Error listing pending replies', err);
    res.status(500).json({ success: false, message: 'Erro ao listar respostas pendentes' });
  }
};

// Mark pending reply as sent
exports.markSent = async (req, res) => {
  try {
    const id = req.params.id;
    const pr = await PendingReply.findById(id);
    if (!pr) return res.status(404).json({ success: false, message: 'Resposta pendente não encontrada' });

    // check ownership: user must be owner or accountUser of client
    const client = await Client.findById(pr.clientId);
    const isOwner = String(client.userId) === req.user.id;
    const isAccountUser = client.accountUserId && String(client.accountUserId) === req.user.id;
    if (!isOwner && !isAccountUser) return res.status(403).json({ success: false, message: 'Não autorizado' });

    pr.sent = true;
    pr.sentAt = new Date();
    await pr.save();
    res.status(200).json({ success: true, reply: pr });
  } catch (err) {
    console.error('Error marking pending reply sent', err);
    res.status(500).json({ success: false, message: 'Erro ao marcar como enviado' });
  }
};
