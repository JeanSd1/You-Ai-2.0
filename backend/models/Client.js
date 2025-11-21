const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Nome do cliente é obrigatório'],
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: [true, 'Telefone é obrigatório'],
    },
    whatsappNumber: {
      type: String,
      trim: true,
    },
    // AI provider configuration for this client (per-company)
    aiProvider: {
      type: String,
      enum: ['chatgpt', 'gemini', 'perplexity', 'publicai', 'other'],
      default: 'chatgpt',
    },
    aiApiKey: {
      type: String,
      trim: true,
    },
    // For custom providers (when aiProvider === 'other') allow storing endpoint and header key
    aiProviderEndpoint: {
      type: String,
      trim: true,
    },
    aiProviderModel: {
      type: String,
      trim: true,
    },
    aiProviderHeader: {
      type: String,
      trim: true,
    },
    company: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },
    zipCode: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    // Optional link to a user account created for this client (login credentials)
    accountUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    // Billing / validity
    validUntil: {
      type: Date,
    },
    validDays: {
      type: Number,
      default: 30,
    },
    // Simple payment history entries
    paymentHistory: [
      {
        amount: Number,
        date: Date,
        note: String,
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Client', clientSchema);
