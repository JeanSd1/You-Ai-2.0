const Payment = require('../models/Payment');
const Client = require('../models/Client');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// Registrar pagamento e liberar acesso por 30 dias
exports.recordPayment = catchAsync(async (req, res, next) => {
  const { clientId, amount, transactionId, daysAccess = 30 } = req.body;
  const userId = req.user.id;

  // Validar cliente
  const client = await Client.findById(clientId);
  if (!client) {
    return next(new AppError('Cliente não encontrado', 404));
  }

  // Verificar se já existe pagamento com esse transactionId
  const existingPayment = await Payment.findOne({ transactionId });
  if (existingPayment && existingPayment.status === 'completed') {
    return next(new AppError('Pagamento já foi processado', 400));
  }

  // Calcular data de expiração (30 dias por padrão)
  const expiresAt = new Date(Date.now() + daysAccess * 24 * 60 * 60 * 1000);

  // Criar ou atualizar pagamento
  let payment = await Payment.findOneAndUpdate(
    { transactionId },
    {
      clientId,
      userId,
      amount,
      transactionId,
      status: 'completed',
      expiresAt,
      daysAccess,
      paidAt: new Date(),
    },
    { new: true, upsert: true }
  );

  // Ativar cliente
  client.isActive = true;
  client.accessExpiresAt = expiresAt;
  await client.save();

  res.status(201).json({
    success: true,
    message: 'Pagamento registrado com sucesso. Acesso liberado por 30 dias!',
    data: payment,
  });
});

// Verificar se cliente tem acesso ativo
exports.checkClientAccess = catchAsync(async (req, res, next) => {
  const { clientId } = req.params;

  const payment = await Payment.findOne({
    clientId,
    status: 'completed',
    isActive: true,
  }).sort({ expiresAt: -1 });

  if (!payment) {
    return next(new AppError('Cliente sem pagamento ativo', 403));
  }

  if (payment.isExpired()) {
    payment.isActive = false;
    await payment.save();
    return next(new AppError('Acesso expirado. Por favor, renove o pagamento', 403));
  }

  const daysRemaining = Math.ceil(
    (payment.expiresAt - new Date()) / (1000 * 60 * 60 * 24)
  );

  res.status(200).json({
    success: true,
    message: `Acesso ativo. ${daysRemaining} dias restantes`,
    data: {
      isActive: true,
      daysRemaining,
      expiresAt: payment.expiresAt,
    },
  });
});

// Renovar acesso do cliente
exports.renewAccess = catchAsync(async (req, res, next) => {
  const { paymentId } = req.params;
  const { daysAccess = 30 } = req.body;

  const payment = await Payment.findById(paymentId);
  if (!payment) {
    return next(new AppError('Pagamento não encontrado', 404));
  }

  payment.renew(daysAccess);
  await payment.save();

  // Atualizar cliente
  const client = await Client.findById(payment.clientId);
  if (client) {
    client.accessExpiresAt = payment.expiresAt;
    await client.save();
  }

  res.status(200).json({
    success: true,
    message: `Acesso renovado por ${daysAccess} dias`,
    data: payment,
  });
});

// Listar pagamentos do cliente
exports.getClientPayments = catchAsync(async (req, res, next) => {
  const { clientId } = req.params;

  const payments = await Payment.find({ clientId }).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: payments.length,
    data: payments,
  });
});

// Listar todos os pagamentos (admin)
exports.getAllPayments = catchAsync(async (req, res, next) => {
  const payments = await Payment.find()
    .populate('clientId', 'name email phone')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: payments.length,
    data: payments,
  });
});
