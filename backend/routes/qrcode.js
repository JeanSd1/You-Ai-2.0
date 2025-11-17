const express = require('express');
const {
  generateQRCode,
  getQRCodes,
  getQRCodeById,
  sendViaWhatsApp,
  deleteQRCode,
} = require('../controllers/qrcodeController');
const protect = require('../middleware/auth');

const router = express.Router();

router.post('/generate', protect, generateQRCode);
router.get('/', protect, getQRCodes);
router.get('/:id', protect, getQRCodeById);
router.post('/send-whatsapp', protect, sendViaWhatsApp);
router.delete('/:id', protect, deleteQRCode);

module.exports = router;
