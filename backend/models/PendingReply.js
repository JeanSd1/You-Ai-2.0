const mongoose = require('mongoose');

const pendingReplySchema = new mongoose.Schema(
  {
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    promptId: { type: mongoose.Schema.Types.ObjectId, ref: 'Prompt' },
    from: { type: String },
    toPhone: { type: String, required: true },
    reply: { type: String, required: true },
    savedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    sent: { type: Boolean, default: false },
    sentAt: { type: Date }
  },
  { timestamps: true }
);

module.exports = mongoose.model('PendingReply', pendingReplySchema);
