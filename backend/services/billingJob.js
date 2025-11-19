const Client = require('../models/Client');
const { sendMail } = require('../utils/mailer');

// Configurable thresholds
const REMIND_DAYS = [7, 1, 0]; // days before expiry to remind
const INACTIVATE_AFTER_DAYS = 15; // days after expiry to inactivate

const start = (intervalMs = 1000 * 60 * 60) => { // default: hourly
  console.log('Billing job starting (interval ms):', intervalMs);
  setInterval(async () => {
    try {
      const now = new Date();
      // Find clients with validUntil set
      const clients = await Client.find({ validUntil: { $exists: true } });

      for (const c of clients) {
        if (!c.validUntil) continue;
        const diffMs = c.validUntil.getTime() - now.getTime();
        const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

        // Send reminders for REMIND_DAYS
        if (REMIND_DAYS.includes(diffDays)) {
          const subject = `YouAi - Lembrete: seu plano vence em ${diffDays} dia(s)`;
          const text = `Olá ${c.name},\n\nSeu plano expira em ${diffDays} dia(s) em ${c.validUntil.toLocaleDateString()}. Por favor, pague para renovar.`;
          await sendMail({ to: c.email || c.whatsappNumber || '', subject, text });
        }

        // If overdue
        if (diffDays < 0) {
          const overdueDays = Math.abs(diffDays);
          // send overdue notice at 7 and 15 days
          if (overdueDays === 7 || overdueDays === INACTIVATE_AFTER_DAYS) {
            const subject = `YouAi - Aviso: conta vencida há ${overdueDays} dia(s)`;
            const text = `Olá ${c.name},\n\nSua conta está vencida há ${overdueDays} dia(s). Por favor, regularize o pagamento.`;
            await sendMail({ to: c.email || '', subject, text });
          }

          // Inactivate after threshold
          if (overdueDays >= INACTIVATE_AFTER_DAYS && c.isActive) {
            c.isActive = false;
            await c.save();
            console.log(`Client ${c._id} inactivated due to overdue ${overdueDays} days`);
          }
        }
      }
    } catch (err) {
      console.error('billingJob error:', err.message);
    }
  }, intervalMs);
};

module.exports = { start };
