const mongoose = require('mongoose');

const promptSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Título é obrigatório'],
      trim: true,
    },
    content: {
      type: String,
      required: [true, 'Conteúdo é obrigatório'],
    },
    qrCodeUrl: {
      type: String,
      trim: true,
    },
    qrCodeData: {
      type: String,
      trim: true,
    },
    sentVia: {
      type: String,
      enum: ['email', 'whatsapp', 'link', 'qrcode'],
      default: 'qrcode',
    },
    isSent: {
      type: Boolean,
      default: false,
    },
    sentAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Prompt', promptSchema);
