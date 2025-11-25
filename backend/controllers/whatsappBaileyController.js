// WhatsApp Bailey Controller
// Exposes endpoints for QR code and status management

const QRCode = require('qrcode');
const { getQRCode, isWhatsAppConnected } = require('../services/whatsappService');

/**
 * Get QR Code for WhatsApp connection
 * Returns the QR code as data URL or PNG image
 */
exports.getQRCodeImage = async (req, res) => {
  try {
    const qr = getQRCode();
    
    if (!qr) {
      return res.status(400).json({
        success: false,
        message: 'QR code not available. WhatsApp might already be connected or initializing.',
      });
    }

    // Generate QR code image from data
    const qrImage = await QRCode.toDataURL(qr);
    
    return res.status(200).json({
      success: true,
      qr: qrImage,
    });
  } catch (err) {
    console.error('[WhatsApp] Error getting QR code:', err);
    return res.status(500).json({
      success: false,
      message: 'Error retrieving QR code',
      error: err.message,
    });
  }
};

/**
 * Get WhatsApp connection status
 */
exports.getStatus = async (req, res) => {
  try {
    const connected = isWhatsAppConnected();
    const qr = getQRCode();

    return res.status(200).json({
      success: true,
      connected,
      qrAvailable: !!qr,
    });
  } catch (err) {
    console.error('[WhatsApp] Error getting status:', err);
    return res.status(500).json({
      success: false,
      message: 'Error retrieving status',
      error: err.message,
    });
  }
};

/**
 * Disconnect WhatsApp and reset connection (for admin only)
 */
exports.disconnect = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const { disconnectWhatsApp } = require('../services/whatsappService');
    await disconnectWhatsApp();

    return res.status(200).json({
      success: true,
      message: 'WhatsApp disconnected',
    });
  } catch (err) {
    console.error('[WhatsApp] Error disconnecting:', err);
    return res.status(500).json({
      success: false,
      message: 'Error disconnecting WhatsApp',
      error: err.message,
    });
  }
};
