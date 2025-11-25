const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: [true, 'ID do cliente é obrigatório'],
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'ID do usuário é obrigatório'],
    },
    pixKey: {
      type: String,
      default: '86b37cae-18f1-47e3-8f6b-29366e7400c5',
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, 'Valor do pagamento é obrigatório'],
      min: 0,
    },
    currency: {
      type: String,
      default: 'BRL',
      trim: true,
    },
    transactionId: {
      type: String,
      required: [true, 'ID da transação é obrigatório'],
      unique: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending',
    },
    expiresAt: {
      type: Date,
      required: [true, 'Data de expiração é obrigatória'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    daysAccess: {
      type: Number,
      default: 30,
    },
    paidAt: {
      type: Date,
    },
    renewedAt: {
      type: Date,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// Método para verificar se o pagamento está expirado
paymentSchema.methods.isExpired = function () {
  return new Date() > this.expiresAt;
};

// Método para renovar o acesso
paymentSchema.methods.renew = function (daysAccess = 30) {
  this.expiresAt = new Date(Date.now() + daysAccess * 24 * 60 * 60 * 1000);
  this.renewedAt = new Date();
  this.isActive = true;
  return this;
};

// Método estático para encontrar pagamentos expirados
paymentSchema.statics.findExpired = function () {
  return this.find({
    expiresAt: { $lt: new Date() },
    isActive: true,
  });
};

// Middleware para desativar pagamento ao expirar
paymentSchema.pre('save', function (next) {
  if (this.isExpired()) {
    this.isActive = false;
  }
  next();
});

module.exports = mongoose.model('Payment', paymentSchema);
