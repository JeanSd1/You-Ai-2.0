// WhatsApp Bailey Routes
// Handles QR code generation and connection status for Baileys

const express = require('express');
const { getQRCodeImage, getStatus, disconnect } = require('../controllers/whatsappBaileyController');
const auth = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/whatsapp-bailey/qr
 * Get current WhatsApp QR code for connection
 * Accessible by anyone (admin will display it on dashboard)
 */
router.get('/qr', async (req, res) => {
  await getQRCodeImage(req, res);
});

/**
 * GET /api/whatsapp-bailey/status
 * Get WhatsApp connection status
 */
router.get('/status', async (req, res) => {
  await getStatus(req, res);
});

/**
 * POST /api/whatsapp-bailey/disconnect
 * Disconnect WhatsApp (admin only)
 */
router.post('/disconnect', auth, async (req, res) => {
  await disconnect(req, res);
});

module.exports = router;
